// Reading Adsterra codes. No imports, so the proxy, the server and the tests
// can all use it.
//
// Adsterra hands out each ad as a snippet of HTML. What the site needs from a
// snippet is the address of its script, and for a Native Banner the key that
// names its container div. Pasting the whole snippet into the admin panel is
// easier than picking the address out by hand, so both are accepted.

const KEY_RE = /^[a-f0-9]{16,64}$/i;
const HOST_RE = /^[a-z0-9.-]+$/;

/**
 * The https address of the script in an Adsterra code, or null.
 * Takes a whole snippet or just the address. Adsterra writes addresses
 * without a scheme ("//pl123.example.com/..."), which become https.
 */
export function scriptSrcFromCode(code: string): string | null {
  const text = code.trim();
  if (!text) return null;
  const tag = text.match(/<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  let raw = tag ? tag[1] : /^(https?:)?\/\/\S+$/i.test(text) ? text : "";
  if (!raw) return null;
  if (raw.startsWith("//")) raw = `https:${raw}`;
  if (raw.startsWith("http://")) raw = `https://${raw.slice("http://".length)}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !HOST_RE.test(url.hostname)) return null;
  return url.href;
}

/** The host of a script address, or null if it is not a usable https address. */
export function scriptHost(src: string | undefined | null): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && HOST_RE.test(url.hostname) ? url.hostname : null;
  } catch {
    return null;
  }
}

export type AdPolicy = {
  /** "https://host" and "https://*.host" for every saved Adsterra script. */
  hosts: string[];
  /** The Social Bar runs in the page itself, so the page policy has to make room for it. */
  socialBar: boolean;
};

/** What the content policy needs from a parsed data/site-settings.json. */
export function policyFromSettings(saved: unknown): AdPolicy {
  if (!saved || typeof saved !== "object") return { hosts: [], socialBar: false };
  const s = saved as Record<string, unknown>;
  const banners = s.adsterra && typeof s.adsterra === "object" ? Object.values(s.adsterra as object) : [];
  const sources = [
    ...banners.map((u) => (u && typeof u === "object" ? (u as Record<string, unknown>).src : undefined)),
    s.socialBar,
    s.native,
  ];
  const hosts = new Set<string>();
  for (const src of sources) {
    const host = typeof src === "string" ? scriptHost(src) : null;
    if (!host) continue;
    hosts.add(`https://${host}`);
    hosts.add(`https://*.${host}`);
  }
  return {
    hosts: [...hosts],
    socialBar: typeof s.socialBar === "string" && scriptHost(s.socialBar) !== null,
  };
}

/**
 * The unit key inside an Adsterra address. Anti adblock codes end in it
 * (https://host/22/<key>); plain codes put it before invoke.js
 * (https://host/<key>/invoke.js). So it is the last hex segment.
 */
export function adsterraKey(src: string): string | null {
  try {
    const parts = new URL(src).pathname.split("/").filter((p) => KEY_RE.test(p));
    return parts.length ? parts[parts.length - 1].toLowerCase() : null;
  } catch {
    return null;
  }
}
