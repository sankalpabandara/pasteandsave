"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_MARKER_COOKIE, ADS_ENABLED } from "@/lib/ads";
import { useAdConfig } from "@/components/ads/AdProvider";

// The Adsterra Social Bar: small notice style ads that float at the edge of the
// screen. Unlike the banners it cannot live in a sealed frame, because it
// places itself over the page, so its script runs in the page.
//
// That has three consequences, each handled here or in proxy.ts:
// - It waits until the page has loaded and gone quiet, so it never competes
//   with the paste box or slows the first paint.
// - It never loads in the admin area, nor for anyone signed in as admin: a
//   script in the page could call the admin API with the session cookie.
// - The page policy allows eval on public pages while a Social Bar code is
//   saved, because Adsterra's scripts need it (proxy.ts).
//
// Loaded once per visit to the site: moving between pages keeps the one that
// is running instead of stacking another.
export default function SocialBar() {
  const { socialBar } = useAdConfig();
  const pathname = usePathname();

  useEffect(() => {
    if (!ADS_ENABLED || !socialBar) return;
    if (pathname.startsWith("/admin")) return;
    if (document.cookie.split("; ").includes(`${ADMIN_MARKER_COOKIE}=1`)) return;
    if (document.querySelector("script[data-social-bar]")) return;

    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const load = () => {
      if (cancelled || document.querySelector("script[data-social-bar]")) return;
      const script = document.createElement("script");
      script.src = socialBar;
      script.async = true;
      script.dataset.socialBar = "1";
      script.setAttribute("data-cfasync", "false");
      document.body.appendChild(script);
    };
    const start = () => {
      // Safari before 18 has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(load, { timeout: 4000 });
      else timer = window.setTimeout(load, 2000);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, [socialBar, pathname]);

  return null;
}
