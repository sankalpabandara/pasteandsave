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

// Two questions, kept apart.
//
// The plain request is what the watchdog and the deploy script ask every two
// minutes: is this process alive and able to work? It answers from memory and
// a writable temp folder, spawns nothing, and returns 503 only when the
// process genuinely cannot do work.
//
// ?deep=1 adds what the tools can do: yt-dlp, ffmpeg, browser impersonation.
// Those used to be checked on every request, three yt-dlp processes each time,
// and a yt-dlp that was merely slow (an idle --version takes about 1.5 s on
// the server, longer under load) made this answer 503. The watchdog then
// restarted a working server, which cannot make yt-dlp faster, killed every
// download in progress, and every killed yt-dlp left an 82 MB unpack folder
// behind in /tmp. Tool results are now diagnostics: cached for five minutes,
// stopped with SIGTERM so yt-dlp cleans up after itself, and never a 503.

type DeepChecks = {
  ytdlp: boolean;
  ffmpeg: boolean;
  impersonation: boolean;
  ytdlpVersion: string | null;
  checkedAt: string;
};

const DEEP_TTL_MS = 5 * 60 * 1000;
let deepCache: { at: number; value: DeepChecks } | null = null;
let deepRunning: Promise<DeepChecks> | null = null;

/**
 * Runs a binary with one flag and collects its output.
 *
 * Stopped with SIGTERM, not SIGKILL. yt-dlp is a self-unpacking build, and a
 * process killed outright never removes the 82 MB it unpacked into /tmp.
 */
function run(bin: string, flag: string, timeoutMs: number): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    let out = "";
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve({ ok, out });
    };
    try {
      const child = spawn(bin, [flag], { windowsHide: true });
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        finish(false);
      }, timeoutMs);
      child.stdout.on("data", (c) => {
        out += c.toString();
      });
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

async function runDeepChecks(): Promise<DeepChecks> {
  const ffmpeg = `${FFMPEG_DIR}/ffmpeg${process.platform === "win32" ? ".exe" : ""}`;
  // The version flag differs per tool: yt-dlp wants --version, ffmpeg wants
  // -version and exits non-zero on the double-dash form. Getting this wrong
  // reports a working binary as broken, which is worse than not checking.
  const [ytdlp, ff, targets] = await Promise.all([
    run(YTDLP_PATH, "--version", 15000),
    run(ffmpeg, "-version", 15000),
    run(YTDLP_PATH, "--list-impersonate-targets", 20000),
  ]);
  // Not a search for browser names. --list-impersonate-targets prints every
  // client yt-dlp knows about whether or not it can use it, so a build without
  // curl_cffi still prints "Chrome ... (unavailable)" and this reported
  // impersonation as working for months while none of it did. A target counts
  // only when its own line does not say unavailable.
  const impersonation = targets.out
    .split("\n")
    .some((line) => /chrome|firefox|safari|edge/i.test(line) && !/unavailable/i.test(line));
  return {
    ytdlp: ytdlp.ok,
    ffmpeg: ff.ok,
    impersonation,
    ytdlpVersion: ytdlp.ok ? ytdlp.out.trim().split(/\s+/)[0] || null : null,
    checkedAt: new Date().toISOString(),
  };
}

/** The tool checks, at most once every five minutes, one run at a time. */
function deepChecks(): Promise<DeepChecks> {
  if (deepCache && Date.now() - deepCache.at < DEEP_TTL_MS) {
    return Promise.resolve(deepCache.value);
  }
  if (!deepRunning) {
    deepRunning = runDeepChecks()
      .then((value) => {
        deepCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        deepRunning = null;
      });
  }
  return deepRunning;
}

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  let tmpWritable = true;
  try {
    fs.accessSync(os.tmpdir(), fs.constants.W_OK);
  } catch {
    tmpWritable = false;
  }

  // A full extractor queue is normal under load; a permanently full one is
  // the shape of a wedged process, so it is reported rather than judged here.
  const load = { lookupsQueued: lookupLimiter.queueLength, jobsActive: jobLimiter.activeCount };

  if (!deep) {
    return Response.json(
      {
        status: tmpWritable ? "ok" : "degraded",
        checks: { tmpWritable },
        load,
        // The last tool check, if one has run. Never started from here.
        tools: deepCache?.value ?? null,
        uptimeSeconds: Math.round(process.uptime()),
      },
      { status: tmpWritable ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tools = await deepChecks();
  // Configured is not the same as answering: the proxy can be down while
  // everything else is fine, and "configured: true" alone hides that.
  const proxyUp = proxyStatus().configured ? await proxyReachable() : null;
  const toolsOk = tools.ytdlp && tools.ffmpeg;

  return Response.json(
    {
      status: tmpWritable && toolsOk ? "ok" : "degraded",
      checks: {
        ytdlp: tools.ytdlp,
        ffmpeg: tools.ffmpeg,
        tmpWritable,
        impersonation: tools.impersonation,
        checkedAt: tools.checkedAt,
      },
      load,
      proxy: { ...proxyStatus(), reachable: proxyUp },
      // Which sites have proved they need the proxy and which answer without
      // it. Routing is learned rather than configured, so this is the only
      // place the decision in effect can be seen.
      routing: routingReport(),
      stickySessions: (process.env.YTDLP_PROXY_STICKY ?? "1") !== "0",
      // What the extractor can actually do. A current binary and a JS runtime
      // are both required for YouTube now.
      youtube: {
        ytdlpVersion: tools.ytdlpVersion,
        jsRuntime: jsRuntimeAvailable(),
        clients: ytClientsInUse(),
      },
      uptimeSeconds: Math.round(process.uptime()),
    },
    // Diagnostics, so never a 503 for a slow tool: only a process that cannot
    // write its temp folder is unhealthy.
    { status: tmpWritable ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
