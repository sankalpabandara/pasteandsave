"use client";

import {
  AD_SLOTS,
  ADS_ENABLED,
  SHOW_AD_PLACEHOLDERS,
  type AdSlotKey,
} from "@/lib/ads";
// Imported through the same alias the layout uses. A relative path here can
// resolve to a second copy of the module, which means a second React context
// and a provider whose value never reaches this component.
import { useAdUnits } from "@/components/ads/AdProvider";

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
}: {
  slot: AdSlotKey;
  className?: string;
}) {
  const cfg = AD_SLOTS[slot];
  const units = useAdUnits();

  // Configured in the admin panel; the compiled value is only a fallback.
  const unitId = (units[slot] ?? cfg.unitId ?? "").trim();
  const hasUnit = unitId.length > 0;

  if (!ADS_ENABLED) return null;
  if (!hasUnit && !SHOW_AD_PLACEHOLDERS) return null;

  return (
    <div className={`w-full ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        Advertisement
      </p>
      <div
        className="mx-auto overflow-hidden rounded-xl border border-black/5 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900/40"
        style={{
          height: cfg.height,
          maxWidth: cfg.maxWidth,
          width: "100%",
        }}
      >
        {hasUnit ? (
          <iframe
            key={unitId}
            title="Advertisement"
            data-aa={unitId}
            src={`https://acceptable.a-ads.com/${unitId}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              border: 0,
              width: "100%",
              height: "100%",
              overflow: "hidden",
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
