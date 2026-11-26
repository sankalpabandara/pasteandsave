import type { NextRequest } from "next/server";
import { fetchPlaylist, isSafeUrl, userFacingError } from "@/lib/ytdlp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupLimiter, MAX_LOOKUP_QUEUE } from "@/lib/concurrency";
import { logEvent } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!rateLimit(`playlist:${clientIp(request)}`, 15, 60_000)) {
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
  if (!url || !isSafeUrl(url)) {
    return Response.json({ error: "That link isn't valid." }, { status: 400 });
  }

  try {
    const playlist = await fetchPlaylist(url);
    if (!playlist || playlist.entries.length === 0) {
      return Response.json(
        { error: "That link isn't a playlist we can read." },
        { status: 400 },
      );
    }
    void logEvent({ type: "lookup", ok: true, site: "playlist" });
    return Response.json(playlist);
  } catch (err) {
    void logEvent({ type: "lookup", ok: false });
    const { error, status } = userFacingError(err);
    if (status >= 500) console.error("yt-dlp playlist error", err);
    return Response.json({ error }, { status });
  }
}
