"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { detectPlatform } from "@/lib/platforms";
import { useAdGate } from "@/components/ads/AdProvider";

type VideoTier = {
  formatId: string;
  ext: string;
  label: string;
  height: number;
  hasAudio: boolean;
  filesize: number | null;
};

type AudioOption = {
  id: string;
  label: string;
  audioFormat: "mp3" | "m4a";
  bitrate: number | null;
};

type ImageFormat = {
  formatId: string;
  ext: string;
  label: string;
  filesize: number | null;
};

type InfoResult = {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  site: string | null;
  video: VideoTier[];
  audio: AudioOption[];
  images: ImageFormat[];
};

type PlaylistEntry = { title: string; url: string; duration: number | null };
type PlaylistInfo = { title: string; entries: PlaylistEntry[]; truncated: boolean };

// A pure playlist link (playlist page, a SoundCloud set, or a ?list= without a
// specific video). A normal watch?v=...&list=... link stays a single video.
function isPlaylistUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const path = u.pathname.toLowerCase();
    if (path.includes("/playlist") || path.includes("/sets/") || path.includes("/album")) {
      return true;
    }
    if (u.searchParams.has("list") && !u.searchParams.has("v")) return true;
    return false;
  } catch {
    return false;
  }
}

type JobState =
  | { status: "idle" }
  | { status: "starting" | "downloading" | "converting"; percent: number }
  | { status: "error"; message: string };

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusLabel(job: JobState): string {
  switch (job.status) {
    case "starting":
      return "Starting…";
    case "downloading":
      return `Downloading ${Math.round(job.percent)}%`;
    case "converting":
      return "Converting…";
    case "error":
      return job.message;
    default:
      return "";
  }
}

// A lookup can be slow (the source site is fetched live), but it must never
// hang forever, without a ceiling a stalled request leaves the spinner
// running with no way out.
const LOOKUP_TIMEOUT_MS = 120_000;

type UrlCheck = { url: string } | { error: string };

// Catches the obvious mistakes before spending a slow round trip on them, and
// forgives a pasted address that is missing its https:// prefix.
function checkUrl(raw: string): UrlCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Paste a video link first." };

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return {
      error:
        "That doesn't look like a link. Copy the address from your browser and paste the whole thing.",
    };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Only web links starting with http or https can be downloaded." };
  }
  // A hostname with no dot is either a typo or a machine on the local
  // network, neither of which is something to download from.
  if (!parsed.hostname.includes(".")) {
    return { error: "That link is missing a website name. Check it and try again." };
  }
  return { url: parsed.toString() };
}

// Wraps fetch with an abort timer so a stalled request surfaces as a real,
// readable error instead of an endless spinner.
function postJson(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

// Anything that stops the request reaching a real answer, said plainly.
function networkErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "That link took too long to read. The site may be busy right now, please try again.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

// Every row in both tabs looks and behaves the same: a title, an optional
// note, a size, and a Save button that fills with progress while it runs.
function DownloadRow({
  label,
  note,
  size,
  job,
  onClick,
}: {
  label: string;
  note: string;
  size: string;
  job: JobState;
  onClick: () => void;
}) {
  const active = job.status !== "idle" && job.status !== "error";
  return (
    <div className="relative">
      {active && "percent" in job && (
        <div
          className="absolute inset-y-0 left-0 bg-violet-50 transition-all dark:bg-violet-900/30"
          style={{ width: `${job.percent}%` }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={active}
        className="relative flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-neutral-50 disabled:hover:bg-transparent dark:hover:bg-white/5"
      >
        <span className="font-medium text-neutral-800 dark:text-neutral-200">
          {label}
          {note && (
            <span className="ml-2 text-xs font-normal text-neutral-400 dark:text-neutral-500">
              {note}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-neutral-500 dark:text-neutral-400">
          {active ? (
            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
              {statusLabel(job)}
            </span>
          ) : (
            <>
              {size}
              <span className="rounded-lg bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                Save
              </span>
            </>
          )}
        </span>
      </button>
      {job.status === "error" && (
        <p className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">
          {job.message}
        </p>
      )}
    </div>
  );
}

export default function DownloaderForm({
  placeholder = "Paste your video link here",
}: {
  placeholder?: string;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfoResult | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [tab, setTab] = useState<"video" | "audio">("video");
  const sourcesRef = useRef<Record<string, EventSource>>({});
  const autoRanRef = useRef(false);
  const mp3PrefRef = useRef(false);
  const { gate } = useAdGate();

  // Look up one video and show its download options. Used both for the search
  // box and when a playlist item is clicked (which leaves the list in place).
  const lookupSingle = useCallback(
    async (target: string, fromPlaylist = false) => {
      const trimmed = target.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      setResult(null);
      setJobs({});
      if (fromPlaylist) setSelectedUrl(trimmed);
      // Kick off the lookup and show the ad gate at the same time, so the ad
      // overlaps the existing wait instead of adding delay.
      const infoPromise = postJson("/api/info", { url: trimmed });
      try {
        await gate();
        const res = await infoPromise;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        setResult(data);
        // Open on the tab that actually has something in it, photo posts and
        // music links have no video ladder, or on Audio when the visitor
        // arrived from the extension's MP3 shortcut.
        const preferAudio =
          mp3PrefRef.current || (data.video?.length ?? 0) === 0;
        setTab(preferAudio && (data.audio?.length ?? 0) > 0 ? "audio" : "video");
      } catch (err) {
        setError(networkErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [gate],
  );

  const lookupPlaylist = useCallback(
    async (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      setPlaylist(null);
      const promise = postJson("/api/playlist", { url: trimmed });
      try {
        await gate();
        const res = await promise;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Couldn't read that playlist.");
          return;
        }
        setPlaylist(data);
      } catch (err) {
        setError(networkErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [gate],
  );

  const runLookup = useCallback(
    async (target: string) => {
      // Reject what is plainly not a link here, so an obvious typo costs
      // nothing and gets a straight answer instead of a slow generic failure.
      const checked = checkUrl(target);
      if ("error" in checked) {
        setResult(null);
        setPlaylist(null);
        setSelectedUrl(null);
        setJobs({});
        setError(checked.error);
        return;
      }
      const clean = checked.url;
      setUrl(clean);
      setResult(null);
      setPlaylist(null);
      setSelectedUrl(null);
      setJobs({});
      if (isPlaylistUrl(clean)) {
        await lookupPlaylist(clean);
      } else {
        await lookupSingle(clean);
      }
    },
    [lookupSingle, lookupPlaylist],
  );

  // Deep link / bookmarklet support: a ?url= (or ?u=) query prefills the box
  // and starts the lookup automatically, so shareable download links and the
  // one-click bookmarklet work.
  useEffect(() => {
    if (autoRanRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("url") ?? params.get("u");
    if (!shared) return;
    autoRanRef.current = true;
    // ?mp3=1 (used by the browser extension) means the visitor already chose
    // audio, so the MP3 job starts as soon as the lookup lands.
    if (params.get("mp3") === "1") mp3PrefRef.current = true;
    // Defer a tick so the lookup's state updates don't run synchronously
    // inside the effect.
    const t = setTimeout(() => void runLookup(shared), 0);
    return () => clearTimeout(t);
  }, [runLookup]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runLookup(url);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // clipboard permission denied, ignore, user can paste manually
    }
  }

  function startJob(key: string, body: object) {
    sourcesRef.current[key]?.close();
    setJobs((prev) => ({ ...prev, [key]: { status: "starting", percent: 0 } }));

    fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setJobs((prev) => ({
            ...prev,
            [key]: { status: "error", message: data.error ?? "Failed to start." },
          }));
          return;
        }
        const source = new EventSource(`/api/jobs/${data.jobId}/events`);
        sourcesRef.current[key] = source;

        source.onmessage = (ev) => {
          const payload = JSON.parse(ev.data);
          if (payload.status === "error") {
            setJobs((prev) => ({
              ...prev,
              [key]: { status: "error", message: payload.error ?? "Something went wrong." },
            }));
            source.close();
            return;
          }
          if (payload.status === "done") {
            source.close();
            window.location.href = `/api/jobs/${data.jobId}/file`;
            setJobs((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
            return;
          }
          setJobs((prev) => ({
            ...prev,
            [key]: { status: payload.status, percent: payload.percent ?? 0 },
          }));
        };
        source.onerror = () => {
          source.close();
        };
      })
      .catch(() => {
        setJobs((prev) => ({
          ...prev,
          [key]: { status: "error", message: "Couldn't reach the server." },
        }));
      });
  }

  function downloadFormat(f: VideoTier) {
    // Gate resolves instantly if the interstitial was shown recently, so this
    // rarely fires a second ad right after the lookup gate.
    gate().then(() =>
      startJob(f.formatId, {
        url: url.trim(),
        mode: "video",
        formatId: f.formatId,
        hasAudio: f.hasAudio,
        title: result?.title ?? "download",
      }),
    );
  }

  function downloadAudio(option?: AudioOption) {
    const choice = option ?? result?.audio[0];
    gate().then(() =>
      startJob(choice ? choice.id : "__audio__", {
        url: url.trim(),
        mode: "audio",
        audioFormat: choice?.audioFormat ?? "mp3",
        bitrate: choice?.bitrate ?? null,
        title: result?.title ?? "download",
      }),
    );
  }

  // Wipes the box and everything under it so the next link starts clean.
  function clearAll() {
    for (const source of Object.values(sourcesRef.current)) source.close();
    sourcesRef.current = {};
    setUrl("");
    setResult(null);
    setPlaylist(null);
    setSelectedUrl(null);
    setJobs({});
    setError(null);
    setTab("video");
  }

  // Extension deep links with ?mp3=1 skip the extra click: the MP3 job starts
  // as soon as the lookup lands, unless the post turned out to be photos only.
  useEffect(() => {
    if (!mp3PrefRef.current || !result) return;
    if (result.audio.length === 0) return;
    mp3PrefRef.current = false;
    downloadAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div id="top" className="mx-auto max-w-2xl px-4">
      <form
        onSubmit={handleSubmit}
        className="glass-strong glass-sheen flex flex-col gap-3 rounded-2xl p-3 sm:flex-row"
      >
        <div className="relative min-w-0 flex-1">
          {/* Deliberately type="text": type="url" makes the browser reject a
              perfectly good address pasted without its https:// prefix, which
              is how most people copy links. checkUrl handles it instead. */}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder={placeholder}
            aria-label="Paste video URL"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "downloader-error" : undefined}
            className="w-full rounded-xl border border-black/10 bg-white/70 py-3 pl-4 pr-10 text-base outline-none focus:border-violet-500 sm:text-sm dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-neutral-400"
          />
          {url && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear the link"
              title="Clear"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M1.5 1.5 L10.5 10.5 M10.5 1.5 L1.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePaste}
            className="rounded-xl border border-black/10 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            Paste
          </button>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="flex-1 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                Looking up...
              </span>
            ) : (
              "Download"
            )}
          </button>
        </div>
      </form>

      {/* Announced to screen readers the moment it appears, since a failed
          lookup is otherwise silent for anyone not watching the page. */}
      {error && (
        <p
          id="downloader-error"
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {loading ? "Reading that link, please wait." : ""}
      </p>


      {playlist && (
        <div className="glass glass-hairline mt-6 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium text-neutral-900 dark:text-white">
                {playlist.title}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {playlist.entries.length} videos
                {playlist.truncated ? ` (showing the first ${playlist.entries.length})` : ""}{" "}
                · pick one to download
              </p>
            </div>
          </div>
          <ol className="max-h-80 divide-y divide-black/5 overflow-y-auto dark:divide-white/10">
            {playlist.entries.map((entry, i) => (
              <li key={entry.url}>
                <button
                  type="button"
                  onClick={() => lookupSingle(entry.url, true)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5 ${
                    selectedUrl === entry.url ? "bg-violet-50 dark:bg-violet-900/20" : ""
                  }`}
                >
                  <span className="w-5 shrink-0 text-xs text-neutral-400">{i + 1}</span>
                  <span className="line-clamp-1 flex-1 text-neutral-800 dark:text-neutral-200">
                    {entry.title}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatDuration(entry.duration)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result && (
        <div className="glass glass-hairline mt-6 overflow-hidden rounded-2xl">
          <div className="flex gap-4 p-4">
            {result.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.thumbnail}
                alt=""
                className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
              />
            )}
            <div className="min-w-0 flex-1">
              {(() => {
                const platform = detectPlatform(result.site);
                return (
                  <span
                    className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${platform.color} px-2.5 py-0.5 text-[11px] font-semibold text-white`}
                  >
                    {platform.name}
                  </span>
                );
              })()}
              <p className="line-clamp-2 font-medium text-neutral-900 dark:text-white">
                {result.title}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {[result.uploader, formatDuration(result.duration)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>


          {(result.video.length > 0 || result.audio.length > 0) && (
            <div className="flex gap-2 border-t border-black/5 px-4 pt-3 dark:border-white/10">
              {result.video.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab("video")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    tab === "video"
                      ? "bg-violet-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
                  }`}
                >
                  Video
                </button>
              )}
              {result.audio.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab("audio")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    tab === "audio"
                      ? "bg-violet-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
                  }`}
                >
                  Audio
                </button>
              )}
            </div>
          )}
          <div className="mt-3 divide-y divide-black/5 border-t border-black/5 dark:divide-white/10 dark:border-white/10">
            {tab === "video" &&
              result.video.map((f) => (
                <DownloadRow
                  key={f.formatId}
                  label={f.label}
                  note={f.ext.toUpperCase()}
                  size={formatBytes(f.filesize)}
                  job={jobs[f.formatId] ?? { status: "idle" }}
                  onClick={() => downloadFormat(f)}
                />
              ))}
            {tab === "audio" &&
              result.audio.map((a) => (
                <DownloadRow
                  key={a.id}
                  label={a.label}
                  note={a.audioFormat}
                  size=""
                  job={jobs[a.id] ?? { status: "idle" }}
                  onClick={() => downloadAudio(a)}
                />
              ))}
            {tab === "video" &&
              result.images.map((img) => (
                <DownloadRow
                  key={img.formatId}
                  label={img.label}
                  note=""
                  size={formatBytes(img.filesize)}
                  job={jobs[img.formatId] ?? { status: "idle" }}
                  onClick={() =>
                    downloadFormat({
                      formatId: img.formatId,
                      ext: img.ext,
                      label: img.label,
                      height: 0,
                      hasAudio: true,
                      filesize: img.filesize,
                    })
                  }
                />
              ))}
            {result.video.length === 0 &&
              result.audio.length === 0 &&
              result.images.length === 0 && (
                <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                  No downloadable formats were found for this link.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
