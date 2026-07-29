// Tracks whether the residential proxy is actually working.
//
// A dead proxy is the worst kind of outage here, because nothing looks broken:
// the site is up, the binaries are fine, and every proxied platform simply
// reports that the video could not be read. Somebody can spend days blaming
// YouTube for what is really an expired proxy balance.
//
// Nothing is probed on a timer. The proxy is metered, so a check every couple
// of minutes would spend real money to learn what live traffic already knows.
// Real attempts are recorded as they happen and the recent failure rate is
// reported to the health endpoint, where the watchdog can alert on it.

// Does this failure describe our own connection out, rather than the video?
//
// Kept here, in a module with no imports, so it can be tested directly. The
// distinction matters more than it looks: a proxy fault reported as "this
// video may be private" sends whoever reads it to check the video, the
// platform and the extractor, and none of those are wrong.
export function looksLikeProxyFailure(stderr: string): boolean {
  return /\bproxy\b|proxyerror|tunnel connection|407/i.test(stderr);
}

const WINDOW = 20;

type Attempt = { ok: boolean; at: number };
const recent: Attempt[] = [];

/** Called after any request that actually went through the proxy. */
export function recordProxyAttempt(ok: boolean): void {
  recent.push({ ok, at: Date.now() });
  if (recent.length > WINDOW) recent.shift();
}

export type ProxyHealth = {
  /** Attempts recorded in the current window. */
  samples: number;
  failures: number;
  /** True when enough attempts have failed that the proxy looks down. */
  failing: boolean;
  lastFailureAgoSeconds: number | null;
};

export function proxyHealth(): ProxyHealth {
  const samples = recent.length;
  const failures = recent.filter((a) => !a.ok).length;
  const lastFailure = [...recent].reverse().find((a) => !a.ok);
  // A few failures are normal: videos get deleted, sites rate-limit. A run
  // of them with nothing succeeding is an outage, so the bar is a majority
  // of a meaningful sample rather than any failure at all.
  const failing = samples >= 4 && failures / samples >= 0.75;
  return {
    samples,
    failures,
    failing,
    lastFailureAgoSeconds: lastFailure
      ? Math.round((Date.now() - lastFailure.at) / 1000)
      : null,
  };
}
