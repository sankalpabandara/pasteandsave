# Deploying PasteAndSave

## What kind of host you need

PasteAndSave is **not** a static site and **cannot run on serverless/edge**
platforms (Vercel Functions, Netlify Functions, Cloudflare Workers). It needs a
**persistent Node.js process on a Linux server** (a VPS such as Hetzner, DigitalOcean,
Fly.io, Railway, a Docker container, etc.) because it:

- spawns `yt-dlp` and `ffmpeg` child processes,
- streams downloads and progress over long-lived connections (SSE),
- keeps job state in memory and writes analytics to a local file,
- runs a background weekly SEO audit.

Requirements: **Node.js 20+**, a Linux x86_64 server, and outbound internet.

## 1. Get the code and binaries

```bash
git clone <your-repo> pasteandsave && cd pasteandsave
npm ci
bash scripts/setup-bin.sh      # downloads Linux yt-dlp + ffmpeg into ./bin
```

The Windows `.exe` binaries used in local dev are gitignored; the app picks the
right binary name per OS automatically.

## 2. Configure environment

Set these in the shell/service environment (or a `.env.production` file). Never
commit real secrets.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://yourdomain.com` |
| `ADMIN_PASSWORD` | yes | long, unique |
| `ADMIN_SESSION_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SEO_REPORT_TOKEN` | optional | bearer token for an external cron to trigger the audit |
| `BIN_DIR` | optional | absolute path to `bin/` if using standalone output |
| `NEXT_PUBLIC_GA_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, `GSC_SITE_URL` | optional | analytics / Search Console |

## 3. Build and run

```bash
npm run build
npm run start          # serves on port 3000 (set PORT to change)
```

`next build` also emits a self-contained bundle at `.next/standalone` if you
prefer that. To use it, copy `public/`, `.next/static`, and `bin/` next to
`.next/standalone/server.js`, set `BIN_DIR` to that `bin/`, and run
`node server.js`.

Keep it alive with a process manager (pick one):

```bash
# pm2
pm2 start npm --name pasteandsave -- run start

# or a systemd unit running `npm run start` with Restart=always
```

## 4. Put it behind HTTPS

Run nginx (or Caddy) in front for TLS. Important nginx notes:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # rate limiting uses this
    proxy_read_timeout 600s;        # long enough for big downloads
}
location /api/jobs/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_buffering off;            # required for SSE progress to stream
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

HTTPS is required for the admin session cookie (it is `Secure` in production)
and for HSTS to take effect. Use Let's Encrypt / Certbot or Caddy's automatic TLS.

## 5. After deploy — verify

- Home page and a tool page load.
- `/admin` redirects to `/admin/login`, and the password works.
- A test download completes.
- Response headers include `Content-Security-Policy` and `X-Content-Type-Options`.

## Keeping it working

`yt-dlp` updates often to track site changes. Re-run `bash scripts/setup-bin.sh`
on a schedule (e.g. weekly cron) so downloads keep working.

## Operational note

A public yt-dlp service can attract heavy or abusive traffic and carries the
same platform-ToS / copyright considerations discussed in the Terms of Service.
Rate limits and concurrency caps are built in, but consider additional abuse
protection (Cloudflare, per-user limits) before promoting it widely.
