import type { Metadata } from "next";
import Link from "next/link";
import DownloaderForm from "@/components/DownloaderForm";
import Header from "@/components/Header";
import Platforms from "@/components/Platforms";
import HowItWorks from "@/components/HowItWorks";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Bookmarklet from "@/components/Bookmarklet";
import AdSlot from "@/components/ads/AdSlot";
import NativeSlot from "@/components/ads/NativeSlot";
import BlogTeaser, { homePosts } from "@/components/BlogTeaser";
import { TOOL_PAGES } from "@/lib/seo-pages";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { fill, linkFor, localePath } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import { downloaderText, getDict, toolName } from "@/i18n";
import { languageAlternates } from "@/i18n/meta";

// Rendered per request so the HTML reserves a box for exactly the ads that are
// saved in the admin panel right now. Prerendered, it would ship whatever was
// configured at build time, and a box for an ad switched on later would appear
// only after the settings fetch, pushing the page down as it does.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDict(locale).meta;
  const ogTitle = fill(t.ogTitle, { site: SITE_NAME });
  return {
    title: t.homeTitle,
    description: t.homeDescription,
    alternates: languageAlternates("/", locale),
    openGraph: {
      title: ogTitle,
      description: t.ogDescription,
      url: localePath(locale, "/"),
      siteName: SITE_NAME,
      type: "website",
      locale: t.ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: t.twitterDescription,
    },
  };
}

export default async function Home() {
  const locale = await getLocale();
  const dict = getDict(locale);
  const t = dict.home;
  const pageUrl = `${SITE_URL.replace(/\/$/, "")}${locale === "en" ? "" : localePath(locale, "/")}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: locale,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: fill(dict.meta.appName, { site: SITE_NAME }),
      url: pageUrl,
      inLanguage: locale,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: dict.meta.appDescription,
    },
  ];
  const linkClass = "underline hover:text-neutral-900 dark:hover:text-white";

  return (
    <>
      {jsonLd.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Header path="/" />
      <main>
        <section className="px-4 pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
              {t.h1Line1}
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
                {t.h1Line2}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-neutral-600 dark:text-neutral-300">{t.lead}</p>
          </div>
          <div className="mt-8 sm:mt-10">
            <DownloaderForm locale={locale} text={downloaderText(locale)} />
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {TOOL_PAGES.map((tool) => (
              <Link
                key={tool.slug}
                href={linkFor(locale, `/${tool.slug}`)}
                className="glass glass-hairline rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:text-violet-700 dark:text-neutral-200 dark:hover:text-violet-300"
              >
                {toolName(tool.slug, locale).navLabel}
              </Link>
            ))}
          </div>
        </section>
        <AdSlot slot="homeTop" className="px-4 py-6" label={dict.ads.label} />
        <Platforms />
        <HowItWorks />
        <Bookmarklet />
        <AdSlot slot="homeMid" className="px-4 py-8" label={dict.ads.label} />
        <section className="px-4 py-12 sm:py-16">
          <div className="glass glass-hairline mx-auto max-w-3xl space-y-4 rounded-3xl p-6 text-sm leading-relaxed text-neutral-600 sm:p-8 dark:text-neutral-300">
            <h2 className="font-display text-center text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
              {t.aboutHeading}
            </h2>
            <p>{fill(t.about1, { site: SITE_NAME })}</p>
            {/* In-content rather than stacked against another banner: a
                reader is already here and looking down the page, and two
                banners back to back read as spam to both people and the
                ranking that brings them. */}
            <p>
              {t.about2Before}
              <Link href={linkFor(locale, "/video-to-mp3-converter")} className={linkClass}>
                {t.about2Link}
              </Link>
              {t.about2After}
            </p>
            <p>
              {t.about3Before}
              <Link href="/terms" className={linkClass}>
                {t.about3Link}
              </Link>
              {t.about3After}
            </p>
          </div>
        </section>
        {/* The blog is English only for now. */}
        {locale === "en" && <BlogTeaser heading="Learn more about saving videos" posts={homePosts()} />}
        <NativeSlot slot="homeNative" className="px-4 py-8" />
        <Faq />
        <AdSlot slot="homeBottom" className="px-4 pb-10" label={dict.ads.label} />
      </main>
      <Footer />
    </>
  );
}
