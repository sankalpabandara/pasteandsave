// Written by scripts/blog-images.mjs. Do not edit by hand: change the script and run it again.
//
// No imports on purpose: the tests load this file directly.

/** small: a 600 pixel wide copy, for covers. */
export type BlogImage = { width: number; height: number; alt: string; small?: string };

export const IMAGES: Record<string, BlogImage> = {
  "/blog/images/how-online-video-downloaders-work.jpg": { width: 1200, height: 630, alt: "Illustration of a copied link becoming a page and then a downloaded file", small: "/blog/images/how-online-video-downloaders-work-600w.jpg" },
  "/blog/images/video-quality-explained.jpg": { width: 1200, height: 630, alt: "Illustration of nested screens showing 720p, 1080p and 4K video sizes", small: "/blog/images/video-quality-explained-600w.jpg" },
  "/blog/images/video-formats-explained.jpg": { width: 1200, height: 630, alt: "Four file icons labelled MP4, WebM, MOV and MKV", small: "/blog/images/video-formats-explained-600w.jpg" },
  "/blog/images/is-it-legal-to-download-videos.jpg": { width: 1200, height: 630, alt: "Shield with a check mark representing the rules for downloading videos", small: "/blog/images/is-it-legal-to-download-videos-600w.jpg" },
  "/blog/images/are-online-video-downloaders-safe.jpg": { width: 1200, height: 630, alt: "Green shield with a check mark for safe video downloading", small: "/blog/images/are-online-video-downloaders-safe-600w.jpg" },
  "/blog/images/download-tiktok-without-watermark.jpg": { width: 1200, height: 630, alt: "Phone showing a music note and a download button for saving TikTok videos", small: "/blog/images/download-tiktok-without-watermark-600w.jpg" },
  "/blog/images/download-instagram-reels.jpg": { width: 1200, height: 630, alt: "Phone showing a photo icon and a download button for saving Instagram Reels", small: "/blog/images/download-instagram-reels-600w.jpg" },
  "/blog/images/download-youtube-videos.jpg": { width: 1200, height: 630, alt: "Phone showing a play button and a download button for saving YouTube videos", small: "/blog/images/download-youtube-videos-600w.jpg" },
  "/blog/images/download-youtube-playlist.jpg": { width: 1200, height: 630, alt: "A list of videos with one selected, for downloading from a playlist", small: "/blog/images/download-youtube-playlist-600w.jpg" },
  "/blog/images/download-facebook-videos.jpg": { width: 1200, height: 630, alt: "Phone showing a film strip and a download button for saving Facebook videos", small: "/blog/images/download-facebook-videos-600w.jpg" },
  "/blog/images/download-twitter-x-videos.jpg": { width: 1200, height: 630, alt: "Phone showing a post bubble with a play button for saving videos from X", small: "/blog/images/download-twitter-x-videos-600w.jpg" },
  "/blog/images/download-reddit-videos-with-sound.jpg": { width: 1200, height: 630, alt: "A video track and a sound track joined into one file", small: "/blog/images/download-reddit-videos-with-sound-600w.jpg" },
  "/blog/images/save-videos-on-iphone-and-android.jpg": { width: 1200, height: 630, alt: "Two phones showing the Files app and the photo gallery", small: "/blog/images/save-videos-on-iphone-and-android-600w.jpg" },
  "/blog/images/convert-video-to-mp3.jpg": { width: 1200, height: 630, alt: "Large music note above the letters MP3", small: "/blog/images/convert-video-to-mp3-600w.jpg" },
  "/blog/images/video-wont-download.jpg": { width: 1200, height: 630, alt: "Warning sign representing a video that will not download", small: "/blog/images/video-wont-download-600w.jpg" },
  "/blog/images/how-a-video-downloader-works-from-link-to-file.webp": { width: 1200, height: 440, alt: "Five steps from a copied link to a saved file: copy the link, the page is read, qualities are listed, video and sound are joined, the file is saved" },
  "/blog/images/pasteandsave-quality-list-video-and-audio-options.webp": { width: 1200, height: 700, alt: "The PasteAndSave downloader showing a pasted link, a video title and a list of qualities from 2160p to 360p with Save buttons" },
  "/blog/images/video-resolution-comparison-360p-720p-1080p-4k.webp": { width: 1200, height: 660, alt: "Rectangles drawn to scale comparing 360p, 720p, 1080p and 4K video resolutions" },
  "/blog/images/video-file-size-per-minute-by-quality.webp": { width: 1200, height: 560, alt: "Bar chart of typical video file size per minute, from about 5 MB at 360p to about 150 MB at 4K" },
  "/blog/images/video-container-and-codec-explained.webp": { width: 1200, height: 560, alt: "Diagram of an MP4 container holding a video track packed with H.264, an audio track packed with AAC, and optional subtitles" },
  "/blog/images/is-downloading-videos-legal-fine-gray-area-not-okay.webp": { width: 1200, height: 540, alt: "Three columns listing downloads that are usually fine, gray areas, and uses that are usually not okay" },
  "/blog/images/safe-video-downloader-checklist.webp": { width: 1200, height: 490, alt: "Checklist comparing signs of a safe video downloader with warning signs of a bad one" },
  "/blog/images/download-tiktok-video-without-watermark-steps.webp": { width: 1200, height: 740, alt: "Three phone screens: tap Share and Copy link in TikTok, paste the link into PasteAndSave, then pick MP4 or MP3 to save" },
  "/blog/images/download-instagram-reel-steps.webp": { width: 1200, height: 740, alt: "Three phone screens: tap the paper plane and Copy link in Instagram, paste the link into PasteAndSave, then choose a quality" },
  "/blog/images/download-facebook-video-steps.webp": { width: 1200, height: 740, alt: "Three phone screens: tap Share and Copy link in Facebook, paste the link into PasteAndSave, then pick HD or SD" },
  "/blog/images/download-x-twitter-video-steps.webp": { width: 1200, height: 740, alt: "Three phone screens: tap Share and Copy link on an X post, paste the link into PasteAndSave, then pick a quality or photo" },
  "/blog/images/youtube-hd-video-and-audio-joined.webp": { width: 1200, height: 460, alt: "A picture only video track and a separate audio track joined into one MP4 file with sound" },
  "/blog/images/reddit-video-and-sound-joined.webp": { width: 1200, height: 460, alt: "Reddit's silent video file and separate sound file joined into one video with sound" },
  "/blog/images/download-youtube-playlist-one-video-at-a-time.webp": { width: 1200, height: 640, alt: "A playlist of five videos with the second one selected, and its quality options from 1080p to MP3" },
  "/blog/images/where-downloaded-videos-go-iphone-android.webp": { width: 1200, height: 560, alt: "Where downloads go: on iPhone from Safari to Files, Downloads, then Save Video into Photos; on Android from Chrome to the Download folder, then the gallery" },
  "/blog/images/mp3-file-size-by-bitrate.webp": { width: 1200, height: 560, alt: "Bar chart of the size of a four minute song as MP3 at 64, 96, 128, 256 and 320 kbps, from about 2 MB to about 9 MB" },
  "/blog/images/why-a-video-wont-download-nine-reasons.webp": { width: 1200, height: 780, alt: "Nine common reasons a video won't download: unsupported site, no video in the post, private, sign in needed, region block, copy protection, removed, dead share link, site busy" },
};
