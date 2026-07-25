# PasteAndSave browser extension

Spots downloadable video and audio on any page while you browse, like a
download manager. A badge on the toolbar icon shows how many files were
found. Plain files save directly through the browser. Streams and protected
players are handed to pasteandsave.com, which fetches them whole.

Works in Chrome, Edge, Brave, Opera (Chromium) and Firefox from one codebase.

## What it does

- **A Save button on the video itself.** A small chip appears in the corner of
  any real video on the page, so there is nothing to open and no link to copy.
  Press it and PasteAndSave resolves the download. Decorative background loops,
  tiny clips and hidden players are ignored, and the ✕ dismisses a chip you
  don't want.
- **One button on any video page.** Press the extension on a YouTube, TikTok,
  Instagram, Facebook (etc.) page and it hands the link to PasteAndSave, which
  resolves the real download — YouTube included, via the site's proxy.
- **Save every video found**, in one action, when a page has several.
- **Switch it off per site.** A toggle in the popup stops both the in-page
  button and the traffic watching for that site, subdomains included.
- Watches the page's own network traffic for video and audio
- Toolbar badge counts what it found; nothing is injected into pages
- One-click direct download for plain MP4, WebM, MP3 and similar files
- Streams (HLS/DASH, YouTube, Instagram, TikTok and other protected hosts)
  open on PasteAndSave with the link already loaded
- Right-click any page, link, video or audio to send it to PasteAndSave
- Filter the list by video, audio or streams; Save all downloads every
  plain file at once
- Per-item copy-link button, and a note button that fetches just the
  audio of a video as MP3 through the site
- Alt+Shift+S sends the current page to PasteAndSave from anywhere
- Adjustable minimum file size (50 KB / 200 KB / 1 MB) keeps tiny clips
  out of the list; the choice syncs across your browsers

## Tests

`node test/background.test.mjs` runs the worker against synthetic network
traffic: detection, classification, sizes from range responses, per-tab
isolation, navigation clearing, the item cap, settings, shortcut and menu
handling. Set `API_STYLE=firefox` to exercise the Firefox `browser` global.
`test/popup-harness.html` runs the real popup against fixture data in a
plain browser tab.

## Install in Chrome / Edge / Brave

1. Download and unzip the extension folder
2. Open `chrome://extensions` (or `edge://extensions`)
3. Turn on "Developer mode" (top right)
4. Click "Load unpacked" and pick the unzipped folder

## Install in Firefox

1. In the unzipped folder, delete `manifest.json` and rename
   `manifest-firefox.json` to `manifest.json` (Firefox runs the worker as
   an event page instead of a service worker)
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Pick the `manifest.json` file

Firefox removes temporary add-ons when it closes. For a permanent install
the extension needs to be signed through addons.mozilla.org.

## Settings

Right-click the toolbar icon and choose Options (or open the extension's
details page and click Extension options):

- **Site address** — where streams and page links open. Defaults to
  https://pasteandsave.com. Until that domain is live, or if you run your
  own copy, set it to your server, for example `http://localhost:3030`.
- **Minimum file size** — files smaller than this never show in the list.

## Store note

Chrome Web Store and Mozilla Add-ons both restrict extensions that download
from YouTube. This extension is distributed from pasteandsave.com instead of
the stores for that reason.

## Permissions it asks for and why

- `webRequest` + host access: to see media the page loads (read only)
- `downloads`: to save files with their proper names
- `contextMenus`: the right-click entries
- `activeTab`: to read the current tab's address when you open the popup
- `storage`: keeps the found-media list alive between browser events

The in-page button runs from a content script on http and https pages. It
only reads video elements to know where to draw itself, never modifies the
page's own markup, and keeps its styles inside a shadow root so nothing can
leak either way.
