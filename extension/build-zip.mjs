// Packages the extension into public/pasteandsave-extension.zip.
//
// Written by hand because the tooling on this machine cannot produce a
// correct archive: Windows PowerShell's Compress-Archive, and the .NET
// Framework ZipFile API behind it, both write entry names with backslashes.
// The ZIP specification requires forward slashes, so a browser looking for
// "icons/icon16.png" never finds "icons\icon16.png" and the extension
// installs with no icons. There is no zip binary here and GNU tar does not
// write zip archives, so the format is assembled directly.
//
//   node extension/build-zip.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const srcDir = here;
const outFile = path.join(root, "public", "pasteandsave-extension.zip");

// The test harness is for this repository, not for someone installing the
// extension, so it stays out of the package.
const SKIP_DIRS = new Set(["test"]);
const SKIP_FILES = new Set(["build-zip.mjs"]);

function collect(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collect(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else {
      if (SKIP_FILES.has(entry.name)) continue;
      out.push({ name: `${prefix}${entry.name}`, full: path.join(dir, entry.name) });
    }
  }
  return out;
}

// DOS timestamp: seconds are stored in two-second units.
function dosTime(d) {
  return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
}
function dosDate(d) {
  return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
}

const files = collect(srcDir);
if (files.length === 0) {
  console.error("No files found to package.");
  process.exit(1);
}

const now = new Date();
const time = dosTime(now);
const date = dosDate(now);

const locals = [];
const central = [];
let offset = 0;

for (const file of files) {
  const data = fs.readFileSync(file.full);
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  // Storing is only used when compression would make the entry bigger.
  const useDeflate = compressed.length < data.length;
  const body = useDeflate ? compressed : data;
  const method = useDeflate ? 8 : 0;
  const crc = zlib.crc32(data);
  const nameBuf = Buffer.from(file.name, "utf8");

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 6); // flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28); // extra length
  locals.push(local, nameBuf, body);

  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4); // version made by
  dir.writeUInt16LE(20, 6); // version needed
  dir.writeUInt16LE(0, 8); // flags
  dir.writeUInt16LE(method, 10);
  dir.writeUInt16LE(time, 12);
  dir.writeUInt16LE(date, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(body.length, 20);
  dir.writeUInt32LE(data.length, 24);
  dir.writeUInt16LE(nameBuf.length, 28);
  dir.writeUInt16LE(0, 30); // extra
  dir.writeUInt16LE(0, 32); // comment
  dir.writeUInt16LE(0, 34); // disk number
  dir.writeUInt16LE(0, 36); // internal attrs
  dir.writeUInt32LE(0, 38); // external attrs
  dir.writeUInt32LE(offset, 42);
  central.push(dir, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4); // this disk
end.writeUInt16LE(0, 6); // disk with central directory
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20); // comment length

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, Buffer.concat([...locals, centralBuf, end]));

const size = fs.statSync(outFile).size;
console.log(`packaged ${files.length} files into ${path.relative(root, outFile)}`);
for (const f of files) console.log(`  ${f.name}`);
console.log(`${size} bytes (${(size / 1024).toFixed(1)} KB)`);
