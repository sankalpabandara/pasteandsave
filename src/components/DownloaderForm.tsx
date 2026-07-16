"use client";

import { useRef, useState, type FormEvent } from "react";
import { detectPlatform } from "@/lib/platforms";
import { useAdGate } from "@/components/ads/AdProvider";

type FormatOption = {
  formatId: string;
  ext: string;
  label: string;
  hasAudio: boolean;
  hasVideo: boolean;
  isImage: boolean;
  filesize: number | null;
};

type InfoResult = {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  site: string | null;
  formats: FormatOption[];
};

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

export default function DownloaderForm({
  placeholder = "Paste your video link here",
}: {
  placeholder?: string;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfoResult | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const sourcesRef = useRef<Record<string, EventSource>>({});
  const { gate } = useAdGate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setJobs({});
    // Kick off the lookup and show the ad gate at the same time, so the ad
    // overlaps the existing wait instead of adding delay.
    const infoPromise = fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    try {
      await gate();
      const res = await infoPromise;
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // clipboard permission denied — ignore, user can paste manually
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

  function downloadFormat(f: FormatOption) {
    // Gate resolves instantly if the interstitial was shown recently, so this
    // rarely fires a second ad right after the lookup gate.
    gate().then(() =>
      startJob(f.formatId, {
        url: url.trim(),
        mode: "video",
        formatId: f.formatId,
        title: result?.title ?? "download",
      }),
    );
  }

  function downloadAudio() {
    gate().then(() =>
      startJob("__audio__", {
        url: url.trim(),
        mode: "audio",
        title: result?.title ?? "download",
      }),
    );
  }

  return (
    <div id="top" className="mx-auto max-w-2xl px-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-lg shadow-violet-900/5 sm:flex-row dark:border-white/10 dark:bg-neutral-900"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          inputMode="url"
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-base outline-none focus:border-violet-500 sm:text-sm dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-500"
        />
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
            className="flex-1 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:flex-none"
          >
            {loading ? "Looking up..." : "Download"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
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
              {/* Hide the MP3 button for photo-only posts, which have no audio. */}
              {!(result.formats.length > 0 && result.formats.every((f) => f.isImage)) && (
                <>
                  <button
                    type="button"
                    onClick={downloadAudio}
                    disabled={
                      jobs.__audio__ &&
                      jobs.__audio__.status !== "error"
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {jobs.__audio__ && jobs.__audio__.status !== "error"
                      ? statusLabel(jobs.__audio__)
                      : "Save as MP3"}
                  </button>
                  {jobs.__audio__?.status === "error" && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {jobs.__audio__.message}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="divide-y divide-black/5 border-t border-black/5 dark:divide-white/10 dark:border-white/10">
            {result.formats.map((f) => {
              const job = jobs[f.formatId] ?? { status: "idle" as const };
              const active = job.status !== "idle" && job.status !== "error";
              return (
                <div key={f.formatId} className="relative">
                  {active && "percent" in job && (
                    <div
                      className="absolute inset-y-0 left-0 bg-violet-50 transition-all dark:bg-violet-900/30"
                      style={{ width: `${job.percent}%` }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => downloadFormat(f)}
                    disabled={active}
                    className="relative flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-neutral-50 disabled:hover:bg-transparent dark:hover:bg-white/5"
                  >
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {f.label}
                      {!f.hasAudio && f.hasVideo && (
                        <span className="ml-2 text-xs font-normal text-neutral-400 dark:text-neutral-500">
                          no audio
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
                          {formatBytes(f.filesize)}
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
            })}
            {result.formats.length === 0 && (
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
