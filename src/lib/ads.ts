// Central ad configuration. This is the ONLY file you edit to manage ads.
//
// To go live:
//   1. Create ad units at https://a-ads.com (each gives a numeric unit id).
//   2. Paste each unit id into the matching slot below.
//   3. That's it — empty ids render nothing in production, so the site works
//      fully before you add codes.
//
// A-ADS is a cookieless, privacy-friendly banner network (no personal data,
// no tracking cookies), so no consent banner is required for it.

export const ADS_ENABLED = true;

// The interstitial "ad gate" (shown when a download starts) fires at most once
// per this interval per browser, so a user is never repeatedly interrupted.
export const AD_GATE_COOLDOWN_MS = 4 * 60 * 1000;
// How long the gate stays before its "Continue" button enables.
export const AD_GATE_MIN_MS = 3000;

// The desktop sidebar rail. It floats in the right-hand margin on wide
// screens only, so the centred layout is unaffected on laptops and phones.
export const SIDEBAR_ADS_ENABLED = true;

// Show labelled placeholder boxes for unconfigured slots during development so
// placements are visible while building. Never shown in production.
export const SHOW_AD_PLACEHOLDERS = process.env.NODE_ENV !== "production";

export type AdPlacement = {
  /** A-ADS numeric unit id. Empty string = slot is inactive. */
  unitId: string;
  /** Reserved height in px — prevents layout shift while the ad loads. */
  height: number;
  /** Max width in px (banner shape). Full width up to this on smaller screens. */
  maxWidth: number;
  /** Which A-ADS unit size to create for this slot, e.g. "728x90" or
   *  "Adaptive". A reference for you when making units; not sent to A-ADS. */
  size?: string;
};

export const AD_SLOTS = {
  // Leaderboard-style banners (wide, short).
  homeTop: { unitId: "", height: 90, maxWidth: 728, size: "728x90" },
  homeBottom: { unitId: "", height: 90, maxWidth: 728, size: "728x90" },
  toolTop: { unitId: "", height: 90, maxWidth: 728, size: "728x90" },
  toolBottom: { unitId: "", height: 90, maxWidth: 728, size: "728x90" },
  // Medium rectangles (between content sections).
  homeMid: { unitId: "", height: 250, maxWidth: 336, size: "336x280" },
  toolMid: { unitId: "", height: 250, maxWidth: 336, size: "336x280" },
  // Desktop skyscraper (optional sidebar).
  sidebar: { unitId: "", height: 600, maxWidth: 300, size: "300x600" },
  // Shown inside the download interstitial.
  interstitial: { unitId: "", height: 250, maxWidth: 336, size: "336x280" },
} satisfies Record<string, AdPlacement>;

export type AdSlotKey = keyof typeof AD_SLOTS;

export function adSlot(key: AdSlotKey): AdPlacement {
  return AD_SLOTS[key];
}
