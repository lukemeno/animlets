#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCESSIBILITY_MIN,
  BEST_PRACTICES_MIN,
  CREATE_NEXT_APP_ARGS,
  REDUCED_MOTION_CHECK,
  REDUCED_SAMPLE_COUNT,
  REDUCED_SAMPLE_GAP_MS,
  REDUCED_SAMPLE_START_MS,
  SHADCN_INIT_ARGS,
  VIDEO_MS,
  aliasTargetToImport,
  demoPagePath,
  diskPathForImport,
  findRepoRoot,
  formatSummary,
  helpText,
  makeRunId,
  assertRegistryItem,
  importSpecForFile,
  judgeMotionPlayed,
  judgeReducedMotion,
  lighthouseScores,
  overallPass,
  parseArgs,
  requiredChecks,
  parseComponentExports,
  pickRender,
  probeDemo,
  renderDemoPage,
  safeItemName,
  scoreCheck,
  stableStringify,
  walkFiles,
} from "./lib.mjs";
import { auditInstalledDemo } from "./audit-page.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMP_ROOT = "/tmp/verify-motion";

let active = null;
let cleaned = false;

function npmViewVersion(name) {
  try {
    return execFileSync("npm", ["view", `${name}@latest`, "version"], {
      encoding: "utf8",
      timeout: 30000,
    }).trim();
  } catch {
    return "unknown";
  }
}

function readPackageVersion(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function which(command) {
  try {
    return execFileSync("which", [command], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function tail(text) {
  return text.trim().split("\n").slice(-40).join("\n");
}

let runSeq = 0;

function runIdNow() {
  runSeq += 1;
  return makeRunId(new Date(), process.pid, runSeq);
}

function appendLog(logPath, text) {
  fs.appendFileSync(logPath, text.endsWith("\n") ? text : `${text}\n`);
}

function runCommand(command, args, { cwd, timeoutMs, logPath, env = {} }) {
  const line = `$ ${command} ${args.join(" ")}`;
  appendLog(logPath, line);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        CI: "1",
        NEXT_TELEMETRY_DISABLED: "1",
        npm_config_fund: "false",
        npm_config_update_notifier: "false",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const take = (chunk) => {
      const text = chunk.toString();
      output += text;
      fs.appendFileSync(logPath, text);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs} milliseconds\n${tail(output)}`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(output);
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${tail(output)}`));
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function signalPid(pid, signal) {
  if (!pid) return false;
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }
}

async function stopPid(pid) {
  if (!signalPid(pid, "SIGTERM")) return;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  signalPid(pid, "SIGKILL");
}

async function cleanupRun(state) {
  if (!state || cleaned) return;
  cleaned = true;
  await stopPid(state.serverPid);
  if (state.tempDir && fs.existsSync(state.tempDir)) {
    fs.rmSync(state.tempDir, { recursive: true, force: true });
  }
}

async function cleanLeftovers() {
  if (!fs.existsSync(TEMP_ROOT)) {
    console.log("nothing to clean");
    return;
  }
  const stops = [];
  for (const entry of fs.readdirSync(TEMP_ROOT)) {
    const pidFile = path.join(TEMP_ROOT, entry, "server.pid");
    if (!fs.existsSync(pidFile)) continue;
    const pid = Number(fs.readFileSync(pidFile, "utf8"));
    stops.push(stopPid(pid));
  }
  await Promise.all(stops);
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  console.log(`removed ${TEMP_ROOT}`);
}

async function doctor(repoRoot) {
  const problems = [];
  const notes = [`node ${process.version}`, `repo ${repoRoot}`];
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) problems.push(`node ${process.version} is below 20`);
  const registryPath = path.join(repoRoot, "registry.json");
  if (!fs.existsSync(registryPath)) problems.push("registry.json is missing");
  else {
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    if (!registry.name || !registry.homepage || !Array.isArray(registry.items)) {
      problems.push("registry.json needs name, homepage, and items");
    } else notes.push(`registry ${registry.name} with ${registry.items.length} items`);
  }
  const chrome = which("google-chrome");
  if (!chrome) problems.push("google-chrome is not on PATH");
  else notes.push(`chrome ${chrome}`);
  if (!which("ffmpeg") || !which("ffprobe")) problems.push("ffmpeg and ffprobe are required");
  const playwrightPkg = path.join(SCRIPT_DIR, "node_modules", "playwright", "package.json");
  if (!fs.existsSync(playwrightPkg)) {
    problems.push(
      "playwright is not installed. Run npm install in .cursor/skills/verify-motion/scripts",
    );
  } else {
    const { chromium } = await import("playwright");
    const executable = chromium.executablePath();
    if (!fs.existsSync(executable)) {
      problems.push(
        `chromium is not installed at ${executable}. Run npx playwright install chromium in .cursor/skills/verify-motion/scripts`,
      );
    } else notes.push(`chromium ${executable}`);
  }
  for (const note of notes) console.log(note);
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    return 1;
  }
  console.log("doctor passed");
  return 0;
}

async function ensureTools(state) {
  const playwrightDir = path.join(SCRIPT_DIR, "node_modules", "playwright");
  if (!fs.existsSync(playwrightDir)) {
    await runCommand("npm", ["install"], {
      cwd: SCRIPT_DIR,
      timeoutMs: 180000,
      logPath: state.logPath,
    });
  }
  const { chromium } = await import("playwright");
  let executable = chromium.executablePath();
  if (!fs.existsSync(executable)) {
    await runCommand("npx", ["--yes", "playwright", "install", "chromium"], {
      cwd: SCRIPT_DIR,
      timeoutMs: 300000,
      logPath: state.logPath,
    });
    executable = chromium.executablePath();
  }
  if (!fs.existsSync(executable)) throw new Error(`playwright chromium missing at ${executable}`);
  const chrome = which("google-chrome");
  if (!chrome) throw new Error("google-chrome is not on PATH");
  if (!which("ffmpeg") || !which("ffprobe")) throw new Error("ffmpeg and ffprobe are required");
  state.chromePath = chrome;
}

function readItem(file) {
  return assertRegistryItem(JSON.parse(fs.readFileSync(file, "utf8")), file);
}

async function resolveTarget(state, target) {
  if (target.kind === "name") {
    const registry = JSON.parse(fs.readFileSync(path.join(state.repoRoot, "registry.json"), "utf8"));
    const source = (registry.items ?? []).find((item) => item.name === target.name);
    if (!source) throw new Error(`registry.json has no item named ${target.name}`);
    fs.mkdirSync(state.buildDir, { recursive: true });
    await runCommand(
      "npx",
      ["--yes", "shadcn@latest", "build", "registry.json", "--output", state.buildDir],
      { cwd: state.repoRoot, timeoutMs: 180000, logPath: state.logPath },
    );
    const builtPath = path.join(state.buildDir, `${target.name}.json`);
    if (!fs.existsSync(builtPath)) throw new Error(`shadcn build did not write ${builtPath}`);
    const committed = path.join(state.repoRoot, "public", "r", `${target.name}.json`);
    if (!fs.existsSync(committed)) {
      throw new Error(`missing ${committed}. Run npx shadcn@latest build and commit public/r`);
    }
    const fresh = assertRegistryItem(JSON.parse(fs.readFileSync(builtPath, "utf8")), builtPath);
    const stored = assertRegistryItem(JSON.parse(fs.readFileSync(committed, "utf8")), committed);
    if (stableStringify(fresh) !== stableStringify(stored)) {
      throw new Error(
        `public/r/${target.name}.json does not match shadcn build. Rebuild and commit public/r`,
      );
    }
    state.checks.push({
      id: "registry-build",
      pass: true,
      detail: `public/r/${target.name}.json matches the fresh build`,
    });
    state.item = fresh;
    state.itemName = safeItemName(fresh.name);
    state.addSpec = builtPath;
    state.heading = `${registry.name} ${state.itemName}`;
    return;
  }

  if (target.kind === "url") {
    const response = await fetch(target.url);
    if (!response.ok) throw new Error(`GET ${target.url} returned ${response.status}`);
    state.item = assertRegistryItem(await response.json(), target.url);
    state.itemName = safeItemName(state.item.name);
    state.addSpec = target.url;
    state.heading = state.item.title || state.itemName;
    return;
  }

  state.item = readItem(target.file);
  state.itemName = safeItemName(state.item.name);
  state.addSpec = target.file;
  state.heading = state.item.title || state.itemName;
}

function locateInstalled(appDir, item) {
  const components = JSON.parse(fs.readFileSync(path.join(appDir, "components.json"), "utf8"));
  const aliases = components.aliases ?? {};
  const files = item.files ?? [];
  const primary =
    files.find((file) => file.type === "registry:ui" || file.type === "registry:component") ??
    files[0];
  if (!primary) throw new Error("registry item has no files");
  const target = primary.target || primary.path;
  let importSpec = aliasTargetToImport(aliases, target);
  let disk = importSpec ? diskPathForImport(appDir, importSpec) : "";
  if (disk && !fs.existsSync(disk)) {
    const asTs = disk.replace(/\.tsx$/, ".ts");
    if (fs.existsSync(asTs)) disk = asTs;
  }
  if (!disk || !fs.existsSync(disk)) {
    const base = path.basename(primary.path || target);
    const matches = walkFiles(appDir, (file) => path.basename(file) === base);
    if (matches.length !== 1) {
      throw new Error(`expected one installed ${base}, found ${matches.length}`);
    }
    disk = matches[0];
    importSpec = importSpecForFile(appDir, disk);
  }
  return { disk, importSpec };
}

function ensureHtmlLang(appDir) {
  const layouts = [path.join(appDir, "src", "app", "layout.tsx"), path.join(appDir, "app", "layout.tsx")];
  const layout = layouts.find((file) => fs.existsSync(file));
  if (!layout) throw new Error("layout.tsx is missing");
  const text = fs.readFileSync(layout, "utf8");
  if (/<html[^>]*\slang=/.test(text)) return;
  if (!text.includes("<html")) throw new Error("layout.tsx has no html tag");
  fs.writeFileSync(layout, text.replace("<html", '<html lang="en"'));
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  let last = "no response";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      last = `status ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server did not answer ${url}. Last error: ${last}`);
}

function startServer(state) {
  const log = fs.createWriteStream(path.join(state.proofDir, "server.log"));
  const child = spawn(
    "npm",
    ["run", "start", "--", "-p", String(state.port), "-H", "127.0.0.1"],
    {
      cwd: state.appDir,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(state.port) },
    },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  state.serverPid = child.pid;
  fs.writeFileSync(path.join(state.tempDir, "server.pid"), String(child.pid));
  return child;
}

async function at(started, mark) {
  const wait = mark - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function attachConsole(page, bucket) {
  page.on("console", (message) => {
    const type = message.type();
    const text = message.text();
    if (type === "error") bucket.errors.push(text);
    else if (type === "warning") bucket.warnings.push(text);
  });
  page.on("pageerror", (error) => {
    bucket.errors.push(error instanceof Error ? error.message : String(error));
  });
}

async function openDemo(browser, url, reducedMotion, bucket) {
  const options = {
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    reducedMotion,
  };
  if (reducedMotion === "no-preference") {
    options.recordVideo = {
      dir: bucket.videoDir,
      size: { width: 1280, height: 720 },
    };
  }
  const context = await browser.newContext(options);
  const page = await context.newPage();
  attachConsole(page, bucket);
  await page.emulateMedia({ reducedMotion });
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForSelector("[data-verify-root]");
  await page.evaluate(() => document.fonts.ready);
  return { context, page, video: page.video() };
}

async function captureBrowser(state) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const bucket = {
    errors: [],
    warnings: [],
    videoDir: path.join(state.proofDir, "video-raw"),
  };
  fs.mkdirSync(bucket.videoDir, { recursive: true });
  const url = `http://127.0.0.1:${state.port}/`;
  try {
    state.phase = "screenshot";
    const motion = await openDemo(browser, url, "no-preference", bucket);
    const motionStarted = Date.now();
    const motionSamples = [];
    for (const mark of [50, 200, 400, 700, 1200, 2000, 2800]) {
      await at(motionStarted, mark);
      motionSamples.push(await motion.page.evaluate(probeDemo));
    }
    await at(motionStarted, 2600);
    await motion.page.screenshot({
      path: path.join(state.proofDir, "screenshot.png"),
      fullPage: true,
    });
    state.checks.push({ id: "screenshot", pass: true, detail: "screenshot.png" });
    const motionMedia = await motion.page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const motionOverlay = await motion.page.locator("body").innerText();
    if (motionOverlay.includes("Unhandled Runtime Error") || motionOverlay.includes("Application error")) {
      bucket.errors.push("Next.js error overlay is visible on the motion page");
    }
    state.phase = "video";
    await at(motionStarted, VIDEO_MS);
    await motion.context.close();
    const rawVideo = await motion.video.path();
    const videoPath = path.join(state.proofDir, "video.webm");
    await runCommand(
      "ffmpeg",
      ["-y", "-i", rawVideo, "-t", "3", "-an", "-c:v", "libvpx-vp9", "-b:v", "1M", videoPath],
      { cwd: state.proofDir, timeoutMs: 60000, logPath: state.logPath },
    );
    const duration = Number(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath],
        { encoding: "utf8" },
      ).trim(),
    );
    if (!(duration >= 2.8 && duration <= 3.2)) {
      throw new Error(`video duration ${duration} seconds is outside 2.8 to 3.2`);
    }
    state.checks.push({ id: "video", pass: true, detail: `duration ${duration.toFixed(2)} seconds` });
    state.phase = "motion";
    const played = judgeMotionPlayed(motionSamples);
    const motionPass = motionMedia === false && played.pass;
    state.checks.push({
      id: "motion",
      pass: motionPass,
      detail: motionMedia
        ? "prefers-reduced-motion matched during the motion run"
        : played.reason,
    });

    state.phase = "reduced-motion";
    const reduced = await openDemo(browser, url, "reduce", bucket);
    const reducedStarted = Date.now();
    const reducedSamples = [];
    for (let index = 0; index < REDUCED_SAMPLE_COUNT; index += 1) {
      await at(reducedStarted, REDUCED_SAMPLE_START_MS + index * REDUCED_SAMPLE_GAP_MS);
      reducedSamples.push(await reduced.page.evaluate(probeDemo));
    }
    await reduced.page.screenshot({
      path: path.join(state.proofDir, "screenshot-reduced.png"),
      fullPage: true,
    });
    const reducedMedia = await reduced.page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const reducedOverlay = await reduced.page.locator("body").innerText();
    if (
      reducedOverlay.includes("Unhandled Runtime Error") ||
      reducedOverlay.includes("Application error")
    ) {
      bucket.errors.push("Next.js error overlay is visible on the reduced-motion page");
    }
    await reduced.context.close();
    const reducedVerdict = judgeReducedMotion(reducedSamples);
    const reducedPass = reducedMedia === true && reducedVerdict.pass;
    state.checks.push({
      id: "reduced-motion",
      pass: reducedPass,
      detail: reducedMedia ? reducedVerdict.reason : "prefers-reduced-motion did not match",
    });
    fs.writeFileSync(
      path.join(state.proofDir, "reduced-motion.json"),
      `${JSON.stringify(
        {
          check: REDUCED_MOTION_CHECK,
          limitMs: 50,
          motion: { mediaMatches: motionMedia, pass: motionPass, samples: motionSamples },
          reducedMotion: {
            mediaMatches: reducedMedia,
            pass: reducedPass,
            samples: reducedSamples,
            reason: reducedVerdict.reason,
          },
        },
        null,
        2,
      )}\n`,
    );
    await auditInstalledDemo({
      browser,
      url,
      proofDir: state.proofDir,
      bucket,
    });
  } finally {
    await browser.close();
    fs.rmSync(bucket.videoDir, { recursive: true, force: true });
  }

  state.phase = "console";
  fs.writeFileSync(
    path.join(state.proofDir, "console.log"),
    [
      ...bucket.errors.map((line) => `[error] ${line}`),
      ...bucket.warnings.map((line) => `[warning] ${line}`),
    ].join("\n") + (bucket.errors.length || bucket.warnings.length ? "\n" : ""),
  );
  const errorDetail =
    bucket.errors.length === 0
      ? `0 errors, ${bucket.warnings.length} warnings`
      : `${bucket.errors.length} errors. ${bucket.errors[0].replaceAll(/\s+/g, " ").slice(0, 180)}`;
  state.checks.push({ id: "console", pass: bucket.errors.length === 0, detail: errorDetail });
  state.consoleErrors = bucket.errors;
  state.consoleWarnings = bucket.warnings;
}

async function runLighthouse(state) {
  const lighthouse = (await import("lighthouse")).default;
  const chromeLauncher = await import("chrome-launcher");
  const chrome = await chromeLauncher.launch({
    chromePath: state.chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    const result = await lighthouse(`http://127.0.0.1:${state.port}/`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices"],
    });
    if (!result?.lhr) throw new Error("Lighthouse returned no report");
    fs.writeFileSync(
      path.join(state.proofDir, "lighthouse.json"),
      JSON.stringify(result.lhr),
    );
    state.scores = lighthouseScores(result.lhr);
  } finally {
    await chrome.kill();
  }
  state.checks.push(scoreCheck("lighthouse-performance", state.scores.performance, null));
  state.checks.push(
    scoreCheck("lighthouse-accessibility", state.scores.accessibility, ACCESSIBILITY_MIN),
  );
  state.checks.push(
    scoreCheck("lighthouse-best-practices", state.scores["best-practices"], BEST_PRACTICES_MIN),
  );
}

function writeProof(state) {
  const names = [
    "video.webm",
    "screenshot.png",
    "screenshot-reduced.png",
    "console.log",
    "reduced-motion.json",
    "lighthouse.json",
    "summary.md",
    "run.log",
  ];
  for (const extra of ["axe.json", "interactions.json"]) {
    if (fs.existsSync(path.join(state.proofDir, extra))) names.push(extra);
  }
  const artifacts = names.map((name) => path.relative(state.repoRoot, path.join(state.proofDir, name)));
  state.pass = overallPass(state.checks, state.kind);
  const summary = formatSummary({
    itemName: state.itemName,
    runId: state.runId,
    kind: state.kind,
    pass: state.pass,
    checks: state.checks,
    scores: state.scores,
    addSpec: state.addSpec,
    consoleErrors: state.consoleErrors,
    consoleWarnings: state.consoleWarnings,
    artifacts,
  });
  fs.writeFileSync(path.join(state.proofDir, "summary.md"), summary);
  state.summary = summary;
}

async function verify(target) {
  const repoRoot = findRepoRoot(SCRIPT_DIR);
  const runId = runIdNow();
  const proofDir = path.join(repoRoot, "proofs", target.kind === "name" ? target.name : "item", runId);
  fs.mkdirSync(proofDir, { recursive: true });
  const state = {
    repoRoot,
    runId,
    kind: target.kind,
    itemName: target.kind === "name" ? target.name : "item",
    addSpec: "",
    heading: "",
    item: null,
    proofDir,
    logPath: path.join(proofDir, "run.log"),
    tempDir: path.join(TEMP_ROOT, runId),
    appDir: path.join(TEMP_ROOT, runId, "app"),
    buildDir: path.join(TEMP_ROOT, runId, "registry"),
    port: 0,
    serverPid: 0,
    chromePath: "",
    checks: [],
    phase: "tools",
    scores: {},
    consoleErrors: [],
    consoleWarnings: [],
    pass: false,
    summary: "",
  };
  active = state;
  fs.mkdirSync(state.tempDir, { recursive: true });
  fs.writeFileSync(state.logPath, "");

  try {
    state.phase = "tools";
    await ensureTools(state);
    state.checks.push({ id: "tools", pass: true, detail: "playwright chromium, chrome, and ffmpeg are present" });
    state.phase = target.kind === "name" ? "registry-build" : "shadcn-add";
    await resolveTarget(state, target);
    if (target.kind !== "name") {
      state.proofDir = path.join(repoRoot, "proofs", state.itemName, runId);
      fs.mkdirSync(state.proofDir, { recursive: true });
      const nextLog = path.join(state.proofDir, "run.log");
      if (state.logPath !== nextLog) {
        fs.copyFileSync(state.logPath, nextLog);
        fs.rmSync(path.join(repoRoot, "proofs", "item", runId), { recursive: true, force: true });
        state.logPath = nextLog;
      }
    }

    state.phase = "scaffold";
    await runCommand(
      "npx",
      ["--yes", "create-next-app@latest", state.appDir, ...CREATE_NEXT_APP_ARGS],
      { cwd: state.tempDir, timeoutMs: 300000, logPath: state.logPath },
    );
    const installedNext = readPackageVersion(
      path.join(state.appDir, "node_modules", "next", "package.json"),
    );
    const createNextVersion = npmViewVersion("create-next-app");
    state.checks.push({
      id: "scaffold",
      pass: true,
      detail: `next ${installedNext}, create-next-app ${createNextVersion}, app router, TypeScript, Tailwind`,
    });

    state.phase = "shadcn-init";
    await runCommand("npx", ["--yes", "shadcn@latest", ...SHADCN_INIT_ARGS], {
      cwd: state.appDir,
      timeoutMs: 300000,
      logPath: state.logPath,
    });
    if (!fs.existsSync(path.join(state.appDir, "components.json"))) {
      throw new Error("shadcn init did not write components.json");
    }
    const shadcnVersion = npmViewVersion("shadcn");
    state.checks.push({
      id: "shadcn-init",
      pass: true,
      detail: `shadcn ${shadcnVersion}, components.json written`,
    });

    state.phase = "shadcn-add";
    await runCommand(
      "npx",
      ["--yes", "shadcn@latest", "add", state.addSpec, "--yes", "--overwrite"],
      { cwd: state.appDir, timeoutMs: 180000, logPath: state.logPath },
    );
    const installed = locateInstalled(state.appDir, state.item);
    const source = fs.readFileSync(installed.disk, "utf8");
    const render = pickRender(parseComponentExports(source));
    state.checks.push({
      id: "shadcn-add",
      pass: true,
      detail: `installed ${path.relative(state.appDir, installed.disk)}`,
    });

    state.phase = "demo";
    const page = renderDemoPage({
      importSpec: installed.importSpec,
      exportName: render.exportName,
      withChildren: render.withChildren,
      heading: state.heading,
    });
    fs.writeFileSync(demoPagePath(state.appDir), page);
    ensureHtmlLang(state.appDir);
    state.checks.push({
      id: "demo",
      pass: true,
      detail: `renders ${render.exportName} from ${installed.importSpec}`,
    });

    state.phase = "build";
    await runCommand("npm", ["run", "build"], {
      cwd: state.appDir,
      timeoutMs: 300000,
      logPath: state.logPath,
    });
    state.checks.push({ id: "build", pass: true, detail: "next build finished" });

    state.phase = "server";
    state.port = await freePort();
    startServer(state);
    await waitForHttp(`http://127.0.0.1:${state.port}/`, 60000);
    state.checks.push({ id: "server", pass: true, detail: `http://127.0.0.1:${state.port}/` });

    state.phase = "screenshot";
    await captureBrowser(state);
    state.phase = "lighthouse-performance";
    await runLighthouse(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendLog(state.logPath, message);
    const known = new Set(state.checks.map((check) => check.id));
    const failedId =
      state.phase && !known.has(state.phase)
        ? state.phase
        : requiredChecks(state.kind).find((id) => !known.has(id));
    if (failedId) {
      state.checks.push({
        id: failedId,
        pass: false,
        detail: message.split("\n")[0].slice(0, 300),
      });
    }
  } finally {
    try {
      writeProof(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.summary = `The result is fail.\n\n${message}\n`;
      fs.writeFileSync(path.join(state.proofDir, "summary.md"), state.summary);
    }
    process.stdout.write(state.summary);
    await cleanupRun(state);
  }
  return state.pass ? 0 : 1;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command === "help") {
    process.stdout.write(helpText());
    return 0;
  }
  if (parsed.command === "clean") {
    await cleanLeftovers();
    return 0;
  }
  const repoRoot = findRepoRoot(SCRIPT_DIR);
  if (parsed.command === "doctor") return doctor(repoRoot);
  return verify(parsed.target);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.on("SIGINT", () => {
    cleanupRun(active).finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    cleanupRun(active).finally(() => process.exit(143));
  });
  main()
    .then((code) => process.exit(code))
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : error);
      await cleanupRun(active);
      process.exit(1);
    });
}
