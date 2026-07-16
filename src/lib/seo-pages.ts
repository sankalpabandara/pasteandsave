// Copy for the per-platform landing pages. Written to read like a person
// wrote it: short sentences, no em dashes, no stacked "no X, no Y, no Z"
// constructions. Keep it that way when editing.
//
// Title/description length targets (checked by the SEO crawler in
// src/lib/seo-crawler.ts): titles 30-62 chars, descriptions 110-165 chars.

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
    title: "TikTok Video Downloader - Save Videos Without Watermark",
    description:
      "Free TikTok video downloader without watermark. Paste a link and save TikTok videos in HD MP4, or convert TikTok to MP3. No login, no app, no registration.",
    keywords: [
      "tiktok video downloader",
      "tiktok downloader",
      "download tiktok video",
      "tiktok downloader without watermark",
      "download tiktok video without watermark",
      "tiktok no watermark",
      "save tiktok video",
      "tiktok mp3 downloader",
      "tiktok audio downloader",
      "tiktok video download hd",
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
      "Download Instagram videos, Reels, Stories, photos and audio in HD. Free online Instagram downloader that works on iPhone, Android and PC. No login needed.",
    keywords: [
      "instagram video downloader",
      "download instagram video",
      "instagram reels download",
      "instagram story downloader",
      "instagram photo downloader",
      "instagram audio downloader",
      "instagram reels to mp3",
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
        q: "Do Instagram Reels have a watermark?",
        a: "Instagram does not add a watermark to Reels, and this tool never adds one either. The file downloads exactly as Instagram serves it.",
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
        q: "Can I extract just the audio from a Reel?",
        a: "Yes. Use the Save as MP3 button after pasting the link to get only the sound track.",
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
      "Download Instagram Reels as HD MP4 files for free, or convert Reels to MP3. Paste the Reel link and save it to your phone or computer. No login required.",
    keywords: [
      "instagram reels downloader",
      "instagram reel download",
      "download reels",
      "reels video download",
      "save instagram reels",
      "reels to mp4",
      "reels to mp3",
      "instagram reels to mp3",
      "download instagram reels without watermark",
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
    title: "Facebook Video Downloader - Download FB Videos in HD",
    description:
      "Free Facebook video downloader online. Save Facebook videos, Reels, Stories and Watch clips as HD 1080p MP4 files. Works on iPhone, Android and PC.",
    keywords: [
      "facebook video downloader",
      "download facebook video",
      "fb video download",
      "facebook video download online",
      "facebook video downloader hd",
      "facebook reels download",
      "facebook story downloader",
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
        q: "Can I download Facebook Stories?",
        a: "Public Stories work while they are live, the same way as a normal video link. Stories from private accounts are not reachable.",
      },
      {
        q: "Can I download videos from private groups or friends-only posts?",
        a: "No. This tool works like a logged-out browser, so it can only reach videos that are set to public. It cannot tell who owns a video, only whether the link is publicly viewable.",
      },
      {
        q: "How do I download my own private Facebook videos?",
        a: "Use Facebook's own export tool instead: Settings, then Your Information, then Download Your Information. It gives you everything you have posted, at any privacy level, straight from Facebook. No third-party site should ever ask for your Facebook login to do this.",
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
    slug: "facebook-reels-downloader",
    navLabel: "FB Reels",
    title: "Facebook Reels Downloader - Save Reels in HD Free",
    description:
      "Download Facebook Reels in HD MP4 for free. Paste the Reel link and save it straight to your phone or computer. No login, no watermark, no app needed.",
    keywords: [
      "facebook reels downloader",
      "download facebook reels",
      "facebook reel to mp4",
      "save facebook reels",
      "facebook reels download hd",
    ],
    h1: "Facebook Reels Downloader",
    tagline:
      "Save Facebook Reels as HD MP4 files. Paste the link and the download is ready in seconds.",
    placeholder: "Paste a Facebook Reel link here",
    badge: { label: "FB Reels", color: "from-blue-500 to-indigo-500" },
    features: [
      {
        title: "HD MP4 Reels",
        body: "Facebook Reels save in their original quality as a normal MP4 file.",
      },
      {
        title: "Audio as MP3",
        body: "Pull just the sound from a Reel as an MP3 if that is all you need.",
      },
      {
        title: "No login needed",
        body: "Public Reels download without signing in to Facebook.",
      },
      {
        title: "Free and fast",
        body: "No account, no limits, and the file is ready in a few seconds.",
      },
    ],
    stepsHeading: "How to download a Facebook Reel",
    steps: [
      {
        title: "Copy the Reel link",
        body: "Tap Share on the Reel and choose Copy Link.",
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
      "Works on iPhone, Android, Windows and Mac in any browser. Nothing to install.",
    faqs: [
      {
        q: "How do I download a Facebook Reel?",
        a: "Copy the Reel's link from the Share menu, paste it above and pick an MP4 quality. The file saves to your device.",
      },
      {
        q: "Is there a watermark on the downloaded file?",
        a: "No. The Reel saves exactly as Facebook serves it, with no watermark added.",
      },
      {
        q: "Can I get just the audio from a Reel?",
        a: "Yes, use the Save as MP3 button after pasting the link.",
      },
      {
        q: "Can I download Reels from private profiles?",
        a: "No. Only Reels that are publicly visible will work.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no signup and no limits.",
      },
    ],
  },
  {
    slug: "youtube-video-downloader",
    navLabel: "YouTube",
    title: "YouTube Video Downloader - Save Videos as HD MP4",
    description:
      "Free YouTube video downloader online. Save YouTube videos and Shorts as HD MP4 with a full list of quality options. No registration, no software.",
    keywords: [
      "youtube video downloader",
      "download youtube video",
      "youtube downloader online",
      "youtube downloader hd",
      "youtube to mp4",
      "youtube mp4 downloader",
      "save youtube video",
      "download youtube shorts",
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
        q: "Can I download a whole playlist at once?",
        a: "Not yet. Paste one video link at a time and each downloads on its own.",
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
    title: "YouTube to MP3 Converter - Free High Quality Downloads",
    description:
      "Convert YouTube to MP3 free online. Paste the link and download the audio at up to 320kbps within seconds. No registration and no software to install.",
    keywords: [
      "youtube to mp3",
      "youtube to mp3 converter",
      "youtube mp3 downloader",
      "youtube audio download",
      "convert youtube video to mp3",
      "yt to mp3",
      "youtube to mp3 320kbps",
      "youtube to mp4",
    ],
    h1: "YouTube to MP3 Converter",
    tagline:
      "Turn a YouTube video into a high quality MP3. Paste the link, press one button and the audio downloads.",
    placeholder: "Paste a YouTube link to convert to MP3",
    badge: { label: "MP3", color: "from-emerald-500 to-teal-500" },
    features: [
      {
        title: "Best available bitrate",
        body: "The converter takes YouTube's best audio stream and encodes the MP3 at the highest quality setting, up to 320kbps.",
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
        a: "The tool takes the best audio stream YouTube has for that video and encodes it at up to 320kbps MP3.",
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
    slug: "video-to-mp3-converter",
    navLabel: "MP3 Converter",
    title: "Video to MP3 Converter - Free Online MP3 Downloader",
    description:
      "Free online MP3 downloader. Paste a link from any supported site and convert video to MP3 at up to 320kbps. Unlimited, no registration, no ads on the file.",
    keywords: [
      "free mp3 downloader",
      "mp3 downloader online",
      "online mp3 downloader",
      "free online mp3 downloader",
      "video to mp3 converter",
      "online video to mp3 converter",
      "link to mp3 converter",
      "url to mp3 converter",
      "convert link to mp3",
      "audio downloader online",
      "mp3 converter online",
      "mp3 downloader 320kbps",
      "high quality mp3 downloader",
      "unlimited mp3 downloader",
      "mp3 downloader without registration",
      "mp3 downloader no ads",
    ],
    h1: "Video to MP3 Converter",
    tagline:
      "Paste any video link and get back a clean MP3. Works with TikTok, Instagram, Facebook, YouTube and hundreds of other sites.",
    placeholder: "Paste any video link to convert to MP3",
    badge: { label: "MP3", color: "from-green-500 to-emerald-500" },
    features: [
      {
        title: "Any supported site",
        body: "This is not limited to one platform. Paste a link from TikTok, Instagram, Facebook, YouTube, SoundCloud or any of the 1,200+ sites this tool supports.",
      },
      {
        title: "Up to 320kbps",
        body: "Audio encodes at the best quality the source offers, up to 320kbps MP3.",
      },
      {
        title: "No ads on the file",
        body: "The MP3 you get is clean audio only. Nothing is added to the file itself.",
      },
      {
        title: "Free and unlimited",
        body: "No account, no registration and no daily limit on conversions.",
      },
    ],
    stepsHeading: "How to convert a video link to MP3",
    steps: [
      {
        title: "Copy the link",
        body: "Copy the share link of the video from any supported site or app.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Press Save as MP3",
        body: "The audio converts and downloads to your device once it is ready.",
      },
    ],
    deviceNote:
      "Works on iPhone, Android, Windows and Mac. The conversion runs on the server, so there is nothing to install.",
    faqs: [
      {
        q: "How do I convert a video link to MP3?",
        a: "Paste the link into the box above, wait for it to look the video up, then press Save as MP3 instead of picking a video quality.",
      },
      {
        q: "Which sites work with this MP3 converter?",
        a: "Any of the 1,200+ sites this tool supports, including TikTok, Instagram, Facebook, YouTube, X and SoundCloud.",
      },
      {
        q: "What is the maximum MP3 quality?",
        a: "Audio converts at the best bitrate the source video offers, up to 320kbps.",
      },
      {
        q: "Do I need to register or sign up?",
        a: "No. There is no account and no signup required.",
      },
      {
        q: "Is there a limit on how many files I can convert?",
        a: "No. The converter is free and unlimited.",
      },
      {
        q: "Does the MP3 have ads or a watermark?",
        a: "No. The file is the plain audio track only, nothing is added to it.",
      },
    ],
  },
  {
    slug: "twitter-video-downloader",
    navLabel: "X / Twitter",
    title: "Twitter Video Downloader - Save X Videos and GIFs HD",
    description:
      "Download videos and GIFs from X, formerly Twitter, as HD MP4 files. Paste the tweet link and save the video for free. No login and no app required.",
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
  {
    slug: "reddit-video-downloader",
    navLabel: "Reddit",
    title: "Reddit Video Downloader - Save Videos with Audio",
    description:
      "Free Reddit video downloader. Paste a post link and save Reddit videos as MP4 with sound included. Works on iPhone, Android and PC, no login needed.",
    keywords: [
      "reddit video downloader",
      "download reddit video",
      "save reddit video",
      "reddit video with audio",
      "reddit video download mp4",
      "reddit downloader online",
    ],
    h1: "Reddit Video Downloader",
    tagline:
      "Save Reddit videos as MP4 files with the audio included. Paste the post link and download.",
    placeholder: "Paste a Reddit post link here",
    badge: { label: "Reddit", color: "from-orange-500 to-orange-600" },
    features: [
      {
        title: "Audio included",
        body: "Reddit stores video and sound separately. This tool merges them so the MP4 plays with audio.",
      },
      {
        title: "Works with v.redd.it links",
        body: "Paste the post link or the direct video link, both work the same way.",
      },
      {
        title: "No account needed",
        body: "Public posts download without signing in to Reddit.",
      },
      {
        title: "Free to use",
        body: "No limits and no signup. Paste a link and download.",
      },
    ],
    stepsHeading: "How to download a Reddit video",
    steps: [
      {
        title: "Copy the post link",
        body: "Tap Share on the Reddit post and choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Save the MP4",
        body: "Pick a quality and the video downloads with sound.",
      },
    ],
    deviceNote:
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "Why do some Reddit downloaders have no sound?",
        a: "Reddit hosts a video's picture and its audio as two separate files. This tool combines them automatically so the download plays with sound.",
      },
      {
        q: "How do I download a Reddit video?",
        a: "Copy the post link, paste it above and choose an MP4 quality. The video and audio download together.",
      },
      {
        q: "Can I download from private subreddits?",
        a: "No. Only posts that are publicly visible can be downloaded.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no account and no download limit.",
      },
    ],
  },
  {
    slug: "linkedin-video-downloader",
    navLabel: "LinkedIn",
    title: "LinkedIn Video Downloader - Save Videos in HD Free",
    description:
      "Free LinkedIn video downloader. Paste a post link and save LinkedIn videos in HD MP4 to your phone or computer. No login and no software to install.",
    keywords: [
      "linkedin video downloader",
      "download linkedin video",
      "save linkedin video",
      "linkedin video download mp4",
    ],
    h1: "LinkedIn Video Downloader",
    tagline:
      "Save LinkedIn videos in HD MP4. Paste the post link and download straight to your device.",
    placeholder: "Paste a LinkedIn post link here",
    badge: { label: "LinkedIn", color: "from-blue-700 to-blue-600" },
    features: [
      {
        title: "HD MP4 quality",
        body: "Videos save in the best quality LinkedIn offers for that post.",
      },
      {
        title: "No login required",
        body: "Public LinkedIn posts download without signing in.",
      },
      {
        title: "Free to use",
        body: "No account and no limit on how many videos you save.",
      },
      {
        title: "Works everywhere",
        body: "Use it on desktop or mobile, in any modern browser.",
      },
    ],
    stepsHeading: "How to download a LinkedIn video",
    steps: [
      {
        title: "Copy the post link",
        body: "Click Share on the LinkedIn post and choose Copy Link.",
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
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "How do I download a LinkedIn video?",
        a: "Copy the post's link, paste it above and choose an MP4 quality to save it.",
      },
      {
        q: "Can I download videos from a private LinkedIn profile?",
        a: "No. Only posts that are publicly visible can be downloaded.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no login and no limit on downloads.",
      },
    ],
  },
  {
    slug: "threads-video-downloader",
    navLabel: "Threads",
    title: "Threads Video Downloader - Save Videos Free Online",
    description:
      "Free Threads video downloader. Paste a Threads post link and save the video as HD MP4. No login, no app, no watermark added to the file.",
    keywords: [
      "threads video downloader",
      "download threads video",
      "save threads video",
      "threads video download mp4",
    ],
    h1: "Threads Video Downloader",
    tagline:
      "Save Threads videos as HD MP4 files. Paste the post link and download in seconds.",
    placeholder: "Paste a Threads post link here",
    badge: { label: "Threads", color: "from-neutral-900 to-black" },
    features: [
      {
        title: "HD MP4 quality",
        body: "Threads videos download in the best quality available for that post.",
      },
      {
        title: "No login needed",
        body: "Public Threads posts download without signing in.",
      },
      {
        title: "No watermark added",
        body: "The file saves exactly as Threads serves it.",
      },
      {
        title: "Free to use",
        body: "No account, no limits, ready in a few seconds.",
      },
    ],
    stepsHeading: "How to download a Threads video",
    steps: [
      {
        title: "Copy the post link",
        body: "Tap the share icon on the Threads post and choose Copy Link.",
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
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "How do I download a video from Threads?",
        a: "Copy the post's link, paste it above and pick an MP4 quality to save it.",
      },
      {
        q: "Can I download from private Threads accounts?",
        a: "No. Only public posts are reachable.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no signup and no limit on downloads.",
      },
    ],
  },
  {
    slug: "vimeo-video-downloader",
    navLabel: "Vimeo",
    title: "Vimeo Video Downloader - Save Videos in HD Free",
    description:
      "Free Vimeo video downloader online. Paste a Vimeo link and save the video in HD MP4 to your phone or computer. No login and no software required.",
    keywords: [
      "vimeo video downloader",
      "download vimeo video",
      "save vimeo video",
      "vimeo to mp4",
      "vimeo downloader online",
    ],
    h1: "Vimeo Video Downloader",
    tagline:
      "Save Vimeo videos in HD MP4. Paste the link and download straight to your device.",
    placeholder: "Paste a Vimeo video link here",
    badge: { label: "Vimeo", color: "from-sky-500 to-cyan-500" },
    features: [
      {
        title: "HD quality",
        body: "Videos download in the best quality that Vimeo makes available for that link.",
      },
      {
        title: "No login required",
        body: "Public Vimeo videos download without signing in.",
      },
      {
        title: "Free to use",
        body: "No account and no limit on downloads.",
      },
      {
        title: "Any device",
        body: "Works on iPhone, Android, Windows and Mac in the browser.",
      },
    ],
    stepsHeading: "How to download a Vimeo video",
    steps: [
      {
        title: "Copy the video link",
        body: "Copy the Vimeo page URL from your browser's address bar or the Share option.",
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
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "How do I download a Vimeo video?",
        a: "Paste the video's link above and choose an MP4 quality to save it.",
      },
      {
        q: "Can I download password-protected Vimeo videos?",
        a: "No. Only videos that are publicly viewable without a password can be downloaded.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no login and no download limit.",
      },
    ],
  },
  {
    slug: "dailymotion-video-downloader",
    navLabel: "Dailymotion",
    title: "Dailymotion Video Downloader - Save Videos Free",
    description:
      "Free Dailymotion video downloader. Paste a Dailymotion link and save the video as MP4 in the best available quality. No login, no app, no cost.",
    keywords: [
      "dailymotion video downloader",
      "download dailymotion video",
      "dailymotion to mp4",
      "save dailymotion video",
    ],
    h1: "Dailymotion Video Downloader",
    tagline:
      "Save Dailymotion videos as MP4 files. Paste the link and download in seconds.",
    placeholder: "Paste a Dailymotion video link here",
    badge: { label: "Dailymotion", color: "from-sky-600 to-blue-600" },
    features: [
      {
        title: "Best available quality",
        body: "Videos download in the highest resolution Dailymotion offers for that link.",
      },
      {
        title: "No login needed",
        body: "Public videos download without signing in to Dailymotion.",
      },
      {
        title: "Free to use",
        body: "No account and no limits on downloads.",
      },
      {
        title: "Works everywhere",
        body: "Use it on desktop or mobile in any modern browser.",
      },
    ],
    stepsHeading: "How to download a Dailymotion video",
    steps: [
      {
        title: "Copy the video link",
        body: "Copy the Dailymotion page URL from your browser's address bar.",
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
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "How do I download a Dailymotion video?",
        a: "Paste the video's link above and choose an MP4 quality to save it.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no signup and no limit on downloads.",
      },
    ],
  },
  {
    slug: "soundcloud-mp3-downloader",
    navLabel: "SoundCloud",
    title: "SoundCloud MP3 Downloader - Save Tracks Free",
    description:
      "Free SoundCloud MP3 downloader. Paste a track link and save SoundCloud audio as MP3, up to 320kbps, straight to your phone or computer. No login needed.",
    keywords: [
      "soundcloud mp3 downloader",
      "download soundcloud mp3",
      "soundcloud downloader online",
      "soundcloud to mp3",
      "free music downloader",
      "download mp3 free",
    ],
    h1: "SoundCloud MP3 Downloader",
    tagline:
      "Save SoundCloud tracks as MP3 files. Paste the track link and download in seconds.",
    placeholder: "Paste a SoundCloud track link here",
    badge: { label: "SoundCloud", color: "from-orange-400 to-amber-500" },
    features: [
      {
        title: "Up to 320kbps",
        body: "Tracks download at the best audio quality SoundCloud offers for that link.",
      },
      {
        title: "No login needed",
        body: "Public tracks download without signing in to SoundCloud.",
      },
      {
        title: "Free to use",
        body: "No account, no limits, and no ads added to the file.",
      },
      {
        title: "Any device",
        body: "Works on iPhone, Android, Windows and Mac in the browser.",
      },
    ],
    stepsHeading: "How to download a SoundCloud track",
    steps: [
      {
        title: "Copy the track link",
        body: "Tap Share on the SoundCloud track and choose Copy Link.",
      },
      {
        title: "Paste it here",
        body: "Put the link in the box at the top of this page and press Download.",
      },
      {
        title: "Save the MP3",
        body: "The track downloads as an MP3 file to your device.",
      },
    ],
    deviceNote:
      "Works on iPhone, Android, Windows and Mac in any browser.",
    faqs: [
      {
        q: "How do I download a SoundCloud track as MP3?",
        a: "Paste the track's link above and press Download. The MP3 saves to your device once it is ready.",
      },
      {
        q: "Can I download private or unavailable tracks?",
        a: "No. Only tracks that are publicly streamable on SoundCloud can be downloaded.",
      },
      {
        q: "Is this free?",
        a: "Yes, with no login and no limit on downloads.",
      },
    ],
  },
];

export function getToolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((t) => t.slug === slug);
}
