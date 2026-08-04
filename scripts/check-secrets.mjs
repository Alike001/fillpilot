import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const ignoredFiles = new Set(["pnpm-lock.yaml", "scripts/check-secrets.mjs"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const patterns = [
  ["KeeperHub organization key", new RegExp("kh" + "_[A-Za-z0-9_-]{20,}", "g")],
  [
    "private key assignment",
    /(?:PRIVATE_KEY|WALLET_PRIVATE_KEY)\s*=\s*(?!$|example|replace)[^\s#]+/gi,
  ],
  ["PEM private key", new RegExp("BEGIN " + "(?:RSA |EC )?PRIVATE KEY", "g")],
  ["OAuth bearer token", new RegExp("Bearer " + "[A-Za-z0-9._~-]{30,}", "g")],
];

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (
      textExtensions.has(extname(entry.name)) ||
      entry.name.startsWith(".env")
    )
      files.push(path);
  }
  return files;
}

const findings = [];
for (const file of await collect(root)) {
  const name = relative(root, file);
  if (ignoredFiles.has(name)) continue;
  const contents = await readFile(file, "utf8");
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(contents)) findings.push(`${name}: ${label}`);
  }
}

if (findings.length > 0) {
  console.error(["Potential secrets found:", ...findings].join("\n"));
  process.exitCode = 1;
} else {
  console.info("Secret scan passed.");
}
