// Keeps visitor-supplied links away from this server's own network.
//
// Only http(s) links to a public host get anywhere near yt-dlp. Which sites
// are supported is then up to yt-dlp's own extractor matching, with the
// "generic" extractor switched off, rather than a hand-kept domain list.
//
// The address checks work on numbers, not on how an address is spelled. The
// previous version compared IPv6 text prefixes and let through several ways of
// writing a local address: ::127.0.0.1, ::ffff:0:127.0.0.1, the NAT64 form
// 64:ff9b::127.0.0.1, and most of the link-local range (only fe80: itself was
// caught, but fe80::/10 runs to febf:). None of those reach anything today,
// because no extractor matches a bare address, but this is the guard that has
// to hold if that ever changes.
//
// Hostnames are not resolved here, so a public name that points at a private
// address passes. The extractor layer is what stops those.

function ipv4IsPrivate(o: number[]): boolean {
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 169 && b === 254) return true; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF, documentation
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // documentation
  if (a === 203 && b === 0 && c === 113) return true; // documentation
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function parseIPv4(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((n) => n <= 255) ? o : null;
}

/** The eight 16-bit groups of an IPv6 address, or null if it is not one. */
export function parseIPv6(raw: string): number[] | null {
  let host = raw.toLowerCase();
  if (host.includes("%")) return null; // zone ids never appear in a public link
  // A trailing dotted IPv4 is two more groups.
  const tail = host.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (tail) {
    const o = parseIPv4(tail[2]);
    if (!o) return null;
    host = `${tail[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const halves = host.split("::");
  if (halves.length > 2) return null;
  const part = (s: string) => (s === "" ? [] : s.split(":"));
  const head = part(halves[0]);
  const rest = halves.length === 2 ? part(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function embeddedIPv4(g: number[], at: number): number[] {
  return [g[at] >> 8, g[at] & 0xff, g[at + 1] >> 8, g[at + 1] & 0xff];
}

function ipv6IsPrivate(g: number[]): boolean {
  const zero = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  // ::/96 covers :: (unspecified), ::1 (loopback) and the old IPv4-compatible
  // form. Nothing public lives there.
  if (zero(0, 6)) return true;
  // IPv4-mapped ::ffff:a.b.c.d, judged by the address inside.
  if (zero(0, 5) && g[5] === 0xffff) return ipv4IsPrivate(embeddedIPv4(g, 6));
  // IPv4-translated ::ffff:0:a.b.c.d.
  if (zero(0, 4) && g[4] === 0xffff && g[5] === 0) return true;
  // NAT64 64:ff9b::/96 carries an IPv4 address too; 64:ff9b:1::/48 is local.
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    return g[2] === 1 || ipv4IsPrivate(embeddedIPv4(g, 6));
  }
  // 6to4 2002::/16 embeds an IPv4 address in groups 1 and 2.
  if (g[0] === 0x2002) return ipv4IsPrivate(embeddedIPv4(g, 1));
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo, address obscured
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x0100 && zero(1, 4)) return true; // discard prefix
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // old site-local fec0::/10
  if ((g[0] & 0xfe00) === 0xfc00) return true; // unique-local fc00::/7
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}

export function isPrivateHost(hostname: string): boolean {
  // "localhost." with the trailing dot is the same host.
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  // An IPv6 literal is the only host form that contains a colon. One that
  // cannot be read is refused rather than waved through.
  if (host.includes(":")) {
    const g = parseIPv6(host);
    return g === null || ipv6IsPrivate(g);
  }

  // WHATWG URL parsing already turns decimal, octal, hex and short IPv4 forms
  // into dotted quads, so this one check covers those spellings too.
  const v4 = parseIPv4(host);
  return v4 !== null && ipv4IsPrivate(v4);
}

/** True for an http(s) link to a public host, with no credentials in it. */
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
