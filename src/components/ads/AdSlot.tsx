"use client";

import { useEffect, useRef, useState } from "react";
import {
  AD_SLOTS,
  ADS_ENABLED,
  SHOW_AD_PLACEHOLDERS,
  type AdSlotKey,
} from "@/lib/ads";

// A single ad placement. It reserves its height up front (no layout shift),
// labels itself "Advertisement", and only injects the A-ADS iframe once it
// scrolls near the viewport (lazy loading).
export default function AdSlot({
  slot,
  className = "",
}: {
  slot: AdSlotKey;
  className?: string;
}) {
  const cfg = AD_SLOTS[slot];
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  if (!ADS_ENABLED) return null;

  const hasUnit = cfg.unitId.trim().length > 0;
  if (!hasUnit && !SHOW_AD_PLACEHOLDERS) return null;

  return (
    <div className={`w-full ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        Advertisement
      </p>
      <div
        ref={ref}
        className="mx-auto overflow-hidden rounded-xl border border-black/5 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900/40"
        style={{
          height: cfg.height,
          maxWidth: cfg.maxWidth,
          width: "100%",
        }}
      >
        {inView && hasUnit ? (
          <iframe
            title="Advertisement"
            data-aa={cfg.unitId}
            src={`//acceptable.a-ads.com/${cfg.unitId}`}
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
            {hasUnit ? "" : "Ad space"}
          </div>
        )}
      </div>
    </div>
  );
}
