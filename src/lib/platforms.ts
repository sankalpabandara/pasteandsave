// Display metadata for yt-dlp's most common extractor_key values. This is
// purely cosmetic (badge name + color), it does not gate which sites work.
// Anything not listed here still works and falls back to a generic badge
// built from the extractor's own name.
const KNOWN: Record<string, { name: string; color: string }> = {
  youtube: { name: "YouTube", color: "from-red-600 to-red-500" },
  instagram: { name: "Instagram", color: "from-pink-500 to-orange-400" },
  tiktok: { name: "TikTok", color: "from-neutral-800 to-neutral-950" },
  facebook: { name: "Facebook", color: "from-blue-600 to-blue-500" },
  twitter: { name: "X / Twitter", color: "from-neutral-900 to-black" },
  vimeo: { name: "Vimeo", color: "from-sky-500 to-cyan-500" },
  reddit: { name: "Reddit", color: "from-orange-500 to-orange-600" },
  pinterest: { name: "Pinterest", color: "from-red-500 to-rose-600" },
  soundcloud: { name: "SoundCloud", color: "from-orange-400 to-amber-500" },
  twitch: { name: "Twitch", color: "from-purple-600 to-purple-500" },
  dailymotion: { name: "Dailymotion", color: "from-sky-600 to-blue-600" },
  bilibili: { name: "Bilibili", color: "from-pink-400 to-sky-400" },
  vk: { name: "VK", color: "from-blue-700 to-blue-600" },
  threads: { name: "Threads", color: "from-neutral-900 to-black" },
  bsky: { name: "Bluesky", color: "from-sky-500 to-blue-500" },
  tumblr: { name: "Tumblr", color: "from-indigo-700 to-indigo-600" },
  streamable: { name: "Streamable", color: "from-blue-500 to-indigo-500" },
  rumble: { name: "Rumble", color: "from-green-600 to-green-500" },
  bandcamp: { name: "Bandcamp", color: "from-cyan-600 to-teal-600" },
  mixcloud: { name: "Mixcloud", color: "from-blue-500 to-cyan-500" },
  imgur: { name: "Imgur", color: "from-green-500 to-teal-500" },
  linkedin: { name: "LinkedIn", color: "from-blue-700 to-blue-600" },
  snapchat: { name: "Snapchat", color: "from-yellow-400 to-yellow-500" },
  ok: { name: "Odnoklassniki", color: "from-orange-500 to-red-500" },
};

export function detectPlatform(extractorKey: string | null | undefined) {
  if (!extractorKey) return { name: "this link", color: "from-neutral-500 to-neutral-600" };
  const key = extractorKey.toLowerCase();
  const match = Object.entries(KNOWN).find(([k]) => key.startsWith(k));
  if (match) return match[1];
  // Fall back to yt-dlp's own name, split on capitals: "OdnoklassnikiEmbed" -> "Odnoklassniki Embed"
  const name = extractorKey.replace(/([a-z])([A-Z])/g, "$1 $2");
  return { name, color: "from-violet-500 to-fuchsia-500" };
}
