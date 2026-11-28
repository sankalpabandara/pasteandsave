import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Header from "@/components/Header";
import AdSlot from "@/components/ads/AdSlot";

// Rendered per request, like the homepage, so the ad unit ids in the markup
// are the ones currently saved. Prerendered, this page shipped whatever was
// configured at build time, and the network's verifier reads this exact
// page, so a unit reassigned here would stay "not found" until the next
// deploy, for no reason the panel could show.
export const dynamic = "force-dynamic";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Browser Extension: Download Videos While You Browse",
  description:
    "Get the free PasteAndSave extension for Chrome and Firefox. It spots video and audio on the page you are on and saves it in one click, or sends it here.",
  alternates: { canonical: "/extension" },
};

const FEATURES = [
  {
    title: "Download without leaving the page",
    body: "A Download now button sits on the corner of any real video. Press it and the quality list opens right there, 1080p, 720p, 360p, MP3, with sizes. Pick one and it saves to your downloads folder while you carry on watching. No new tab, no copying links.",
  },
  {
    title: "YouTube, TikTok, Instagram and more",
    body: "On any supported video page, hit the extension and it hands the link to PasteAndSave, which fetches the real file, YouTube included. One button, no copying links, works across 1,000+ sites.",
  },
  {
    title: "Finds media on its own",
    body: "While a page loads, the extension quietly notices every video and audio file it fetches. A small badge on the toolbar icon counts what it found, and one action saves every video on the page at once.",
  },
  {
    title: "Off whenever you want it off",
    body: "A switch in the popup stops the extension on a site completely, the in-page button and the traffic watching both go quiet, subdomains included. Turn it back on in the same place, no reload needed.",
  },
  {
    title: "One click to save",
    body: "Open the popup and every file found on the page is listed with its type and size. Plain MP4, WebM or MP3 files download straight through your browser with their proper names.",
  },
  {
    title: "Streams go through the site",
    body: "Some players split video into hundreds of tiny pieces that are useless on their own. The extension recognises those and opens PasteAndSave with the link ready, so you still get one whole file.",
  },
  {
    title: "It stays out of the way",
    body: "The in-page button keeps its styling inside a shadow root and never touches the page's own markup, so nothing it does can shift a layout or clash with a site's design. Turn it off for a site and it disappears entirely.",
  },
  {
    title: "Right-click anywhere",
    body: "Every page, link, video and audio element gets a Save with PasteAndSave entry in the right-click menu. Handy when you want to grab something without opening the popup.",
  },
  {
    title: "Filters, Save all and MP3",
    body: "Narrow the list to video, audio or streams with one tap. Save all grabs every plain file at once, and the note button fetches just the audio of any video as an MP3.",
  },
  {
    title: "Keyboard shortcut",
    body: "Press Alt+Shift+S on any page and it opens here with the link already loaded. You can also set your own minimum file size so tiny clips never clutter the list.",
  },
];

// Measured from the file that is actually served, so the figure can't drift
// out of date the next time the extension is rebuilt.
function zipSizeLabel(): string {
  try {
    const bytes = fs.statSync(
      path.join(process.cwd(), "public", "pasteandsave-extension.zip"),
    ).size;
    return `${Math.round(bytes / 1024)} KB`;
  } catch {
    return "small";
  }
}

const CHROME_STEPS = [
  "Download the extension and unzip it anywhere you like.",
  "Open chrome://extensions in a new tab.",
  "Turn on Developer mode with the switch in the top right corner.",
  "Click Load unpacked and pick the unzipped folder. The icon appears next to the address bar.",
];

// Mozilla reviewed and published the add-on on 1 November 2026, and the copy
// they host is the same build as the zip here, YouTube included, because
// Mozilla's rules allow it where Chrome's do not. So Firefox users get a
// proper one click install that survives a restart and updates itself, and
// the sideload instructions they used to need are gone.
export const FIREFOX_ADDON_URL =
  "https://addons.mozilla.org/en-US/firefox/addon/pasteandsave-video-downloader/";

// Google published the extension too, but the copy they host has YouTube
// switched off for good, because the Chrome Web Store does not accept an
// extension that saves YouTube videos (build-store.mjs is what takes it out).
// So Chrome gets both routes and is told plainly which one does what, rather
// than being sent to a store listing that quietly cannot do the thing most
// people came for.
export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/pasteandsave-video-downlo/pfagibejkjibihkkmkeabianjndeannf";

const FIREFOX_STEPS = [
  "Open the add-on page on Mozilla's site with the button above.",
  "Click Add to Firefox, then Add again when Firefox asks.",
  "The icon appears next to the address bar and stays there.",
];

export default function ExtensionPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: `${SITE_NAME} Browser Extension`,
          operatingSystem: "Chrome, Firefox, Edge",
          applicationCategory: "BrowserApplication",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          url: `${SITE_URL.replace(/\/$/, "")}/extension`,
          // The two store listings are the pages that vouch for this
          // extension from outside, so they are named here as well as linked
          // below: ask an assistant for a video downloader extension and the
          // answer comes back as a list of store pages.
          downloadUrl: CHROME_STORE_URL,
          installUrl: CHROME_STORE_URL,
          sameAs: [CHROME_STORE_URL, FIREFOX_ADDON_URL],
          softwareVersion: "2.4.0",
        }}
      />
      <Header />
      <main>
        <section className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:pt-16">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
            Download videos{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
              while you browse
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-neutral-600 dark:text-neutral-400">
            The PasteAndSave extension watches the page you are on and lists
            every video and audio file it finds. Save them in one click, with
            no copying links and no switching tabs.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={CHROME_STORE_URL}
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
            >
              Add to Chrome
            </a>
            <a
              href={FIREFOX_ADDON_URL}
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
            >
              Add to Firefox
            </a>
          </div>
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            One click, no account, no tracking.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-neutral-700 dark:text-neutral-300">
            The Chrome store version cannot save from YouTube, which is
            Google&apos;s rule, not ours. For YouTube on Chrome,{" "}
            <a
              href="/pasteandsave-extension.zip"
              download
              className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
            >
              download the {zipSizeLabel()} zip
            </a>{" "}
            instead. Firefox saves from YouTube either way.
          </p>
        </section>

        <AdSlot slot="extensionTop" className="px-4 py-6" />

        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
            What it does
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass glass-hairline rounded-2xl p-6">
                <h3 className="font-semibold dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-center text-xl font-bold sm:text-3xl dark:text-white">
            How to install
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-neutral-600 dark:text-neutral-400">
            It is on both stores, one click either way. The Chrome copy leaves
            YouTube alone, because Google does not allow it there, so the zip
            on this page is the one to use if YouTube is what you came for.
            Firefox has no such rule and gets everything.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="glass glass-hairline rounded-2xl p-6">
              <h3 className="font-semibold dark:text-white">
                Chrome, Edge and Brave
              </h3>
              <a
                href={CHROME_STORE_URL}
                rel="noopener"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Add to Chrome
              </a>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                One click, and it updates on its own. The copy Google hosts
                leaves YouTube alone, which is their rule and not ours. For
                YouTube on Chrome, use the zip from the top of this page:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                {CHROME_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div className="glass glass-hairline rounded-2xl p-6">
              <h3 className="font-semibold dark:text-white">Firefox</h3>
              <a
                href={FIREFOX_ADDON_URL}
                rel="noopener"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Add to Firefox
              </a>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                {FIREFOX_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Mozilla reviewed this build and hosts it themselves, so it
                stays installed and updates on its own. It is the same
                extension as the zip above, YouTube included.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 pb-16">
          <div className="glass glass-hairline glass-sheen rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
              Private by design
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              The extension itself collects nothing. It does not add analytics,
              does not phone home, and never sees a page until you visit one.
              Finding media happens locally in your browser. When you send a
              link here, our server fetches that video for you, so the link and
              your request reach us the same way they would if you pasted it on
              the site. Nothing else is sent. Every so often, saving a file also
              opens our home page in a background tab, the site that keeps this
              free; it is a plain page load, and nothing about what you saved
              goes with it. The source is plain readable JavaScript inside the
              zip, so you can check every line before installing.
            </p>
          </div>
        </section>
        <AdSlot slot="extensionBottom" className="px-4 pb-10" />
      </main>
      <Footer />
    </>
  );
}
