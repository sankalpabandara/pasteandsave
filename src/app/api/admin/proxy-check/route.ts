import type { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { isAdmin } from "@/lib/admin-guard";
import { YTDLP_PATH } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tests a proxy before anything depends on it.
//
// Swapping the proxy provider is otherwise done blind: paste a URL into the
// environment, restart, and find out from visitors whether it works. That is
// how two days went into blaming YouTube for what was a connection problem.
// This answers the two questions that actually decide it — can it still read a
// YouTube page, and what address does YouTube see when it does — without
// touching the live configuration.
//
// It is also what makes moving off a metered provider a decision rather than a
// gamble: a self-hosted exit node can be checked here first.

const CHECK_TIMEOUT_MS = 25_000;

/** A proxy URL is a credential. It is never logged, echoed, or persisted. */
function parseProxy(raw: string): { ok: true; safe: string } | { ok: false; why: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, why: "That is not a URL. Expected http://user:pass@host:port" };
  }
  if (!/^(https?|socks5h?|socks4):$/.test(u.protocol)) {
    return { ok: false, why: `Unsupported scheme "${u.protocol.replace(":", "")}".` };
  }
  if (!u.hostname) return { ok: false, why: "No host in that URL." };
  // Only ever shown back as host:port — the credentials stay out of the reply.
  return { ok: true, safe: `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}` };
}

// `raw` is the extractor's full output and stays on the server: it is used to
// read the exit address out of the signed links and is never sent to the
// browser, because it is large and carries request tokens.
type Probe = { ok: boolean; ms: number; detail: string; raw: string };

function runProbe(args: string[], timeoutMs = CHECK_TIMEOUT_MS): Promise<Probe> {
  const started = Date.now();
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean, detail: string) => {
      if (done) return;
      done = true;
      resolve({ ok, ms: Date.now() - started, detail, raw: out });
    };
    let out = "";
    let err = "";
    try {
      const child = spawn(YTDLP_PATH, args, { windowsHide: true });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(false, "Timed out. The proxy accepted the connection but never answered.");
      }, timeoutMs);
      child.stdout.on("data", (c) => {
        out += c.toString();
      });
      child.stderr.on("data", (c) => {
        err += c.toString();
      });
      child.on("error", () => {
        clearTimeout(timer);
        finish(false, "Could not start the extractor.");
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) return finish(true, "Read the page and got a full format list back.");
        // yt-dlp puts the full proxy URL, credentials and all, into connection
        // errors. Only a classification of the failure goes back.
        const e = err.toLowerCase();
        if (/407|proxy auth/.test(e)) return finish(false, "Rejected the login. Check the username and password.");
        if (/connect|tunnel|refused|unreachable|timed out/.test(e)) {
          return finish(false, "Could not connect. Check the host, the port, and that the exit node is up.");
        }
        if (/sign in|bot|not a bot|captcha/.test(e)) {
          return finish(false, "Connected, but the site treated this address as a bot.");
        }
        if (/403|forbidden/.test(e)) return finish(false, "Connected, but the site refused this address.");
        return finish(false, "Connected, but the request failed.");
      });
    } catch {
      finish(false, "Could not start the extractor.");
    }
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { proxyUrl?: unknown };
  const raw = typeof body.proxyUrl === "string" ? body.proxyUrl.trim() : "";
  if (!raw) return Response.json({ error: "Paste a proxy URL to test." }, { status: 400 });

  const parsed = parseProxy(raw);
  if (!parsed.ok) return Response.json({ error: parsed.why }, { status: 400 });

  // Whether it can actually do the job. A proxy can connect perfectly and
  // still be useless here, because the address is already known to YouTube.
  const youtube = await runProbe([
    "--proxy",
    raw,
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    "--skip-download",
    "--socket-timeout",
    "20",
    "--",
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  ]);

  const usable = youtube.ok;

  // YouTube signs the address it saw into every stream link it hands back, so
  // the exit address comes out of the check that already ran rather than a
  // second request to some third-party "what is my IP" service. It is also a
  // better answer than one of those would give: this is the platform's own
  // view, which is the only view that decides whether we get blocked.
  //
  // It catches the quiet failure too. A proxy that is silently ignored leaves
  // the server's own datacenter address here, and that looks like success
  // right up until the platform starts refusing it.
  let exitIp = "";
  if (usable) {
    const m = youtube.raw.match(/[?&]ip=([^&"\\]+)/);
    if (m) {
      try {
        exitIp = decodeURIComponent(m[1]);
      } catch {
        exitIp = m[1];
      }
    }
  }

  return Response.json(
    {
      proxy: parsed.safe,
      usable,
      verdict: usable
        ? "Working. This proxy can read YouTube and is safe to put in YTDLP_PROXY."
        : "Not usable yet. See the YouTube check below for why.",
      // Empty when the check failed, or when the reply carried no signed
      // links to read it from. Absence is not evidence of a problem.
      exitIpSeenByYouTube: exitIp,
      checks: {
        youtube: { ok: youtube.ok, ms: youtube.ms, detail: youtube.detail },
      },
      // A slow proxy is a slow site. Lookups already take most of a minute on
      // YouTube, so anything much past this is worth knowing about up front.
      slow: youtube.ms > 20_000,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
