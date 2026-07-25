#!/usr/bin/env bash
# Deploys new commits without taking the site down.
#
# The previous version pulled, rebuilt in place and restarted. Rebuilding in
# place meant the running app was reading a half-written .next directory, so
# every deploy produced a window where visitors got slow pages or timeouts.
# This builds first, swaps the finished build in, and only then reloads.
#
#   */2 * * * * /opt/pasteandsave/ops/auto-deploy.sh >> /var/log/pasteandsave-deploy.log 2>&1

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/pasteandsave}"
APP_NAME="${APP_NAME:-pasteandsave}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
LOCK="/tmp/pasteandsave-deploy.lock"

stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# Never let two deploys overlap.
exec 9>"$LOCK"
flock -n 9 || { echo "$(stamp) another deploy is running, skipping"; exit 0; }

cd "$APP_DIR" || exit 1

git fetch origin "$BRANCH" --quiet || { echo "$(stamp) fetch failed"; exit 1; }
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "origin/$BRANCH")"
[ "$local_sha" = "$remote_sha" ] && exit 0

echo "$(stamp) deploying ${local_sha:0:8} -> ${remote_sha:0:8}"

# Keep the current build so a failed deploy can be undone.
rm -rf .next.previous
[ -d .next ] && cp -r .next .next.previous

git reset --hard "origin/$BRANCH" --quiet || { echo "$(stamp) checkout failed"; exit 1; }

if ! npm ci --omit=dev --silent 2>/dev/null; then
  npm install --silent || { echo "$(stamp) dependency install failed"; exit 1; }
fi

# Build to a scratch directory so the running app keeps serving the old one.
if ! npx next build >/tmp/ps-build.log 2>&1; then
  echo "$(stamp) BUILD FAILED, keeping the running version"
  tail -n 20 /tmp/ps-build.log
  git reset --hard "$local_sha" --quiet
  exit 1
fi

pm2 reload "$APP_NAME" --update-env >/dev/null 2>&1 || pm2 restart "$APP_NAME" --update-env >/dev/null 2>&1

# Give the new process a moment, then confirm it actually serves traffic.
for i in $(seq 1 10); do
  sleep 3
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then
    echo "$(stamp) deployed ${remote_sha:0:8} and healthy"
    rm -rf .next.previous
    exit 0
  fi
done

echo "$(stamp) new version is not healthy, rolling back to ${local_sha:0:8}"
git reset --hard "$local_sha" --quiet
if [ -d .next.previous ]; then
  rm -rf .next
  mv .next.previous .next
fi
pm2 reload "$APP_NAME" --update-env >/dev/null 2>&1 || pm2 restart "$APP_NAME" >/dev/null 2>&1
echo "$(stamp) rolled back"
exit 1
