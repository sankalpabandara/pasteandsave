# SnapGrab

A video and audio downloader for 1,200+ sites (TikTok, Instagram, Facebook,
YouTube, X, Pinterest and more), built on [Next.js](https://nextjs.org) and
[yt-dlp](https://github.com/yt-dlp/yt-dlp).

Only download content you own or have the rights to use. The tool talks to
each platform's public endpoints through yt-dlp, so it can't reach private or
login-gated content, and platforms can change their site in ways that break a
specific extractor.

## Getting started

The app shells out to `bin/yt-dlp.exe` and `bin/ffmpeg.exe`, which aren't
committed to git (they are large binaries). Fetch them once:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-bin.ps1
```

Copy the environment template and fill it in:

```bash
cp .env.example .env.local
```

At minimum set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` if you want the
admin panel. Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example`. Summary:

- `NEXT_PUBLIC_SITE_URL` — public URL, used for canonical tags and the sitemap.
- `NEXT_PUBLIC_GA_ID` — Google Analytics 4 Measurement ID. Blank disables GA.
- `ADMIN_PASSWORD` — password for the admin panel.
- `ADMIN_SESSION_SECRET` — 32-byte hex string used to sign the session cookie.

## How it works

- `src/app/api/info/route.ts` — runs `yt-dlp --dump-single-json <url>` to list
  the title, thumbnail and available formats.
- `src/app/api/jobs/*` — starts a background download job, streams progress to
  the browser over Server-Sent Events, then serves the finished file. Temp
  files are cleaned up after download.
- `src/lib/ytdlp.ts` — `isSafeUrl` blocks private/internal hosts (SSRF guard),
  the `--ies default,-generic` flag keeps yt-dlp to its named site extractors,
  and `isValidFormatId` validates format IDs before they reach the CLI.
- `src/lib/concurrency.ts` — caps how many yt-dlp/ffmpeg processes run at once
  (4 lookups, 3 downloads). Excess requests get 503 instead of overloading the
  box.
- `src/lib/rate-limit.ts` — per-IP request limits on the API routes.

## Admin panel

Visit `/admin`. It is password-gated and not indexed by search engines.

- `src/lib/analytics.ts` — first-party analytics. Events (pageviews, lookups,
  downloads) are appended to `data/events.jsonl`. No cookies, IPs or personal
  data are stored. The dashboard reads and aggregates this file.
- `src/app/admin/seo` — a rules-based SEO audit (`src/lib/seo-audit.ts`) that
  scores every landing page on titles, descriptions, headings, keyword
  coverage, content depth, FAQ richness and duplicates. It reports issues; it
  never edits content.

### Google integrations (optional, free)

One Google Cloud service account powers both. See `.env.example` for the
variables (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, `GSC_SITE_URL`).
Auth uses a hand-rolled service-account JWT (`src/lib/google-auth.ts`), so no
Google client libraries are installed.

- **Google Analytics (client)** — set `NEXT_PUBLIC_GA_ID` to your G-XXXX id for
  visitor tracking in GA itself.
- **GA Data API** — pulls users, pageviews, sessions, top countries and pages
  into the dashboard (`src/lib/ga-data.ts`).
- **Search Console** — shows the real search queries, clicks, impressions and
  ranking positions on the SEO page (`src/lib/search-console.ts`). This is the
  free source of keyword data.

Setup: create a service account, download its JSON key, add the service
account email as a Viewer on the GA4 property and as a user of the Search
Console property, then base64-encode the key into `GOOGLE_SERVICE_ACCOUNT_JSON`.
Until configured, the admin panel shows setup instructions in place of the data.

## Keeping it working

`yt-dlp` is updated often to track site changes. If downloads start failing,
re-run `scripts/setup-bin.ps1` to grab the latest binary.
