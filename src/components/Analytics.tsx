"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// A build-time id still works, but it is only a fallback now. The id is read
// at runtime so it can be set from the admin panel: NEXT_PUBLIC_ values are
// inlined during the build, which meant switching analytics on required a
// server file edit and a rebuild.
const BUILD_GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

let gtagLoaded = false;

function loadGtag(gaId: string) {
  if (gtagLoaded || typeof window === "undefined") return;
  gtagLoaded = true;

  const w = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer!.push(args);
  };
  w.gtag("js", new Date());
  // Page views are sent from the effect below so single-page navigations count.
  w.gtag("config", gaId, { send_page_view: false });

  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  s.async = true;
  document.head.appendChild(s);
}

export default function Analytics() {
  const pathname = usePathname();
  const gaRef = useRef(BUILD_GA_ID);
  const last = useRef<string | null>(null);

  // Loads gtag straight from the effect rather than routing the id through
  // state and a second effect. The extra hop bought nothing and gave the
  // injection more ways to not happen.
  useEffect(() => {
    if (BUILD_GA_ID) {
      loadGtag(BUILD_GA_ID);
      return;
    }
    fetch("/api/ads")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const id = typeof data?.gaId === "string" ? data.gaId.trim() : "";
        if (!id) return;
        gaRef.current = id;
        loadGtag(id);
        // The landing pageview happens before the id arrives, so it is sent
        // here rather than lost.
        const w = window as unknown as { gtag?: (...a: unknown[]) => void };
        w.gtag?.("event", "page_view", { page_path: window.location.pathname });
      })
      .catch(() => {
        // Analytics is never worth breaking a page over.
      });
  }, []);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    const isLanding = last.current === null;
    last.current = pathname;

    // Don't track the admin area.
    if (pathname.startsWith("/admin")) return;

    // Referrer is only useful on the landing pageview; after an internal
    // navigation it would just be our own host.
    const ref = isLanding && document.referrer ? document.referrer : "";

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, ref }),
      keepalive: true,
    }).catch(() => {});

    if (gaRef.current && typeof window !== "undefined") {
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      w.gtag?.("event", "page_view", { page_path: pathname });
    }
  }, [pathname]);

  return null;
}
