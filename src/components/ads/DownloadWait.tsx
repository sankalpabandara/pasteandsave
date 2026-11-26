"use client";

import AdSlot from "@/components/ads/AdSlot";
import NativeSlot from "@/components/ads/NativeSlot";

// The panel that stands in for the wait.
//
// Pressing Save does not hand over a file: the server fetches the video,
// and for an MP3 converts it too, which takes up to a minute and a half. The
// visitor has to stay on the page for all of it, because leaving cancels the
// job. Until now that minute showed a progress bar and nothing else.
//
// Nothing here is held back, and there is no countdown. The wait is the
// server's, not a toll: the file saves itself the moment it is ready. What
// changed is that the wait is no longer blank.
export default function DownloadWait({
  active,
  label = "Advertisement",
}: {
  /** Whether a file is being prepared right now. */
  active: boolean;
  /** "Advertisement" in the page's language. */
  label?: string;
}) {
  if (!active) return null;

  return (
    <div className="glass glass-hairline mt-4 overflow-hidden rounded-2xl px-4 py-4">
      <p className="text-sm font-medium text-neutral-900 dark:text-white">
        Preparing your file
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        A long video can take a minute or two. Keep this page open and it will save by
        itself as soon as it is ready. This site is free, and the ads below are what
        pays for the servers that make your file.
      </p>
      <AdSlot slot="downloadWait" className="mt-4" label={label} />
      <NativeSlot slot="waitNative" className="mt-4" label={label} />
    </div>
  );
}
