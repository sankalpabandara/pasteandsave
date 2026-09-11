import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { lookupLimiter, QUEUE_WAIT_MS } from "./concurrency";
import { putInfo } from "./info-cache";
import {
  shouldTryDirect,
  recordDirectResult,
  hostNeedsProxy,
  stickyProxyUrl,
  PROXY_STICKY,
  PROXY_HOSTS,
} from "./proxy-routing";

// BIN_DIR is overridable so a production deploy can point at an absolute path
// regardless of the working directory (e.g. Next.js standalone output).
const BIN_DIR = process.env.BIN_DIR || path.join(process.cwd(), "bin");
// Binary name differs by OS: yt-dlp.exe on Windows, yt-dlp on Linux/macOS.
// Keeps the app portable between a Windows dev box and a Linux server.
const EXE = process.platform === "win32" ? ".exe" : "";
export const YTDLP_PATH = path.join(BIN_DIR, `yt-dlp${EXE}`);
export const FFMPEG_DIR = BIN_DIR;

// YouTube's JavaScript challenges need an external runtime to solve. Deno is
// the one yt-dlp enables by default, but it only looks on PATH, and our
// binaries live in BIN_DIR, so the path is passed explicitly.
//
// This buys nothing for android_vr, the client used first: its stream links
// carry no n parameter, so there is no challenge to solve and extraction is
// byte-for-byte identical with and without a runtime. It is here for the
// fallback clients, which do need one, and because yt-dlp has deprecated
// running YouTube without it. The day android_vr stops working is the day the
// fallbacks matter, and discovering the runtime is missing on that day is
// worse than carrying it now.
export const DENO_PATH = path.join(BIN_DIR, `deno${EXE}`);

// Absent on a server that has not re-run setup-bin, so this stays optional:
// yt-dlp warns and carries on rather than failing, which is what it does today.
let denoChecked = false;
let denoAvailable = false;
export function jsRuntimeAvailable(): boolean {
  jsRuntimeArgs();
  return denoAvailable;
}

function jsRuntimeArgs(): string[] {
  if (!denoChecked) {
    denoChecked = true;
    try {
      denoAvailable = fs.existsSync(DENO_PATH);
      if (!denoAvailable) {
        console.warn(
          `[ytdlp] no JS runtime at ${DENO_PATH}; YouTube fallback clients may fail. Run scripts/setup-bin.sh`,
        );
      }
    } catch {
      denoAvailable = false;
    }
  }
  return denoAvailable ? ["--js-runtimes", `deno:${DENO_PATH}`] : [];
}

// Keeps yt-dlp restricted to its ~1750 named site extractors and disables
// the "generic" fallback, which would otherwise scrape the HTML of
// *any* URL we hand it, turning this server into an open SSRF proxy.
// A URL that doesn't match a specific extractor fails cleanly instead.
export const EXTRACTOR_ARGS = ["--ies", "default,-generic"];

// --- YouTube hardening -----------------------------------------------------
// Which player client to ask YouTube for.
//
// This was android_vr, chosen in July because it was the cheapest single client
// through the metered proxy: 159 KB per extraction against roughly 1 MB for
// "tv", with an identical format list. That reasoning was sound and is now
// obsolete, because android_vr stopped working.
//
// Measured on 2026-09-11 from a residential address, so the address was not the
// variable, downloading bestaudio for the same video:
//
//   yt-dlp 2026.07.04 (what was deployed)
//     every client failed. android_vr, default and tv_embedded got a 403 on the
//     media itself; tv, web_safari, mweb and ios could not produce a usable
//     format at all.
//
//   yt-dlp 2026.08.19 with a JS runtime present
//     default       downloaded, 49 formats, up to 2160p
//     tv_embedded   downloaded, 49 formats, up to 2160p
//     android_vr    "Requested format is not available"
//     mweb          "Requested format is not available"
//
// So the client is "default" now: whatever yt-dlp itself picks. It is the set
// the maintainers keep working, which matters more than saving a few hundred
// kilobytes, because a site that cannot download earns nothing at all. If
// YouTube starts refusing this server again and the bytes start mattering,
// YTDLP_YOUTUBE_CLIENTS=tv_embedded is the cheap single-client option and needs
// no deploy.
//
// Two things this now depends on, both of which were missing and caused the
// outage together: a current yt-dlp, and a JavaScript runtime. "default" solves
// a JS challenge, so without deno present in BIN_DIR this fails. Run
// scripts/setup-bin.sh, which installs both.
function ytClients(): string {
  if (process.env.YTDLP_YOUTUBE_CLIENTS) return process.env.YTDLP_YOUTUBE_CLIENTS;
  // No runtime means "default" cannot solve the challenge it will be given, and
  // announcing a client we cannot serve is worse than keeping the old one. This
  // deploy therefore changes nothing until scripts/setup-bin.sh has run.
  return jsRuntimeAvailable() ? "default" : "android_vr";
}
function ytFallbackClients(): string {
  return (
    process.env.YTDLP_YOUTUBE_FALLBACK_CLIENTS ||
    (jsRuntimeAvailable() ? "tv_embedded,tv,web_safari,mweb" : "default,tv,web_safari,ios")
  );
}

// Optional residential/rotating proxy. Routing blocked sites through a
// non-datacenter IP is the durable fix once player-client tricks stop being
// enough. By default the proxy is applied ONLY to the sites that actually
// block datacenter IPs, so you never pay to proxy Facebook, TikTok, Vimeo and
// the 1,200+ others that work fine direct. Set YTDLP_PROXY_HOSTS="all" to
// route every site through the proxy instead.
const YTDLP_PROXY = process.env.YTDLP_PROXY;
// Escape hatch: any extra flags the operator wants (a PO-token provider,
// a cookies file they manage themselves, geo options, etc.), space separated.
const YTDLP_EXTRA_ARGS = (process.env.YTDLP_EXTRA_ARGS || "").trim();

export function isYouTube(rawUrl: string): boolean {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    return /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(h);
  } catch {
    return false;
  }
}

// Network-resilience + operator flags shared by every yt-dlp invocation.
// How many fragments to pull at once.
//
// YouTube serves its higher qualities as HLS, and yt-dlp fetches those fragments
// one after another, which leaves most of the connection idle. Measured on the
// server against the same 81 MB 1080p file, media direct from the CDN:
//
//   sequential   67.96 s
//   4 at a time  22.46 s
//   8 at a time  16.39 s
//
// Eight, then. Three jobs run at once at most, so this is at most 24 sockets,
// and a fragment that fails is retried by yt-dlp as it already was. Set
// YTDLP_CONCURRENT_FRAGMENTS=1 to go back to sequential if a host objects.
const CONCURRENT_FRAGMENTS = (() => {
  const n = Number(process.env.YTDLP_CONCURRENT_FRAGMENTS);
  return Number.isInteger(n) && n >= 1 && n <= 32 ? n : 8;
})();

export function networkArgs(): string[] {
  const args: string[] = [
    ...jsRuntimeArgs(),
    "--concurrent-fragments",
    String(CONCURRENT_FRAGMENTS),
    "--extractor-retries",
    "3",
    "--retry-sleep",
    "2",
    "--socket-timeout",
    "20",
  ];
  if (YTDLP_EXTRA_ARGS) args.push(...YTDLP_EXTRA_ARGS.split(/\s+/));
  return args;
}

// Adds --proxy only for URLs whose host is in YTDLP_PROXY_HOSTS (or for every
// URL when that list is "all"/"*"). This keeps paid proxy bandwidth spent only
// on the sites that actually block the server, not the many that work direct.
// Residential proxies hand out a different exit IP on every connection unless
// a session is requested. That breaks any extractor that needs more than one
// request: Dailymotion fetches metadata, then the m3u8 playlist, and the
// playlist is refused with a 403 when it arrives from a different address than
// the one that obtained the token. Pinning a single IP for the duration of one
// yt-dlp run is enough, because extraction and download happen in the same run.
//
// The suffix follows Evomi's documented format (password_session-ID, where the
// id is 6-10 alphanumeric characters). Set YTDLP_PROXY_STICKY=0 for a provider
// that does not understand it; failures that look like a rejected login also
// fall back to the plain proxy on their own.
export function proxyArgs(rawUrl: string): string[] {
  if (!YTDLP_PROXY) return [];
  // One definition of which hosts match, shared with the no-proxy path, so the
  // two can never drift apart and disagree about the same URL.
  return hostNeedsProxy(rawUrl) ? ["--proxy", stickyProxyUrl(YTDLP_PROXY, rawUrl)] : [];
}

/** The proxy without a session suffix, for the fallback below. */
export function plainProxyArgs(): string[] {
  return YTDLP_PROXY ? ["--proxy", YTDLP_PROXY] : [];
}

/** A rejected proxy login, as opposed to the platform refusing us. */
export function looksLikeProxyAuthFailure(stderr: string): boolean {
  return /HTTP Error 407|proxy authentication|407 Proxy|tunnel connection failed|could not connect to proxy|proxy.*(auth|denied|rejected)/i.test(
    stderr || "",
  );
}

// True when a download for this URL would actually go through the (metered)
// proxy, used to decide whether it counts against the daily proxy budget.
export function usesProxy(rawUrl: string): boolean {
  return proxyArgs(rawUrl).length > 0;
}

/**
 * Which sites are routed through the proxy, for the health endpoint. Reports
 * only whether a proxy is set and the hostnames it applies to, never the
 * proxy URL, which carries credentials. Wrong routing here is invisible from
 * the outside otherwise, and is exactly what made Instagram fail.
 */
export function proxyStatus(): { configured: boolean; hosts: string[] } {
  return { configured: Boolean(YTDLP_PROXY), hosts: [...PROXY_HOSTS] };
}

/**
 * Whether the configured proxy is actually answering.
 *
 * With the relay on a home machine, "configured" and "reachable" are different
 * questions: the address never changes but the machine can be asleep, off, or
 * between tunnels. Without asking, a YouTube link on a sleeping relay spent
 * about 22 seconds failing, because yt-dlp tried the site, tried the proxy,
 * waited out both, and only then gave up, holding a lookup slot the whole time.
 *
 * A TCP connect with a one second deadline answers it. The result is held
 * briefly, so a burst of requests costs one probe rather than one each, and
 * held for less time on success than on failure: a relay that has just come
 * back should be noticed quickly, while one that is down is worth not retrying
 * on every request.
 */
let proxyProbe: { ok: boolean; at: number } | null = null;
export async function proxyReachable(): Promise<boolean> {
  if (!YTDLP_PROXY) return false;
  const now = Date.now();
  if (proxyProbe && now - proxyProbe.at < (proxyProbe.ok ? 15_000 : 5_000)) {
    return proxyProbe.ok;
  }
  let host = "";
  let port = 0;
  try {
    const u = new URL(YTDLP_PROXY);
    host = u.hostname;
    port = Number(u.port) || (u.protocol === "https:" ? 443 : 80);
  } catch {
    return false;
  }
  const ok = await new Promise<boolean>((resolve) => {
    const sock = net.connect({ host, port });
    const done = (v: boolean) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(1000, () => done(false));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
  proxyProbe = { ok, at: now };
  return ok;
}

/** The proxy is configured but nothing is listening: the relay is down. */
export class ProxyUnreachableError extends Error {}

/** True when a proxy exists to fall back to. */
export function proxyAvailable(): boolean {
  return Boolean(YTDLP_PROXY);
}

/** Proxy flags regardless of the host list, for the automatic retry below. */
export function forceProxyArgs(rawUrl?: string): string[] {
  // Seeded like proxyArgs. This is the retry for a site that is not on the
  // host list, so the download side will compute no proxy at all for it; the
  // links this fetches still have to come from an address the download can
  // present them from, or be refused for the same reason.
  return YTDLP_PROXY ? ["--proxy", stickyProxyUrl(YTDLP_PROXY, rawUrl)] : [];
}

/**
 * Whether a failure looks like the platform refusing this server's address,
 * rather than the video genuinely being gone.
 *
 * Maintaining a hand-written list of which sites block datacenter IPs does
 * not work: the list is always out of date, and every site that starts
 * blocking becomes a silent outage until somebody notices and edits it.
 * Instead a failure that looks like a block is retried once through the
 * residential proxy, so a newly blocking site fixes itself.
 *
 * Deliberately excludes "removed" and "unavailable", which mean the video is
 * really gone, retrying those would spend metered proxy traffic for nothing.
 */
export function looksLikeIpBlock(stderr: string): boolean {
  const s = stderr || "";
  if (
    /video unavailable|been removed|has been deleted|no longer available|account.*(terminated|closed|suspended)/i.test(s)
  ) {
    return false;
  }
  return /HTTP Error 40[139]|HTTP Error 429|rate.?limit|too many requests|sign in to confirm|confirm you'?re not a bot|not a bot|login required|requires? (?:a )?login|log ?in to|you must be logged in|blocked|forbidden|empty media response|unable to extract|failed to extract|requested content is not available|restricted video/i.test(
    s,
  );
}

/**
 * Whether a failed direct attempt is worth one retry through the proxy.
 *
 * Matching only failures that *look* like a block turned out to be too narrow.
 * Platforms refuse a datacenter address in their own ways, and some say
 * nothing recognisable at all: SoundCloud fails here while working perfectly
 * from a home connection, and its error matches none of the block patterns,
 * so no retry ever fired and the site simply looked broken.
 *
 * The question is inverted instead. Retry unless the failure says the video
 * is genuinely gone or the link is not something we handle, because those are
 * the only cases where a second attempt cannot possibly help and would spend
 * metered traffic for nothing.
 */
export function worthProxyRetry(stderr: string): boolean {
  const s = stderr || "";
  return !/video unavailable|been removed|has been deleted|no longer available|not available anymore|account.*(terminated|closed|suspended)|removed by the (?:uploader|user)|no suitable extractor|unsupported url|is private|private video|this content isn'?t available/i.test(
    s,
  );
}

/**
 * Identifies the extractor setup a routing verdict was learned under.
 *
 * Cheap on purpose: the player client and whether a JS runtime exists are the
 * two things that decide whether extraction can work at all, and both are known
 * without spawning anything.
 */
export function extractorFingerprint(): string {
  return `${ytClients()}|${jsRuntimeAvailable() ? "jsi" : "nojsi"}`;
}

/** For the health endpoint: which clients this box will actually ask for. */
export function ytClientsInUse(): { primary: string; fallback: string } {
  return { primary: ytClients(), fallback: ytFallbackClients() };
}

function youtubeClientArgs(clients: string): string[] {
  return ["--extractor-args", `youtube:player_client=${clients}`];
}

// Builds the YouTube-specific extractor args to bolt onto any call. Empty for
// non-YouTube URLs, which keep working exactly as before.
export function siteArgs(url: string, fallback = false): string[] {
  if (!isYouTube(url)) return [];
  return youtubeClientArgs(fallback ? ytFallbackClients() : ytClients());
}

// Stderr signatures that mean "the platform is refusing our server", as
// opposed to a genuinely private or missing video. Used to give a clearer
// message and to decide whether a fallback retry is worth attempting.
/**
 * Whether the platform refused *this address*, specifically enough to remember.
 *
 * Deliberately stricter than isBlockedByPlatform. That one decides whether a
 * retry through the proxy is worth attempting, where being generous is cheap:
 * guess wrong and one retry is wasted. This one decides whether to write a
 * verdict that routes every request for the site through the metered proxy for
 * the next twelve hours, where guessing wrong is expensive.
 *
 * A bare 403 is the difference. It is the normal answer to a signed media link
 * that has expired, or that was signed for a different address than the one
 * presenting it, and neither says anything about our address being refused.
 * Counting those as a block meant an expired link could put the site on the
 * paid proxy for half a day, and the bill would look like YouTube tightening up.
 *
 * The bot wall, a rate-limit, and a failure to get any player response at all
 * are about the requester. Those still count.
 */
export function isAddressRefused(stderr: string): boolean {
  return /confirm you'?re not a bot|sign in to confirm|not a bot|HTTP Error 429|too many requests|failed to extract any player response|unable to download api page/i.test(
    stderr,
  );
}

export function isBlockedByPlatform(stderr: string): boolean {
  return /confirm you'?re not a bot|sign in to confirm|not a bot|HTTP Error 429|HTTP Error 403|too many requests|failed to extract any player response|unable to download api page/i.test(
    stderr,
  );
}

// Categories used to turn a raw extractor failure into something safe to show.
// Downloads report progress over SSE, so whatever lands here reaches the
// visitor's browser, raw stderr must never be forwarded, because yt-dlp
// embeds the full proxy URL (credentials included) in connection errors and
// temp-directory paths in write errors.
export type FailureCategory =
  | "PROXY_UNAVAILABLE"
  | "UPSTREAM_BLOCKED"
  | "MEDIA_UNAVAILABLE"
  | "PRIVATE_OR_LOGIN_REQUIRED"
  | "FORMAT_UNAVAILABLE"
  | "CONVERSION_FAILED"
  | "NETWORK_FAILED"
  | "INTERNAL_ERROR";

const CATEGORY_MESSAGE: Record<FailureCategory, string> = {
  PROXY_UNAVAILABLE:
    "Our connection to this site is temporarily unavailable. Please try again in a moment.",
  UPSTREAM_BLOCKED:
    "This site is rate-limiting our server right now. Give it a minute and try again.",
  MEDIA_UNAVAILABLE: "This video was removed or is no longer available.",
  PRIVATE_OR_LOGIN_REQUIRED:
    "This one is private or needs a sign-in, so it can't be downloaded.",
  FORMAT_UNAVAILABLE:
    "That quality isn't available for this video. Try a different one.",
  CONVERSION_FAILED: "The file couldn't be prepared. Please try another quality.",
  NETWORK_FAILED:
    "The download was interrupted before it finished. Please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

/**
 * Classifies extractor stderr. The returned message is safe to send to the
 * browser; the category is what belongs in server logs.
 */
export function classifyFailure(stderr: string): {
  category: FailureCategory;
  message: string;
} {
  const s = stderr || "";
  let category: FailureCategory = "INTERNAL_ERROR";

  if (/proxy|ProxyError|Tunnel connection failed|EAI_AGAIN|ECONNREFUSED/i.test(s)) {
    category = "PROXY_UNAVAILABLE";
  } else if (isBlockedByPlatform(s)) {
    category = "UPSTREAM_BLOCKED";
  } else if (
    /is private|private video|login required|requires? (?:a )?login|log ?in to|age.?restrict|confirm your age/i.test(s)
  ) {
    category = "PRIVATE_OR_LOGIN_REQUIRED";
  } else if (
    /video unavailable|been removed|no longer available|has been deleted|this content isn'?t available|account.*(terminated|closed|suspended)/i.test(s)
  ) {
    category = "MEDIA_UNAVAILABLE";
  } else if (/requested format is not available|no such format|format is not available/i.test(s)) {
    category = "FORMAT_UNAVAILABLE";
  } else if (/ffmpeg|postprocess|merger|conversion/i.test(s)) {
    category = "CONVERSION_FAILED";
  } else if (
    /timed out|timeout|connection reset|incomplete read|unable to download|HTTP Error 5\d\d/i.test(s)
  ) {
    category = "NETWORK_FAILED";
  }

  return { category, message: CATEGORY_MESSAGE[category] };
}

function ipv4IsPrivate(a: number, b: number): boolean {
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateHost(hostname: string): boolean {
  let host = hostname.toLowerCase();
  // An IPv6 literal is the only host form that legitimately contains a colon.
  const isIPv6 = host.startsWith("[") || host.includes(":");
  host = host.replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) return true;

  if (isIPv6) {
    if (host === "::1" || host === "::") return true; // loopback / unspecified
    if (host.startsWith("fe80:")) return true; // link-local
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique-local fc00::/7
    // IPv4-mapped IPv6 (::ffff:a.b.c.d or its hex form ::ffff:AABB:CCDD).
    const mapped = host.match(/::ffff:(.+)$/);
    if (mapped) {
      const dotted = mapped[1].match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (dotted) return ipv4IsPrivate(Number(dotted[1]), Number(dotted[2]));
      const hex = mapped[1].match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const n = (parseInt(hex[1], 16) * 0x10000) | parseInt(hex[2], 16);
        return ipv4IsPrivate((n >>> 24) & 0xff, (n >>> 16) & 0xff);
      }
    }
    return false;
  }

  // WHATWG URL parsing already normalizes decimal/octal/hex/short IPv4 forms
  // to dotted-quad, so this single check covers those obfuscations too.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return ipv4IsPrivate(Number(ipv4[1]), Number(ipv4[2]));
  return false;
}

// Basic SSRF guard: only http(s) URLs pointing at a public hostname get
// anywhere near yt-dlp. Which *sites* are supported is then entirely up to
// yt-dlp's own extractor matching (see EXTRACTOR_ARGS above) rather than a
// hand-maintained domain list, so any of its ~1750 supported sites works.
export function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }
  // Credentials in a URL are never needed for a public post and are a common
  // way to disguise the real host from a reader (and from naive parsers).
  if (parsed.username || parsed.password) return false;
  return !isPrivateHost(parsed.hostname);
}

export type YtDlpFormat = {
  format_id: string;
  ext: string;
  resolution?: string;
  height?: number;
  width?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number | null;
  filesize_approx?: number | null;
  format_note?: string;
  tbr?: number;
};

export type YtDlpInfo = {
  id: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  extractor?: string;
  extractor_key?: string;
  formats?: YtDlpFormat[];
};

// format_id as reported by yt-dlp is restricted to this charset. Reject
// anything else before it reaches the -f flag.
const FORMAT_ID_RE = /^[A-Za-z0-9_+.\-]{1,64}$/;

export function isValidFormatId(id: string): boolean {
  return FORMAT_ID_RE.test(id);
}

export class UnsupportedSiteError extends Error {}

function runYtDlp(args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP_PATH, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("yt-dlp timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        if (/No suitable extractor/i.test(stderr)) {
          reject(new UnsupportedSiteError(stderr));
          return;
        }
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export class PlatformBlockedError extends Error {}

/**
 * This site refuses our address and there is no other address configured.
 *
 * Distinct from PlatformBlockedError, which means we tried and were turned
 * away. This one means there is nothing left to try, so it is worth failing
 * immediately rather than spending a concurrency slot proving it again.
 */
export class SiteUnavailableHereError extends Error {}

/**
 * Parses extractor output, failing with something recognisable.
 *
 * A bare JSON.parse throws "Unexpected token ..." naming the offending
 * character, which matches none of the failure patterns and so reports as a
 * generic unknown error. Tagging it distinguishes "the site refused us" from
 * "yt-dlp exited cleanly but did not give us JSON", which are unrelated
 * problems that were previously indistinguishable from outside the server.
 */
function parseInfoJson(stdout: string): YtDlpInfo {
  const text = (stdout || "").trim();
  if (!text) {
    throw new Error("emptyout: no output from extractor");
  }
  try {
    return JSON.parse(text) as YtDlpInfo;
  } catch {
    throw new Error(`badjson: extractor returned ${text.length} bytes that are not JSON`);
  }
}

// Turns a raw yt-dlp failure into an honest, specific message, so a deleted
// video, a photo-only post, a login wall and a real outage don't all show the
// same scary text. Returns the HTTP status to use alongside it.
export function userFacingError(err: unknown): {
  error: string;
  status: number;
  code: string;
} {
  if (err instanceof UnsupportedSiteError) {
    return {
      error: "That link isn't from a site we can download from.",
      status: 400,
      code: "UNSUPPORTED_SITE",
    };
  }
  const msg = err instanceof Error ? err.message : String(err);

  // Deliberately not the "try again in a bit" wording used for a temporary
  // block. Retrying will not help: there is no address here this site accepts,
  // and telling someone to wait for a state that will not change is worse than
  // telling them plainly to use a different link.
  // Our relay is down, not the platform. Saying "this site is blocking our
  // server, it usually clears up soon" was wrong in both halves: nothing is
  // blocking anything, and whether it clears up depends on a machine coming
  // back rather than on waiting.
  if (err instanceof ProxyUnreachableError) {
    const site = msg.replace(/^www[.]/, "");
    return {
      error: site
        ? `${site} downloads are briefly unavailable. Everything else on the site still works.`
        : "These downloads are briefly unavailable. Everything else on the site still works.",
      status: 503,
      code: "RELAY_DOWN",
    };
  }
  if (err instanceof SiteUnavailableHereError) {
    const site = msg.replace(/^www\./, "");
    return {
      error: site
        ? `We can't fetch from ${site} here. Everything else on the site still works.`
        : "We can't fetch from that site here. Everything else still works.",
      status: 503,
      code: "SITE_UNAVAILABLE_HERE",
    };
  }
  if (err instanceof PlatformBlockedError || isBlockedByPlatform(msg)) {
    return {
      error:
        "This site is blocking our server right now. It usually clears up soon, try again in a bit, or try a link from another site.",
      status: 503,
      code: "UPSTREAM_BLOCKED",
    };
  }
  if (/timed out|timeout/i.test(msg)) {
    return {
      error: "That took too long and timed out. Please try again.",
      status: 504,
      code: "EXTRACTOR_TIMEOUT",
    };
  }
  // A platform that now requires an account, as opposed to one video being
  // private. Vimeo answers "The web client only works when logged-in" for every
  // video, which fell through to the generic "couldn't read that link" and read
  // like a fault on our side. It is not: nothing here will make it work, and
  // saying so is more useful than inviting a retry.
  if (
    /only works when logged.?in|requires? (?:a )?login|you must be logged in|log ?in to (?:view|watch|continue)/i.test(
      msg,
    )
  ) {
    return {
      error: "This site now requires a sign-in, so it can't be downloaded here.",
      status: 422,
      code: "LOGIN_REQUIRED",
    };
  }
  if (/is private|private video|this (?:video|post|reel) is private/i.test(msg)) {
    return {
      error: "This one is private, so it can't be downloaded.",
      status: 422,
      code: "PRIVATE",
    };
  }
  if (/age.?restrict|confirm your age|inappropriate for some users/i.test(msg)) {
    return {
      error: "This video is age-restricted and needs a sign-in, so it can't be fetched.",
      status: 422,
      code: "AGE_RESTRICTED",
    };
  }
  if (
    /video unavailable|been removed|no longer available|account.*(terminated|closed|suspended)|removed by the (?:uploader|user)|has been deleted|not available anymore|this content isn'?t available/i.test(
      msg,
    )
  ) {
    return {
      error: "This video was removed or is no longer available.",
      status: 422,
      code: "MEDIA_REMOVED",
    };
  }
  if (
    /not available in your (?:country|region|location)|geo.?restrict|blocked it in your country|not available from your location/i.test(
      msg,
    )
  ) {
    return {
      error: "This video is blocked in our server's region, so we can't reach it.",
      status: 451,
      code: "GEO_BLOCKED",
    };
  }
  if (
    /no video formats?|no video could be found|there is no video|unable to extract.*(?:video|media)|no media found|requested format is not available/i.test(
      msg,
    )
  ) {
    return {
      error: "No video found at that link, it may be a photo, a story, or a text-only post.",
      status: 422,
      code: "NO_FORMATS",
    };
  }
  if (/login required|requires? (?:a )?login|log ?in to|you must be logged in|please log in/i.test(msg)) {
    return {
      error: "This post needs a login to view, so it can't be downloaded.",
      status: 422,
      code: "LOGIN_REQUIRED",
    };
  }
  return {
    error:
      "Couldn't read that link. It may be private, region-locked, or the site changed something on their end.",
    status: 502,
    code: "UNKNOWN",
  };
}

/**
 * A short, safe fingerprint of a failure for the error response.
 *
 * Without this, every unrecognised failure looks identical from outside the
 * server and the only way to tell them apart is to read the logs on the box.
 * Contains no stderr, no paths and no credentials, just which yt-dlp error
 * shapes were present, so a failure can be diagnosed remotely.
 */
export function failureFingerprint(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const marks: string[] = [];
  const add = (label: string, re: RegExp) => {
    if (re.test(msg)) marks.push(label);
  };
  add("http403", /http error 403|forbidden/);
  add("http401", /http error 401/);
  add("http404", /http error 404|not found/);
  add("http429", /http error 429|too many requests/);
  add("http5xx", /http error 5\d\d/);
  add("geo", /country|region|geo/);
  add("login", /login|sign in|authenticat/);
  add("m3u8", /m3u8|hls|fragment/);
  add("noformats", /no video formats|no formats found/);
  add("unsupported", /unsupported url|no suitable extractor/);
  add("dns", /getaddrinfo|name or service not known|dns/);
  add("conn", /connection (?:reset|refused|aborted)|econnreset|timed out/);
  add("proxy", /proxy|tunnel/);
  add("empty", /empty media response|returned empty/);
  add("badjson", /unexpected token|unexpected end of json|is not valid json|badjson/);
  add("emptyout", /emptyout|no output from extractor/);
  add("extractfail", /unable to extract|failed to extract|unable to download/);
  add("exitcode", /exited with code/);
  return marks.length ? marks.join("+") : "none";
}

export async function fetchInfo(url: string): Promise<YtDlpInfo> {
  // Hold a concurrency slot for the whole lookup so a burst of requests can't
  // spawn unlimited yt-dlp processes.
  const release = await lookupLimiter.acquire(QUEUE_WAIT_MS);
  try {
    const base = [
      "--dump-single-json",
      "--no-playlist",
      "--no-warnings",
      ...EXTRACTOR_ARGS,
      ...networkArgs(),
    ];
    const yt = isYouTube(url);
    // YouTube gets a longer budget: multiple player clients plus retries take
    // more wall time than a single clean fetch.
    const timeout = yt ? 60_000 : 30_000;

    // Try without the proxy first, when this site has not recently proved it
    // needs one. The host list was written when datacenter addresses were
    // being refused and has not been re-checked since; blocks lift, and the
    // only way to know today's answer is to ask. A success here means the
    // request cost no metered data at all.
    const host = safeHostname(url);
    const needsProxy = hostNeedsProxy(url);
    const haveProxy = proxyAvailable();

    // Nothing left to try. This site is on the list of ones that refuse a
    // datacenter address, it has recently proved it still does, and there is
    // no other address configured. Answering now costs nothing and keeps the
    // lookup slot free for the many sites that do work.
    const fp = extractorFingerprint();
    if (needsProxy && !haveProxy && !shouldTryDirect(host, fp)) {
      throw new SiteUnavailableHereError(host);
    }

    // Nothing will come of this: the site needs an address we reach through the
    // proxy, and the proxy is not answering. Better to say so now than after
    // two timeouts.
    if (needsProxy && haveProxy && !shouldTryDirect(host, fp) && !(await proxyReachable())) {
      throw new ProxyUnreachableError(host);
    }

    if (needsProxy && shouldTryDirect(host, fp)) {
      try {
        // A shorter leash than the proxied attempt gets. A refusal normally
        // comes back in seconds, so this only bites when the site is silent
        // rather than saying no, and in that case waiting the full budget
        // before falling back would just make a blocked lookup feel broken.
        const stdout = await runYtDlp(
          [...base, ...siteArgs(url), "--", url],
          Math.min(timeout, 25_000),
        );
        recordDirectResult(host, true, fp);
        console.log(`[info] ${host} answered without the proxy`);
        putInfo(url, stdout);
        return parseInfoJson(stdout);
      } catch (directErr) {
        // Only a refusal of this address teaches us anything. A deleted video
        // or an unsupported link says nothing about routing, so it is left to
        // the normal path below rather than blamed on the connection.
        if (directErr instanceof UnsupportedSiteError) throw directErr;
        const blocked = directErr instanceof Error && isAddressRefused(directErr.message);
        if (blocked) {
          recordDirectResult(host, false, fp);
          console.log(
            haveProxy
              ? `[info] ${host} refused this address, using the proxy`
              : `[info] ${host} refused this address and no proxy is configured`,
          );
        }
        // With no proxy there is no second address to try, and the path below
        // would run the identical command again. Stop here instead.
        if (!haveProxy) {
          throw blocked ? new SiteUnavailableHereError(host) : directErr;
        }
      }
    }

    try {
      const stdout = await runYtDlp(
        [...base, ...siteArgs(url), ...proxyArgs(url), "--", url],
        timeout,
      );
      putInfo(url, stdout);
      return parseInfoJson(stdout);
    } catch (err) {
      // For YouTube, one bot-block deserves a second try with a different
      // client mix before we give up.
      if (yt && err instanceof Error && !(err instanceof UnsupportedSiteError) && isBlockedByPlatform(err.message)) {
        try {
          const stdout = await runYtDlp(
            [...base, ...siteArgs(url, true), ...proxyArgs(url), "--", url],
            timeout,
          );
          putInfo(url, stdout);
      return parseInfoJson(stdout);
        } catch (retryErr) {
          if (retryErr instanceof Error && isBlockedByPlatform(retryErr.message)) {
            throw new PlatformBlockedError(retryErr.message);
          }
          throw retryErr;
        }
      }
      // A rejected proxy login means the session suffix was not understood,
      // not that the site refused us. Retry once on the plain proxy so an
      // unsupported provider degrades instead of breaking every proxied site.
      if (
        PROXY_STICKY &&
        err instanceof Error &&
        proxyArgs(url).length > 0 &&
        looksLikeProxyAuthFailure(err.message)
      ) {
        try {
          const stdout = await runYtDlp(
            [...base, ...siteArgs(url), ...plainProxyArgs(), "--", url],
            timeout,
          );
          console.warn(
            "[info] proxy rejected the sticky session; falling back to a plain proxy connection. Set YTDLP_PROXY_STICKY=0 if this persists.",
          );
          putInfo(url, stdout);
      return parseInfoJson(stdout);
        } catch {
          // Keep the original error, which describes the real problem.
        }
      }

      // Last resort for any site: if this request did not already go through
      // the proxy and the failure looks like the platform refusing our
      // address, try once more from the residential IP. This is what lets a
      // site that newly starts blocking datacenters keep working without
      // anyone editing the host list first.
      if (
        err instanceof Error &&
        !(err instanceof UnsupportedSiteError) &&
        proxyArgs(url).length === 0 &&
        proxyAvailable() &&
        worthProxyRetry(err.message)
      ) {
        try {
          const stdout = await runYtDlp(
            [...base, ...siteArgs(url), ...forceProxyArgs(url), "--", url],
            timeout,
          );
          console.warn(
            `[info] ${safeHostname(url)} failed direct and succeeded through the proxy; consider adding it to YTDLP_PROXY_HOSTS`,
          );
          putInfo(url, stdout);
      return parseInfoJson(stdout);
        } catch {
          // Fall through to the original error, which describes the real
          // problem better than a failed retry does.
        }
      }
      if (err instanceof Error && isBlockedByPlatform(err.message)) {
        throw new PlatformBlockedError(err.message);
      }
      throw err;
    }
  } finally {
    release();
  }
}

// Hostname only: full URLs can carry tokens, and logs are not the place.
function safeHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "unknown";
  }
}

// Cap on how many videos a single playlist request will list/handle. Keeps
// one person pasting a giant channel from overloading the server.
export const MAX_PLAYLIST_ITEMS = 25;

export type PlaylistEntry = {
  title: string;
  url: string;
  duration: number | null;
};

export type PlaylistInfo = {
  title: string;
  entries: PlaylistEntry[];
  truncated: boolean;
};

type RawFlatEntry = {
  title?: string;
  url?: string;
  webpage_url?: string;
  id?: string;
  duration?: number;
};

// Lists the videos in a playlist without extracting each one fully. This uses
// --flat-playlist, which reads the playlist page and is far more reliable than
// full extraction (it keeps working even when a site blocks video downloads).
// Returns null when the URL isn't actually a playlist.
export async function fetchPlaylist(url: string): Promise<PlaylistInfo | null> {
  const release = await lookupLimiter.acquire(QUEUE_WAIT_MS);
  try {
    const stdout = await runYtDlp([
      "--flat-playlist",
      "--dump-single-json",
      "--no-warnings",
      ...EXTRACTOR_ARGS,
      ...networkArgs(),
      ...siteArgs(url),
      ...proxyArgs(url),
      "--playlist-end",
      String(MAX_PLAYLIST_ITEMS + 1),
      "--",
      url,
    ]);
    const data = JSON.parse(stdout) as {
      _type?: string;
      title?: string;
      entries?: RawFlatEntry[];
    };
    if (data._type !== "playlist" || !Array.isArray(data.entries)) return null;

    const all = data.entries.filter(Boolean);
    const truncated = all.length > MAX_PLAYLIST_ITEMS;
    const entries: PlaylistEntry[] = all
      .slice(0, MAX_PLAYLIST_ITEMS)
      .map((e) => ({
        title: e.title || e.id || "Untitled",
        url: e.url || e.webpage_url || "",
        duration: typeof e.duration === "number" ? e.duration : null,
      }))
      .filter((e) => e.url);

    return { title: data.title || "Playlist", entries, truncated };
  } finally {
    release();
  }
}
