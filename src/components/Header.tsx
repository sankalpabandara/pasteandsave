import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const NAV_TOOLS = [
  { label: "TikTok", href: "/tiktok-video-downloader" },
  { label: "Instagram", href: "/instagram-video-downloader" },
  { label: "Facebook", href: "/facebook-video-downloader" },
  { label: "YouTube", href: "/youtube-video-downloader" },
  { label: "MP3 Converter", href: "/video-to-mp3-converter" },
];

export default function Header() {
  return (
    <div className="sticky top-0 z-30 px-3 pt-3">
      <header className="glass glass-hairline mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="flex min-w-0 gap-4 overflow-x-auto text-xs font-medium text-neutral-600 sm:gap-5 sm:text-sm dark:text-neutral-300">
          {NAV_TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 transition-colors hover:text-violet-600 dark:hover:text-violet-300"
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>
    </div>
  );
}
