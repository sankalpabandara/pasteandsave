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

// Pinterest's app shares pin.it/XXXX, which no extractor matches: 120 lookups
// were turned away as "not a site we can download from" while the same pin's
// pinterest.com/pin/ address downloads fine. Measured from the server, the
// chain is pin.it, then api.pinterest.com/url_shortener/XXXX/redirect/, then
// the pin. A dead code lands on the Pinterest home page instead.
const PINTEREST_HOSTS = /^(?:[a-z0-9-]+\.)*(?:pin\.it|pinterest(?:\.[a-z]{2,3}){1,2})$/i;

const MAX_HOPS = 5;
const TIMEOUT_MS = 8000;

type Family = "facebook" | "pinterest";

function familyOf(host: string): Family | null {
  if (FACEBOOK_HOSTS.test(host)) return "facebook";
  if (PINTEREST_HOSTS.test(host)) return "pinterest";
  return null;
}

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
  if (host === "pin.it" && u.pathname.length > 1) return true;
  return false;
}

function sameFamily(rawUrl: string, family: Family): boolean {
  try {
    return familyOf(new URL(rawUrl).hostname) === family;
  } catch {
    return false;
  }
}

// The parts of a Facebook address that say which video it is. Everything else
// is about the share: measured 2026-10-19, the same /share/r/ link redirected
// three times in a row to reel/1147657863865665/?rdid=<random>&share_url=...,
// a different rdid each time. Kept, that made every resolution a new address,
// so the download never found the lookup it followed, and a re-paste never
// found the cached quality list.
const FACEBOOK_KEEP = new Set(["v", "story_fbid", "id", "fbid", "set"]);

/** A Facebook address with only the parameters that identify the video. */
export function canonicalFacebook(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (familyOf(u.hostname) !== "facebook") return rawUrl;
    for (const key of [...u.searchParams.keys()]) {
      if (!FACEBOOK_KEEP.has(key)) u.searchParams.delete(key);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * The pin a Pinterest address is for, in the one form the extractor matches.
 *
 * The landing address carries tracking (/sent/?invite_code=...&sender=...),
 * which is the sharer's, not the pin's, and is dropped. Anything that is not a
 * pin, such as the home page a dead short link ends on, gives null.
 */
export function canonicalPin(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (familyOf(u.hostname) !== "pinterest") return null;
    const m = u.pathname.match(/^\/pin\/(?:[\w-]+--)?(\d+)(?:\/|$)/);
    return m ? `https://www.pinterest.com/pin/${m[1]}/` : null;
  } catch {
    return null;
  }
}

/**
 * Turns a vimeo.com page address into the embed player's, which still works.
 *
 * yt-dlp reads a vimeo.com page through Vimeo's API, and the only client that
 * could do that without an account stopped working upstream (yt-dlp issue
 * 17271): every lookup failed with "The web client only works when logged-in".
 * The embed player is what plays the video on other people's sites, needs no
 * account, and answered this server directly, with every quality.
 *
 * Not every video survives the change. An owner can limit embedding to their
 * own domains, and those answer 401 to everyone else; they failed before this
 * too, and say so now in their own words.
 */
export function vimeoPlayerUrl(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/^(?:www\.)?vimeo\.com$/i.test(u.hostname)) return null;
  const p = u.pathname.replace(/\/+$/, "");
  const m =
    p.match(/^\/(\d+)(?:\/([0-9a-f]{6,}))?$/i) ??
    p.match(/^\/channels\/[\w-]+\/(\d+)$/i) ??
    p.match(/^\/groups\/[\w-]+\/videos\/(\d+)$/i) ??
    p.match(/^\/(?:showcase|album)\/\d+\/video\/(\d+)$/i);
  if (!m) return null;
  // An unlisted video is only reachable with its hash, from the path or ?h=.
  const hash = m[2] ?? u.searchParams.get("h");
  const h = hash && /^[0-9a-f]{6,}$/i.test(hash) ? `?h=${hash}` : "";
  return `https://player.vimeo.com/video/${m[1]}${h}`;
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
/**
 * Asks the relay where a share link goes, when one is configured.
 *
 * Facebook shows a datacenter address a login wall rather than the video, so
 * resolving from the server usually learns nothing. The relay sits on a home
 * connection and gets a real answer, and it is already reachable on the loopback
 * through the reverse tunnel. Falls through to resolving locally when there is
 * no relay, so a box without one behaves as it did before.
 */
/**
 * Where to send share-link questions, or null when there is nowhere to ask.
 *
 * This is not always the download proxy. The proxy can be a plain SOCKS exit
 * such as Cloudflare WARP, which carries traffic but has no /resolve endpoint,
 * while the home relay has one. SHARE_LINK_RELAY names the relay directly.
 * Without it the proxy is asked when it speaks HTTP, which is how the relay has
 * always been reached when it doubles as the proxy.
 */
export function shareRelayBase(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.SHARE_LINK_RELAY || env.YTDLP_PROXY;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function askRelay(rawUrl: string): Promise<string | null> {
  const base = shareRelayBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/resolve?url=${encodeURIComponent(rawUrl)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS + 4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { url?: string | null };
    const out = typeof body.url === "string" ? body.url : null;
    return out && sameFamily(out, "facebook") && !isShareLink(out) ? out : null;
  } catch {
    return null;
  }
}

/**
 * A Wikimedia Commons file in the one form yt-dlp matches,
 * commons.wikimedia.org/wiki/File:<name>, or null.
 *
 * Measured on the server on 2026-10-20: that form gives formats, images
 * included, while index.php?title=File:..., the mobile site and the file's own
 * upload.wikimedia.org address all answered "No suitable extractor", which is
 * what 6 lookups in a day were told.
 */
export function canonicalCommons(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const page = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`;
  const hasExt = (name: string) => /\.[A-Za-z0-9]{2,5}$/.test(name);
  if (host === "commons.wikimedia.org" || host === "commons.m.wikimedia.org") {
    // The media viewer: any page with #/media/File:<name>.
    const viewer = /^#\/media\/File:(.+)$/.exec(u.hash);
    if (viewer && hasExt(viewer[1])) return page(viewer[1]);
    const wiki = /^\/wiki\/File:([^/]+)$/.exec(u.pathname);
    if (wiki && hasExt(wiki[1])) return page(wiki[1]);
    if (u.pathname === "/w/index.php") {
      const title = u.searchParams.get("title") ?? "";
      const m = /^File:(.+)$/.exec(title);
      if (m && hasExt(m[1])) return page(encodeURI(m[1].replace(/ /g, "_")));
    }
    return null;
  }
  if (host === "upload.wikimedia.org") {
    // /wikipedia/commons/a/ab/Name.ext, its /thumb/ copies and /transcoded/ versions.
    const m = /^\/wikipedia\/commons\/(?:thumb\/|transcoded\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(u.pathname);
    if (m && hasExt(m[1])) return page(m[1]);
  }
  return null;
}

export async function resolveShareLink(rawUrl: string): Promise<string | null> {
  // No network needed: the player address follows from the page address.
  const player = vimeoPlayerUrl(rawUrl);
  if (player) return player;
  const commons = canonicalCommons(rawUrl);
  if (commons) return commons !== rawUrl ? commons : null;

  if (!isShareLink(rawUrl)) {
    // A Facebook address pasted as it is can still carry share tracking.
    const clean = canonicalFacebook(rawUrl);
    return clean !== rawUrl ? clean : null;
  }
  let family: Family;
  try {
    const f = familyOf(new URL(rawUrl).hostname);
    if (!f) return null;
    family = f;
  } catch {
    return null;
  }

  // The relay first: it is the only party here with an address Facebook will
  // answer honestly. Pinterest answers this server as it is, so is not sent.
  if (family === "facebook") {
    const viaRelay = await askRelay(rawUrl);
    if (viaRelay) return canonicalFacebook(viaRelay);
  }

  let current = rawUrl;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // A Chrome User-Agent on its own gets a 400 from Facebook: it notices
          // a browser that does not send what browsers send. Measured on the
          // same link, same address, seconds apart: UA alone 400, UA with the
          // rest of the browser headers 302 to the canonical address. Sending
          // no headers at all also works, but the full set is what a real share
          // click looks like and is least likely to be singled out later.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
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
      if (!sameFamily(next, family)) return null;
      current = next;
      // A redirect to a login page means Facebook would not show this to us
      // anyway, and handing that on produces a worse error than the original.
      if (/\/login\b/i.test(new URL(current).pathname)) return null;
      // Arriving at the pin is the answer. Fetching the pin page as well would
      // only spend a request, and its own redirects say nothing about the pin.
      if (family === "pinterest") {
        const pin = canonicalPin(current);
        if (pin) return pin;
      }
      // The same for Facebook: the first address that is not a share link is
      // the video's. Fetching it too cost a whole reel page per share link.
      if (family === "facebook" && !isShareLink(current)) return canonicalFacebook(current);
      continue;
    }
    break;
  }

  if (current === rawUrl) return null;
  if (isShareLink(current)) return null;
  // Only a pin is worth handing on. A dead short link ends on the home page,
  // and the extractor would call that unsupported, which is no better.
  if (family === "pinterest") return canonicalPin(current);
  return sameFamily(current, family) ? canonicalFacebook(current) : null;
}
