// Central ad configuration: where each banner goes and which size it asks for.
//
// The banners come from Adsterra, one code per banner size. The codes are not
// in this file: they live in data/site-settings.json on the server and are
// changed with `node ops/set-adsterra.mjs`, which also updates the content
// policy the browser enforces. A slot whose size has no code renders nothing,
// so the site works fully before any code exists.
//
// A-ADS used to fill these slots, and later only stood in when Adsterra was
// slow. It paid too little to keep, so it is gone (2026-11-25).

export const ADS_ENABLED = true;

// Show labelled placeholder boxes for unconfigured slots during development so
// placements are visible while building. Never shown in production.
export const SHOW_AD_PLACEHOLDERS = process.env.NODE_ENV !== "production";

/**
 * The Adsterra banner sizes this site creates units for. Fixed here rather
 * than taken from a request: the frame route turns one of these into a script
 * tag, so the set it will accept is written down in the code.
 */
export const ADSTERRA_SIZES = ["728x90", "300x250", "320x50"] as const;
export type AdsterraSize = (typeof ADSTERRA_SIZES)[number];

export function isAdsterraSize(value: string): value is AdsterraSize {
  return (ADSTERRA_SIZES as readonly string[]).includes(value);
}

/** Pixel dimensions for a size, for the atOptions the embed needs. */
export function adsterraDimensions(size: AdsterraSize): { width: number; height: number } {
  const [width, height] = size.split("x").map(Number);
  return { width, height };
}

export type AdPlacement = {
  /** Reserved height in px, prevents layout shift while the ad loads. */
  height: number;
  /** Max width in px (banner shape). Full width up to this on smaller screens. */
  maxWidth: number;
  /**
   * Adsterra banner size for this slot on a normal screen, as Adsterra spells
   * it. Looked up in the adsterra table in the settings file, so a slot only
   * carries a banner once a code of that size exists.
   */
  banner: AdsterraSize;
  /**
   * Adsterra banner size below 768px. A 728x90 leaderboard has no mobile
   * demand at all: the slot stays empty on a phone, which is most of this
   * site's traffic, so the wide slots ask for a 320x50 there instead.
   */
  bannerMobile?: AdsterraSize;
};

// Heights allow for the tallest standard creative the network may serve into
// each slot, not just the nominal size. An iframe clips its own contents no
// matter what the page around it does, so a 320x100 mobile banner in a 90px
// frame loses ten pixels and the network reports the unit as partly hidden and
// stops paying into it. The extra height costs nothing when a shorter banner
// is served, because the frame is what reserves the space either way.
export const AD_SLOTS = {
  // Leaderboards: 728x90 on desktop, 320x50 on a phone.
  homeTop: { height: 100, maxWidth: 728, banner: "728x90", bannerMobile: "320x50" },
  homeBottom: { height: 100, maxWidth: 728, banner: "728x90", bannerMobile: "320x50" },
  toolTop: { height: 100, maxWidth: 728, banner: "728x90", bannerMobile: "320x50" },
  toolBottom: { height: 100, maxWidth: 728, banner: "728x90", bannerMobile: "320x50" },
  // Rectangles. The box keeps the 280px it reserved for the old 336x280 units,
  // so the page does not move; a 300x250 fits a phone as it is.
  homeMid: { height: 280, maxWidth: 336, banner: "300x250" },
  toolMid: { height: 280, maxWidth: 336, banner: "300x250" },

  // The extension page is a real page with real content and had nothing on it.
  extensionTop: { height: 100, maxWidth: 728, banner: "728x90", bannerMobile: "320x50" },
  extensionBottom: { height: 280, maxWidth: 336, banner: "300x250" },

} satisfies Record<string, AdPlacement>;

export type AdSlotKey = keyof typeof AD_SLOTS;

export function adSlot(key: AdSlotKey): AdPlacement {
  return AD_SLOTS[key];
}
