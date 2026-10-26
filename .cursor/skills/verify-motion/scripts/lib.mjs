import fs from "node:fs";
import path from "node:path";

export const MOTION_DURATION_LIMIT_MS = 50;
export const MOTION_OPACITY_DELTA = 0.05;
export const MOTION_TRANSLATE_PX = 2;
export const MOTION_SCALE_DELTA = 0.02;
export const VIDEO_MS = 3000;
export const ACCESSIBILITY_MIN = 90;
export const BEST_PRACTICES_MIN = 90;
export const REDUCED_SAMPLE_START_MS = 100;
export const REDUCED_SAMPLE_GAP_MS = 200;
export const REDUCED_SAMPLE_COUNT = 4;

export const CREATE_NEXT_APP_ARGS = [
  "--ts",
  "--tailwind",
  "--app",
  "--eslint",
  "--use-npm",
  "--import-alias",
  "@/*",
  "--disable-git",
  "--no-agent-feedback",
  "--yes",
];

export const SHADCN_INIT_ARGS = [
  "init",
  "--yes",
  "--defaults",
  "--no-monorepo",
  "--force",
];

export const BASE_CHECKS = [
  "tools",
  "scaffold",
  "shadcn-init",
  "shadcn-add",
  "demo",
  "build",
  "server",
  "screenshot",
  "video",
  "motion",
  "reduced-motion",
  "console",
  "lighthouse-performance",
  "lighthouse-accessibility",
  "lighthouse-best-practices",
];

export const REDUCED_MOTION_CHECK = [
  "The reduced-motion check uses Playwright.",
  "The browser context sets reducedMotion to reduce.",
  "That emulates `prefers-reduced-motion: reduce`.",
  'The run reads `matchMedia("(prefers-reduced-motion: reduce)")` and samples the demo four times.',
  "Each sample records computed opacity, computed transform, and `getAnimations({ subtree: true })` on `[data-verify-root]`.",
  "An animation record includes duration and the keyframe property endpoints when the browser exposes them.",
  "Opacity and transform come from `[data-fade-in]` when that node exists, and otherwise from the first element inside `[data-verify-root]`.",
  "The first reduced-motion sample waits 100 milliseconds after load, and the next samples are 200 milliseconds apart.",
  "The check passes when the media query matches, every animation duration is at or below 50 milliseconds, and opacity and transform stay the same.",
  "The motion run sets reducedMotion to no-preference and uses the same probe.",
  "It passes when the media query does not match and either opacity changes by at least 0.05, transform moves by at least 2 pixels or an equivalent scale or rotation, or an animation longer than 50 milliseconds targets a change that is not a near-zero opacity or transform.",
].join(" ");

export function requiredChecks(kind) {
  if (kind !== "name") return BASE_CHECKS;
  const checks = [...BASE_CHECKS];
  checks.splice(1, 0, "registry-build");
  return checks;
}

export function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    const registry = path.join(dir, "registry.json");
    const skill = path.join(dir, ".cursor", "skills", "verify-motion", "SKILL.md");
    if (fs.existsSync(registry) && fs.existsSync(skill)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "verify-motion could not find registry.json next to .cursor/skills/verify-motion",
      );
    }
    dir = parent;
  }
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function parseTarget(value, { cwd = process.cwd(), fileExists = isFile } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("pass one item name, item JSON URL, or item JSON path");
  }
  if (/^https?:\/\//i.test(value)) return { kind: "url", url: value };
  const absolute = path.resolve(cwd, value);
  if (fileExists(absolute)) return { kind: "file", file: absolute };
  if (value.endsWith(".json")) {
    throw new Error(`registry JSON not found at ${absolute}`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(
      `item name ${value} must be kebab-case, or pass an http(s) URL or a JSON file`,
    );
  }
  return { kind: "name", name: value };
}

export function parseArgs(argv, options = {}) {
  let command = "verify";
  const positionals = [];
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h" || arg === "help") {
      command = "help";
      continue;
    }
    if (arg === "doctor" || arg === "clean") {
      command = arg;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`unknown argument ${arg}`);
    positionals.push(arg);
  }
  if (command === "verify") {
    if (positionals.length !== 1) {
      throw new Error("pass one item name, item JSON URL, or item JSON path");
    }
    return { command, target: parseTarget(positionals[0], options) };
  }
  if (positionals.length !== 0) {
    throw new Error(`${command} does not take an item`);
  }
  return { command, target: null };
}

export function assertRegistryItem(item, label) {
  if (!item || typeof item !== "object" || Array.isArray(item.items) || !Array.isArray(item.files)) {
    throw new Error(`${label} must be one registry item with files, not a registry catalog`);
  }
  return item;
}

export function safeItemName(name) {
  if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`registry item name ${String(name)} is not kebab-case`);
  }
  return name;
}

export function parseComponentExports(source) {
  const names = new Set();
  for (const match of source.matchAll(
    /export\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g,
  )) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(
    /export\s+(?:const|let)\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
  )) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const pieces = part.trim().split(/\s+as\s+/);
      const exported = pieces[pieces.length - 1]?.trim();
      if (exported && /^[A-Z][A-Za-z0-9_]*$/.test(exported)) names.add(exported);
    }
  }
  return [...names];
}

export function pickRender(names) {
  if (names.includes("Demo")) return { exportName: "Demo", withChildren: false };
  if (names.length === 1) return { exportName: names[0], withChildren: true };
  throw new Error(
    `the installed item must export Demo, or one component. Found ${names.join(", ") || "no components"}`,
  );
}

export function escapeJsxText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderDemoPage({ importSpec, exportName, withChildren, heading }) {
  if (importSpec.includes('"') || exportName.includes('"')) {
    throw new Error("import path or export name contains a double quote");
  }
  const visible = escapeJsxText(heading);
  const usage = withChildren
    ? `<${exportName}>\n          <p className="text-3xl font-semibold tracking-tight">${visible}</p>\n        </${exportName}>`
    : `<${exportName} />`;
  return `import { ${exportName} } from "${importSpec}";

export const metadata = {
  title: ${JSON.stringify(heading)},
  description: ${JSON.stringify(`Verification demo for ${heading}`)},
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col gap-8 bg-background p-10 text-foreground">
      <h1 className="text-lg font-medium">${visible}</h1>
      <div data-verify-root>
        ${usage}
      </div>
    </main>
  );
}
`;
}

export function parseJsonc(text) {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(stripped);
}

export function importSpecForFile(appDir, filePath) {
  const tsconfig = fs.readFileSync(path.join(appDir, "tsconfig.json"), "utf8");
  const aliasMatch = tsconfig.match(/"(@\/\*)"\s*:\s*\[\s*"([^"]+)"\s*\]/);
  if (!aliasMatch) throw new Error("tsconfig.json has no @/* path alias");
  const aliasPrefix = aliasMatch[1].replace(/\*$/, "");
  const targetPrefix = aliasMatch[2].replace(/^\.\//, "").replace(/\*$/, "");
  let relative = path.relative(appDir, filePath).split(path.sep).join("/");
  relative = relative.replace(/\.tsx?$/, "");
  if (targetPrefix && !relative.startsWith(targetPrefix)) {
    throw new Error(`installed file ${relative} is outside the @/* alias`);
  }
  const rest = targetPrefix ? relative.slice(targetPrefix.length) : relative;
  return `${aliasPrefix}${rest}`;
}

export function aliasTargetToImport(componentsAlias, target) {
  const prefixes = [
    ["@components/", "components"],
    ["@ui/", "ui"],
    ["@lib/", "lib"],
    ["@hooks/", "hooks"],
  ];
  for (const [token, key] of prefixes) {
    if (!target.startsWith(token)) continue;
    const alias = componentsAlias[key];
    if (!alias) throw new Error(`components.json has no aliases.${key} for ${target}`);
    const rest = target.slice(token.length).replace(/\.tsx?$/, "");
    return `${alias.replace(/\/$/, "")}/${rest}`;
  }
  return null;
}

export function diskPathForImport(appDir, importSpec) {
  const tsconfig = fs.readFileSync(path.join(appDir, "tsconfig.json"), "utf8");
  const aliasMatch = tsconfig.match(/"(@\/\*)"\s*:\s*\[\s*"([^"]+)"\s*\]/);
  if (!aliasMatch) throw new Error("tsconfig.json has no @/* path alias");
  const aliasPrefix = aliasMatch[1].replace(/\*$/, "");
  if (!importSpec.startsWith(aliasPrefix)) {
    throw new Error(`import ${importSpec} does not use ${aliasPrefix}`);
  }
  const targetPrefix = aliasMatch[2].replace(/^\.\//, "").replace(/\*$/, "");
  const rest = importSpec.slice(aliasPrefix.length);
  return path.join(appDir, targetPrefix, `${rest}.tsx`);
}

export function normalizeTransform(value) {
  if (!value || value === "none") return "none";
  const match = String(value).match(/^matrix\(([^)]+)\)$/);
  if (!match) return String(value);
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length !== 6 || parts.some((part) => Number.isNaN(part))) return String(value);
  const [a, b, c, d, tx, ty] = parts;
  const identity =
    Math.abs(a - 1) < 0.001 &&
    Math.abs(b) < 0.001 &&
    Math.abs(c) < 0.001 &&
    Math.abs(d - 1) < 0.001 &&
    Math.abs(tx) < 0.5 &&
    Math.abs(ty) < 0.5;
  if (identity) return "none";
  return parts.map((part) => part.toFixed(2)).join(",");
}

export function sameVisual(left, right) {
  const opacityGap = Math.abs(Number(left.opacity) - Number(right.opacity));
  return opacityGap < 0.01 && normalizeTransform(left.transform) === normalizeTransform(right.transform);
}

export function longestDuration(sample) {
  const durations = (sample.animations ?? []).map((animation) => Number(animation.durationMs) || 0);
  return durations.length ? Math.max(...durations) : 0;
}

export function judgeReducedMotion(samples, limitMs = MOTION_DURATION_LIMIT_MS) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return { pass: false, reason: "the reduced-motion probe collected fewer than two samples" };
  }
  const tooLong = samples.find((sample) => longestDuration(sample) > limitMs);
  if (tooLong) {
    return {
      pass: false,
      reason: `an animation duration was ${longestDuration(tooLong)} milliseconds, above the ${limitMs} millisecond limit`,
    };
  }
  const drifted = samples.find((sample) => !sameVisual(samples[0], sample));
  if (drifted) {
    return { pass: false, reason: "opacity or transform changed while reduced motion was requested" };
  }
  return { pass: true, reason: `no animation longer than ${limitMs} milliseconds, and the painted style stayed still` };
}

const VISUAL_PROPERTY = new Set([
  "opacity",
  "transform",
  "translate",
  "x",
  "y",
  "scale",
  "rotate",
  "scaleX",
  "scaleY",
]);

function identityMatrix() {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

function parseLength(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "0") return 0;
  const match = trimmed.match(/^(-?\d*\.?\d+)(px)?$/);
  if (!match) return null;
  return Number(match[1]);
}

function parseMatrix(value) {
  if (value == null || value === "" || value === "none") return identityMatrix();
  const text = String(value).trim();
  const matrix = text.match(/^matrix\(([^)]+)\)$/);
  if (matrix) {
    const parts = matrix[1].split(",").map((part) => Number(part.trim()));
    if (parts.length !== 6 || parts.some((part) => Number.isNaN(part))) return null;
    const [a, b, c, d, tx, ty] = parts;
    return { a, b, c, d, tx, ty };
  }
  const matrix3d = text.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3d) {
    const parts = matrix3d[1].split(",").map((part) => Number(part.trim()));
    if (parts.length !== 16 || parts.some((part) => Number.isNaN(part))) return null;
    return { a: parts[0], b: parts[1], c: parts[4], d: parts[5], tx: parts[12], ty: parts[13] };
  }
  const calls = [...text.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)];
  if (calls.length === 0) return null;
  const result = identityMatrix();
  for (const call of calls) {
    const name = call[1];
    const args = call[2].split(",").map((part) => part.trim());
    if (name === "translateX" || name === "translateY") {
      const delta = parseLength(args[0] ?? "0");
      if (delta == null) return null;
      if (name === "translateX") result.tx += delta;
      else result.ty += delta;
    } else if (name === "translate" || name === "translate3d") {
      const x = parseLength(args[0] ?? "0");
      const y = parseLength(args[1] ?? "0");
      if (x == null || y == null) return null;
      result.tx += x;
      result.ty += y;
    } else if (name === "scale") {
      const x = Number(args[0]);
      const y = args[1] == null ? x : Number(args[1]);
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      result.a *= x;
      result.d *= y;
    } else if (name === "scaleX") {
      const x = Number(args[0]);
      if (Number.isNaN(x)) return null;
      result.a *= x;
    } else if (name === "scaleY") {
      const y = Number(args[0]);
      if (Number.isNaN(y)) return null;
      result.d *= y;
    } else if (name === "rotate" || name === "rotateZ") {
      const raw = args[0] ?? "0";
      const degrees = raw.endsWith("rad")
        ? (Number(raw.slice(0, -3)) * 180) / Math.PI
        : Number(raw.replace("deg", ""));
      if (Number.isNaN(degrees)) return null;
      const radians = (degrees * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const { a, b, c, d } = result;
      result.a = a * cos + c * sin;
      result.b = b * cos + d * sin;
      result.c = c * cos - a * sin;
      result.d = d * cos - b * sin;
    } else {
      return null;
    }
  }
  return result;
}

export function meaningfulTransformDelta(left, right) {
  const a = parseMatrix(left);
  const b = parseMatrix(right);
  if (!a || !b) return String(left ?? "") !== String(right ?? "");
  const translate = Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));
  if (translate >= MOTION_TRANSLATE_PX) return true;
  const linear = Math.max(
    Math.abs(a.a - b.a),
    Math.abs(a.b - b.b),
    Math.abs(a.c - b.c),
    Math.abs(a.d - b.d),
  );
  return linear >= MOTION_SCALE_DELTA;
}

export function propertyChangeIsMeaningful(property) {
  const name = property?.name;
  const from = property?.from ?? "";
  const to = property?.to ?? "";
  if (from === to) return false;
  if (name === "opacity") {
    const gap = Math.abs(Number(from) - Number(to));
    return Number.isFinite(gap) && gap >= MOTION_OPACITY_DELTA;
  }
  if (name === "transform") return meaningfulTransformDelta(from, to);
  if (name === "x" || name === "y" || name === "translate") {
    const prefix = name === "y" ? "translateY" : name === "x" ? "translateX" : "translate";
    return meaningfulTransformDelta(`${prefix}(${from})`, `${prefix}(${to})`);
  }
  if (name === "scale" || name === "scaleX" || name === "scaleY") {
    const fromN = Number(String(from).trim().split(/\s+/)[0]);
    const toN = Number(String(to).trim().split(/\s+/)[0]);
    if (Number.isNaN(fromN) || Number.isNaN(toN)) return true;
    return Math.abs(fromN - toN) >= MOTION_SCALE_DELTA;
  }
  if (name === "rotate") {
    const fromN = Number(String(from).replace("deg", ""));
    const toN = Number(String(to).replace("deg", ""));
    if (Number.isNaN(fromN) || Number.isNaN(toN)) return true;
    return Math.abs(fromN - toN) >= 2;
  }
  return true;
}

export function animationIsNearZero(animation) {
  const properties = animation?.properties;
  if (!Array.isArray(properties) || properties.length === 0) return false;
  let sawVisual = false;
  for (const property of properties) {
    if (!VISUAL_PROPERTY.has(property.name)) {
      if ((property.from ?? "") !== (property.to ?? "")) return false;
      continue;
    }
    sawVisual = true;
    if (propertyChangeIsMeaningful(property)) return false;
  }
  return sawVisual;
}

export function sampleMovedMeaningfully(left, right) {
  const opacityGap = Math.abs(Number(left.opacity) - Number(right.opacity));
  if (Number.isFinite(opacityGap) && opacityGap >= MOTION_OPACITY_DELTA) return true;
  return meaningfulTransformDelta(left.transform, right.transform);
}

export function judgeMotionPlayed(samples, limitMs = MOTION_DURATION_LIMIT_MS) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return { pass: false, reason: "the motion probe collected fewer than two samples" };
  }
  if (samples.some((sample) => sampleMovedMeaningfully(samples[0], sample))) {
    return { pass: true, reason: "opacity or transform moved by more than a near-zero amount" };
  }
  const long = samples
    .flatMap((sample) => sample.animations ?? [])
    .filter((animation) => Number(animation.durationMs) > limitMs);
  if (long.some((animation) => !animationIsNearZero(animation))) {
    return {
      pass: true,
      reason:
        "an animation longer than 50 milliseconds was not a near-zero opacity or transform change",
    };
  }
  if (long.length > 0) {
    return { pass: false, reason: "the only motion was a near-zero opacity or transform change" };
  }
  return { pass: false, reason: "the demo stayed still, so the motion run has nothing to prove" };
}

export function probeDemo() {
  const root = document.querySelector("[data-verify-root]");
  const target = root?.querySelector("[data-fade-in]") || root?.firstElementChild || root;
  const style = target ? getComputedStyle(target) : null;
  const animations = root
    ? root.getAnimations({ subtree: true }).map((animation) => {
        const timing =
          animation.effect && "getComputedTiming" in animation.effect
            ? animation.effect.getComputedTiming()
            : null;
        const raw = timing ? timing.duration : 0;
        const properties = [];
        if (animation.effect && "getKeyframes" in animation.effect) {
          try {
            const frames = animation.effect.getKeyframes() ?? [];
            const names = new Set();
            for (const frame of frames) {
              if (!frame) continue;
              for (const key of Object.keys(frame)) {
                if (key === "offset" || key === "easing" || key === "composite") continue;
                names.add(key);
              }
            }
            for (const name of names) {
              const values = frames.map((frame) => frame?.[name]).filter((value) => value != null);
              properties.push({
                name,
                from: values.length ? String(values[0]) : "",
                to: values.length ? String(values[values.length - 1]) : "",
              });
            }
          } catch {
            properties.length = 0;
          }
        }
        return {
          durationMs: raw === Infinity ? 1e15 : Number(raw) || 0,
          playState: animation.playState,
          properties,
        };
      })
    : [];
  return {
    opacity: style ? style.opacity : "",
    transform: style ? style.transform : "",
    animations,
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function summarizeChecks(checks, kind) {
  return requiredChecks(kind).map((id) => {
    const found = checks.find((check) => check.id === id);
    if (!found) return { id, pass: false, detail: "not run" };
    return found;
  });
}

export function overallPass(checks, kind) {
  return summarizeChecks(checks, kind).every((check) => check.pass);
}

function sentence(id, pass, detail) {
  const label = id.replaceAll("-", " ");
  const verdict = pass ? "passed" : "failed";
  const extra = detail ? ` ${detail}` : "";
  return `${label} ${verdict}.${extra.endsWith(".") || extra === "" ? extra : `${extra}.`}`;
}

export function formatSummary(report) {
  const rows = summarizeChecks(report.checks, report.kind);
  const lines = [
    `# verify-motion ${report.itemName}`,
    "",
    `The result is ${report.pass ? "pass" : "fail"}.`,
    "",
    `Run ${report.runId}.`,
    `Item ${report.itemName}.`,
    `Add target ${report.addSpec || "not resolved"}.`,
    "",
    "## Checks",
    "",
    ...rows.map((check) => `- ${sentence(check.id, check.pass, check.detail)}`),
    "",
    "## Lighthouse",
    "",
    `- Performance score is ${scoreText(report.scores?.performance)}.`,
    `- Accessibility score is ${scoreText(report.scores?.accessibility)}.`,
    `- Best practices score is ${scoreText(report.scores?.["best-practices"])}.`,
    "",
    "## Reduced motion",
    "",
    REDUCED_MOTION_CHECK,
    "",
    "## Console",
    "",
    `- Errors: ${(report.consoleErrors ?? []).length}.`,
    `- Warnings: ${(report.consoleWarnings ?? []).length}.`,
    "",
    "## Artifacts",
    "",
    ...report.artifacts.map((artifact) => `- ${artifact}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function scoreText(value) {
  return Number.isFinite(value) ? String(value) : "missing";
}

export function lighthouseScores(lhr) {
  const categories = lhr?.categories ?? {};
  const read = (id) => {
    const score = categories[id]?.score;
    return typeof score === "number" ? Math.round(score * 100) : null;
  };
  return {
    performance: read("performance"),
    accessibility: read("accessibility"),
    "best-practices": read("best-practices"),
  };
}

export function scoreCheck(id, value, minimum) {
  if (!Number.isFinite(value)) {
    return { id, pass: false, detail: "Lighthouse did not return a score" };
  }
  if (minimum == null) {
    return { id, pass: true, detail: `score ${value}` };
  }
  if (value < minimum) {
    return { id, pass: false, detail: `score ${value} is below ${minimum}` };
  }
  return { id, pass: true, detail: `score ${value}` };
}

export function demoPagePath(appDir) {
  const candidates = [
    path.join(appDir, "src", "app", "page.tsx"),
    path.join(appDir, "app", "page.tsx"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("create-next-app did not write app/page.tsx");
  return found;
}

export function walkFiles(dir, predicate, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, found);
    else if (predicate(full)) found.push(full);
  }
  return found;
}

export function makeRunId(date = new Date(), pid = process.pid, seq = 1) {
  const stamp = date.toISOString().replace(/[-:.]/g, "");
  return `${stamp}-${pid}-${seq}`;
}

export function helpText() {
  return `verify-motion doctor
verify-motion clean
verify-motion <item-name>
verify-motion <https://host/r/item.json>
verify-motion <path/to/item.json>
`;
}
