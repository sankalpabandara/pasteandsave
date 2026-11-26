// Which language a visitor sees, and where each language lives.
//
// English stays at the addresses it has always had (/, /youtube-video-downloader).
// Every other language gets its own prefix (/es, /es/youtube-video-downloader),
// so search engines can index each one and a link always opens the language it
// was shared in. proxy.ts sends a first time visitor to the language of the
// country their IP address is in, remembers the choice in the "lang" cookie,
// and never moves a search engine bot.
//
// No imports on purpose: the tests load this file directly.

// Only the languages that are written. A locale listed here gets its own
// addresses in the sitemap and its own hreflang entry, so listing one that is
// not translated yet would publish the English text at a second address and
// ask Google to treat it as a page in another language. Hindi, Arabic and
// Sinhala go back in the day their dictionaries land.
export const LOCALES = ["en", "es", "pt", "id"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language in its own words, for the language menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  id: "Bahasa Indonesia",
};

/** The cookie that remembers a visitor's language, set by the menu or the first redirect. */
export const LANG_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Arabic is the one planned language that reads right to left. Compared as a
// plain string so this keeps working whether or not "ar" is in LOCALES yet.
const RTL: readonly string[] = ["ar"];

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return RTL.includes(locale) ? "rtl" : "ltr";
}

/**
 * The pages that exist in every language. Anything else (the extension page,
 * terms, privacy and the other platform pages) is English only for now, and a
 * prefixed address for it is sent to the English page.
 */
export const TRANSLATED_PATHS = [
  "/",
  "/youtube-video-downloader",
  "/tiktok-video-downloader",
  "/instagram-video-downloader",
] as const;

export function isTranslatedPath(path: string): boolean {
  return (TRANSLATED_PATHS as readonly string[]).includes(path);
}

/** "/es/tiktok-video-downloader" is Spanish and the TikTok page; "/" has no language in it. */
export function splitLocalePath(pathname: string): { locale: Locale | null; rest: string } {
  const m = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(pathname);
  if (m && isLocale(m[1])) return { locale: m[1], rest: m[2] || "/" };
  return { locale: null, rest: pathname || "/" };
}

/** Where a page lives in a language: English unprefixed, the rest under /xx. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** A page's address in a language, or that language's home when the page is English only. */
export function localeHref(locale: Locale, path: string): string {
  return localePath(locale, isTranslatedPath(path) ? path : "/");
}

/** Where a link inside a localized page goes: translated pages stay in the language. */
export function linkFor(locale: Locale, path: string): string {
  return isTranslatedPath(path) ? localePath(locale, path) : path;
}

// Countries whose main language has a version here. Arabic covers the Arab
// League countries; Portuguese and Spanish the countries where it is the
// main language.
const COUNTRY_LOCALE: Record<string, Locale> = {
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
  GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es",
  CR: "es", PA: "es", UY: "es", PR: "es", GQ: "es",
  // Portuguese
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt",
  // Indonesian
  ID: "id",
  // Arabic, Hindi and Sinhala are not written yet, so the countries that
  // would use them are left out and their visitors keep the English site.
  // The entries go back with the dictionaries.
};

// Where many people browse in English, the country alone does not decide:
// the browser has to list the language too. An Indian visitor whose browser
// is in English keeps the English site.
const CONDITIONAL = new Set(["IN", "LK"]);

/** The languages a browser asks for, in its order of preference ("hi-IN" counts as "hi"). */
export function browserLanguages(acceptLanguage: string | null | undefined): string[] {
  if (!acceptLanguage) return [];
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q === undefined ? 1 : Number(q) };
    })
    .filter((x) => x.lang && x.lang !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang);
}

/**
 * The language a first time visitor is sent to. The country comes from the
 * IP address; where it is unknown (no database yet, a private address) the
 * browser's first language decides instead.
 */
export function pickLocale(country: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  const langs = browserLanguages(acceptLanguage);
  const code = country?.toUpperCase();
  const fromCountry = code ? COUNTRY_LOCALE[code] : undefined;
  if (fromCountry) {
    if (!CONDITIONAL.has(code!)) return fromCountry;
    return langs.includes(fromCountry) ? fromCountry : DEFAULT_LOCALE;
  }
  if (code) return DEFAULT_LOCALE;
  const first = langs[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Search engines, link previews and other robots: never redirected, so they index every language. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|curl|wget|python|httpclient|okhttp|go-http|java\//i.test(
    userAgent,
  );
}

/** Fills {name} style slots in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) =>
    key in values ? String(values[key]) : all,
  );
}
