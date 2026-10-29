import type { MetadataRoute } from "next";
import { TOOL_PAGES } from "@/lib/seo-pages";
import { SITE_URL } from "@/lib/site";
import { POSTS, postImages } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...TOOL_PAGES.map((t) => ({
      url: `${SITE_URL}/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(
        Math.max(...POSTS.map((p) => Date.parse(p.updated))),
      ),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...POSTS.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: postImages(p).map((img) => `${SITE_URL.replace(/\/$/, "")}${img.src}`),
    })),
    {
      url: `${SITE_URL}/extension`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
