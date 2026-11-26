"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_MARKER_COOKIE, ADS_ENABLED } from "@/lib/ads";
import { useAdConfig } from "@/components/ads/AdProvider";

// The Adsterra formats that run in the page itself: the Social Bar's floating
// notices, the Interstitial's full screen panel, the In-Page Push cards, and
// the Popunder's background tab. None of them can sit in a sealed frame the
// way the banners do, because each one puts itself over or around the whole
// page.
//
// That has consequences, each handled here or in proxy.ts:
// - They wait until the page has loaded and gone quiet, so they never compete
//   with the paste box or slow the first paint.
// - None loads in the admin area, nor for anyone signed in as admin: a script
//   in the page could call the admin API with the session cookie.
// - The page policy allows eval on public pages while any of these codes is
//   saved, because Adsterra's scripts need it (proxy.ts).
//
// Each is loaded once per visit to the site: moving between pages keeps the
// one that is running instead of stacking another.
function useLoadScripts(scripts: [string, string][], when: boolean) {
  const pathname = usePathname();
  // The addresses decide when to run, not the array, which is rebuilt on every
  // render. Joined because a dependency has to be comparable.
  const key = scripts.map(([name, src]) => `${name}=${src}`).join("|");

  useEffect(() => {
    if (!ADS_ENABLED || !when) return;
    if (pathname.startsWith("/admin")) return;
    if (document.cookie.split("; ").includes(`${ADMIN_MARKER_COOKIE}=1`)) return;

    let cancelled = false;
    let idle = 0;
    let timer = 0;

    const load = () => {
      if (cancelled) return;
      for (const [name, src] of scripts) {
        if (!src) continue;
        if (document.querySelector(`script[data-ad-script="${name}"]`)) continue;
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.adScript = name;
        script.setAttribute("data-cfasync", "false");
        document.body.appendChild(script);
      }
    };
    const start = () => {
      // Safari before 18 has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(load, { timeout: 4000 });
      } else {
        timer = window.setTimeout(load, 2000);
      }
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, when, pathname]);
}

export default function PageScripts() {
  const { socialBar, interstitial, inPagePush, popunder, downloadArmed } = useAdConfig();

  // Switched on for anyone who opens the site.
  useLoadScripts(
    [
      ["social-bar", socialBar],
      ["interstitial", interstitial],
      ["in-page-push", inPagePush],
    ],
    true,
  );

  // The Popunder opens a tab in answer to a click, and a browser only allows
  // that on a real one. Loading it on arrival would spend it on the first
  // click a visitor makes, which is usually the paste box, and would spend it
  // on everyone who never downloads anything. It is loaded once a visitor has
  // a list of formats in front of them, so the click it answers is the one on
  // Save. How often one visitor sees it is Adsterra's own setting.
  useLoadScripts([["popunder", popunder]], downloadArmed);

  return null;
}
