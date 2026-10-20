// Photos from an X post.
//
// yt-dlp only extracts video from X, so a photo post failed with "No video
// could be found in this tweet": 29 x.com lookups in the week to 2026-10-20,
// the most of any site. X's embed data, the same feed its embedded post
// widget reads, lists the photos, and answered this server directly when
// measured: a photo post gave its photo, a deleted post a tombstone.
//
// No relative imports, so the tests can load it directly.

export type XPhoto = { url: string; width: number | null; height: number | null; ext: string };

const STATUS_PATH = /^\/(?:[A-Za-z0-9_]{1,15}|i(?:\/web)?)\/status(?:es)?\/(\d{1,25})(?:\/|$)/;

/** The post id in an X or Twitter post address, or null. */
export function tweetIdFrom(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i.test(u.hostname)) return null;
    const m = STATUS_PATH.exec(u.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** The token the embed widget sends with each request, derived from the id. */
export function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

/** yt-dlp's ways of saying a post has no video, which a photo post also says. */
export const X_NO_VIDEO =
  /\[twitter[^\]]*\][^\n]*(?:No video could be found|is not a video|Video #\d+ is unavailable)/i;

/**
 * The photos in an embed-data response, or `removed` for a deleted post.
 * Only pbs.twimg.com media addresses are kept, so nothing in the response
 * can point a download anywhere else.
 */
export function photosFromSyndication(body: unknown): { photos: XPhoto[]; removed: boolean } {
  if (!body || typeof body !== "object") return { photos: [], removed: false };
  const d = body as Record<string, unknown>;
  if (d.__typename === "TweetTombstone") return { photos: [], removed: true };
  const media = Array.isArray(d.mediaDetails) ? d.mediaDetails : [];
  const photos: XPhoto[] = [];
  for (const item of media) {
    const m = item as Record<string, unknown>;
    if (!m || m.type !== "photo" || typeof m.media_url_https !== "string") continue;
    let u: URL;
    try {
      u = new URL(m.media_url_https);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" || u.hostname !== "pbs.twimg.com" || !u.pathname.startsWith("/media/")) continue;
    const found = /\.(jpe?g|png|webp)$/i.exec(u.pathname);
    const ext = found ? found[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
    const base = u.pathname.replace(/\.(jpe?g|png|webp)$/i, "");
    const info = (m.original_info ?? {}) as Record<string, unknown>;
    photos.push({
      // name=orig asks for the photo as uploaded rather than a resized copy.
      url: `https://pbs.twimg.com${base}?format=${ext}&name=orig`,
      width: typeof info.width === "number" ? info.width : null,
      height: typeof info.height === "number" ? info.height : null,
      ext,
    });
  }
  return { photos, removed: false };
}

/** Asks X's embed data for a post's photos. Never throws. */
export async function fetchTweetPhotos(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ photos: XPhoto[]; removed: boolean }> {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(id)}&lang=en&token=${syndicationToken(id)}`;
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" },
    });
    if (!res.ok) {
      await res.arrayBuffer().catch(() => undefined);
      return { photos: [], removed: false };
    }
    return photosFromSyndication(await res.json());
  } catch {
    return { photos: [], removed: false };
  }
}

// The download is a separate request naming the post again, so the lookup's
// list is kept for it, keyed by the post's address.
const REMEMBER_MS = 60 * 60 * 1000;
const REMEMBER_MAX = 500;
const remembered = new Map<string, { at: number; photos: XPhoto[] }>();

export function rememberPhotos(key: string, photos: XPhoto[]): void {
  remembered.delete(key);
  remembered.set(key, { at: Date.now(), photos });
  while (remembered.size > REMEMBER_MAX) {
    const oldest = remembered.keys().next().value;
    if (oldest === undefined) break;
    remembered.delete(oldest);
  }
}

export function photosFor(key: string, now = Date.now()): XPhoto[] | null {
  const hit = remembered.get(key);
  if (!hit) return null;
  if (now - hit.at > REMEMBER_MS) {
    remembered.delete(key);
    return null;
  }
  return hit.photos;
}

/** The 1-based photo number in a format id such as "xphoto-2", or null. */
export function photoIndexOf(formatId: string | undefined): number | null {
  const m = /^xphoto-(\d{1,2})$/.exec(formatId ?? "");
  return m ? Number(m[1]) : null;
}
