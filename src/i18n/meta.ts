import { LOCALES, localePath, type Locale } from "@/lib/i18n";

/**
 * A page's own address plus its address in every language (hreflang), so a
 * search engine shows each searcher the version in their language and treats
 * them as one page rather than as copies. x-default is the English page,
 * where a visitor with no matching language lands.
 */
export function languageAlternates(path: string, locale: Locale) {
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
      "x-default": path,
    },
  };
}
