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
        <section className="bg-gradient-to-b from-violet-50 to-white px-4 pb-14 pt-12 sm:pb-20 sm:pt-24 dark:from-violet-950/30 dark:to-neutral-950">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
              Free Online
              <br />
              <span className="text-violet-600 dark:text-violet-400">
                Video Downloader
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-neutral-600 dark:text-neutral-400">
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
                className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-neutral-700 backdrop-blur transition hover:border-violet-400 hover:text-violet-700 dark:border-white/10 dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:text-violet-300"
              >
                {t.navLabel}
              </Link>
            ))}
          </div>
        </section>
        <div className="px-4 py-6">
          <AdSlot slot="homeTop" />
        </div>
        <Platforms />
        <HowItWorks />
        <Bookmarklet />
        <div className="px-4 py-8">
          <AdSlot slot="homeMid" />
        </div>
        <section className="bg-neutral-50 py-12 sm:py-16 dark:bg-neutral-900/40">
          <div className="mx-auto max-w-3xl space-y-4 px-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            <h2 className="text-center text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
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
        <div className="px-4 pb-10">
          <AdSlot slot="homeBottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
