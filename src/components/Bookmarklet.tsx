import { SITE_NAME, SITE_URL } from "@/lib/site";

// A one-click bookmarklet. Users drag the button to their bookmarks bar, then
// click it on any video page to jump here with the link already loaded. Works
// on every supported site, not just one. The javascript: href is set via
// dangerouslySetInnerHTML because React strips javascript: URLs from <a href>.
export default function Bookmarklet() {
  const base = SITE_URL.replace(/\/$/, "");
  const code = `javascript:(function(){window.open('${base}/?url='+encodeURIComponent(location.href),'_blank');})();`;
  const link =
    `<a href="${code.replace(/"/g, "&quot;")}" ` +
    `class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white no-underline shadow-sm hover:bg-violet-700" ` +
    `onclick="return false;">⬇ Save with ${SITE_NAME}</a>`;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-center sm:p-8 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
          Download from any page in one click
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-600 dark:text-neutral-400">
          Drag this button to your bookmarks bar. Then, on any video or post,
          click it to open {SITE_NAME} with the link already loaded. No copying
          and pasting.
        </p>
        <div
          className="mt-5 flex justify-center"
          dangerouslySetInnerHTML={{ __html: link }}
        />
        <p className="mt-4 text-xs text-neutral-400">
          You can also share a ready-to-download link:{" "}
          <span className="font-mono">{base}/?url=VIDEO_LINK</span>
        </p>
      </div>
    </section>
  );
}
