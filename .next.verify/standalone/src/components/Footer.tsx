import Link from "next/link";
import Logo from "./Logo";
import { TOOL_PAGES } from "@/lib/seo-pages";
import { linkFor } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import { getDict, toolName } from "@/i18n";

export default async function Footer() {
  const locale = await getLocale();
  const t = getDict(locale).footer;
  const half = Math.ceil(TOOL_PAGES.length / 2);
  const toolLink = (slug: string) => (
    <li key={slug}>
      <Link href={linkFor(locale, `/${slug}`)} className="hover:text-neutral-900 dark:hover:text-white">
        {toolName(slug, locale).h1}
      </Link>
    </li>
  );

  return (
    <footer className="glass glass-hairline mt-auto rounded-t-3xl">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{t.about}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t.downloaders}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {TOOL_PAGES.slice(0, half).map((tool) => toolLink(tool.slug))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t.moreTools}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {TOOL_PAGES.slice(half).map((tool) => toolLink(tool.slug))}
              <li>
                <Link href="/extension" className="hover:text-neutral-900 dark:hover:text-white">
                  {t.extension}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-neutral-900 dark:hover:text-white">
                  Blog and guides
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-white">
                  {t.terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-white">
                  {t.privacy}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-black/5 pt-6 text-center text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
          <p>{t.disclaimer}</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} PasteAndSave</p>
          {/* Required by the CC BY 4.0 licence of the database that picks a
              visitor's language from their country (src/lib/geoip.ts). */}
          <p className="mt-2">
            <a href="https://db-ip.com" className="hover:text-neutral-900 dark:hover:text-white">
              {t.geo}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
