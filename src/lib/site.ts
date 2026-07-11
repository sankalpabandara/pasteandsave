// Set NEXT_PUBLIC_SITE_URL to the real domain before deploying — the
// fallback is a placeholder and will produce wrong canonical/sitemap URLs.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapgrab.example.com";

export const SITE_NAME = "SnapGrab";
