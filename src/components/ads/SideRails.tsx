"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ADS_ENABLED, AD_SLOTS } from "@/lib/ads";
import { useAdConfig } from "@/components/ads/AdProvider";

// The two 160x600 skyscrapers beside the page.
//
// The site is 1024px of content in the middle of the screen. On a wide
// monitor that leaves a few hundred pixels of empty margin down each side
// doing nothing at all, and these fill it. They cover no text, so unlike the
// phone bar they need no close button, and they follow the visitor down the
// page instead of scrolling away after the first screen.
//
// Below 1440px they are not rendered: 1024 of content plus two 160s plus a
// gap each side is 1392, and a rail that overlaps the page is worse than no
// rail. A 1366px laptop therefore sees none of this, which is deliberate.
const MIN_WIDTH = 1440;
// A 600px banner plus its label needs the window to be tall enough to hold it.
// An iframe clips whatever does not fit, and a banner the network sees as part
// hidden is one it stops serving into, so a short window gets no rail rather
// than half a rail.
const MIN_HEIGHT = 700;
const SIZE = "160x600";
const RAILS = ["railLeft", "railRight"] as const;

export default function SideRails() {
  const { adsterraSizes } = useAdConfig();
  const pathname = usePathname();
  const [wide, setWide] = useState(false);

  // Measured once after mount, with no resize listener on purpose. Taking the
  // rails away and putting them back as a window is dragged would fetch a new
  // banner each time, which bills an advertiser for views nobody looked at.
  // The page is prerendered, so this cannot be decided on the server either:
  // one HTML file is served to every screen.
  useEffect(() => {
    const check = () =>
      setWide(window.innerWidth >= MIN_WIDTH && window.innerHeight >= MIN_HEIGHT);
    const first = window.setTimeout(check, 0);
    return () => window.clearTimeout(first);
  }, []);

  if (!ADS_ENABLED) return null;
  if (pathname.startsWith("/admin")) return null;
  if (!adsterraSizes.includes(SIZE)) return null;
  if (!wide) return null;

  return (
    <>
      {RAILS.map((slot) => (
        <div
          key={slot}
          className={`fixed top-1/2 z-30 -translate-y-1/2 ${
            slot === "railLeft" ? "left-6" : "right-6"
          }`}
        >
          <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            Advertisement
          </p>
          <iframe
            title="Advertisement"
            src={`/ads/frame?slot=${slot}&size=${SIZE}`}
            // The same sealed frame as every other banner: no allow-same-origin,
            // so the ad script gets an origin of its own and can reach neither
            // the admin API nor anything this site keeps in storage.
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-forms"
            scrolling="no"
            style={{
              border: 0,
              display: "block",
              width: AD_SLOTS[slot].maxWidth,
              height: AD_SLOTS[slot].height,
            }}
          />
        </div>
      ))}
    </>
  );
}
