import type { NextRequest } from "next/server";
import { startFileJob, startJob } from "@/lib/jobs";
import { photoIndexOf, photosFor } from "@/lib/x-photos";
import { isSafeUrl, isValidFormatId, usesProxy } from "@/lib/ytdlp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { BusyError, VisitorBusyError } from "@/lib/concurrency";
import { logEvent } from "@/lib/analytics";
import { peekExtractorKey } from "@/lib/info-cache";
import { proxyBudgetOk } from "@/lib/proxy-budget";
import { resolveShareLink } from "@/lib/share-links";
import { rememberedEmbed } from "@/lib/page-embeds";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!rateLimit(`jobs:${clientIp(request)}`, 12, 60_000)) {
    return Response.json(
      { error: "Too many downloads. Please slow down." },
      { status: 429 },
    );
  }

  let body: {
    url?: string;
    mode?: "video" | "audio";
    formatId?: string;
    title?: string;
    hasAudio?: boolean;
    audioFormat?: string;
    bitrate?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const url = body.url?.trim();
  const mode = body.mode;
  const title = body.title?.trim() || "download";

  if (!url || !isSafeUrl(url)) {
    return Response.json({ error: "Invalid or unsupported link." }, { status: 400 });
  }
  // Same resolution the lookup did, so the cached extractor output is found
  // under the same key rather than being fetched a second time, and so a share
  // link pressed straight through to download behaves like any other address.
  const resolved = (await resolveShareLink(url)) ?? url;
  // A page with a player in it was turned into the player's address at lookup.
  const target = rememberedEmbed(resolved) ?? resolved;

  if (mode !== "video" && mode !== "audio") {
    return Response.json({ error: "Invalid mode." }, { status: 400 });
  }
  if (mode === "video" && (!body.formatId || !isValidFormatId(body.formatId))) {
    return Response.json({ error: "Invalid format." }, { status: 400 });
  }

  // Both of these end up as yt-dlp arguments, so neither is taken on trust:
  // only the exact values the picker offers are accepted.
  const audioFormat = body.audioFormat === "m4a" ? "m4a" : "mp3";
  const ALLOWED_BITRATES = [320, 256, 128, 96, 64];
  const bitrate =
    typeof body.bitrate === "number" && ALLOWED_BITRATES.includes(body.bitrate)
      ? body.bitrate
      : null;

  // A photo from an X post, listed at lookup from X's embed data because
  // yt-dlp reads no photos from X. Saved straight from pbs.twimg.com.
  const photoIndex = mode === "video" ? photoIndexOf(body.formatId) : null;
  if (photoIndex !== null) {
    const photo = photosFor(target)?.[photoIndex - 1];
    if (!photo) {
      return Response.json(
        { error: "That photo link has expired. Paste the post again to get a fresh one." },
        { status: 410 },
      );
    }
    try {
      const id = startFileJob({
        owner: clientIp(request),
        url: photo.url,
        title: photoIndex > 1 ? `${title} ${photoIndex}` : title,
        ext: photo.ext,
      });
      void logEvent({ type: "download", mode: "video", site: "Twitter", proxied: false });
      return Response.json({ jobId: id });
    } catch (err) {
      if (err instanceof VisitorBusyError) return Response.json({ error: err.message }, { status: 429 });
      if (err instanceof BusyError) return Response.json({ error: err.message }, { status: 503 });
      console.error("start photo job error", err);
      return Response.json({ error: "Couldn't start the download." }, { status: 500 });
    }
  }

  // Only downloads routed through the metered proxy count against the daily
  // budget; everything that works direct is never limited.
  const proxied = usesProxy(target);
  if (proxied && !(await proxyBudgetOk())) {
    return Response.json(
      {
        error:
          "YouTube has hit today's download limit here. It resets tomorrow. Everything else still works now.",
      },
      { status: 429 },
    );
  }

  try {
    const owner = clientIp(request);
    const id =
      mode === "video"
        ? startJob({
            owner,
            mode: "video",
            url: target,
            formatId: body.formatId!,
            title,
            hasAudio: body.hasAudio === true,
          })
        : startJob({ owner, mode: "audio", url: target, title, audioFormat, bitrate });
    // The lookup a moment ago already named the platform, so reuse its answer
    // rather than guessing from the hostname; a miss just leaves it unlabelled.
    void logEvent({
      type: "download",
      mode,
      site: peekExtractorKey(target) ?? undefined,
      proxied,
    });
    return Response.json({ jobId: id });
  } catch (err) {
    if (err instanceof VisitorBusyError) {
      return Response.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof BusyError) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    console.error("start job error", err);
    return Response.json({ error: "Couldn't start the download." }, { status: 500 });
  }
}
