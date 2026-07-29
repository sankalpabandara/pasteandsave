import path from "node:path";
import { spawn } from "node:child_process";
import { lookupLimiter, QUEUE_WAIT_MS } from "./concurrency";

// BIN_DIR is overridable so a production deploy can point at an absolute path
// regardless of the working directory (e.g. Next.js standalone output).
const BIN_DIR = process.env.BIN_DIR || path.join(process.cwd(), "bin");
// Binary name differs by OS: yt-dlp.exe on Windows, yt-dlp on Linux/macOS.
// Keeps the app portable between a Windows dev box and a Linux server.
const EXE = process.platform === "win32" ? ".exe" : "";
export const YTDLP_PATH = path.join(BIN_DIR, `yt-dlp${EXE}`);
export const FFMPEG_DIR = BIN_DIR;

// Keeps yt-dlp restricted to its ~1750 named site extractors and disables
// the "generic" fallback, which would otherwise scrape the HTML of
// *any* URL we hand it — turning this server into an open SSRF proxy.
// A URL that doesn't match a specific extractor fails cleanly instead.
export const EXTRACTOR_ARGS = ["--ies", "default,-generic"];

// --- YouTube hardening -----------------------------------------------------
// YouTube blocks its default "web" player client from datacenter IPs (the
// "Sign in to confirm you're not a bot" wall). Picking clients that are more
// tolerant of server IPs makes lookups and downloads work far more often. The
// set is env-overridable so the box operator can retune when YouTube shifts
// again, without a code change or redeploy.
// Each extra client is another full round trip to YouTube — and for us that
// trip goes through a residential proxy, so four clients cost tens of seconds
// on every paste. Two is enough to stay reliable: android_vr survives the
// datacenter block, tv supplies the combined video+audio streams. The rest are
// kept for the fallback attempt below.
const YT_CLIENTS =
  process.env.YTDLP_YOUTUBE_CLIENTS || "android_vr,tv";
// A different mix tried once if the first attempt fails, since which clients
// work drifts week to week.
const YT_FALLBACK_CLIENTS =
  process.env.YTDLP_YOUTUBE_FALLBACK_CLIENTS || "default,web_safari,mweb,ios";

// Optional residential/rotating proxy. Routing blocked sites through a
// non-datacenter IP is the durable fix once player-client tricks stop being
// enough. By default the proxy is applied ONLY to the sites that actually
// block datacenter IPs, so you never pay to proxy Facebook, TikTok, Vimeo and
// the 1,200+ others that work fine direct. Set YTDLP_PROXY_HOSTS="all" to
// route every site through the proxy instead.
const YTDLP_PROXY = process.env.YTDLP_PROXY;
// Only sites proven to refuse this server's address belong here. Everything
// else goes direct and, if it turns out to be blocked, is retried through the
// proxy automatically by the fallback in fetchInfo — so being absent from
// this list costs a slow first attempt, never a broken site.
//
// Instagram and Threads refuse datacenter addresses outright: the same reel
// that extracts fine from a home connection fails in about four seconds from
// the server. TikTok and Facebook work direct and stay off.
//
// Dailymotion was listed here historically and was failing *because* of it —
// it extracts fine direct but returns errors through the proxy, which points
// at the exit node's location rather than the extractor. Direct-first with
// the automatic fallback covers both cases.
const YTDLP_PROXY_HOSTS = (
  process.env.YTDLP_PROXY_HOSTS ||
  "youtube.com,youtu.be,youtube-nocookie.com,instagram.com,threads.net,bilibili.com"
)
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
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
export function networkArgs(): string[] {
  const args: string[] = [
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
const PROXY_STICKY = (process.env.YTDLP_PROXY_STICKY ?? "1") !== "0";

function newSessionId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

function stickyProxyUrl(raw: string): string {
  if (!PROXY_STICKY) return raw;
  try {
    const u = new URL(raw);
    // Nothing to attach the session to without credentials.
    if (!u.password) return raw;
    if (/_session-/.test(u.password)) return raw;
    u.password = `${u.password}_session-${newSessionId()}`;
    return u.toString();
  } catch {
    return raw;
  }
}

export function proxyArgs(rawUrl: string): string[] {
  if (!YTDLP_PROXY) return [];
  if (YTDLP_PROXY_HOSTS.includes("all") || YTDLP_PROXY_HOSTS.includes("*")) {
    return ["--proxy", stickyProxyUrl(YTDLP_PROXY)];
  }
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return [];
  }
  const match = YTDLP_PROXY_HOSTS.some((h) => host === h || host.endsWith("." + h));
  return match ? ["--proxy", stickyProxyUrl(YTDLP_PROXY)] : [];
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
// proxy — used to decide whether it counts against the daily proxy budget.
export function usesProxy(rawUrl: string): boolean {
  return proxyArgs(rawUrl).length > 0;
}

/**
 * Which sites are routed through the proxy, for the health endpoint. Reports
 * only whether a proxy is set and the hostnames it applies to — never the
 * proxy URL, which carries credentials. Wrong routing here is invisible from
 * the outside otherwise, and is exactly what made Instagram fail.
 */
export function proxyStatus(): { configured: boolean; hosts: string[] } {
  return { configured: Boolean(YTDLP_PROXY), hosts: [...YTDLP_PROXY_HOSTS] };
}

/** True when a proxy exists to fall back to. */
export function proxyAvailable(): boolean {
  return Boolean(YTDLP_PROXY);
}

/** Proxy flags regardless of the host list, for the automatic retry below. */
export function forceProxyArgs(): string[] {
  return YTDLP_PROXY ? ["--proxy", stickyProxyUrl(YTDLP_PROXY)] : [];
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
 * really gone — retrying those would spend metered proxy traffic for nothing.
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

function youtubeClientArgs(clients: string): string[] {
  return ["--extractor-args", `youtube:player_client=${clients}`];
}

// Builds the YouTube-specific extractor args to bolt onto any call. Empty for
// non-YouTube URLs, which keep working exactly as before.
export function siteArgs(url: string, fallback = false): string[] {
  if (!isYouTube(url)) return [];
  return youtubeClientArgs(fallback ? YT_FALLBACK_CLIENTS : YT_CLIENTS);
}

// Stderr signatures that mean "the platform is refusing our server", as
// opposed to a genuinely private or missing video. Used to give a clearer
// message and to decide whether a fallback retry is worth attempting.
export function isBlockedByPlatform(stderr: string): boolean {
  return /confirm you'?re not a bot|sign in to confirm|not a bot|HTTP Error 429|HTTP Error 403|too many requests|failed to extract any player response|unable to download api page/i.test(
    stderr,
  );
}

// Categories used to turn a raw extractor failure into something safe to show.
// Downloads report progress over SSE, so whatever lands here reaches the
// visitor's browser — raw stderr must never be forwarded, because yt-dlp
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

  if (err instanceof PlatformBlockedError || isBlockedByPlatform(msg)) {
    return {
      error:
        "This site is blocking our server right now. It usually clears up soon — try again in a bit, or try a link from another site.",
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
      error: "No video found at that link — it may be a photo, a story, or a text-only post.",
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
 * Contains no stderr, no paths and no credentials — just which yt-dlp error
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
    try {
      const stdout = await runYtDlp(
        [...base, ...siteArgs(url), ...proxyArgs(url), "--", url],
        timeout,
      );
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
            [...base, ...siteArgs(url), ...forceProxyArgs(), "--", url],
            timeout,
          );
          console.warn(
            `[info] ${safeHostname(url)} failed direct and succeeded through the proxy; consider adding it to YTDLP_PROXY_HOSTS`,
          );
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
