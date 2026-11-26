import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n";

export default async function HowItWorks() {
  const t = getDict(await getLocale()).how;
  return (
    <section id="how" className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
          {t.heading}
        </h2>
        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-6">
          {t.steps.map((s, i) => (
            <div
              key={s.title}
              className="glass glass-hairline rounded-2xl p-6"
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
      </div>
    </section>
  );
}
