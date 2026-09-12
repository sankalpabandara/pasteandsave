// Remembers, per site, whether this server can reach it without the proxy.
//
// The host list is a guess written down once. YouTube is on it because
// datacenter addresses were being refused at the time, and it has stayed on it
// ever since without anyone re-checking. Blocks are not permanent: they depend
// on the address, the player client and whatever YouTube changed last week, and
// the only way to know today's answer is to try.
//
// So the routing is not fixed. A site on the list is tried directly first; if
// that works, the proxy is not used at all, and if it is refused the proxy is
// used and direct is not tried again for a while. One failed attempt buys hours
// of correct routing, and the day the block lifts this notices on its own
// instead of waiting for someone to edit an environment variable.

// Which sites refuse this server's address.
//
// Only sites proven to refuse it belong here. Everything else goes direct and,
// if it turns out to be blocked, is retried through the proxy automatically by
// the fallback in fetchInfo, so being absent from this list costs a slow first
// attempt, never a broken site.
//
// Instagram and Threads refuse datacenter addresses outright: the same reel
// that extracts fine from a home connection fails in about four seconds from
// the server. TikTok and Facebook work direct and stay off.
//
// Dailymotion was listed here historically and was failing *because* of it:
// it extracts fine direct but returns errors through the proxy, which points
// at the exit node's location rather than the extractor. Direct-first with
// the automatic fallback covers both cases.
export const PROXY_HOSTS = (
  process.env.YTDLP_PROXY_HOSTS ||
  "youtube.com,youtu.be,youtube-nocookie.com,instagram.com,threads.net,bilibili.com"
)
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Whether this site is one that refuses our datacenter address, independent of
 * whether a proxy is configured to do anything about it.
 *
 * These are two different questions and the code used to answer only one. The
 * proxy-argument builder returns nothing both when a site does not need the
 * proxy and when there is no proxy to give it, and those cases want opposite
 * handling: the first should go direct, the second should stop and say so.
 * Conflating them is what made a YouTube link on a proxy-less server spend two
 * full extractor timeouts rediscovering something already known.
 */
export function hostNeedsProxy(rawUrl: string): boolean {
  if (PROXY_HOSTS.includes("all") || PROXY_HOSTS.includes("*")) return true;
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  // Suffix alone is not enough: "notyoutube.com" ends with "youtube.com".
  return PROXY_HOSTS.some((h) => host === h || host.endsWith("." + h));
}

// The extractor configuration the verdict was learned under. A refusal recorded
// with a dead player client and no JS runtime says nothing about whether the
// same address is refused once those are fixed, and treating it as though it did
// kept the site on a dead proxy after the real fault had been repaired. When the
// configuration changes, what we learned under the old one is discarded.
import fs from "node:fs";
import path from "node:path";

type Verdict = { direct: boolean; at: number; fp: string };

// How long a verdict stands before it is worth testing again. Long enough that
// a blocked site is not retried on every request, short enough to pick up a
// change within a day.
const REMEMBER_MS = 6 * 60 * 60 * 1000;

// A block costs one wasted attempt, so it is remembered for longer than a
// success, which costs nothing to re-confirm.
const REMEMBER_BLOCKED_MS = 12 * 60 * 60 * 1000;

const verdicts = new Map<string, Verdict>();

// Verdicts outlive the process.
//
// They were memory only, so every restart forgot them, and the first YouTube
// lookup afterwards paid a doomed direct attempt: twenty five seconds of
// timeout before falling back to the proxy, on a lookup whose whole budget is
// sixty. Measured right after a deploy, one took 48.8 seconds, and two visitors
// got "yt-dlp timed out" instead of a video. On a box that deploys on every
// push, that is not an edge case.
//
// Stored as plain JSON next to the other counters. Losing the file costs one
// slow lookup, so every failure here is ignored on purpose: this is an
// optimisation, and it must never be the reason a download fails.
const STORE = path.join(process.cwd(), "data", "routing.json");

function load(): void {
  try {
    const raw = fs.readFileSync(STORE, "utf8");
    const saved = JSON.parse(raw) as Record<string, Verdict>;
    const now = Date.now();
    for (const [host, v] of Object.entries(saved)) {
      if (!v || typeof v.direct !== "boolean" || typeof v.at !== "number") continue;
      // Anything already past its own expiry is not worth loading, and the
      // fingerprint check in shouldTryDirect still retires the rest.
      const ttl = v.direct ? REMEMBER_MS : REMEMBER_BLOCKED_MS;
      if (now - v.at > ttl) continue;
      verdicts.set(host, { direct: v.direct, at: v.at, fp: typeof v.fp === "string" ? v.fp : "" });
    }
  } catch {
    // No file yet, or unreadable. Start empty, exactly as before.
  }
}

// Writes are coalesced: a burst of lookups should not mean a burst of writes,
// and losing the last second of verdicts costs nothing.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(STORE), { recursive: true });
      fs.writeFileSync(STORE, JSON.stringify(Object.fromEntries(verdicts)), "utf8");
    } catch {
      // Best effort, as above.
    }
  }, 2000);
  // Do not hold the process open for a cache write.
  saveTimer.unref?.();
}

load();

function key(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Whether to try this host without the proxy.
 *
 * Unknown means yes: the first request for a site pays one attempt to find
 * out, and every request after that is routed on evidence.
 */
export function shouldTryDirect(host: string, fp = ""): boolean {
  const v = verdicts.get(key(host));
  if (!v) return true;
  // Learned under a different extractor; worth one attempt to find out again.
  if (v.fp !== fp) return true;
  const age = Date.now() - v.at;
  const ttl = v.direct ? REMEMBER_MS : REMEMBER_BLOCKED_MS;
  if (age > ttl) return true;
  return v.direct;
}

/** Record what actually happened, so the next request routes on it. */
export function recordDirectResult(host: string, worked: boolean, fp = ""): void {
  verdicts.set(key(host), { direct: worked, at: Date.now(), fp });
  save();
}

/** For the health endpoint, so the routing in effect can be seen. */
export function routingReport(): Record<string, { direct: boolean; ageMinutes: number }> {
  const out: Record<string, { direct: boolean; ageMinutes: number }> = {};
  const now = Date.now();
  for (const [host, v] of verdicts) {
    out[host] = { direct: v.direct, ageMinutes: Math.round((now - v.at) / 60000) };
  }
  return out;
}

/** Tests only: forget everything learned. */
export function resetRouting(): void {
  verdicts.clear();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export const PROXY_STICKY = (process.env.YTDLP_PROXY_STICKY ?? "1") !== "0";

// Derived from the video address rather than drawn at random, so that every
// call about the same video lands on the same exit address.
//
// A random id per call meant the lookup and the download used different exit
// addresses. The lookup caches the extractor output, the download replays it
// with --load-info-json, and those links are signed for whichever address
// fetched them, so replaying session A's links over session B is refused. That
// surfaced to visitors as "this site is rate-limiting our server", which named
// the wrong culprit: the platform was refusing a mismatch we created.
//
// The same-video-same-session property is what matters; the value only has to
// be stable, short and alphanumeric.
export function newSessionId(seed?: string): string {
  if (!seed) return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padEnd(8, "0").slice(0, 8);
}

export function stickyProxyUrl(raw: string, seed?: string): string {
  if (!PROXY_STICKY) return raw;
  try {
    const u = new URL(raw);
    // Nothing to attach the session to without credentials.
    if (!u.password) return raw;
    if (/_session-/.test(u.password)) return raw;
    u.password = `${u.password}_session-${newSessionId(seed)}`;
    return u.toString();
  } catch {
    return raw;
  }
}
