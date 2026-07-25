import fs from "node:fs";
import os from "node:os";
import { spawn } from "node:child_process";
import { YTDLP_PATH, FFMPEG_DIR } from "@/lib/ytdlp";
import { jobLimiter, lookupLimiter } from "@/lib/concurrency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Health is checked by the server's own watchdog every couple of minutes, so
// it has to be cheap and must never touch the network or the metered proxy.
// It answers one question: can this process still do work right now?

// The version flag differs per tool: yt-dlp wants --version, ffmpeg wants
// -version and exits non-zero on the double-dash form. Getting this wrong
// reports a working binary as broken, which is worse than not checking.
function binaryWorks(bin: string, versionFlag: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    try {
      const child = spawn(bin, [versionFlag], { windowsHide: true });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(false);
      }, timeoutMs);
      child.on("error", () => {
        clearTimeout(timer);
        finish(false);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        finish(code === 0);
      });
    } catch {
      finish(false);
    }
  });
}

export async function GET() {
  const ffmpeg = `${FFMPEG_DIR}/ffmpeg${process.platform === "win32" ? ".exe" : ""}`;

  const [ytdlpOk, ffmpegOk] = await Promise.all([
    binaryWorks(YTDLP_PATH, "--version"),
    binaryWorks(ffmpeg, "-version"),
  ]);

  // A full extractor queue is normal under load; a permanently full one is
  // the shape of a wedged process, so it is reported rather than judged here.
  const lookupsQueued = lookupLimiter.queueLength;
  const jobsActive = jobLimiter.activeCount;

  let tmpWritable = true;
  try {
    fs.accessSync(os.tmpdir(), fs.constants.W_OK);
  } catch {
    tmpWritable = false;
  }

  const healthy = ytdlpOk && ffmpegOk && tmpWritable;

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { ytdlp: ytdlpOk, ffmpeg: ffmpegOk, tmpWritable },
      load: { lookupsQueued, jobsActive },
      uptimeSeconds: Math.round(process.uptime()),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
