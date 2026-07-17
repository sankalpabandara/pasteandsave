import Link from "next/link";
import Logo from "./Logo";
import { TOOL_PAGES } from "@/lib/seo-pages";

export default function Footer() {
  return (
    <footer className="glass glass-hairline mt-auto rounded-t-3xl">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              A free online video downloader that works with more than 1,200
              sites. Paste a link, pick a quality and save the file.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              Downloaders
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {TOOL_PAGES.slice(0, Math.ceil(TOOL_PAGES.length / 2)).map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="hover:text-neutral-900 dark:hover:text-white">
                    {t.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              More tools
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {TOOL_PAGES.slice(Math.ceil(TOOL_PAGES.length / 2)).map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}`} className="hover:text-neutral-900 dark:hover:text-white">
                    {t.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/extension" className="hover:text-neutral-900 dark:hover:text-white">
                  Browser Extension
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-black/5 pt-6 text-center text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          <p>
            PasteAndSave is an independent tool and isn&apos;t affiliated with
            any of the platforms it supports. Only download content you have
            the rights to use.
          </p>
          <p className="mt-2">&copy; {new Date().getFullYear()} PasteAndSave</p>
        </div>
      </div>
    </footer>
  );
}
