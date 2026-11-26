// The English text of the shared parts of the site: the home page, header,
// footer, the downloader and the frame around each platform page. It is the
// site's existing copy, word for word, and the shape every other language
// must match (the Dict type below). Platform page copy stays in
// src/lib/seo-pages.ts.
//
// {site}, {name} and {n} are filled in where the text is used.
//
// No imports on purpose: the tests load this file directly.

export const dict = {
  meta: {
    homeTitle: "Free Online Video Downloader - MP4 & MP3 from Any Link",
    homeDescription:
      "Paste a link to save video or audio from TikTok, Instagram, Facebook, X and 1,200+ other sites. Free HD MP4 and MP3, no login, nothing to install.",
    ogTitle: "{site} - Free Online Video Downloader",
    ogDescription:
      "Paste a link and save video or audio from TikTok, Instagram, Facebook, X and more than 1,200 other sites. Free, HD, no login required.",
    twitterDescription:
      "Paste a link and save video or audio from TikTok, Instagram, Facebook, X and more than 1,200 other sites.",
    appName: "{site} Video Downloader",
    appDescription:
      "Free online video downloader for TikTok, Instagram, Facebook, YouTube, X and more than 1,200 other sites. Download video from a link as MP4 or MP3.",
    ogLocale: "en_US",
  },
  nav: {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    mp3: "MP3 Converter",
    extension: "Extension",
    blog: "Blog",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    theme: "Toggle dark mode",
    language: "Language",
  },
  home: {
    h1Line1: "Free Online",
    h1Line2: "Video Downloader",
    lead: "Paste a video link from TikTok, Instagram, Facebook, YouTube, X or any of 1,200+ other sites and download it as MP4 or MP3. Free, in HD, with no signup and no software to install.",
    aboutHeading: "Download video from a link, from any social media site",
    about1:
      "{site} is a free online video downloader that works with more than 1,200 websites. Paste a public link from TikTok, Instagram, Facebook, YouTube, X, Pinterest, Reddit, LinkedIn, Threads, Vimeo, SoundCloud or one of the smaller platforms. The site is detected for you, so there is no menu to pick from. Every available quality shows up in a list, from small SD files up to full HD and, where the source offers it, 4K. Files save as normal MP4s that play on any device, no separate MP4 downloader software needed.",
    about2Before:
      "If you only need the audio, each page here doubles as an MP3 downloader. One button converts the video to MP3, encoded at the best bitrate the source offers, up to 320kbps. People use this to save TikTok sounds, YouTube music, podcasts and voice clips from Reels. There is also a dedicated ",
    about2Link: "video to MP3 converter",
    about2After: " for pasting a link straight to audio.",
    about3Before:
      "The whole tool runs in the browser on iPhone, Android, Windows and Mac, with no login and no registration. Please only download content you own or have permission to use. Our ",
    about3Link: "Terms of Service",
    about3After: " explain the rules.",
  },
  platforms: {
    heading: "Works with more than 1,200 sites",
    intro:
      "You never have to choose a platform. Paste the link, and PasteAndSave works out which site it came from and shows the quality options. These are the popular ones.",
    more: "Snapchat, Twitch, Bluesky, Tumblr, Bandcamp, Mixcloud, Rumble, Imgur, VK and Bilibili work too, along with many smaller sites.",
  },
  how: {
    heading: "How it works",
    steps: [
      {
        title: "Copy the link",
        body: "Open the post, reel, or video in the app or browser and copy its share link.",
      },
      {
        title: "Paste it above",
        body: "Drop the link into the box at the top of this page and hit Download.",
      },
      {
        title: "Pick a quality",
        body: "PasteAndSave lists every available resolution. Choose one and save the file.",
      },
    ],
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        q: "Is this free?",
        a: "Yes. Paste a link, pick a quality and save the file. You do not need an account, and nothing gets added to your video.",
      },
      {
        q: "Can I download private posts?",
        a: "No. PasteAndSave can only fetch content that is publicly accessible, the same as opening it in a browser without logging in.",
      },
      {
        q: "Which sites are supported?",
        a: "More than 1,200 sites work here, including Instagram, TikTok, Facebook, X, YouTube, Pinterest, Reddit, Vimeo, SoundCloud and Twitch. The site is detected from the link you paste.",
      },
      {
        q: "What am I allowed to download?",
        a: "Content you own, content you have permission to use, and material that is licensed for reuse. Respect the people who make the videos.",
      },
      {
        q: "How do I download a video from a link?",
        a: "Copy the share link from the site or app, paste it into the box at the top of this page, and press Download. Every available quality shows up in a list, usually in under a minute.",
      },
      {
        q: "Can I convert a video link straight to MP3?",
        a: "Yes. After you paste a link and look it up, use the Save as MP3 button instead of picking a video quality. Only the audio track downloads.",
      },
    ],
  },
  bookmarklet: {
    heading: "Download from any page in one click",
    body: "Drag this button to your bookmarks bar. Then, on any video or post, click it to open {site} with the link already loaded. No copying and pasting.",
    button: "Save with {site}",
    shareNote: "You can also share a ready-to-download link:",
  },
  footer: {
    about:
      "A free online video downloader that works with more than 1,200 sites. Paste a link, pick a quality and save the file.",
    downloaders: "Downloaders",
    moreTools: "More tools",
    extension: "Browser Extension",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    disclaimer:
      "PasteAndSave is an independent tool and isn't affiliated with any of the platforms it supports. Only download content you have the rights to use.",
    geo: "IP geolocation by DB-IP",
  },
  ads: {
    label: "Advertisement",
  },
  tool: {
    why: "Why use the {site} {name}?",
    howTo: "How to use the {name}",
    faqHeading: "Frequently asked questions",
    others: "Other free downloaders",
  },
  downloader: {
    placeholder: "Paste your video link here",
    inputLabel: "Paste video URL",
    clear: "Clear the link",
    clearTitle: "Clear",
    paste: "Paste",
    download: "Download",
    lookingUp: "Looking up...",
    reading: "Reading that link, please wait.",
    video: "Video",
    audio: "Audio",
    save: "Save",
    starting: "Starting…",
    downloading: "Downloading {n}%",
    converting: "Converting…",
    noFormats: "No downloadable formats were found for this link.",
    videosCount: "{n} videos",
    showingFirst: " (showing the first {n})",
    pickOne: "pick one to download",
    emptyLink: "Paste a video link first.",
    notALink:
      "That doesn't look like a link. Copy the address from your browser and paste the whole thing.",
    notHttp: "Only web links starting with http or https can be downloaded.",
    noHost: "That link is missing a website name. Check it and try again.",
    tooSlow: "That link took too long to read. The site may be busy right now, please try again.",
    offline: "Couldn't reach the server. Check your connection and try again.",
    genericError: "Something went wrong. Please try again.",
    playlistError: "Couldn't read that playlist.",
    startFailed: "Failed to start.",
    jobFailed: "Something went wrong.",
    serverUnreachable: "Couldn't reach the server.",
    photo: "Photo",
    image: "Image",
  },
  // Shown in place of the server's English message when the page is in
  // another language. English visitors get the server's own, more specific
  // wording, so these are only the fallback in English.
  errors: {
    UNSUPPORTED_SITE: "That link isn't from a site we can download from.",
    SHARE_LINK_DEAD:
      "That share link doesn't lead to a video any more. If it still opens for you, copy the link from the address bar and paste that instead.",
    RELAY_DOWN: "Downloads from this site are briefly unavailable. Everything else on the site still works.",
    SITE_UNAVAILABLE_HERE: "We can't fetch from that site here. Everything else still works.",
    AGE_CHECK_REGION:
      "This site asks visitors from our server's country to prove their age first, so it won't give us the video. Other sites still work.",
    DRM_PROTECTED: "This video is copy protected, so it can't be downloaded.",
    SITE_NOT_SUPPORTED: "Downloads from this site aren't supported.",
    MEDIA_REMOVED: "This video was removed or is no longer available.",
    NO_FORMATS: "No video found at that link. It may be a photo, a story, or a post with only text.",
    LOGIN_REQUIRED: "This needs a sign in to watch, so it can't be downloaded here.",
    LOGIN_ONLY: "This video can only be watched when signed in, or it was taken down, so it can't be downloaded here.",
    EMBED_ONLY:
      "The owner of this video only lets it play on their own website. Paste the address of the page where you watched it instead.",
    AGE_RESTRICTED: "This video is age restricted and needs a sign in, so it can't be fetched.",
    PRIVATE: "This one is private, so it can't be downloaded.",
    GEO_BLOCKED: "This video is blocked in our server's region, so we can't reach it.",
    UPSTREAM_BLOCKED: "This site is turning our server away right now. Give it a minute and try again.",
    EXTRACTOR_TIMEOUT: "That took too long and timed out. Please try again.",
    NOT_MEDIA: "This link is a document, not a video, audio or photo, so there's nothing here to save.",
    BUSY: "We're handling a lot of links right now. Try again in a moment.",
    TOO_MANY: "Too many requests. Please slow down.",
    UNKNOWN: "Couldn't read that link. It may be private, region locked, or the site changed something on their end.",
  },
  review: {
    title: "How did it go?",
    body: "Your download has started. If you have a minute, tell others what you think of PasteAndSave on Trustpilot. Good or bad, every review helps.",
    write: "Write a review",
    notNow: "Not now",
  },
};

export type Dict = typeof dict;

/** The text a platform page needs in another language (the brand colour stays as in English). */
export type ToolCopy = {
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  navLabel: string;
  tagline: string;
  placeholder: string;
  features: { title: string; body: string }[];
  stepsHeading: string;
  steps: { title: string; body: string }[];
  deviceNote: string;
  faqs: { q: string; a: string }[];
};

/** Every platform's short name and heading, for links to pages not yet translated. */
export type ToolName = { navLabel: string; h1: string };
