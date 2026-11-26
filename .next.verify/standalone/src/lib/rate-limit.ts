// Simple in-memory per-IP rate limiter. Single-instance only, which is fine
// for a self-hosted Node deployment. Behind a load balancer you would move
// this to Redis.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

// Ceiling on how many addresses are tracked at once. The sweep only runs once
// a minute and only drops expired entries, so without a cap a flood of
// distinct addresses grows this map faster than it is emptied, and the process
// runs out of memory. Well above any real traffic this site sees.
const MAX_BUCKETS = 20_000;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
}

// Drops the entries closest to expiry first, so an address mid-way through its
// window keeps its count and the limit still bites. Insertion order is good
// enough for that: the oldest keys are the ones nearest their reset.
function evictOldest(count: number) {
  let dropped = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++dropped >= count) break;
  }
}

/** Returns true if the request is allowed, false if the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    if (buckets.size >= MAX_BUCKETS) evictOldest(MAX_BUCKETS / 10);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/**
 * The address to rate-limit against.
 *
 * X-Forwarded-For is a list, and nginx appends the real peer to whatever the
 * client sent. The trustworthy entry is therefore the LAST one: everything
 * before it was written by the caller and can say anything.
 *
 * This used to read the first entry, which meant a caller could supply the
 * header itself and land in a different bucket on every request. Measured
 * against the live site: twenty-five requests from one spoofed address were
 * cut off at the limit, while twenty-five with a rotating address all went
 * through. The per-IP limits were decorative, and on the download endpoint
 * that is metered proxy data for every request that should have been refused.
 *
 * Only correct with exactly one reverse proxy in front, which is this
 * deployment. Adding a CDN would put its address last instead, and the number
 * of hops to skip would have to move with it.
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }
  // nginx sets this from $remote_addr, overwriting anything sent.
  return request.headers.get("x-real-ip") ?? "local";
}
