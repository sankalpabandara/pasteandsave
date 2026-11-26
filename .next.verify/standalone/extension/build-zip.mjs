// Packages the extension into public/pasteandsave-extension.zip, the copy
// offered on pasteandsave.com/extension. It holds both manifests; the
// install steps there say which one Firefox needs.
//
//   node extension/build-zip.mjs

import path from "node:path";
import { extensionFiles, repoRoot, writePackage } from "./zip.mjs";

const files = extensionFiles();
if (files.length === 0) {
  console.error("No files found to package.");
  process.exit(1);
}
writePackage(files, path.join(repoRoot, "public", "pasteandsave-extension.zip"));
