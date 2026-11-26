// The text for each language, and the platform pages in it.
import { dict as en, type Dict, type ToolCopy, type ToolName } from "./en";
import * as es from "./es";
import * as pt from "./pt";
import * as id from "./id";
import { TOOL_PAGES, getToolPage, type ToolPage } from "@/lib/seo-pages";
import type { Locale } from "@/lib/i18n";

type Language = { dict: Dict; toolNames: Record<string, ToolName>; tools: Record<string, ToolCopy> };

// Hindi, Arabic and Sinhala are not written yet; until they are, those
// addresses show the English text.
const LANGUAGES: Partial<Record<Exclude<Locale, "en">, Language>> = { es, pt, id };

export function getDict(locale: Locale): Dict {
  return (locale !== "en" && LANGUAGES[locale]?.dict) || en;
}

/** Everything the downloader shows in the browser, handed to it as one prop. */
export type DownloaderText = Dict["downloader"] & { errors: Dict["errors"]; review: Dict["review"] };

export function downloaderText(locale: Locale): DownloaderText {
  const d = getDict(locale);
  return { ...d.downloader, errors: d.errors, review: d.review };
}

/** A platform's short name and heading in a language, English where there is none. */
export function toolName(slug: string, locale: Locale): ToolName {
  const english = TOOL_PAGES.find((t) => t.slug === slug);
  const fallback = { navLabel: english?.navLabel ?? slug, h1: english?.h1 ?? slug };
  if (locale === "en") return fallback;
  return LANGUAGES[locale]?.toolNames[slug] ?? fallback;
}

/** A platform page in a language: its translated copy over the English page, or the English page. */
export function localizedTool(slug: string, locale: Locale): ToolPage | undefined {
  const base = getToolPage(slug);
  if (!base || locale === "en") return base;
  const copy = LANGUAGES[locale]?.tools[slug];
  return copy ? { ...base, ...copy, badge: base.badge } : base;
}
