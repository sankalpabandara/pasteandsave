import fsp from "node:fs/promises";
import path from "node:path";

// Spend-guard for the metered residential proxy. Only downloads that actually
// go through the proxy (YouTube and friends) count here, so the many sites
// that work direct are never limited. A daily bandwidth ceiling means a
// traffic spike or abuse can't drain the proxy balance overnight.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "proxy-usage.json");

// Daily ceiling on proxied bandwidth, in MB. Generous by default; tune with
// YTDLP_PROXY_DAILY_MB, or set it to 0 to disable the cap entirely.
export const PROXY_DAILY_MB = (() => {
  const n = Number(process.env.YTDLP_PROXY_DAILY_MB);
  return Number.isFinite(n) && n >= 0 ? n : 2048;
})();

// We don't know a download's exact size when it starts, so estimate
// conservatively (better to pause a little early than overspend).
const EST_BYTES = { audio: 6 * 1024 * 1024, video: 50 * 1024 * 1024 };

type Usage = { day: string; downloads: number; bytes: number };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function read(): Promise<Usage> {
  try {
    const u = JSON.parse(await fsp.readFile(FILE, "utf8")) as Usage;
    if (u && u.day === today()) return u;
  } catch {
    // no file yet, or a new day, start fresh
  }
  return { day: today(), downloads: 0, bytes: 0 };
}

async function write(u: Usage): Promise<void> {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(FILE, JSON.stringify(u), "utf8");
  } catch {
    // best effort; never block a download on a write failure
  }
}

/** False once today's proxied bandwidth has reached the cap. */
export async function proxyBudgetOk(): Promise<boolean> {
  if (PROXY_DAILY_MB === 0) return true;
  return (await read()).bytes < PROXY_DAILY_MB * 1024 * 1024;
}

/** Add one proxied download's estimated size to today's running total. */
// Every update runs to completion before the next one starts.
//
// Read-modify-write on a shared file is lossy the moment two downloads
// overlap: both read the same total, both add their own size, and whichever
// writes last erases the other. Downloads run concurrently here by design, so
// the day's total drifted below the truth and the cap let more through than
// it was set to allow. Chaining the writes is enough, because this process is
// the only writer.
let writeQueue: Promise<void> = Promise.resolve();

export function recordProxyUsage(mode: "audio" | "video"): Promise<void> {
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const u = await read();
      u.downloads += 1;
      u.bytes += EST_BYTES[mode] ?? EST_BYTES.video;
      await write(u);
    });
  return writeQueue;
}

/** For the admin panel: how much proxied data has been used today. */
export async function proxyUsageToday(): Promise<{
  downloads: number;
  usedMb: number;
  capMb: number;
}> {
  const u = await read();
  return {
    downloads: u.downloads,
    usedMb: Math.round(u.bytes / 1024 / 1024),
    capMb: PROXY_DAILY_MB,
  };
}
