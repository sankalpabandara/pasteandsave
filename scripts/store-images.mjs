// Draws the web store images for the browser extension: three 1280x800
// screenshots and the two promo tiles the Chrome Web Store asks for. The
// button, quality list and popup are drawn with the same colours and labels
// as extension/content.js and extension/popup.css. No YouTube anywhere, since
// the Chrome Web Store copy does not work there.
//
// Writes store/images/*.png (not committed). sharp comes installed with Next.js.
//
//   node scripts/store-images.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "store", "images");
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function t(x, y, s, { size = 16, weight = 400, fill = "#111827", anchor = "start", spacing = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(s)}</text>`;
}

const defs = `<defs>
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.55" stop-color="#d946ef"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
<linearGradient id="primary" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#9333ea"/></linearGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="0.55" stop-color="#c2410c"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#134e4a"/></linearGradient>
<radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#d946ef" stop-opacity="0.25"/><stop offset="1" stop-color="#d946ef" stop-opacity="0"/></radialGradient>
<radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#38bdf8" stop-opacity="0.28"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
<radialGradient id="popglow" cx="0" cy="0" r="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.32"/><stop offset="0.65" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#1e1b4b" flood-opacity="0.22"/></filter>
</defs>`;

function mark(x, y, s) {
  const k = s / 40;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="1" y="1" width="38" height="38" rx="11" fill="url(#brand)"/><g stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M20 9.5 V22"/><path d="M14.3 16.7 L20 22.6 L25.7 16.7"/><path d="M12 27.5 H28"/></g></g>`;
}

/** A browser window with an address bar; the page goes inside at (x, y + 76). */
function browser(x, y, w, h, address, page, { badge = "" } = {}) {
  const icon = `${mark(x + w - 58, y + 46, 22)}${badge ? `<rect x="${x + w - 44}" y="${y + 42}" width="20" height="14" rx="7" fill="#dc2626"/>${t(x + w - 34, y + 53, badge, { size: 10, weight: 700, fill: "#fff", anchor: "middle" })}` : ""}`;
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff"/></g>
<rect x="${x}" y="${y}" width="${w}" height="76" rx="14" fill="#f1f0f7"/><rect x="${x}" y="${y + 60}" width="${w}" height="16" fill="#f1f0f7"/>
<circle cx="${x + 22}" cy="${y + 20}" r="6" fill="#f87171"/><circle cx="${x + 42}" cy="${y + 20}" r="6" fill="#fbbf24"/><circle cx="${x + 62}" cy="${y + 20}" r="6" fill="#34d399"/>
<rect x="${x + 90}" y="${y + 8}" width="200" height="26" rx="8" fill="#ffffff"/>${t(x + 104, y + 26, "Video page", { size: 12, fill: "#374151" })}
<rect x="${x + 16}" y="${y + 42}" width="${w - 96}" height="26" rx="13" fill="#ffffff" stroke="#e5e7eb"/>${t(x + 34, y + 60, address, { size: 13, fill: "#4b5563" })}
${icon}
<line x1="${x}" x2="${x + w}" y1="${y + 76}" y2="${y + 76}" stroke="#e5e7eb"/>
<g>${page}</g>`;
}

/** A sunset over water: the "video" in the screenshots, drawn, not filmed. */
function videoFrame(x, y, w, h) {
  return `<g><clipPath id="vf${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></clipPath>
<g clip-path="url(#vf${x}${y})">
<rect x="${x}" y="${y}" width="${w}" height="${h * 0.62}" fill="url(#sky)"/>
<circle cx="${x + w * 0.62}" cy="${y + h * 0.58}" r="${h * 0.12}" fill="#fde68a"/>
<path d="M${x} ${y + h * 0.6} L${x + w * 0.18} ${y + h * 0.42} L${x + w * 0.32} ${y + h * 0.56} L${x + w * 0.48} ${y + h * 0.4} L${x + w * 0.66} ${y + h * 0.62} L${x} ${y + h * 0.62} Z" fill="#312e81" opacity="0.85"/>
<rect x="${x}" y="${y + h * 0.62}" width="${w}" height="${h * 0.38}" fill="url(#sea)"/>
<rect x="${x + w * 0.56}" y="${y + h * 0.66}" width="${w * 0.12}" height="4" rx="2" fill="#fde68a" opacity="0.7"/>
<rect x="${x + w * 0.58}" y="${y + h * 0.72}" width="${w * 0.08}" height="3" rx="1.5" fill="#fde68a" opacity="0.5"/>
<rect x="${x}" y="${y + h - 34}" width="${w}" height="34" fill="#000" opacity="0.45"/>
<path d="M${x + 18} ${y + h - 25} l12 8 l-12 8 z" fill="#fff"/>
<rect x="${x + 44}" y="${y + h - 19}" width="${w - 140}" height="4" rx="2" fill="#ffffff" opacity="0.35"/>
<rect x="${x + 44}" y="${y + h - 19}" width="${(w - 140) * 0.38}" height="4" rx="2" fill="#a78bfa"/>
${t(x + w - 20, y + h - 12, "1:24 / 3:40", { size: 12, fill: "#fff", anchor: "end" })}
</g></g>`;
}

/** The in-page "Download now" chip and its quality list, as content.js draws them. */
function chipAndPanel(x, y) {
  const rows = [
    ["VIDEO"],
    ["1080p MP4", "48.2 MB"],
    ["720p MP4", "24.6 MB"],
    ["480p MP4", "12.1 MB"],
    ["AUDIO"],
    ["MP3 320 kbps", "8.4 MB"],
    ["MP3 128 kbps", "3.4 MB"],
  ];
  let ry = y + 58;
  let body = "";
  for (const [label, size] of rows) {
    if (!size) {
      body += t(x + 14, ry + 14, label, { size: 10, weight: 700, fill: "#9ca3af", spacing: 0.8 });
      ry += 24;
      continue;
    }
    const hover = label === "1080p MP4";
    if (hover) body += `<rect x="${x + 4}" y="${ry}" width="252" height="32" rx="8" fill="#f5f3ff"/>`;
    body += t(x + 14, ry + 21, label, { size: 13, weight: 600 }) + t(x + 244, ry + 21, size, { size: 11, fill: "#6b7280", anchor: "end" });
    ry += 34;
  }
  const panelH = ry - y - 44 + 40;
  return `<rect x="${x}" y="${y}" width="128" height="30" rx="10" fill="#7c3aed" opacity="0.96"/>
${t(x + 12, y + 20, "Download now", { size: 12, weight: 600, fill: "#fff" })}${t(x + 112, y + 20, "✕", { size: 12, weight: 700, fill: "#fff", anchor: "middle" })}
<g filter="url(#shadow)"><rect x="${x}" y="${y + 40}" width="260" height="${panelH}" rx="12" fill="#ffffff"/></g>
${body}
<line x1="${x}" x2="${x + 260}" y1="${ry + 2}" y2="${ry + 2}" stroke="#f3f4f6"/>
${t(x + 14, ry + 26, "Open on PasteAndSave", { size: 12, weight: 600, fill: "#7c3aed" })}`;
}

/** The toolbar popup, as popup.html and popup.css draw it. */
function popup(x, y) {
  const items = [
    ["VIDEO", "lecture_part1.mp4", "84.3 MB", "#a78bfa"],
    ["VIDEO", "trailer.webm", "22.0 MB", "#a78bfa"],
    ["AUDIO", "episode12.mp3", "31.5 MB", "#38bdf8"],
    ["STREAM", "master.m3u8", "via PasteAndSave", "#f0abfc"],
  ];
  const w = 340;
  let body = "";
  items.forEach(([kind, name, size, color], i) => {
    const iy = y + 214 + i * 54;
    body += `<rect x="${x + 16}" y="${iy}" width="${w - 32}" height="46" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.08"/>
<rect x="${x + 26}" y="${iy + 9}" width="${kind.length * 7 + 12}" height="16" rx="5" fill="${color}" fill-opacity="0.18"/>${t(x + 32, iy + 21, kind, { size: 9, weight: 700, fill: color })}
${t(x + 26, iy + 38, name, { size: 12, fill: "#ecebf3" })}${t(x + 230, iy + 38, size, { size: 11, fill: "rgba(255,255,255,0.5)", anchor: "end" })}
<rect x="${x + 260}" y="${iy + 11}" width="54" height="24" rx="7" fill="#7c3aed"/>${t(x + 287, iy + 27, "Save", { size: 11, weight: 600, fill: "#fff", anchor: "middle" })}`;
  });
  const h = 214 + items.length * 54 + 74;
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#0c0a14"/></g>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#popglow)"/>
${mark(x + 16, y + 12, 26)}${t(x + 50, y + 31, "PasteAnd", { size: 15, weight: 700, fill: "#ecebf3" })}${t(x + 117, y + 31, "Save", { size: 15, weight: 700, fill: "#a78bfa" })}
<rect x="${x + w - 92}" y="${y + 16}" width="76" height="18" rx="6" fill="none" stroke="#ffffff" stroke-opacity="0.12"/>${t(x + w - 54, y + 29, "Alt+Shift+S", { size: 10, fill: "rgba(255,255,255,0.4)", anchor: "middle" })}
<line x1="${x}" x2="${x + w}" y1="${y + 50}" y2="${y + 50}" stroke="#ffffff" stroke-opacity="0.08"/>
<rect x="${x + 16}" y="${y + 64}" width="${w - 32}" height="56" rx="12" fill="url(#primary)"/>
${t(x + w / 2, y + 89, "Download this page's video", { size: 14, weight: 600, fill: "#fff", anchor: "middle" })}${t(x + w / 2, y + 108, "from example.com", { size: 11, fill: "rgba(255,255,255,0.75)", anchor: "middle" })}
${t(x + 16, y + 150, "FOUND ON THIS PAGE", { size: 11, weight: 600, fill: "rgba(255,255,255,0.5)", spacing: 0.6 })}
<rect x="${x + w - 82}" y="${y + 136}" width="66" height="22" rx="8" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.15"/>${t(x + w - 49, y + 151, "Save all", { size: 11, weight: 600, fill: "rgba(255,255,255,0.85)", anchor: "middle" })}
${["All", "Video", "Audio", "Streams"].map((f, i) => `<rect x="${x + 16 + i * 66}" y="${y + 172}" width="60" height="24" rx="12" fill="${i === 0 ? "#7c3aed" : "none"}" fill-opacity="${i === 0 ? 0.35 : 0}" stroke="#ffffff" stroke-opacity="0.12"/>${t(x + 46 + i * 66, y + 188, f, { size: 11, fill: i === 0 ? "#fff" : "rgba(255,255,255,0.55)", anchor: "middle" })}`).join("")}
${body}
<line x1="${x}" x2="${x + w}" y1="${y + h - 56}" y2="${y + h - 56}" stroke="#ffffff" stroke-opacity="0.08"/>
<rect x="${x + 16}" y="${y + h - 40}" width="14" height="14" rx="4" fill="#7c3aed"/><path d="M${x + 19} ${y + h - 33} l3 3 l5 -6" stroke="#fff" stroke-width="2" fill="none"/>
${t(x + 38, y + h - 28, "Run on example.com", { size: 11, fill: "rgba(255,255,255,0.7)" })}
${t(x + w - 16, y + h - 28, "Ignore files under 200 KB", { size: 11, fill: "rgba(255,255,255,0.5)", anchor: "end" })}`;
}

function contextMenu(x, y) {
  const rows = ["Back", "Reload", "Save as…", null, "Save this page's video with PasteAndSave", null, "Inspect"];
  let ry = y + 8;
  let body = "";
  for (const r of rows) {
    if (!r) {
      body += `<line x1="${x + 8}" x2="${x + 332}" y1="${ry + 4}" y2="${ry + 4}" stroke="#e5e7eb"/>`;
      ry += 9;
      continue;
    }
    const ours = r.includes("PasteAndSave");
    if (ours) body += `<rect x="${x + 6}" y="${ry}" width="328" height="30" rx="6" fill="#ede9fe"/>${mark(x + 14, ry + 6, 18)}`;
    body += t(x + (ours ? 40 : 18), ry + 20, r, { size: 13, weight: ours ? 600 : 400, fill: ours ? "#5b21b6" : "#111827" });
    ry += 30;
  }
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="340" height="${ry - y + 8}" rx="10" fill="#ffffff" stroke="#e5e7eb"/></g>${body}`;
}

function slide(headline, sub, art) {
  const w = 1280;
  const h = 800;
  const lines = headline.split("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
<rect width="${w}" height="${h}" fill="#f7f5fc"/>
<circle cx="1180" cy="80" r="420" fill="url(#glowB)"/><circle cx="160" cy="760" r="380" fill="url(#glowA)"/>
${mark(64, 64, 44)}${t(120, 96, "PasteAndSave", { size: 24, weight: 700 })}
${lines.map((l, i) => t(64, 250 + i * 54, l, { size: 44, weight: 800, fill: "#111827" })).join("")}
${sub.map((l, i) => t(64, 250 + lines.length * 54 + 30 + i * 30, l, { size: 20, fill: "#4b5563" })).join("")}
${art}
</svg>`;
}

const IMAGES = {
  "screenshot-1-download-button.png": () =>
    slide("Save the video\nyou're watching", ["A Download now button sits on", "the video. Pick a quality and it", "saves, without leaving the page."],
      browser(470, 90, 760, 620, "example.com/watch/sunset", `${videoFrame(500, 196, 700, 394)}${t(500, 626, "Sunset over the bay, filmed in one take", { size: 18, weight: 600 })}${t(500, 652, "12,480 views", { size: 13, fill: "#6b7280" })}${chipAndPanel(516, 212)}`)),
  "screenshot-2-found-media.png": () =>
    slide("Every video and\naudio file, found", ["The badge counts what the page", "loaded. Save one file, or all", "of them at once."],
      browser(470, 90, 760, 620, "example.com/course/lesson1", `${videoFrame(500, 196, 460, 259)}${t(500, 490, "Lesson 1: Getting started", { size: 18, weight: 600 })}${popup(870, 150)}`, { badge: "4" })),
  "screenshot-3-right-click.png": () =>
    slide("Right click, or\npress Alt+Shift+S", ["Send any page, link or video", "to PasteAndSave and get it", "as MP4 or MP3."],
      browser(470, 90, 760, 620, "example.com/clips/harbour", `${videoFrame(500, 196, 700, 394)}${contextMenu(760, 330)}`)),
  "promo-small-440x280.png": () => `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">${defs}
<rect width="440" height="280" fill="#0c0a14"/><rect width="440" height="280" fill="url(#popglow)"/><circle cx="420" cy="260" r="200" fill="url(#glowB)"/>
${mark(40, 54, 64)}${t(40, 168, "PasteAndSave", { size: 34, weight: 800, fill: "#ffffff" })}${t(40, 204, "Video Downloader", { size: 22, weight: 600, fill: "#a78bfa" })}${t(40, 238, "Save videos and audio in one click", { size: 15, fill: "rgba(255,255,255,0.7)" })}
</svg>`,
  "promo-marquee-1400x560.png": () => `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560">${defs}
<rect width="1400" height="560" fill="#0c0a14"/><rect width="1400" height="560" fill="url(#popglow)"/><circle cx="1300" cy="520" r="420" fill="url(#glowB)"/>
${mark(80, 120, 72)}${t(80, 260, "PasteAndSave", { size: 56, weight: 800, fill: "#ffffff" })}${t(80, 312, "Video Downloader", { size: 30, weight: 600, fill: "#a78bfa" })}${t(80, 370, "Save the videos you watch, in one click.", { size: 22, fill: "rgba(255,255,255,0.75)" })}
${videoFrame(700, 90, 620, 349)}${chipAndPanel(716, 106)}
</svg>`,
};

fs.mkdirSync(OUT, { recursive: true });
for (const [file, draw] of Object.entries(IMAGES)) {
  const svg = draw();
  const w = Number(/width="(\d+)"/.exec(svg)[1]);
  // Store images must have no transparency, so the PNG is flattened.
  const info = await sharp(Buffer.from(svg), { density: 144 }).resize({ width: w }).flatten({ background: "#ffffff" }).png().toFile(path.join(OUT, file));
  console.log(`${file}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
