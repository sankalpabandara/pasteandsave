import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy - PasteAndSave Video Downloader",
  description:
    "How PasteAndSave handles the links you submit, server logs, IP addresses, cookies, analytics and data retention.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "July 25, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Privacy Policy",
          description:
            "How PasteAndSave handles submitted links, server logs, IP addresses, cookies, analytics and data retention.",
          url: `${SITE_URL.replace(/\/$/, "")}/privacy`,
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        }}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="font-display text-2xl font-extrabold text-neutral-900 sm:text-3xl dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="The short version">
          <p>
            {SITE_NAME} has no accounts, so there is nothing to sign up for and
            no profile attached to what you download. Downloading is done by our
            server, not inside your browser, which means the link you paste is
            sent to us and the file passes through our machine on its way to
            you. We keep the file only as long as the download takes.
          </p>
        </Section>

        <Section title="Links you submit">
          <p>
            When you paste a link, it is sent to our server so the video can be
            looked up and fetched. We do not store a permanent record of the
            links people submit. A recent lookup is held in memory for about ten
            minutes so that pasting the same link again is fast, after which it
            is discarded.
          </p>
          <p>
            We do not sign in to any platform on your behalf and never ask for
            your social media password. Anything that requires a login to view
            cannot be downloaded here.
          </p>
        </Section>

        <Section title="The downloaded file">
          <p>
            The file is written to a temporary folder on the server, streamed to
            your browser, and then deleted. Files left behind by a failed or
            abandoned download are removed automatically, and nothing is kept
            for longer than about fifteen minutes. We do not keep copies, and we
            do not inspect the contents of what you download.
          </p>
        </Section>

        <Section title="Server logs and IP addresses">
          <p>
            Like any web server, ours records requests. Your IP address is used
            to apply rate limits, which is what stops one person from
            overwhelming the service for everyone else. Error logs record the
            website a request was aimed at and what went wrong, so problems can
            be diagnosed.
          </p>
          <p>
            Logs are kept only for operating and troubleshooting the service,
            and are not used to build a profile of you or sold to anyone.
          </p>
        </Section>

        <Section title="Proxy providers">
          <p>
            Some sites block requests coming from data centres. For those, our
            server routes the request through a third-party residential proxy
            provider so the download can complete. The proxy sees the address of
            the media being fetched, as any network provider in the path would.
            It does not receive your IP address, because the request is made by
            our server rather than by your browser.
          </p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            We do not use tracking cookies. Your browser stores a small amount
            of information locally to remember your choices, such as light or
            dark mode and whether you have accepted the terms notice. That stays
            on your device.
          </p>
        </Section>

        <Section title="Analytics and advertising">
          <p>
            We use Google Analytics to understand which pages are visited and
            roughly where visitors come from. It sets its own cookies and
            processes data under Google&apos;s privacy policy. The site also
            displays advertising, which is served in a frame by the ad provider.
          </p>
          <p>
            You can block analytics and advertising with any standard browser
            content blocker, and the downloader will keep working.
          </p>
        </Section>

        <Section title="Data retention in summary">
          <ul className="list-disc space-y-1 pl-5">
            <li>Submitted links: cached in memory for about ten minutes.</li>
            <li>Downloaded files: deleted after delivery, within fifteen minutes at most.</li>
            <li>Server and error logs: kept for operating the service.</li>
            <li>Accounts, download history, payment details: none, because there are none.</li>
          </ul>
        </Section>

        <Section title="Your choices">
          <p>
            Because there is no account and no stored history, there is no
            profile to export or delete. If you believe a specific log entry
            relates to you and you want it removed, get in touch and we will
            look into it.
          </p>
        </Section>

        <Section title="Children">
          <p>
            This service is not directed at children and we do not knowingly
            collect information from them.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, the date at the top of the page changes with
            it. Continuing to use the site after a change means the updated
            policy applies.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For any privacy question, or a request about the handling of your
            data, contact us at{" "}
            <a
              href="mailto:sankalpabandara09@gmail.com"
              className="text-violet-600 hover:underline dark:text-violet-400"
            >
              sankalpabandara09@gmail.com
            </a>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
