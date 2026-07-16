import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import TermsGate from "@/components/TermsGate";
import Analytics from "@/components/Analytics";
import { AdProvider } from "@/components/ads/AdProvider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headings and the wordmark — modern, geometric, premium.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "Free Online Video Downloader - Download MP4 & MP3 from Any Link",
  description:
    "Paste a link and save video or audio from TikTok, Instagram, Facebook, X and more than 1,200 other sites. Free video downloader with HD MP4 and MP3 output, no login and no software to install.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <AdProvider>{children}</AdProvider>
        <TermsGate />
        <Analytics />
      </body>
    </html>
  );
}
