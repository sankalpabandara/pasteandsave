import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service - PasteAndSave Video Downloader",
  description:
    "Read the PasteAndSave Terms of Service: acceptable use, your responsibilities, our copyright and DMCA policy, disclaimers, and the rules for using the video downloader.",
};

const LAST_UPDATED = "July 11, 2026";

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

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-2xl font-extrabold text-neutral-900 sm:text-3xl dark:text-white">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          This is a general-purpose template, not legal advice. It has not
          been reviewed by a lawyer for your specific jurisdiction or
          business. Replace the bracketed placeholders below and have an
          attorney review this before relying on it.
        </div>

        <Section title="1. Agreement to Terms">
          <p>
            These Terms of Service (&quot;Terms&quot;) form a binding
            agreement between you (&quot;you&quot; or &quot;User&quot;) and
            PasteAndSave (&quot;PasteAndSave,&quot; &quot;we,&quot; &quot;us,&quot; or
            &quot;the Service&quot;). By accessing or using the Service, you
            agree to be bound by these Terms. If you do not agree, do not use
            the Service.
          </p>
        </Section>

        <Section title="2. What the Service Does">
          <p>
            PasteAndSave lets you paste a public link and retrieve available
            download formats for that content using third-party, open-source
            tooling. PasteAndSave does not host, store, curate, or claim any
            ownership over the content you download. All content remains the
            property of its respective owners and is subject to the terms of
            the site it came from.
          </p>
        </Section>

        <Section title="3. Your Responsibilities and Representations">
          <p>By using the Service, you represent and warrant that:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You own the content you download, or you have obtained all
              necessary rights, licenses, and permissions to download and use
              it for your intended purpose.
            </li>
            <li>
              Your use of the Service complies with the Terms of Service of
              the site the content came from, as well as all applicable
              local, state, national, and international laws, including
              copyright, trademark, privacy, and publicity laws.
            </li>
            <li>
              You are solely responsible for how you use any content you
              download. PasteAndSave is not responsible for, and takes no part
              in, that decision.
            </li>
            <li>
              You will not use the Service to infringe intellectual property
              rights, harass or impersonate others, distribute malware, or
              engage in any unlawful activity.
            </li>
            <li>You are at least 13 years old (or the age of digital consent in your jurisdiction).</li>
          </ul>
        </Section>

        <Section title="4. Prohibited Uses">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Use the Service to download content you don&apos;t have the
              right to download, or to redistribute, sell, or publicly
              re-host downloaded content without authorization from its
              rights holder.
            </li>
            <li>
              Circumvent, disable, or interfere with any rate-limiting,
              security, or access-control feature of the Service or of any
              third-party site it interacts with.
            </li>
            <li>
              Use automated means (bots, scripts, scrapers) to access the
              Service at a volume or frequency a human user would not
              generate, without our prior written consent.
            </li>
            <li>
              Use the Service in any way that could disable, overburden, or
              impair it, or that violates any applicable law.
            </li>
          </ul>
        </Section>

        <Section title="5. No Affiliation">
          <p>
            PasteAndSave is an independent tool and is not affiliated with,
            endorsed by, or sponsored by any of the third-party platforms it
            can retrieve links from. All trademarks and platform names
            referenced are the property of their respective owners.
          </p>
        </Section>

        <Section title="6. Copyright Complaints / Takedown Requests">
          <p>
            PasteAndSave respects the intellectual property rights of others. If
            you believe content accessible through the Service infringes
            your copyright, or that the Service itself is being used to
            facilitate infringement of your work, contact us at{" "}
            <span className="font-medium">[YOUR DMCA/ABUSE CONTACT EMAIL]</span>{" "}
            with:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>A description of the copyrighted work you claim is infringed;</li>
            <li>The specific link or material at issue;</li>
            <li>Your contact information;</li>
            <li>
              A statement that you have a good-faith belief the use is not
              authorized, and that the information in your notice is
              accurate, under penalty of perjury.
            </li>
          </ul>
          <p>
            We will review and respond to valid notices, which may include
            restricting access to the reported functionality.
          </p>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
            AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            NON-INFRINGEMENT, OR AVAILABILITY. WE DO NOT WARRANT THAT THE
            SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DOWNLOADED
            CONTENT WILL BE ACCURATE, COMPLETE, OR LAWFUL FOR YOUR INTENDED
            USE.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SNAPGRAB AND ITS
            OPERATORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
            DATA, PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE
            SERVICE OR ANY CONTENT YOU DOWNLOAD THROUGH IT, EVEN IF ADVISED
            OF THE POSSIBILITY OF SUCH DAMAGES. TO THE EXTENT ANY LIABILITY
            CANNOT BE EXCLUDED, OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS
            WILL NOT EXCEED [USD $0 / THE AMOUNT YOU PAID US IN THE PAST 12
            MONTHS, WHICH IS $0 FOR A FREE SERVICE].
          </p>
        </Section>

        <Section title="9. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless PasteAndSave, its
            operators, and affiliates from and against any claims,
            liabilities, damages, losses, and expenses (including reasonable
            legal fees) arising out of or in any way connected with: (a) your
            use or misuse of the Service; (b) content you download, use, or
            redistribute; (c) your violation of these Terms; or (d) your
            violation of any third party&apos;s rights, including
            intellectual property rights.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            We may suspend or terminate your access to the Service at any
            time, with or without notice, for conduct that we believe
            violates these Terms or is otherwise harmful to the Service, its
            users, or third parties.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the
            Service after changes take effect constitutes acceptance of the
            revised Terms. We will update the &quot;Last updated&quot; date
            above when changes are made.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms are governed by the laws of{" "}
            <span className="font-medium">[YOUR JURISDICTION, e.g. &quot;the State of Delaware, USA&quot;]</span>,
            without regard to its conflict-of-laws principles. Any dispute
            arising from these Terms or the Service will be resolved in the
            courts located in{" "}
            <span className="font-medium">[YOUR VENUE]</span>, and you
            consent to that jurisdiction.
          </p>
        </Section>

        <Section title="13. Severability">
          <p>
            If any provision of these Terms is found unenforceable, the
            remaining provisions will remain in full effect, and the
            unenforceable provision will be modified to the minimum extent
            necessary to make it enforceable.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Questions about these Terms can be sent to{" "}
            <span className="font-medium">[YOUR CONTACT EMAIL]</span>.
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
