"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Sends a first-party pageview to /api/track and, if a GA id is set, a GA4
// page_view. Fires on every path change so single-page navigations count too.
function useTracking() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

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

    if (GA_ID && typeof window !== "undefined") {
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
      };
      w.gtag?.("event", "page_view", { page_path: pathname });
    }
  }, [pathname]);
}

export default function Analytics() {
  useTracking();

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
