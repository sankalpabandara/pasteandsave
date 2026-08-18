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

type Verdict = { direct: boolean; at: number };

// How long a verdict stands before it is worth testing again. Long enough that
// a blocked site is not retried on every request, short enough to pick up a
// change within a day.
const REMEMBER_MS = 6 * 60 * 60 * 1000;

// A block costs one wasted attempt, so it is remembered for longer than a
// success, which costs nothing to re-confirm.
const REMEMBER_BLOCKED_MS = 12 * 60 * 60 * 1000;

const verdicts = new Map<string, Verdict>();

function key(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Whether to try this host without the proxy.
 *
 * Unknown means yes: the first request for a site pays one attempt to find
 * out, and every request after that is routed on evidence.
 */
export function shouldTryDirect(host: string): boolean {
  const v = verdicts.get(key(host));
  if (!v) return true;
  const age = Date.now() - v.at;
  const ttl = v.direct ? REMEMBER_MS : REMEMBER_BLOCKED_MS;
  if (age > ttl) return true;
  return v.direct;
}

/** Record what actually happened, so the next request routes on it. */
export function recordDirectResult(host: string, worked: boolean): void {
  verdicts.set(key(host), { direct: worked, at: Date.now() });
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
}
