// Chooses which WARP exit a YouTube request goes through.
//
// One WARP address was a single point of failure. When YouTube refused it,
// whoever asked next got "this site is rate-limiting our server", and the
// swap that fixed it cut every download in progress. The server now runs a
// pool of independent WARP exits (ops/warp-pool.sh): each is tested in the
// background with a real YouTube download, a refused one is replaced without
// touching the others, and the healthy ones are listed in data/warp-pool.json.
//
// A request takes a healthy exit from that list. If YouTube refuses it
// mid-request, the request moves to another healthy exit straight away, so a
// visitor never waits on a swap, and the refused exit is reported to the
// manager to be replaced in the background.
//
// No relative imports, so the tests can load this file on its own.

import fs from "node:fs";
import path from "node:path";

export type PoolMember = {
  name: string;
  proxy: string;
  healthy: boolean;
  exit?: string;
  checkedAt?: number;
};

// The manager rewrites the file every minute. One much older than this means
// the manager has stopped, and its picture of the pool can no longer be
// trusted, so the site falls back to the single configured proxy.
const STALE_MS = 15 * 60 * 1000;
// How long an exit this process saw refused is left out, whatever the file
// says, while the manager gets round to testing and replacing it.
const BAD_FOR_MS = 10 * 60 * 1000;
const READ_EVERY_MS = 5000;

let cache: { at: number; members: PoolMember[] } | null = null;
const localBad = new Map<string, number>();
let turn = 0;

export function poolFile(): string {
  return process.env.WARP_POOL_FILE || path.join(process.cwd(), "data", "warp-pool.json");
}

function suspectDir(): string {
  return process.env.WARP_POOL_SUSPECT_DIR || path.join(process.cwd(), "data", "warp-pool-suspect");
}

function readPool(now: number): PoolMember[] {
  if (cache && now - cache.at < READ_EVERY_MS) return cache.members;
  let members: PoolMember[] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(poolFile(), "utf8")) as {
      updatedAt?: number;
      members?: PoolMember[];
    };
    const fresh = typeof raw.updatedAt === "number" && now - raw.updatedAt * 1000 < STALE_MS;
    if (fresh && Array.isArray(raw.members)) {
      members = raw.members.filter(
        (m) => m && typeof m.proxy === "string" && /^socks5h?:\/\/(?:127\.0\.0\.1|localhost):\d+$/i.test(m.proxy),
      );
    }
  } catch {
    // No pool yet, or the file is mid-write. The single proxy is used.
  }
  cache = { at: now, members };
  return members;
}

/** Exits that passed their last test and have not been refused here lately. */
export function healthyExits(now = Date.now()): string[] {
  return readPool(now)
    .filter((m) => m.healthy)
    .map((m) => m.proxy)
    .filter((p) => now - (localBad.get(p) ?? 0) > BAD_FOR_MS);
}

/**
 * The next healthy exit not in `exclude`, or undefined when there is none,
 * in which case the caller uses the single configured proxy as before.
 * Taken in turn, so load and attention from YouTube are spread across them.
 */
export function pickExit(exclude: Iterable<string> = [], now = Date.now()): string | undefined {
  const skip = new Set(exclude);
  const choices = healthyExits(now).filter((p) => !skip.has(p));
  if (choices.length === 0) return undefined;
  turn = (turn + 1) % choices.length;
  return choices[turn];
}

/** True while the pool has at least one healthy exit to offer. */
export function poolActive(now = Date.now()): boolean {
  return healthyExits(now).length > 0;
}

/**
 * Takes an exit out of use here and asks the manager to test it now.
 * Never throws: a lost note only means the manager finds it on its next
 * routine test.
 */
export function markExitBad(proxy: string, now = Date.now()): void {
  localBad.set(proxy, now);
  const member = readPool(now).find((m) => m.proxy === proxy);
  if (!member || !/^[\w.-]+$/.test(member.name)) return;
  try {
    fs.mkdirSync(suspectDir(), { recursive: true });
    fs.writeFileSync(path.join(suspectDir(), member.name), `${new Date(now).toISOString()}\n`);
  } catch {
    // The manager's routine test will catch it instead.
  }
}

/** For tests: forget everything this process has learned. */
export function resetPoolMemory(): void {
  cache = null;
  localBad.clear();
  turn = 0;
}
