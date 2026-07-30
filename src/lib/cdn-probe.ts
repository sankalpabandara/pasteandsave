// Decides whether a video's media can be fetched straight from the CDN, or
// whether it has to come through the metered proxy.
//
// The proxy exists because YouTube refuses to *extract* from a datacenter
// address. The media itself lives on a CDN that does no such check, so paying
// residential rates to move forty megabytes of video is waste: the only part
// that needs the proxy is the page request, which is about a megabyte.
//
// The catch is that YouTube signs its stream links against the address that
// asked for them, and puts that address in the link as an `ip=` parameter. A
// link obtained through the proxy is therefore not always usable from the
// server's own address. Whether it is depends on the player client and changes
// without notice, so this asks rather than assumes: one range request for a
// single byte, and the CDN's answer decides.
//
// Costs nothing when it says no. The probe is one byte over the server's own
// connection, and a refusal just means the download proceeds exactly as it
// does today.

/** Shape of the pieces of yt-dlp's JSON this needs. */
type Format = {
  format_id?: string;
  url?: string;
  protocol?: string;
  acodec?: string;
  vcodec?: string;
  abr?: number;
  tbr?: number;
  filesize?: number;
};
export type InfoJson = { formats?: Format[]; url?: string };

// Manifest-based formats are a playlist of further requests, each separately
// signed. Probing the manifest would prove nothing about the segments, so
// these always take the proxy.
function isDirectHttp(f: Format): boolean {
  if (!f.url || !/^https?:\/\//i.test(f.url)) return false;
  const p = (f.protocol || "").toLowerCase();
  return p === "" || p === "https" || p === "http";
}

/**
 * The single URL worth probing for this download, or null when there is
 * nothing that can be checked and the proxy should be used.
 *
 * For a video the chosen format is the one that matters: it is the bulk of the
 * bytes, and the audio track that gets muxed in comes from the same CDN under
 * the same signature. For audio-only the best direct audio stream stands in.
 */
export function pickProbeUrl(info: InfoJson, formatId: string | null): string | null {
  const formats = Array.isArray(info.formats) ? info.formats : [];

  if (formatId) {
    const exact = formats.find((f) => f.format_id === formatId);
    return exact && isDirectHttp(exact) ? exact.url! : null;
  }

  // Audio mode: yt-dlp picks bestaudio itself, so mirror that choice as
  // closely as possible. It ranks on overall bitrate rather than the audio
  // bitrate field, which is often missing; sorting on abr alone picked a
  // different stream from the one that then got downloaded, so the probe was
  // answering a question about a file nobody was going to fetch.
  const rank = (f: Format) => f.tbr ?? f.abr ?? f.filesize ?? 0;
  const audio = formats
    .filter((f) => isDirectHttp(f) && f.acodec && f.acodec !== "none")
    .sort((a, b) => rank(b) - rank(a));
  if (audio.length > 0) return audio[0]!.url!;

  // A single progressive URL with no format list at all.
  return typeof info.url === "string" && /^https?:\/\//i.test(info.url) ? info.url : null;
}

/**
 * Asks the CDN for one byte, from this server's own address.
 *
 * A 200 or 206 means the link works without the proxy and the whole file can
 * follow the same way. Anything else, including a network error, is treated as
 * "use the proxy", because being wrong in that direction costs bandwidth while
 * being wrong the other way costs the visitor their download.
 */
export async function cdnAcceptsDirect(url: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    // The body is one byte, but it still has to be released or the socket
    // stays open until the timeout.
    await res.arrayBuffer().catch(() => undefined);
    return res.status === 206 || res.status === 200;
  } catch {
    return false;
  }
}
