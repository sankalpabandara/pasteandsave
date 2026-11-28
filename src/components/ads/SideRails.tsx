"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  // The card sells the extension, so it never appears on the extension page.
  const onExtensionPage = pathname.startsWith("/extension");
  const [wide, setWide] = useState(false);
  // A rail the network never filled. These sit in the margin at a fixed size
  // and are not offered a stand in, so when the banner does not arrive there
  // is nothing to show, and a column of empty grey with the word
  // Advertisement on it is worse than clean margin.
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const [emptyRails, setEmptyRails] = useState<string[]>([]);

  useEffect(() => {
    // The frames have no origin to check, so a message counts only when it
    // came from one of these two windows.
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown } | null;
      if (!data || data.type !== "pas-ad-empty") return;
      for (const [slot, el] of Object.entries(frames.current)) {
        if (!el || event.source !== el.contentWindow) continue;
        setEmptyRails((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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

  // One empty rail carries a word about the extension instead of nothing.
  //
  // The network fills a banner here about one time in fifty, so without this
  // the margin is simply blank most of the time. The extension earns nothing
  // directly, but it is the thing that brings a visitor back without a search
  // engine in between, which is worth more here than a banner that does not
  // arrive. Only one rail, because the same card twice reads as a page
  // selling itself, and never on the page it is selling.
  const promoRail = onExtensionPage
    ? null
    : emptyRails.includes("railRight")
      ? "railRight"
      : emptyRails.includes("railLeft")
        ? "railLeft"
        : null;

  return (
    <>
      {promoRail && (
        <div
          className={`fixed top-1/2 z-30 -translate-y-1/2 ${
            promoRail === "railLeft" ? "left-6" : "right-6"
          }`}
        >
          {/* No "Advertisement" label on this one. It is not an ad, it is
              this site talking about itself, and labelling it as an ad would
              be a lie to the visitor and to the network. */}
          <div
            className="flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 text-center dark:border-white/10 dark:bg-neutral-950"
            style={{ width: AD_SLOTS.railLeft.maxWidth, height: AD_SLOTS.railLeft.height }}
          >
            <div>
              <p className="font-display text-base font-bold leading-tight text-neutral-900 dark:text-white">
                Save without copying links
              </p>
              <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                The free extension puts a save button on the videos you already
                watch. It works in Chrome, Edge and Firefox, and installs from
                this site.
              </p>
            </div>
            <Link
              href="/extension"
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Get the extension
            </Link>
          </div>
        </div>
      )}
      {RAILS.filter((slot) => !emptyRails.includes(slot)).map((slot) => (
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
            ref={(el) => {
              frames.current[slot] = el;
            }}
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
