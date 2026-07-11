import JsonLd from "@/components/JsonLd";

const FAQS = [
  {
    q: "Is this free?",
    a: "Yes. Paste a link, pick a quality and save the file. You do not need an account, and nothing gets added to your video.",
  },
  {
    q: "Can I download private posts?",
    a: "No. SnapGrab can only fetch content that is publicly accessible, the same as opening it in a browser without logging in.",
  },
  {
    q: "Which sites are supported?",
    a: "More than 1,200 sites work here, including Instagram, TikTok, Facebook, X, YouTube, Pinterest, Reddit, Vimeo, SoundCloud and Twitch. The site is detected from the link you paste.",
  },
  {
    q: "What am I allowed to download?",
    a: "Content you own, content you have permission to use, and material that is licensed for reuse. Respect the people who make the videos.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <h2 className="text-center text-xl font-bold sm:text-3xl dark:text-white">
        Frequently asked questions
      </h2>
      <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white sm:mt-8 dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900">
        {FAQS.map((f) => (
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
  );
}
