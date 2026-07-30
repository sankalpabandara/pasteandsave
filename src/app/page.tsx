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
import { TOOL_PAGES } from "@/lib/seo-pages";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Rendered per request so the ad unit ids in the HTML are the ones currently
// saved in the admin panel. Prerendered, this page would ship whatever was
// configured at build time, and the network's verifier, which reads the HTML
// of this exact page, would be checking a stale id after any change.
export const dynamic = "force-dynamic";

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${SITE_NAME} Video Downloader`,
    url: SITE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online video downloader for TikTok, Instagram, Facebook, YouTube, X and more than 1,200 other sites. Download video from a link as MP4 or MP3.",
  },
];

export default function Home() {
  return (
    <>
      {JSON_LD.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Header />
      <main>
        <section className="px-4 pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="glass glass-hairline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              1,200+ sites · HD · MP3 · no signup
            </span>
            <h1 className="font-display mt-5 text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
              Free Online
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
                Video Downloader
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-neutral-600 dark:text-neutral-300">
              Paste a video link from TikTok, Instagram, Facebook, YouTube, X
              or any of 1,200+ other sites and download it as MP4 or MP3.
              Free, in HD, with no signup and no software to install.
            </p>
          </div>
          <div className="mt-8 sm:mt-10">
            <DownloaderForm />
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
            {TOOL_PAGES.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="glass glass-hairline rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:text-violet-700 dark:text-neutral-200 dark:hover:text-violet-300"
              >
                {t.navLabel}
              </Link>
            ))}
          </div>
        </section>
        <AdSlot slot="homeTop" className="px-4 py-6" />
        <Platforms />
        <HowItWorks />
        <Bookmarklet />
        <AdSlot slot="homeMid" className="px-4 py-8" />
        <section className="px-4 py-12 sm:py-16">
          <div className="glass glass-hairline mx-auto max-w-3xl space-y-4 rounded-3xl p-6 text-sm leading-relaxed text-neutral-600 sm:p-8 dark:text-neutral-300">
            <h2 className="font-display text-center text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
              Download video from a link, from any social media site
            </h2>
            <p>
              {SITE_NAME} is a free online video downloader that works with
              more than 1,200 websites. Paste a public link from TikTok,
              Instagram, Facebook, YouTube, X, Pinterest, Reddit, LinkedIn,
              Threads, Vimeo, SoundCloud or one of the smaller platforms. The
              site is detected for you, so there is no menu to pick from.
              Every available quality shows up in a list, from small SD files
              up to full HD and, where the source offers it, 4K. Files save
              as normal MP4s that play on any device, no separate MP4
              downloader software needed.
            </p>
            {/* In-content rather than stacked against another banner: a
                reader is already here and looking down the page, and two
                banners back to back read as spam to both people and the
                ranking that brings them. */}
            <p>
              If you only need the audio, each page here doubles as an MP3
              downloader. One button converts the video to MP3, encoded at
              the best bitrate the source offers, up to 320kbps. People use
              this to save TikTok sounds, YouTube music, podcasts and voice
              clips from Reels. There is also a dedicated{" "}
              <Link href="/video-to-mp3-converter" className="underline hover:text-neutral-900 dark:hover:text-white">
                video to MP3 converter
              </Link>{" "}
              for pasting a link straight to audio.
            </p>
            <p>
              The whole tool runs in the browser on iPhone, Android, Windows
              and Mac, with no login and no registration. Please only
              download content you own or have permission to use. Our{" "}
              <Link href="/terms" className="underline hover:text-neutral-900 dark:hover:text-white">
                Terms of Service
              </Link>{" "}
              explain the rules.
            </p>
          </div>
        </section>
        <Faq />
        <AdSlot slot="homeBottom" className="px-4 pb-10" />
      </main>
      <Footer />
    </>
  );
}
