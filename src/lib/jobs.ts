import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  EXTRACTOR_ARGS,
  FFMPEG_DIR,
  YTDLP_PATH,
  networkArgs,
  siteArgs,
  proxyArgs,
  classifyFailure,
  proxyAvailable,
  forceProxyArgs,
  worthProxyRetry,
  plainProxyArgs,
  looksLikeProxyAuthFailure,
} from "./ytdlp";
import { BusyError, jobLimiter } from "./concurrency";
import { recordProxyBytes, proxyBudgetLeft } from "./proxy-usage";

export type JobStatus =
  | "starting"
  | "downloading"
  | "converting"
  | "done"
  | "error";

export type Job = {
  id: string;
  status: JobStatus;
  percent: number;
  error?: string;
  tmpDir: string;
  filePath?: string;
  filename?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();

// The extracted metadata, kept in the job's own directory so it is cleaned up
// with everything else. Named here because three separate places have to know
// not to treat it as a downloaded file.
const INFO_NAME = "info.json";

const JOB_TTL_MS = 15 * 60 * 1000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

function sweepStaleJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      cleanupJob(id);
    }
  }
}

function cleanupJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  fsp.rm(job.tmpDir, { recursive: true, force: true }).catch(() => {});
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function claimJobFile(id: string): Job | undefined {
  const job = jobs.get(id);
  if (!job || job.status !== "done") return undefined;
  return job;
}

export function finalizeJob(id: string) {
  cleanupJob(id);
}

type StartJobOptions =
  | { mode: "video"; url: string; formatId: string; title: string; hasAudio?: boolean }
  | {
      mode: "audio";
      url: string;
      title: string;
      audioFormat?: "mp3" | "m4a";
      bitrate?: number | null;
    };

export function startJob(opts: StartJobOptions): string {
  sweepStaleJobs();

  // A download holds its slot for its whole duration, so reject rather than
  // queue when the server is already at capacity.
  const release = jobLimiter.tryAcquire();
  if (!release) {
    throw new BusyError();
  }
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    release();
  };

  const id = randomUUID();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pasteandsave-"));
  const job: Job = {
    id,
    status: "starting",
    percent: 0,
    tmpDir,
    createdAt: Date.now(),
  };
  jobs.set(id, job);

  const outputTemplate = path.join(tmpDir, "file.%(ext)s");
  // The same YouTube hardening the lookup uses: without matching player
  // clients and proxy/retry flags, a download can fail even after the info
  // lookup succeeded.
  const hardeningWith = (proxyFlags: string[]) => [
    ...EXTRACTOR_ARGS,
    ...networkArgs(),
    ...siteArgs(opts.url),
    ...proxyFlags,
  ];
  // A video-only stream (YouTube serves HD only as separate video + audio)
  // gets the best audio muxed in, so the saved file always has sound. Prefer
  // m4a audio so an MP4 pick stays a clean, widely-playable MP4; fall back to
  // any audio, then to the bare stream if the site has no separate audio.
  // Formats that already carry audio are downloaded as-is (no double track).
  const videoFormat =
    opts.mode === "video" && opts.hasAudio === false
      ? `${opts.formatId}+bestaudio[ext=m4a]/${opts.formatId}+bestaudio/${opts.formatId}`
      : opts.mode === "video"
        ? opts.formatId
        : "";
  const mergeArgs =
    opts.mode === "video" && opts.hasAudio === false
      ? ["--merge-output-format", "mp4"]
      : [];
  // M4A is taken as-is where possible (no re-encode, so no quality lost);
  // MP3 is encoded at the rate the visitor picked, defaulting to best.
  const audioFormat = opts.mode === "audio" ? (opts.audioFormat ?? "mp3") : "mp3";
  const audioQuality =
    opts.mode === "audio" && opts.bitrate ? `${opts.bitrate}K` : "0";
  // Where yt-dlp gets the video from: either the page (which means extracting
  // it again) or a metadata file already extracted. The second form is what
  // keeps the media off the metered proxy — see runProxied below.
  const sourceArgs = (infoJson: string | null) =>
    infoJson ? ["--load-info-json", infoJson] : ["--", opts.url];

  const buildArgs = (proxyFlags: string[], infoJson: string | null = null) =>
    opts.mode === "audio"
      ? [
          "-x",
          "--audio-format",
          audioFormat,
          "--audio-quality",
          audioQuality,
          "--newline",
          "--no-playlist",
          "--no-warnings",
          "--ffmpeg-location",
          FFMPEG_DIR,
          ...hardeningWith(proxyFlags),
          "-o",
          outputTemplate,
          ...sourceArgs(infoJson),
        ]
      : [
          "-f",
          videoFormat,
          ...mergeArgs,
          "--newline",
          "--no-playlist",
          "--no-warnings",
          "--ffmpeg-location",
          FFMPEG_DIR,
          ...hardeningWith(proxyFlags),
          "-o",
          outputTemplate,
          ...sourceArgs(infoJson),
        ];

  let current: ReturnType<typeof spawn> | null = null;
  let stderrTail = "";
  let triedProxyFallback = false;
  let triedPlainProxy = false;
  let triedProxyForMedia = false;

  // A single proxy session for the whole job. Generated once on purpose:
  // every call to proxyArgs mints a new sticky session, and a stream link
  // signed for one session's address is refused from another's, so extracting
  // and any later proxied fetch have to share the one address.
  const jobProxy = proxyArgs(opts.url);

  // One deadline for the whole job, retry included, so a download can never
  // hold its slot indefinitely.
  const killTimer = setTimeout(() => {
    job.status = "error";
    job.error = "That took too long and was stopped. Please try again.";
    current?.kill("SIGKILL");
  }, JOB_TIMEOUT_MS);

  const finish = () => {
    clearTimeout(killTimer);
    releaseOnce();
  };

  // Drop whatever the failed attempt wrote so the retry starts clean and
  // cannot pick up a half-written file as its result. The metadata is kept:
  // it is what the retry reads its stream links from, and it cost proxy data
  // to fetch, so deleting it would both break the retry and make it pay twice.
  const clearTmp = async () => {
    try {
      for (const f of await fsp.readdir(tmpDir)) {
        if (f === INFO_NAME) continue;
        await fsp.rm(path.join(tmpDir, f), { force: true, recursive: true });
      }
    } catch {
      // nothing written yet
    }
  };

  const handleLine = (line: string) => {
    const dl = line.match(/\[download\]\s+([\d.]+)%/);
    if (dl) {
      job.status = "downloading";
      job.percent = Math.min(99, parseFloat(dl[1]));
      return;
    }
    if (line.includes("[ExtractAudio]") || line.includes("[Merger]") || line.includes("[VideoConvertor]")) {
      job.status = "converting";
      job.percent = 99;
    }
  };

  const run = (proxyFlags: string[], infoJson: string | null = null) => {
    const child = spawn(YTDLP_PATH, buildArgs(proxyFlags, infoJson), { windowsHide: true });
    current = child;

    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) handleLine(line);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-2000);
    });

    child.on("error", (err) => {
      // err.message carries the binary path, so it is logged, not shown.
      console.error(`[job ${id}] spawn failed: ${err.message}`);
      job.status = "error";
      job.error = "Something went wrong on our side. Please try again.";
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      finish();
    });

    child.on("close", async (code) => {
      if (code !== 0) {
        // A rejected proxy login means the sticky session suffix was not
        // understood by the provider, not that the site refused us.
        if (
          !triedPlainProxy &&
          proxyFlags.length > 0 &&
          looksLikeProxyAuthFailure(stderrTail) &&
          job.status !== "error"
        ) {
          triedPlainProxy = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(`[job ${id}] proxy rejected the sticky session, retrying plain`);
          await clearTmp();
          run(plainProxyArgs(), infoJson);
          return;
        }

        // The media was fetched straight from the CDN to keep it off the
        // metered proxy, and the CDN refused. YouTube signs its stream links
        // against the address that asked for them, so a link obtained through
        // the proxy is not always valid from the server's own address. Only
        // then is the file worth pulling through the proxy, on the same
        // session that extracted it so the address matches.
        if (
          infoJson &&
          proxyFlags.length === 0 &&
          !triedProxyForMedia &&
          jobProxy.length > 0 &&
          proxyBudgetLeft().allowed &&
          job.status !== "error"
        ) {
          triedProxyForMedia = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(
            `[job ${id}] CDN refused the direct fetch, paying for the proxy host=${safeHost(opts.url)}`,
          );
          await clearTmp();
          run(jobProxy, infoJson);
          return;
        }

        // The lookup retries a blocked site through the residential proxy, so
        // the download has to do the same or it fails right after the formats
        // appeared. Partial files from the blocked attempt are cleared first.
        if (
          !triedProxyFallback &&
          proxyFlags.length === 0 &&
          !infoJson &&
          proxyAvailable() &&
          proxyBudgetLeft().allowed &&
          worthProxyRetry(stderrTail) &&
          job.status !== "error"
        ) {
          triedProxyFallback = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(`[job ${id}] blocked direct, retrying via proxy host=${safeHost(opts.url)}`);
          await clearTmp();
          run(forceProxyArgs(), infoJson);
          return;
        }

        // Never forward stderr: yt-dlp puts the full proxy URL (credentials
        // and all) in connection errors and temp paths in write errors, and
        // this string is sent straight to the browser over SSE.
        const { category, message } = classifyFailure(stderrTail);
        console.error(
          `[job ${id}] failed category=${category} exit=${code} url_host=${safeHost(opts.url)} proxied=${proxyFlags.length > 0}`,
        );
        if (job.status !== "error") {
          job.status = "error";
          job.error = message;
        }
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        finish();
        return;
      }

      try {
        // The metadata file lives here too and is not a result. Without this
        // it is a candidate output, and the only thing keeping it from being
        // served to a visitor is that "file.mp4" happens to sort before
        // "info.json".
        const files = (await fsp.readdir(tmpDir)).filter(
          (f) => !f.endsWith(".part") && !f.endsWith(".ytdl") && f !== INFO_NAME,
        );
        if (files.length === 0) {
          console.error(`[job ${id}] no output file url_host=${safeHost(opts.url)}`);
          job.status = "error";
          job.error = "The file couldn't be prepared. Please try another quality.";
          fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          finish();
          return;
        }
        const filePath = path.join(tmpDir, files[0]);
        // Media that really did travel over the proxy is charged at its actual
        // size. This is the expensive path, and it is the one that has to show
        // up in the ledger for the totals to mean anything.
        if (proxyFlags.length > 0) {
          try {
            recordProxyBytes("media", (await fsp.stat(filePath)).size);
          } catch {
            // A missing size must not fail a finished download.
          }
        }
        const ext = path.extname(files[0]);
        job.filePath = filePath;
        job.filename = `${sanitizeFilename(opts.title)}${ext}`;
        job.percent = 100;
        job.status = "done";
      } catch {
        job.status = "error";
        job.error = "The file couldn't be prepared. Please try another quality.";
      }
      finish();
    });
  };

  // Pulls just the metadata through the proxy: a hundred kilobytes or so of
  // JSON that already contains the direct CDN links for every format. This is
  // the only part of a download that the platform's bot check actually looks
  // at, so it is the only part worth paying residential rates for.
  const extractInfo = (): Promise<string | null> =>
    new Promise((resolve) => {
      const target = path.join(tmpDir, INFO_NAME);
      // Collected in memory and written in one go. Piping to a write stream
      // and stat-ing the file on the process's close event is a race: end()
      // returns before the data is flushed, so the size reads back as zero,
      // extraction looks like it failed, and the job silently falls back to
      // dragging the whole video through the proxy — the exact thing this is
      // here to avoid. The metadata is a megabyte at most, so holding it is
      // cheaper than getting the flush wrong.
      const chunks: Buffer[] = [];
      const child = spawn(
        YTDLP_PATH,
        [
          "--dump-single-json",
          "--no-playlist",
          "--no-warnings",
          ...EXTRACTOR_ARGS,
          ...networkArgs(),
          ...siteArgs(opts.url),
          ...jobProxy,
          "--",
          opts.url,
        ],
        { windowsHide: true },
      );
      current = child;
      child.stdout.on("data", (c: Buffer) => chunks.push(c));
      child.stderr.on("data", (c: Buffer) => {
        stderrTail = (stderrTail + c.toString()).slice(-2000);
      });
      child.on("error", () => resolve(null));
      child.on("close", (code) => {
        if (code !== 0) return resolve(null);
        const body = Buffer.concat(chunks);
        if (body.length === 0) return resolve(null);
        try {
          fs.writeFileSync(target, body);
        } catch {
          return resolve(null);
        }
        // The metadata is the one thing that genuinely crossed the proxy, so
        // it is the one thing charged against the day's allowance.
        recordProxyBytes("metadata", body.length);
        resolve(target);
      });
    });

  if (jobProxy.length > 0) {
    // A proxied site. Extract through the proxy, then take the media straight
    // from the CDN, which does not bot-check the way the page does. This is
    // what turns a 300 MB download into 100 KB of metered traffic.
    void extractInfo().then((infoJson) => {
      if (job.status === "error") return finish();
      if (!infoJson) {
        // Extraction failed outright. Fall back to the old single-stage run so
        // a metadata problem cannot take downloads down with it.
        stderrTail = "";
        return run(jobProxy);
      }
      run([], infoJson);
    });
  } else {
    run([]);
  }

  return id;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120) || "download";
}

// Logs identify a job by the site it targeted, never the full URL, which can
// carry tokens or identifiers in its query string.
function safeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "unknown";
  }
}
