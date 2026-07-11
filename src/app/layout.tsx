import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeScript from "@/components/ThemeScript";
import TermsGate from "@/components/TermsGate";
import Analytics from "@/components/Analytics";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "Free Video Downloader - TikTok, Instagram & YouTube Videos",
  description:
    "Free online video downloader for TikTok, Instagram, Facebook, YouTube, X and more than 1,200 other sites. Save HD MP4 video or MP3 audio. No signup needed.",
  keywords: [
    "video downloader",
    "online video downloader",
    "download video",
    "video downloader free",
    "mp4 downloader",
    "video to mp3",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} | Free Online Video Downloader`,
    description:
      "Save videos in HD from TikTok, Instagram, Facebook, YouTube, X and more than 1,200 other sites. Free, with no login.",
    url: "/",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Free Online Video Downloader`,
    description:
      "Save videos in HD from TikTok, Instagram, Facebook, YouTube, X and more than 1,200 other sites.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-neutral-950">
        <ThemeScript />
        {children}
        <TermsGate />
        <Analytics />
      </body>
    </html>
  );
}
