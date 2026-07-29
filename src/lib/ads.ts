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
  /**
   * Slot to borrow a unit id from when this one has none of its own.
   *
   * A unit only earns once the network's crawler has found it on the page it
   * is assigned to, and a placement it cannot reach — one inside a popup, or
   * one that only exists on a phone-width layout — can never pass that check.
   * The network's own guidance says the same code may be reused anywhere on
   * the same domain, so these borrow an id that is already verified instead
   * of sitting empty waiting for a check that will not come.
   *
   * Typed as a plain string rather than AdSlotKey: the key type is derived
   * from the slot table below, so referring to it here makes the table's own
   * type circular and collapses every slot to `any`.
   */
  shareWith?: string;
  /**
   * Never put an A-ADS unit here; render only if another network's code is
   * configured for the slot.
   *
   * A-ADS allows at most three units on a page and does not serve popups or
   * popunders at all. A banner in a popup, or one covered by anything, is
   * reported back as "partly or fully hidden" and stops earning — which is
   * worse than not placing it, because the same fault is attached to the unit
   * id wherever else it appears. Their support raised exactly this against
   * this site.
   *
   * The placements stay defined so a network that does allow them can be
   * dropped in from the admin panel without touching code.
   */
  noAads?: boolean;
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
  // Desktop skyscraper in the right margin. Mounted only on wide screens, so
  // the crawler never sees it — it borrows a verified id.
  sidebar: { unitId: "", height: 600, maxWidth: 300, size: "300x600", shareWith: "homeMid", noAads: true  },
  // Shown inside the download interstitial.
  interstitial: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },

  // --- phone layouts -------------------------------------------------------
  // Most of this site's traffic is a phone, and the layout above is built
  // around desktop banner shapes. These are the positions that only exist on
  // a narrow screen, so none of them can be crawled and all of them borrow.
  //
  // Directly under the paste box: the first thing seen after the one action
  // everybody comes here to do.
  mobileUnderBox: { unitId: "", height: 100, maxWidth: 336, size: "320x100", shareWith: "homeTop", noAads: true  },
  // Beside the quality buttons, while the visitor is deciding which to press.
  mobileResults: { unitId: "", height: 250, maxWidth: 300, size: "300x250", shareWith: "homeMid", noAads: true  },
  // Pinned to the bottom of the screen. Kept deliberately short so it takes a
  // strip rather than a third of a phone screen.
  mobileSticky: { unitId: "", height: 50, maxWidth: 320, size: "320x50", shareWith: "homeBottom", noAads: true  },
  // Shown on the first click of a session, then not again.
  clickPopup: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },

  // Further down the page, between the explanatory blocks. These are in the
  // server-rendered markup like the rest of the page, so they can be verified
  // on their own; the borrow is only a fallback until an id is set.
  homeSection2: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },
  homeSection3: { unitId: "", height: 100, maxWidth: 728, size: "728x90", shareWith: "homeTop", noAads: true  },
  homeSection4: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },
  homeSection5: { unitId: "", height: 100, maxWidth: 728, size: "728x90", shareWith: "homeTop", noAads: true  },

  // The platform pages take most of the search traffic and carried the fewest
  // banners, which is the wrong way round. These are in the page markup like
  // the rest, so each can be verified and earn on its own id.
  toolSection2: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "toolMid", noAads: true  },
  toolSection3: { unitId: "", height: 100, maxWidth: 728, size: "728x90", shareWith: "toolTop", noAads: true  },
  toolSection4: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "toolMid", noAads: true  },

  // The extension page is a real page with real content and had nothing on it.
  extensionTop: { unitId: "", height: 100, maxWidth: 728, size: "728x90", shareWith: "homeTop" },
  extensionBottom: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid" },

  // The extension is given away, and the download is the one moment on this
  // site where somebody is willing to wait. Two placements sit in that flow:
  // one while the file is being prepared, one on the install instructions
  // afterwards, which people actually read.
  extensionGate: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },
  extensionThanks: { unitId: "", height: 280, maxWidth: 336, size: "336x280", shareWith: "homeMid", noAads: true  },
} satisfies Record<string, AdPlacement>;

export type AdSlotKey = keyof typeof AD_SLOTS;

export function adSlot(key: AdSlotKey): AdPlacement {
  return AD_SLOTS[key];
}
