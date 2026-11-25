import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adPolicy } from "@/lib/ad-policy";

// Issues a fresh nonce per request and builds the Content-Security-Policy
// around it, so script-src no longer needs 'unsafe-inline'.
//
// 'unsafe-inline' tells the browser to run any inline script it finds, which
// is exactly what an injected one would be. A nonce inverts that: only scripts
// carrying this request's random value run, and an attacker cannot guess a
// value that is generated after their payload was written.
//
// Next adds the nonce to its own hydration scripts when it sees one in the
// policy. Ours are passed it explicitly through the header read in the layout.
//
// The policy lives here rather than in next.config because a nonce has to
// change per request and the config headers are fixed at build time.
//
// This file is proxy.ts, not middleware.ts: Next 16 renamed the convention and
// warns on the old name. Same behaviour, current spelling.

const AD_DOMAINS = (process.env.AD_NETWORK_DOMAINS || "")
  .split(/[\s,]+/)
  .map((d) => d.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const path = request.nextUrl.pathname;

  // The hosts in AD_NETWORK_DOMAINS, plus the host of every Adsterra code
  // saved in the admin panel, so a code with a new domain is not blocked.
  const ads = adPolicy();
  const adList = [...new Set([...AD_DOMAINS, ...ads.hosts])];
  const adHosts = adList.length > 0 ? " " + adList.join(" ") : "";

  // The Social Bar is the one ad that runs in the page itself rather than in a
  // sealed frame, and Adsterra's scripts evaluate strings. So public pages
  // allow eval while a Social Bar code is saved. The admin area and the API
  // never do, and the Social Bar never loads there.
  const publicPage = !path.startsWith("/admin") && !path.startsWith("/api");
  const pageEval = ads.socialBar && publicPage;

  // React's development build uses eval to rebuild stack traces across the
  // server/client boundary, and refuses to start without it. Production never
  // does, so this is the one relaxation and it never ships.
  const devEval = isDev ? " 'unsafe-eval'" : "";

  // The little document that holds one ad banner, and nothing else.
  //
  // Ad networks build their banner by evaluating strings, so their script
  // dies on this policy with an EvalError and the slot stays empty. Allowing
  // eval across the site would give up most of what the policy is for, so for
  // banners it is allowed only in here, where there is no site code and no site data to
  // reach: the page frames this sandboxed, without allow-same-origin, so the
  // document runs in an origin of its own with no cookies, no storage and no
  // credentialed path to the admin API.
  const isAdFrame = path === "/ads/frame";
  const adEval = isAdFrame || pageEval ? " 'unsafe-eval'" : "";

  const csp = [
    "default-src 'self'",
    // strict-dynamic lets a script this nonce vouched for load the chunks it
    // needs, without naming every generated filename. Older browsers ignore
    // it and fall back to the host list, which is why 'self' stays.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${adHosts}${adEval}${devEval}`,
    // Styles stay permissive. Tailwind and the theme both set style
    // attributes, and an injected stylesheet cannot execute anything.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com" +
      adHosts,
    // Banners and native ads live in /ads/frame ('self'); the network frames
    // inside them come from the ad hosts above. A-ADS was dropped on 2026-11-25.
    "frame-src 'self'" + adHosts,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // 'self', not 'none': each ad is rendered in a small same-origin document
    // framed by the page it belongs to, so 'none' blocked the site's own
    // banners. Another site still cannot frame anything here.
    "frame-ancestors 'self'",
  ].join("; ");

  // Passed on the request so the layout can read it and hand it to our own
  // inline scripts, and set on the response for the browser to enforce.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Static assets and image requests carry no inline scripts and are served
  // in far greater numbers, so they skip this entirely.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|zip|txt|xml)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
