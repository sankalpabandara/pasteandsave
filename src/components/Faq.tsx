import JsonLd from "@/components/JsonLd";

const FAQS = [
  {
    q: "Is this free?",
    a: "Yes. Paste a link, pick a quality and save the file. You do not need an account, and nothing gets added to your video.",
  },
  {
    q: "Can I download private posts?",
    a: "No. PasteAndSave can only fetch content that is publicly accessible, the same as opening it in a browser without logging in.",
  },
  {
    q: "Which sites are supported?",
    a: "More than 1,200 sites work here, including Instagram, TikTok, Facebook, X, YouTube, Pinterest, Reddit, Vimeo, SoundCloud and Twitch. The site is detected from the link you paste.",
  },
  {
    q: "What am I allowed to download?",
    a: "Content you own, content you have permission to use, and material that is licensed for reuse. Respect the people who make the videos.",
  },
  {
    q: "How do I download a video from a link?",
    a: "Copy the share link from the site or app, paste it into the box at the top of this page, and press Download. Every available quality shows up in a list, usually in under a minute.",
  },
  {
    q: "Can I convert a video link straight to MP3?",
    a: "Yes. After you paste a link and look it up, use the Save as MP3 button instead of picking a video quality. Only the audio track downloads.",
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
      <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
        Frequently asked questions
      </h2>
      <div className="glass glass-hairline mt-6 divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl sm:mt-8">
        {FAQS.map((f) => (
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
