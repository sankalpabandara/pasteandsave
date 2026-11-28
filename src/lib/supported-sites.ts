// The public list behind /supported-sites. It is generated, never hand
// edited: run `node scripts/supported-sites.mjs` against the yt-dlp binary
// this install runs and it rewrites src/content/supported-sites.ts.
//
// Kept in src/ rather than data/, because data/ is written to while the
// server is up and a build once failed on a file that moved underneath it.
// A .ts module rather than JSON so the test runner can import it with no
// bundler and no import attributes.
import { SITES, GENERATED, YTDLP_VERSION } from "@/content/supported-sites";

export const SUPPORTED_SITES: string[] = SITES;

/** The day the list was last rebuilt, so the page can say so out loud. */
export const SUPPORTED_SITES_BUILT: string = GENERATED;

/** Which downloader build the list came from. */
export const SUPPORTED_SITES_SOURCE = `yt-dlp ${YTDLP_VERSION}`;
