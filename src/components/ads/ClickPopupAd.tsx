"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ADS_ENABLED } from "@/lib/ads";
import AdSlot from "@/components/ads/AdSlot";

// Shown once on the first click of a visit, then not again until the tab is
// closed. Kept to once per session on purpose: search ranking is demoted for
// mobile pages that put an interstitial in front of the content, and the
// organic traffic that costs is the same traffic the adverts are paid on. A
// popup that fires repeatedly would earn more per visitor and produce fewer
// visitors.
//
// Stored in sessionStorage rather than localStorage so a returning visitor
// tomorrow sees it once more, and in a way that a private window forgets.
const SEEN_KEY = "click-ad-seen-v1";

export default function ClickPopupAd() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    if (pathname?.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      // Private modes can throw on access; treat that as already seen rather
      // than showing the popup on every single click.
      return;
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Never hijack a real navigation or a form action. Someone pressing
      // Download wants the download, and interrupting the click they came
      // here to make is the fastest way to lose them.
      if (target?.closest("a,button,input,textarea,select,label")) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Not being able to remember is a reason to not show it again.
        return;
      }
      setOpen(true);
      window.removeEventListener("click", onClick);
    };

    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [pathname]);

  // Escape closes it, like any other dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Advertisement"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
            Advertisement
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close advert"
            className="-mr-1 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Close ✕
          </button>
        </div>
        <AdSlot slot="clickPopup" />
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Continue to the site
        </button>
      </div>
    </div>
  );
}
