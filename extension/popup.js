// Popup logic: shows what the background worker found on the active tab,
// downloads plain files directly, and routes pages or streams to the site.

const api = globalThis.browser ?? globalThis.chrome;
const SITE = "https://pasteandsave.com";

let allItems = [];
let activeFilter = "all";
let pageUrl = "";
let pageIsHttp = false;

function fmtSize(bytes) {
  if (!bytes) return "size unknown";
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 ** 3).toFixed(1) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  return Math.round(bytes / 1024) + " KB";
}

function categoryOf(item) {
  if (item.kind === "stream") return "stream";
  if (
    (item.contentType || "").startsWith("audio/") ||
    /\.(mp3|m4a|aac|ogg|opus|wav|flac)([?#]|$)/i.test(item.url)
  ) {
    return "audio";
  }
  return "video";
}

function openSite(url, mp3) {
  const param = mp3 ? "&mp3=1" : "";
  api.tabs.create({ url: `${SITE}/?url=${encodeURIComponent(url)}${param}` });
  window.close();
}

function download(btn, item) {
  btn.disabled = true;
  api.runtime.sendMessage(
    { type: "download", url: item.url, filename: item.filename },
    (res) => {
      btn.textContent = res?.ok ? "Saved" : "Retry";
      btn.classList.toggle("done", !!res?.ok);
      btn.disabled = false;
    },
  );
}

function render() {
  const list = document.getElementById("media-list");
  list.textContent = "";
  const visible = allItems.filter(
    (it) => activeFilter === "all" || categoryOf(it) === activeFilter,
  );

  for (const item of visible) {
    const li = document.createElement("li");
    const cat = categoryOf(item);

    const chip = document.createElement("span");
    chip.className = "kind " + cat;
    chip.textContent = cat.toUpperCase();

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = item.filename;
    name.title = item.url;
    const size = document.createElement("p");
    size.className = "size";
    size.textContent = item.kind === "stream" ? "via PasteAndSave" : fmtSize(item.size);
    meta.append(name, size);

    const actions = document.createElement("div");
    actions.className = "actions";

    const copy = document.createElement("button");
    copy.className = "icon-btn";
    copy.title = "Copy link";
    copy.textContent = "⧉";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.url);
        copy.textContent = "✓";
        setTimeout(() => (copy.textContent = "⧉"), 1200);
      } catch {
        copy.textContent = "!";
      }
    });

    const btn = document.createElement("button");
    btn.className = "save";
    btn.textContent = "Save";
    btn.addEventListener("click", () => {
      if (item.kind === "stream") {
        // Raw stream chunks are not a playable file; the site fetches it whole.
        openSite(pageIsHttp ? pageUrl : item.url);
        return;
      }
      download(btn, item);
    });

    actions.append(copy, btn);

    if (cat === "video" && item.kind !== "stream") {
      const mp3 = document.createElement("button");
      mp3.className = "icon-btn";
      mp3.title = "Get as MP3 via PasteAndSave";
      mp3.textContent = "♪";
      mp3.addEventListener("click", () => openSite(pageIsHttp ? pageUrl : item.url, true));
      actions.prepend(mp3);
    }

    li.append(chip, meta, actions);
    list.append(li);
  }

  const directFiles = visible.filter((it) => it.kind === "file");
  const saveAll = document.getElementById("save-all");
  saveAll.hidden = directFiles.length < 2;
  saveAll.onclick = () => {
    saveAll.disabled = true;
    saveAll.textContent = "Saving…";
    let left = directFiles.length;
    for (const item of directFiles) {
      api.runtime.sendMessage(
        { type: "download", url: item.url, filename: item.filename },
        () => {
          if (--left === 0) {
            saveAll.textContent = "All saved";
          }
        },
      );
    }
  };
}

async function init() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  pageUrl = tab.url ?? "";
  pageIsHttp = /^https?:/i.test(pageUrl);
  const saveBtn = document.getElementById("save-page");
  const hostEl = document.getElementById("page-host");

  if (pageIsHttp) {
    try {
      hostEl.textContent = "from " + new URL(pageUrl).hostname.replace(/^www\./, "");
    } catch {
      hostEl.textContent = "";
    }
    saveBtn.addEventListener("click", () => openSite(pageUrl));
  } else {
    saveBtn.disabled = true;
    document.getElementById("save-page-label").textContent = "Open a video page first";
  }

  const { items = [], minBytes } = await new Promise((resolve) =>
    api.runtime.sendMessage({ type: "getMedia", tabId: tab.id }, (res) => resolve(res ?? {})),
  );
  allItems = items;

  const minSel = document.getElementById("min-size");
  if (minBytes) minSel.value = String(minBytes);
  minSel.addEventListener("change", () => {
    api.runtime.sendMessage({ type: "setMinBytes", minBytes: Number(minSel.value) });
  });

  document.getElementById("filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    for (const f of document.querySelectorAll(".filter")) {
      f.classList.toggle("active", f === btn);
    }
    render();
  });

  if (allItems.length === 0) return; // empty state stays visible

  document.getElementById("empty").hidden = true;
  document.getElementById("media-section").hidden = false;
  render();
}

init();
