// Central ad configuration: where each ad goes and which size it asks for.
//
// The ads come from Adsterra: banners (one code per size), a Native Banner and
// a Social Bar. The codes are not in this file: they live in
// data/site-settings.json on the server, set from the admin panel or with
// `node ops/set-adsterra.mjs`. The content policy picks up the hosts of those
// codes by itself (src/lib/ad-policy.ts). A place whose code is missing
// renders nothing, so the site works fully before any code exists.
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
export const ADSTERRA_SIZES = ["728x90", "300x250", "320x50", "160x600"] as const;
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

  // The wait while the server makes the file. A visitor who pressed Save has
  // asked for something that takes up to a minute and a half, and they stay on
  // the page for all of it, because leaving cancels their download. It is the
  // most attentive minute this site gets, and it used to carry nothing.
  downloadWait: { height: 280, maxWidth: 336, banner: "300x250" },

  // Anchored to the bottom edge of the screen on phones. Not a page position
  // like the others: it follows the visitor down the page, so it is seen on
  // every screen rather than on the one it happens to sit in.
  stickyBottom: { height: 50, maxWidth: 320, banner: "320x50" },

  // The two skyscrapers beside the page on a wide screen. The page itself is
  // 1024px of content in the middle, so on anything from 1440px up there is
  // empty margin on both sides doing nothing. These sit in it: they cover no
  // text, need no close button, and follow the visitor down like the phone
  // bar does. Below 1440px they are not rendered at all.
  railLeft: { height: 600, maxWidth: 160, banner: "160x600" },
  railRight: { height: 600, maxWidth: 160, banner: "160x600" },

} satisfies Record<string, AdPlacement>;

export type AdSlotKey = keyof typeof AD_SLOTS;

export function adSlot(key: AdSlotKey): AdPlacement {
  return AD_SLOTS[key];
}

/**
 * Places for the Adsterra Native Banner: a row of small ads with a picture and
 * a headline each, which reads as part of the page rather than a banner. One
 * code serves every place, and each place gets its own framed document, so
 * two of them never fight over the same container on one page.
 *
 * `height` is what the box reserves before the ads arrive. The frame reports
 * its real height once drawn and the box follows, because the widget is a grid
 * whose height depends on the screen width and on the layout chosen in
 * Adsterra. Every place sits below the first screen, so that late change is
 * not something a visitor watches happen.
 */
export const NATIVE_SLOTS = {
  homeNative: { height: 320, label: "Home: above the questions" },
  toolNative: { height: 320, label: "Tool pages: after the questions" },
  blogNative: { height: 320, label: "Blog posts: after the questions" },
  waitNative: { height: 320, label: "While a file is being prepared" },
} as const;

export type NativeSlotKey = keyof typeof NATIVE_SLOTS;

export function isNativeSlot(value: string): value is NativeSlotKey {
  return Object.prototype.hasOwnProperty.call(NATIVE_SLOTS, value);
}

/**
 * Cookie set next to the admin session, readable by page scripts. The Social
 * Bar runs in the page itself, not in a sealed frame, so it could use the admin
 * session cookie to call the admin API. Pages skip the Social Bar for anyone
 * carrying this marker. It proves nothing on its own; the session cookie stays
 * the only thing the server trusts.
 */
export const ADMIN_MARKER_COOKIE = "pas_admin";
