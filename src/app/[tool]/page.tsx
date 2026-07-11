import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ToolLanding from "@/components/ToolLanding";
import { TOOL_PAGES, getToolPage } from "@/lib/seo-pages";
import { SITE_NAME } from "@/lib/site";

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
  const tool = getToolPage(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url: `/${tool.slug}`,
      siteName: SITE_NAME,
      type: "website",
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
  const tool = getToolPage(slug);
  if (!tool) notFound();
  return <ToolLanding tool={tool} />;
}
