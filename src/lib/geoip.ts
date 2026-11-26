import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { Reader, type CountryResponse } from "mmdb-lib";

// The country an IP address is in, for picking the site's language.
//
// Uses DB-IP's free "IP to Country Lite" database (CC BY 4.0, credited in the
// footer). It is a 4 MB download that DB-IP refreshes monthly, so the site
// fetches it itself: on first use when the file is missing, and again once it
// is more than 35 days old. Until a copy is on disk every lookup answers
// null, and the language falls back to the browser's own setting. The address
// is looked up in memory and never stored.

const DB_PATH = process.env.GEOIP_DB || path.join(process.cwd(), "data", "dbip-country-lite.mmdb");
const MAX_AGE_MS = 35 * 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const AUTO_DOWNLOAD = process.env.GEOIP_AUTO_DOWNLOAD !== "0";

let reader: Reader<CountryResponse> | null = null;
let loadedMtime = 0;
let lastCheck = 0;
let lastAttempt = 0;
let downloading = false;

function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** This month's file, or last month's if DB-IP has not published yet. */
async function download(): Promise<void> {
  if (downloading) return;
  downloading = true;
  try {
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    for (const month of [monthOf(now), monthOf(lastMonth)]) {
      const res = await fetch(`https://download.db-ip.com/free/dbip-country-lite-${month}.mmdb.gz`, {
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) continue;
      const db = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
      // Proves the file is a working database before it replaces anything.
      new Reader<CountryResponse>(db).get("8.8.8.8");
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      const tmp = `${DB_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, db);
      fs.renameSync(tmp, DB_PATH);
      reader = null;
      console.log(`geoip: installed DB-IP country database ${month}`);
      return;
    }
    console.warn("geoip: no DB-IP country database could be downloaded");
  } catch (err) {
    console.warn("geoip: download failed", err instanceof Error ? err.message : err);
  } finally {
    downloading = false;
  }
}

function currentReader(): Reader<CountryResponse> | null {
  const now = Date.now();
  if (now - lastCheck > CHECK_EVERY_MS || !reader) {
    lastCheck = now;
    let mtime = 0;
    try {
      mtime = fs.statSync(DB_PATH).mtimeMs;
    } catch {
      mtime = 0;
    }
    // At most one attempt an hour, so a failed download is not retried on
    // every request while there is no file.
    if (AUTO_DOWNLOAD && (mtime === 0 || now - mtime > MAX_AGE_MS) && now - lastAttempt > 60 * 60 * 1000) {
      lastAttempt = now;
      void download();
    }
    if (mtime > 0 && (mtime !== loadedMtime || !reader)) {
      try {
        reader = new Reader<CountryResponse>(fs.readFileSync(DB_PATH));
        loadedMtime = mtime;
      } catch {
        reader = null;
      }
    }
  }
  return reader;
}

/** The two letter country code for an address, or null when it cannot be told. */
export function countryOf(ip: string): string | null {
  if (!ip || ip === "local") return null;
  try {
    const hit = currentReader()?.get(ip.replace(/^::ffff:/, ""));
    return hit?.country?.iso_code ?? null;
  } catch {
    return null;
  }
}
