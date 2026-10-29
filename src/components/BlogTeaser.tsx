import Link from "next/link";
import BlogCover from "@/components/BlogCover";
import { categoryLabel, getPost, type BlogPost } from "@/lib/blog";

/**
 * A row of blog posts with a link to the rest. On the home page it shows the
 * posts people search for most; on a downloader page, the guides for it.
 */
export default function BlogTeaser({
  heading = "Guides and tips",
  posts,
}: {
  heading?: string;
  posts: (BlogPost | undefined)[];
}) {
  const list = posts.filter((p): p is BlogPost => Boolean(p));
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="blog-teaser" className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="blog-teaser" className="font-display text-xl font-bold sm:text-2xl dark:text-white">
          {heading}
        </h2>
        <Link href="/blog" className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">
          All guides
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {list.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="glass glass-hairline flex flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5"
          >
            <BlogCover post={p} sizes="(min-width: 640px) 330px, 100vw" />
            <span className="flex flex-col p-5">
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                {categoryLabel(p.category)}
              </span>
              <span className="mt-2 font-semibold text-neutral-900 dark:text-white">{p.title}</span>
              <span className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{p.excerpt}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** The posts the home page shows: the most searched topics. */
export function homePosts(): (BlogPost | undefined)[] {
  return [
    getPost("download-tiktok-without-watermark"),
    getPost("download-instagram-reels"),
    getPost("video-wont-download"),
  ];
}
