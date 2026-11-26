import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ToolLanding from "@/components/ToolLanding";
import { TOOL_PAGES } from "@/lib/seo-pages";
import { SITE_NAME } from "@/lib/site";
import { isTranslatedPath, localePath } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import { getDict, localizedTool } from "@/i18n";
import { languageAlternates } from "@/i18n/meta";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_PAGES.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool: slug } = await params;
  const locale = await getLocale();
  const tool = localizedTool(slug, locale);
  if (!tool) return {};
  const path = `/${tool.slug}`;
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    // Only pages that exist in every language list the others.
    alternates: isTranslatedPath(path) ? languageAlternates(path, locale) : { canonical: path },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url: localePath(locale, path),
      siteName: SITE_NAME,
      type: "website",
      locale: getDict(locale).meta.ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.title,
      description: tool.description,
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  const locale = await getLocale();
  const tool = localizedTool(slug, locale);
  if (!tool) notFound();
  return <ToolLanding tool={tool} locale={locale} />;
}
