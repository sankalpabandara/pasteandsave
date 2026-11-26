"use client";

import { useEffect } from "react";

/**
 * Keeps <html lang> and dir in step with the page on screen. The layout sets
 * them on a full load, but it is not rendered again when a link moves between
 * pages inside the app, so going from an Arabic page to an English only one
 * would otherwise leave the English page laid out right to left.
 */
export default function HtmlLangSync({ lang, dir }: { lang: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    const root = document.documentElement;
    if (root.lang !== lang) root.lang = lang;
    if (root.dir !== dir) root.dir = dir;
  }, [lang, dir]);
  return null;
}
