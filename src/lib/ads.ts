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

// Heights allow for the tallest standard creative the network may serve into
// each slot, not just the nominal size. An iframe clips its own contents no
// matter what the page around it does, so a 320x100 mobile banner in a 90px
// frame loses ten pixels and the network reports the unit as partly hidden and
// stops paying into it. The extra height costs nothing when a shorter banner
// is served, because the frame is what reserves the space either way.
export const AD_SLOTS = {
  // Leaderboards: 728x90 on desktop, 320x100 on a phone.
  homeTop: { unitId: "", height: 100, maxWidth: 728, size: "728x90" },
  homeBottom: { unitId: "", height: 100, maxWidth: 728, size: "728x90" },
  toolTop: { unitId: "", height: 100, maxWidth: 728, size: "728x90" },
  toolBottom: { unitId: "", height: 100, maxWidth: 728, size: "728x90" },
  // Rectangles: 336x280 is the tallest of the common pair with 300x250.
  homeMid: { unitId: "", height: 280, maxWidth: 336, size: "336x280" },
  toolMid: { unitId: "", height: 280, maxWidth: 336, size: "336x280" },
  // Desktop skyscraper in the right margin.
  sidebar: { unitId: "", height: 600, maxWidth: 300, size: "300x600" },
  // Shown inside the download interstitial.
  interstitial: { unitId: "", height: 280, maxWidth: 336, size: "336x280" },
} satisfies Record<string, AdPlacement>;

export type AdSlotKey = keyof typeof AD_SLOTS;

export function adSlot(key: AdSlotKey): AdPlacement {
  return AD_SLOTS[key];
}
