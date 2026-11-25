import fsp from "node:fs/promises";
import path from "node:path";
import { AD_SLOTS, ADSTERRA_SIZES, type AdSlotKey, type AdsterraSize } from "./ads";

// Settings that an operator changes without touching code: the Adsterra codes,
// any other network's embed per slot, and the Google Analytics measurement id.
// They used to be compile-time values, which meant a code edit and a deploy to
// change an ad or switch analytics on. They live here instead and are read at
// runtime, so a change takes effect on the next page load while every page
// stays statically prerendered.
//
// Files written before 2026-11-25 also hold a "units" table of A-ADS ids. A-ADS
// is no longer used, so that table is ignored on read and dropped on the next
// save.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "site-settings.json");

export type AdSnippets = Partial<Record<AdSlotKey, string>>;

/**
 * One Adsterra banner unit: the key from its embed, and the script URL that
 * serves it. The URL is stored rather than built, because Adsterra moves the
 * serving domain from time to time and a hardcoded one would quietly stop
 * paying the day they change it.
 */
export type AdsterraUnit = { key: string; src: string };
export type AdsterraUnits = Partial<Record<AdsterraSize, AdsterraUnit>>;

export type SiteSettings = {
  /**
   * Raw embed code per slot, for a network other than Adsterra.
   *
   * Being tied to one network turned out to be the expensive kind of
   * constraint: switching meant a code change and a deploy. A slot with a
   * snippet renders that instead of its Adsterra banner, so a network can be
   * tried from the admin panel in a minute.
   */
  snippets: AdSnippets;
  /**
   * Adsterra banner units keyed by size. A slot renders the unit matching its
   * own size rather than carrying a unit of its own, because Adsterra's embed
   * sets a single global, `atOptions`, which the next embed on the page
   * overwrites before the first one has read it. Each unit is rendered in its
   * own little document instead, so there is one global per banner.
   */
  adsterra: AdsterraUnits;
  /** GA4 measurement id, the "G-XXXXXXX" one. Public by design. */
  gaId: string;
};

// A GA4 measurement id is G- followed by uppercase alphanumerics. Anything
// else is refused rather than written into a script tag.
const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;

export function isValidGaId(value: string): boolean {
  return value === "" || GA_ID_RE.test(value.trim().toUpperCase());
}

// An Adsterra key is the hex string in its embed. Checked because it is
// written into a script tag as a JavaScript string literal.
const ADSTERRA_KEY_RE = /^[a-f0-9]{16,64}$/i;

/**
 * The hosts the page's own policy already allows scripts from, from the same
 * environment variable the policy is built out of. An Adsterra script URL is
 * only accepted if it points at one of them: a URL the policy would block
 * renders an empty slot that looks exactly like a network not filling, and
 * one it allows is a host the operator has already vouched for.
 */
function allowedScriptHosts(): string[] {
  return (process.env.AD_NETWORK_DOMAINS || "")
    .split(/[\s,]+/)
    .map((d) => d.trim().replace(/^https:\/\//, "").replace(/^\*\./, "").toLowerCase())
    .filter(Boolean);
}

export function isValidAdsterraSrc(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return allowedScriptHosts().some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function isValidAdsterraUnit(unit: unknown): unit is AdsterraUnit {
  if (!unit || typeof unit !== "object") return false;
  const { key, src } = unit as Record<string, unknown>;
  return (
    typeof key === "string" &&
    ADSTERRA_KEY_RE.test(key.trim()) &&
    typeof src === "string" &&
    isValidAdsterraSrc(src.trim())
  );
}

/** Keeps only the sizes this build knows about, with a valid key and URL. */
export function cleanAdsterra(input: unknown): AdsterraUnits {
  const out: AdsterraUnits = {};
  if (!input || typeof input !== "object") return out;
  const source = input as Record<string, unknown>;
  for (const size of ADSTERRA_SIZES) {
    const unit = source[size];
    if (!isValidAdsterraUnit(unit)) continue;
    out[size] = { key: unit.key.trim(), src: unit.src.trim() };
  }
  return out;
}

export async function readSettings(): Promise<SiteSettings> {
  const envGa = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();

  try {
    const saved = JSON.parse(await fsp.readFile(FILE, "utf8")) as Partial<SiteSettings>;
    const snippets: AdSnippets = {};
    for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
      const value = saved.snippets?.[key];
      if (typeof value === "string" && value.trim()) snippets[key] = value.trim();
    }
    const savedGa = typeof saved.gaId === "string" ? saved.gaId.trim().toUpperCase() : "";
    return {
      snippets,
      adsterra: cleanAdsterra(saved.adsterra),
      gaId: isValidGaId(savedGa) && savedGa ? savedGa : envGa,
    };
  } catch {
    return { snippets: {}, adsterra: {}, gaId: envGa };
  }
}

export async function writeSettings(input: {
  snippets?: AdSnippets;
  adsterra?: AdsterraUnits;
  gaId?: string;
}): Promise<void> {
  const snippets: AdSnippets = {};
  for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
    const value = (input.snippets?.[key] ?? "").trim();
    // Capped rather than validated by shape: every network writes its embed
    // differently, so anything stricter would reject a legitimate one. The
    // limit only stops the settings file being used as general storage.
    if (value) snippets[key] = value.slice(0, 8000);
  }
  const gaRaw = (input.gaId ?? "").trim().toUpperCase();
  const gaId = isValidGaId(gaRaw) ? gaRaw : "";

  // Left alone unless the caller sends its own. The admin panel posts snippets
  // and the analytics id, and writing the whole file from that would silently
  // delete the Adsterra keys the moment anyone pressed Save.
  const adsterra = input.adsterra
    ? cleanAdsterra(input.adsterra)
    : (await readSettings()).adsterra;

  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(
    FILE,
    JSON.stringify({ snippets, adsterra, gaId }, null, 2),
    "utf8",
  );
}
