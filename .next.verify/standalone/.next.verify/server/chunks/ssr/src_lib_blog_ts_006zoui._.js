module.exports=[73934,52060,88914,a=>{"use strict";let b={slug:"how-online-video-downloaders-work",title:"How Online Video Downloaders Work, Explained Simply",seoTitle:"How Online Video Downloaders Work (Simple Guide)",description:"What really happens when you paste a link into a video downloader: how the page is read, where the file comes from, and why some videos can't be saved.",excerpt:"A video link points to a page, not a file. Here is what a downloader does with that page, step by step, and why some videos stay out of reach.",category:"basics",lesson:1,published:"2026-10-29",updated:"2026-10-29",keywords:["how do video downloaders work","online video downloader","download video from link","how to download a video from a website","video downloader explained"],faqs:[{q:"Do I need to install anything to download a video?",a:"No. An online downloader runs on a server and sends the finished file to your browser, so it works the same on a phone, a tablet or a computer. You only need a browser and the link to the video."},{q:"Why does a downloader need the full link?",a:"The link tells the downloader which page to open. If part of it is missing, or it is a short link that no longer leads anywhere, there is no page to read and nothing to download. Copy the link from the app's Share button or from the address bar."},{q:"Can a video downloader get videos from private accounts?",a:"Not an honest one. A downloader sees the same page a visitor sees without logging in, so anything that needs a sign in or a follow stays out of reach. A tool that asks for your password to get around this is a risk to your account."},{q:"What is yt-dlp?",a:"It is a free, open source program that knows how to read video pages on more than a thousand websites. PasteAndSave runs it on our server so you get its reach without installing anything."}],tool:{href:"/",label:"Try the downloader"},body:`
A video playing on your screen is already being downloaded. Your phone fetches it a few seconds at a time, plays each piece and then throws it away. A video downloader does the same fetching, but keeps everything and hands you one complete file.

That is the whole trick. The rest of this lesson explains how it works, so the quality list, the errors and the odd failure all make sense.

## A video link points to a page, not a file

When you tap **Share** and **Copy link** in TikTok, Instagram or YouTube, you get the address of a page. That page holds a video player, a caption, comments and a lot of code. The actual video sits somewhere else, usually on a fast storage network the platform runs, and the player asks for it in the background.

A few details surprise most people:

* **There is rarely just one file.** Platforms store the same video in several sizes, from tiny 144p versions for slow connections up to 1080p or 4K.
* **Sound and picture are often separate.** YouTube keeps its higher qualities as a video track with no sound and a separate audio track. The player joins them while you watch.
* **The file addresses change.** Many expire after a few hours, which is why you can't just copy the file address and keep it for later.
* **Some files are locked.** Paid streaming services encrypt their videos so only their own player can show them.

## What happens after you press Download

Here is what PasteAndSave does with a link, and most good downloaders work the same way:

1. Our server opens the page the way a browser would if nobody were logged in.
2. It reads the list of files the player would choose from: every size, every format, the audio tracks.
3. You see that list as qualities to pick from, such as 1080p, 720p or MP3.
4. When you choose one, the server fetches that file. If the picture and sound are separate, it joins them into one MP4.
5. The finished file is sent to your browser and lands in your normal downloads folder.

![](/blog/images/how-a-video-downloader-works-from-link-to-file.webp "The five steps between pasting a link and getting a file")

The reading part is done by **yt-dlp**, a free, open source program that understands the pages of more than a thousand websites. It is the reason one box can take a TikTok link, a Reddit link or a Vimeo link without you choosing a site first.

### Why YouTube HD takes a little longer

If you pick a high quality YouTube video, the server has to fetch two files and stitch them together before anything reaches you. That is the progress bar you see. A 720p file with sound already inside skips that step, so it usually starts faster.

![](/blog/images/youtube-hd-video-and-audio-joined.webp "YouTube keeps HD picture and sound in two files, and the server joins them")

## Why some videos can't be downloaded

A downloader can only take what a logged out visitor could watch. In our own logs, the failures fall into a handful of groups that repeat every week:

* **The site isn't one the downloader can read.** This is the most common reason by far on PasteAndSave.
* **The post has no video.** It is a photo, a story that expired, or text.
* **It needs a sign in.** Private accounts, followers only posts and some age restricted videos.
* **It is blocked by region.** Some sites hide videos from visitors in certain countries, and that includes the country our server is in.
* **It is copy protected.** Netflix, Disney+, Prime Video and Spotify use encryption on purpose, and getting around it is illegal in many countries.
* **It was deleted.** The link still opens, but the video behind it is gone.

The lesson [Why a Video Won't Download](/blog/video-wont-download) goes through each one with the exact message you will see and what to try next.

## How to tell a safe downloader from a bad one

You can judge any download site, including ours, with a few quick checks:

* It never asks for your Instagram, TikTok or YouTube password.
* It does not make you install a "player", "codec" or app to get one video.
* The file you get ends in **.mp4**, **.webm**, **.mp3** or **.m4a**, never **.exe**, **.apk** or **.zip**.
* Ads, if it has them, stay in their boxes and don't open new tabs every time you click.
* It tells you plainly what it keeps about you. Ours is in the [privacy policy](/privacy).

Nobody has to trust a downloader blindly. The checks above take thirty seconds and catch nearly every bad one. Lesson 5, [Are Online Video Downloaders Safe?](/blog/are-online-video-downloaders-safe), goes through them in more detail.

## Where to go next

You now know what a downloader actually does. The next four lessons make you good at using one:

1. [Video Quality Explained](/blog/video-quality-explained) covers what 720p, 1080p and 4K mean and how much space each takes.
2. [MP4, WebM, MOV or MKV](/blog/video-formats-explained) explains which format plays where.
3. [Is It Legal to Download Videos?](/blog/is-it-legal-to-download-videos) sets out the rules, in plain words.
4. [Are Online Video Downloaders Safe?](/blog/are-online-video-downloaders-safe) shows how to spot a bad site before it costs you anything.

Or skip the theory and paste a link into the [downloader](/) to see the quality list for yourself.
`},c={slug:"video-quality-explained",title:"Video Quality Explained: 360p, 720p, 1080p and 4K",seoTitle:"Video Quality Explained: 720p vs 1080p vs 4K",description:"What 360p, 720p, 1080p and 4K really mean, how much space each one takes, and which quality to pick for a phone, a laptop, a TV or editing.",excerpt:"The biggest number is not always the best choice. Learn what each quality means, how big the files get, and which one suits the screen you watch on.",category:"basics",lesson:2,published:"2026-10-29",updated:"2026-10-29",keywords:["720p vs 1080p","video quality explained","what is 1080p","what does 4k mean","best video quality for phone","video file size per minute"],faqs:[{q:"Is 1080p the same as Full HD?",a:"Yes. 1080p and Full HD both mean a picture 1920 pixels wide and 1080 pixels tall. 720p is usually called HD, and 4K, also called Ultra HD, is 3840 by 2160 pixels."},{q:"Is 720p good enough for a phone?",a:"For most phones, yes. On a screen around six inches, the difference between 720p and 1080p is hard to see, and the 720p file is roughly half the size. Choose 1080p if you will also watch it on a laptop or TV."},{q:"Why does my downloaded video look blurry?",a:"Either the original was uploaded at a low quality, or a small quality was chosen. A downloader cannot add detail that was never in the upload. Check the quality list and pick the highest one the video offers."},{q:"Does 60fps matter?",a:"Frames per second affect how smooth motion looks, not how sharp the picture is. 60fps helps with sport and gaming clips. For talking, music and most social videos, 30fps looks the same and takes less space."}],tool:{href:"/youtube-video-downloader",label:"Pick a quality on the YouTube downloader"},body:`
The biggest number is not always the best choice. A 4K video on a phone can take four times the space of 1080p and look almost the same, because the screen can't show the extra detail.

Once you know what the numbers mean, picking a quality takes two seconds instead of a guess.

## What the "p" number means

The number is the height of the picture in pixels, the tiny dots that make up an image. The "p" stands for progressive, a way of drawing each frame in one pass. You can ignore that part.

| Quality | Size in pixels | Common name |
| --- | --- | --- |
| 144p | 256 x 144 | Tiny, for very slow connections |
| 240p | 426 x 240 | Low |
| 360p | 640 x 360 | Standard on small screens |
| 480p | 854 x 480 | SD, like an old DVD |
| 720p | 1280 x 720 | HD |
| 1080p | 1920 x 1080 | Full HD |
| 1440p | 2560 x 1440 | QHD, sometimes called 2K |
| 2160p | 3840 x 2160 | 4K, or Ultra HD |

Each step up holds more detail. 1080p has more than twice the pixels of 720p, and 4K has four times the pixels of 1080p.

![](/blog/images/video-resolution-comparison-360p-720p-1080p-4k.webp "360p, 720p, 1080p and 4K, drawn to the same scale")

### What about vertical videos?

TikToks, Reels and Shorts are tall, often 1080 pixels wide and 1920 tall. PasteAndSave names them by the short side, so that clip shows up as **1080p**. Otherwise you would see labels like 1920p that match nothing you know.

## Resolution is only half of the picture

Two 1080p files can look very different. The other half is **bitrate**, the amount of data spent on each second of video. A video squeezed hard to save space shows blocks and smears in dark scenes and fast movement, even at a high resolution.

The newer the compression method, the less data it needs for the same look. YouTube uses VP9 and AV1 for many of its videos, which keep detail at sizes the older H.264 can't match. The lesson on [video formats](/blog/video-formats-explained) explains those names.

What this means for you: when a source offers the same quality twice, the larger file is usually the better looking one.

## How much space each quality takes

These are rough sizes for a typical online video, per minute of footage:

* **360p:** about 4 to 5 MB
* **480p:** about 6 to 10 MB
* **720p:** about 10 to 20 MB
* **1080p:** about 20 to 40 MB
* **1440p:** about 40 to 70 MB
* **4K:** about 80 to 150 MB

![](/blog/images/video-file-size-per-minute-by-quality.webp "Typical size of one minute of video at each quality")

So a ten minute 1080p video lands somewhere between 200 and 400 MB. The same video in 4K can pass a gigabyte. On a phone with little space left, that difference matters a lot more than detail you can't see.

## Which quality should you pick?

When you paste a link into PasteAndSave, every quality the site stores shows up as a row with its own Save button.

![](/blog/images/pasteandsave-quality-list-video-and-audio-options.webp "The quality list, with video sizes on one tab and audio on the other")

Match the quality to where you will watch it:

* **Phone only:** 720p. It looks sharp on any phone screen and saves space.
* **Laptop or tablet:** 1080p.
* **Big TV:** 1080p, or 4K if the video was uploaded in 4K.
* **Editing a project:** the highest quality on offer. Cutting and zooming wastes detail, so start with all of it.
* **Sending over WhatsApp or other chat apps:** 480p or 720p. Most chat apps compress video again anyway, so a 4K file arrives looking like 720p.
* **Saving mobile data:** 360p or 480p, then download the better copy later on WiFi if you need it.
* **Just the sound:** skip video entirely and take the MP3. The [video to MP3 guide](/blog/convert-video-to-mp3) covers bitrates.

## You can't get more quality than the upload

A video uploaded at 720p stays 720p. A tool can stretch it to 1080p, but stretching adds no detail, only a bigger file. This is why the quality list sometimes stops at 720p: that is everything the platform has.

The usual ceilings:

* **TikTok:** most videos top out at 1080p, and many at 720p.
* **Instagram Reels:** up to 1080p.
* **X (Twitter):** up to 1080p for most clips.
* **YouTube:** up to 4K, sometimes 8K, if the creator uploaded it.

## Why some qualities say "no audio"

YouTube stores its sharpest versions as picture only, with the sound kept in a separate file. When you pick one of those on PasteAndSave, our server adds the best audio track before sending it, so the saved MP4 has sound. You don't need to do anything.

## Next lesson

Now that the numbers make sense, lesson 3, [MP4, WebM, MOV or MKV](/blog/video-formats-explained), explains why one file plays everywhere and another won't open at all.
`},d={slug:"video-formats-explained",title:"MP4, WebM, MOV or MKV: Which Video Format Should You Use?",seoTitle:"MP4 vs WebM vs MOV vs MKV: Which Format to Use",description:"The difference between MP4, WebM, MOV and MKV, what a codec is, and which video and audio formats play on iPhone, Android, Windows and smart TVs.",excerpt:"A video that won't play is rarely broken. It is usually packed in a format your player doesn't open. Here is what each format is and when to use it.",category:"basics",lesson:3,published:"2026-10-29",updated:"2026-10-29",keywords:["mp4 vs webm","mp4 vs mkv","mov vs mp4","best video format","what is a video codec","video format for iphone"],faqs:[{q:"Is MP4 better than WebM?",a:"Neither is better in every case. MP4 plays on almost every phone, computer and TV, so it is the safe choice. WebM often holds YouTube's sharpest versions in a smaller file, but some older devices and the iPhone Photos app handle it less well."},{q:"Why won't my MKV file play on iPhone?",a:"The iPhone's built in apps don't open MKV files. Install a free player such as VLC, or convert the file to MP4 with a free tool like HandBrake, and it will play."},{q:"What is the difference between MP4 and MP3?",a:"MP4 is a video format that holds a picture and sound. MP3 is an audio format that holds sound only. Choose MP3 when you only want to listen, for example to music or a podcast."},{q:"Does converting a video to another format lose quality?",a:"Changing only the container, for example MOV to MP4 with the same codec inside, loses nothing. Converting to a different codec compresses the video again, which loses a little quality each time, so do it once and keep the original."}],tool:{href:"/",label:"Download a video as MP4"},body:`
A video that won't play is almost never broken. Nine times out of ten it is packed in a format your player doesn't open. Learn two words, **container** and **codec**, and you can fix it yourself in a minute.

## A container is the box, a codec is what's inside

Think of a video file as a lunch box.

* The **container** is the box. MP4, WebM, MOV and MKV are containers. The box holds a video track, one or more audio tracks and sometimes subtitles.
* The **codec** is how the food inside was packed. H.264, H.265, VP9 and AV1 are video codecs. AAC, Opus and MP3 are audio codecs.

A player needs to open both: the box and the packing. That is why two files that both end in .mp4 can behave differently. One holds H.264, which everything plays, and the other holds AV1, which older devices can't decode.

![](/blog/images/video-container-and-codec-explained.webp "An MP4 file is a container holding separately packed tracks")

## The four video formats you will meet

| Format | Usually holds | Plays well on | Good for |
| --- | --- | --- | --- |
| MP4 | H.264 or H.265 video, AAC audio | Almost everything | Phones, sharing, everyday use |
| WebM | VP9 or AV1 video, Opus audio | Browsers, Android, computers | YouTube's sharpest versions |
| MOV | H.264, H.265 or ProRes | Apple devices, editing apps | iPhone recordings, editing |
| MKV | Nearly any codec | VLC, Plex, many smart TVs | Films with many audio or subtitle tracks |

### MP4

The safe choice. If you don't know what to pick, pick MP4. When a site offers the same quality as both MP4 and WebM, PasteAndSave gives you the MP4 copy for exactly that reason.

### WebM

The format Google uses for much of YouTube. It often carries the highest qualities, such as 1440p and 4K, in a smaller file. It plays fine in browsers and on Android. The iPhone Photos app and some older TVs are less happy with it.

### MOV

Apple's own format, and what an iPhone records. It plays on every Apple device and opens in every editing app. Outside Apple, use MP4 instead, since the same video in MP4 is far more widely supported.

### MKV

A very flexible box that can hold almost anything, which is why films with several languages and subtitles often come as MKV. Most phones' built in players won't open it. VLC will.

## Video codecs in plain words

* **H.264:** the oldest of the four and the most widely supported. Every phone, browser and TV made in the last ten years plays it.
* **H.265, also called HEVC:** about half the size of H.264 for the same look. iPhones record in it. Some Windows computers need an extra add on to play it.
* **VP9:** Google's codec, used across YouTube.
* **AV1:** the newest and most efficient, used more and more by YouTube and Netflix. Older phones and laptops may struggle to play it smoothly.

## Audio formats: MP3, M4A and Opus

* **MP3** plays on every device ever made. Pick it when you need the sound to work everywhere, including car stereos.
* **M4A** holds AAC audio, which sounds better than MP3 at the same size. Apple devices love it.
* **Opus** is the most efficient of all and is what YouTube streams. It hides inside WebM files, and you rarely meet it on its own.

On PasteAndSave, the M4A option keeps the original audio without converting it where the source allows, so nothing is lost. MP3 is converted at the bitrate you choose. The [video to MP3 guide](/blog/convert-video-to-mp3) explains which bitrate to pick.

## Which format should you download?

1. **For a phone or for sharing:** MP4.
2. **For the sharpest YouTube copy on a computer:** the highest quality on offer, even if it is WebM.
3. **For editing:** the highest quality on offer, in any format. Your editor will open it.
4. **For music or a podcast:** MP3 if it must play everywhere, M4A if you want the best sound for the size.

## A file won't play? Try these, in order

* **Install VLC.** It is free on every phone and computer and plays nearly every format above.
* **Check the ending of the file name.** If it is not a video or audio format, such as .exe or .zip, delete it. That is not a video.
* **Convert it with HandBrake.** This free program turns any of these formats into a plain MP4 with H.264 that plays everywhere.
* **Download again as MP4.** If the source offers an MP4 version, that is the quickest fix of all.

## Next lesson

You know how to pick a quality and a format. Lesson 4, [Is It Legal to Download Videos?](/blog/is-it-legal-to-download-videos), covers what you are allowed to do with the file once you have it.
`},e={slug:"is-it-legal-to-download-videos",title:"Is It Legal to Download Videos? A Plain Guide to the Rules",seoTitle:"Is It Legal to Download Videos? Plain English Guide",description:"When downloading a video is fine and when it isn't, and how copyright, Creative Commons and platform rules apply. Written for everyday users, not lawyers.",excerpt:"Having a file on your phone is not the same as owning it. A plain guide to copyright, permission, Creative Commons and the rules platforms set.",category:"basics",lesson:4,published:"2026-10-29",updated:"2026-10-29",keywords:["is it legal to download youtube videos","is it legal to download videos","is downloading tiktok videos legal","copyright video download","can i repost a video with credit"],faqs:[{q:"Is it illegal to download YouTube videos for personal use?",a:"It depends on your country. YouTube's terms only allow downloads through its own download button or with permission, and copyright law decides what you may do with the copy. Saving your own uploads or Creative Commons videos is generally fine. Reposting someone else's video is not."},{q:"Does giving credit make it legal to repost a video?",a:"No. Credit is polite, but it is not permission. Writing the creator's name or 'no copyright intended' under a repost does not give you the right to use their work. Only the owner, or a licence they chose, can do that."},{q:"Can I download Creative Commons videos?",a:"Yes. Creative Commons videos are shared on purpose under a licence that allows copying. Read which licence it is: most ask you to credit the creator, and some forbid commercial use or edits."},{q:"Is it legal to download TikTok videos?",a:"Saving a TikTok for yourself is treated very differently from reposting it. Creators can allow or block TikTok's own Save button, which tells you their wishes. Reusing someone's TikTok in your own posts or ads needs their permission."}],body:`
Having a file on your phone is not the same as owning it. You can download a video in seconds and still have no right to post it anywhere. Most trouble people get into comes from mixing those two up.

This guide explains the rules in plain words. It is general information, not legal advice, and the details differ from country to country. When something matters, such as using a clip in an ad, ask the owner or a lawyer.

## Who owns a video?

Whoever made it, from the moment it was made. In most countries copyright is automatic: no form, no symbol, no registration. A TikTok filmed this morning is protected the same way a film from a big studio is.

Posting a video publicly does not give it away. Public means anyone may **watch** it on the platform. It does not mean anyone may copy it, edit it or post it again.

Downloading creates a copy. Whether that copy is fine depends on what it is and what you do with it.

![](/blog/images/is-downloading-videos-legal-fine-gray-area-not-okay.webp "The three groups this lesson covers, at a glance")

## Usually fine

* **Your own videos.** Downloading what you uploaded, for a backup or to post on another app, is your right.
* **Creative Commons videos.** The creator chose a licence that allows copying. YouTube lets creators mark videos this way, and sites like Wikimedia Commons are full of them. Follow the licence, which usually means giving credit.
* **Public domain material.** Very old films and many government videos have no copyright left, or never had any.
* **Videos you have permission for.** A message from the creator saying yes, kept somewhere safe, settles it.
* **Videos the platform lets you save.** When TikTok shows a Save video button, the creator allowed downloads.

## Gray areas

* **Saving a public video to watch offline.** Some countries allow private copies for personal use, others don't, and most platforms' terms say no. It is a common thing to do, but it is not automatically allowed.
* **Short clips for review, commentary, teaching or news.** In the United States this may be fair use, which is judged case by case. Other countries have similar ideas, often called fair dealing, with narrower rules.
* **Showing a video in a classroom.** Many countries have education exceptions, with conditions on how and where.

## Usually not okay

* Posting someone else's video on your own account, with or without credit.
* Using clips in ads, paid promotions or monetized videos without a licence.
* Selling copies, or putting them behind a paywall.
* Getting around copy protection on paid services such as Netflix, Disney+ or Spotify. In many countries, including the United States and the EU, breaking that protection is against the law on its own. PasteAndSave does not do it and never will.

## Platform rules are a separate layer

Every platform has terms of service, and they are a contract between you and the platform, separate from copyright law. YouTube's terms, for example, don't allow downloading except through YouTube's own features or with permission. Breaking a platform's terms can cost you your account even when no copyright law was broken.

## Credit is not permission

"Credit to the owner" and "no copyright intended" under a reposted video don't make the repost legal. They tell everyone you knew it wasn't yours. Credit is good manners on top of permission, never a replacement for it.

## How to ask for permission

Asking takes two minutes, and creators say yes more often than people expect. A message like this works:

> Hi, I loved your video about [topic]. Could I share it on my page [name], with your name and a link back to you? I won't edit it or use it in ads. Thank you!

Keep the reply. A screenshot of a clear yes is your proof later.

## Where PasteAndSave fits in

PasteAndSave is a tool, like a screen recorder or a browser. It only reaches videos anyone could watch without logging in, and it never touches copy protected streams. What you do with the file is your decision and your responsibility, which is why our [Terms of Service](/terms) ask you to download only what you have the right to use.

## Next lesson

One lesson left. [Are Online Video Downloaders Safe?](/blog/are-online-video-downloaders-safe) shows how to spot a bad download site in thirty seconds, and what a good one does with your data.
`},f={slug:"are-online-video-downloaders-safe",title:"Are Online Video Downloaders Safe? How to Spot a Bad One",seoTitle:"Are Online Video Downloaders Safe? What to Check",description:"Most video downloader sites are safe if you know the warning signs. What a good one never asks for, how to check a file, and what to do after a bad click.",excerpt:"A video file can't hurt your phone. A fake installer can. Here is how to tell a good download site from a bad one in thirty seconds.",category:"basics",lesson:5,published:"2026-10-29",updated:"2026-10-29",keywords:["are video downloaders safe","safe video downloader","is it safe to download videos online","video downloader virus","online video downloader no virus","fake download button"],faqs:[{q:"Can a video file give my phone a virus?",a:"A normal MP4, WebM or MP3 file is data that a player reads, not a program that runs, so on its own it can't install anything. The danger is a file that only pretends to be a video, such as one ending in .exe or .apk, or a site that pushes you to install an app."},{q:"Is PasteAndSave safe to use?",a:"PasteAndSave has no accounts, never asks for a password and never asks you to install anything to save a video. Files are MP4, WebM, MP3 or M4A, and the copy on our server is deleted within fifteen minutes. The privacy policy lists everything we keep."},{q:"Why does a download site want to send me notifications?",a:"Notification spam is a common way bad sites earn money. Once you allow it, the site can push fake virus warnings and ads to your screen even after you close it. A downloader never needs notifications to work, so always choose Block."},{q:"What should I do if I installed something from a download site?",a:"Uninstall it straight away, then run a full scan with Microsoft Defender on Windows or Play Protect on Android. If you typed a password into it, change that password on the real site and turn on two step sign in."}],tool:{href:"/",label:"Try the downloader"},body:`
Saving a video from the internet is safe in itself. A video file is like a photo: your phone reads it and shows it, and that's all it can do. The trouble comes from the sites around it, the ones built to trick you into installing something, typing a password or allowing a flood of pop up ads.

The good news is that bad sites give themselves away fast. This lesson shows you the signs, so you can judge any downloader, including ours.

## What can actually go wrong

Most people worry about the wrong thing. The video you download is very rarely the problem. These are the real risks, roughly from most to least common:

* **Fake download buttons.** Big green buttons inside ads that lead to something else entirely.
* **Notification spam.** A site asks to "allow notifications to continue" and then fills your screen with fake warnings for weeks.
* **Installers.** You are told to get a "player", "codec" or "download manager" before you can save one video. That program is the real product, and it often comes with adware.
* **Password traps.** A page asks you to "log in with Instagram" to see a private video. It is collecting your password.
* **Endless redirects.** Every click opens a new tab somewhere you never wanted to go.

None of these needs the video at all. They are tricks layered on top of a download page.

## A video file can't hurt you, a program can

The quickest safety check is the end of the file name, called the extension. Video and audio files end in one of these:

* **.mp4, .webm, .mov, .mkv** for video
* **.mp3, .m4a, .opus** for audio

A file ending in **.exe, .msi, .apk, .dmg, .bat** or **.scr** is a program. A ZIP file can hide a program inside it. If you asked for a video and got one of these, delete it without opening it.

### Show file extensions on Windows

Windows hides extensions by default, which is how a file called "funny video.mp4.exe" passes for a video. To see the real ending, open File Explorer, choose **View**, then **Show**, and tick **File name extensions**. It takes ten seconds and protects you on every download from now on.

## Seven warning signs of a bad downloader

![](/blog/images/safe-video-downloader-checklist.webp "Quick signs of a safe downloader and warning signs of a bad one")

If you see any one of these, close the tab:

1. It asks for your password to TikTok, Instagram, Facebook or any other site.
2. It wants you to install an app, player, codec or extension before saving one video.
3. The file you get is not a video or audio file.
4. It asks to send you notifications.
5. There are several download buttons, and the biggest ones are inside ads.
6. Clicking anywhere on the page opens new tabs or windows.
7. It promises things that aren't possible, such as private accounts or Netflix films. A tool can't reach what you can't watch while logged out, and paid streaming is copy protected.

The last one matters more than it looks. A site that claims to download private videos is either lying or asking for your login, and neither is good news for you.

## What a safe downloader does with your data

A good site tells you plainly what it keeps. Here is how PasteAndSave works, as an example of what to look for:

* **No accounts.** There is nothing to sign up for, so there is no profile and no download history.
* **The link you paste** is held in memory for about ten minutes so the same link loads fast a second time, then it is discarded.
* **The video file** passes through our server on its way to you and is deleted afterwards, within fifteen minutes at most.
* **Your IP address** is used to stop one person from overloading the service for everyone else.
* **Analytics and ads.** The site uses Google Analytics and shows ads, both of which a normal content blocker can switch off without breaking the downloader.

All of this is in our [privacy policy](/privacy). If a downloader has no privacy policy at all, or one that says nothing specific, treat that as a warning sign of its own.

## Staying safe on a phone

### iPhone and iPad

You don't need any app to save a video. Safari downloads files on its own and puts them in the **Files** app. An App Store app that promises to download videos from social sites often gets removed, then comes back under a new name full of ads. The browser is the safer route. The [iPhone and Android guide](/blog/save-videos-on-iphone-and-android) shows where files go.

### Android

Never install an APK file from a download site. Apps from outside the Play Store skip Google's checks, and "video downloader" APKs are a favourite hiding place for adware. Chrome can save videos straight into your **Download** folder with no app at all.

## If you already clicked something bad

Don't panic. Most problems are easy to undo:

* **You allowed notifications.** In Chrome, open **Settings**, then **Privacy and security**, then **Site settings**, then **Notifications**, and remove the site. Safari on a Mac has the same list under **Settings**, then **Websites**.
* **You installed a program.** Uninstall it, then run a full scan with Microsoft Defender on Windows or Play Protect on Android.
* **You typed a password into a strange page.** Change that password on the real site now, and turn on two step sign in.
* **You downloaded a file but didn't open it.** Delete it. An unopened file can't do anything.

## You've finished the basics

That's all five lessons. You know how downloaders work, which quality and format to pick, what the rules are, and how to stay safe. Now put it to work with a guide for the app you use most:

* [Download TikTok videos without a watermark](/blog/download-tiktok-without-watermark)
* [Download Instagram Reels, Stories and photos](/blog/download-instagram-reels)
* [Download YouTube videos](/blog/download-youtube-videos)
* [Download Facebook videos and Reels](/blog/download-facebook-videos)
* [Save videos to your iPhone or Android phone](/blog/save-videos-on-iphone-and-android)
`},g={slug:"download-tiktok-without-watermark",title:"How to Download TikTok Videos Without a Watermark",seoTitle:"How to Download TikTok Videos Without a Watermark",description:"Save TikTok videos without the watermark on iPhone, Android or a computer. Step by step, plus how to keep just the sound as MP3 and fix videos that won't save.",excerpt:"TikTok's own Save button stamps a moving logo on every video. Here is how to get the clean version on any phone or computer, in under a minute.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download tiktok without watermark","tiktok video downloader","save tiktok video","tiktok to mp3","download tiktok on iphone","tiktok no watermark"],faqs:[{q:"Can I download TikTok videos without the app?",a:"Yes. Open the video on tiktok.com in any browser, copy the address, and paste it into a TikTok downloader. You don't need the app or a TikTok account for public videos."},{q:"Why is there no Save video button on some TikToks?",a:"Creators can switch off downloads for their videos. When the button is missing, that is the creator's choice, so ask them before saving or sharing the video."},{q:"What quality are TikTok downloads?",a:"You get the best version TikTok stores for that video, usually 720p or 1080p. A downloader cannot make it sharper than the upload, so a video filmed in low light or uploaded small stays that way."},{q:"Can I download a TikTok photo slideshow?",a:"Yes. Paste the slideshow link and the photos are listed so you can save them, and where TikTok includes the music, it shows up under the Audio tab."}],tool:{href:"/tiktok-video-downloader",label:"Open the TikTok downloader"},body:`
TikTok's own **Save video** button stamps the TikTok logo and the creator's username onto the file, and moves it around the corners while the video plays. It also adds a few seconds of TikTok branding at the end. Fine for a quick share, annoying if you want to watch it in your gallery or use it in an edit.

TikTok stores a clean copy of every video, the one its app actually plays. A downloader like PasteAndSave fetches that copy. Here is how to do it on any device.

![](/blog/images/download-tiktok-video-without-watermark-steps.webp "Copy the link in TikTok, paste it into PasteAndSave, pick a quality")

## On iPhone

1. In TikTok, open the video and tap **Share**, the arrow on the right side.
2. Tap **Copy link**.
3. Open Safari and go to the [TikTok downloader](/tiktok-video-downloader).
4. Tap the box, tap **Paste**, then tap **Download**.
5. Pick a quality from the list. The highest is usually 1080p or 720p.
6. Tap **Download** in the box Safari shows.

The video lands in the **Files** app, in the **Downloads** folder. To move it into Photos, open it in Files, tap the share icon and choose **Save Video**.

The [iPhone and Android guide](/blog/save-videos-on-iphone-and-android) has more on where files go and how to find them.

## On Android

1. In TikTok, tap **Share** on the video, then **Copy link**.
2. Open Chrome and go to the [TikTok downloader](/tiktok-video-downloader).
3. Long press the box, choose **Paste**, then tap **Download**.
4. Choose a quality.

The file goes to your **Download** folder. Most gallery apps, including Samsung Gallery and Google Photos, show it there within a few seconds.

## On a computer

1. Open the video on tiktok.com, or right click it and copy the link.
2. Paste it into the [TikTok downloader](/tiktok-video-downloader) and press **Download**.
3. Pick a quality and the MP4 saves to your downloads folder.

If you save TikToks often on a computer, the [PasteAndSave browser extension](/extension) adds a download button to the page, so you skip the copy and paste.

## Keep just the sound as an MP3

Trending sounds are half of TikTok. To keep only the audio:

* Paste the link as above.
* Open the **Audio** tab instead of picking a video quality.
* Choose **MP3** for something that plays everywhere, or **M4A** to keep the original sound without converting it.

There is no point picking 320 kbps for a TikTok sound. TikTok stores audio at a modest bitrate, and a bigger MP3 cannot add quality that was never there. The [MP3 guide](/blog/convert-video-to-mp3) explains bitrates in two minutes.

## Photo slideshows

A slideshow is a post made of photos with music on top. Paste its link the same way. The photos are listed one by one so you can save the ones you want, and the music, where TikTok includes it, sits in the Audio tab.

## When a TikTok won't download

These are the messages you are most likely to see, and what they mean:

* **"This one is private."** The account is private, or the video is set to friends only. Only the people it was shared with can see it.
* **"This video was removed or is no longer available."** The creator deleted it, or TikTok took it down.
* **"TikTok doesn't show this post in our server's region."** TikTok hides some videos from some countries, including the one our server is in. Nothing on your side will change that.
* **"This needs a sign in to watch."** TikTok asks for a login before showing some videos, often ones marked for adults.

The full list is in [Why a Video Won't Download](/blog/video-wont-download).

## Be fair to the people who make them

A saved TikTok is great for watching offline, keeping a recipe or building a mood board. Posting it on your own account is a different thing. If a creator switched off TikTok's Save button, take that as a no, and ask before you save it. And if you want to repost, send a message first. The [legal guide](/blog/is-it-legal-to-download-videos) has a short message you can copy.

Ready? Copy a TikTok link and paste it into the [TikTok downloader](/tiktok-video-downloader).
`},h={slug:"download-instagram-reels",title:"How to Download Instagram Reels, Stories and Photos",seoTitle:"How to Download Instagram Reels, Stories and Photos",description:"Save Instagram Reels, videos, Stories and photo posts in full quality on any phone or computer, without logging in. Clear steps and fixes for common errors.",excerpt:"Instagram's bookmark only saves a post inside the app. Here is how to keep Reels, Stories and photos as real files on your phone or computer.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download instagram reels","instagram video downloader","save instagram reels to gallery","download instagram stories","instagram photo downloader","instagram reels to mp3"],faqs:[{q:"Can I download Instagram Reels with the music?",a:"Yes. A downloaded Reel keeps its sound, music included. If you only want the audio, open the Audio tab after pasting the link and save it as MP3 or M4A."},{q:"Why can't I download a Reel from a private account?",a:"Private posts are only shown to approved followers who are logged in. A downloader sees Instagram as a visitor who is not logged in, so private Reels, Stories and posts stay out of reach."},{q:"How do I download every photo in an Instagram carousel?",a:"Paste the post's link once. The items in the carousel are listed one by one, so you can save each in full resolution without copying separate links."},{q:"Where do downloaded Reels go on iPhone?",a:"Safari puts them in the Files app, in the Downloads folder. Open the file, tap the share icon and choose Save Video to move it into Photos."}],tool:{href:"/instagram-video-downloader",label:"Open the Instagram downloader"},body:`
Instagram's **Save** button, the little bookmark, doesn't save anything to your phone. It adds the post to a list inside the app, and the post disappears from that list the day the owner deletes it. To keep a Reel, a Story or a photo for real, you need it as a file.

## What you can download

* **Reels**, with their sound, up to 1080p.
* **Videos** from the main feed.
* **Photo posts**, at full resolution.
* **Carousels**, the posts with several photos or videos you swipe through. Each item is listed separately.
* **Public Stories**, while they are still up. Stories disappear after 24 hours, so save them quickly.

All of these work only for **public** accounts. More on that below.

## How to download a Reel on your phone

1. Open the Reel in Instagram.
2. Tap the **paper plane** icon, then **Copy link**. On some versions you tap the three dots first, then **Copy link**.
3. Open your browser and go to the [Instagram downloader](/instagram-video-downloader).
4. Paste the link into the box and tap **Download**.
5. Choose a quality. The top one is usually the full 1080p version.

![](/blog/images/download-instagram-reel-steps.webp "Copy the Reel's link, paste it into PasteAndSave, choose a quality")

On iPhone, the file goes to **Files**, then **Downloads**. Open it, tap share and choose **Save Video** to put it in Photos. On Android it goes to the **Download** folder, which your gallery app picks up by itself.

## How to download photos and carousels

Copy the post's link the same way, from the paper plane or the three dots, and paste it in. A single photo post shows one image in full resolution. A carousel lists its items one by one, so you can save the one you want or all of them.

## How to download a Story

1. Open the Story on a **public** account.
2. Tap the paper plane or the three dots, then **Copy link**. If there is no copy option, the account is private or the Story can't be shared.
3. Paste the link into the downloader.

Stories stay up for 24 hours, then the link stops working. If you want one, save it the same day.

## Keep only the audio

Reels are where a lot of new music and voice clips first show up. To keep just the sound, paste the link and open the **Audio** tab. **MP3** plays everywhere. **M4A** keeps the original sound without converting it. The [MP3 guide](/blog/convert-video-to-mp3) explains the bitrate options.

## Why some Instagram posts won't download

The downloader sees Instagram the way someone who isn't logged in sees it. That is deliberate: we never ask for your Instagram password, and nor should any download site. It also means:

* **Private accounts are out of reach.** Their posts are only shown to approved followers.
* **Some posts need a login to view at all.** Instagram sometimes hides posts from logged out visitors. When that happens you will see "This Instagram post can only be seen when signed in, or it's private."
* **Deleted posts are gone.** The link may still open, but there is nothing behind it.
* **Expired Stories can't be fetched.** After 24 hours they are no longer public.

If a post opens fine in a private browser window on your phone, with no login, it will almost always work in the downloader too. That is a quick way to check. The [troubleshooting guide](/blog/video-wont-download) covers every message in detail.

## A word on reposting

Downloading a Reel to watch later or keep for reference is one thing. Posting it on your own account is another, and credit in the caption doesn't make it okay. If you want to share someone's Reel, use Instagram's own share button, or ask them first. The [legal guide](/blog/is-it-legal-to-download-videos) explains why.

Got a Reel in mind? Paste its link into the [Instagram downloader](/instagram-video-downloader) or the [Reels downloader](/instagram-reels-downloader).
`},i={slug:"download-youtube-videos",title:"How to Download YouTube Videos on Any Phone or Computer",seoTitle:"How to Download YouTube Videos on Phone or Computer",description:"Save YouTube videos and Shorts as MP4 in 720p, 1080p or 4K, on iPhone, Android or a computer. Plus why HD takes longer and what to do when a video won't save.",excerpt:"Copy the link, paste it, pick a quality. Here is the full walk through for every device, and why the 1080p version takes a few seconds longer than 720p.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download youtube videos","youtube video downloader","save youtube video to phone","download youtube shorts","youtube to mp4","download youtube video 1080p"],faqs:[{q:"Can I download YouTube videos in 4K?",a:"Yes, when the creator uploaded the video in 4K. The quality list shows 2160p for those videos. A 4K file is large, often 80 to 150 MB for every minute, so pick it only if you will watch on a big screen or edit the footage."},{q:"Why does my downloaded YouTube video have no sound?",a:"It shouldn't on PasteAndSave. YouTube stores its HD picture and its sound in separate files, and our server joins them before sending you one MP4. If you saved a file some other way and got silence, you most likely got the picture track alone."},{q:"How do I download a YouTube Short?",a:"Tap Share under the Short, then Copy link, and paste it into the YouTube downloader exactly like a normal video. Shorts are tall videos, so they show up as 1080p or 720p, named by their width."},{q:"Is downloading YouTube videos allowed?",a:"YouTube's terms allow downloading only through its own features, such as offline viewing with YouTube Premium, or with permission from the owner. Saving your own uploads, or videos the creator released under Creative Commons, is fine."}],tool:{href:"/youtube-video-downloader",label:"Open the YouTube downloader"},body:`
YouTube is the one site where a downloader has the most choice. The same video can sit on YouTube's servers in eight or nine sizes, from a blurry 144p up to 4K. Picking the right one saves you space, data and waiting time.

This guide covers every device, then the two things that confuse people most: why HD takes longer, and what the messages mean when a video won't save.

## First, what YouTube itself offers

Before using any downloader, know the official routes:

* **YouTube Premium** lets you save videos inside the YouTube app for offline viewing. You can't move them out of the app, but for watching on a flight it is the simplest option.
* **Your own uploads** can be downloaded from YouTube Studio. Open **Content**, find the video, open the three dot menu and choose **Download**.

For everything else, YouTube's terms ask for the owner's permission. The [legal lesson](/blog/is-it-legal-to-download-videos) explains what that means in practice, and when a video is free to save, such as one released under Creative Commons.

## On a computer

1. Open the video on youtube.com and copy the address from the address bar. You can also right click the video and choose **Copy video URL**.
2. Go to the [YouTube downloader](/youtube-video-downloader), paste the link and press **Download**.
3. Pick a quality from the list. The file saves to your normal downloads folder as an MP4 or WebM.

## On iPhone

1. In the YouTube app, tap **Share** under the video, then **Copy link**.
2. Open Safari and go to the [YouTube downloader](/youtube-video-downloader).
3. Tap the box, tap **Paste**, then tap **Download**.
4. Choose a quality, then tap **Download** when Safari asks.

The video lands in the **Files** app, in **Downloads**. Open it, tap the share icon and choose **Save Video** to put it in Photos.

## On Android

1. In the YouTube app, tap **Share**, then **Copy link**.
2. Open Chrome, go to the [YouTube downloader](/youtube-video-downloader) and paste the link.
3. Tap **Download** and choose a quality.

The file goes to your **Download** folder, and your gallery app picks it up within a few seconds.

## Picking a quality

![](/blog/images/pasteandsave-quality-list-video-and-audio-options.webp "Every size YouTube stores for the video, each with its own Save button")

The list shows every size YouTube has for that video. A few rules of thumb:

* **720p** for watching on a phone. Sharp enough, and a fraction of the size.
* **1080p** for a laptop or TV.
* **2160p (4K)** only if you will watch on a big screen or edit the footage.
* **WebM or MP4?** Both play in modern browsers and on most phones. If you are not sure, MP4 is the safe choice for older TVs and editing apps. The [formats lesson](/blog/video-formats-explained) explains why.

### Why 1080p takes longer than 720p

![](/blog/images/youtube-hd-video-and-audio-joined.webp "YouTube's HD picture and its sound arrive as two files and leave as one")

YouTube keeps its HD and 4K versions as picture only, with the sound in a separate file. When you pick one of those, our server fetches both and joins them into a single file with sound. That joining is the progress bar you see before the download starts. A 720p file often has the sound already inside, so it skips that step.

## YouTube Shorts

Shorts work exactly like normal videos. Tap **Share** on the Short, then **Copy link**, and paste it. Because Shorts are tall, PasteAndSave names their quality by the short side, so a 1080 by 1920 Short is listed as **1080p**.

## Just the audio

For a song, a podcast or a lecture, skip the video entirely. After pasting the link, open the **Audio** tab and choose **MP3**, or **M4A** to keep YouTube's own sound without converting it. There is also a dedicated [YouTube to MP3](/youtube-to-mp3) page, and the [MP3 guide](/blog/convert-video-to-mp3) explains which bitrate is worth picking.

## A whole playlist

Paste the link of a playlist and you get a list of its videos to choose from, one at a time. The [playlist guide](/blog/download-youtube-playlist) shows how to copy the right link.

## When a YouTube video won't download

These are the messages you are most likely to see:

* **"This one is private or needs a sign in."** Private videos, members only videos and age restricted videos all need a logged in account. PasteAndSave never logs in, so these can't be saved here.
* **"This site is turning our server away right now."** YouTube limits how often one server may ask for videos. Wait a minute and try again. It usually clears up by itself.
* **"This video is copy protected."** Films and shows you buy or rent on YouTube are encrypted, and getting around that is illegal in many countries.
* **"This video was removed or is no longer available."** The owner deleted it, or YouTube took it down.

Unlisted videos, the ones you can only find with the link, download normally, because anyone with the link can watch them. For the rest, [Why a Video Won't Download](/blog/video-wont-download) lists every message.

Got a link ready? Paste it into the [YouTube downloader](/youtube-video-downloader).
`},j={slug:"download-youtube-playlist",title:"How to Download Videos From a YouTube Playlist",seoTitle:"How to Download Videos From a YouTube Playlist",description:"Paste a YouTube playlist link to see its videos in a list, then save the ones you want as MP4 or MP3. How to copy the right link, and which playlists open.",excerpt:"A playlist link opens as a list you can pick from. The trick is copying the playlist's own link, not the link of the video playing inside it.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download youtube playlist","youtube playlist downloader","save youtube playlist","youtube playlist to mp3","download videos from playlist"],faqs:[{q:"Can I download a whole YouTube playlist at once?",a:"Not on PasteAndSave. A playlist opens as a list of up to 25 videos, and you save each one you want with its own quality. Saving one at a time keeps the server fair for everyone and lets you skip the videos you don't need."},{q:"Why does my playlist link open only one video?",a:"You copied the link of a video playing inside the playlist, not the playlist itself. Open the playlist's own page, the one that lists every video, and copy that address or use its Share button. The link should contain the word playlist."},{q:"Can I download my Watch Later or Liked videos playlist?",a:"No. Watch Later and Liked videos are always private to your account, so only you can see them while logged in. PasteAndSave never logs in, so it sees what any visitor sees, which for those lists is nothing."},{q:"How many videos does the list show?",a:"Up to the first 25 videos of the playlist. If the playlist is longer, the list says it is showing the first 25. For a later video, open it on YouTube and paste its own link instead."}],tool:{href:"/youtube-video-downloader",label:"Open the YouTube downloader"},body:`
A YouTube playlist is a page with a list of videos on it, not one big file. So a downloader can't hand you "the playlist". What it can do is read the list and let you pick the videos you want, each in the quality you want.

That is how PasteAndSave works. Paste a playlist link and you get its videos in a list. Tap one and you get the normal quality list for that video.

## Copy the right link

This is where most people get stuck. There are two kinds of link, and they look alike:

* **The playlist's own link.** It contains the word **playlist**, like youtube.com/playlist?list= followed by a code. This is the one you want.
* **A video playing inside a playlist.** It starts with youtube.com/watch and also carries the playlist code. A downloader treats this as one video, because that is what it points to.

### On a computer

Open the playlist's page, the one with the title and the full list of videos on it. Copy the address from the address bar. If you are watching a video in the playlist, click the playlist's title in the panel on the right to get to that page first.

### On a phone

In the YouTube app, open **You**, then **Playlists**, and tap the playlist. On the playlist screen, tap **Share**, then **Copy link**. Sharing from inside a video gives you the video's link instead.

## Paste it and pick a video

![](/blog/images/download-youtube-playlist-one-video-at-a-time.webp "Pick a video from the list, then pick its quality")

1. Go to the [YouTube downloader](/youtube-video-downloader) and paste the playlist link.
2. Press **Download**. Instead of qualities, you see the playlist's title and its videos.
3. Tap the video you want. Its quality list opens underneath, and the playlist stays on screen.
4. Pick a quality and save it.
5. Tap the next video in the list and repeat.

Each video saves as its own file, named after the video, so they stay easy to sort in your downloads folder.

## Why 25 videos, and one at a time

Every video is fetched by our server and then sent on to you. A playlist of two hundred videos, all at once, would tie up the server for everyone else for a long time, and most people only want a few videos from a long list anyway.

So the list shows the first 25 videos, and you save the ones you need. If the playlist is longer, the list tells you it is showing the first 25. For a video further down, open it on YouTube and paste its own link.

## Saving a playlist as MP3s

Music playlists and podcast series are the most common reason people want a whole playlist. The steps are the same:

* Paste the playlist link and tap a video.
* Open the **Audio** tab instead of picking a video quality.
* Choose **MP3**, or **M4A** to keep YouTube's own audio without converting it.

The [MP3 guide](/blog/convert-video-to-mp3) explains bitrates. Short version: 128 kbps is fine for speech, and anything above 256 kbps only makes a bigger file, because YouTube's own audio is not that detailed.

## Which playlists will open

* **Public playlists** open for anyone.
* **Unlisted playlists** open too, because anyone with the link can watch them.
* **Private playlists** don't, because only the owner can see them.
* **Watch Later** and **Liked videos** never open. YouTube keeps them private to your account, always.

Inside a public playlist, a single video can still be private, removed or age restricted. That video shows up in the list but won't download, while the others work normally. The [YouTube guide](/blog/download-youtube-videos) covers those messages.

## Be kind to the creators

A playlist is often someone's whole course or album. Saving a few lectures to watch on a train is one thing. Uploading the series somewhere else is another, and the [legal lesson](/blog/is-it-legal-to-download-videos) explains why. If a creator sells their course or music elsewhere, buying it is the best way to say thanks.

Ready? Copy the playlist's link and paste it into the [YouTube downloader](/youtube-video-downloader).
`},k={slug:"download-facebook-videos",title:"How to Download Facebook Videos and Reels in HD",seoTitle:"How to Download Facebook Videos and Reels in HD",description:"Save public Facebook videos and Reels as MP4 in HD on iPhone, Android or a computer. How to copy the link, HD or SD, and why some videos can't be saved.",excerpt:"Facebook has no Save to phone button for most videos. Here is how to keep a public video or Reel as a normal MP4, and why private ones stay private.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download facebook video","facebook video downloader","download facebook reels","save facebook video to phone","facebook video download hd","fb video download"],faqs:[{q:"Can I download a Facebook video from a private group?",a:"No. Videos in private groups, friends only posts and Stories can only be seen by people who are logged in and allowed to see them. PasteAndSave never logs in to Facebook, so it can only save videos that anyone could watch without an account."},{q:"What is the difference between HD and SD on Facebook?",a:"HD is the sharper version, usually 720p or 1080p, and SD is a smaller copy, often 360p or 480p. Pick HD for anything you will watch on a bigger screen, and SD if you are short on space or mobile data."},{q:"Do fb.watch links work?",a:"Yes. Short links from Facebook's Share button, including fb.watch and facebook.com/share links, are followed to the real video address for you. If one ever fails, open it in your browser and copy the full address from the address bar."},{q:"Does the person who posted the video know I downloaded it?",a:"No. The video is fetched by our server, not through your Facebook account, so nothing about the download is linked to you. That does not change the rules about reusing it, so ask the owner before you post it anywhere."}],tool:{href:"/facebook-video-downloader",label:"Open the Facebook downloader"},body:`
Facebook lets you save a video to a list inside Facebook, but not to your phone's gallery. For a recipe you want to cook from, a family clip or a talk you want to watch offline, a normal MP4 file is far more useful.

Here is how to get one from any public Facebook video or Reel.

## What you can save from Facebook

* **Videos on public Pages**, such as news outlets, brands and creators.
* **Reels** from public accounts.
* **Videos on public profiles**, where the post is set to Public.
* **Videos in public groups.**

What you can't save is anything that needs a login to see: friends only posts, private groups, Stories and videos Facebook limits to signed in viewers. That is not a missing feature. PasteAndSave sees Facebook the way a visitor with no account does, and those videos are invisible to that visitor.

## How to download on your phone

![](/blog/images/download-facebook-video-steps.webp "Copy the link in Facebook, paste it into PasteAndSave, pick HD or SD")

1. In the Facebook app, find the video or Reel and tap **Share**.
2. Tap **Copy link**.
3. Open your browser and go to the [Facebook downloader](/facebook-video-downloader).
4. Paste the link into the box and tap **Download**.
5. Pick a quality and save it.

On iPhone, the video goes to the **Files** app, in **Downloads**. Open it, tap the share icon and choose **Save Video** to move it into Photos. On Android it lands in the **Download** folder, and your gallery shows it within a few seconds. The [iPhone and Android guide](/blog/save-videos-on-iphone-and-android) has the details.

For Reels, the [Facebook Reels downloader](/facebook-reels-downloader) works the same way.

## How to download on a computer

1. Open the video on facebook.com.
2. Click the three dot menu on the post, or the **Share** button, and choose **Copy link**. You can also click the video's date to open it on its own page and copy the address from the address bar.
3. Paste the link into the [Facebook downloader](/facebook-video-downloader) and press **Download**.
4. Pick a quality. The MP4 saves to your downloads folder.

## HD or SD?

Facebook doesn't always store a long list of sizes. Sometimes you see qualities like 1080p and 720p, and sometimes just two rows called **HD** and **SD**.

* **HD** is the sharper version, usually 720p or 1080p. Pick it for a laptop, a TV or anything you might edit.
* **SD** is a smaller copy, often 360p or 480p. Fine for a quick look on a phone, or when space and data are tight.

A video that was uploaded small stays small. If the list stops at SD, that is all Facebook has. The [quality lesson](/blog/video-quality-explained) explains why a downloader can't add detail that was never there.

## Share links and fb.watch

When you tap **Copy link** in the Facebook app, you often get a short address, starting with fb.watch or facebook.com/share. These used to trip up downloaders, because they don't say which video they point to.

PasteAndSave follows these links to the real video address for you, so you can paste them as they are. If one ever fails, open the link in your browser, wait for the video page to load, and copy the full address from the address bar.

## Why a Facebook video won't download

These are the messages you are most likely to see, and what each one means:

* **"This Facebook video can only be watched when signed in, or it was taken down."** The video is limited to logged in viewers, or it has been removed.
* **"There's no video in this Facebook post that we can reach."** The post is a photo or text, or only signed in viewers can see its video.
* **"This video was removed or is no longer available."** The owner deleted it, or Facebook took it down.

A live broadcast is easiest to save after it ends, once Facebook has turned it into a normal video. Every other message is explained in [Why a Video Won't Download](/blog/video-wont-download).

## Before you repost

Facebook videos often travel far from the person who made them. Before you post one on your own Page or in a group, message the owner and ask. Most people say yes when you promise credit and a link back. The [legal lesson](/blog/is-it-legal-to-download-videos) has a short message you can copy.

Got a link? Paste it into the [Facebook downloader](/facebook-video-downloader).
`},l={slug:"download-twitter-x-videos",title:"How to Download Videos, GIFs and Photos From X (Twitter)",seoTitle:"How to Download X (Twitter) Videos, GIFs and Photos",description:"Save videos, GIFs and photos from X, formerly Twitter, on iPhone, Android or a computer. Copy the post link, paste it, pick a quality. Free, no account needed.",excerpt:"Every video, GIF and photo on X is one copied link away from your camera roll. Here is how, and why a few posts refuse.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download twitter video","x video downloader","twitter video downloader","download gif from twitter","save twitter video iphone","download x photos"],faqs:[{q:"Do twitter.com links still work?",a:"Yes. Links that start with twitter.com and links that start with x.com both work, and so do links copied from the app. They all point to the same post, so paste whichever one you have."},{q:"Why does a GIF from X download as an MP4?",a:"Because that is what it really is. X turns every GIF into a short silent MP4 video when it is posted, which is smaller and smoother. The file plays on a loop like a GIF in most players, and you can convert it back to a GIF with any free converter if you need one."},{q:"Can I download videos from a protected X account?",a:"No. Posts from protected accounts are visible only to approved followers who are logged in. PasteAndSave never logs in to X, so it can only save posts anyone could see without an account."},{q:"What quality are X videos?",a:"X keeps most videos at up to 1080p, along with smaller copies such as 720p and 480p for slow connections. The list shows every size X stores for the post, and a video uploaded small stays small."}],tool:{href:"/twitter-video-downloader",label:"Open the X video downloader"},body:`
X, which most people still call Twitter, has no download button. You can bookmark a post, but if it is deleted, so is your bookmark. To keep a clip for good, you need the file.

The good news: every video, GIF and photo on a public post can be saved with one copied link.

## Copy the post's link

The link you need is the address of the post itself:

* **In the app:** tap the **Share** icon under the post, then **Copy link**.
* **On a computer:** click the post's date or time to open it on its own page, then copy the address from the address bar. Or click **Share**, then **Copy link**.

A post link looks like x.com/ followed by the username, the word status and a long number. Links that start with twitter.com work just the same.

## Save it on a phone

![](/blog/images/download-x-twitter-video-steps.webp "Copy the post's link, paste it into PasteAndSave, pick a quality or photo")

1. Copy the post's link in the X app.
2. Open your browser and go to the [X video downloader](/twitter-video-downloader).
3. Paste the link and tap **Download**.
4. Pick a quality and save it.

On iPhone, Safari puts the file in **Files**, then **Downloads**. Open it, tap share and choose **Save Video** to add it to Photos. On Android, the file goes to the **Download** folder and shows up in your gallery. The [iPhone and Android guide](/blog/save-videos-on-iphone-and-android) has every step.

## Save it on a computer

Paste the link into the [X video downloader](/twitter-video-downloader), press **Download** and pick a quality. The MP4 goes to your downloads folder. If you save from X often, the [browser extension](/extension) adds a download button so you can skip the copy and paste.

## Which quality to pick

X stores most videos in a few sizes, usually up to 1080p, with smaller copies such as 720p and 480p for slow connections. The list shows whatever X has for that post.

* **1080p** for a laptop, a TV or editing.
* **720p** for watching on a phone, at about half the size.
* **The Audio tab** if you only want the sound, as MP3 or M4A.

## GIFs are videos on X

This surprises almost everyone. When someone posts a GIF on X, X turns it into a short MP4 video with no sound. That is why a GIF from X downloads as an MP4.

It is not a mistake, and it is usually better: the MP4 is smaller and smoother than the GIF would be. It plays on a loop in most phone galleries. If you truly need a .gif file, for a chat app that only takes GIFs for example, any free GIF converter can change it back.

## Photos

PasteAndSave saves photos from X too. Paste the link of a post with photos and each picture is listed on its own, at the size it was uploaded rather than a shrunken preview. Save the ones you want. In a post that has both photos and a video, the video is what gets listed.

## When an X post won't download

* **"There's no video in this X post that we can reach."** The post is text only, it was marked as sensitive, which needs a login to view, or it was removed.
* **"This one is private or needs a sign in."** The account is protected, so only approved followers can see its posts.
* **"This video was removed or is no longer available."** The post was deleted, or the account no longer exists.

If the post quotes another post and the video sits in the quoted one, open the quoted post and copy its link instead. For every other message, see [Why a Video Won't Download](/blog/video-wont-download).

## Credit the person who posted it

Clips on X spread fast, and the original poster often gets lost along the way. If you post a saved clip somewhere else, ask first and credit them by name. The [legal lesson](/blog/is-it-legal-to-download-videos) explains why credit alone is not permission.

Paste your link into the [X video downloader](/twitter-video-downloader) to try it.
`},m={slug:"download-reddit-videos-with-sound",title:"How to Download Reddit Videos With Sound",seoTitle:"How to Download Reddit Videos With Sound, Free",description:"Reddit videos often save with no sound, because Reddit keeps the picture and audio in separate files. How to download them as one MP4 with sound, on any device.",excerpt:"Saved a Reddit video and got silence? Reddit stores the sound in a separate file. Here is how to get both in one MP4.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["download reddit video with sound","reddit video downloader","reddit video no sound","save reddit video","v.redd.it downloader"],faqs:[{q:"Why do Reddit videos download without sound?",a:"Reddit stores the picture and the sound of a video as two separate files, and its player plays them together. Saving the video file on its own, with a right click or a screen grab tool, gets you the silent picture only."},{q:"What if the downloaded Reddit video is still silent?",a:"Then the video most likely had no sound to begin with. Some clips are uploaded muted, and Reddit shows no sound button on those. Play the post on Reddit and check whether the speaker icon is there before trying again."},{q:"Can I download videos from NSFW subreddits?",a:"Not here. Reddit only shows posts marked NSFW to people who are logged in, and PasteAndSave never logs in to Reddit, so those posts can't be reached."},{q:"Can I download a Reddit GIF?",a:"Yes. GIFs uploaded to Reddit are stored as short MP4 videos, so they download as MP4 files that loop in most players. If the post links to a GIF on another site, paste the link of that site instead."}],tool:{href:"/reddit-video-downloader",label:"Open the Reddit downloader"},body:`
You found a great clip on Reddit, saved it, and it plays in total silence. You didn't do anything wrong. Reddit stores every video in a way that makes this happen with most simple save methods.

Here is why, and how to get the video with its sound in one file.

## Why Reddit videos save without sound

![](/blog/images/reddit-video-and-sound-joined.webp "Reddit's silent video file and its sound file, joined into one")

When you upload a video to Reddit, it is split into two files: one with the picture and no sound, and one with only the sound. Reddit's player fetches both and plays them side by side, so on Reddit everything looks normal.

Right click and **Save video as**, or most quick download tools, grab only the picture file. That is the silent video you ended up with.

A proper downloader fetches both files and joins them. PasteAndSave does that on its server, so what arrives on your device is one MP4 with picture and sound together. You don't have to do anything extra.

## How to download a Reddit video

1. Open the post on Reddit.
2. Tap **Share**, then **Copy link**. On a computer, you can also copy the address from the address bar.
3. Go to the [Reddit downloader](/reddit-video-downloader) and paste the link.
4. Press **Download** and pick a quality.

The joining step adds a few seconds before the download starts. That pause is the server putting the sound back.

### Which link to use

A Reddit post link usually contains /comments/ followed by a short code and the post title. Short links from the app's Share button work too. If one ever fails, open it in your browser, let the post load, and copy the full address from the address bar.

## On iPhone and Android

The steps are the same in the Reddit app: **Share**, then **Copy link**, then paste it into the downloader in Safari or Chrome.

* **iPhone:** the video goes to **Files**, then **Downloads**. Open it, tap share and choose **Save Video** to put it in Photos.
* **Android:** it lands in the **Download** folder, and your gallery app shows it a few seconds later.

The [iPhone and Android guide](/blog/save-videos-on-iphone-and-android) covers where files go in more detail.

## GIFs and videos from other sites

Not every video on Reddit lives on Reddit:

* **Reddit GIFs** are stored as short MP4 videos, so they download as MP4s that loop in most players.
* **Posts that link to YouTube, Streamable or another site** only point to the video. Paste the link of the original site instead, and the downloader reads it from there.
* **Image posts and galleries** have no video in them, so there is nothing for a video downloader to save.

## Quality and size

Reddit keeps videos in several sizes, usually topping out at 720p or 1080p, depending on what was uploaded. Pick the top one for a computer screen and 480p or 720p to save space on a phone. Reddit clips are short, so even 1080p is rarely more than a few dozen MB.

## Posts that won't download

* **NSFW posts.** Reddit only shows these to logged in users, and PasteAndSave never logs in.
* **Private and banned subreddits.** Only members can see what is inside.
* **Removed posts.** The video is gone even if the post page still opens.
* **Posts with no sound button on Reddit.** These download fine, but silent, because they were uploaded muted.

For every message the downloader can show, see [Why a Video Won't Download](/blog/video-wont-download).

## Credit the original poster

Reddit clips get reposted endlessly, and the person who filmed it rarely gets credit. If you share a saved clip, link back to the post or name the uploader, and ask before using it anywhere public. The [legal lesson](/blog/is-it-legal-to-download-videos) explains the rules in plain words.

Paste a Reddit link into the [Reddit downloader](/reddit-video-downloader) to get the video with its sound.
`},n={slug:"save-videos-on-iphone-and-android",title:"How to Save Online Videos to Your iPhone or Android Phone",seoTitle:"How to Save Videos on iPhone and Android, Step by Step",description:"Where downloaded videos go on iPhone and Android, how to move them into Photos or your gallery, and how to fix a video that won't play or won't save.",excerpt:"The download worked, but where did the video go? Where files land on iPhone and Android, how to get them into your gallery, and what to do when one won't play.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["how to save videos on iphone","where do downloaded videos go on iphone","save video to gallery android","download video on phone","move video from files to photos"],faqs:[{q:"Where do downloaded videos go on iPhone?",a:"Videos downloaded in Safari go to the Files app, in a folder called Downloads. Depending on your settings it is under On My iPhone or under iCloud Drive. Tap the download arrow in Safari's address bar to jump straight to the file."},{q:"Why doesn't my downloaded video show up in Photos?",a:"Photos only shows videos you add to it. Open the video in the Files app, tap the share icon and choose Save Video, and it appears in Photos with your other videos."},{q:"How do I save a downloaded video to the gallery on Samsung?",a:"Downloads go to the Download folder, and Samsung Gallery shows that folder as an album, usually within a few seconds. If it doesn't, open My Files, find the video in Downloads and open it once."},{q:"Can I download videos on iPhone without an app?",a:"Yes. Safari can download files by itself since iOS 13. Paste the link into an online downloader, pick a quality, and Safari saves the file to the Files app with no extra app needed."}],tool:{href:"/",label:"Open the downloader"},body:`
The download worked, the bar filled up, and now the video is nowhere to be found. It happens to almost everyone the first time, and the answer is nearly always the same: the file is in your **Downloads** folder, not in your photos yet.

Here is exactly where files go and how to get them where you want them.

![](/blog/images/where-downloaded-videos-go-iphone-android.webp "The path a downloaded video takes on each kind of phone")

## On iPhone and iPad

### Step 1: Download in Safari

Since iOS 13, Safari can download files by itself, so you don't need any app.

1. Copy the video link from the app with **Share**, then **Copy link**.
2. Open Safari and paste it into the [downloader](/).
3. Pick a quality. When Safari asks, tap **Download**.

A small arrow appears in Safari's address bar while the file downloads. Tap it any time to see your downloads.

### Step 2: Find the file

Downloads go to the **Files** app, in a folder called **Downloads**. Open Files, tap **Browse**, and look under **iCloud Drive** or **On My iPhone**. Which one depends on a setting: **Settings**, then **Apps**, then **Safari**, then **Downloads**. On older versions of iOS it is **Settings**, then **Safari**, then **Downloads**.

Tip: choose **On My iPhone** there if your iCloud storage is nearly full. Big videos fill it fast.

### Step 3: Move it into Photos

1. Open the video in Files.
2. Tap the **share** icon, the square with an arrow.
3. Tap **Save Video**.

It now sits in Photos with everything else. Delete the copy in Files afterwards, so the video doesn't take up space twice.

### Using Chrome on iPhone?

Chrome asks what to do when the download finishes. Choose to save it to Files, then follow step 3 above.

## On Android

### Step 1: Download in Chrome

1. Copy the video link from the app's **Share** menu.
2. Open Chrome and paste it into the [downloader](/).
3. Pick a quality. A bar at the bottom shows the download.

### Step 2: Find the file

Every download goes to the **Download** folder on your phone's storage. You can reach it three ways:

* Tap **Open** on the bar Chrome shows when it finishes.
* Open the **Files** app, often called **Files by Google** or **My Files** on Samsung, then **Downloads**.
* In Chrome, tap the three dots, then **Downloads**.

### Step 3: See it in your gallery

Gallery apps scan the Download folder by themselves:

* **Samsung Gallery** shows it as an album called **Download**.
* **Google Photos** lists it under **Collections**, then **On this device**, then **Download**.

If it doesn't appear, open the file once from your Files app and it will be picked up.

## Space, data and battery

* **Use WiFi for big files.** A 10 minute video in 1080p can be 300 MB or more. The [video quality lesson](/blog/video-quality-explained) has sizes for every quality.
* **Pick 720p for phone viewing.** It looks sharp on any phone screen and is about half the size of 1080p.
* **Keep the screen on** for long downloads. Some phones pause downloads when the screen locks for a while.
* **Clear old downloads** from time to time. The Downloads folder grows quietly in the background.

## When a video won't play or won't save

* **"This file can't be played" on iPhone:** it is probably a WebM or MKV file. Download the MP4 version instead, or install the free VLC app, which plays nearly everything. The [formats lesson](/blog/video-formats-explained) explains why.
* **No sound:** try another quality. If you only want the sound, use the **Audio** tab and save an MP3.
* **Safari says it can't download the file:** check you have free space, then try again on WiFi.
* **The download stops halfway:** long videos take a while for our server to prepare. Leave the page open until the bar finishes.

## Try it now

Copy any video link and paste it into the [downloader](/). For app specific steps, see the guides for [TikTok](/blog/download-tiktok-without-watermark) and [Instagram](/blog/download-instagram-reels).
`},o={slug:"convert-video-to-mp3",title:"How to Convert a Video to MP3, and Which Bitrate to Choose",seoTitle:"How to Convert a Video to MP3 (Bitrate Guide)",description:"Turn a YouTube, TikTok or Instagram video into an MP3 in a few taps, and learn which bitrate to pick so you don't waste space or lose sound quality.",excerpt:"Getting the MP3 is the easy part. Picking the bitrate is where most people waste space. Here is how to do both, and when M4A is the better choice.",category:"guides",published:"2026-10-29",updated:"2026-10-29",keywords:["convert video to mp3","youtube to mp3","video to mp3 converter","best mp3 bitrate","320 kbps vs 128 kbps","mp3 vs m4a"],faqs:[{q:"Is 320 kbps better than 128 kbps?",a:"Only if the source has that much detail. Most online videos store their audio at around 128 to 160 kbps, so a 320 kbps MP3 of them is bigger but not better. For music from YouTube, 256 kbps or M4A is the sensible top choice."},{q:"What is the difference between MP3 and M4A?",a:"Both are audio files. MP3 plays on absolutely everything. M4A holds AAC audio, which sounds better at the same size, and on PasteAndSave it can keep the original sound without converting it. Choose MP3 for old devices and car stereos, M4A for everything else."},{q:"Can I convert a YouTube video to MP3 on iPhone?",a:"Yes. Copy the video link, paste it into the converter in Safari, open the Audio tab and choose MP3. The file goes to the Files app, where the Music app can't play it directly, so use the Files app or a player such as VLC."},{q:"Why does my MP3 sound worse than the video?",a:"Usually because a low bitrate was chosen, such as 64 or 96 kbps, which suit speech but not music. Convert again at 256 kbps or choose M4A to keep the original sound."}],tool:{href:"/video-to-mp3-converter",label:"Open the video to MP3 converter"},body:`
Getting the MP3 is the easy part. Picking the bitrate is where most people go wrong, usually by choosing the biggest number and filling their phone with files that sound no better.

On PasteAndSave, about **one download in twelve** is audio only, according to our own numbers for the last month. Here is how to make yours sound right at the smallest sensible size.

## How to convert a video to MP3

1. Copy the video link. In most apps that is **Share**, then **Copy link**.
2. Paste it into the [video to MP3 converter](/video-to-mp3-converter) and press **Download**.
3. Open the **Audio** tab.
4. Choose a format and bitrate, then save.

It works for YouTube, TikTok, Instagram, Facebook, X, SoundCloud and the other sites PasteAndSave reads. For YouTube in particular there is also a [YouTube to MP3](/youtube-to-mp3) page.

## What bitrate means

Bitrate is how much data is spent on each second of sound, written in kilobits per second, or kbps. More data keeps more detail, up to a point, and makes the file bigger in a straight line:

| Bitrate | Size per minute | Size of a 4 minute song | Good for |
| --- | --- | --- | --- |
| 64 kbps | about 0.5 MB | about 2 MB | Speech on a slow phone |
| 96 kbps | about 0.7 MB | about 3 MB | Podcasts, lectures |
| 128 kbps | about 0.9 MB | about 4 MB | Everyday listening |
| 256 kbps | about 1.9 MB | about 8 MB | Music |
| 320 kbps | about 2.3 MB | about 9 MB | Music from a very good source |

![](/blog/images/mp3-file-size-by-bitrate.webp "The same 4 minute song at five bitrates")

## The catch: you can't add quality that isn't there

A conversion can only keep what the source has. Most online platforms store audio at a modest rate. YouTube, for example, usually streams sound at around 128 to 160 kbps. Turning that into a 320 kbps MP3 makes a bigger file that sounds exactly the same.

So the honest rule is simple:

* **Speech** (podcasts, lectures, voice notes): **96 or 128 kbps.**
* **Music from YouTube, TikTok or Instagram:** **256 kbps**, or **M4A**.
* **320 kbps:** only when the source is known to be high quality, such as a SoundCloud upload from the artist.

## MP3 or M4A?

* **MP3** plays on every device ever made, including old car stereos and cheap speakers. When in doubt, MP3.
* **M4A** holds AAC sound, which is better than MP3 at the same size. On PasteAndSave the M4A option keeps the original audio without converting it, where the source allows. Nothing is lost, and nothing is added.

If your phone, laptop and speaker are all from the last ten years, **M4A is the better choice**. The [formats lesson](/blog/video-formats-explained) explains the difference between the two in more depth.

## Where the file goes

The MP3 lands in your Downloads folder, the same as a video. On iPhone that is the **Files** app. Apple's Music app won't pick files up from there by itself, so play them in Files or in a free player such as VLC. On Android, music players like the built in one on Samsung, or VLC, find files in the Download folder on their own. The [phone guide](/blog/save-videos-on-iphone-and-android) shows where everything goes.

## Respect the music

Songs are some of the most protected content online. Converting a music video for your own offline listening is a gray area in many countries. Uploading the MP3 anywhere, using it in your own videos, or playing it in a shop or a gym needs a licence. The [legal lesson](/blog/is-it-legal-to-download-videos) explains the rules without the jargon.

Ready? Paste a link into the [video to MP3 converter](/video-to-mp3-converter) and try 256 kbps or M4A first.
`},p={slug:"video-wont-download",title:"Why a Video Won't Download: 9 Common Reasons and Fixes",seoTitle:"Video Won't Download? 9 Common Reasons and Fixes",description:"Private posts, sign in walls, age checks, region blocks, copy protection and broken share links. What each download error means and what you can do about it.",excerpt:"Most failed downloads come down to nine reasons that repeat every day. Find the message you saw, learn what it means, and try the fix.",category:"fixes",published:"2026-10-29",updated:"2026-10-29",keywords:["video won't download","why can't i download this video","video downloader not working","this video is private","unsupported url","download failed fix"],faqs:[{q:"Why does it say the video is private when I can watch it?",a:"You can watch it because you are logged in, and the account lets you see it. A downloader sees the page as a visitor who is not logged in, and to that visitor the video is hidden. Only public videos can be downloaded."},{q:"Can I download videos from Netflix or Spotify?",a:"No. Netflix, Disney+, Prime Video, Spotify and similar paid services lock their content with copy protection. Honest downloaders don't break it, and doing so is illegal in many countries. Use the offline download feature in their own apps instead."},{q:"Why does a link work on my phone but not in the downloader?",a:"Usually because your phone is logged in to the app, or because the link is a short share link that only opens inside the app. Open the link in a private browser window to see what a logged out visitor sees, and copy the address from there."},{q:"What should I do if a downloaded video has no sound?",a:"Try a different quality from the list, or the MP4 version if there is one. Some players can't read the sound in certain formats. Opening the file in the free VLC player is a quick way to check whether the sound is really missing."}],tool:{href:"/",label:"Try your link again"},body:`
Over one recent four week stretch, people pasted 3,699 links into PasteAndSave, and about half of them came straight back with a list of qualities. The other half failed, and most of those failures came down to one of nine reasons. They repeat every single day.

Find the message you saw below. Each one says what it means and what you can do.

![](/blog/images/why-a-video-wont-download-nine-reasons.webp "The nine reasons, in the order this guide covers them")

## 1. "That link isn't from a site we can download from"

**What it means:** the downloader doesn't know how to read that website. This is the most common failure on PasteAndSave by a wide margin, and it usually isn't the visitor's fault.

**Try this:**

* Check you copied the link to the **video**, not to a profile, a search page or a home page.
* If the video is embedded on a news or blog page, paste the address of that page. PasteAndSave looks for a player inside it.
* Paste the link from the original site, such as YouTube or Vimeo, rather than from a site that copied it.

## 2. "No video found at that link"

**What it means:** the post has no video in it. It is a photo, a text post, or a story that has already expired.

**Try this:** if it is a photo post, look for the photo in the results list, since many photo posts can be saved as images. If you expected a video, open the link in your browser to check it still plays.

## 3. "This one is private"

**What it means:** the account is private, or the post is shared with friends or followers only.

**Try this:** nothing on our side can reach it, and nothing should. Ask the person who posted it to send you the video directly.

## 4. "This needs a sign in to watch"

**What it means:** the site won't show the video to anyone who isn't logged in. Age restricted videos, some Facebook posts and some Instagram posts work this way.

**Try this:** if it is your own video, download it from your account settings, where most platforms offer a copy of your data. PasteAndSave never asks for your password, and no download site should.

## 5. "This video is blocked in our server's region"

**What it means:** some sites hide videos from visitors in certain countries, and our server sits in one of them. A few sites also ask visitors from that country to prove their age before showing anything.

**Try this:** there is no fix on your side. The video is not broken. It is just not shown to our server.

## 6. "This video is copy protected"

**What it means:** the video is locked with encryption, known as DRM. Netflix, Disney+, Prime Video, Spotify and Apple Music all work this way, and so do some videos on Vimeo.

**Try this:** use the offline download button inside the service's own app. Breaking copy protection is against the law in many countries, so no honest downloader will do it.

## 7. "This video was removed or is no longer available"

**What it means:** the creator deleted it, the platform took it down, or the account was suspended. The link still exists, but the video behind it is gone.

**Try this:** search for the video again. Sometimes it was uploaded a second time under a new link.

## 8. "That share link doesn't lead to a video any more"

**What it means:** short share links, like pin.it or some Facebook share links, are redirects. When the post behind them is deleted, the short link leads nowhere.

**Try this:** open the short link in your browser. If the video plays, copy the full address from the address bar and paste that instead.

## 9. "This site is turning our server away right now" or "That took too long"

**What it means:** the site is busy, or it is limiting how often our server can ask. Very long videos can also take longer than usual to prepare.

**Try this:** wait a minute and try again. These clear up on their own. For long videos, keep the page open until the progress bar finishes.

## Still stuck?

A quick test settles most cases: open the link in a **private browser window** on your phone or computer, without logging in. If the video plays there, it can almost always be downloaded. If it doesn't, the downloader sees the same wall you do.

For the bigger picture of what a downloader can and can't reach, read [How Online Video Downloaders Work](/blog/how-online-video-downloaders-work). Then paste your link into the [downloader](/) and try again.
`},q={"/blog/images/how-online-video-downloaders-work.jpg":{width:1200,height:630,alt:"Illustration of a copied link becoming a page and then a downloaded file",small:"/blog/images/how-online-video-downloaders-work-600w.jpg"},"/blog/images/video-quality-explained.jpg":{width:1200,height:630,alt:"Illustration of nested screens showing 720p, 1080p and 4K video sizes",small:"/blog/images/video-quality-explained-600w.jpg"},"/blog/images/video-formats-explained.jpg":{width:1200,height:630,alt:"Four file icons labelled MP4, WebM, MOV and MKV",small:"/blog/images/video-formats-explained-600w.jpg"},"/blog/images/is-it-legal-to-download-videos.jpg":{width:1200,height:630,alt:"Shield with a check mark representing the rules for downloading videos",small:"/blog/images/is-it-legal-to-download-videos-600w.jpg"},"/blog/images/are-online-video-downloaders-safe.jpg":{width:1200,height:630,alt:"Green shield with a check mark for safe video downloading",small:"/blog/images/are-online-video-downloaders-safe-600w.jpg"},"/blog/images/download-tiktok-without-watermark.jpg":{width:1200,height:630,alt:"Phone showing a music note and a download button for saving TikTok videos",small:"/blog/images/download-tiktok-without-watermark-600w.jpg"},"/blog/images/download-instagram-reels.jpg":{width:1200,height:630,alt:"Phone showing a photo icon and a download button for saving Instagram Reels",small:"/blog/images/download-instagram-reels-600w.jpg"},"/blog/images/download-youtube-videos.jpg":{width:1200,height:630,alt:"Phone showing a play button and a download button for saving YouTube videos",small:"/blog/images/download-youtube-videos-600w.jpg"},"/blog/images/download-youtube-playlist.jpg":{width:1200,height:630,alt:"A list of videos with one selected, for downloading from a playlist",small:"/blog/images/download-youtube-playlist-600w.jpg"},"/blog/images/download-facebook-videos.jpg":{width:1200,height:630,alt:"Phone showing a film strip and a download button for saving Facebook videos",small:"/blog/images/download-facebook-videos-600w.jpg"},"/blog/images/download-twitter-x-videos.jpg":{width:1200,height:630,alt:"Phone showing a post bubble with a play button for saving videos from X",small:"/blog/images/download-twitter-x-videos-600w.jpg"},"/blog/images/download-reddit-videos-with-sound.jpg":{width:1200,height:630,alt:"A video track and a sound track joined into one file",small:"/blog/images/download-reddit-videos-with-sound-600w.jpg"},"/blog/images/save-videos-on-iphone-and-android.jpg":{width:1200,height:630,alt:"Two phones showing the Files app and the photo gallery",small:"/blog/images/save-videos-on-iphone-and-android-600w.jpg"},"/blog/images/convert-video-to-mp3.jpg":{width:1200,height:630,alt:"Large music note above the letters MP3",small:"/blog/images/convert-video-to-mp3-600w.jpg"},"/blog/images/video-wont-download.jpg":{width:1200,height:630,alt:"Warning sign representing a video that will not download",small:"/blog/images/video-wont-download-600w.jpg"},"/blog/images/how-a-video-downloader-works-from-link-to-file.webp":{width:1200,height:440,alt:"Five steps from a copied link to a saved file: copy the link, the page is read, qualities are listed, video and sound are joined, the file is saved"},"/blog/images/pasteandsave-quality-list-video-and-audio-options.webp":{width:1200,height:700,alt:"The PasteAndSave downloader showing a pasted link, a video title and a list of qualities from 2160p to 360p with Save buttons"},"/blog/images/video-resolution-comparison-360p-720p-1080p-4k.webp":{width:1200,height:660,alt:"Rectangles drawn to scale comparing 360p, 720p, 1080p and 4K video resolutions"},"/blog/images/video-file-size-per-minute-by-quality.webp":{width:1200,height:560,alt:"Bar chart of typical video file size per minute, from about 5 MB at 360p to about 150 MB at 4K"},"/blog/images/video-container-and-codec-explained.webp":{width:1200,height:560,alt:"Diagram of an MP4 container holding a video track packed with H.264, an audio track packed with AAC, and optional subtitles"},"/blog/images/is-downloading-videos-legal-fine-gray-area-not-okay.webp":{width:1200,height:540,alt:"Three columns listing downloads that are usually fine, gray areas, and uses that are usually not okay"},"/blog/images/safe-video-downloader-checklist.webp":{width:1200,height:490,alt:"Checklist comparing signs of a safe video downloader with warning signs of a bad one"},"/blog/images/download-tiktok-video-without-watermark-steps.webp":{width:1200,height:740,alt:"Three phone screens: tap Share and Copy link in TikTok, paste the link into PasteAndSave, then pick MP4 or MP3 to save"},"/blog/images/download-instagram-reel-steps.webp":{width:1200,height:740,alt:"Three phone screens: tap the paper plane and Copy link in Instagram, paste the link into PasteAndSave, then choose a quality"},"/blog/images/download-facebook-video-steps.webp":{width:1200,height:740,alt:"Three phone screens: tap Share and Copy link in Facebook, paste the link into PasteAndSave, then pick HD or SD"},"/blog/images/download-x-twitter-video-steps.webp":{width:1200,height:740,alt:"Three phone screens: tap Share and Copy link on an X post, paste the link into PasteAndSave, then pick a quality or photo"},"/blog/images/youtube-hd-video-and-audio-joined.webp":{width:1200,height:460,alt:"A picture only video track and a separate audio track joined into one MP4 file with sound"},"/blog/images/reddit-video-and-sound-joined.webp":{width:1200,height:460,alt:"Reddit's silent video file and separate sound file joined into one video with sound"},"/blog/images/download-youtube-playlist-one-video-at-a-time.webp":{width:1200,height:640,alt:"A playlist of five videos with the second one selected, and its quality options from 1080p to MP3"},"/blog/images/where-downloaded-videos-go-iphone-android.webp":{width:1200,height:560,alt:"Where downloads go: on iPhone from Safari to Files, Downloads, then Save Video into Photos; on Android from Chrome to the Download folder, then the gallery"},"/blog/images/mp3-file-size-by-bitrate.webp":{width:1200,height:560,alt:"Bar chart of the size of a four minute song as MP3 at 64, 96, 128, 256 and 320 kbps, from about 2 MB to about 9 MB"},"/blog/images/why-a-video-wont-download-nine-reasons.webp":{width:1200,height:780,alt:"Nine common reasons a video won't download: unsupported site, no video in the post, private, sign in needed, region block, copy protection, removed, dead share link, site busy"}};function r(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}a.s(["IMAGES",0,q],52060);var s=r(),t={exec:()=>null};function u(a,b=""){let c="string"==typeof a?a:a.source,d={replace:(a,b)=>{let e="string"==typeof b?b:b.source;return e=e.replace(w.caret,"$1"),c=c.replace(a,e),d},getRegex:()=>new RegExp(c,b)};return d}var v=(()=>{try{return!!RegExp("(?<=1)(?<!1)")}catch{return!1}})(),w={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] /,listReplaceTask:/^\[[ xX]\] +/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:a=>RegExp(`^( {0,3}${a})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:a=>RegExp(`^ {0,${Math.min(3,a-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:a=>RegExp(`^ {0,${Math.min(3,a-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:a=>RegExp(`^ {0,${Math.min(3,a-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:a=>RegExp(`^ {0,${Math.min(3,a-1)}}#`),htmlBeginRegex:a=>RegExp(`^ {0,${Math.min(3,a-1)}}<(?:[a-z].*>|!--)`,"i")},x=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,y=/(?:[*+-]|\d{1,9}[.)])/,z=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,A=u(z).replace(/bull/g,y).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),B=u(z).replace(/bull/g,y).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),C=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,D=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,E=u(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",D).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),F=u(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,y).getRegex(),G="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",H=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,I=u("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",H).replace("tag",G).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),J=u(C).replace("hr",x).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",G).getRegex(),K={blockquote:u(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",J).getRegex(),code:/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,def:E,fences:/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,heading:/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,hr:x,html:I,lheading:A,list:F,newline:/^(?:[ \t]*(?:\n|$))+/,paragraph:J,table:t,text:/^[^\n]+/},L=u("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",x).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",G).getRegex(),M={...K,lheading:B,table:L,paragraph:u(C).replace("hr",x).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",L).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",G).getRegex()},N={...K,html:u("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment",H).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:t,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:u(C).replace("hr",x).replace("heading",` *#{1,6} *[^
]`).replace("lheading",A).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},O=/^( {2,}|\\)\n(?!\s*$)/,P=/[\p{P}\p{S}]/u,Q=/[\s\p{P}\p{S}]/u,R=/[^\s\p{P}\p{S}]/u,S=u(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Q).getRegex(),T=/(?!~)[\p{P}\p{S}]/u,U=u(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",v?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),V=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,W=u(V,"u").replace(/punct/g,P).getRegex(),X=u(V,"u").replace(/punct/g,T).getRegex(),Y="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Z=u(Y,"gu").replace(/notPunctSpace/g,R).replace(/punctSpace/g,Q).replace(/punct/g,P).getRegex(),$=u(Y,"gu").replace(/notPunctSpace/g,/(?:[^\s\p{P}\p{S}]|~)/u).replace(/punctSpace/g,/(?!~)[\s\p{P}\p{S}]/u).replace(/punct/g,T).getRegex(),_=u("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,R).replace(/punctSpace/g,Q).replace(/punct/g,P).getRegex(),aa=u(/\\(punct)/,"gu").replace(/punct/g,P).getRegex(),ab=u(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),ac=u(H).replace("(?:-->|$)","-->").getRegex(),ad=u("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",ac).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),ae=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,af=u(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",ae).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),ag=u(/^!?\[(label)\]\[(ref)\]/).replace("label",ae).replace("ref",D).getRegex(),ah=u(/^!?\[(ref)\](?:\[\])?/).replace("ref",D).getRegex(),ai=u("reflink|nolink(?!\\()","g").replace("reflink",ag).replace("nolink",ah).getRegex(),aj=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,ak={_backpedal:t,anyPunctuation:aa,autolink:ab,blockSkip:U,br:O,code:/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,del:t,emStrongLDelim:W,emStrongRDelimAst:Z,emStrongRDelimUnd:_,escape:/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,link:af,nolink:ah,punctuation:S,reflink:ag,reflinkSearch:ai,tag:ad,text:/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,url:t},al={...ak,link:u(/^!?\[(label)\]\((.*?)\)/).replace("label",ae).getRegex(),reflink:u(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",ae).getRegex()},am={...ak,emStrongRDelimAst:$,emStrongLDelim:X,url:u(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",aj).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:u(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",aj).getRegex()},an={...am,br:u(O).replace("{2,}","*").getRegex(),text:u(am.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},ao={normal:K,gfm:M,pedantic:N},ap={normal:ak,gfm:am,breaks:an,pedantic:al},aq={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ar=a=>aq[a];function as(a,b){if(b){if(w.escapeTest.test(a))return a.replace(w.escapeReplace,ar)}else if(w.escapeTestNoEncode.test(a))return a.replace(w.escapeReplaceNoEncode,ar);return a}function at(a){try{a=encodeURI(a).replace(w.percentDecode,"%")}catch{return null}return a}function au(a,b){let c=a.replace(w.findPipe,(a,b,c)=>{let d=!1,e=b;for(;--e>=0&&"\\"===c[e];)d=!d;return d?"|":" |"}).split(w.splitPipe),d=0;if(c[0].trim()||c.shift(),c.length>0&&!c.at(-1)?.trim()&&c.pop(),b)if(c.length>b)c.splice(b);else for(;c.length<b;)c.push("");for(;d<c.length;d++)c[d]=c[d].trim().replace(w.slashPipe,"|");return c}function av(a,b,c){let d=a.length;if(0===d)return"";let e=0;for(;e<d;){let f=a.charAt(d-e-1);if(f!==b||c)if(f!==b&&c)e++;else break;else e++}return a.slice(0,d-e)}function aw(a,b,c,d,e){let f=b.href,g=b.title||null,h=a[1].replace(e.other.outputLinkReplace,"$1");d.state.inLink=!0;let i={type:"!"===a[0].charAt(0)?"image":"link",raw:c,href:f,title:g,text:h,tokens:d.inlineTokens(h)};return d.state.inLink=!1,i}var ax=class{options;rules;lexer;constructor(a){this.options=a||s}space(a){let b=this.rules.block.newline.exec(a);if(b&&b[0].length>0)return{type:"space",raw:b[0]}}code(a){let b=this.rules.block.code.exec(a);if(b){let a=b[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:b[0],codeBlockStyle:"indented",text:this.options.pedantic?a:av(a,`
`)}}}fences(a){let b=this.rules.block.fences.exec(a);if(b){let a=b[0],c=function(a,b,c){let d=a.match(c.other.indentCodeCompensation);if(null===d)return b;let e=d[1];return b.split(`
`).map(a=>{let b=a.match(c.other.beginningSpace);if(null===b)return a;let[d]=b;return d.length>=e.length?a.slice(e.length):a}).join(`
`)}(a,b[3]||"",this.rules);return{type:"code",raw:a,lang:b[2]?b[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):b[2],text:c}}}heading(a){let b=this.rules.block.heading.exec(a);if(b){let a=b[2].trim();if(this.rules.other.endingHash.test(a)){let b=av(a,"#");(this.options.pedantic||!b||this.rules.other.endingSpaceChar.test(b))&&(a=b.trim())}return{type:"heading",raw:b[0],depth:b[1].length,text:a,tokens:this.lexer.inline(a)}}}hr(a){let b=this.rules.block.hr.exec(a);if(b)return{type:"hr",raw:av(b[0],`
`)}}blockquote(a){let b=this.rules.block.blockquote.exec(a);if(b){let a=av(b[0],`
`).split(`
`),c="",d="",e=[];for(;a.length>0;){let b=!1,f=[],g;for(g=0;g<a.length;g++)if(this.rules.other.blockquoteStart.test(a[g]))f.push(a[g]),b=!0;else if(b)break;else f.push(a[g]);a=a.slice(g);let h=f.join(`
`),i=h.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");c=c?`${c}
${h}`:h,d=d?`${d}
${i}`:i;let j=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(i,e,!0),this.lexer.state.top=j,0===a.length)break;let k=e.at(-1);if(k?.type==="code")break;if(k?.type==="blockquote"){let b=k.raw+`
`+a.join(`
`),f=this.blockquote(b);e[e.length-1]=f,c=c.substring(0,c.length-k.raw.length)+f.raw,d=d.substring(0,d.length-k.text.length)+f.text;break}if(k?.type==="list"){let b=k.raw+`
`+a.join(`
`),f=this.list(b);e[e.length-1]=f,c=c.substring(0,c.length-k.raw.length)+f.raw,d=d.substring(0,d.length-k.raw.length)+f.raw,a=b.substring(e.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:c,tokens:e,text:d}}}list(a){let b=this.rules.block.list.exec(a);if(b){let c=b[1].trim(),d=c.length>1,e={type:"list",raw:"",ordered:d,start:d?+c.slice(0,-1):"",loose:!1,items:[]};c=d?`\\d{1,9}\\${c.slice(-1)}`:`\\${c}`,this.options.pedantic&&(c=d?c:"[*+-]");let f=this.rules.other.listItemRegex(c),g=!1;for(;a;){let c=!1,d="",h="";if(!(b=f.exec(a))||this.rules.block.hr.test(a))break;d=b[0],a=a.substring(d.length);let i=b[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,a=>" ".repeat(3*a.length)),j=a.split(`
`,1)[0],k=!i.trim(),l=0;if(this.options.pedantic?(l=2,h=i.trimStart()):k?l=b[1].length+1:(l=(l=b[2].search(this.rules.other.nonSpaceChar))>4?1:l,h=i.slice(l),l+=b[1].length),k&&this.rules.other.blankLine.test(j)&&(d+=j+`
`,a=a.substring(j.length+1),c=!0),!c){let b=this.rules.other.nextBulletRegex(l),c=this.rules.other.hrRegex(l),e=this.rules.other.fencesBeginRegex(l),f=this.rules.other.headingBeginRegex(l),g=this.rules.other.htmlBeginRegex(l);for(;a;){let m=a.split(`
`,1)[0],n;if(j=m,n=this.options.pedantic?j=j.replace(this.rules.other.listReplaceNesting,"  "):j.replace(this.rules.other.tabCharGlobal,"    "),e.test(j)||f.test(j)||g.test(j)||b.test(j)||c.test(j))break;if(n.search(this.rules.other.nonSpaceChar)>=l||!j.trim())h+=`
`+n.slice(l);else{if(k||i.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||e.test(i)||f.test(i)||c.test(i))break;h+=`
`+j}k||j.trim()||(k=!0),d+=m+`
`,a=a.substring(m.length+1),i=n.slice(l)}}e.loose||(g?e.loose=!0:this.rules.other.doubleBlankLine.test(d)&&(g=!0));let m=null,n;this.options.gfm&&(m=this.rules.other.listIsTask.exec(h))&&(n="[ ] "!==m[0],h=h.replace(this.rules.other.listReplaceTask,"")),e.items.push({type:"list_item",raw:d,task:!!m,checked:n,loose:!1,text:h,tokens:[]}),e.raw+=d}let h=e.items.at(-1);if(!h)return;h.raw=h.raw.trimEnd(),h.text=h.text.trimEnd(),e.raw=e.raw.trimEnd();for(let a=0;a<e.items.length;a++)if(this.lexer.state.top=!1,e.items[a].tokens=this.lexer.blockTokens(e.items[a].text,[]),!e.loose){let b=e.items[a].tokens.filter(a=>"space"===a.type);e.loose=b.length>0&&b.some(a=>this.rules.other.anyLine.test(a.raw))}if(e.loose)for(let a=0;a<e.items.length;a++)e.items[a].loose=!0;return e}}html(a){let b=this.rules.block.html.exec(a);if(b)return{type:"html",block:!0,raw:b[0],pre:"pre"===b[1]||"script"===b[1]||"style"===b[1],text:b[0]}}def(a){let b=this.rules.block.def.exec(a);if(b){let a=b[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),c=b[2]?b[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",d=b[3]?b[3].substring(1,b[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):b[3];return{type:"def",tag:a,raw:b[0],href:c,title:d}}}table(a){let b=this.rules.block.table.exec(a);if(!b||!this.rules.other.tableDelimiter.test(b[2]))return;let c=au(b[1]),d=b[2].replace(this.rules.other.tableAlignChars,"").split("|"),e=b[3]?.trim()?b[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],f={type:"table",raw:b[0],header:[],align:[],rows:[]};if(c.length===d.length){for(let a of d)this.rules.other.tableAlignRight.test(a)?f.align.push("right"):this.rules.other.tableAlignCenter.test(a)?f.align.push("center"):this.rules.other.tableAlignLeft.test(a)?f.align.push("left"):f.align.push(null);for(let a=0;a<c.length;a++)f.header.push({text:c[a],tokens:this.lexer.inline(c[a]),header:!0,align:f.align[a]});for(let a of e)f.rows.push(au(a,f.header.length).map((a,b)=>({text:a,tokens:this.lexer.inline(a),header:!1,align:f.align[b]})));return f}}lheading(a){let b=this.rules.block.lheading.exec(a);if(b)return{type:"heading",raw:b[0],depth:"="===b[2].charAt(0)?1:2,text:b[1],tokens:this.lexer.inline(b[1])}}paragraph(a){let b=this.rules.block.paragraph.exec(a);if(b){let a=b[1].charAt(b[1].length-1)===`
`?b[1].slice(0,-1):b[1];return{type:"paragraph",raw:b[0],text:a,tokens:this.lexer.inline(a)}}}text(a){let b=this.rules.block.text.exec(a);if(b)return{type:"text",raw:b[0],text:b[0],tokens:this.lexer.inline(b[0])}}escape(a){let b=this.rules.inline.escape.exec(a);if(b)return{type:"escape",raw:b[0],text:b[1]}}tag(a){let b=this.rules.inline.tag.exec(a);if(b)return!this.lexer.state.inLink&&this.rules.other.startATag.test(b[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(b[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(b[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(b[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:b[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:b[0]}}link(a){let b=this.rules.inline.link.exec(a);if(b){let a=b[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(a)){if(!this.rules.other.endAngleBracket.test(a))return;let b=av(a.slice(0,-1),"\\");if((a.length-b.length)%2==0)return}else{let a=function(a){if(-1===a.indexOf(")"))return -1;let b=0;for(let c=0;c<a.length;c++)if("\\"===a[c])c++;else if("("===a[c])b++;else if(")"===a[c]&&--b<0)return c;return b>0?-2:-1}(b[2]);if(-2===a)return;if(a>-1){let c=(0===b[0].indexOf("!")?5:4)+b[1].length+a;b[2]=b[2].substring(0,a),b[0]=b[0].substring(0,c).trim(),b[3]=""}}let c=b[2],d="";if(this.options.pedantic){let a=this.rules.other.pedanticHrefTitle.exec(c);a&&(c=a[1],d=a[3])}else d=b[3]?b[3].slice(1,-1):"";return c=c.trim(),this.rules.other.startAngleBracket.test(c)&&(c=this.options.pedantic&&!this.rules.other.endAngleBracket.test(a)?c.slice(1):c.slice(1,-1)),aw(b,{href:c&&c.replace(this.rules.inline.anyPunctuation,"$1"),title:d&&d.replace(this.rules.inline.anyPunctuation,"$1")},b[0],this.lexer,this.rules)}}reflink(a,b){let c;if((c=this.rules.inline.reflink.exec(a))||(c=this.rules.inline.nolink.exec(a))){let a=b[(c[2]||c[1]).replace(this.rules.other.multipleSpaceGlobal," ").toLowerCase()];if(!a){let a=c[0].charAt(0);return{type:"text",raw:a,text:a}}return aw(c,a,c[0],this.lexer,this.rules)}}emStrong(a,b,c=""){let d=this.rules.inline.emStrongLDelim.exec(a);if(!(!d||d[3]&&c.match(this.rules.other.unicodeAlphaNumeric))&&(!(d[1]||d[2])||!c||this.rules.inline.punctuation.exec(c))){let c=[...d[0]].length-1,e,f,g=c,h=0,i="*"===d[0][0]?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(i.lastIndex=0,b=b.slice(-1*a.length+c);null!=(d=i.exec(b));){if(!(e=d[1]||d[2]||d[3]||d[4]||d[5]||d[6]))continue;if(f=[...e].length,d[3]||d[4]){g+=f;continue}if((d[5]||d[6])&&c%3&&!((c+f)%3)){h+=f;continue}if((g-=f)>0)continue;f=Math.min(f,f+g+h);let b=[...d[0]][0].length,i=a.slice(0,c+d.index+b+f);if(Math.min(c,f)%2){let a=i.slice(1,-1);return{type:"em",raw:i,text:a,tokens:this.lexer.inlineTokens(a)}}let j=i.slice(2,-2);return{type:"strong",raw:i,text:j,tokens:this.lexer.inlineTokens(j)}}}}codespan(a){let b=this.rules.inline.code.exec(a);if(b){let a=b[2].replace(this.rules.other.newLineCharGlobal," "),c=this.rules.other.nonSpaceChar.test(a),d=this.rules.other.startingSpaceChar.test(a)&&this.rules.other.endingSpaceChar.test(a);return c&&d&&(a=a.substring(1,a.length-1)),{type:"codespan",raw:b[0],text:a}}}br(a){let b=this.rules.inline.br.exec(a);if(b)return{type:"br",raw:b[0]}}del(a){let b=this.rules.inline.del.exec(a);if(b)return{type:"del",raw:b[0],text:b[2],tokens:this.lexer.inlineTokens(b[2])}}autolink(a){let b=this.rules.inline.autolink.exec(a);if(b){let a,c;return c="@"===b[2]?"mailto:"+(a=b[1]):a=b[1],{type:"link",raw:b[0],text:a,href:c,tokens:[{type:"text",raw:a,text:a}]}}}url(a){let b;if(b=this.rules.inline.url.exec(a)){let a,c;if("@"===b[2])c="mailto:"+(a=b[0]);else{let d;do d=b[0],b[0]=this.rules.inline._backpedal.exec(b[0])?.[0]??"";while(d!==b[0])a=b[0],c="www."===b[1]?"http://"+b[0]:b[0]}return{type:"link",raw:b[0],text:a,href:c,tokens:[{type:"text",raw:a,text:a}]}}}inlineText(a){let b=this.rules.inline.text.exec(a);if(b){let a=this.lexer.state.inRawBlock;return{type:"text",raw:b[0],text:b[0],escaped:a}}}},ay=class a{tokens;options;state;tokenizer;inlineQueue;constructor(a){this.tokens=[],this.tokens.links=Object.create(null),this.options=a||s,this.options.tokenizer=this.options.tokenizer||new ax,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let b={other:w,block:ao.normal,inline:ap.normal};this.options.pedantic?(b.block=ao.pedantic,b.inline=ap.pedantic):this.options.gfm&&(b.block=ao.gfm,this.options.breaks?b.inline=ap.breaks:b.inline=ap.gfm),this.tokenizer.rules=b}static get rules(){return{block:ao,inline:ap}}static lex(b,c){return new a(c).lex(b)}static lexInline(b,c){return new a(c).inlineTokens(b)}lex(a){a=a.replace(w.carriageReturn,`
`),this.blockTokens(a,this.tokens);for(let a=0;a<this.inlineQueue.length;a++){let b=this.inlineQueue[a];this.inlineTokens(b.src,b.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(a,b=[],c=!1){for(this.options.pedantic&&(a=a.replace(w.tabCharGlobal,"    ").replace(w.spaceLine,""));a;){let d;if(this.options.extensions?.block?.some(c=>!!(d=c.call({lexer:this},a,b))&&(a=a.substring(d.raw.length),b.push(d),!0)))continue;if(d=this.tokenizer.space(a)){a=a.substring(d.raw.length);let c=b.at(-1);1===d.raw.length&&void 0!==c?c.raw+=`
`:b.push(d);continue}if(d=this.tokenizer.code(a)){a=a.substring(d.raw.length);let c=b.at(-1);c?.type==="paragraph"||c?.type==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+d.raw,c.text+=`
`+d.text,this.inlineQueue.at(-1).src=c.text):b.push(d);continue}if((d=this.tokenizer.fences(a))||(d=this.tokenizer.heading(a))||(d=this.tokenizer.hr(a))||(d=this.tokenizer.blockquote(a))||(d=this.tokenizer.list(a))||(d=this.tokenizer.html(a))){a=a.substring(d.raw.length),b.push(d);continue}if(d=this.tokenizer.def(a)){a=a.substring(d.raw.length);let c=b.at(-1);c?.type==="paragraph"||c?.type==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+d.raw,c.text+=`
`+d.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[d.tag]||(this.tokens.links[d.tag]={href:d.href,title:d.title},b.push(d));continue}if((d=this.tokenizer.table(a))||(d=this.tokenizer.lheading(a))){a=a.substring(d.raw.length),b.push(d);continue}let e=a;if(this.options.extensions?.startBlock){let b=1/0,c=a.slice(1),d;this.options.extensions.startBlock.forEach(a=>{"number"==typeof(d=a.call({lexer:this},c))&&d>=0&&(b=Math.min(b,d))}),b<1/0&&b>=0&&(e=a.substring(0,b+1))}if(this.state.top&&(d=this.tokenizer.paragraph(e))){let f=b.at(-1);c&&f?.type==="paragraph"?(f.raw+=(f.raw.endsWith(`
`)?"":`
`)+d.raw,f.text+=`
`+d.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=f.text):b.push(d),c=e.length!==a.length,a=a.substring(d.raw.length);continue}if(d=this.tokenizer.text(a)){a=a.substring(d.raw.length);let c=b.at(-1);c?.type==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+d.raw,c.text+=`
`+d.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):b.push(d);continue}if(a){let b="Infinite loop on byte: "+a.charCodeAt(0);if(this.options.silent){console.error(b);break}throw Error(b)}}return this.state.top=!0,b}inline(a,b=[]){return this.inlineQueue.push({src:a,tokens:b}),b}inlineTokens(a,b=[]){let c,d=a,e=null;if(this.tokens.links){let a=Object.keys(this.tokens.links);if(a.length>0)for(;null!=(e=this.tokenizer.rules.inline.reflinkSearch.exec(d));)a.includes(e[0].slice(e[0].lastIndexOf("[")+1,-1))&&(d=d.slice(0,e.index)+"["+"a".repeat(e[0].length-2)+"]"+d.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;null!=(e=this.tokenizer.rules.inline.anyPunctuation.exec(d));)d=d.slice(0,e.index)+"++"+d.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);for(;null!=(e=this.tokenizer.rules.inline.blockSkip.exec(d));)c=e[2]?e[2].length:0,d=d.slice(0,e.index+c)+"["+"a".repeat(e[0].length-c-2)+"]"+d.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);d=this.options.hooks?.emStrongMask?.call({lexer:this},d)??d;let f=!1,g="";for(;a;){let c;if(f||(g=""),f=!1,this.options.extensions?.inline?.some(d=>!!(c=d.call({lexer:this},a,b))&&(a=a.substring(c.raw.length),b.push(c),!0)))continue;if((c=this.tokenizer.escape(a))||(c=this.tokenizer.tag(a))||(c=this.tokenizer.link(a))){a=a.substring(c.raw.length),b.push(c);continue}if(c=this.tokenizer.reflink(a,this.tokens.links)){a=a.substring(c.raw.length);let d=b.at(-1);"text"===c.type&&d?.type==="text"?(d.raw+=c.raw,d.text+=c.text):b.push(c);continue}if((c=this.tokenizer.emStrong(a,d,g))||(c=this.tokenizer.codespan(a))||(c=this.tokenizer.br(a))||(c=this.tokenizer.del(a))||(c=this.tokenizer.autolink(a))||!this.state.inLink&&(c=this.tokenizer.url(a))){a=a.substring(c.raw.length),b.push(c);continue}let e=a;if(this.options.extensions?.startInline){let b=1/0,c=a.slice(1),d;this.options.extensions.startInline.forEach(a=>{"number"==typeof(d=a.call({lexer:this},c))&&d>=0&&(b=Math.min(b,d))}),b<1/0&&b>=0&&(e=a.substring(0,b+1))}if(c=this.tokenizer.inlineText(e)){a=a.substring(c.raw.length),"_"!==c.raw.slice(-1)&&(g=c.raw.slice(-1)),f=!0;let d=b.at(-1);d?.type==="text"?(d.raw+=c.raw,d.text+=c.text):b.push(c);continue}if(a){let b="Infinite loop on byte: "+a.charCodeAt(0);if(this.options.silent){console.error(b);break}throw Error(b)}}return b}},az=class{options;parser;constructor(a){this.options=a||s}space(a){return""}code({text:a,lang:b,escaped:c}){let d=(b||"").match(w.notSpaceStart)?.[0],e=a.replace(w.endingNewline,"")+`
`;return d?'<pre><code class="language-'+as(d)+'">'+(c?e:as(e,!0))+`</code></pre>
`:"<pre><code>"+(c?e:as(e,!0))+`</code></pre>
`}blockquote({tokens:a}){return`<blockquote>
${this.parser.parse(a)}</blockquote>
`}html({text:a}){return a}def(a){return""}heading({tokens:a,depth:b}){return`<h${b}>${this.parser.parseInline(a)}</h${b}>
`}hr(a){return`<hr>
`}list(a){let b=a.ordered,c=a.start,d="";for(let b=0;b<a.items.length;b++){let c=a.items[b];d+=this.listitem(c)}let e=b?"ol":"ul";return"<"+e+(b&&1!==c?' start="'+c+'"':"")+`>
`+d+"</"+e+`>
`}listitem(a){let b="";if(a.task){let c=this.checkbox({checked:!!a.checked});a.loose?a.tokens[0]?.type==="paragraph"?(a.tokens[0].text=c+" "+a.tokens[0].text,a.tokens[0].tokens&&a.tokens[0].tokens.length>0&&"text"===a.tokens[0].tokens[0].type&&(a.tokens[0].tokens[0].text=c+" "+as(a.tokens[0].tokens[0].text),a.tokens[0].tokens[0].escaped=!0)):a.tokens.unshift({type:"text",raw:c+" ",text:c+" ",escaped:!0}):b+=c+" "}return b+=this.parser.parse(a.tokens,!!a.loose),`<li>${b}</li>
`}checkbox({checked:a}){return"<input "+(a?'checked="" ':"")+'disabled="" type="checkbox">'}paragraph({tokens:a}){return`<p>${this.parser.parseInline(a)}</p>
`}table(a){let b="",c="";for(let b=0;b<a.header.length;b++)c+=this.tablecell(a.header[b]);b+=this.tablerow({text:c});let d="";for(let b=0;b<a.rows.length;b++){let e=a.rows[b];c="";for(let a=0;a<e.length;a++)c+=this.tablecell(e[a]);d+=this.tablerow({text:c})}return d&&(d=`<tbody>${d}</tbody>`),`<table>
<thead>
`+b+`</thead>
`+d+`</table>
`}tablerow({text:a}){return`<tr>
${a}</tr>
`}tablecell(a){let b=this.parser.parseInline(a.tokens),c=a.header?"th":"td";return(a.align?`<${c} align="${a.align}">`:`<${c}>`)+b+`</${c}>
`}strong({tokens:a}){return`<strong>${this.parser.parseInline(a)}</strong>`}em({tokens:a}){return`<em>${this.parser.parseInline(a)}</em>`}codespan({text:a}){return`<code>${as(a,!0)}</code>`}br(a){return"<br>"}del({tokens:a}){return`<del>${this.parser.parseInline(a)}</del>`}link({href:a,title:b,tokens:c}){let d=this.parser.parseInline(c),e=at(a);if(null===e)return d;let f='<a href="'+(a=e)+'"';return b&&(f+=' title="'+as(b)+'"'),f+=">"+d+"</a>"}image({href:a,title:b,text:c,tokens:d}){d&&(c=this.parser.parseInline(d,this.parser.textRenderer));let e=at(a);if(null===e)return as(c);a=e;let f=`<img src="${a}" alt="${c}"`;return b&&(f+=` title="${as(b)}"`),f+=">"}text(a){return"tokens"in a&&a.tokens?this.parser.parseInline(a.tokens):"escaped"in a&&a.escaped?a.text:as(a.text)}},aA=class{strong({text:a}){return a}em({text:a}){return a}codespan({text:a}){return a}del({text:a}){return a}html({text:a}){return a}text({text:a}){return a}link({text:a}){return""+a}image({text:a}){return""+a}br(){return""}},aB=class a{options;renderer;textRenderer;constructor(a){this.options=a||s,this.options.renderer=this.options.renderer||new az,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new aA}static parse(b,c){return new a(c).parse(b)}static parseInline(b,c){return new a(c).parseInline(b)}parse(a,b=!0){let c="";for(let d=0;d<a.length;d++){let e=a[d];if(this.options.extensions?.renderers?.[e.type]){let a=this.options.extensions.renderers[e.type].call({parser:this},e);if(!1!==a||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(e.type)){c+=a||"";continue}}switch(e.type){case"space":c+=this.renderer.space(e);continue;case"hr":c+=this.renderer.hr(e);continue;case"heading":c+=this.renderer.heading(e);continue;case"code":c+=this.renderer.code(e);continue;case"table":c+=this.renderer.table(e);continue;case"blockquote":c+=this.renderer.blockquote(e);continue;case"list":c+=this.renderer.list(e);continue;case"html":c+=this.renderer.html(e);continue;case"def":c+=this.renderer.def(e);continue;case"paragraph":c+=this.renderer.paragraph(e);continue;case"text":{let f=e,g=this.renderer.text(f);for(;d+1<a.length&&"text"===a[d+1].type;)f=a[++d],g+=`
`+this.renderer.text(f);b?c+=this.renderer.paragraph({type:"paragraph",raw:g,text:g,tokens:[{type:"text",raw:g,text:g,escaped:!0}]}):c+=g;continue}default:{let a='Token with "'+e.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw Error(a)}}}return c}parseInline(a,b=this.renderer){let c="";for(let d=0;d<a.length;d++){let e=a[d];if(this.options.extensions?.renderers?.[e.type]){let a=this.options.extensions.renderers[e.type].call({parser:this},e);if(!1!==a||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(e.type)){c+=a||"";continue}}switch(e.type){case"escape":case"text":c+=b.text(e);break;case"html":c+=b.html(e);break;case"link":c+=b.link(e);break;case"image":c+=b.image(e);break;case"strong":c+=b.strong(e);break;case"em":c+=b.em(e);break;case"codespan":c+=b.codespan(e);break;case"br":c+=b.br(e);break;case"del":c+=b.del(e);break;default:{let a='Token with "'+e.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw Error(a)}}}return c}},aC=class{options;block;constructor(a){this.options=a||s}static passThroughHooks=new Set(["preprocess","postprocess","processAllTokens","emStrongMask"]);static passThroughHooksRespectAsync=new Set(["preprocess","postprocess","processAllTokens"]);preprocess(a){return a}postprocess(a){return a}processAllTokens(a){return a}emStrongMask(a){return a}provideLexer(){return this.block?ay.lex:ay.lexInline}provideParser(){return this.block?aB.parse:aB.parseInline}},aD=class{defaults=r();options=this.setOptions;parse=this.parseMarkdown(!0);parseInline=this.parseMarkdown(!1);Parser=aB;Renderer=az;TextRenderer=aA;Lexer=ay;Tokenizer=ax;Hooks=aC;constructor(...a){this.use(...a)}walkTokens(a,b){let c=[];for(let d of a)switch(c=c.concat(b.call(this,d)),d.type){case"table":for(let a of d.header)c=c.concat(this.walkTokens(a.tokens,b));for(let a of d.rows)for(let d of a)c=c.concat(this.walkTokens(d.tokens,b));break;case"list":c=c.concat(this.walkTokens(d.items,b));break;default:{let a=d;this.defaults.extensions?.childTokens?.[a.type]?this.defaults.extensions.childTokens[a.type].forEach(d=>{let e=a[d].flat(1/0);c=c.concat(this.walkTokens(e,b))}):a.tokens&&(c=c.concat(this.walkTokens(a.tokens,b)))}}return c}use(...a){let b=this.defaults.extensions||{renderers:{},childTokens:{}};return a.forEach(a=>{let c={...a};if(c.async=this.defaults.async||c.async||!1,a.extensions&&(a.extensions.forEach(a=>{if(!a.name)throw Error("extension name required");if("renderer"in a){let c=b.renderers[a.name];c?b.renderers[a.name]=function(...b){let d=a.renderer.apply(this,b);return!1===d&&(d=c.apply(this,b)),d}:b.renderers[a.name]=a.renderer}if("tokenizer"in a){if(!a.level||"block"!==a.level&&"inline"!==a.level)throw Error("extension level must be 'block' or 'inline'");let c=b[a.level];c?c.unshift(a.tokenizer):b[a.level]=[a.tokenizer],a.start&&("block"===a.level?b.startBlock?b.startBlock.push(a.start):b.startBlock=[a.start]:"inline"===a.level&&(b.startInline?b.startInline.push(a.start):b.startInline=[a.start]))}"childTokens"in a&&a.childTokens&&(b.childTokens[a.name]=a.childTokens)}),c.extensions=b),a.renderer){let b=this.defaults.renderer||new az(this.defaults);for(let c in a.renderer){if(!(c in b))throw Error(`renderer '${c}' does not exist`);if(["options","parser"].includes(c))continue;let d=a.renderer[c],e=b[c];b[c]=(...a)=>{let c=d.apply(b,a);return!1===c&&(c=e.apply(b,a)),c||""}}c.renderer=b}if(a.tokenizer){let b=this.defaults.tokenizer||new ax(this.defaults);for(let c in a.tokenizer){if(!(c in b))throw Error(`tokenizer '${c}' does not exist`);if(["options","rules","lexer"].includes(c))continue;let d=a.tokenizer[c],e=b[c];b[c]=(...a)=>{let c=d.apply(b,a);return!1===c&&(c=e.apply(b,a)),c}}c.tokenizer=b}if(a.hooks){let b=this.defaults.hooks||new aC;for(let c in a.hooks){if(!(c in b))throw Error(`hook '${c}' does not exist`);if(["options","block"].includes(c))continue;let d=a.hooks[c],e=b[c];aC.passThroughHooks.has(c)?b[c]=a=>{if(this.defaults.async&&aC.passThroughHooksRespectAsync.has(c))return(async()=>{let c=await d.call(b,a);return e.call(b,c)})();let f=d.call(b,a);return e.call(b,f)}:b[c]=(...a)=>{if(this.defaults.async)return(async()=>{let c=await d.apply(b,a);return!1===c&&(c=await e.apply(b,a)),c})();let c=d.apply(b,a);return!1===c&&(c=e.apply(b,a)),c}}c.hooks=b}if(a.walkTokens){let b=this.defaults.walkTokens,d=a.walkTokens;c.walkTokens=function(a){let c=[];return c.push(d.call(this,a)),b&&(c=c.concat(b.call(this,a))),c}}this.defaults={...this.defaults,...c}}),this}setOptions(a){return this.defaults={...this.defaults,...a},this}lexer(a,b){return ay.lex(a,b??this.defaults)}parser(a,b){return aB.parse(a,b??this.defaults)}parseMarkdown(a){return(b,c)=>{let d={...c},e={...this.defaults,...d},f=this.onError(!!e.silent,!!e.async);if(!0===this.defaults.async&&!1===d.async)return f(Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof b>"u"||null===b)return f(Error("marked(): input parameter is undefined or null"));if("string"!=typeof b)return f(Error("marked(): input parameter is of type "+Object.prototype.toString.call(b)+", string expected"));if(e.hooks&&(e.hooks.options=e,e.hooks.block=a),e.async)return(async()=>{let c=e.hooks?await e.hooks.preprocess(b):b,d=await (e.hooks?await e.hooks.provideLexer():a?ay.lex:ay.lexInline)(c,e),f=e.hooks?await e.hooks.processAllTokens(d):d;e.walkTokens&&await Promise.all(this.walkTokens(f,e.walkTokens));let g=await (e.hooks?await e.hooks.provideParser():a?aB.parse:aB.parseInline)(f,e);return e.hooks?await e.hooks.postprocess(g):g})().catch(f);try{e.hooks&&(b=e.hooks.preprocess(b));let c=(e.hooks?e.hooks.provideLexer():a?ay.lex:ay.lexInline)(b,e);e.hooks&&(c=e.hooks.processAllTokens(c)),e.walkTokens&&this.walkTokens(c,e.walkTokens);let d=(e.hooks?e.hooks.provideParser():a?aB.parse:aB.parseInline)(c,e);return e.hooks&&(d=e.hooks.postprocess(d)),d}catch(a){return f(a)}}}onError(a,b){return c=>{if(c.message+=`
Please report this to https://github.com/markedjs/marked.`,a){let a="<p>An error occurred:</p><pre>"+as(c.message+"",!0)+"</pre>";return b?Promise.resolve(a):a}if(b)return Promise.reject(c);throw c}}},aE=new aD;function aF(a,b){return aE.parse(a,b)}aF.options=aF.setOptions=function(a){return aE.setOptions(a),aF.defaults=aE.defaults,s=aF.defaults,aF},aF.getDefaults=r,aF.defaults=s,aF.use=function(...a){return aE.use(...a),aF.defaults=aE.defaults,s=aF.defaults,aF},aF.walkTokens=function(a,b){return aE.walkTokens(a,b)},aF.parseInline=aE.parseInline,aF.Parser=aB,aF.parser=aB.parse,aF.Renderer=az,aF.TextRenderer=aA,aF.Lexer=ay,aF.lexer=ay.lex,aF.Tokenizer=ax,aF.Hooks=aC,aF.parse=aF,aF.options,aF.setOptions,aF.use,aF.walkTokens,aF.parseInline,aB.parse,ay.lex;let aG=new aD({gfm:!0});function aH(a){return a.replace(/<[^>]+>/g,"").replace(/&[a-z0-9#]+;/gi,"").replace(/[*_`[\]()]/g,"").toLowerCase().replace(/[^a-z0-9\s]/g,"").trim().replace(/\s+/g,"-")}function aI(a){return[...a.matchAll(/^!\[[^\]]*\]\((\S+)(?: "([^"]*)")?\)\s*$/gm)].map(a=>({src:a[1],caption:a[2]??""}))}a.s(["imagesIn",0,aI,"readingMinutes",0,function(a){return Math.max(1,Math.round(a.replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm,"").replace(/\]\([^)]*\)/g,"]").split(/\s+/).filter(Boolean).length/200))},"renderMarkdown",0,function(a,b={}){return aG.parse(a,{async:!1}).replace(/<p><img src="([^"]+)" alt="([^"]*)"(?: title="([^"]*)")?\s*\/?><\/p>/g,(a,c,d,e)=>{var f,g,h;let i,j,k,l;return f=c,g=d,h=e,i=b[f],j=i?.alt??g,k=i?` width="${i.width}" height="${i.height}"`:"",l=h?`<figcaption>${h}</figcaption>`:"",`<figure><img src="${f}" alt="${j.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"${k} loading="lazy" decoding="async">${l}</figure>`}).replace(/<h([23])>([\s\S]*?)<\/h\1>/g,(a,b,c)=>`<h${b} id="${aH(c)}">${c}</h${b}>`).replace(/<a href="(https?:\/\/[^"]+)"/g,'<a href="$1" target="_blank" rel="noopener noreferrer"').replace(/<table>/g,'<div class="table-wrap"><table>').replace(/<\/table>/g,"</table></div>")},"tableOfContents",0,function(a){return a.split("\n").filter(a=>a.startsWith("## ")).map(a=>{let b=a.slice(3).replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/[*_`]/g,"").trim();return{id:aH(b),text:b}})}],88914);let aJ=[b,c,d,e,f,g,h,i,j,k,l,m,n,o,p],aK=[{key:"basics",label:"Learn the basics",blurb:"Five short lessons, best read in order. Start here if you are new to saving videos."},{key:"guides",label:"How to guides",blurb:"Step by step instructions for the apps and devices people use most."},{key:"fixes",label:"Fix a problem",blurb:"What download errors mean and what you can do about them."}];function aL(a){return aJ.filter(b=>b.category===a).sort((a,b)=>(a.lesson??99)-(b.lesson??99))}function aM(a){let b=`/blog/images/${a.slug}.jpg`,c=q[b];return c&&{...c,src:b,caption:a.title}}a.s(["CATEGORIES",0,aK,"POSTS",0,aJ,"categoryLabel",0,function(a){return aK.find(b=>b.key===a)?.label??a},"countWord",0,function(a){return["zero","one","two","three","four","five","six","seven","eight","nine","ten"][a]??String(a)},"coverOf",0,aM,"formatDate",0,function(a){let[b,c,d]=a.split("-").map(Number);return`${d} ${["January","February","March","April","May","June","July","August","September","October","November","December"][c-1]} ${b}`},"getPost",0,function(a){return aJ.find(b=>b.slug===a)},"lessonNeighbours",0,function(a){if(!a.lesson)return{};let b=aL("basics"),c=b.findIndex(b=>b.slug===a.slug);return{prev:b[c-1],next:b[c+1]}},"postImages",0,function(a){let b=aI(a.body).flatMap(({src:a,caption:b})=>{let c=q[a];return c?[{...c,src:a,caption:b||c.alt}]:[]}),c=aM(a);return c?[c,...b]:b},"postsForTool",0,function(a){return aJ.filter(b=>b.tool?.href===a)},"postsIn",0,aL,"relatedPosts",0,function(a,b=3){let c=aJ.filter(b=>b.slug!==a.slug);return[...c.filter(b=>b.category===a.category),...c.filter(b=>b.category!==a.category)].slice(0,b)}],73934)}];

//# sourceMappingURL=src_lib_blog_ts_006zoui._.js.map