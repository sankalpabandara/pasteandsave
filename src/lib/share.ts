// Passing the site on after a download.
//
// Every shared address carries ?from=<channel>, so a visit that arrives through
// one is counted against the channel it was sent on (see /api/track). Without
// that, a WhatsApp share and its visits are invisible: WhatsApp sends no
// referrer.
//
// No imports on purpose: the tests load this file directly.

export const SHARE_CHANNELS = ["whatsapp", "telegram", "facebook", "x", "copy", "native"] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export function isShareChannel(value: unknown): value is ShareChannel {
  return typeof value === "string" && (SHARE_CHANNELS as readonly string[]).includes(value);
}

export const SHARE_TEXT =
  "Free video downloader for TikTok, Instagram, YouTube, Facebook and X. Paste a link and save the video, no app and no sign up.";

/** The site's address as sent on one channel. */
export function sharedLink(siteUrl: string, via: ShareChannel): string {
  return `${siteUrl.replace(/\/+$/, "")}/?from=${via}`;
}

/** The page that opens a ready to send message, for the channels that have one. */
export function shareHref(siteUrl: string, via: ShareChannel): string | null {
  const link = encodeURIComponent(sharedLink(siteUrl, via));
  const text = encodeURIComponent(SHARE_TEXT);
  switch (via) {
    case "whatsapp":
      return `https://wa.me/?text=${text}%20${link}`;
    case "telegram":
      return `https://t.me/share/url?url=${link}&text=${text}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${link}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${text}&url=${link}`;
    default:
      return null;
  }
}
