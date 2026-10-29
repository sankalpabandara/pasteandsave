import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CATEGORIES, POSTS, postsIn } from "@/lib/blog";
import { readingMinutes } from "@/lib/markdown";

const TITLE = "Video Download Guides and Tips | PasteAndSave Blog";
const DESCRIPTION =
  "Free guides to saving online videos: how downloaders work, video quality and formats, the legal rules, step by step app guides and fixes for common errors.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function BlogIndex() {
  const base = SITE_URL.replace(/\/$/, "");
  const lessons = postsIn("basics");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    description: DESCRIPTION,
    url: `${base}/blog`,
    inLanguage: "en",
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${base}/blog/${p.slug}`,
      datePublished: p.published,
      dateModified: p.updated,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="pb-10 pt-14 text-center sm:pb-14 sm:pt-20">
          <span className="glass glass-hairline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {POSTS.length} free guides · no sign up
          </span>
          <h1 className="font-display mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
            Learn to save{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
              any online video
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-neutral-600 dark:text-neutral-300">
            Plain guides on how video downloading works, which quality and format to pick, what the rules
            are, and what to do when a download fails. Written by the team behind {SITE_NAME}.
          </p>
        </section>

        <section aria-labelledby="start-here">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="start-here" className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              Start here: the basics in four lessons
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              About {lessons.reduce((n, p) => n + readingMinutes(p.body), 0)} minutes in total
            </p>
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lessons.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="glass glass-hairline flex h-full flex-col rounded-2xl p-5 transition hover:-translate-y-0.5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-sm font-bold text-white">
                    {p.lesson}
                  </span>
                  <span className="mt-4 font-semibold text-neutral-900 dark:text-white">{p.title}</span>
                  <span className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{p.excerpt}</span>
                  <span className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                    {readingMinutes(p.body)} min read
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {CATEGORIES.filter((c) => c.key !== "basics").map((c) => (
          <section key={c.key} aria-labelledby={`cat-${c.key}`} className="mt-16">
            <h2 id={`cat-${c.key}`} className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              {c.label}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{c.blurb}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {postsIn(c.key).map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="glass glass-hairline flex flex-col rounded-2xl p-6 transition hover:-translate-y-0.5"
                >
                  <span className="font-display text-lg font-bold text-neutral-900 dark:text-white">{p.title}</span>
                  <span className="mt-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">{p.excerpt}</span>
                  <span className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                    {readingMinutes(p.body)} min read
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="glass glass-hairline glass-sheen mt-16 rounded-3xl p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            Have a link already?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
            Paste it into the downloader and pick a quality. Free, with nothing to install.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Open the downloader
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
