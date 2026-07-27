import fsp from "node:fs/promises";
import path from "node:path";
import { AD_SLOTS, type AdSlotKey } from "./ads";

// Settings that an operator changes without touching code: ad unit ids and the
// Google Analytics measurement id. Both used to be compile-time values, which
// meant a code edit and a deploy to change an ad or switch analytics on. They
// live here instead and are read at runtime, so a change takes effect on the
// next page load while every page stays statically prerendered.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "site-settings.json");

export type AdUnits = Partial<Record<AdSlotKey, string>>;
export type AdSnippets = Partial<Record<AdSlotKey, string>>;

export type SiteSettings = {
  units: AdUnits;
  /**
   * Raw embed code per slot, for networks other than A-ADS.
   *
   * Being tied to one network turned out to be the expensive kind of
   * constraint: A-ADS serves this site's traffic but has no advertisers
   * paying for it, and switching meant a code change and a deploy. A slot
   * with a snippet renders that instead of the A-ADS frame, so a network can
   * be swapped from the admin panel in a minute.
   */
  snippets: AdSnippets;
  /** GA4 measurement id, the "G-XXXXXXX" one. Public by design. */
  gaId: string;
};

// An A-ADS unit id is a plain number, and a GA4 measurement id is G- followed
// by uppercase alphanumerics. Anything else is refused rather than written
// into an iframe src or a script tag.
const UNIT_ID_RE = /^[0-9]{1,15}$/;
const GA_ID_RE = /^G-[A-Z0-9]{4,20}$/;

export function isValidUnitId(value: string): boolean {
  return value === "" || UNIT_ID_RE.test(value.trim());
}

export function isValidGaId(value: string): boolean {
  return value === "" || GA_ID_RE.test(value.trim().toUpperCase());
}

export async function readSettings(): Promise<SiteSettings> {
  // Whatever is compiled in acts as the fallback, so an existing deployment
  // keeps working before anything is saved.
  const fallback: AdUnits = {};
  for (const [key, cfg] of Object.entries(AD_SLOTS)) {
    if (cfg.unitId) fallback[key as AdSlotKey] = cfg.unitId;
  }
  const envGa = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();

  try {
    const saved = JSON.parse(await fsp.readFile(FILE, "utf8")) as Partial<SiteSettings>;
    const units: AdUnits = { ...fallback };
    for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
      const value = saved.units?.[key];
      if (typeof value === "string" && isValidUnitId(value)) {
        if (value.trim()) units[key] = value.trim();
        else delete units[key];
      }
    }
    const snippets: AdSnippets = {};
    for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
      const value = saved.snippets?.[key];
      if (typeof value === "string" && value.trim()) snippets[key] = value.trim();
    }
    const savedGa = typeof saved.gaId === "string" ? saved.gaId.trim().toUpperCase() : "";
    return { units, snippets, gaId: isValidGaId(savedGa) && savedGa ? savedGa : envGa };
  } catch {
    return { units: fallback, snippets: {}, gaId: envGa };
  }
}

export async function writeSettings(input: {
  units?: AdUnits;
  snippets?: AdSnippets;
  gaId?: string;
}): Promise<void> {
  const units: AdUnits = {};
  for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
    const value = (input.units?.[key] ?? "").trim();
    if (value && isValidUnitId(value)) units[key] = value;
  }
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

  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify({ units, snippets, gaId }, null, 2), "utf8");
}

/** Convenience for callers that only care about the ad units. */
export async function readAdUnits(): Promise<AdUnits> {
  return (await readSettings()).units;
}
