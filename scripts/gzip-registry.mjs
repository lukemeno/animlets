#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "animlets-gzip-"));
let failed = false;

for (const item of registry.items) {
  const sourcePath = path.join(root, item.files[0].path);
  const source = fs.readFileSync(sourcePath);
  const out = path.join(tmp, `${item.name}.js`);
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "esbuild",
      sourcePath,
      "--bundle",
      "--minify",
      "--format=esm",
      "--jsx=automatic",
      "--packages=external",
      `--outfile=${out}`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "");
    failed = true;
    continue;
  }
  const js = fs.readFileSync(out);
  if (!js.includes("data-fade-in")) {
    console.error(`${item.name} bundle is missing data-fade-in, so the component body was not emitted`);
    failed = true;
    continue;
  }
  const gzip = gzipSync(js, { level: 9 });
  console.log(
    [
      item.name,
      `gzip ${gzip.length}`,
      `min ${js.length}`,
      `source ${source.length}`,
      "esbuild minify esm packages external gzip -9",
    ].join("\t"),
  );
}

fs.rmSync(tmp, { recursive: true, force: true });
if (failed) process.exit(1);
