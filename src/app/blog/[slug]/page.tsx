import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import AdSlot from "@/components/ads/AdSlot";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  POSTS,
  categoryLabel,
  formatDate,
  getPost,
  lessonNeighbours,
  postsIn,
  relatedPosts,
} from "@/lib/blog";
import { readingMinutes, renderMarkdown, tableOfContents } from "@/lib/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: path },
    openGraph: {
      title: post.title,
      description: post.description,
      url: path,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated,
      section: categoryLabel(post.category),
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function TocList({ items }: { items: { id: string; text: string }[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="text-neutral-600 transition hover:text-violet-700 dark:text-neutral-400 dark:hover:text-violet-300"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  const base = SITE_URL.replace(/\/$/, "");
  const url = `${base}/blog/${post.slug}`;
  const html = renderMarkdown(post.body);
  const toc = tableOfContents(post.body);
  const minutes = readingMinutes(post.body);
  const { prev, next } = lessonNeighbours(post);
  const lessonCount = postsIn("basics").length;
  const related = relatedPosts(post);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      dateModified: post.updated,
      inLanguage: "en",
      articleSection: categoryLabel(post.category),
      keywords: post.keywords.join(", "),
      wordCount: post.body.split(/\s+/).filter(Boolean).length,
      mainEntityOfPage: url,
      url,
      author: { "@type": "Organization", name: SITE_NAME, url: base },
      publisher: { "@type": "Organization", name: SITE_NAME, url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: base },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/" className="hover:text-violet-700 dark:hover:text-violet-300">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <Link href="/blog" className="hover:text-violet-700 dark:hover:text-violet-300">Blog</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span>{categoryLabel(post.category)}</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-violet-600/10 px-3 py-1 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              {categoryLabel(post.category)}
            </span>
            {post.lesson && (
              <span className="rounded-full bg-neutral-500/10 px-3 py-1 text-neutral-600 dark:text-neutral-300">
                Lesson {post.lesson} of {lessonCount}
              </span>
            )}
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
            {post.title}
          </h1>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            By the {SITE_NAME} team · Updated {formatDate(post.updated)} · {minutes} min read
          </p>
        </header>

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
          <article className="min-w-0">
            {toc.length > 0 && (
              <details className="glass glass-hairline mb-8 rounded-2xl p-5 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-neutral-900 dark:text-white">
                  On this page
                </summary>
                <div className="mt-3">
                  <TocList items={toc} />
                </div>
              </details>
            )}

            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

            {post.tool && (
              <div className="glass glass-hairline glass-sheen mt-10 flex flex-col items-start gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-lg font-bold text-neutral-900 dark:text-white">
                    Ready to try it?
                  </p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Free, no sign up, works on any phone or computer.
                  </p>
                </div>
                <Link
                  href={post.tool.href}
                  className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  {post.tool.label}
                </Link>
              </div>
            )}

            <AdSlot slot="toolMid" className="py-8" />

            <section aria-labelledby="faq-heading" className="mt-6">
              <h2 id="faq-heading" className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                Questions people ask
              </h2>
              <div className="glass glass-hairline mt-5 divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl">
                {post.faqs.map((f) => (
                  <details key={f.q} className="group p-5 open:bg-white/40 dark:open:bg-white/5">
                    <summary className="cursor-pointer list-none font-medium text-neutral-900 marker:content-none dark:text-white">
                      <span className="flex items-center justify-between gap-4">
                        {f.q}
                        <span className="text-neutral-400 transition group-open:rotate-45 dark:text-neutral-500">+</span>
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {(prev || next) && (
              <nav aria-label="Lessons" className="mt-10 grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <Link href={`/blog/${prev.slug}`} className="glass glass-hairline rounded-2xl p-5 transition hover:-translate-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Previous lesson
                    </span>
                    <span className="mt-1 block font-semibold text-neutral-900 dark:text-white">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={`/blog/${next.slug}`} className="glass glass-hairline rounded-2xl p-5 text-end transition hover:-translate-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Next lesson
                    </span>
                    <span className="mt-1 block font-semibold text-neutral-900 dark:text-white">{next.title}</span>
                  </Link>
                )}
              </nav>
            )}
          </article>

          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  On this page
                </p>
                <div className="mt-3">
                  <TocList items={toc} />
                </div>
                {post.tool && (
                  <Link
                    href={post.tool.href}
                    className="mt-6 block rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    {post.tool.label}
                  </Link>
                )}
              </div>
            </aside>
          )}
        </div>

        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="font-display text-xl font-bold text-neutral-900 dark:text-white">
            Keep reading
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="glass glass-hairline flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5"
              >
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {categoryLabel(r.category)}
                </span>
                <span className="mt-2 font-semibold text-neutral-900 dark:text-white">{r.title}</span>
                <span className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{r.excerpt}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
