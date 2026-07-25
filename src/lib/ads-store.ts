import fsp from "node:fs/promises";
import path from "node:path";
import { AD_SLOTS, type AdSlotKey } from "./ads";

// Ad unit ids used to live in the source file, which meant changing one was a
// code edit and a deploy. They are stored here instead so the admin panel can
// change them, and read at runtime rather than at build time so a change shows
// up on the next page load rather than the next build.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ads.json");

export type AdUnits = Partial<Record<AdSlotKey, string>>;

// An A-ADS unit id is a plain number. Anything else is rejected rather than
// written into an iframe src.
const UNIT_ID_RE = /^[0-9]{1,15}$/;

export function isValidUnitId(value: string): boolean {
  return value === "" || UNIT_ID_RE.test(value.trim());
}

/** Saved unit ids, falling back to whatever is compiled into AD_SLOTS. */
export async function readAdUnits(): Promise<AdUnits> {
  const fallback: AdUnits = {};
  for (const [key, cfg] of Object.entries(AD_SLOTS)) {
    if (cfg.unitId) fallback[key as AdSlotKey] = cfg.unitId;
  }
  try {
    const saved = JSON.parse(await fsp.readFile(FILE, "utf8")) as AdUnits;
    const clean: AdUnits = { ...fallback };
    for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
      const value = saved[key];
      if (typeof value === "string" && isValidUnitId(value)) {
        if (value.trim()) clean[key] = value.trim();
        else delete clean[key];
      }
    }
    return clean;
  } catch {
    return fallback;
  }
}

export async function writeAdUnits(units: AdUnits): Promise<void> {
  const clean: AdUnits = {};
  for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
    const value = (units[key] ?? "").trim();
    if (value && isValidUnitId(value)) clean[key] = value;
  }
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify(clean, null, 2), "utf8");
}
