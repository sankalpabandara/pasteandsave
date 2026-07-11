import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const NAV_TOOLS = [
  { label: "TikTok", href: "/tiktok-video-downloader" },
  { label: "Instagram", href: "/instagram-video-downloader" },
  { label: "Facebook", href: "/facebook-video-downloader" },
  { label: "YouTube", href: "/youtube-video-downloader" },
  { label: "YouTube MP3", href: "/youtube-to-mp3" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold dark:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm text-white">
            SG
          </span>
          <span>
            Snap<span className="text-violet-600 dark:text-violet-400">Grab</span>
          </span>
        </Link>
        <nav className="flex min-w-0 gap-4 overflow-x-auto text-xs font-medium text-neutral-600 sm:gap-5 sm:text-sm dark:text-neutral-400">
          {NAV_TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 hover:text-neutral-900 dark:hover:text-white"
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
