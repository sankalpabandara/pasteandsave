"use client";

import { useCallback } from "react";

// Renders the bookmarklet anchor and stops a click on it from doing anything.
//
// The anchor itself has to arrive as raw HTML, because React strips a
// javascript: href from <a href>, and the href is the whole point: dragging
// the button to the bookmarks bar is what installs it.
//
// Stopping the click used to be an onclick="return false;" attribute inside
// that HTML, which the Content-Security-Policy refuses to run: script-src
// carries a nonce and no 'unsafe-inline', and an attribute handler cannot
// carry a nonce. So it was blocked on every page load, logging a policy
// violation each time, and the click it was supposed to neutralise went
// through to the javascript: href instead, which the same policy also blocks.
// Two blocked things where one listener does the job.
//
// A listener attached here is ordinary bundled code, so the policy allows it,
// and the href stays in the server-rendered HTML exactly as before.
export default function BookmarkletLink({ html }: { html: string }) {
  const attach = useCallback((host: HTMLDivElement | null) => {
    if (!host) return;
    const anchor = host.querySelector("a");
    if (!anchor) return;
    // Clicking is not how a bookmarklet is used, and following a javascript:
    // href in the page would do nothing useful even if it were allowed.
    // Dragging is unaffected: it never fires a click.
    anchor.addEventListener("click", (event) => event.preventDefault());
  }, []);

  return (
    <div
      className="mt-5 flex justify-center"
      ref={attach}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}