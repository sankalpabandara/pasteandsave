import type { MetadataRoute } from "next";
import { TOOL_PAGES } from "@/lib/seo-pages";
import { SITE_URL } from "@/lib/site";
import { POSTS, postImages } from "@/lib/blog";
import { LOCALES, isTranslatedPath, localePath } from "@/lib/i18n";

const base = SITE_URL.replace(/\/$/, "");

/** Every language's address for a translated page, so each is listed and linked to the others. */
function languages(path: string): Record<string, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, `${base}${localePath(l, path)}`]));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: {
    path: string;
    priority: number;
    changeFrequency: "weekly" | "monthly" | "yearly";
    lastModified?: Date;
    images?: string[];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    ...TOOL_PAGES.map((t) => ({ path: `/${t.slug}`, priority: 0.9, changeFrequency: "weekly" as const })),
    {
      path: "/blog",
      priority: 0.8,
      changeFrequency: "weekly",
      lastModified: new Date(Math.max(...POSTS.map((p) => Date.parse(p.updated)))),
    },
    ...POSTS.map((p) => ({
      path: `/blog/${p.slug}`,
      priority: 0.7,
      changeFrequency: "monthly" as const,
      lastModified: new Date(p.updated),
      images: postImages(p).map((img) => `${base}${img.src}`),
    })),
    { path: "/extension", priority: 0.8, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  ];

  return pages.flatMap(({ path, priority, changeFrequency, lastModified = now, images }) => {
    if (!isTranslatedPath(path)) {
      return [{ url: path === "/" ? SITE_URL : `${base}${path}`, lastModified, changeFrequency, priority, images }];
    }
    const alternates = { languages: languages(path) };
    return LOCALES.map((l) => ({
      url: l === "en" && path === "/" ? SITE_URL : `${base}${localePath(l, path)}`,
      lastModified,
      changeFrequency,
      priority: l === "en" ? priority : Math.max(0.1, priority - 0.1),
      alternates,
      images,
    }));
  });
}
