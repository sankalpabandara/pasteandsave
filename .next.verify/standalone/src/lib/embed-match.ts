// The parts of page-embeds.ts that need no network, kept free of relative
// imports so the tests can load them directly.

import dns from "node:dns";
import type { LookupFunction } from "node:net";

/** How yt-dlp carries extra data alongside a URL (utils.smuggle_url). */
export function smuggleReferer(url: string, referer: string): string {
  return `${url}#__youtubedl_smuggle=${encodeURIComponent(JSON.stringify({ referer }))}`;
}

/**
 * The first video player embedded in this HTML, as an address an extractor
 * reads, or null.
 *
 * Only players in embed form count. A page that merely links to a YouTube
 * channel or a Vimeo profile has not embedded anything, and picking those up
 * would hand the visitor someone else's video.
 */
export function findEmbed(html: string, pageUrl: string): string | null {
  // Embed addresses inside scripts are often JSON escaped, and attributes
  // escape the ampersand. vimeo.com's own pages do both at once:
  // ?h=89273da3c3&amp;badge=0.
  const text = html.replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/&amp;/gi, "&");
  const hits: { at: number; url: string }[] = [];

  const vimeo = /\/\/player\.vimeo\.com\/video\/(\d+)([^"'\s<>]*)/i.exec(text);
  if (vimeo) {
    const hash = /[?&]h=([0-9a-f]{6,})/i.exec(vimeo[2])?.[1];
    const player = `https://player.vimeo.com/video/${vimeo[1]}${hash ? `?h=${hash}` : ""}`;
    hits.push({ at: vimeo.index, url: smuggleReferer(player, pageUrl) });
  }
  const event = /\/\/vimeo\.com\/event\/(\d+)(?:\/embed)?(?:\/([0-9a-f]{6,}))?/i.exec(text);
  if (event) {
    const embed = `https://vimeo.com/event/${event[1]}/embed${event[2] ? `/${event[2]}` : ""}`;
    hits.push({ at: event.index, url: smuggleReferer(embed, pageUrl) });
  }
  const yt = /\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})(?![\w-])/i.exec(text);
  if (yt) hits.push({ at: yt.index, url: `https://www.youtube.com/watch?v=${yt[1]}` });

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.at - b.at);
  return hits[0].url;
}

/**
 * A DNS lookup for http(s).get that refuses a name when any address it gives
 * is not public.
 *
 * Checked here, at connect time, rather than on the link: a public looking
 * name can resolve to this server's own network, and a name checked once and
 * resolved again later can give a different answer the second time.
 */
export function makeGuardedLookup(isPrivate: (address: string) => boolean): LookupFunction {
  const lookup = (
    hostname: string,
    options: dns.LookupOptions,
    callback: (...args: unknown[]) => void,
  ) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);
      const list = addresses as dns.LookupAddress[];
      if (list.length === 0 || list.some((a) => isPrivate(a.address))) {
        return callback(Object.assign(new Error("refused: not a public address"), { code: "EPRIVATE" }));
      }
      if (options.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    });
  };
  return lookup as unknown as LookupFunction;
}
