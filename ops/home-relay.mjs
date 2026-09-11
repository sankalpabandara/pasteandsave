// A small HTTP proxy to run at home, so the server can borrow a residential
// address for the one platform that refuses a datacenter one.
//
// Why this exists: YouTube refuses the VPS outright ("Sign in to confirm you're
// not a bot") and accepts the same yt-dlp, same version, same player client from
// a home connection in about five seconds. Measured, repeatedly. The only
// variable is the address, so the fix is to give the server an address YouTube
// accepts rather than to keep looking for software that changes its mind.
//
// It is deliberately plain Node with no dependencies, and it listens on the
// loopback only. It never becomes reachable from the internet: the server gets
// to it through an SSH reverse tunnel, which also binds on the server's
// loopback, so the only thing that can use it is the app itself.
//
// Run at home:
//   node ops/home-relay.mjs
//   ssh -N -R 8081:127.0.0.1:8081 root@YOUR_SERVER
//
// Then on the server, in .env.local:
//   YTDLP_PROXY=http://127.0.0.1:8081
//
// The existing routing, budget and CDN-probe logic all key off YTDLP_PROXY, so
// nothing in the app changes. This is a drop-in replacement for the paid proxy.

import dns from "node:dns";
import net from "node:net";
import http from "node:http";

const PORT = Number(process.env.RELAY_PORT || 8081);
const HOST = "127.0.0.1";

// What this refuses, and why it is not a list of sites.
//
// It began as a YouTube-only host allowlist, and that broke a real visitor's
// Instagram download within the hour: Instagram is in the server's proxy host
// list, the last-resort retry sends any failing site through the proxy as well,
// and both arrived here to be answered with 403. A list of permitted sites must
// be kept in step with the server's routing or it silently breaks downloads, and
// it was never the thing worth protecting against anyway.
//
// The real risk is different. This proxy runs inside a home network, so whatever
// can reach it could otherwise reach the router, a NAS, a printer, anything on
// the LAN. That is what is refused: destinations resolving to a private,
// loopback, link-local or carrier-NAT address, whatever hostname was used to ask
// for them. Public destinations are allowed, which is what makes this a working
// substitute for the paid proxy rather than a narrower one.
//
// Ports are limited to plain web traffic, and the reverse tunnel binds the
// server's loopback, so this is not reachable from the internet either.
const ALLOWED_PORTS = new Set([80, 443]);

function isPrivateAddress(ip) {
  const plain = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(plain);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (/^f[cd]/.test(v6)) return true;
  if (/^fe[89ab]/.test(v6)) return true;
  if (/^ff/.test(v6)) return true;
  return false;
}

/** The first address a name resolves to, so the destination can be judged. */
function resolveFirst(host) {
  return new Promise((resolve) => {
    dns.lookup(host, { all: false, verbatim: true }, (err, address) =>
      resolve(err ? null : address),
    );
  });
}

let active = 0;
let served = 0;
let refused = 0;
// Bytes crossing the home connection, which is the whole reason to watch this.
// Metadata is small; media is not. If media ever starts coming through here
// instead of straight from the CDN to the server, this is where it shows up,
// and the difference is roughly 159 KB against 40 MB per download.
let bytesUp = 0;
let bytesDown = 0;
const mb = (n) => (n / 1048576).toFixed(2);

function logLine(msg) {
  process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${msg}\n`);
}

const server = http.createServer((req, res) => {
  // Plain HTTP through a proxy is rare here; almost everything is CONNECT.
  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("This relay handles CONNECT only.\n");
});

// HTTPS arrives as CONNECT host:port, then raw bytes are piped both ways.
server.on("connect", async (req, clientSocket, head) => {
  const [rawHost, rawPort] = String(req.url || "").split(":");
  const host = (rawHost || "").toLowerCase();
  const port = Number(rawPort || 443);

  const deny = (why) => {
    refused++;
    logLine(`refused ${host}:${rawPort} (${why})`);
    clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    clientSocket.destroy();
  };

  if (!host || !ALLOWED_PORTS.has(port)) {
    deny("port not allowed");
    return;
  }

  const addr = await resolveFirst(host);
  if (!addr) {
    deny("does not resolve");
    return;
  }
  if (isPrivateAddress(addr)) {
    deny(`resolves to private address ${addr}`);
    return;
  }
  // The client may have given up while we were resolving.
  if (clientSocket.destroyed) return;

  const upstream = net.connect(port, host, () => {
    active++;
    served++;
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length) upstream.write(head);
    upstream.on("data", (c) => {
      bytesDown += c.length;
    });
    clientSocket.on("data", (c) => {
      bytesUp += c.length;
    });
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });

  // A dead peer on either side must tear down the other, or sockets accumulate
  // until the process runs out of handles.
  const close = () => {
    if (!upstream.destroyed) upstream.destroy();
    if (!clientSocket.destroyed) clientSocket.destroy();
  };
  let counted = false;
  const done = () => {
    if (counted) return;
    counted = true;
    active = Math.max(0, active - 1);
  };
  upstream.on("error", close);
  clientSocket.on("error", close);
  upstream.on("close", () => {
    done();
    close();
  });
  clientSocket.on("close", () => {
    done();
    close();
  });
  // Nothing here should be long-lived: metadata is small and media goes
  // straight from the CDN to the server, never through this.
  upstream.setTimeout(120_000, close);
  clientSocket.setTimeout(120_000, close);
});

server.listen(PORT, HOST, () => {
  logLine(`relay listening on ${HOST}:${PORT}`);
  logLine(`public destinations on ports 80/443 only; private and LAN addresses refused`);
  logLine(`expose it with: ssh -N -R ${PORT}:127.0.0.1:${PORT} root@YOUR_SERVER`);
});

function stats() {
  return `served=${served} refused=${refused} active=${active} down=${mb(bytesDown)}MB up=${mb(bytesUp)}MB`;
}

setInterval(() => {
  if (served || refused) logLine(stats());
}, 60_000).unref();

// So a number can be read on demand rather than waited for.
process.on("SIGINT", () => {
  logLine(`final ${stats()}`);
  process.exit(0);
});
