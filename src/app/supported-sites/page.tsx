import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import AdSlot from "@/components/ads/AdSlot";
import SupportedSiteList from "@/components/SupportedSiteList";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SUPPORTED_SITES, SUPPORTED_SITES_BUILT, SUPPORTED_SITES_SOURCE } from "@/lib/supported-sites";

// Served fresh like the other pages that carry ad slots, so a unit reassigned
// in the panel is live here without waiting for a deploy.
export const dynamic = "force-dynamic";

const count = SUPPORTED_SITES.length;
// 1,094 reads as a number a person counted; 1094 reads as a product code.
const pretty = count.toLocaleString("en-US");
// The stamp is stored as a plain sortable date for the Dataset markup. People
// reading the page get it the way a person would say it.
const built = new Date(`${SUPPORTED_SITES_BUILT}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const metadata: Metadata = {
  title: `Supported Sites: All ${pretty} Sites PasteAndSave Can Download`,
  description: `The full list of ${pretty} websites PasteAndSave can save video and audio from, named one by one. Generated from the downloader itself, not a marketing number.`,
  alternates: { canonical: "/supported-sites" },
};

export default function SupportedSitesPage() {
  const url = `${SITE_URL.replace(/\/$/, "")}/supported-sites`;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How many sites does PasteAndSave support?",
              acceptedAnswer: {
                "@type": "Answer",
                text: `${pretty}. Every one of them is named on this page, so the number can be checked rather than taken on trust. The list is generated from the downloader PasteAndSave actually runs, and was last rebuilt on ${built}.`,
              },
            },
            {
              "@type": "Question",
              name: "What if the site I want is not on the list?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Paste the link anyway. Pages that use a plain video file or a common player often work even when the site has no entry of its own, so the list is a floor rather than a ceiling.",
              },
            },
            {
              "@type": "Question",
              name: "Does PasteAndSave cost anything?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Every site on this list is free to download from, with no account, no app and no limit on how many files you save.",
              },
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: `Websites ${SITE_NAME} can download from`,
          description: `A list of ${pretty} websites that ${SITE_NAME} can save video or audio from.`,
          url,
          license: "https://creativecommons.org/publicdomain/zero/1.0/",
          dateModified: SUPPORTED_SITES_BUILT,
          creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }}
      />
      <Header />
      <main>
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-10 sm:pt-16">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
            Every site PasteAndSave can download from
          </h1>
          <p className="mt-5 text-neutral-600 dark:text-neutral-400">
            PasteAndSave can save video or audio from {pretty} websites, and
            all {pretty} are named below. Most downloaders quote a number and
            leave it there. This one is built from the downloader we actually
            run, so you can look up the site you care about before you waste a
            click.
          </p>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Last rebuilt on {built} from {SUPPORTED_SITES_SOURCE}.
            Entries the tool reports as broken are left out, so the real number
            is a little higher than the one on this page. Adult sites work but
            are not listed here.
          </p>
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Got a link in your clipboard already?{" "}
            <Link href="/" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
              Paste it on the home page
            </Link>{" "}
            and pick a quality. There is nothing to install and nothing to sign up for.
          </p>
        </section>

        <AdSlot slot="homeTop" className="px-4 pb-6" />

        <section className="mx-auto max-w-5xl px-4 pb-10">
          <SupportedSiteList sites={SUPPORTED_SITES} />
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <div className="glass glass-hairline rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
              Not finding yours?
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Paste the link anyway. A page that plays a plain video file, or
              uses a player lots of sites share, usually works even with no
              entry of its own, so this list is a floor and not a ceiling. If a
              link does come back empty, it is almost always because the post is
              private or the video has been taken down.
            </p>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              The{" "}
              <Link href="/extension" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                browser extension
              </Link>{" "}
              goes a step further. It watches the page you are already on and
              lists the video and audio it finds there, which catches plenty of
              players that no list could name.
            </p>
          </div>
        </section>
        <AdSlot slot="homeBottom" className="px-4 pb-10" />
      </main>
      <Footer />
    </>
  );
}
