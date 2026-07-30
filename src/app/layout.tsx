import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import Analytics from "@/components/Analytics";
import { AdProvider } from "@/components/ads/AdProvider";
import { readSettings } from "@/lib/ads-store";
import { SITE_NAME, SITE_URL } from "@/lib/site";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the browser so the banners are part of the HTML
  // the server sends. The ad network verifies a unit by fetching the page and
  // looking for its data-aa attribute without running any JavaScript, so
  // configuration that only arrived via a client fetch left it finding
  // nothing, and an unverified unit earns nothing.
  const { units, snippets } = await readSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <AdProvider initialUnits={units} initialSnippets={snippets}>
          {children}
        </AdProvider>
        <Analytics />
      </body>
    </html>
  );
}
