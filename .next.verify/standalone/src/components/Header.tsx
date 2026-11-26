import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import MobileNav from "./MobileNav";
import LanguageMenu from "./LanguageMenu";
import HtmlLangSync from "./HtmlLangSync";
import { LOCALES, LOCALE_NAMES, dirOf, linkFor, localeHref, localePath } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n";

/**
 * @param path the page's address in English (e.g. "/tiktok-video-downloader"),
 * so the language menu can offer the same page in each language.
 */
export default async function Header({ path = "/" }: { path?: string }) {
  const locale = await getLocale();
  const t = getDict(locale).nav;
  const navTools = [
    { label: t.tiktok, href: linkFor(locale, "/tiktok-video-downloader") },
    { label: t.instagram, href: linkFor(locale, "/instagram-video-downloader") },
    { label: t.facebook, href: linkFor(locale, "/facebook-video-downloader") },
    { label: t.youtube, href: linkFor(locale, "/youtube-video-downloader") },
    { label: t.mp3, href: linkFor(locale, "/video-to-mp3-converter") },
    { label: t.extension, href: linkFor(locale, "/extension") },
    // The blog is in English only, so it keeps its one address.
    { label: t.blog, href: "/blog" },
  ];
  const languages = LOCALES.map((l) => ({ locale: l, name: LOCALE_NAMES[l], href: localeHref(l, path) }));

  return (
    <div className="sticky top-0 z-30 px-3 pt-3">
      <HtmlLangSync lang={locale} dir={dirOf(locale)} />
      <header className="glass glass-hairline relative mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <Link href={localePath(locale, "/")} className="shrink-0">
          <Logo />
        </Link>
        {/* Wide screens keep inline links; phones and tablets get the
            hamburger dropdown, since seven links do not fit below lg. */}
        <nav className="hidden min-w-0 gap-5 text-sm font-medium text-neutral-600 lg:flex dark:text-neutral-300">
          {navTools.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 transition-colors hover:text-violet-600 dark:hover:text-violet-300"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LanguageMenu current={locale} options={languages} label={t.language} />
          <ThemeToggle label={t.theme} />
          <MobileNav links={navTools} openLabel={t.openMenu} closeLabel={t.closeMenu} />
        </div>
      </header>
    </div>
  );
}
