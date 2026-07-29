// How much metered proxy data this server has spent, and a ceiling on it.
//
// Written after 18 GB of residential proxy data disappeared in six days
// against a handful of real downloads. The cause was that entire video files
// were being pulled through the proxy, and nothing anywhere counted the bytes,
// so the only place the spend was visible was the provider's dashboard after
// the money had gone.
//
// Two jobs here: keep a running total that can be looked at, and refuse to
// spend past a daily ceiling so a bad day cannot empty the balance.

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const LEDGER = path.join(DATA_DIR, "proxy-usage.json");

// The month's allowance, spread evenly. 27 GB over 31 days is ~890 MB a day.
// Set PROXY_DAILY_MB to change it; 0 disables the ceiling entirely.
const DAILY_MB = Number(process.env.PROXY_DAILY_MB ?? 890);

type Ledger = {
  day: string;
  bytes: number;
  /** Bytes by reason, so an unexpected total can be traced to what spent it. */
  by: Record<string, number>;
  /** Rolling record of previous days, newest last, capped. */
  history: { day: string; bytes: number }[];
};

const empty = (day: string): Ledger => ({ day, bytes: 0, by: {}, history: [] });

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

let cache: Ledger | null = null;

function load(): Ledger {
  if (cache && cache.day === today()) return cache;
  let led: Ledger;
  try {
    led = JSON.parse(fs.readFileSync(LEDGER, "utf8")) as Ledger;
  } catch {
    led = empty(today());
  }
  // A new day archives the old one rather than discarding it, because "is
  // today unusual" is not answerable without something to compare against.
  if (led.day !== today()) {
    const history = [...(led.history ?? []), { day: led.day, bytes: led.bytes }];
    led = { ...empty(today()), history: history.slice(-30) };
  }
  cache = led;
  return led;
}

function save(led: Ledger): void {
  cache = led;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify(led));
  } catch {
    // Counting is best-effort. Losing the file must never fail a download.
  }
}

/** Record metered bytes actually sent through the proxy. */
export function recordProxyBytes(reason: string, bytes: number): void {
  if (!Number.isFinite(bytes) || bytes <= 0) return;
  const led = load();
  led.bytes += bytes;
  led.by[reason] = (led.by[reason] ?? 0) + bytes;
  save(led);
}

/**
 * Whether more metered data may be spent right now.
 *
 * Deliberately not applied to metadata lookups: those are a few hundred KB and
 * blocking them would take the site down to save pennies. It guards the one
 * thing that can actually empty the balance, which is pulling whole media
 * files through the proxy.
 */
export function proxyBudgetLeft(): { allowed: boolean; usedMb: number; limitMb: number } {
  const led = load();
  const usedMb = led.bytes / 1_000_000;
  if (DAILY_MB <= 0) return { allowed: true, usedMb, limitMb: 0 };
  return { allowed: usedMb < DAILY_MB, usedMb, limitMb: DAILY_MB };
}

export function proxyUsage(): {
  day: string;
  usedMb: number;
  limitMb: number;
  by: Record<string, number>;
  history: { day: string; bytes: number }[];
} {
  const led = load();
  return {
    day: led.day,
    usedMb: Math.round((led.bytes / 1_000_000) * 100) / 100,
    limitMb: DAILY_MB,
    by: led.by,
    history: led.history ?? [],
  };
}
