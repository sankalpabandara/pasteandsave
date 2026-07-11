import type { NextRequest } from "next/server";
import { UnsupportedSiteError, fetchInfo, isSafeUrl } from "@/lib/ytdlp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupLimiter, MAX_LOOKUP_QUEUE } from "@/lib/concurrency";
import { logEvent } from "@/lib/analytics";

export const runtime = "nodejs";

type SimpleFormat = {
  formatId: string;
  ext: string;
  label: string;
  hasAudio: boolean;
  hasVideo: boolean;
  filesize: number | null;
};

function humanLabel(f: {
  height?: number;
  vcodec?: string;
  acodec?: string;
  ext: string;
  format_note?: string;
}): string {
  if (f.vcodec === "none") return `Audio only (${f.ext.toUpperCase()})`;
  if (f.height) return `${f.height}p ${f.ext.toUpperCase()}`;
  return f.format_note ? `${f.format_note} (${f.ext.toUpperCase()})` : f.ext.toUpperCase();
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

  try {
    const info = await fetchInfo(url);
    void logEvent({
      type: "lookup",
      ok: true,
      site: info.extractor_key ?? info.extractor ?? undefined,
    });

    const seen = new Set<string>();
    const formats: SimpleFormat[] = (info.formats ?? [])
      .filter((f) => f.vcodec !== "none" || f.acodec !== "none")
      .map((f) => ({
        formatId: f.format_id,
        ext: f.ext,
        label: humanLabel(f),
        hasAudio: f.acodec !== "none" && !!f.acodec,
        hasVideo: f.vcodec !== "none" && !!f.vcodec,
        filesize: f.filesize ?? f.filesize_approx ?? null,
      }))
      .filter((f) => {
        const key = `${f.label}-${f.hasAudio}-${f.hasVideo}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .reverse();

    return Response.json({
      title: info.title ?? "Untitled",
      thumbnail: info.thumbnail ?? null,
      duration: info.duration ?? null,
      uploader: info.uploader ?? null,
      site: info.extractor_key ?? info.extractor ?? null,
      formats,
    });
  } catch (err) {
    void logEvent({ type: "lookup", ok: false });
    if (err instanceof UnsupportedSiteError) {
      return Response.json(
        { error: "This site isn't supported." },
        { status: 400 },
      );
    }
    console.error("yt-dlp info error", err);
    return Response.json(
      {
        error:
          "Couldn't read that link. It may be private, region-locked, or the site changed something on their end.",
      },
      { status: 502 },
    );
  }
}
