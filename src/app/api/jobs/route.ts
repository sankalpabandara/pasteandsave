import type { NextRequest } from "next/server";
import { startJob } from "@/lib/jobs";
import { isSafeUrl, isValidFormatId } from "@/lib/ytdlp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { BusyError } from "@/lib/concurrency";
import { logEvent } from "@/lib/analytics";

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
  if (mode !== "video" && mode !== "audio") {
    return Response.json({ error: "Invalid mode." }, { status: 400 });
  }
  if (mode === "video" && (!body.formatId || !isValidFormatId(body.formatId))) {
    return Response.json({ error: "Invalid format." }, { status: 400 });
  }

  try {
    const id =
      mode === "video"
        ? startJob({ mode: "video", url, formatId: body.formatId!, title })
        : startJob({ mode: "audio", url, title });
    void logEvent({ type: "download", mode });
    return Response.json({ jobId: id });
  } catch (err) {
    if (err instanceof BusyError) {
      return Response.json({ error: err.message }, { status: 503 });
    }
    console.error("start job error", err);
    return Response.json({ error: "Couldn't start the download." }, { status: 500 });
  }
}
