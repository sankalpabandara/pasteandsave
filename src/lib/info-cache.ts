// Holds the extractor output from a lookup so the download does not have to
// ask for it again.
//
// Pasting a link and pressing save is two separate requests, and each was
// doing its own full extraction. On a proxied site that is two metered round
// trips for one download, and the second one asks the same question the first
// already answered seconds earlier.
//
// The links inside carry an expiry, so this is deliberately short-lived: long
// enough to cover somebody reading the quality list and choosing, nowhere near
// long enough for a link to go stale. A miss is not a failure, it just means
// the download extracts for itself as it always did.

type Entry = { raw: string; at: number };

// Comfortably longer than picking a format takes, comfortably shorter than the
// few hours a signed CDN link stays valid.
const TTL_MS = 20 * 60 * 1000;

// Roughly 160 KB per entry, so this is a few megabytes at worst. Bounded
// because the key is a visitor-supplied URL and an unbounded map keyed on user
// input is a way to run a server out of memory.
const MAX_ENTRIES = 60;

// Anything larger than this is not worth holding: a playlist or an unusual
// extractor, not the single-video case this exists for.
const MAX_BYTES = 4 * 1024 * 1024;

const cache = new Map<string, Entry>();

function evictExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.at > TTL_MS) cache.delete(key);
  }
}

/** Store the raw extractor JSON for a URL that was just looked up. */
export function putInfo(url: string, raw: string): void {
  if (!raw || raw.length > MAX_BYTES) return;
  const now = Date.now();
  evictExpired(now);
  // Map preserves insertion order, so the first key is the oldest.
  while (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  cache.set(url, { raw, at: now });
}

/** The JSON a lookup already fetched for this URL, if it is still fresh. */
export function takeInfo(url: string): string | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(url);
    return null;
  }
  return entry.raw;
}

/** For tests and for reporting how much is being reused. */
export function infoCacheSize(): number {
  evictExpired(Date.now());
  return cache.size;
}
