import type { BlogCategory, BlogPost } from "./blog-types";
import { post as howDownloadersWork } from "@/content/blog/how-online-video-downloaders-work";
import { post as qualityExplained } from "@/content/blog/video-quality-explained";
import { post as formatsExplained } from "@/content/blog/video-formats-explained";
import { post as legalGuide } from "@/content/blog/is-it-legal-to-download-videos";
import { post as safetyGuide } from "@/content/blog/are-online-video-downloaders-safe";
import { post as tiktokGuide } from "@/content/blog/download-tiktok-without-watermark";
import { post as instagramGuide } from "@/content/blog/download-instagram-reels";
import { post as youtubeGuide } from "@/content/blog/download-youtube-videos";
import { post as playlistGuide } from "@/content/blog/download-youtube-playlist";
import { post as facebookGuide } from "@/content/blog/download-facebook-videos";
import { post as xGuide } from "@/content/blog/download-twitter-x-videos";
import { post as redditGuide } from "@/content/blog/download-reddit-videos-with-sound";
import { post as phoneGuide } from "@/content/blog/save-videos-on-iphone-and-android";
import { post as mp3Guide } from "@/content/blog/convert-video-to-mp3";
import { post as troubleshooting } from "@/content/blog/video-wont-download";
import { IMAGES, type BlogImage } from "@/content/blog/images";
import { imagesIn } from "@/lib/markdown";

export type { BlogCategory, BlogPost };

// The blog, set out like a short course: five lessons of basics in order,
// then guides for each app, then fixes. To add a post, write a file in
// src/content/blog and list it here; the index, sitemap and tests pick it up.
// Its cover and diagrams are drawn by scripts/blog-images.mjs.

export const POSTS: BlogPost[] = [
  howDownloadersWork,
  qualityExplained,
  formatsExplained,
  legalGuide,
  safetyGuide,
  tiktokGuide,
  instagramGuide,
  youtubeGuide,
  playlistGuide,
  facebookGuide,
  xGuide,
  redditGuide,
  phoneGuide,
  mp3Guide,
  troubleshooting,
];

export const CATEGORIES: { key: BlogCategory; label: string; blurb: string }[] = [
  {
    key: "basics",
    label: "Learn the basics",
    blurb: "Five short lessons, best read in order. Start here if you are new to saving videos.",
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

export type PostImage = BlogImage & { src: string; caption: string };

/** The post's cover, public/blog/images/<slug>.jpg. */
export function coverOf(post: BlogPost): PostImage | undefined {
  const src = `/blog/images/${post.slug}.jpg`;
  const image = IMAGES[src];
  return image && { ...image, src, caption: post.title };
}

/** Every picture in a post, cover first, for structured data and the sitemap. */
export function postImages(post: BlogPost): PostImage[] {
  const inBody = imagesIn(post.body).flatMap(({ src, caption }) => {
    const image = IMAGES[src];
    return image ? [{ ...image, src, caption: caption || image.alt }] : [];
  });
  const cover = coverOf(post);
  return cover ? [cover, ...inBody] : inBody;
}

/** "five" for 5, for headings that count lessons. */
export function countWord(n: number): string {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
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
