import path from "node:path";
import { spawn } from "node:child_process";
import { lookupLimiter } from "./concurrency";

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

export async function fetchInfo(url: string): Promise<YtDlpInfo> {
  // Hold a concurrency slot for the whole lookup so a burst of requests can't
  // spawn unlimited yt-dlp processes.
  const release = await lookupLimiter.acquire();
  try {
    const stdout = await runYtDlp([
      "--dump-single-json",
      "--no-playlist",
      "--no-warnings",
      ...EXTRACTOR_ARGS,
      "--",
      url,
    ]);
    return JSON.parse(stdout) as YtDlpInfo;
  } finally {
    release();
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
  const release = await lookupLimiter.acquire();
  try {
    const stdout = await runYtDlp([
      "--flat-playlist",
      "--dump-single-json",
      "--no-warnings",
      ...EXTRACTOR_ARGS,
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
