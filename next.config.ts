import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers applied to every response. The strict Content-Security
// Policy is production-only so it doesn't interfere with the dev server's
// hot-reload (which needs eval and websockets).
// Bump on each release so a deploy can be verified from the response headers.
const APP_VERSION = "2026.07.30";

// Extra hosts an ad network needs before its code can run. The policy here is
// strict on purpose, which means a freshly pasted embed is blocked until its
// domains are listed — and a blocked ad looks identical to a network that is
// not paying, so it is worth setting before wondering why nothing appears.
//
// Space or comma separated, in .env.local, then restart:
//   AD_NETWORK_DOMAINS="https://*.adsterra.com https://*.hilltopads.com"
const adDomains = (process.env.AD_NETWORK_DOMAINS || "")
  .split(/[\s,]+/)
  .map((d) => d.trim())
  .filter(Boolean);
const adHosts = adDomains.length > 0 ? " " + adDomains.join(" ") : "";

const securityHeaders = [
  { key: "X-App-Version", value: APP_VERSION },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Inline scripts (theme, JSON-LD) and Google Analytics.
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + adHosts,
            "style-src 'self' 'unsafe-inline'",
            // Thumbnails come from many external CDNs.
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com" + adHosts,
            // A-ADS banner ads are embedded as iframes (served from
            // acceptable.a-ads.com; aads.com is their newer domain).
            "frame-src 'self' https://*.a-ads.com https://a-ads.com https://*.aads.com https://aads.com" + adHosts,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for easy VPS/Docker deployment.
  output: "standalone",
  poweredByHeader: false,
  // Nothing here uses next/image, but the framework still ships sharp, and
  // sharp carries whatever libvips CVEs are open at the time. Turning
  // optimisation off means the image route never hands a file to libvips, so
  // those advisories cannot apply to this site whatever their state.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The certificate covers both hostnames, so https://www served the whole
  // site as a second copy. Everything belongs on the apex domain that the
  // canonical tags and sitemap already point at.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pasteandsave.com" }],
        destination: "https://pasteandsave.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
