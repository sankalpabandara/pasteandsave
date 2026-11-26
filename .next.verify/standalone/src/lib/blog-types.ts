// The shape of a blog post. Kept apart from src/lib/blog.ts, which lists the
// posts, so a post file can name its type without importing every other post.
//
// No imports on purpose: the tests load the post files directly.

export type BlogCategory = "basics" | "guides" | "fixes";

export type BlogPost = {
  slug: string;
  /** The headline on the page (H1). */
  title: string;
  /** The <title> for search results: 30 to 60 characters. */
  seoTitle: string;
  /** The meta description: 110 to 160 characters. */
  description: string;
  /** One or two sentences for the blog index card. */
  excerpt: string;
  category: BlogCategory;
  /** Its place in the "Start here" reading order, for the basics. */
  lesson?: number;
  /** ISO dates. */
  published: string;
  updated: string;
  keywords: string[];
  /** Questions people type into search, answered in full sentences. */
  faqs: { q: string; a: string }[];
  /** The downloader page the post leads to, if one fits. */
  tool?: { href: string; label: string };
  /** The article in Markdown: ## sections, ### subsections, no H1. */
  body: string;
};
