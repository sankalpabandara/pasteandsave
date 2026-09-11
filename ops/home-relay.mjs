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

import net from "node:net";
import http from "node:http";

const PORT = Number(process.env.RELAY_PORT || 8081);
const HOST = "127.0.0.1";

// Only what a video lookup actually needs. An open CONNECT proxy will be found
// and abused the moment it is reachable, and while the tunnel keeps this off the
// internet, a whitelist means a mistake in the tunnel is not also a mistake here.
const ALLOWED = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)youtube-nocookie\.com$/i,
  /(^|\.)googlevideo\.com$/i,
  /(^|\.)ytimg\.com$/i,
  /(^|\.)google\.com$/i,
];

const allowed = (host) => ALLOWED.some((re) => re.test(host));

let active = 0;
let served = 0;
let refused = 0;

function logLine(msg) {
  process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${msg}\n`);
}

const server = http.createServer((req, res) => {
  // Plain HTTP through a proxy is rare here; almost everything is CONNECT.
  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("This relay handles CONNECT only.\n");
});

// HTTPS arrives as CONNECT host:port, then raw bytes are piped both ways.
server.on("connect", (req, clientSocket, head) => {
  const [rawHost, rawPort] = String(req.url || "").split(":");
  const host = (rawHost || "").toLowerCase();
  const port = Number(rawPort || 443);

  if (!host || !allowed(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    refused++;
    logLine(`refused ${host}:${rawPort}`);
    clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    clientSocket.destroy();
    return;
  }

  const upstream = net.connect(port, host, () => {
    active++;
    served++;
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length) upstream.write(head);
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
  logLine(`allowed: youtube.com, youtu.be, googlevideo.com and friends only`);
  logLine(`expose it with: ssh -N -R ${PORT}:127.0.0.1:${PORT} root@YOUR_SERVER`);
});

setInterval(() => {
  if (served || refused) logLine(`served=${served} refused=${refused} active=${active}`);
}, 300_000).unref();
