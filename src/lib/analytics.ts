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

export type EventType = "pageview" | "lookup" | "download";

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

function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export type Stats = {
  totalPageviews: number;
  totalLookups: number;
  totalDownloads: number;
  downloads24h: number;
  pageviews24h: number;
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
  /** Failed lookups grouped by site, worst first, with the commonest reason. */
  lookupFailures: { host: string; count: number; topCode: string }[];
  topPages: { path: string; count: number }[];
  byDay: { day: string; pageviews: number; downloads: number }[];
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

export async function getStats(): Promise<Stats> {
  const events = await readEvents();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  let totalPageviews = 0;
  let totalLookups = 0;
  let totalDownloads = 0;
  let downloads24h = 0;
  let pageviews24h = 0;
  let lookupOk = 0;
  const modeCounts = { video: 0, audio: 0 };
  const siteCounts = new Map<string, number>();
  const dlSites = new Map<string, { site: string; count: number; proxied: number }>();
  const failHosts = new Map<string, { host: string; count: number; codes: Map<string, number> }>();
  const pageCounts = new Map<string, number>();
  const dayMap = new Map<string, { pageviews: number; downloads: number }>();

  // Seed the last 14 days so the chart always has a full axis.
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(now - i * 24 * 60 * 60 * 1000);
    dayMap.set(key, { pageviews: 0, downloads: 0 });
  }

  for (const ev of events) {
    const day = dayKey(ev.t);
    const bucket = dayMap.get(day);
    if (ev.type === "pageview") {
      totalPageviews++;
      if (ev.t >= dayAgo) pageviews24h++;
      if (bucket) bucket.pageviews++;
      if (ev.path) pageCounts.set(ev.path, (pageCounts.get(ev.path) ?? 0) + 1);
    } else if (ev.type === "lookup") {
      totalLookups++;
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
      totalDownloads++;
      if (ev.t >= dayAgo) downloads24h++;
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

  const byDay = [...dayMap.entries()].map(([day, v]) => ({ day, ...v }));

  const recent = events.slice(-25).reverse();

  return {
    totalPageviews,
    totalLookups,
    totalDownloads,
    downloads24h,
    pageviews24h,
    conversionRate: totalLookups ? totalDownloads / totalLookups : 0,
    lookupSuccessRate: totalLookups ? lookupOk / totalLookups : 0,
    downloadsByMode: modeCounts,
    topSites,
    downloadSites,
    lookupFailures,
    topPages,
    byDay,
    recent,
    generatedAt: now,
  };
}
