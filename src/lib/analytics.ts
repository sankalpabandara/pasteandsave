import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

// First-party analytics. Events are appended to a JSON-lines file so the admin
// dashboard has real numbers even without Google Analytics. No cookies, no IPs,
// no personal data is stored, only what was done and when.

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

// Keep the events log bounded so it can't grow without limit on a busy site.
// When it exceeds MAX_EVENTS_BYTES we rewrite it with only the most recent
// KEEP_EVENTS lines.
const MAX_EVENTS_BYTES = 8 * 1024 * 1024; // ~8 MB
const KEEP_EVENTS = 50_000;
let appendsSinceCheck = 0;

export type EventType = "pageview" | "lookup" | "download" | "review";

export type AnalyticsEvent = {
  t: number;
  type: EventType;
  site?: string;
  mode?: "video" | "audio";
  ok?: boolean;
  path?: string;
  /** External referrer hostname, only set when the visit came from another site. */
  ref?: string;
  /**
   * The site a lookup was for, when it failed.
   *
   * Successes record the extractor's own name; failures had no extractor to ask,
   * so this is the hostname. Kept in a separate field rather than folded into
   * site, so the two are never mixed in one count. Without it a failure is just
   * a tally with no platform attached, which is why TikTok could break for weeks
   * while the dashboard showed only that "some lookups failed".
   */
  host?: string;
  /** Which kind of failure, so the common ones can be told apart at a glance. */
  code?: string;
  /**
   * Whether this download was eligible for the metered proxy, which is the
   * same test the daily budget gate uses. Not a promise that the proxy was
   * dialled: proxy-routing may still have found the site reachable direct.
   * Recorded so spend can be attributed to a platform after the fact.
   */
  proxied?: boolean;
  /** The Trustpilot prompt: shown, opened or closed (see src/lib/review.ts). */
  action?: string;
};

let dirReady = false;
function ensureDir() {
  if (dirReady) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  dirReady = true;
}

async function trimIfLarge(): Promise<void> {
  // Only stat the file every so often to avoid a syscall on every event.
  if (appendsSinceCheck++ < 500) return;
  appendsSinceCheck = 0;
  try {
    const { size } = await fsp.stat(EVENTS_FILE);
    if (size < MAX_EVENTS_BYTES) return;
    const raw = await fsp.readFile(EVENTS_FILE, "utf8");
    const kept = raw.split("\n").filter(Boolean).slice(-KEEP_EVENTS);
    await fsp.writeFile(EVENTS_FILE, kept.join("\n") + "\n", "utf8");
  } catch {
    // best effort
  }
}

export async function logEvent(ev: Omit<AnalyticsEvent, "t">): Promise<void> {
  try {
    ensureDir();
    const line = JSON.stringify({ t: Date.now(), ...ev }) + "\n";
    await fsp.appendFile(EVENTS_FILE, line, "utf8");
    await trimIfLarge();
  } catch {
    // Analytics must never break a user request.
  }
}

// Read at most the last `maxLines` events to keep memory bounded as the file
// grows. Good enough for a dashboard; not a full analytics warehouse.
async function readEvents(maxLines = 100_000): Promise<AnalyticsEvent[]> {
  let raw: string;
  try {
    raw = await fsp.readFile(EVENTS_FILE, "utf8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter(Boolean);
  const slice = lines.slice(-maxLines);
  const events: AnalyticsEvent[] = [];
  for (const line of slice) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // skip a corrupt line rather than fail the whole read
    }
  }
  return events;
}

/**
 * The periods the dashboard can show, in days. Each is a rolling window that
 * ends now, so "1 day" is the last 24 hours rather than today since midnight.
 */
export const RANGE_DAYS = [1, 7, 28] as const;

export type RangeDays = (typeof RANGE_DAYS)[number];

export const DEFAULT_RANGE: RangeDays = 7;

/** Reads the dashboard's ?range=1d, 7d or 28d. Anything else is the default. */
export function rangeFrom(value: unknown): RangeDays {
  const raw = Array.isArray(value) ? value[0] : value;
  const m = typeof raw === "string" ? /^(\d+)d$/.exec(raw) : null;
  const days = m ? Number(m[1]) : NaN;
  return (RANGE_DAYS as readonly number[]).includes(days) ? (days as RangeDays) : DEFAULT_RANGE;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type Stats = {
  rangeDays: RangeDays;
  /** Where the period starts, in ms. */
  since: number;
  /** The oldest event on file, so a period reaching back past it can say so. */
  dataFrom: number | null;
  pageviews: number;
  lookups: number;
  downloads: number;
  /** The same counts for the period of the same length just before. */
  previous: { pageviews: number; lookups: number; downloads: number };
  conversionRate: number;
  lookupSuccessRate: number;
  downloadsByMode: { video: number; audio: number };
  topSites: { site: string; count: number }[];
  /**
   * Downloads per platform, and how many of them cost metered proxy data.
   * Lookups alone cannot answer this: a visitor who pastes a link and leaves
   * costs nothing, and only the ones who press save do.
   */
  downloadSites: { site: string; count: number; proxied: number }[];
  /**
   * Failed lookups in the period, grouped by site, worst first, with the
   * commonest reason.
   *
   * A period rather than everything on file: counted since July, YouTube led
   * this panel with 846 relay failures, every one of them from before the
   * WARP pool and none in the three days before it was read, while the
   * problems actually happening sat further down.
   */
  lookupFailures: { host: string; count: number; topCode: string }[];
  topPages: { path: string; count: number }[];
  /**
   * The Trustpilot prompt after a first download: how often it appeared, how
   * often the review page was opened from it, and how often it was closed.
   */
  reviewPrompt: { shown: number; opened: number; closed: number };
  /** The chart's bars, oldest first: one an hour for 1 day, one a day otherwise. */
  series: { start: number; end: number; pageviews: number; downloads: number }[];
  /** The latest events, whatever the period. */
  recent: AnalyticsEvent[];
  generatedAt: number;
};

export type Backlink = {
  domain: string;
  hits: number;
  firstSeen: number;
  lastSeen: number;
};

/**
 * Backlink discovery from first-party traffic: every pageview that arrived
 * with an external referrer is evidence of a live link to us somewhere on
 * that domain. Search engines and common portals are filtered out so the
 * list shows genuine referring sites, newest activity first.
 */
const SEARCH_ENGINE_HOSTS =
  /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|brave|startpage|qwant)\./i;

export async function getBacklinks(): Promise<Backlink[]> {
  const events = await readEvents();
  const map = new Map<string, Backlink>();
  for (const ev of events) {
    if (ev.type !== "pageview" || !ev.ref) continue;
    if (SEARCH_ENGINE_HOSTS.test(ev.ref)) continue;
    const b = map.get(ev.ref);
    if (b) {
      b.hits++;
      b.lastSeen = Math.max(b.lastSeen, ev.t);
      b.firstSeen = Math.min(b.firstSeen, ev.t);
    } else {
      map.set(ev.ref, { domain: ev.ref, hits: 1, firstSeen: ev.t, lastSeen: ev.t });
    }
  }
  return [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 50);
}

export async function getStats(rangeDays: RangeDays = DEFAULT_RANGE): Promise<Stats> {
  const events = await readEvents();
  const now = Date.now();
  const since = now - rangeDays * DAY_MS;
  const previousSince = since - rangeDays * DAY_MS;

  let pageviews = 0;
  let lookups = 0;
  let downloads = 0;
  let lookupOk = 0;
  const previous = { pageviews: 0, lookups: 0, downloads: 0 };
  let dataFrom: number | null = null;
  const modeCounts = { video: 0, audio: 0 };
  const siteCounts = new Map<string, number>();
  const dlSites = new Map<string, { site: string; count: number; proxied: number }>();
  const failHosts = new Map<string, { host: string; count: number; codes: Map<string, number> }>();
  const pageCounts = new Map<string, number>();
  const reviewPrompt = { shown: 0, opened: 0, closed: 0 };

  // Every bar exists even when nothing happened in it, so the chart always has
  // a full axis: 24 hours for a day, a bar per day otherwise.
  const bucketMs = rangeDays === 1 ? HOUR_MS : DAY_MS;
  const series = Array.from({ length: Math.round((now - since) / bucketMs) }, (_, i) => ({
    start: since + i * bucketMs,
    end: since + (i + 1) * bucketMs,
    pageviews: 0,
    downloads: 0,
  }));

  for (const ev of events) {
    if (!Number.isFinite(ev.t)) continue;
    if (dataFrom === null || ev.t < dataFrom) dataFrom = ev.t;
    if (ev.t < since) {
      if (ev.t >= previousSince) {
        if (ev.type === "pageview") previous.pageviews++;
        else if (ev.type === "lookup") previous.lookups++;
        else if (ev.type === "download") previous.downloads++;
      }
      continue;
    }
    // An event stamped a moment after "now" (a clock step) lands in the last bar.
    const bucket = series[Math.min(series.length - 1, Math.floor((ev.t - since) / bucketMs))];
    if (ev.type === "pageview") {
      pageviews++;
      if (bucket) bucket.pageviews++;
      if (ev.path) pageCounts.set(ev.path, (pageCounts.get(ev.path) ?? 0) + 1);
    } else if (ev.type === "review") {
      if (ev.action === "shown" || ev.action === "opened" || ev.action === "closed") {
        reviewPrompt[ev.action]++;
      }
    } else if (ev.type === "lookup") {
      lookups++;
      if (ev.ok) lookupOk++;
      else if (ev.host) {
        const key = ev.host.toLowerCase();
        const row = failHosts.get(key) ?? { host: key, count: 0, codes: new Map() };
        row.count++;
        const c = ev.code || "UNKNOWN";
        row.codes.set(c, (row.codes.get(c) ?? 0) + 1);
        failHosts.set(key, row);
      }
      if (ev.site) {
        const key = ev.site.toLowerCase();
        siteCounts.set(key, (siteCounts.get(key) ?? 0) + 1);
      }
    } else if (ev.type === "download") {
      downloads++;
      if (ev.mode === "audio") modeCounts.audio++;
      else modeCounts.video++;
      if (bucket) bucket.downloads++;
      if (ev.site) {
        const key = ev.site.toLowerCase();
        const row = dlSites.get(key) ?? { site: ev.site, count: 0, proxied: 0 };
        row.count++;
        if (ev.proxied) row.proxied++;
        dlSites.set(key, row);
      }
    }
  }

  const topSites = [...siteCounts.entries()]
    .map(([site, count]) => ({ site, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const downloadSites = [...dlSites.values()].sort((a, b) => b.count - a.count);

  const lookupFailures = [...failHosts.values()]
    .map((r) => ({
      host: r.host,
      count: r.count,
      topCode: [...r.codes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNKNOWN",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topPages = [...pageCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recent = events.slice(-25).reverse();

  return {
    rangeDays,
    since,
    dataFrom,
    pageviews,
    lookups,
    downloads,
    previous,
    conversionRate: lookups ? downloads / lookups : 0,
    lookupSuccessRate: lookups ? lookupOk / lookups : 0,
    downloadsByMode: modeCounts,
    topSites,
    downloadSites,
    lookupFailures,
    topPages,
    reviewPrompt,
    series,
    recent,
    generatedAt: now,
  };
}
