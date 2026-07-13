import Link from "next/link";
import DownloaderForm from "@/components/DownloaderForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import AdSlot from "@/components/ads/AdSlot";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOL_PAGES, type ToolPage } from "@/lib/seo-pages";

export default function ToolLanding({ tool }: { tool: ToolPage }) {
  const pageUrl = `${SITE_URL}/${tool.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${SITE_NAME} ${tool.h1}`,
      url: pageUrl,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: tool.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use the ${tool.h1}`,
      step: tool.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: tool.h1, item: pageUrl },
      ],
    },
  ];

  const otherTools = TOOL_PAGES.filter((t) => t.slug !== tool.slug);

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Header />
      <main>
        <section className="bg-gradient-to-b from-violet-50 to-white px-4 pb-14 pt-10 sm:pb-20 sm:pt-16 dark:from-violet-950/30 dark:to-neutral-950">
          <div className="mx-auto max-w-2xl text-center">
            <span
              className={`inline-flex items-center rounded-full bg-gradient-to-br ${tool.badge.color} px-3 py-1 text-xs font-semibold text-white`}
            >
              {tool.badge.label}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
              {tool.h1}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">
              {tool.tagline}
            </p>
          </div>
          <div className="mt-8">
            <DownloaderForm placeholder={tool.placeholder} />
          </div>
        </section>

        <div className="px-4 py-6">
          <AdSlot slot="toolTop" />
        </div>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <h2 className="text-center text-xl font-bold sm:text-2xl dark:text-white">
            {`Why use the ${SITE_NAME} ${tool.h1}?`}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tool.features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="bg-neutral-50 py-12 sm:py-16 dark:bg-neutral-900/40">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-xl font-bold sm:text-2xl dark:text-white">
              {tool.stepsHeading}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {tool.steps.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-neutral-900"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold dark:text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-neutral-500 dark:text-neutral-400">
              {tool.deviceNote}
            </p>
          </div>
        </section>

        <div className="px-4 py-8">
          <AdSlot slot="toolMid" />
        </div>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h2 className="text-center text-xl font-bold sm:text-2xl dark:text-white">
            Frequently asked questions
          </h2>
          <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900">
            {tool.faqs.map((f) => (
              <details key={f.q} className="group p-5 open:bg-neutral-50 dark:open:bg-white/5">
                <summary className="cursor-pointer list-none font-medium text-neutral-900 marker:content-none dark:text-white">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-neutral-400 transition group-open:rotate-45 dark:text-neutral-500">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:pb-16">
          <h2 className="text-center text-lg font-bold dark:text-white">
            Other free downloaders
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {otherTools.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-violet-400 hover:text-violet-700 dark:border-white/10 dark:text-neutral-300 dark:hover:text-violet-300"
              >
                {t.navLabel}
              </Link>
            ))}
          </div>
        </section>

        <div className="px-4 pb-10">
          <AdSlot slot="toolBottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
