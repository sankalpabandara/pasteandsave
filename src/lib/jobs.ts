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
import { pickProbeUrl, cdnAcceptsDirect } from "./cdn-probe";
import { recordProxyUsage } from "./proxy-budget";
import { takeInfo } from "./info-cache";

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

const JOB_TTL_MS = 15 * 60 * 1000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000;
// A ceiling on the metadata read alone. The whole-job timeout is ten minutes,
// which is far too long to sit on a proxy connection that has gone quiet: it
// spends the visitor's patience before falling back to something that works.
const EXTRACT_TIMEOUT_MS = 75 * 1000;

// The extracted metadata. Three places have to know this is not a downloaded
// file: the retry cleanup, the output picker, and the sweep.
const INFO_NAME = "info.json";

// Job folders are named with this prefix so orphans can be recognised later.
const TMP_PREFIX = "pasteandsave-";

// Removes job folders left behind by a previous run of the process.
//
// A finished job deletes its own folder, and a stalled one is swept by TTL,
// but both rely on the job map, which lives in memory. A restart, a crash or a
// deploy loses that map while the folders stay on disk, holding a part-written
// video each. Nothing ever came back for them, so on a server that restarts
// regularly they only accumulate, and at forty-odd megabytes a download that
// fills a disk quietly.
//
// Only folders older than the job TTL are touched. Anything younger could
// belong to a download running right now.
//
// Directories only, and that is not a detail. The deploy script keeps its
// flock at /tmp/pasteandsave-deploy.lock, which shares this prefix and is a
// file. Deleting it would not stop the deploy holding the lock, but the next
// one would create a new file, take the lock on a different inode, and run at
// the same time as the first, which is the exact thing that lock prevents.
// mkdtemp only ever makes directories, so requiring one separates our folders
// from anything else that happens to be named alike.
function sweepOrphanedTmpDirs() {
  const root = os.tmpdir();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  const cutoff = Date.now() - JOB_TTL_MS;
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(TMP_PREFIX)) continue;
    const dir = path.join(root, entry.name);
    try {
      if (fs.statSync(dir).mtimeMs > cutoff) continue;
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch {
      // Someone else's folder, or already gone. Neither is our problem.
    }
  }
  if (removed > 0) {
    console.log(`[jobs] cleared ${removed} temp folder(s) left by a previous run`);
  }
}

// Runs once when the module loads, which is once per server start.
sweepOrphanedTmpDirs();

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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TMP_PREFIX));
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
  // Where yt-dlp is told to get the video from. With a metadata file it reuses
  // the links already extracted instead of asking the site again, which is
  // what lets the media be fetched without the proxy that the extraction
  // needed.
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
  // One sticky proxy session for the whole job. proxyArgs mints a new session
  // on every call, and a link signed for one session's address is refused
  // from another's, so extraction and any proxied fetch must share one.
  const jobProxy = proxyArgs(opts.url);
  let triedProxyFallback = false;
  let triedPlainProxy = false;

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
  // cannot pick up a half-written file as its result.
  const clearTmp = async () => {
    try {
      for (const f of await fsp.readdir(tmpDir)) {
        // The metadata is what a retry reads its links from, and it cost
        // proxy data to fetch. Clearing it would both break the retry and
        // pay for it twice.
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

        // The lookup retries a blocked site through the residential proxy, so
        // the download has to do the same or it fails right after the formats
        // appeared. Partial files from the blocked attempt are cleared first.
        if (
          !triedProxyFallback &&
          proxyFlags.length === 0 &&
          proxyAvailable() &&
          worthProxyRetry(stderrTail) &&
          job.status !== "error"
        ) {
          triedProxyFallback = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(`[job ${id}] blocked direct, retrying via proxy host=${safeHost(opts.url)}`);
          await clearTmp();
          // The same session that extracted, when there is one.
          //
          // forceProxyArgs mints a fresh sticky session, which means a
          // different exit address. The links in the metadata were signed
          // against the address that fetched them, so retrying from a new one
          // is refused every time: the retry that exists to rescue a blocked
          // download was guaranteed to fail whenever it was needed most.
          const retryProxy = infoJson && jobProxy.length > 0 ? jobProxy : forceProxyArgs();
          if (infoJson) void recordProxyUsage(opts.mode);
          run(retryProxy, infoJson);
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
        // The metadata sits in this folder too and is not a download. Left
        // in, it is a candidate result, and the only thing keeping it from
        // being handed to a visitor is that "file.mp4" sorts before it.
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

  // Reads the page through the proxy and keeps the result.
  //
  // This is the only part of a download the proxy is actually needed for: the
  // platform's bot check looks at the page request, not at the CDN the media
  // comes from. It is about a megabyte against forty for the video.
  //
  // The timeout is the point. An earlier version of this spawned with no
  // deadline of its own, so a proxy connection that opened and then went
  // quiet held the job until the ten minute ceiling and the visitor was told
  // their download took too long. Every spawn here gets its own limit.
  const extractInfo = (): Promise<string | null> =>
    new Promise((resolve) => {
      const target = path.join(tmpDir, INFO_NAME);
      // Collected in memory and written once. Piping to a file and stat-ing it
      // on close is a race: end() returns before the data is flushed, the size
      // reads back as zero, and a perfectly good extraction looks like a
      // failure.
      const chunks: Buffer[] = [];
      let settled = false;
      const done = (value: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };

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

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        console.warn(`[job ${id}] metadata read timed out, falling back`);
        done(null);
      }, EXTRACT_TIMEOUT_MS);

      child.stdout.on("data", (c: Buffer) => chunks.push(c));
      child.stderr.on("data", (c: Buffer) => {
        stderrTail = (stderrTail + c.toString()).slice(-2000);
      });
      child.on("error", () => done(null));
      child.on("close", (code) => {
        if (code !== 0) return done(null);
        const body = Buffer.concat(chunks);
        if (body.length === 0) return done(null);
        try {
          fs.writeFileSync(target, body);
        } catch {
          return done(null);
        }
        // This is the part the proxy actually carried.
        void recordProxyUsage("metadata");
        done(target);
      });
    });

  if (jobProxy.length === 0) {
    // Nothing here goes through the proxy, so there is nothing to save.
    run([]);
    return id;
  }

  void (async () => {
    // The lookup that produced the quality list already extracted all of this,
    // seconds ago, through the same proxy. Re-asking would double the metered
    // cost of every download to answer a question already answered.
    let infoJson: string | null = null;
    const cached = takeInfo(opts.url);
    if (cached) {
      const target = path.join(tmpDir, INFO_NAME);
      try {
        fs.writeFileSync(target, cached);
        infoJson = target;
        console.log(`[job ${id}] reused the lookup's metadata, no second extraction`);
      } catch {
        // Could not stage it; fall through and extract as normal.
      }
    }
    if (!infoJson) infoJson = await extractInfo();
    if (job.status === "error") return finish();

    // Could not read the page. Fall back to the single-stage run, which is
    // what this did before any of this existed and is known to work.
    if (!infoJson) {
      stderrTail = "";
      // Everything goes over the proxy on this path, page and media both.
      void recordProxyUsage(opts.mode);
      return run(jobProxy);
    }

    // Ask the CDN whether it will serve this server directly. YouTube signs
    // its links against the address that requested them, so a link fetched
    // through the proxy is not always valid from here, and that varies by
    // player client. One byte settles it.
    let direct = false;
    try {
      const info = JSON.parse(fs.readFileSync(infoJson, "utf8"));
      const probe = pickProbeUrl(info, opts.mode === "video" ? opts.formatId : null);
      if (probe) direct = await cdnAcceptsDirect(probe);
    } catch {
      // Unreadable metadata means the safe answer, which is the proxy.
    }

    if (!direct) void recordProxyUsage(opts.mode);
    console.log(
      `[job ${id}] host=${safeHost(opts.url)} media=${direct ? "direct" : "proxied"}`,
    );
    run(direct ? [] : jobProxy, infoJson);
  })();

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
