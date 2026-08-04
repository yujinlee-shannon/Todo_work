import { readFile, writeFile } from "node:fs/promises";

if (process.platform !== "win32") process.exit(0);

const target = new URL("../node_modules/vinext/dist/server/static-file-cache.js", import.meta.url);
const original = 'relativePath: path.relative(base, batch[j]),';
const patched = 'relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),';
const source = await readFile(target, "utf8");

if (source.includes(patched)) process.exit(0);
if (!source.includes(original)) {
  throw new Error("Unable to apply the vinext Windows asset-path fix.");
}

await writeFile(target, source.replace(original, patched), "utf8");
console.log("Applied the vinext Windows preview asset fix.");

