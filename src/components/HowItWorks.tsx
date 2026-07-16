const STEPS = [
  {
    title: "Copy the link",
    body: "Open the post, reel, or video in the app or browser and copy its share link.",
  },
  {
    title: "Paste it above",
    body: "Drop the link into the box at the top of this page and hit Download.",
  },
  {
    title: "Pick a quality",
    body: "PasteAndSave lists every available resolution. Choose one and save the file.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s, i) => (
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
