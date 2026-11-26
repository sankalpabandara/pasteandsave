import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import Analytics from "@/components/Analytics";
import { AdProvider } from "@/components/ads/AdProvider";
import PageScripts from "@/components/ads/PageScripts";
import StickyBanner from "@/components/ads/StickyBanner";
import SideRails from "@/components/ads/SideRails";
import { readSettings } from "@/lib/ads-store";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { dirOf } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display font for headings and the wordmark, modern, geometric, premium.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "Free Online Video Downloader - MP4 & MP3 from Any Link",
  description:
    "Paste a link to save video or audio from TikTok, Instagram, Facebook, X and 1,200+ other sites. Free HD MP4 and MP3, no login, nothing to install.",
  keywords: [
    "free video downloader",
    "online video downloader",
    "video downloader online",
    "free online video downloader",
    "download video from link",
    "download video online",
    "social media video downloader",
    "mp4 downloader",
    "free mp3 downloader",
    "video to mp3 converter",
    "hd video downloader",
    "video downloader no login",
  ],
  alternates: { canonical: "/" },
  authors: [{ name: "Sanketh Perera" }],
  creator: "Sanketh Perera",
  publisher: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} - Free Online Video Downloader`,
    description:
      "Paste a link and save video or audio from TikTok, Instagram, Facebook, X and more than 1,200 other sites. Free, HD, no login required.",
    url: "/",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Free Online Video Downloader`,
    description:
      "Paste a link and save video or audio from TikTok, Instagram, Facebook, X and more than 1,200 other sites.",
  },
  robots: { index: true, follow: true },
  other: {
    // Proves ownership of the domain for the Trustpilot business profile
    // (claimed 2026-10-26). Trustpilot reads it from the home page.
    "trustpilot-one-time-domain-verification-id": "3f4759c8-d951-418b-84ba-f2f30a94e9f9",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the browser so the first HTML already reserves a
  // box for every slot that will carry a banner, and nothing moves when the
  // banners arrive.
  const { snippets, adsterra, socialBar, popunder, interstitial, inPagePush, native } =
    await readSettings();
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${geistSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <AdProvider
          initialSnippets={snippets}
          initialAdsterraSizes={Object.keys(adsterra)}
          initialSocialBar={socialBar}
          initialPopunder={popunder}
          initialInterstitial={interstitial}
          initialInPagePush={inPagePush}
          initialNative={Boolean(native)}
        >
          {children}
          <PageScripts />
          <StickyBanner />
          <SideRails />
        </AdProvider>
        <Analytics />
      </body>
    </html>
  );
}
