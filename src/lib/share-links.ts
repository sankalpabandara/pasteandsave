// Turns a share link into the address an extractor recognises.
//
// Facebook's Share button no longer produces a URL yt-dlp can match. It gives
// out fb.watch/XXXX, facebook.com/share/v/XXXX and facebook.com/share/r/XXXX,
// and none of those have an extractor: yt-dlp answers "No suitable extractor",
// which the site reports as "That link isn't from a site we can download from".
// The canonical forms it does match, watch/?v=, /videos/ and /reel/, are the
// ones nobody is given any more when they press Share in the app.
//
// yt-dlp's generic extractor used to paper over this by following the redirect,
// but generic is deliberately disabled here: it would scrape any URL handed to
// the server, which is the SSRF hole the --ies default,-generic flag closes.
// Following the redirect ourselves keeps that closed while making share links
// work, because we decide what counts as an acceptable destination rather than
// letting the extractor follow a redirect anywhere it likes.

/** Hosts a resolved share link is allowed to land on. */
const FACEBOOK_HOSTS =
  /^(?:[a-z0-9-]+\.)*(?:facebook\.com|fb\.watch|fb\.com|facebook\.net)$/i;

const MAX_HOPS = 5;
const TIMEOUT_MS = 8000;

/** Cheap test first, so ordinary links never pay for a network round trip. */
export function isShareLink(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "fb.watch") return true;
  if (/(?:^|\.)facebook\.com$/.test(host) && /^\/share\//i.test(u.pathname)) return true;
  return false;
}

function sameFamily(rawUrl: string): boolean {
  try {
    return FACEBOOK_HOSTS.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * Follows the redirect chain by hand and returns where it lands.
 *
 * Manual rather than redirect:"follow" so every hop can be checked: a share
 * link that redirects off Facebook is not something to hand to an extractor,
 * and an open redirect is exactly how a URL allowlist gets walked around.
 *
 * Returns null when it does not resolve to something better, and the caller
 * then uses the original address, so a failure here is never worse than today.
 */
export async function resolveShareLink(rawUrl: string): Promise<string | null> {
  if (!isShareLink(rawUrl)) return null;

  let current = rawUrl;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Facebook serves the canonical address to a browser and a login
          // wall to anything that looks automated.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch {
      return null;
    }
    // Release the body or the socket stays open until it times out.
    await res.arrayBuffer().catch(() => undefined);

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      let next: string;
      try {
        next = new URL(location, current).toString();
      } catch {
        return null;
      }
      if (!sameFamily(next)) return null;
      current = next;
      // A redirect to a login page means Facebook would not show this to us
      // anyway, and handing that on produces a worse error than the original.
      if (/\/login\b/i.test(new URL(current).pathname)) return null;
      continue;
    }
    break;
  }

  if (current === rawUrl) return null;
  if (isShareLink(current)) return null;
  return sameFamily(current) ? current : null;
}
