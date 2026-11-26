// Finds a video player embedded in an ordinary web page.
//
// A Vimeo owner can limit their video to their own website: the embed player
// then answers everyone else with 401, 403 or "Cannot download embed-only
// video without embedding URL", and the video page on vimeo.com is no help
// either. What yt-dlp asks for instead is the page the video is embedded in,
// sent along as the Referer. Measured on the server on 2026-10-19 with one of
// yt-dlp's own test videos, player.vimeo.com/video/756714419: refused on its
// own, six formats with sleepsuperconference.com as the referer.
//
// yt-dlp's generic extractor does exactly this, and is switched off here
// because it fetches any page handed to it, private addresses included. This
// does the one job it was needed for, with the address checked at connect
// time on every hop, so a name that resolves to this server's own network is
// refused even though the link itself looks public.

import http from "node:http";
import https from "node:https";
import { findEmbed, makeGuardedLookup } from "./embed-match";
import { isPrivateHost, isSafeUrl } from "./ip-guard";

const MAX_BYTES = 2_000_000;
const DEADLINE_MS = 8000;
const MAX_HOPS = 3;
const REMEMBER_MS = 60 * 60 * 1000;
const REMEMBER_MAX = 500;

const guardedLookup = makeGuardedLookup(isPrivateHost);

function allowedTarget(raw: string): URL | null {
  if (!isSafeUrl(raw)) return null;
  const u = new URL(raw);
  // Web pages live on the web ports. Anything else is somebody's service.
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  return u;
}

type Got = { status: number; location: string | null; body: string };

function getOnce(u: URL, deadline: number): Promise<Got> {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.get(
      u,
      {
        lookup: guardedLookup,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === "string" ? res.headers.location : null;
        const type = String(res.headers["content-type"] || "");
        if (status >= 300 || !/html|xml|^$/i.test(type)) {
          res.resume();
          resolve({ status, location, body: "" });
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => {
          size += c.length;
          // Enough to find an embed in; the rest is not needed.
          if (size > MAX_BYTES) res.destroy();
          else chunks.push(c);
        });
        const done = () => resolve({ status, location, body: Buffer.concat(chunks).toString("utf8") });
        res.on("end", done);
        res.on("close", done);
        res.on("error", reject);
      },
    );
    req.setTimeout(Math.max(1, deadline - Date.now()), () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

/** The page's HTML and where it finally came from, or null. */
export async function fetchPublicPage(raw: string): Promise<{ url: string; html: string } | null> {
  const deadline = Date.now() + DEADLINE_MS;
  let current = allowedTarget(raw);
  for (let hop = 0; current && hop <= MAX_HOPS; hop++) {
    let got: Got;
    try {
      got = await getOnce(current, deadline);
    } catch {
      return null;
    }
    if (got.status >= 300 && got.status < 400 && got.location) {
      try {
        current = allowedTarget(new URL(got.location, current).toString());
      } catch {
        return null;
      }
      continue;
    }
    return got.status === 200 && got.body ? { url: current.toString(), html: got.body } : null;
  }
  return null;
}

// The download is a separate request that names the page again, so the
// lookup's answer is kept for it rather than fetching the page twice.
const remembered = new Map<string, { at: number; target: string }>();

export function rememberedEmbed(pageUrl: string, now = Date.now()): string | null {
  const hit = remembered.get(pageUrl);
  if (!hit) return null;
  if (now - hit.at > REMEMBER_MS) {
    remembered.delete(pageUrl);
    return null;
  }
  return hit.target;
}

function remember(pageUrl: string, target: string) {
  remembered.delete(pageUrl);
  remembered.set(pageUrl, { at: Date.now(), target });
  while (remembered.size > REMEMBER_MAX) {
    const oldest = remembered.keys().next().value;
    if (oldest === undefined) break;
    remembered.delete(oldest);
  }
}

/**
 * The player embedded in the page at this address, ready for the extractor,
 * or null. Only asked once the extractor has said it has nothing for the page
 * itself, so ordinary links never pay for it.
 */
export async function embedFromPage(pageUrl: string): Promise<string | null> {
  const known = rememberedEmbed(pageUrl);
  if (known) return known;
  const page = await fetchPublicPage(pageUrl);
  if (!page) return null;
  // The referer is the page the visitor named, after redirects, because that
  // is the address the site's own player would have been loaded from.
  const target = findEmbed(page.html, page.url);
  if (target) remember(pageUrl, target);
  return target;
}
