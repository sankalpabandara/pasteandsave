import fs from "node:fs";
import { Readable } from "node:stream";
import { claimJobFile, finalizeJob, getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = claimJobFile(jobId);

  if (!job) {
    const existing = getJob(jobId);
    const message = existing
      ? "This download isn't ready yet."
      : "This download link has expired.";
    return Response.json({ error: message }, { status: 409 });
  }

  const nodeStream = fs.createReadStream(job.filePath!);
  nodeStream.on("close", () => finalizeJob(jobId));
  nodeStream.on("error", () => finalizeJob(jobId));

  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  const filename = job.filename!;
  // ASCII fallback for old clients, plus RFC 5987 encoded name so titles with
  // non-ASCII characters (accents, emoji) don't corrupt the header.
  const asciiName = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encodedName = encodeURIComponent(filename);

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "no-store",
    },
  });
}
