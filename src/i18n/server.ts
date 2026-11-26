import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/**
 * The language of the page being rendered. proxy.ts works it out from the
 * address (/es/...) and passes it on the request as x-locale; it always sets
 * the header, so a value sent by a visitor never gets this far.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get("x-locale");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
