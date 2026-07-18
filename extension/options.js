// Settings page: site address and minimum file size, stored in sync storage
// so they follow the user's browser profile.

const api = globalThis.browser ?? globalThis.chrome;
const DEFAULTS = { siteBase: "https://pasteandsave.com", minBytes: 204800 };

const siteInput = document.getElementById("site");
const minSelect = document.getElementById("min");
const status = document.getElementById("status");

api.storage.sync.get(DEFAULTS, (v) => {
  siteInput.value = v.siteBase ?? DEFAULTS.siteBase;
  minSelect.value = String(v.minBytes ?? DEFAULTS.minBytes);
});

document.getElementById("save").addEventListener("click", () => {
  let siteBase = siteInput.value.trim() || DEFAULTS.siteBase;
  try {
    const u = new URL(siteBase);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
    siteBase = u.origin;
  } catch {
    status.textContent = "That address does not look like a URL.";
    status.style.color = "#dc2626";
    return;
  }
  api.storage.sync.set({ siteBase, minBytes: Number(minSelect.value) }, () => {
    siteInput.value = siteBase;
    status.textContent = "Saved.";
    status.style.color = "#059669";
    setTimeout(() => (status.textContent = ""), 2000);
  });
});
