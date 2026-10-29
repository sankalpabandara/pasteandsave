// Draws the blog's images: a cover for every post and the teaching diagrams
// inside them. Everything is our own drawing (no stock photos, no screenshots
// of other people's videos), made from SVG and saved by sharp as JPEG covers
// and WebP diagrams, with the description, author and copyright written into
// each file as EXIF and XMP (IPTC fields Google Images reads).
//
// Writes public/blog/images/*.{jpg,webp} and src/content/blog/images.ts, the
// list of every image with its size and alt text that the blog and the tests
// use. sharp comes installed with Next.js. Run after adding an image here:
//
//   node scripts/blog-images.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "blog", "images");
const MANIFEST = path.join(ROOT, "src", "content", "blog", "images.ts");
const YEAR = 2026;

const C = {
  violet: "#7c3aed",
  violetSoft: "#ede9fe",
  fuchsia: "#d946ef",
  sky: "#38bdf8",
  ink: "#171717",
  body: "#404040",
  muted: "#737373",
  paper: "#ffffff",
  bg: "#f7f5fc",
  line: "#e4def3",
  green: "#059669",
  greenSoft: "#d1fae5",
  amber: "#d97706",
  amberSoft: "#fef3c7",
  red: "#dc2626",
  redSoft: "#fee2e2",
};
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Splits text into lines of at most max characters, on word boundaries. */
function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function text(x, y, str, { size = 24, weight = 400, fill = C.ink, anchor = "start", max, lineHeight = 1.3 } = {}) {
  const lines = max ? wrap(str, max) : [str];
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * size * lineHeight}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`,
    )
    .join("");
}

const defs = `
<defs>
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.violet}"/><stop offset="55%" stop-color="${C.fuchsia}"/><stop offset="100%" stop-color="${C.sky}"/>
  </linearGradient>
  <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="${C.fuchsia}" stop-opacity="0.22"/><stop offset="100%" stop-color="${C.fuchsia}" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="${C.sky}" stop-opacity="0.25"/><stop offset="100%" stop-color="${C.sky}" stop-opacity="0"/></radialGradient>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#4c1d95" flood-opacity="0.12"/></filter>
</defs>`;

/** The PasteAndSave mark: the gradient square with the download arrow. */
function mark(x, y, s) {
  const k = s / 40;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="1" y="1" width="38" height="38" rx="11" fill="url(#brand)"/><g stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M20 9.5 V22"/><path d="M14.3 16.7 L20 22.6 L25.7 16.7"/><path d="M12 27.5 H28"/></g></g>`;
}

/** A diagram's frame: soft background, heading, and the site name in the corner. */
function frame(w, h, title, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
<rect width="${w}" height="${h}" fill="${C.bg}"/>
<circle cx="${w - 120}" cy="60" r="260" fill="url(#glowB)"/><circle cx="80" cy="${h - 40}" r="240" fill="url(#glowA)"/>
${text(56, 72, title, { size: 34, weight: 700 })}
${inner}
${mark(w - 236, h - 50, 28)}${text(w - 200, h - 29, "pasteandsave.com", { size: 18, weight: 600, fill: C.muted })}
</svg>`;
}

// Small icons, drawn in a 48 by 48 box.
const icon = {
  link: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M20 28 L28 20"/><path d="M22 14 l4 -4 a8 8 0 0 1 12 12 l-4 4"/><path d="M26 34 l-4 4 a8 8 0 0 1 -12 -12 l4 -4"/></g>`,
  page: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><path d="M12 6 H30 L38 14 V42 H12 Z"/><path d="M18 22 H32 M18 29 H32 M18 36 H26" stroke-linecap="round"/></g>`,
  list: (c = C.violet) => `<g fill="${c}"><rect x="8" y="10" width="32" height="6" rx="3"/><rect x="8" y="21" width="32" height="6" rx="3" opacity="0.7"/><rect x="8" y="32" width="32" height="6" rx="3" opacity="0.45"/></g>`,
  merge: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12 C22 12 22 24 36 24"/><path d="M8 36 C22 36 22 24 36 24"/><path d="M31 18 L38 24 L31 30"/></g>`,
  download: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8 V30"/><path d="M14 21 L24 31 L34 21"/><path d="M10 40 H38"/></g>`,
  play: (c = C.violet) => `<path d="M17 11 L37 24 L17 37 Z" fill="${c}"/>`,
  note: (c = C.violet) => `<g fill="${c}"><path d="M20 10 L38 6 V30 a6 6 0 1 1 -4 -5.6 V13 L24 15 V35 a6 6 0 1 1 -4 -5.6 Z"/></g>`,
  camera: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4"><rect x="7" y="7" width="34" height="34" rx="10"/><circle cx="24" cy="24" r="8"/></g><circle cx="34" cy="14" r="2.5" fill="${c}"/>`,
  lock: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><rect x="10" y="22" width="28" height="20" rx="4"/><path d="M16 22 V16 a8 8 0 0 1 16 0 V22"/></g>`,
  user: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4"><circle cx="24" cy="17" r="8"/><path d="M9 41 C11 31 37 31 39 41" stroke-linecap="round"/></g>`,
  globe: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="3.5"><circle cx="24" cy="24" r="17"/><path d="M7 24 H41 M24 7 C32 15 32 33 24 41 C16 33 16 15 24 7"/></g>`,
  shield: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><path d="M24 6 L39 12 V23 C39 33 32 39 24 42 C16 39 9 33 9 23 V12 Z"/><path d="M17 24 L22 29 L31 19" stroke-linecap="round"/></g>`,
  trash: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14 H38 M19 14 V9 H29 V14 M14 14 L16 41 H32 L34 14"/></g>`,
  broken: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M22 14 l4 -4 a8 8 0 0 1 12 12 l-4 4"/><path d="M26 34 l-4 4 a8 8 0 0 1 -12 -12 l4 -4"/><path d="M30 34 L35 39 M34 29 L40 30 M18 14 L13 9 M14 19 L8 18"/></g>`,
  clock: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="M24 14 V24 L31 28"/></g>`,
  question: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><circle cx="24" cy="24" r="17"/><path d="M18 19 a6 6 0 1 1 8 5.6 C24.5 25.2 24 26.5 24 29"/></g><circle cx="24" cy="35" r="2.6" fill="${c}"/>`,
  photo: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><rect x="7" y="10" width="34" height="28" rx="5"/><path d="M11 34 L20 24 L27 30 L31 26 L38 33"/></g><circle cx="32" cy="18" r="3" fill="${c}"/>`,
  check: (c = C.green) => `<g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 25 L20 34 L37 15"/></g>`,
  cross: (c = C.red) => `<g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M14 14 L34 34 M34 14 L14 34"/></g>`,
  warn: (c = C.amber) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><path d="M24 7 L42 39 H6 Z"/><path d="M24 19 V28" stroke-linecap="round"/></g><circle cx="24" cy="33.5" r="2.6" fill="${c}"/>`,
  speaker: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M8 19 H16 L26 10 V38 L16 29 H8 Z"/><path d="M32 18 C35 21 35 27 32 30 M36 13 C42 19 42 29 36 35"/></g>`,
  folder: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><path d="M6 13 H19 L23 17 H42 V39 H6 Z"/></g>`,
  film: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4"><rect x="8" y="8" width="32" height="32" rx="5"/><path d="M16 8 V40 M32 8 V40 M8 17 H16 M8 31 H16 M32 17 H40 M32 31 H40"/></g>`,
  chat: (c = C.violet) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"><path d="M8 10 H40 V32 H22 L13 40 V32 H8 Z"/></g><path d="M21 15 L31 21 L21 27 Z" fill="${c}"/>`,
};

const ico = (name, x, y, size = 48, color) =>
  `<g transform="translate(${x} ${y}) scale(${size / 48})">${icon[name](color)}</g>`;

/** A white card with a soft shadow. */
const card = (x, y, w, h, r = 22, fill = C.paper, stroke = C.line) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#shadow)"/>`;

const arrow = (x1, y, x2) =>
  `<g stroke="${C.violet}" stroke-width="4" stroke-linecap="round" fill="none"><path d="M${x1} ${y} H${x2 - 6}"/><path d="M${x2 - 16} ${y - 10} L${x2 - 4} ${y} L${x2 - 16} ${y + 10}" stroke-linejoin="round"/></g>`;

const badge = (cx, cy, n) =>
  `<circle cx="${cx}" cy="${cy}" r="20" fill="${C.violet}"/>${text(cx, cy + 7, String(n), { size: 20, weight: 700, fill: "#fff", anchor: "middle" })}`;

// ---------- diagram builders ----------

function steps({ title, items, h = 440 }) {
  const w = 1200;
  const n = items.length;
  const gap = 46;
  const bw = (w - 112 - gap * (n - 1)) / n;
  const y = 130;
  const bh = h - y - 90;
  let inner = "";
  items.forEach((it, i) => {
    const x = 56 + i * (bw + gap);
    inner += card(x, y, bw, bh);
    inner += badge(x + 36, y + 38, i + 1);
    inner += ico(it.icon, x + bw / 2 - 30, y + 70, 60);
    inner += text(x + bw / 2, y + 172, it.label, { size: 24, weight: 700, anchor: "middle", max: Math.floor(bw / 13) });
    if (it.sub) inner += text(x + bw / 2, y + 172 + (wrap(it.label, Math.floor(bw / 13)).length * 31) + 4, it.sub, { size: 18, fill: C.body, anchor: "middle", max: Math.floor(bw / 9.5) });
    if (i < n - 1) inner += arrow(x + bw + 8, y + bh / 2, x + bw + gap - 4);
  });
  return frame(w, h, title, inner);
}

/** A phone with a small screen drawn inside. */
function phone(x, y, w, h, screen) {
  return `${card(x, y, w, h, 34, "#1f1b2e", "#1f1b2e")}
<rect x="${x + 12}" y="${y + 14}" width="${w - 24}" height="${h - 28}" rx="24" fill="${C.paper}"/>
<rect x="${x + w / 2 - 34}" y="${y + 22}" width="68" height="10" rx="5" fill="#1f1b2e"/>
<g transform="translate(${x + 12} ${y + 40})">${screen(w - 24, h - 66)}</g>`;
}

function phoneSteps({ title, screens, h = 740 }) {
  const w = 1200;
  const pw = 250;
  const ph = 470;
  const gap = (w - 3 * pw) / 4;
  let inner = "";
  screens.forEach((s, i) => {
    const x = gap + i * (pw + gap);
    inner += phone(x, 110, pw, ph, s.screen);
    inner += badge(x + 8, 116, i + 1);
    inner += text(x + pw / 2, 110 + ph + 46, s.caption, { size: 22, weight: 700, anchor: "middle", max: 24 });
    if (i < 2) inner += arrow(x + pw + 18, 110 + ph / 2, x + pw + gap - 18);
  });
  return frame(w, h, title, inner);
}

// Screens drawn inside the phones (a w by h box).
const screen = {
  share: (label) => (w, h) => `<rect x="0" y="0" width="${w}" height="${h}" fill="#2a2438" rx="0"/>
${ico("play", w / 2 - 34, h / 2 - 90, 68, "#ffffff")}
<rect x="14" y="${h - 170}" width="${w - 28}" height="156" rx="18" fill="${C.paper}"/>
${text(w / 2, h - 138, "Share to", { size: 15, weight: 600, fill: C.muted, anchor: "middle" })}
<rect x="30" y="${h - 118}" width="${w - 60}" height="44" rx="12" fill="${C.violetSoft}" stroke="${C.violet}" stroke-width="2"/>
${ico("link", 42, h - 114, 36, C.violet)}${text(84, h - 89, label, { size: 17, weight: 700, fill: C.violet })}
<rect x="30" y="${h - 64}" width="${w - 60}" height="36" rx="10" fill="#f4f4f5"/>`,
  paste: (url) => (w, h) => `<rect x="0" y="0" width="${w}" height="${h}" fill="${C.bg}"/>
${mark(18, 14, 26)}${text(52, 33, "PasteAndSave", { size: 15, weight: 700 })}
<rect x="14" y="70" width="${w - 28}" height="46" rx="12" fill="${C.paper}" stroke="${C.violet}" stroke-width="2"/>
${text(26, 99, url, { size: 14, fill: C.body })}
<rect x="14" y="128" width="${(w - 38) / 2}" height="42" rx="12" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>${text(14 + (w - 38) / 4, 155, "Paste", { size: 15, weight: 600, anchor: "middle" })}
<rect x="${24 + (w - 38) / 2}" y="128" width="${(w - 38) / 2}" height="42" rx="12" fill="${C.violet}"/>${text(24 + (3 * (w - 38)) / 4, 155, "Download", { size: 15, weight: 700, fill: "#fff", anchor: "middle" })}
${[0, 1, 2].map((i) => `<rect x="14" y="${196 + i * 46}" width="${w - 28}" height="34" rx="10" fill="#efedf6"/>`).join("")}`,
  qualities: (rows) => (w, h) => `<rect x="0" y="0" width="${w}" height="${h}" fill="${C.bg}"/>
<rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="16" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>
<rect x="28" y="30" width="72" height="30" rx="9" fill="${C.violet}"/>${text(64, 51, "Video", { size: 14, weight: 700, fill: "#fff", anchor: "middle" })}
<rect x="108" y="30" width="72" height="30" rx="9" fill="#f4f4f5"/>${text(144, 51, "Audio", { size: 14, weight: 600, anchor: "middle" })}
${rows
  .map(
    (r, i) => `<line x1="28" x2="${w - 28}" y1="${80 + i * 56}" y2="${80 + i * 56}" stroke="${C.line}" stroke-width="2"/>
${text(30, 113 + i * 56, r, { size: 17, weight: 700 })}
<rect x="${w - 92}" y="${92 + i * 56}" width="62" height="28" rx="8" fill="${C.violetSoft}"/>${text(w - 61, 111 + i * 56, "Save", { size: 13, weight: 700, fill: C.violet, anchor: "middle" })}`,
  )
  .join("")}`,
};

function resolutions() {
  const w = 1200;
  const h = 660;
  const ox = 56;
  const oy = 120;
  const s = 0.2; // 3840 px wide becomes 768
  const boxes = [
    { label: "4K  3840 x 2160", rw: 3840, rh: 2160, fill: "#f5f3ff", stroke: C.violet },
    { label: "1080p  1920 x 1080", rw: 1920, rh: 1080, fill: "#ede9fe", stroke: C.violet },
    { label: "720p  1280 x 720", rw: 1280, rh: 720, fill: "#ddd6fe", stroke: C.violet },
    { label: "360p", rw: 640, rh: 360, fill: "#c4b5fd", stroke: C.violet },
  ];
  let inner = "";
  boxes.forEach((b, i) => {
    const bw = b.rw * s;
    const bh = b.rh * s;
    inner += `<rect x="${ox}" y="${oy + 440 - bh}" width="${bw}" height="${bh}" fill="${b.fill}" stroke="${b.stroke}" stroke-width="${i === 0 ? 3 : 2}" rx="6"/>`;
    inner += text(ox + bw - 14, oy + 440 - bh + 32, b.label, { size: i === 3 ? 16 : 21, weight: 700, fill: C.violet, anchor: "end" });
  });
  inner += text(1000, 250, "Drawn to scale.", { size: 24, weight: 700, anchor: "middle" });
  inner += text(1000, 290, "4K holds four times the pixels of 1080p, and 1080p more than twice those of 720p.", { size: 19, fill: C.body, anchor: "middle", max: 24 });
  return frame(w, h, "Video resolutions compared", inner);
}

function bars({ title, rows, unit, note, h = 560, max }) {
  const w = 1200;
  const top = 130;
  const left = 250;
  const right = w - 200;
  const rowH = (h - top - 110) / rows.length;
  const peak = max ?? Math.max(...rows.map((r) => r.value));
  let inner = "";
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const bw = ((right - left) * r.value) / peak;
    inner += text(left - 20, y + rowH / 2 + 8, r.label, { size: 22, weight: 700, anchor: "end" });
    inner += `<rect x="${left}" y="${y + 10}" width="${Math.max(bw, 6)}" height="${rowH - 20}" rx="10" fill="${r.color ?? "url(#brand)"}"/>`;
    inner += text(left + Math.max(bw, 6) + 14, y + rowH / 2 + 8, `${r.display} ${unit}`, { size: 20, weight: 600, fill: C.body });
  });
  if (note) inner += text(56, h - 62, note, { size: 18, fill: C.muted, max: 84 });
  return frame(w, h, title, inner);
}

function container() {
  const w = 1200;
  const h = 560;
  const inner = `${card(56, 120, 760, 370, 26)}
${ico("film", 84, 146, 44)}${text(140, 180, "MP4 file (the container)", { size: 28, weight: 700 })}
<rect x="90" y="214" width="690" height="66" rx="14" fill="${C.violetSoft}" stroke="${C.violet}" stroke-width="2"/>${ico("play", 104, 226, 40)}${text(156, 257, "Video track, packed with the H.264 codec", { size: 22, weight: 600 })}
<rect x="90" y="296" width="690" height="66" rx="14" fill="#e0f2fe" stroke="${C.sky}" stroke-width="2"/>${ico("speaker", 104, 306, 44, "#0284c7")}${text(156, 339, "Audio track, packed with the AAC codec", { size: 22, weight: 600 })}
<rect x="90" y="378" width="690" height="66" rx="14" fill="#f4f4f5" stroke="${C.line}" stroke-width="2"/>${ico("page", 104, 388, 44, C.muted)}${text(156, 421, "Subtitles (optional)", { size: 22, weight: 600, fill: C.body })}
${text(1000, 220, "The container is the box.", { size: 24, weight: 700, anchor: "middle" })}
${text(1000, 262, "The codec is how each track inside was packed. A player has to open both.", { size: 19, fill: C.body, anchor: "middle", max: 26 })}
${text(1000, 400, "MP4  WebM  MOV  MKV", { size: 20, weight: 700, fill: C.violet, anchor: "middle" })}
${text(1000, 430, "are all containers", { size: 18, fill: C.muted, anchor: "middle" })}`;
  return frame(w, h, "Container and codec: what is inside a video file", inner);
}

function columns({ title, cols, h = 640 }) {
  const w = 1200;
  const n = cols.length;
  const gap = 30;
  const cw = (w - 112 - gap * (n - 1)) / n;
  let inner = "";
  cols.forEach((c, i) => {
    const x = 56 + i * (cw + gap);
    inner += card(x, 120, cw, h - 200, 24);
    inner += `<rect x="${x}" y="120" width="${cw}" height="76" rx="24" fill="${c.soft}"/><rect x="${x}" y="170" width="${cw}" height="26" fill="${c.soft}"/>`;
    inner += ico(c.icon, x + 22, 134, 44);
    inner += text(x + 78, 168, c.heading, { size: 25, weight: 700, fill: c.color });
    let y = 240;
    for (const item of c.items) {
      inner += `<circle cx="${x + 32}" cy="${y - 7}" r="5" fill="${c.color}"/>`;
      const lines = wrap(item, Math.floor((cw - 70) / 10.5));
      inner += text(x + 50, y, item, { size: 19, fill: C.body, max: Math.floor((cw - 70) / 10.5) });
      y += lines.length * 25 + 18;
    }
  });
  return frame(w, h, title, inner);
}

function merge({ title, a, b, out, h = 460 }) {
  const w = 1200;
  const inner = `<rect x="56" y="140" width="380" height="80" rx="18" fill="${C.violetSoft}" stroke="${C.violet}" stroke-width="2"/>${ico("film", 74, 156, 48)}${text(136, 190, a, { size: 22, weight: 700 })}
<rect x="56" y="260" width="380" height="80" rx="18" fill="#e0f2fe" stroke="${C.sky}" stroke-width="2"/>${ico("speaker", 74, 276, 48, "#0284c7")}${text(136, 310, b, { size: 22, weight: 700 })}
<g fill="none" stroke="${C.violet}" stroke-width="4" stroke-linecap="round"><path d="M440 180 C520 180 520 240 590 240"/><path d="M440 300 C520 300 520 240 590 240"/></g>
${card(600, 192, 96, 96, 48, C.violet, C.violet)}${ico("merge", 624, 216, 48, "#ffffff")}
${arrow(706, 240, 790)}
${card(800, 150, 344, 180, 24)}${ico("download", 822, 172, 48)}${text(884, 208, out, { size: 24, weight: 700, max: 18 })}
${text(972, 300, "One file, with sound", { size: 19, fill: C.green, weight: 600, anchor: "middle" })}
${text(56, h - 48, "PasteAndSave joins the two for you before the file reaches your device.", { size: 19, fill: C.muted })}`;
  return frame(w, h, title, inner);
}

function grid({ title, items, h = 780 }) {
  const w = 1200;
  const cols = 3;
  const cw = (w - 112 - 2 * 24) / cols;
  const ch = 168;
  let inner = "";
  items.forEach((it, i) => {
    const x = 56 + (i % cols) * (cw + 24);
    const y = 116 + Math.floor(i / cols) * (ch + 22);
    inner += card(x, y, cw, ch, 20);
    inner += badge(x + 32, y + 34, i + 1);
    inner += ico(it.icon, x + cw - 72, y + 16, 48);
    inner += text(x + 24, y + 96, it.label, { size: 22, weight: 700, max: 26 });
  });
  return frame(w, h, title, inner);
}

function paths({ title, rows, h = 560 }) {
  const w = 1200;
  let inner = "";
  rows.forEach((r, i) => {
    const y = 140 + i * 190;
    inner += card(56, y, w - 112, 150, 24);
    inner += ico(r.icon, 80, y + 20, 44);
    inner += text(136, y + 52, r.label, { size: 26, weight: 700 });
    const n = r.steps.length;
    const sw = (w - 112 - 48 - (n - 1) * 34) / n;
    r.steps.forEach((s, j) => {
      const x = 80 + j * (sw + 34);
      inner += `<rect x="${x}" y="${y + 76}" width="${sw}" height="54" rx="14" fill="${j === n - 1 ? C.violet : C.violetSoft}"/>`;
      inner += text(x + sw / 2, y + 110, s, { size: 19, weight: 700, fill: j === n - 1 ? "#fff" : C.violet, anchor: "middle" });
      if (j < n - 1) inner += arrow(x + sw + 4, y + 103, x + sw + 32);
    });
  });
  return frame(w, h, title, inner);
}

function ui() {
  const w = 1200;
  const h = 700;
  const rows = [
    ["2160p", "WEBM", "Save"],
    ["1080p", "MP4", "Save"],
    ["720p", "MP4", "Save"],
    ["360p", "MP4", "Save"],
  ];
  const inner = `${card(56, 116, 1088, 92, 22)}
<rect x="76" y="136" width="760" height="52" rx="14" fill="#faf9fe" stroke="${C.line}" stroke-width="2"/>${text(96, 170, "https://www.youtube.com/watch?v=...", { size: 20, fill: C.body })}
<rect x="852" y="136" width="120" height="52" rx="14" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>${text(912, 170, "Paste", { size: 20, weight: 600, anchor: "middle" })}
<rect x="986" y="136" width="138" height="52" rx="14" fill="${C.violet}"/>${text(1055, 170, "Download", { size: 20, weight: 700, fill: "#fff", anchor: "middle" })}
${card(56, 232, 1088, 400, 22)}
<rect x="80" y="256" width="160" height="96" rx="14" fill="url(#brand)" opacity="0.85"/>${ico("play", 136, 280, 48, "#ffffff")}
<rect x="262" y="262" width="96" height="26" rx="13" fill="${C.violet}"/>${text(310, 281, "YouTube", { size: 15, weight: 700, fill: "#fff", anchor: "middle" })}
${text(262, 320, "Your video title appears here", { size: 22, weight: 700 })}${text(262, 346, "Channel name · 4:12", { size: 17, fill: C.muted })}
<rect x="80" y="372" width="100" height="36" rx="10" fill="${C.violet}"/>${text(130, 396, "Video", { size: 17, weight: 700, fill: "#fff", anchor: "middle" })}
<rect x="190" y="372" width="100" height="36" rx="10" fill="#f4f4f5"/>${text(240, 396, "Audio", { size: 17, weight: 600, anchor: "middle" })}
${rows
  .map(
    (r, i) => `<line x1="80" x2="1120" y1="${424 + i * 52}" y2="${424 + i * 52}" stroke="${C.line}" stroke-width="2"/>
${text(84, 457 + i * 52, r[0], { size: 20, weight: 700 })}${text(170, 457 + i * 52, r[1], { size: 15, fill: C.muted })}
<rect x="1040" y="${434 + i * 52}" width="72" height="32" rx="9" fill="${C.violetSoft}"/>${text(1076, 456 + i * 52, r[2], { size: 15, weight: 700, fill: C.violet, anchor: "middle" })}`,
  )
  .join("")}`;
  return frame(w, h, "The quality list on PasteAndSave", inner);
}

function playlist() {
  const w = 1200;
  const h = 640;
  const items = ["Episode 1: Getting started", "Episode 2: The first project", "Episode 3: Common mistakes", "Episode 4: Going further", "Episode 5: Questions answered"];
  const inner = `${card(56, 116, 680, 460, 22)}
${text(84, 160, "Your playlist title", { size: 24, weight: 700 })}${text(84, 190, "25 videos (showing the first 25) · pick one to download", { size: 16, fill: C.muted })}
${items
  .map(
    (t, i) => `<rect x="76" y="${212 + i * 70}" width="640" height="58" rx="14" fill="${i === 1 ? C.violetSoft : "#faf9fe"}" stroke="${i === 1 ? C.violet : C.line}" stroke-width="2"/>
${text(98, 248 + i * 70, String(i + 1), { size: 18, weight: 700, fill: C.muted })}${text(132, 248 + i * 70, t, { size: 19, weight: 600 })}${text(690, 248 + i * 70, `${8 + i}:0${i}`, { size: 16, fill: C.muted, anchor: "end" })}`,
  )
  .join("")}
${arrow(752, 335, 820)}
${card(830, 196, 314, 290, 22)}${text(860, 240, "Episode 2", { size: 22, weight: 700 })}
${["1080p", "720p", "480p", "MP3"].map((q, i) => `<rect x="856" y="${262 + i * 52}" width="262" height="42" rx="12" fill="${i === 0 ? C.violet : C.violetSoft}"/>${text(987, 290 + i * 52, q, { size: 18, weight: 700, fill: i === 0 ? "#fff" : C.violet, anchor: "middle" })}`).join("")}`;
  return frame(w, h, "Downloading from a playlist, one video at a time", inner);
}

// ---------- covers ----------

const motif = {
  flow: () => `${card(0, 130, 110, 110, 28)}${ico("link", 27, 157, 56)}${arrow(118, 185, 168)}${card(176, 130, 110, 110, 28)}${ico("page", 203, 157, 56)}${arrow(294, 185, 344)}${card(352, 120, 130, 130, 34, C.violet, C.violet)}${ico("download", 385, 153, 64, "#fff")}`,
  quality: () => `<rect x="0" y="40" width="420" height="236" rx="10" fill="#f5f3ff" stroke="${C.violet}" stroke-width="3"/><rect x="0" y="158" width="210" height="118" rx="8" fill="#ddd6fe" stroke="${C.violet}" stroke-width="2"/><rect x="0" y="197" width="140" height="79" rx="6" fill="#c4b5fd" stroke="${C.violet}" stroke-width="2"/>${text(404, 80, "4K", { size: 40, weight: 800, fill: C.violet, anchor: "end" })}${text(196, 190, "1080p", { size: 22, weight: 800, fill: C.violet, anchor: "end" })}${text(70, 245, "720p", { size: 18, weight: 800, fill: C.violet, anchor: "middle" })}`,
  formats: () => ["MP4", "WEBM", "MOV", "MKV"].map((f, i) => `<g transform="translate(${(i % 2) * 210} ${Math.floor(i / 2) * 200})">${card(0, 0, 180, 170, 22)}<path d="M120 0 V40 H180" fill="none" stroke="${C.line}" stroke-width="2"/>${text(90, 110, f, { size: 34, weight: 800, fill: i === 0 ? C.violet : C.body, anchor: "middle" })}</g>`).join(""),
  legal: () => `${card(60, 20, 300, 340, 40)}${ico("shield", 110, 60, 200, C.violet)}${text(210, 320, "Know the rules", { size: 26, weight: 700, anchor: "middle" })}`,
  safety: () => `${card(60, 20, 300, 340, 40)}${ico("shield", 110, 50, 200, C.green)}${text(210, 300, "Safe", { size: 30, weight: 800, fill: C.green, anchor: "middle" })}${text(210, 334, "no passwords, no installs", { size: 18, fill: C.body, anchor: "middle" })}`,
  phoneIcon: (name) => () => phone(110, 0, 220, 380, (w, h) => `<rect width="${w}" height="${h}" fill="${C.bg}"/>${ico(name, w / 2 - 50, h / 2 - 80, 100)}<rect x="${w / 2 - 60}" y="${h - 90}" width="120" height="44" rx="14" fill="${C.violet}"/>${ico("download", w / 2 - 16, h - 84, 32, "#fff")}`),
  twoPhones: () => `${phone(10, 20, 190, 340, (w, h) => `<rect width="${w}" height="${h}" fill="${C.bg}"/>${ico("folder", w / 2 - 40, h / 2 - 60, 80)}${text(w / 2, h / 2 + 50, "Files", { size: 20, weight: 700, anchor: "middle" })}`)}${phone(230, 20, 190, 340, (w, h) => `<rect width="${w}" height="${h}" fill="${C.bg}"/>${ico("photo", w / 2 - 40, h / 2 - 60, 80)}${text(w / 2, h / 2 + 50, "Gallery", { size: 20, weight: 700, anchor: "middle" })}`)}`,
  mp3: () => `${card(40, 30, 340, 320, 40)}${ico("note", 120, 70, 180)}${text(210, 310, "MP3", { size: 40, weight: 800, fill: C.violet, anchor: "middle" })}`,
  trouble: () => `${card(40, 30, 340, 320, 40)}${ico("warn", 110, 60, 200)}${text(210, 320, "Fix it", { size: 30, weight: 800, fill: C.amber, anchor: "middle" })}`,
  merge: () => `<rect x="0" y="70" width="240" height="70" rx="18" fill="${C.violetSoft}" stroke="${C.violet}" stroke-width="2"/>${ico("film", 18, 81, 48)}${text(80, 114, "Video", { size: 26, weight: 700 })}<rect x="0" y="220" width="240" height="70" rx="18" fill="#e0f2fe" stroke="${C.sky}" stroke-width="2"/>${ico("speaker", 18, 231, 48, "#0284c7")}${text(80, 264, "Sound", { size: 26, weight: 700 })}<g fill="none" stroke="${C.violet}" stroke-width="5" stroke-linecap="round"><path d="M244 105 C300 105 300 180 330 180"/><path d="M244 255 C300 255 300 180 330 180"/></g>${card(330, 130, 100, 100, 50, C.violet, C.violet)}${ico("check", 350, 150, 60, "#fff")}`,
  list: () => `${card(20, 20, 400, 340, 30)}${[0, 1, 2, 3, 4].map((i) => `<rect x="50" y="${50 + i * 60}" width="340" height="44" rx="12" fill="${i === 1 ? C.violet : C.violetSoft}"/>${ico("play", 60, 54 + i * 60, 36, i === 1 ? "#fff" : C.violet)}<rect x="108" y="${66 + i * 60}" width="${200 - i * 20}" height="12" rx="6" fill="${i === 1 ? "#ffffff" : "#c4b5fd"}"/>`).join("")}`,
};

function cover({ kicker, title, art }) {
  const w = 1200;
  const h = 630;
  const lines = wrap(title, 20);
  const size = lines.length > 3 ? 46 : 54;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
<rect width="${w}" height="${h}" fill="${C.bg}"/>
<circle cx="1040" cy="120" r="420" fill="url(#glowB)"/><circle cx="760" cy="600" r="380" fill="url(#glowA)"/>
<rect x="64" y="70" width="${kicker.length * 11.5 + 40}" height="42" rx="21" fill="${C.violetSoft}"/>
${text(84, 98, kicker, { size: 18, weight: 700, fill: C.violet })}
${lines.map((l, i) => text(64, 186 + i * size * 1.18, l, { size, weight: 800 })).join("")}
${mark(64, 528, 44)}${text(120, 559, "PasteAndSave", { size: 26, weight: 700 })}${text(300, 559, "pasteandsave.com/blog", { size: 20, fill: C.muted })}
<g transform="translate(700 130)">${art()}</g>
</svg>`;
}

// ---------- every image ----------

const COVERS = [
  ["how-online-video-downloaders-work", "LESSON 1 · THE BASICS", "How Online Video Downloaders Work", motif.flow, "Illustration of a copied link becoming a page and then a downloaded file"],
  ["video-quality-explained", "LESSON 2 · THE BASICS", "Video Quality Explained: 360p to 4K", motif.quality, "Illustration of nested screens showing 720p, 1080p and 4K video sizes"],
  ["video-formats-explained", "LESSON 3 · THE BASICS", "MP4, WebM, MOV or MKV?", motif.formats, "Four file icons labelled MP4, WebM, MOV and MKV"],
  ["is-it-legal-to-download-videos", "LESSON 4 · THE BASICS", "Is It Legal to Download Videos?", motif.legal, "Shield with a check mark representing the rules for downloading videos"],
  ["are-online-video-downloaders-safe", "LESSON 5 · THE BASICS", "Are Online Video Downloaders Safe?", motif.safety, "Green shield with a check mark for safe video downloading"],
  ["download-tiktok-without-watermark", "HOW TO GUIDE", "Download TikTok Videos Without a Watermark", motif.phoneIcon("note"), "Phone showing a music note and a download button for saving TikTok videos"],
  ["download-instagram-reels", "HOW TO GUIDE", "Download Instagram Reels, Stories and Photos", motif.phoneIcon("photo"), "Phone showing a photo icon and a download button for saving Instagram Reels"],
  ["download-youtube-videos", "HOW TO GUIDE", "How to Download YouTube Videos", motif.phoneIcon("play"), "Phone showing a play button and a download button for saving YouTube videos"],
  ["download-youtube-playlist", "HOW TO GUIDE", "Download a YouTube Playlist", motif.list, "A list of videos with one selected, for downloading from a playlist"],
  ["download-facebook-videos", "HOW TO GUIDE", "Download Facebook Videos and Reels", motif.phoneIcon("film"), "Phone showing a film strip and a download button for saving Facebook videos"],
  ["download-twitter-x-videos", "HOW TO GUIDE", "Download Videos and Photos from X", motif.phoneIcon("chat"), "Phone showing a post bubble with a play button for saving videos from X"],
  ["download-reddit-videos-with-sound", "HOW TO GUIDE", "Download Reddit Videos With Sound", motif.merge, "A video track and a sound track joined into one file"],
  ["save-videos-on-iphone-and-android", "HOW TO GUIDE", "Save Videos on iPhone and Android", motif.twoPhones, "Two phones showing the Files app and the photo gallery"],
  ["convert-video-to-mp3", "HOW TO GUIDE", "Convert a Video to MP3", motif.mp3, "Large music note above the letters MP3"],
  ["video-wont-download", "FIX A PROBLEM", "Why a Video Won't Download", motif.trouble, "Warning sign representing a video that will not download"],
];

const DIAGRAMS = [
  {
    file: "how-a-video-downloader-works-from-link-to-file.webp",
    alt: "Five steps from a copied link to a saved file: copy the link, the page is read, qualities are listed, video and sound are joined, the file is saved",
    svg: () =>
      steps({
        title: "From a link to a file, in five steps",
        items: [
          { icon: "link", label: "Copy the link", sub: "From the app's Share button" },
          { icon: "page", label: "The page is read", sub: "As a visitor who is not logged in" },
          { icon: "list", label: "Qualities listed", sub: "Every size the site stores" },
          { icon: "merge", label: "Video and sound joined", sub: "When they are stored apart" },
          { icon: "download", label: "File saved", sub: "In your Downloads folder" },
        ],
      }),
  },
  {
    file: "pasteandsave-quality-list-video-and-audio-options.webp",
    alt: "The PasteAndSave downloader showing a pasted link, a video title and a list of qualities from 2160p to 360p with Save buttons",
    svg: ui,
  },
  {
    file: "video-resolution-comparison-360p-720p-1080p-4k.webp",
    alt: "Rectangles drawn to scale comparing 360p, 720p, 1080p and 4K video resolutions",
    svg: resolutions,
  },
  {
    file: "video-file-size-per-minute-by-quality.webp",
    alt: "Bar chart of typical video file size per minute, from about 5 MB at 360p to about 150 MB at 4K",
    svg: () =>
      bars({
        title: "Typical file size for one minute of video",
        unit: "MB",
        rows: [
          { label: "360p", value: 5, display: "4 to 5" },
          { label: "480p", value: 10, display: "6 to 10" },
          { label: "720p", value: 20, display: "10 to 20" },
          { label: "1080p", value: 40, display: "20 to 40" },
          { label: "1440p", value: 70, display: "40 to 70" },
          { label: "4K", value: 150, display: "80 to 150" },
        ],
        note: "Upper end of each range shown. Real sizes depend on the codec and how much the picture moves.",
      }),
  },
  {
    file: "video-container-and-codec-explained.webp",
    alt: "Diagram of an MP4 container holding a video track packed with H.264, an audio track packed with AAC, and optional subtitles",
    svg: container,
  },
  {
    file: "is-downloading-videos-legal-fine-gray-area-not-okay.webp",
    alt: "Three columns listing downloads that are usually fine, gray areas, and uses that are usually not okay",
    svg: () =>
      columns({
        title: "Downloading videos: what the rules usually allow",
        h: 540,
        cols: [
          { heading: "Usually fine", icon: "check", color: C.green, soft: C.greenSoft, items: ["Your own uploads", "Creative Commons videos, with credit", "Public domain films", "Anything the creator said yes to"] },
          { heading: "Gray area", icon: "question", color: C.amber, soft: C.amberSoft, items: ["Saving a public video to watch offline", "Short clips for review or teaching", "Showing a video in a classroom"] },
          { heading: "Usually not okay", icon: "cross", color: C.red, soft: C.redSoft, items: ["Posting someone's video as your own", "Using clips in ads without a licence", "Selling copies", "Breaking copy protection"] },
        ],
      }),
  },
  {
    file: "safe-video-downloader-checklist.webp",
    alt: "Checklist comparing signs of a safe video downloader with warning signs of a bad one",
    svg: () =>
      columns({
        title: "Safe downloader or bad one? Check these signs",
        h: 490,
        cols: [
          { heading: "Signs it is safe", icon: "check", color: C.green, soft: C.greenSoft, items: ["Never asks for your password", "Nothing to install for one video", "Files end in .mp4, .webm, .mp3 or .m4a", "Explains what it keeps about you"] },
          { heading: "Warning signs", icon: "cross", color: C.red, soft: C.redSoft, items: ["Asks you to log in with your social account", "Wants you to install a player or codec", "Files end in .exe, .apk or .zip", "Asks you to allow notifications"] },
        ],
      }),
  },
  {
    file: "download-tiktok-video-without-watermark-steps.webp",
    alt: "Three phone screens: tap Share and Copy link in TikTok, paste the link into PasteAndSave, then pick MP4 or MP3 to save",
    svg: () =>
      phoneSteps({
        title: "Saving a TikTok without the watermark",
        screens: [
          { caption: "Tap Share, then Copy link", screen: screen.share("Copy link") },
          { caption: "Paste it into PasteAndSave", screen: screen.paste("tiktok.com/@creator/video/7...") },
          { caption: "Pick MP4 or MP3 and save", screen: screen.qualities(["1080p MP4", "720p MP4", "MP3"]) },
        ],
      }),
  },
  {
    file: "download-instagram-reel-steps.webp",
    alt: "Three phone screens: tap the paper plane and Copy link in Instagram, paste the link into PasteAndSave, then choose a quality",
    svg: () =>
      phoneSteps({
        title: "Saving an Instagram Reel",
        screens: [
          { caption: "Tap the paper plane, then Copy link", screen: screen.share("Copy link") },
          { caption: "Paste it into PasteAndSave", screen: screen.paste("instagram.com/reel/C...") },
          { caption: "Choose a quality and save", screen: screen.qualities(["1080p MP4", "720p MP4", "MP3"]) },
        ],
      }),
  },
  {
    file: "download-facebook-video-steps.webp",
    alt: "Three phone screens: tap Share and Copy link in Facebook, paste the link into PasteAndSave, then pick HD or SD",
    svg: () =>
      phoneSteps({
        title: "Saving a Facebook video or Reel",
        screens: [
          { caption: "Tap Share, then Copy link", screen: screen.share("Copy link") },
          { caption: "Paste it into PasteAndSave", screen: screen.paste("facebook.com/reel/1...") },
          { caption: "Pick HD or SD and save", screen: screen.qualities(["HD MP4", "SD MP4", "MP3"]) },
        ],
      }),
  },
  {
    file: "download-x-twitter-video-steps.webp",
    alt: "Three phone screens: tap Share and Copy link on an X post, paste the link into PasteAndSave, then pick a quality or photo",
    svg: () =>
      phoneSteps({
        title: "Saving a video or photo from X",
        screens: [
          { caption: "Tap Share, then Copy link", screen: screen.share("Copy link") },
          { caption: "Paste it into PasteAndSave", screen: screen.paste("x.com/user/status/18...") },
          { caption: "Pick a quality or photo", screen: screen.qualities(["1080p MP4", "720p MP4", "Photo 1"]) },
        ],
      }),
  },
  {
    file: "youtube-hd-video-and-audio-joined.webp",
    alt: "A picture only video track and a separate audio track joined into one MP4 file with sound",
    svg: () =>
      merge({ title: "Why HD YouTube videos are two files", a: "1080p picture, no sound", b: "Audio track", out: "1080p MP4 with sound" }),
  },
  {
    file: "reddit-video-and-sound-joined.webp",
    alt: "Reddit's silent video file and separate sound file joined into one video with sound",
    svg: () =>
      merge({ title: "Reddit keeps the picture and the sound apart", a: "Video, no sound", b: "Sound file", out: "Reddit video with sound" }),
  },
  {
    file: "download-youtube-playlist-one-video-at-a-time.webp",
    alt: "A playlist of five videos with the second one selected, and its quality options from 1080p to MP3",
    svg: playlist,
  },
  {
    file: "where-downloaded-videos-go-iphone-android.webp",
    alt: "Where downloads go: on iPhone from Safari to Files, Downloads, then Save Video into Photos; on Android from Chrome to the Download folder, then the gallery",
    svg: () =>
      paths({
        title: "Where your downloaded video goes",
        rows: [
          { icon: "folder", label: "iPhone and iPad", steps: ["Safari", "Files app", "Downloads", "Save Video", "Photos"] },
          { icon: "photo", label: "Android", steps: ["Chrome", "Download folder", "Gallery app"] },
        ],
      }),
  },
  {
    file: "mp3-file-size-by-bitrate.webp",
    alt: "Bar chart of the size of a four minute song as MP3 at 64, 96, 128, 256 and 320 kbps, from about 2 MB to about 9 MB",
    svg: () =>
      bars({
        title: "Size of a 4 minute song as MP3, by bitrate",
        unit: "MB",
        rows: [
          { label: "64 kbps", value: 1.9, display: "about 2" },
          { label: "96 kbps", value: 2.8, display: "about 3" },
          { label: "128 kbps", value: 3.8, display: "about 4" },
          { label: "256 kbps", value: 7.5, display: "about 8" },
          { label: "320 kbps", value: 9.4, display: "about 9" },
        ],
        note: "Most online video carries sound at about 128 to 160 kbps, so above 256 kbps the file grows but the sound doesn't improve.",
      }),
  },
  {
    file: "why-a-video-wont-download-nine-reasons.webp",
    alt: "Nine common reasons a video won't download: unsupported site, no video in the post, private, sign in needed, region block, copy protection, removed, dead share link, site busy",
    svg: () =>
      grid({
        title: "Nine reasons a video won't download",
        items: [
          { icon: "globe", label: "The site isn't supported" },
          { icon: "photo", label: "The post has no video" },
          { icon: "lock", label: "The account is private" },
          { icon: "user", label: "It needs a sign in" },
          { icon: "globe", label: "Blocked in our server's region" },
          { icon: "shield", label: "It is copy protected" },
          { icon: "trash", label: "It was removed" },
          { icon: "broken", label: "The share link is dead" },
          { icon: "clock", label: "The site is busy, try again" },
        ],
      }),
  },
];

// ---------- write ----------

function metadata(description) {
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">
<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(description)}</rdf:li></rdf:Alt></dc:title>
<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(description)}</rdf:li></rdf:Alt></dc:description>
<dc:creator><rdf:Seq><rdf:li>PasteAndSave</rdf:li></rdf:Seq></dc:creator>
<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">Copyright ${YEAR} PasteAndSave, pasteandsave.com</rdf:li></rdf:Alt></dc:rights>
<photoshop:Credit>PasteAndSave</photoshop:Credit>
<xmpRights:WebStatement>https://pasteandsave.com/terms</xmpRights:WebStatement>
</rdf:Description></rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
  return {
    exif: {
      IFD0: {
        ImageDescription: description,
        Artist: "PasteAndSave",
        Copyright: `Copyright ${YEAR} PasteAndSave, pasteandsave.com`,
        Software: "PasteAndSave blog images",
      },
    },
    xmp,
  };
}

async function render(svg, file, description, width = Number(/width="(\d+)"/.exec(svg)[1])) {
  const meta = metadata(description);
  let img = sharp(Buffer.from(svg), { density: 144 }).resize({ width });
  img = file.endsWith(".jpg")
    ? img.jpeg({ quality: 84, progressive: true, mozjpeg: true })
    : img.webp({ quality: 88, effort: 6 });
  const out = path.join(OUT_DIR, file);
  const info = await img.withExif(meta.exif).withXmp(meta.xmp).toFile(out);
  return { width: info.width, height: info.height, bytes: info.size };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
for (const [slug, kicker, title, art, alt] of COVERS) {
  const file = `${slug}.jpg`;
  const svg = cover({ kicker, title, art });
  const r = await render(svg, file, alt);
  // Half size for the cards on the blog index, which never show it wider.
  const small = `${slug}-600w.jpg`;
  await render(svg, small, alt, 600);
  manifest[`/blog/images/${file}`] = { width: r.width, height: r.height, alt, small: `/blog/images/${small}` };
  console.log(`${file}  ${r.width}x${r.height}  ${Math.round(r.bytes / 1024)} KB`);
}
for (const d of DIAGRAMS) {
  const r = await render(d.svg(), d.file, d.alt);
  manifest[`/blog/images/${d.file}`] = { width: r.width, height: r.height, alt: d.alt };
  console.log(`${d.file}  ${r.width}x${r.height}  ${Math.round(r.bytes / 1024)} KB`);
}

const body = Object.entries(manifest)
  .map(
    ([k, v]) =>
      `  ${JSON.stringify(k)}: { width: ${v.width}, height: ${v.height}, alt: ${JSON.stringify(v.alt)}${v.small ? `, small: ${JSON.stringify(v.small)}` : ""} },`,
  )
  .join("\n");
fs.writeFileSync(
  MANIFEST,
  `// Written by scripts/blog-images.mjs. Do not edit by hand: change the script and run it again.
//
// No imports on purpose: the tests load this file directly.

/** small: a 600 pixel wide copy, for covers. */
export type BlogImage = { width: number; height: number; alt: string; small?: string };

export const IMAGES: Record<string, BlogImage> = {
${body}
};
`,
);
console.log(`manifest: ${Object.keys(manifest).length} images`);
