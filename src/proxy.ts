import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextURL } from "next/dist/server/web/next-url";
import { adPolicy } from "@/lib/ad-policy";
import { countryOf } from "@/lib/geoip";
import { clientIp } from "@/lib/rate-limit";
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isBot,
  isLocale,
  isTranslatedPath,
  localePath,
  pickLocale,
  splitLocalePath,
  type Locale,
} from "@/lib/i18n";

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

const YEAR_SECONDS = 365 * 24 * 60 * 60;

/** A page load typed or clicked by a person, as opposed to the router fetching data for one. */
function isPageLoad(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.get("rsc") || request.headers.get("next-router-prefetch")) return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (request.headers.get("accept") ?? "").includes("text/html");
}

/**
 * The language a visitor arriving at an English address should see: the one
 * they chose before (the cookie), or for a first visit the one their country
 * speaks. Search engine bots always get English, so every language stays
 * reachable by its own address and none hides another.
 */
function wantedLocale(request: NextRequest): { locale: Locale; remember: boolean } {
  const saved = request.cookies.get(LANG_COOKIE)?.value;
  if (isLocale(saved)) return { locale: saved, remember: false };
  // Lets a developer try a country without travelling. Never in production.
  const testCountry = isDev ? request.cookies.get("test-country")?.value : undefined;
  const country = testCountry ?? countryOf(clientIp(request));
  return { locale: pickLocale(country, request.headers.get("accept-language")), remember: true };
}

/**
 * Where a language prefixed address is really served from: the same address
 * without the prefix.
 *
 * Built by cloning the request's own URL rather than from request.url. Behind
 * nginx the two disagree: the proxy forwards over http and says so with
 * X-Forwarded-Proto, so request.url is the http one while Next works in
 * https. A rewrite whose target does not match the origin Next thinks it is
 * on is treated as a different site, and Next tries to proxy the request out
 * to it instead of serving it. That failed with "Cannot find module
 * next/dist/compiled/httpxy" and every /es, /pt and /id address answered 500,
 * while the same addresses were fine when asked for directly on the port.
 * Cloning keeps the origin Next is already using, so it stays an internal
 * rewrite.
 */
function localeTarget(url: NextURL, rest: string): NextURL {
  const target = url.clone();
  target.pathname = rest;
  return target;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const { locale: prefixed, rest } = splitLocalePath(url.pathname);

  // English has no prefix, so /en/... is the unprefixed page under another
  // name, and a prefixed address for a page that is English only goes to it.
  if (prefixed === DEFAULT_LOCALE || (prefixed && !isTranslatedPath(rest))) {
    const target = url.clone();
    target.pathname = rest;
    return NextResponse.redirect(target, 308);
  }

  if (!prefixed && isTranslatedPath(url.pathname) && isPageLoad(request) && !isBot(request.headers.get("user-agent"))) {
    const { locale, remember } = wantedLocale(request);
    if (locale !== DEFAULT_LOCALE) {
      const target = url.clone();
      target.pathname = localePath(locale, url.pathname);
      const redirect = NextResponse.redirect(target, 307);
      if (remember) {
        redirect.cookies.set(LANG_COOKIE, locale, { path: "/", maxAge: YEAR_SECONDS, sameSite: "lax" });
      }
      return redirect;
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const path = request.nextUrl.pathname;

  // The hosts in AD_NETWORK_DOMAINS, plus the host of every Adsterra code
  // saved in the admin panel, so a code with a new domain is not blocked.
  const ads = adPolicy();
  const adList = [...new Set([...AD_DOMAINS, ...ads.hosts])];
  const adHosts = adList.length > 0 ? " " + adList.join(" ") : "";

  // Some Adsterra formats cannot sit in a sealed frame, because each one puts
  // itself over or around the whole page: the Social Bar, the Popunder, the
  // Interstitial and the In-Page Push cards. Their scripts run in the page and
  // Adsterra's scripts evaluate strings, so public pages allow eval while any
  // of those codes is saved. The admin area and the API never do, and none of
  // those scripts ever loads there.
  const publicPage = !path.startsWith("/admin") && !path.startsWith("/api");
  const pageEval = ads.pageScripts && publicPage;

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

  // Adsterra fetches its creatives from CDN domains it picks and rotates
  // (cdn.show-creative1.com and others), so no host list keeps up. The sealed
  // ad frame, and public pages while the Social Bar is on, may connect and
  // frame any https address. Images already may; scripts still need a nonce.
  const anyHttps = isAdFrame || pageEval;
  const adConnect = anyHttps ? " https:" : adHosts;

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
      adConnect,
    // Banners and native ads live in /ads/frame ('self'); the network frames
    // inside them come from the ad hosts above. A-ADS was dropped on 2026-11-25.
    "frame-src 'self'" + adConnect,
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
  // Always set, so a visitor cannot pick a language by sending the header.
  headers.set("x-locale", prefixed ?? DEFAULT_LOCALE);

  // /es/tiktok-video-downloader is served by the same page as
  // /tiktok-video-downloader, which reads the language from x-locale.
  const response = prefixed
    ? NextResponse.rewrite(localeTarget(url, rest), { request: { headers } })
    : NextResponse.next({ request: { headers } });
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
    // A language prefix has to be rewritten on prefetches too: without it the
    // router would prefetch /es/..., find no such route, and keep the miss.
    "/:locale(es|pt|id|hi|ar|si)",
    "/:locale(es|pt|id|hi|ar|si)/:path*",
  ],
};
