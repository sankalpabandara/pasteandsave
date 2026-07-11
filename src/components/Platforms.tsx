import Link from "next/link";

const PLATFORMS: { name: string; color: string; initial: string; href?: string }[] = [
  { name: "Instagram", color: "from-pink-500 to-orange-400", initial: "IG", href: "/instagram-video-downloader" },
  { name: "TikTok", color: "from-neutral-800 to-neutral-950", initial: "TT", href: "/tiktok-video-downloader" },
  { name: "Facebook", color: "from-blue-600 to-blue-500", initial: "FB", href: "/facebook-video-downloader" },
  { name: "X / Twitter", color: "from-neutral-900 to-black", initial: "X", href: "/twitter-video-downloader" },
  { name: "YouTube", color: "from-red-600 to-red-500", initial: "YT", href: "/youtube-video-downloader" },
  { name: "Pinterest", color: "from-red-500 to-rose-600", initial: "P", href: "/pinterest-video-downloader" },
  { name: "Reddit", color: "from-orange-500 to-orange-600", initial: "R" },
  { name: "Vimeo", color: "from-sky-500 to-cyan-500", initial: "V" },
  { name: "SoundCloud", color: "from-orange-400 to-amber-500", initial: "SC" },
  { name: "Twitch", color: "from-purple-600 to-purple-500", initial: "TW" },
  { name: "Bluesky", color: "from-sky-500 to-blue-500", initial: "BS" },
  { name: "Threads", color: "from-neutral-900 to-black", initial: "TH" },
];

const tileClass =
  "flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6 dark:border-white/10 dark:bg-neutral-900";

export default function Platforms() {
  return (
    <section id="platforms" className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h2 className="text-center text-xl font-bold sm:text-3xl dark:text-white">
        Works with more than 1,200 sites
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-neutral-600 sm:text-base dark:text-neutral-400">
        You never have to choose a platform. Paste the link, and SnapGrab
        works out which site it came from and shows the quality options.
        These are the popular ones.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
        {PLATFORMS.map((p) => {
          const inner = (
            <>
              <span
                className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${p.color} text-sm font-bold text-white`}
              >
                {p.initial}
              </span>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {p.name}
              </span>
            </>
          );
          return p.href ? (
            <Link key={p.name} href={p.href} className={tileClass}>
              {inner}
            </Link>
          ) : (
            <div key={p.name} className={tileClass}>
              {inner}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Snapchat, LinkedIn, Tumblr, Bandcamp, Mixcloud, Rumble, Imgur, VK,
        Dailymotion, Bilibili and Streamable work too, along with many
        smaller sites.
      </p>
    </section>
  );
}
