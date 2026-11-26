import JsonLd from "@/components/JsonLd";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n";

export default async function Faq() {
  const t = getDict(await getLocale()).faq;
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.items.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
        {t.heading}
      </h2>
      <div className="glass glass-hairline mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl sm:mt-8">
        {t.items.map((f) => (
          <details key={f.q} className="group p-5 open:bg-white/40 dark:open:bg-white/5">
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
  );
}
