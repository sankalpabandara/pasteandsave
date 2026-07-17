import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Browser Extension - Download Videos While You Browse",
  description:
    "Get the free PasteAndSave extension for Chrome and Firefox. It spots video and audio on the page you are on and saves it in one click, or sends it here.",
  alternates: { canonical: "/extension" },
};

const FEATURES = [
  {
    title: "Finds media on its own",
    body: "While a page loads, the extension quietly notices every video and audio file it fetches. A small badge on the toolbar icon counts what it found. Nothing is drawn over the page itself.",
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
    title: "Right-click anywhere",
    body: "Every page, link, video and audio element gets a Save with PasteAndSave entry in the right-click menu. Handy when you want to grab something without opening the popup.",
  },
];

const CHROME_STEPS = [
  "Download the extension and unzip it anywhere you like.",
  "Open chrome://extensions in a new tab.",
  "Turn on Developer mode with the switch in the top right corner.",
  "Click Load unpacked and pick the unzipped folder. The icon appears next to the address bar.",
];

const FIREFOX_STEPS = [
  "Download the extension and unzip it.",
  "Open about:debugging#/runtime/this-firefox in a new tab.",
  "Click Load Temporary Add-on.",
  "Pick the manifest.json file inside the unzipped folder.",
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
        }}
      />
      <Header />
      <main>
        <section className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:pt-16">
          <span className="glass glass-hairline inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free · Chrome · Firefox · Edge
          </span>
          <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
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
              href="/pasteandsave-extension.zip"
              download
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
            >
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                <path d="M20 9.5 V22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <path d="M14.3 16.7 L20 22.6 L25.7 16.7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 27.5 H28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Download the extension
            </a>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              31 KB zip · no account · no tracking
            </span>
          </div>
        </section>

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
            The extension installs from this site rather than the web stores,
            because store rules do not allow YouTube downloads. It takes about
            a minute either way.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="glass glass-hairline rounded-2xl p-6">
              <h3 className="font-semibold dark:text-white">
                Chrome, Edge and Brave
              </h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                {CHROME_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div className="glass glass-hairline rounded-2xl p-6">
              <h3 className="font-semibold dark:text-white">Firefox</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                {FIREFOX_STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Firefox removes temporary add-ons when it closes, so you may
                need to load it again after a restart.
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
              The extension runs entirely in your browser. It does not collect
              analytics, does not phone home, and never sees a page until you
              visit one. The only network request it ever makes on its own is
              opening pasteandsave.com when you ask it to. The source is plain
              readable JavaScript inside the zip, so you can check every line
              before installing.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
