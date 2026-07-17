// Popup logic: shows what the background worker found on the active tab,
// downloads plain files directly, and routes pages or streams to the site.

const api = globalThis.browser ?? globalThis.chrome;
const SITE = "https://pasteandsave.com";

function fmtSize(bytes) {
  if (!bytes) return "size unknown";
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 ** 3).toFixed(1) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  return Math.round(bytes / 1024) + " KB";
}

function kindLabel(item) {
  if (item.kind === "stream") return { cls: "stream", text: "STREAM" };
  if ((item.contentType || "").startsWith("audio/") || /\.(mp3|m4a|aac|ogg|opus|wav|flac)([?#]|$)/i.test(item.url)) {
    return { cls: "audio", text: "AUDIO" };
  }
  return { cls: "video", text: "VIDEO" };
}

function openSite(url) {
  api.tabs.create({ url: `${SITE}/?url=${encodeURIComponent(url)}` });
  window.close();
}

async function init() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const pageUrl = tab.url ?? "";
  const isHttp = /^https?:/i.test(pageUrl);
  const saveBtn = document.getElementById("save-page");
  const hostEl = document.getElementById("page-host");

  if (isHttp) {
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

  const { items = [] } = await new Promise((resolve) =>
    api.runtime.sendMessage({ type: "getMedia", tabId: tab.id }, (res) => resolve(res ?? {})),
  );

  const empty = document.getElementById("empty");
  if (items.length === 0) return; // empty state stays visible

  empty.hidden = true;
  document.getElementById("media-section").hidden = false;
  const list = document.getElementById("media-list");

  for (const item of items) {
    const li = document.createElement("li");

    const kind = kindLabel(item);
    const chip = document.createElement("span");
    chip.className = "kind " + kind.cls;
    chip.textContent = kind.text;

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = item.filename;
    name.title = item.filename;
    const size = document.createElement("p");
    size.className = "size";
    size.textContent = item.kind === "stream" ? "via PasteAndSave" : fmtSize(item.size);
    meta.append(name, size);

    const btn = document.createElement("button");
    btn.className = "save";
    btn.textContent = "Save";
    btn.addEventListener("click", () => {
      if (item.kind === "stream") {
        // Raw stream chunks are not a playable file; the site fetches it whole.
        openSite(isHttp ? pageUrl : item.url);
        return;
      }
      btn.disabled = true;
      api.runtime.sendMessage(
        { type: "download", url: item.url, filename: item.filename },
        (res) => {
          btn.textContent = res?.ok ? "Saved" : "Retry";
          btn.classList.toggle("done", !!res?.ok);
          btn.disabled = false;
        },
      );
    });

    li.append(chip, meta, btn);
    list.append(li);
  }
}

init();
