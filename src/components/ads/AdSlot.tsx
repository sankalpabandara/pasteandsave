"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AD_SLOTS,
  ADS_ENABLED,
  SHOW_AD_PLACEHOLDERS,
  type AdPlacement,
  type AdSlotKey,
} from "@/lib/ads";
// Imported through the same alias the layout uses. A relative path here can
// resolve to a second copy of the module, which means a second React context
// and a provider whose value never reaches this component.
import { useAdConfig } from "@/components/ads/AdProvider";

// A single ad placement. It reserves its height up front so nothing shifts
// while the banner loads, and labels itself "Advertisement".
//
// Deferring the load is left to the iframe's own loading="lazy", which every
// current browser implements. This used to be gated behind an
// IntersectionObserver as well, and that gate was the thing stopping ads from
// appearing at all: the observer never reported the box as visible, so the
// container rendered with its reserved height and the iframe inside it was
// held back forever. Native lazy loading does the same job with nothing to go
// wrong.
export default function AdSlot({
  slot,
  className = "",
  label = "Advertisement",
}: {
  slot: AdSlotKey;
  className?: string;
  /** "Advertisement" in the page's language. */
  label?: string;
}) {
  // Typed as the shared shape: `satisfies` narrows each entry to its own
  // literal type, so optional fields are absent from slots that omit them.
  const cfg: AdPlacement = AD_SLOTS[slot];
  const { units, snippets, adsterraSizes } = useAdConfig();

  // Which Adsterra banner this slot should ask for, decided once after mount.
  //
  // It cannot be decided on the server, because the page is prerendered and
  // one HTML file is served to phones and desktops alike. It is deliberately
  // not updated on resize either: changing the size reloads the banner, and a
  // banner reloaded because someone turned their phone sideways is a second
  // impression for an advertiser who was only seen once.
  const [bannerSize, setBannerSize] = useState<string | null>(null);
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const wanted = narrow ? (cfg.bannerMobile ?? cfg.banner) : cfg.banner;
    setBannerSize(wanted ?? null);
  }, [cfg.banner, cfg.bannerMobile]);

  // Only once a unit of that size actually exists. A 728x90 leaderboard has
  // essentially no mobile demand, which is why the narrow screens ask for a
  // 320x50 instead of letting the wide one go unfilled.
  const adsterraSize =
    bannerSize && adsterraSizes.includes(bannerSize) ? bannerSize : null;

  // Configured in the admin panel; the compiled value is only a fallback.
  // A slot with nothing of its own borrows from the slot named in shareWith,
  // so a placement the crawler can never reach still carries an id that has
  // already been verified rather than rendering nothing at all.
  const shared = cfg.shareWith ? (units[cfg.shareWith] ?? "") : "";
  const unitId = (units[slot] || cfg.unitId || shared || "").trim();
  const hasUnit = unitId.length > 0;
  const snippet = (snippets[slot] ?? "").trim();

  // A network's embed usually includes a <script>. Assigning it through
  // innerHTML puts the tag in the document but the browser will not run it,
  // so each script is rebuilt as a fresh element. Without this a pasted embed
  // silently does nothing, which looks exactly like a network that is not
  // paying.
  const mountSnippet = useCallback(
    (host: HTMLDivElement | null) => {
      if (!host || !snippet) return;
      if (host.dataset.mounted === "1") return;
      host.dataset.mounted = "1";
      host.innerHTML = snippet;
      for (const old of Array.from(host.querySelectorAll("script"))) {
        const fresh = document.createElement("script");
        for (const attr of Array.from(old.attributes)) {
          fresh.setAttribute(attr.name, attr.value);
        }
        fresh.text = old.textContent ?? "";
        old.replaceWith(fresh);
      }
    },
    [snippet],
  );

  // Returning null takes the slot's own spacing with it. The padding used to
  // sit on a wrapper in the page, so a slot with nothing to show still left a
  // band of empty page behind it, several of them, once the placements that
  // A-ADS will not serve stopped rendering.
  // True as soon as the server-rendered config says a unit of this slot's
  // normal size exists, so the decision does not wait for the viewport check
  // and the box is never given to A-ADS and then taken away again.
  const usesAdsterra = Boolean(cfg.banner && adsterraSizes.includes(cfg.banner));

  if (!ADS_ENABLED) return null;
  if (!hasUnit && !snippet && !usesAdsterra && !SHOW_AD_PLACEHOLDERS) return null;

  return (
    <div className={`w-full ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        {label}
      </p>
      {/* minHeight rather than height, and nothing clipped: the box reserves
          space so the page does not jump, but a banner taller than the
          reserved size is allowed to push it open instead of being cut off.
          Clipping made the network report these units as partly hidden, which
          is a state it will not serve into. */}
      <div
        className="mx-auto rounded-xl border border-black/5 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900/40"
        style={{
          minHeight: cfg.height,
          maxWidth: cfg.maxWidth,
          width: "100%",
        }}
      >
        {snippet ? (
          // A network other than A-ADS is configured for this slot.
          <div ref={mountSnippet} style={{ width: "100%", height: "100%" }} />
        ) : usesAdsterra ? (
          // Rendered only once the viewport has been measured, so the banner
          // is requested at the right size the first time. Setting a src now
          // and correcting it afterwards would fetch two banners and show
          // one, which bills an advertiser for a view nobody got.
          adsterraSize ? (
            <iframe
              key={adsterraSize}
              title={label}
              src={`/ads/frame?slot=${encodeURIComponent(slot)}&size=${encodeURIComponent(adsterraSize)}`}
              scrolling="no"
              loading="lazy"
              style={{
                border: 0,
                display: "block",
                width: "100%",
                height: cfg.height,
                backgroundColor: "transparent",
              }}
            />
          ) : null
        ) : hasUnit ? (
          <iframe
            key={unitId}
            title={label}
            data-aa={unitId}
            // Kept in the network's documented shape, trailing slash and
            // size=Adaptive. Their verifier matches against the embed they
            // publish, so drifting from it is a way to fail a check for a
            // reason that never appears in any error message.
            src={`https://acceptable.a-ads.com/${unitId}/?size=Adaptive`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              border: 0,
              display: "block",
              width: "100%",
              height: cfg.height,
              backgroundColor: "transparent",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-300 dark:text-neutral-600">
            Ad space
          </div>
        )}
      </div>
    </div>
  );
}
