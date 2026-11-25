// Photos from a TikTok photo post (a slideshow).
//
// yt-dlp has no extractor for tiktok.com/@user/photo/ID, so every slideshow
// failed as "not a site we can download from": 17 vt.tiktok.com and 7
// tiktok.com lookups in the 30 days to 2026-11-25, the short links being the
// app's Share button landing on a /photo/ address. Measured from the server
// the same day: the post's /video/ address serves the page with its data, and
// itemStruct.imagePost.images lists every slide at full size (1440x1440 on the
// posts tried), downloadable from TikTok's image hosts with no cookie. The
// /photo/ address itself serves a page without that data. A deleted post
// answers statusCode 10204.
//
// No relative imports, so the tests can load it directly.

export type TikTokPhoto = { url: string; width: number | null; height: number | null; ext: string };

const PHOTO_PATH = /^\/@([\w.-]{1,64})\/photo\/(\d{8,25})\/?$/;
const TIKTOK_HOST = /^(?:www\.|m\.)?tiktok\.com$/i;
// The image servers the slides were served from: p16-common-sign.tiktokcdn-eu.com
// and its siblings. Only these are kept, so nothing in a page can point a
// download anywhere else.
const IMAGE_HOST = /^[a-z0-9-]+\.tiktokcdn(?:-[a-z]{2})?\.com$/i;
const DELETED_STATUS = new Set([10204, 10216]);

/** The author and post id of a TikTok photo post address, or null. */
export function tiktokPhotoPost(raw: string): { user: string; id: string } | null {
  try {
    const u = new URL(raw);
    if (!TIKTOK_HOST.test(u.hostname)) return null;
    const m = PHOTO_PATH.exec(u.pathname);
    return m ? { user: m[1], id: m[2] } : null;
  } catch {
    return null;
  }
}

/**
 * The same post at its /video/ address, which yt-dlp does read: for a
 * slideshow it gives the soundtrack, which is what the MP3 option saves.
 */
export function tiktokVideoAddress(raw: string): string | null {
  const post = tiktokPhotoPost(raw);
  return post ? `https://www.tiktok.com/@${post.user}/video/${post.id}` : null;
}

function rehydrationData(html: string): Record<string, unknown> | null {
  const m = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** The slides in a post page, or `removed` for a deleted post. */
export function photosFromTikTokPage(html: string): { photos: TikTokPhoto[]; removed: boolean; title: string | null } {
  const empty = { photos: [], removed: false, title: null };
  const data = rehydrationData(html);
  const scope = (data?.__DEFAULT_SCOPE__ ?? {}) as Record<string, unknown>;
  const detail = scope["webapp.video-detail"] as Record<string, unknown> | undefined;
  if (!detail) return empty;
  if (typeof detail.statusCode === "number" && DELETED_STATUS.has(detail.statusCode)) {
    return { photos: [], removed: true, title: null };
  }
  const item = ((detail.itemInfo ?? {}) as Record<string, unknown>).itemStruct as Record<string, unknown> | undefined;
  const post = (item?.imagePost ?? null) as Record<string, unknown> | null;
  const images = Array.isArray(post?.images) ? post.images : [];
  const photos: TikTokPhoto[] = [];
  for (const raw of images) {
    const img = (raw ?? {}) as Record<string, unknown>;
    const list = ((img.imageURL ?? {}) as Record<string, unknown>).urlList;
    if (!Array.isArray(list)) continue;
    for (const candidate of list) {
      if (typeof candidate !== "string") continue;
      let u: URL;
      try {
        u = new URL(candidate);
      } catch {
        continue;
      }
      if (u.protocol !== "https:" || !IMAGE_HOST.test(u.hostname)) continue;
      const found = /\.(jpe?g|png|webp)(?:$|[?~])/i.exec(u.pathname);
      photos.push({
        url: u.toString(),
        width: typeof img.imageWidth === "number" ? img.imageWidth : null,
        height: typeof img.imageHeight === "number" ? img.imageHeight : null,
        ext: found ? found[1].toLowerCase().replace("jpeg", "jpg") : "jpg",
      });
      break;
    }
  }
  const titleRaw = typeof post?.title === "string" && post.title.trim() ? post.title : item?.desc;
  const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 120) : null;
  return { photos, removed: false, title };
}

/** Reads a photo post's slides from its page. Never throws. */
export async function fetchTikTokPhotos(
  post: { user: string; id: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ photos: TikTokPhoto[]; removed: boolean; title: string | null }> {
  const url = `https://www.tiktok.com/@${encodeURIComponent(post.user)}/video/${encodeURIComponent(post.id)}`;
  try {
    const res = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      await res.arrayBuffer().catch(() => undefined);
      return { photos: [], removed: false, title: null };
    }
    return photosFromTikTokPage(await res.text());
  } catch {
    return { photos: [], removed: false, title: null };
  }
}
