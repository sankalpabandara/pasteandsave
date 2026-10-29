# Browser extension: web store listings

Everything the Chrome Web Store and addons.mozilla.org (AMO) forms ask for,
ready to paste. Store facing text has no dashes or hyphens, like the site.

Build the packages and images first:

    node extension/build-store.mjs     -> store/pasteandsave-chrome-store-<v>.zip, store/pasteandsave-firefox-<v>.zip
    node scripts/store-images.mjs      -> store/images/*.png

## The two packages are not the same

* **Chrome Web Store copy:** YouTube is switched off completely (nothing captured, no
  button, no YouTube link ever sent to the site). The store does not accept extensions
  that save YouTube videos. Its listing and screenshots never mention YouTube.
* **Firefox copy:** the same extension as the one on pasteandsave.com, YouTube included.
  AMO lists other YouTube downloaders today. If a reviewer objects, resubmit with the
  Chrome copy's background.js.

## Shared text

**Name:** PasteAndSave Video Downloader

**Summary (from the manifest, 120 characters; Chrome allows 132):**
Adds a Save button to the videos you watch and lists the video and audio files on any page, ready to save as MP4 or MP3.

**Description:**

Save the videos you watch, in one click.

PasteAndSave puts a Download now button on the video you are watching. Press it, pick a quality, and the file saves to your downloads folder without you leaving the page. Want just the sound? Pick MP3.

What it does:

* A Download now button on the corner of real videos, with every quality and its size, plus MP3.
* A list of every video and audio file the page loaded, in the toolbar popup. The badge on the icon counts them.
* Save one file, or every video found on the page at once.
* Right click any page, link or video and choose Save with PasteAndSave.
* Press Alt+Shift+S to send the page you are on to PasteAndSave.
* Streams and players that split video into small pieces open on pasteandsave.com, which joins them into one whole file.
* Switch it off for any site from the popup. It stays quiet there, subdomains included.
* Choose a minimum file size so tiny clips never clutter the list.

Private by design:

* No account, no sign up, no analytics, no tracking.
* Finding media happens inside your browser. Nothing is sent anywhere until you choose to save something through PasteAndSave, and then only that link.
* Plain files go straight from the website to your downloads folder.

Please only save videos you own or have permission to use.

Privacy policy: https://pasteandsave.com/privacy

## Chrome Web Store (chrome.google.com/webstore/devconsole)

Account: Google account registered as a Chrome Web Store developer (one time 5 US dollar
fee, paid by the account owner), contact email verified.

**Package:** store/pasteandsave-chrome-store-<version>.zip

**Store listing tab**

| Field | Value |
| --- | --- |
| Description | the shared description above |
| Category | Tools |
| Language | English |
| Store icon | extension/icons/icon128.png |
| Screenshots | store/images/screenshot-1-download-button.png, screenshot-2-found-media.png, screenshot-3-right-click.png (1280x800) |
| Small promo tile | store/images/promo-small-440x280.png |
| Marquee promo tile | store/images/promo-marquee-1400x560.png |
| Homepage URL | https://pasteandsave.com/extension |
| Support URL | https://pasteandsave.com/extension |

**Privacy practices tab**

*Single purpose:*
Finds the video and audio on the pages you visit and saves the ones you choose, either directly from the website or through PasteAndSave.

*Permission justifications:*

* **contextMenus:** Adds three right click entries: save this page's video, save a link, and save a video or audio element with PasteAndSave.
* **activeTab:** Reads the address of the current tab when you open the popup or press the shortcut, so that page can be sent to PasteAndSave when you ask.
* **downloads:** Saves the files you choose into your downloads folder with their proper names.
* **webRequest:** Reads the response headers of the open page's requests to notice video and audio files, so they can be listed in the popup with their sizes. Nothing is blocked, changed or redirected.
* **storage:** Keeps your settings (minimum file size, sites you switched it off for) and the list of media found on each open tab while the browser's background worker sleeps.
* **Host permission (all sites):** Video and audio can be on any website, so the extension needs to notice media responses and draw its Save button on whatever page you open. It only reads media file addresses and video elements. It does not change page content.

*Remote code:* No, I am not using remote code. (All JavaScript is inside the package. The extension only sends and receives JSON from pasteandsave.com.)

*Data usage, tick:*

* **Web history:** the address of the page or video you choose to save, sent to pasteandsave.com only when you ask.
* **Website content:** the address of the video on that page, same as above.

Leave every other category unticked. Then the three certifications, all true for this
extension: no selling or transferring user data outside the approved use, no use for
purposes unrelated to the single purpose, no use for credit or lending decisions.

*Privacy policy URL:* https://pasteandsave.com/privacy

**Distribution tab:** Free, Public, all regions.

**Notes for the reviewer (Test instructions):**

No account or login needed. To test: open https://www.w3schools.com/html/html5_video.asp and press play on the video. The toolbar badge shows the file found, the popup lists it with a Save button, and hovering the video shows the Download now button. Saving downloads the MP4 directly. Pages whose video is streamed in pieces open on https://pasteandsave.com with the link filled in, where the user picks a quality. YouTube is deliberately switched off in this version: on youtube.com the extension captures nothing, draws no button and sends nothing.

## Firefox Add-ons (addons.mozilla.org/developers)

Account: Firefox account with two step sign in turned on (AMO requires it to submit).

**Package:** store/pasteandsave-firefox-<version>.zip. Choose "On this site" (listed),
platform Firefox. Source code: not needed, nothing is minified or bundled.

| Field | Value |
| --- | --- |
| Name | PasteAndSave Video Downloader |
| Add-on URL | pasteandsave |
| Summary | the manifest summary above |
| Description | the shared description above |
| Categories | Download Management, Photos, Music and Videos |
| Tags | download, video, audio, mp3, mp4 |
| Support email | the PasteAndSave contact address |
| Support website | https://pasteandsave.com/extension |
| Homepage | https://pasteandsave.com/extension |
| License | the owner's choice; All Rights Reserved keeps the code private |
| Privacy policy | "This add-on has a privacy policy": paste the "The browser extension" section from https://pasteandsave.com/privacy and link the page |
| Screenshots | the three 1280x800 screenshots |

The manifest already declares the extension's data collection
(browser_specific_settings.gecko.data_collection_permissions: browsingActivity), which
Firefox shows people when they install it.

**Notes to reviewer:** same as the Chrome notes, without the YouTube sentence.

## After approval

* Put the store links on https://pasteandsave.com/extension and change "installs from this
  site rather than the web stores" there.
* Every update: bump the version in both manifests, run both build scripts, upload the new
  zips. The stores refuse a version number they have already seen.
