"use client";

import { useEffect, useRef, useState } from "react";
import { ADS_ENABLED, NATIVE_SLOTS, SHOW_AD_PLACEHOLDERS, type NativeSlotKey } from "@/lib/ads";
import { useAdConfig } from "@/components/ads/AdProvider";

// One place for the Adsterra Native Banner. The widget is drawn in the same
// kind of sealed frame as the banners (see AdSlot): its script gets no access
// to this site's cookies, storage or admin API.
//
// The widget is a grid whose height depends on the screen and on the layout
// chosen in Adsterra, so the frame reports its height once drawn and the box
// follows it, between a floor and a ceiling. The box stays white in dark mode
// too: the widget's text colours are set in Adsterra, not here, and dark text
// on the dark page would be unreadable.
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 1400;

export default function NativeSlot({
  slot,
  className = "",
  label = "Advertisement",
}: {
  slot: NativeSlotKey;
  className?: string;
  /** "Advertisement" in the page's language. */
  label?: string;
}) {
  const { native } = useAdConfig();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(NATIVE_SLOTS[slot].height);
  // Reported by the frame when the widget drew nothing at all.
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!native) return;
    // The frame has no origin of its own to check (it is sandboxed without
    // allow-same-origin), so the message is trusted only from this frame's own
    // window, and only as a number within range.
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: unknown; h?: unknown } | null;
      if (!data) return;
      if (data.type === "pas-ad-empty") {
        setEmpty(true);
        return;
      }
      if (data.type !== "pas-ad-height" || typeof data.h !== "number") return;
      setEmpty(false);
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(data.h))));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [native]);

  if (!ADS_ENABLED) return null;
  if (empty) return null;
  if (!native && !SHOW_AD_PLACEHOLDERS) return null;

  return (
    <div className={`w-full ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        {label}
      </p>
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-black/5 bg-white dark:border-white/10">
        {native ? (
          <iframe
            ref={frame}
            title={label}
            src={`/ads/frame?kind=native&slot=${encodeURIComponent(slot)}`}
            // Same sandbox as the banners: scripts to draw, and a click that
            // opens the advertiser in a new tab. No allow-same-origin.
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-forms"
            scrolling="no"
            loading="lazy"
            style={{ border: 0, display: "block", width: "100%", height, backgroundColor: "transparent" }}
          />
        ) : (
          <div
            className="flex items-center justify-center text-xs text-neutral-300"
            style={{ height: NATIVE_SLOTS[slot].height }}
          >
            Native ad space
          </div>
        )}
      </div>
    </div>
  );
}
