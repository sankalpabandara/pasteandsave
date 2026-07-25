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

# shellcheck source=/dev/null
. "$(dirname "$0")/lib-alert.sh"
alert() { send_alert "$1" "$2"; }

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

# --include=dev is not optional here. typescript and @tailwindcss/postcss are
# build-time tools, and this box runs with NODE_ENV=production, which makes
# npm skip devDependencies on its own — a plain `npm ci` installs a tree that
# cannot build. The runtime bundle stays lean regardless, because
# output: standalone copies only what the server actually needs.
if ! npm ci --include=dev --silent 2>/dev/null; then
  npm install --include=dev --silent || {
    echo "$(stamp) dependency install failed"
    alert "deploy blocked: dependency install failed" \
      "npm could not install dependencies in $APP_DIR, so ${remote_sha:0:8} was not deployed. The previous version is still serving."
    exit 1
  }
fi

if ! npx next build >/tmp/ps-build.log 2>&1; then
  echo "$(stamp) BUILD FAILED, keeping the running version"
  tail -n 20 /tmp/ps-build.log
  # Deliberately no git revert here. Reverting also rolls back this script and
  # everything else in ops/, so a deploy broken by a bad build could not
  # deploy its own fix: every cycle pulled the fix, failed, and threw it away.
  # The checkout stays at the new commit and only the build output is restored,
  # so the running app is untouched and the next pushed fix can land.
  if [ -d .next.previous ]; then
    rm -rf .next
    cp -r .next.previous .next
  fi
  alert "deploy blocked: build failed" \
    "Commit ${remote_sha:0:8} does not build, so the site is still serving the previous build. Push a fix and it will deploy on the next cycle. Last lines of the build log:
$(tail -n 12 /tmp/ps-build.log)"
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
alert "deploy rolled back" \
  "Commit ${remote_sha:0:8} built but did not answer the health check, so the site was put back on ${local_sha:0:8}."
git reset --hard "$local_sha" --quiet
if [ -d .next.previous ]; then
  rm -rf .next
  mv .next.previous .next
fi
pm2 reload "$APP_NAME" --update-env >/dev/null 2>&1 || pm2 restart "$APP_NAME" >/dev/null 2>&1
echo "$(stamp) rolled back"
exit 1
