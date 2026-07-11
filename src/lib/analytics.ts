import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

// First-party analytics. Events are appended to a JSON-lines file so the admin
// dashboard has real numbers even without Google Analytics. No cookies, no IPs,
// no personal data is stored — only what was done and when.

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");

export type EventType = "pageview" | "lookup" | "download";

export type AnalyticsEvent = {
  t: number;
  type: EventType;
  site?: string;
  mode?: "video" | "audio";
  ok?: boolean;
  path?: string;
};

let dirReady = false;
function ensureDir() {
  if (dirReady) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  dirReady = true;
}

export async function logEvent(ev: Omit<AnalyticsEvent, "t">): Promise<void> {
  try {
    ensureDir();
    const line = JSON.stringify({ t: Date.now(), ...ev }) + "\n";
    await fsp.appendFile(EVENTS_FILE, line, "utf8");
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
  topPages: { path: string; count: number }[];
  byDay: { day: string; pageviews: number; downloads: number }[];
  recent: AnalyticsEvent[];
  generatedAt: number;
};

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
      if (ev.site) siteCounts.set(ev.site, (siteCounts.get(ev.site) ?? 0) + 1);
    } else if (ev.type === "download") {
      totalDownloads++;
      if (ev.t >= dayAgo) downloads24h++;
      if (ev.mode === "audio") modeCounts.audio++;
      else modeCounts.video++;
      if (bucket) bucket.downloads++;
    }
  }

  const topSites = [...siteCounts.entries()]
    .map(([site, count]) => ({ site, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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
    topPages,
    byDay,
    recent,
    generatedAt: now,
  };
}
