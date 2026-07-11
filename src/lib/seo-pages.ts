// Copy for the per-platform landing pages. Written to read like a person
// wrote it: short sentences, no em dashes, no stacked "no X, no Y, no Z"
// constructions. Keep it that way when editing.

export type Faq = { q: string; a: string };

export type ToolPage = {
  slug: string;
  /** Short name used in nav/footer links */
  navLabel: string;
  /** <title> — complete, no template applied */
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  tagline: string;
  placeholder: string;
  badge: { label: string; color: string };
  features: { title: string; body: string }[];
  stepsHeading: string;
  steps: { title: string; body: string }[];
  deviceNote: string;
  faqs: Faq[];
};

export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "tiktok-video-downloader",
    navLabel: "TikTok",
    title: "TikTok Video Downloader - Save TikTok Videos Without Watermark",
    description:
      "Save TikTok videos without the watermark in HD. Paste the link and download MP4 video or MP3 audio for free. Works on iPhone, Android and PC.",
    keywords: [
      "tiktok video downloader",
      "download tiktok video",
      "tiktok downloader without watermark",
      "tiktok no watermark",
      "save tiktok video",
      "tiktok to mp3",
      "tiktok mp4 download",
    ],
    h1: "TikTok Video Downloader",
    tagline:
      "Save any public TikTok video in HD with no watermark on the file. It runs in your browser and you never sign in.",
    placeholder: "Paste a TikTok video link here",
    badge: { label: "TikTok", color: "from-neutral-800 to-neutral-950" },
    features: [
      {
        title: "No watermark",
        body: "The saved video is clean. You will not see the TikTok logo or the username overlay on the file.",
      },
      {
        title: "HD MP4 quality",
        body: "You get the best quality TikTok offers for that video, saved as a normal MP4.",
      },
      {
        title: "TikTok to MP3",
        body: "If you only need the sound, download the audio track as an MP3 instead.",
      },
      {
        title: "Free to use",
        body: "There are no limits and no account. Open the page, paste the link and download.",
      },
    ],
    stepsHeading: "How to download a TikTok video",
    steps: [
      {
        title: "Copy the link",
        body: "Open TikTok, tap Share on the video, then tap Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Come back to this page, paste the link in the box and press Download.",
      },
      {
        title: "Save the file",
        body: "Pick MP4 or MP3. The file lands in your downloads folder.",
      },
    ],
    deviceNote:
      "The downloader runs in the browser, so it works the same on iPhone, Android, Windows and Mac. There is nothing to install.",
    faqs: [
      {
        q: "How do I download a TikTok video without the watermark?",
        a: "Copy the video link from the TikTok app under Share, then Copy Link. Paste it in the box above and choose an MP4 option. The saved file has no TikTok watermark.",
      },
      {
        q: "Is this TikTok downloader free?",
        a: "It is free with no download limits. You do not need an account or an app.",
      },
      {
        q: "Can I download TikTok videos on iPhone?",
        a: "Open this page in Safari, paste the link and download. The video goes to the Files app on iOS 13 and newer. From there you can move it to Photos.",
      },
      {
        q: "Can I convert TikTok to MP3?",
        a: "After you paste a link, use the Save as MP3 button. Only the audio track downloads, saved as an MP3 file.",
      },
      {
        q: "Can I download private TikTok videos?",
        a: "No. The tool sees the same content as a logged out browser, so only public videos work.",
      },
      {
        q: "Where are downloaded TikTok videos saved?",
        a: "In your browser's normal download location. That is the Downloads folder on PC and Android, or the Files app on iPhone.",
      },
      {
        q: "Do I need to install an app or extension?",
        a: "No. The whole tool works inside your web browser on any device.",
      },
    ],
  },
  {
    slug: "instagram-video-downloader",
    navLabel: "Instagram",
    title: "Instagram Video Downloader - Save Reels, Stories, Photos HD",
    description:
      "Download Instagram videos, Reels, Stories and photos in HD. Free online Instagram downloader that works on iPhone, Android and PC. No login needed.",
    keywords: [
      "instagram video downloader",
      "download instagram video",
      "instagram reels download",
      "instagram story downloader",
      "instagram photo downloader",
      "save instagram video",
      "ig video download",
    ],
    h1: "Instagram Video Downloader",
    tagline:
      "Save Instagram videos, Reels, Stories and photos in HD. You never sign in and there is nothing to install.",
    placeholder: "Paste an Instagram video, Reel or post link here",
    badge: { label: "Instagram", color: "from-pink-500 to-orange-400" },
    features: [
      {
        title: "Reels, videos and photos",
        body: "One tool covers Instagram Reels, feed videos, photo posts and public Stories.",
      },
      {
        title: "Full HD quality",
        body: "Files download in the highest resolution Instagram serves, up to 1080p.",
      },
      {
        title: "No login needed",
        body: "You never enter your Instagram account. The tool only reaches public content.",
      },
      {
        title: "MP3 audio option",
        body: "You can pull just the audio from any Reel as an MP3. Useful for original sounds.",
      },
    ],
    stepsHeading: "How to download an Instagram video",
    steps: [
      {
        title: "Copy the link",
        body: "Tap the three dots menu or the Share icon on the post or Reel, then choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Pick a quality",
        body: "Choose a resolution and the MP4 saves to your device. MP3 is there too if you want audio only.",
      },
    ],
    deviceNote:
      "Works on iPhone, Android, Windows and Mac in any modern browser. No app, no extension and no Instagram login.",
    faqs: [
      {
        q: "How do I download an Instagram Reel?",
        a: "Copy the Reel's link from the Share menu, paste it in the box above and choose an MP4 quality. The Reel saves as a normal video file.",
      },
      {
        q: "Can I download Instagram Stories?",
        a: "Public Stories work while they are live. Paste the story link the same way. Stories from private accounts are not reachable.",
      },
      {
        q: "Does this work without logging in to Instagram?",
        a: "Yes. You never sign in. The tool only sees content that is publicly visible.",
      },
      {
        q: "Can I download Instagram photos too?",
        a: "Paste a photo post link and you get the image in full resolution.",
      },
      {
        q: "Is there a limit on downloads?",
        a: "No. The tool is free and there are no daily caps.",
      },
      {
        q: "Can I save Instagram videos on iPhone?",
        a: "Yes. Use Safari, paste the link and download. The file arrives in the Files app and you can move it to Photos afterwards.",
      },
      {
        q: "Why does a private post fail?",
        a: "The downloader sees Instagram like a logged out visitor. Private and follower-only content is out of reach by design.",
      },
    ],
  },
  {
    slug: "instagram-reels-downloader",
    navLabel: "Reels",
    title: "Instagram Reels Downloader - Save Reels as HD MP4 Free",
    description:
      "Download Instagram Reels as HD MP4 files for free. Paste the Reel link and save it to your phone or computer. No login and no app required.",
    keywords: [
      "instagram reels downloader",
      "download reels",
      "reels video download",
      "save instagram reels",
      "reels to mp4",
      "reels to mp3",
    ],
    h1: "Instagram Reels Downloader",
    tagline:
      "Save Instagram Reels as HD MP4 files. Paste the link and the download is ready in a few seconds.",
    placeholder: "Paste an Instagram Reel link here",
    badge: { label: "Reels", color: "from-fuchsia-500 to-pink-500" },
    features: [
      {
        title: "HD MP4 Reels",
        body: "Reels save in their original quality as standard MP4 files that play anywhere.",
      },
      {
        title: "Audio as MP3",
        body: "You can grab the sound from any Reel as a separate MP3 file.",
      },
      {
        title: "Quick lookup",
        body: "Paste the link and the quality options appear in a few seconds.",
      },
      {
        title: "Nothing to install",
        body: "The tool is browser based. It works on iPhone, Android and desktop without an app or login.",
      },
    ],
    stepsHeading: "How to save a Reel",
    steps: [
      {
        title: "Copy the Reel link",
        body: "In Instagram, tap the Share icon on the Reel and choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Save the MP4",
        body: "Pick a quality and the Reel downloads to your device.",
      },
    ],
    deviceNote:
      "Reels download on iOS, Android, Windows and Mac. Everything happens in the browser.",
    faqs: [
      {
        q: "How do I save an Instagram Reel to my phone?",
        a: "Copy the Reel link from the Share menu, paste it above and choose MP4. The file goes to your downloads, and from there you can move it to your gallery or Photos app.",
      },
      {
        q: "Do downloaded Reels have a watermark?",
        a: "The file saves exactly as Instagram serves it. This tool never adds a watermark or logo of its own.",
      },
      {
        q: "Can I download just the audio from a Reel?",
        a: "Yes. Use the Save as MP3 button after you paste the link.",
      },
      {
        q: "Can I download Reels from private accounts?",
        a: "No. Only Reels that are publicly visible will work.",
      },
      {
        q: "Is this Reels downloader free?",
        a: "It is free, with no limits and no signup.",
      },
      {
        q: "What quality do Reels download in?",
        a: "The highest quality Instagram provides for that Reel. In most cases that is 1080p.",
      },
    ],
  },
  {
    slug: "facebook-video-downloader",
    navLabel: "Facebook",
    title: "Facebook Video Downloader - Download FB Videos in HD 1080p",
    description:
      "Free Facebook video downloader. Save Facebook videos, Reels and Watch clips as HD 1080p MP4 files. Works on iPhone, Android and PC without a login.",
    keywords: [
      "facebook video downloader",
      "download facebook video",
      "fb video download",
      "facebook video download hd",
      "facebook reels download",
      "save facebook video",
      "fb downloader",
    ],
    h1: "Facebook Video Downloader",
    tagline:
      "Download Facebook videos and Reels in HD up to 1080p. Free, fast and it runs in your browser.",
    placeholder: "Paste a Facebook video or Reel link here",
    badge: { label: "Facebook", color: "from-blue-600 to-blue-500" },
    features: [
      {
        title: "HD 1080p quality",
        body: "Save Facebook videos in the best quality available, up to full HD 1080p.",
      },
      {
        title: "Videos, Reels and Watch",
        body: "Feed videos, Facebook Reels and Facebook Watch links all work, including short fb.watch links.",
      },
      {
        title: "MP4 and MP3",
        body: "Download the video as an MP4 file, or take just the audio track as an MP3.",
      },
      {
        title: "No login required",
        body: "Public videos download anonymously. You never enter your Facebook account.",
      },
    ],
    stepsHeading: "How to download a Facebook video",
    steps: [
      {
        title: "Copy the video link",
        body: "On the Facebook video, tap Share and then Copy Link. Short fb.watch links work too.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Choose a quality",
        body: "Pick HD or a smaller file and the MP4 saves to your device.",
      },
    ],
    deviceNote:
      "Use it on iPhone, Android, Windows or Mac. There is no software to install and no account to create.",
    faqs: [
      {
        q: "How do I download a Facebook video in HD?",
        a: "Paste the video link above and pick the highest resolution MP4 in the list. For most videos that is 720p or 1080p.",
      },
      {
        q: "Do fb.watch links work?",
        a: "Yes. Short fb.watch links and full facebook.com links are both fine.",
      },
      {
        q: "Can I download videos from private groups or friends-only posts?",
        a: "No. Only videos that are publicly visible can be downloaded.",
      },
      {
        q: "Can I download Facebook Reels?",
        a: "Yes. Paste the Reel link the same way you would a normal video.",
      },
      {
        q: "Why do some HD options say no audio?",
        a: "Facebook sometimes stores its best video track and the audio separately. Pick an option marked with audio, or the tool merges the two when it can.",
      },
      {
        q: "Is this Facebook downloader free?",
        a: "Yes. There is no registration and no download cap.",
      },
      {
        q: "Does it work on iPhone?",
        a: "It does. Open this page in Safari, paste the link and save. The file lands in the Files app.",
      },
    ],
  },
  {
    slug: "youtube-video-downloader",
    navLabel: "YouTube",
    title: "YouTube Video Downloader - Save YouTube Videos as HD MP4",
    description:
      "Download YouTube videos as HD MP4 files. Free online YouTube downloader with a full list of quality options. Shorts links work too. No registration.",
    keywords: [
      "youtube video downloader",
      "download youtube video",
      "youtube downloader hd",
      "youtube to mp4",
      "save youtube video",
      "youtube shorts download",
    ],
    h1: "YouTube Video Downloader",
    tagline:
      "Save YouTube videos and Shorts as MP4 files. Every available quality is listed so you can pick the size you want.",
    placeholder: "Paste a YouTube video or Shorts link here",
    badge: { label: "YouTube", color: "from-red-600 to-red-500" },
    features: [
      {
        title: "Every quality listed",
        body: "See all the resolutions available for the video and choose the one you want to keep.",
      },
      {
        title: "Shorts supported",
        body: "YouTube Shorts links download the same way as normal videos.",
      },
      {
        title: "MP4 and MP3",
        body: "Save the full video as an MP4, or take only the audio as an MP3.",
      },
      {
        title: "No software needed",
        body: "The downloader runs in your browser on phones, tablets and computers.",
      },
    ],
    stepsHeading: "How to download a YouTube video",
    steps: [
      {
        title: "Copy the link",
        body: "Use Share and then Copy Link on the video or Short. Plain youtu.be links work as well.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Pick a resolution",
        body: "Choose from the quality list and the file saves to your device.",
      },
    ],
    deviceNote:
      "Works on Android, iPhone, Windows, Mac and Linux. Nothing gets installed.",
    faqs: [
      {
        q: "How do I download a YouTube video as MP4?",
        a: "Paste the video link above and wait for the quality list. Pick an MP4 option and the file downloads right away.",
      },
      {
        q: "Can I download YouTube Shorts?",
        a: "Yes. A Shorts link behaves exactly like a regular video link here.",
      },
      {
        q: "Why do some qualities say no audio?",
        a: "YouTube stores its highest resolutions as video-only streams. Options marked with audio are ready to watch. The video-only files suit editing work.",
      },
      {
        q: "Can I download age-restricted or private videos?",
        a: "No. Only videos you could watch in a browser without signing in will work.",
      },
      {
        q: "Is there a length or size limit?",
        a: "There is no set limit. Long videos take more time to process, that is all.",
      },
      {
        q: "Is downloading YouTube videos allowed?",
        a: "Download only what you have rights to. That covers your own uploads, Creative Commons material and videos where the owner gave permission. What you do with the tool is your responsibility.",
      },
    ],
  },
  {
    slug: "youtube-to-mp3",
    navLabel: "YouTube MP3",
    title: "YouTube to MP3 Converter - Free High Quality MP3 Downloads",
    description:
      "Convert YouTube videos to MP3 for free. Paste the link and download the audio in high quality within seconds. No registration and no software.",
    keywords: [
      "youtube to mp3",
      "youtube mp3 converter",
      "youtube audio download",
      "convert youtube to mp3",
      "yt to mp3",
      "youtube to mp3 320kbps",
    ],
    h1: "YouTube to MP3 Converter",
    tagline:
      "Turn a YouTube video into a high quality MP3. Paste the link, press one button and the audio downloads.",
    placeholder: "Paste a YouTube link to convert to MP3",
    badge: { label: "MP3", color: "from-emerald-500 to-teal-500" },
    features: [
      {
        title: "Best available bitrate",
        body: "The converter takes YouTube's best audio stream and encodes the MP3 at the highest quality setting.",
      },
      {
        title: "One button",
        body: "Paste the link, press Save as MP3 and the converted file downloads when it is ready.",
      },
      {
        title: "Music, podcasts and Shorts",
        body: "Music videos, lectures, podcasts and Shorts all convert the same way.",
      },
      {
        title: "Free to use",
        body: "No signup and no daily caps. The audio comes out clean, without any added sounds or tags.",
      },
    ],
    stepsHeading: "How to convert YouTube to MP3",
    steps: [
      {
        title: "Copy the link",
        body: "Use Share and then Copy Link on any video or Short.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box and press Download to look the video up.",
      },
      {
        title: "Press Save as MP3",
        body: "The audio converts to MP3 and downloads to your device once it finishes.",
      },
    ],
    deviceNote:
      "Conversion happens on the server, so it works from any browser on iPhone, Android, PC and Mac.",
    faqs: [
      {
        q: "How do I convert a YouTube video to MP3?",
        a: "Paste the video link above, then press the Save as MP3 button. The conversion runs on its own and the MP3 downloads when it is done.",
      },
      {
        q: "What audio quality do I get?",
        a: "The tool takes the best audio stream YouTube has for that video and encodes it at the highest MP3 setting.",
      },
      {
        q: "Is there a video length limit?",
        a: "No fixed limit. A long video takes more time to convert, that is all.",
      },
      {
        q: "Can I convert playlists?",
        a: "One video at a time for now. Paste each link on its own.",
      },
      {
        q: "Is YouTube to MP3 conversion legal?",
        a: "That depends on the content and on your local law. Convert only audio you have rights to, such as your own material, Creative Commons work, or content where the owner agreed.",
      },
      {
        q: "Do I need to install a converter app?",
        a: "No. The whole process runs online in the browser.",
      },
    ],
  },
  {
    slug: "twitter-video-downloader",
    navLabel: "X / Twitter",
    title: "Twitter Video Downloader - Save X Videos and GIFs in HD",
    description:
      "Download videos and GIFs from X, formerly Twitter, as HD MP4 files. Paste the tweet link and save the video for free. No login and no app.",
    keywords: [
      "twitter video downloader",
      "x video downloader",
      "download twitter video",
      "save twitter video",
      "twitter gif download",
      "twitter to mp4",
    ],
    h1: "Twitter (X) Video Downloader",
    tagline:
      "Download videos and GIFs from X, formerly Twitter, as HD MP4 files. Paste the post link and save.",
    placeholder: "Paste a tweet / X post link here",
    badge: { label: "X / Twitter", color: "from-neutral-900 to-black" },
    features: [
      {
        title: "Videos and GIFs",
        body: "Tweet videos and animated GIFs both save as standard MP4 files.",
      },
      {
        title: "All qualities",
        body: "X serves several resolutions. Pick the HD option or a smaller file.",
      },
      {
        title: "x.com and twitter.com",
        body: "Links from both domains work, including share links from the mobile app.",
      },
      {
        title: "No account needed",
        body: "Public posts download without signing in to X.",
      },
    ],
    stepsHeading: "How to download a video from X",
    steps: [
      {
        title: "Copy the post link",
        body: "Tap Share on the post and choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Save the MP4",
        body: "Choose a quality and the video downloads to your device.",
      },
    ],
    deviceNote:
      "Works on iPhone, Android and desktop browsers. No extension and no app required.",
    faqs: [
      {
        q: "How do I download a video from X?",
        a: "Copy the post link, paste it in the box above and pick an MP4 quality. The video saves right away.",
      },
      {
        q: "Do x.com links work?",
        a: "Yes. Both x.com and twitter.com links are supported.",
      },
      {
        q: "Can I download GIFs from Twitter?",
        a: "Yes. GIFs on X are actually short videos, so they save as MP4 files.",
      },
      {
        q: "Can I download from protected accounts?",
        a: "No. Only public posts are reachable.",
      },
      {
        q: "Can I extract audio from a Twitter video?",
        a: "Use the Save as MP3 button to download only the audio.",
      },
      {
        q: "Is this free?",
        a: "Yes. There is no registration and no limit on downloads.",
      },
    ],
  },
  {
    slug: "pinterest-video-downloader",
    navLabel: "Pinterest",
    title: "Pinterest Video Downloader - Save Videos and Idea Pins",
    description:
      "Download Pinterest videos and Idea Pins as HD MP4 files for free. Paste the pin link and save the video to your phone or computer. No login needed.",
    keywords: [
      "pinterest video downloader",
      "download pinterest video",
      "save pinterest video",
      "pinterest to mp4",
      "idea pin download",
    ],
    h1: "Pinterest Video Downloader",
    tagline:
      "Save Pinterest videos and Idea Pins as HD MP4 files. Works on any device, right in the browser.",
    placeholder: "Paste a Pinterest pin link here",
    badge: { label: "Pinterest", color: "from-red-500 to-rose-600" },
    features: [
      {
        title: "Video pins and Idea Pins",
        body: "Classic video pins and multi-page Idea Pins are both supported.",
      },
      {
        title: "HD MP4 output",
        body: "Videos save in the best quality Pinterest hosts, as universal MP4 files.",
      },
      {
        title: "pin.it short links",
        body: "Share links from the mobile app resolve on their own. Paste them as they are.",
      },
      {
        title: "Free to use",
        body: "No account and no watermark. Download as many pins as you like.",
      },
    ],
    stepsHeading: "How to download a Pinterest video",
    steps: [
      {
        title: "Copy the pin link",
        body: "Tap the Share icon on the pin and choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Save the video",
        body: "Pick a quality and the MP4 downloads to your device.",
      },
    ],
    deviceNote:
      "Works in any modern browser on iPhone, Android, Windows and Mac.",
    faqs: [
      {
        q: "How do I download a Pinterest video?",
        a: "Copy the pin's link from the Share menu, paste it above and choose an MP4 quality to save it.",
      },
      {
        q: "Do pin.it short links work?",
        a: "Yes. Paste the pin.it link exactly as Pinterest gives it to you.",
      },
      {
        q: "Can I save Idea Pins?",
        a: "Public Idea Pins download as video files.",
      },
      {
        q: "Can I download from secret boards?",
        a: "No. Only pins that are publicly visible can be reached.",
      },
      {
        q: "Is this Pinterest downloader free?",
        a: "Yes, with no limits and no signup.",
      },
    ],
  },
];

export function getToolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((t) => t.slug === slug);
}
