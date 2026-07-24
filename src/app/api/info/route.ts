import type { NextRequest } from "next/server";
import { fetchInfo, isSafeUrl, userFacingError, type YtDlpFormat } from "@/lib/ytdlp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupLimiter, MAX_LOOKUP_QUEUE } from "@/lib/concurrency";
import { logEvent } from "@/lib/analytics";

export const runtime = "nodejs";

type VideoTier = {
  formatId: string;
  ext: string;
  label: string;
  height: number;
  hasAudio: boolean;
  filesize: number | null;
};

type AudioOption = {
  id: string;
  label: string;
  audioFormat: "mp3" | "m4a";
  bitrate: number | null;
};

type ImageFormat = {
  formatId: string;
  ext: string;
  label: string;
  filesize: number | null;
};

// The quality ladder visitors actually recognise. Raw sites report dozens of
// near-duplicate streams (1220p WEBM, 916p MP4, ...); everything is snapped
// into these buckets so the list stays short and readable.
const VIDEO_TIERS = [2160, 1440, 1080, 720, 480, 360, 240, 144];

// Fixed MP3 choices, mirroring what people expect from a converter. The
// source is re-encoded to the chosen rate, so a high number can't add detail
// that was never in the original — it only sets the output bitrate.
const AUDIO_OPTIONS: AudioOption[] = [
  { id: "mp3-320", label: "320kbps", audioFormat: "mp3", bitrate: 320 },
  { id: "mp3-256", label: "256kbps", audioFormat: "mp3", bitrate: 256 },
  { id: "mp3-128", label: "128kbps", audioFormat: "mp3", bitrate: 128 },
  { id: "mp3-96", label: "96kbps", audioFormat: "mp3", bitrate: 96 },
  { id: "mp3-64", label: "64kbps", audioFormat: "mp3", bitrate: 64 },
  { id: "m4a", label: "M4A", audioFormat: "m4a", bitrate: null },
];

// Image posts (photo posts, TikTok slideshow frames, Pinterest images) come
// back from yt-dlp with no video and no audio codec, so they used to be
// filtered out. These extensions mark a format as an image instead.
const IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "bmp",
  "tiff",
  "avif",
]);

function isImageFormat(f: { ext?: string; vcodec?: string; acodec?: string }): boolean {
  const ext = (f.ext ?? "").toLowerCase();
  if (IMAGE_EXTS.has(ext)) return true;
  // Some extractors leave ext blank but mark both codecs "none" and give a
  // resolution; treat those as images too rather than dropping them.
  return f.vcodec === "none" && f.acodec === "none" && ext === "";
}

function imageLabel(f: { ext: string; width?: number; height?: number }): string {
  const kind = f.ext ? `Photo (${f.ext.toUpperCase()})` : "Photo";
  if (f.width && f.height) return `${kind} ${f.width}x${f.height}`;
  return kind;
}

// The "p" number people expect is the short side of the frame: a phone clip
// recorded at 720x1220 is 720p, not 1220p. Using the short side stops vertical
// videos and Shorts from showing labels nobody recognises.
function qualityOf(f: { height?: number; width?: number }): number {
  const h = f.height ?? 0;
  const w = f.width ?? 0;
  if (h > 0 && w > 0) return Math.min(h, w);
  return h;
}

// Snaps a real height onto the ladder above, allowing a little slack so a
// 1078p or 1082p stream still lands in the 1080p bucket.
function tierFor(quality: number): number | null {
  for (const tier of VIDEO_TIERS) {
    if (quality >= tier * 0.9) return tier;
  }
  return null;
}

// Within one bucket, keep the stream that plays everywhere: MP4/H.264 first,
// then whichever carries the most bitrate.
function isBetterVideo(a: YtDlpFormat, b: YtDlpFormat): boolean {
  const aMp4 = a.ext === "mp4" ? 1 : 0;
  const bMp4 = b.ext === "mp4" ? 1 : 0;
  if (aMp4 !== bMp4) return aMp4 > bMp4;
  return (a.tbr ?? 0) > (b.tbr ?? 0);
}

// A lookup costs a slow round trip to the source site (and, for YouTube, a
// metered proxy hop), yet the answer barely changes minute to minute. Holding
// recent results makes a re-paste of the same link instant and keeps repeat
// visitors off the proxy entirely.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const infoCache = new Map<string, { at: number; payload: unknown }>();

function cacheGet(key: string): unknown | null {
  const hit = infoCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    infoCache.delete(key);
    return null;
  }
  // Refresh insertion order so busy links survive the size trim.
  infoCache.delete(key);
  infoCache.set(key, hit);
  return hit.payload;
}

function cacheSet(key: string, payload: unknown) {
  infoCache.set(key, { at: Date.now(), payload });
  while (infoCache.size > CACHE_MAX) {
    const oldest = infoCache.keys().next().value;
    if (oldest === undefined) break;
    infoCache.delete(oldest);
  }
}

export async function POST(request: NextRequest) {
  if (!rateLimit(`info:${clientIp(request)}`, 20, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }
  if (lookupLimiter.queueLength > MAX_LOOKUP_QUEUE) {
    return Response.json(
      { error: "Server is busy. Try again in a moment." },
      { status: 503 },
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "Paste a link first." }, { status: 400 });
  }
  if (!isSafeUrl(url)) {
    return Response.json({ error: "That link isn't valid." }, { status: 400 });
  }

  const cached = cacheGet(url);
  if (cached) return Response.json(cached);

  try {
    const info = await fetchInfo(url);
    void logEvent({
      type: "lookup",
      ok: true,
      site: info.extractor_key ?? info.extractor ?? undefined,
    });

    const all = info.formats ?? [];
    const sizeOf = (f: YtDlpFormat) => f.filesize ?? f.filesize_approx ?? null;

    // Photo posts (Instagram carousels, TikTok slideshows) have no streams to
    // bucket, so they stay a plain list.
    const images: ImageFormat[] = all.filter(isImageFormat).map((f) => ({
      formatId: f.format_id,
      ext: f.ext,
      label: imageLabel(f),
      filesize: sizeOf(f),
    }));

    const hasVideo = (f: YtDlpFormat) => !!f.vcodec && f.vcodec !== "none";
    const hasAudio = (f: YtDlpFormat) => !!f.acodec && f.acodec !== "none";

    // Cheapest audio stream that will be merged into a video-only pick. Used
    // to quote an honest combined size in the list.
    const audioSizes = all
      .filter((f) => !hasVideo(f) && hasAudio(f))
      .map(sizeOf)
      .filter((n): n is number => typeof n === "number" && n > 0)
      .sort((a, b) => a - b);
    const mergeAudioSize = audioSizes.length > 0 ? audioSizes[0] : 0;

    // One winner per rung of the ladder.
    const best = new Map<number, YtDlpFormat>();
    for (const f of all) {
      if (!hasVideo(f) || isImageFormat(f)) continue;
      const tier = tierFor(qualityOf(f));
      if (tier === null) continue;
      const current = best.get(tier);
      if (!current || isBetterVideo(f, current)) best.set(tier, f);
    }

    const video: VideoTier[] = VIDEO_TIERS.filter((t) => best.has(t)).map((tier) => {
      const f = best.get(tier)!;
      const withAudio = hasAudio(f);
      const size = sizeOf(f);
      return {
        formatId: f.format_id,
        ext: f.ext,
        label: `${tier}p`,
        height: tier,
        hasAudio: withAudio,
        // A video-only stream gains the audio track it gets merged with.
        filesize: size === null ? null : withAudio ? size : size + mergeAudioSize,
      };
    });

    // Only offer audio when the source actually has a soundtrack.
    const audio: AudioOption[] = all.some(hasAudio) ? AUDIO_OPTIONS : [];

    const payload = {
      title: info.title ?? "Untitled",
      thumbnail: info.thumbnail ?? null,
      duration: info.duration ?? null,
      uploader: info.uploader ?? null,
      site: info.extractor_key ?? info.extractor ?? null,
      video,
      audio,
      images,
    };
    // Only worth remembering if there is something to download.
    if (video.length > 0 || images.length > 0) cacheSet(url, payload);
    return Response.json(payload);
  } catch (err) {
    void logEvent({ type: "lookup", ok: false });
    const { error, status } = userFacingError(err);
    // Only log the unexpected ones; private/removed/photo posts are normal.
    if (status >= 500) console.error("yt-dlp info error", err);
    return Response.json({ error }, { status });
  }
}
