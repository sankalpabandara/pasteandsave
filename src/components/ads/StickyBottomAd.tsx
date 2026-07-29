"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";

// A short banner pinned to the bottom of a phone screen.
//
// Deliberately mounted rather than hidden with CSS on desktop: a display:none
// iframe is still a loaded ad nobody can see, and the network reports exactly
// that as a hidden unit and stops serving into it. Wide screens get no element
// at all, and they already have the sidebar rail instead.
const PHONE = "(max-width: 767px)";

export default function StickyBottomAd() {
  const pathname = usePathname();
  const [isPhone, setIsPhone] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // The admin panel is a working tool, not a page to monetise.
  if (pathname?.startsWith("/admin")) return null;
  // False until the effect runs, so the server and first client render agree.
  if (!isPhone || closed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Hide advert"
        className="absolute -top-6 right-2 rounded-t-md bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      >
        Hide
      </button>
      <AdSlot slot="mobileSticky" />
    </div>
  );
}
