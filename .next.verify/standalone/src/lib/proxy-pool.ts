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
// "host|proxy" -> when that site last turned that exit away. A site judging
// an exit is about that site: Instagram refusing an exit says nothing about
// whether YouTube or Facebook will, and taking it out of use for everyone
// threw away capacity the other sites needed.
const siteBad = new Map<string, number>();
let turn = 0;

function siteKey(host: string, proxy: string): string {
  return `${host.toLowerCase().replace(/^www\./, "")}|${proxy}`;
}

/**
 * The IPv6 /48 an exit's address sits in. Measured on 2026-10-19, every exit
 * shares one IPv4 address (104.28.196.54) and differs only in IPv6, and two
 * of the five were in the same /48. Sites that judge by block, YouTube for
 * one, see those two as the same visitor, so a retry should go to a
 * different block when there is one.
 */
export function blockOf(address: string | undefined): string {
  if (!address || !address.includes(":")) return address ?? "";
  return address.split(":").slice(0, 3).join(":");
}

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
 *
 * Taken in turn, so load and attention are spread across the pool, never
 * concentrated on one favourite: sending everything for a busy site through
 * the exit that last worked is how an exit gets flagged. Within that, given
 * the site the request is for, exits that site turned away lately go last,
 * and so do exits in an IPv6 block this request has already tried. Both are
 * an order, not a ban: when nothing else is left they are still offered.
 */
export function pickExit(
  exclude: Iterable<string> = [],
  now = Date.now(),
  host?: string,
): string | undefined {
  const skip = new Set(exclude);
  const healthy = new Set(healthyExits(now));
  const members = readPool(now);
  const choices = members.filter((m) => healthy.has(m.proxy) && !skip.has(m.proxy));
  if (choices.length === 0) return undefined;
  const triedBlocks = new Set(
    members.filter((m) => skip.has(m.proxy)).map((m) => blockOf(m.exit)).filter(Boolean),
  );
  const cost = (m: PoolMember) =>
    (host && now - (siteBad.get(siteKey(host, m.proxy)) ?? -Infinity) < BAD_FOR_MS ? 2 : 0) +
    (triedBlocks.has(blockOf(m.exit)) ? 1 : 0);
  const least = Math.min(...choices.map(cost));
  const best = choices.filter((m) => cost(m) === least);
  turn = (turn + 1) % best.length;
  return best[turn].proxy;
}

/**
 * This site turned this exit away. It is tried last for this site for a
 * while, and stays in use for every other site. The manager is not told:
 * it tests exits against YouTube, which this says nothing about.
 */
export function markExitBadFor(host: string, proxy: string, now = Date.now()): void {
  siteBad.set(siteKey(host, proxy), now);
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
  siteBad.clear();
  turn = 0;
}
