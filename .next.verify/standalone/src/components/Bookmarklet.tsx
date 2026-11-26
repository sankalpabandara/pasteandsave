import { SITE_NAME, SITE_URL } from "@/lib/site";
import { fill } from "@/lib/i18n";
import { getLocale } from "@/i18n/server";
import { getDict } from "@/i18n";
import BookmarkletLink from "@/components/BookmarkletLink";

// A one-click bookmarklet. Users drag the button to their bookmarks bar, then
// click it on any video page to jump here with the link already loaded. Works
// on every supported site, not just one. The anchor is handed to
// BookmarkletLink as raw HTML, because React strips a javascript: href from
// <a href> and that href is what gets dragged to the bookmarks bar.
export default async function Bookmarklet() {
  const t = getDict(await getLocale()).bookmarklet;
  const base = SITE_URL.replace(/\/$/, "");
  const code = `javascript:(function(){window.open('${base}/?url='+encodeURIComponent(location.href),'_blank');})();`;
  // The label goes into raw HTML, so the few characters that matter there are
  // escaped even though every translation is our own text.
  const label = fill(t.button, { site: SITE_NAME }).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const link =
    `<a href="${code.replace(/"/g, "&quot;")}" ` +
    `class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white no-underline shadow-sm hover:bg-violet-700" ` +
    `draggable="true">⬇ ${label}</a>`;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="glass glass-hairline glass-sheen rounded-3xl p-6 text-center sm:p-8">
        <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">
          {t.heading}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-600 dark:text-neutral-400">
          {fill(t.body, { site: SITE_NAME })}
        </p>
        <BookmarkletLink html={link} />
        <p className="mt-4 text-xs text-neutral-400">
          {t.shareNote}{" "}
          <span className="font-mono" dir="ltr">{base}/?url=VIDEO_LINK</span>
        </p>
      </div>
    </section>
  );
}
