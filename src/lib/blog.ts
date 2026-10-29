import type { BlogCategory, BlogPost } from "./blog-types";
import { post as howDownloadersWork } from "@/content/blog/how-online-video-downloaders-work";
import { post as qualityExplained } from "@/content/blog/video-quality-explained";
import { post as formatsExplained } from "@/content/blog/video-formats-explained";
import { post as legalGuide } from "@/content/blog/is-it-legal-to-download-videos";
import { post as tiktokGuide } from "@/content/blog/download-tiktok-without-watermark";
import { post as instagramGuide } from "@/content/blog/download-instagram-reels";
import { post as phoneGuide } from "@/content/blog/save-videos-on-iphone-and-android";
import { post as mp3Guide } from "@/content/blog/convert-video-to-mp3";
import { post as troubleshooting } from "@/content/blog/video-wont-download";

export type { BlogCategory, BlogPost };

// The blog, set out like a short course: four lessons of basics in order,
// then guides for each app, then fixes. To add a post, write a file in
// src/content/blog and list it here; the index, sitemap and tests pick it up.

export const POSTS: BlogPost[] = [
  howDownloadersWork,
  qualityExplained,
  formatsExplained,
  legalGuide,
  tiktokGuide,
  instagramGuide,
  phoneGuide,
  mp3Guide,
  troubleshooting,
];

export const CATEGORIES: { key: BlogCategory; label: string; blurb: string }[] = [
  {
    key: "basics",
    label: "Learn the basics",
    blurb: "Four short lessons, best read in order. Start here if you are new to saving videos.",
  },
  {
    key: "guides",
    label: "How to guides",
    blurb: "Step by step instructions for the apps and devices people use most.",
  },
  {
    key: "fixes",
    label: "Fix a problem",
    blurb: "What download errors mean and what you can do about them.",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postsIn(category: BlogCategory): BlogPost[] {
  return POSTS.filter((p) => p.category === category).sort(
    (a, b) => (a.lesson ?? 99) - (b.lesson ?? 99),
  );
}

/** The lesson before and after a basics post, for course style navigation. */
export function lessonNeighbours(post: BlogPost): { prev?: BlogPost; next?: BlogPost } {
  if (!post.lesson) return {};
  const lessons = postsIn("basics");
  const i = lessons.findIndex((p) => p.slug === post.slug);
  return { prev: lessons[i - 1], next: lessons[i + 1] };
}

/** Up to three other posts, preferring the same category. */
export function relatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const others = POSTS.filter((p) => p.slug !== post.slug);
  const same = others.filter((p) => p.category === post.category);
  const rest = others.filter((p) => p.category !== post.category);
  return [...same, ...rest].slice(0, count);
}

/** Posts that lead to a given downloader page, for "related guides" there. */
export function postsForTool(href: string): BlogPost[] {
  return POSTS.filter((p) => p.tool?.href === href);
}

export function categoryLabel(key: BlogCategory): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** "29 October 2026" for an ISO date, the same on server and browser. */
export function formatDate(iso: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}
