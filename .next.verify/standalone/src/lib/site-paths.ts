// The English pages the site publishes, in sitemap order. IndexNow and the
// SEO crawler both read this list, so neither can quietly miss a section the
// way they once missed the whole blog. Kept free of imports so the tests can
// load it directly.

export function sitePaths(toolSlugs: string[], postSlugs: string[]): string[] {
  return [
    "/",
    ...toolSlugs.map((slug) => `/${slug}`),
    "/blog",
    ...postSlugs.map((slug) => `/blog/${slug}`),
    "/extension",
    "/terms",
    "/privacy",
  ];
}

// IndexNow only trusts URLs that sit in the same folder as the key file, or
// below it. A key served at /indexnow/<key> therefore vouched for nothing but
// /indexnow/..., and every submission came back HTTP 422. The key has to live
// at the root. next.config.ts rewrites this path to the /indexnow/[key] route.
export function indexNowKeyPath(key: string): string {
  return `/${key}.txt`;
}
