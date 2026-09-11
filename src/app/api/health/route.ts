import fs from "node:fs";
import os from "node:os";
import { spawn } from "node:child_process";
import {
  YTDLP_PATH,
  FFMPEG_DIR,
  proxyStatus,
  jsRuntimeAvailable,
  ytClientsInUse,
  proxyReachable,
} from "@/lib/ytdlp";
import { jobLimiter, lookupLimiter } from "@/lib/concurrency";
import { routingReport } from "@/lib/proxy-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Health is checked by the server's own watchdog every couple of minutes, so
// it has to be cheap and must never touch the network or the metered proxy.
// It answers one question: can this process still do work right now?

// The version flag differs per tool: yt-dlp wants --version, ffmpeg wants
// -version and exits non-zero on the double-dash form. Getting this wrong
// reports a working binary as broken, which is worse than not checking.
function binaryVersion(bin: string, timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    let out = "";
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    try {
      const child = spawn(bin, ["--version"], { windowsHide: true });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(null);
      }, timeoutMs);
      child.stdout.on("data", (c) => {
        out += c.toString();
      });
      child.on("error", () => {
        clearTimeout(timer);
        finish(null);
      });
      child.on("close", () => {
        clearTimeout(timer);
        finish(out.trim().split(/\s+/)[0] || null);
      });
    } catch {
      finish(null);
    }
  });
}

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

// Some extractors (Dailymotion among them) refuse a plain TLS handshake and
// require yt-dlp to impersonate a browser, which only works when the build
// bundles curl_cffi. A build without it fails those sites with an error that
// mentions nothing about the network, so the cause is invisible unless it is
// checked for directly.
function impersonationAvailable(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    try {
      const child = spawn(YTDLP_PATH, ["--list-impersonate-targets"], {
        windowsHide: true,
      });
      let out = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(false);
      }, timeoutMs);
      child.stdout.on("data", (c) => {
        out += c.toString();
      });
      child.on("error", () => {
        clearTimeout(timer);
        finish(false);
      });
      child.on("close", () => {
        clearTimeout(timer);
        // Not a search for browser names. --list-impersonate-targets prints
        // every client yt-dlp knows about whether or not it can use it, so a
        // build without curl_cffi still prints "Chrome ... (unavailable)" and
        // this reported impersonation as working for months while none of it
        // did. A target counts only when its own line does not say unavailable.
        const usable = out
          .split("\n")
          .some((line) => /chrome|firefox|safari|edge/i.test(line) && !/unavailable/i.test(line));
        finish(usable);
      });
    } catch {
      finish(false);
    }
  });
}

export async function GET() {
  const ffmpeg = `${FFMPEG_DIR}/ffmpeg${process.platform === "win32" ? ".exe" : ""}`;

  const [ytdlpOk, ffmpegOk, impersonation, ytdlpVersion] = await Promise.all([
    binaryWorks(YTDLP_PATH, "--version"),
    binaryWorks(ffmpeg, "-version"),
    impersonationAvailable(),
    binaryVersion(YTDLP_PATH),
  ]);

  // Configured is not the same as answering. The relay lives on a home machine
  // that can be asleep or off, and when it is, the sites that need it are
  // unavailable while everything else is fine. That distinction is invisible
  // from "proxy: configured: true" alone.
  const relayUp = proxyStatus().configured ? await proxyReachable() : null;

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
      checks: { ytdlp: ytdlpOk, ffmpeg: ffmpegOk, tmpWritable, impersonation },
      load: { lookupsQueued, jobsActive },
      proxy: { ...proxyStatus(), reachable: relayUp },
      // Which sites have proved they need the proxy and which answer without
      // it. Routing is learned rather than configured, so this is the only
      // place the decision in effect can be seen.
      routing: routingReport(),
      stickySessions: (process.env.YTDLP_PROXY_STICKY ?? "1") !== "0",
      // What the extractor can actually do. A current binary and a JS runtime
      // are both required for YouTube now, and both were missing without
      // anything here saying so.
      youtube: {
        ytdlpVersion,
        jsRuntime: jsRuntimeAvailable(),
        clients: ytClientsInUse(),
      },
      uptimeSeconds: Math.round(process.uptime()),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
