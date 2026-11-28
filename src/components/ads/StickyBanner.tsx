"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ADS_ENABLED, AD_SLOTS } from "@/lib/ads";
import { useAdConfig } from "@/components/ads/AdProvider";

// A 320x50 banner anchored to the bottom edge of a phone screen.
//
// Every other banner is seen only if the visitor happens to scroll to the part
// of the page it sits in. This one follows them, which on a site where most
// visits are a phone, a paste and a download is the difference between a
// banner being seen and a banner being paid for.
//
// It is the one ad placed over the page's own content, so it is kept honest:
// it waits until the visitor has scrolled, it has a real close button, closing
// it lasts for the rest of the visit, and a spacer the same height sits at the
// end of the page so it never hides the footer.
const SLOT = "stickyBottom";
const SIZE = "320x50";
const BAR_HEIGHT = AD_SLOTS[SLOT].height + 10;
const SHOW_AFTER_PX = 320;
const CLOSED_KEY = "pas-sticky-closed";

export default function StickyBanner() {
  const { adsterraSizes } = useAdConfig();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  // A ref, not state: the scroll listener has to see the close immediately,
  // and a closed bar must not come back on the next scroll.
  const dismissed = useRef(false);
  // The bar covers part of the page, so an unfilled one is the worst of the
  // empty boxes. The frame says when it drew nothing and the bar goes.
  const frame = useRef<HTMLIFrameElement>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: unknown } | null;
      if (data && data.type === "pas-ad-empty") setEmpty(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    // Closing it is remembered for the rest of the visit, not for ever: the
    // next visit is a new chance to earn, and sessionStorage forgets by itself
    // when the tab goes. Read here rather than at first render, because the
    // page is prerendered on a server that has no storage to read.
    try {
      dismissed.current = window.sessionStorage.getItem(CLOSED_KEY) === "1";
    } catch {
      dismissed.current = false;
    }
    if (dismissed.current) return;

    // Phones only. A 320x50 on a desktop is a small ad in a wide empty bar,
    // and the leaderboards already cover that screen.
    const phone = window.matchMedia("(max-width: 767px)");
    const check = () => {
      if (dismissed.current) return;
      setVisible(phone.matches && window.scrollY > SHOW_AFTER_PX);
    };
    // Through a timer so the first check is a callback like the others, and
    // the bar is never part of the first paint.
    const first = window.setTimeout(check, 0);
    window.addEventListener("scroll", check, { passive: true });
    phone.addEventListener("change", check);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("scroll", check);
      phone.removeEventListener("change", check);
    };
  }, []);

  function close() {
    dismissed.current = true;
    setVisible(false);
    try {
      window.sessionStorage.setItem(CLOSED_KEY, "1");
    } catch {
      // A browser with storage switched off still gets the close.
    }
  }

  if (!ADS_ENABLED) return null;
  if (pathname.startsWith("/admin")) return null;
  if (!adsterraSizes.includes(SIZE)) return null;
  if (empty) return null;
  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-1 border-t border-black/10 bg-white px-1 py-1 md:hidden dark:border-white/10 dark:bg-neutral-950"
        style={{ height: BAR_HEIGHT }}
      >
        <iframe
          ref={frame}
          title="Advertisement"
          src={`/ads/frame?slot=${SLOT}&size=${SIZE}`}
          // Same sealed frame as every other banner: served from this site, so
          // without the sandbox the ad script would run with the site's own
          // origin and could reach the admin API and local storage. Left out,
          // it gets an origin of its own. See AdSlot for the long version.
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-forms"
          scrolling="no"
          style={{ border: 0, display: "block", width: 320, height: AD_SLOTS[SLOT].height }}
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close advertisement"
          className="shrink-0 px-2 py-2 text-lg leading-none text-neutral-400 dark:text-neutral-500"
        >
          &times;
        </button>
      </div>
      {/* So the bar never covers the last of the page. */}
      <div aria-hidden className="md:hidden" style={{ height: BAR_HEIGHT }} />
    </>
  );
}
