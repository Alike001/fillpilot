import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = ["scripts", "src", "tests"];
const extensions = new Set([".css", ".js", ".mjs", ".ts", ".tsx"]);
const warnings = [];
const failures = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(path);
      continue;
    }
    if (!extensions.has(extname(entry.name))) continue;
    const lines = (await readFile(path, "utf8")).split("\n").length;
    const result = `${relative(root, path)}: ${lines} lines`;
    if (lines > 300) failures.push(result);
    else if (lines > 200) warnings.push(result);
  }
}

for (const directory of sourceRoots) await inspect(join(root, directory));
if (warnings.length > 0)
  console.warn(["Files above the 200-line target:", ...warnings].join("\n"));
if (failures.length > 0) {
  console.error(["Files above the 300-line hard cap:", ...failures].join("\n"));
  process.exitCode = 1;
} else {
  console.info("File-size check passed.");
}
