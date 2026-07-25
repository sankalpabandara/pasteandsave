"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SIDEBAR_ADS_ENABLED } from "@/lib/ads";
import AdSlot from "@/components/ads/AdSlot";

// The page content is capped at 1024px, so a wide screen leaves a deep empty
// margin either side. This puts a skyscraper there without touching the
// centred layout: 160px of rail clears the content comfortably from 1536px up,
// and there is room for the full 300px unit past 1700px.
const WIDE_ENOUGH = "(min-width: 1536px)";
const ROOM_FOR_FULL_WIDTH = "(min-width: 1700px)";

// Deliberately mounted rather than hidden with CSS. A display:none iframe is
// still a loaded ad the visitor cannot see, and the ad network reports exactly
// that as "partly or fully hidden" and stops serving into the unit. Narrow
// screens get no sidebar element at all instead.
function useMatches(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export default function SidebarAd() {
  const pathname = usePathname();
  const wideEnough = useMatches(WIDE_ENOUGH);
  const roomForFull = useMatches(ROOM_FOR_FULL_WIDTH);

  if (!SIDEBAR_ADS_ENABLED) return null;
  // The admin panel is a working tool, not a page to monetise.
  if (pathname?.startsWith("/admin")) return null;
  // False until the effect runs, so the server and the first client render
  // agree on rendering nothing.
  if (!wideEnough) return null;

  return (
    <aside
      aria-label="Advertisement"
      className="fixed right-4 top-1/2 z-30 -translate-y-1/2"
      style={{ width: roomForFull ? 300 : 160 }}
    >
      <AdSlot slot="sidebar" />
    </aside>
  );
}
