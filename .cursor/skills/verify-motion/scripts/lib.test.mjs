import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACCESSIBILITY_MIN,
  BASE_CHECKS,
  BEST_PRACTICES_MIN,
  CREATE_NEXT_APP_ARGS,
  REDUCED_MOTION_CHECK,
  REDUCED_SAMPLE_COUNT,
  REDUCED_SAMPLE_GAP_MS,
  REDUCED_SAMPLE_START_MS,
  SHADCN_INIT_ARGS,
  aliasTargetToImport,
  assertRegistryItem,
  diskPathForImport,
  findRepoRoot,
  formatSummary,
  importSpecForFile,
  makeRunId,
  judgeMotionPlayed,
  judgeReducedMotion,
  lighthouseScores,
  overallPass,
  parseArgs,
  parseComponentExports,
  pickRender,
  renderDemoPage,
  requiredChecks,
  scoreCheck,
  stableStringify,
} from "./lib.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "../../../..");

test("parseArgs accepts a name, a URL, and a JSON file", () => {
  assert.deepEqual(parseArgs(["fade-in"]).target, { kind: "name", name: "fade-in" });
  assert.deepEqual(parseArgs(["https://example.com/r/fade-in.json"]).target, {
    kind: "url",
    url: "https://example.com/r/fade-in.json",
  });
  const file = path.join(repoRoot, "registry.json");
  assert.equal(parseArgs([file]).target.kind, "file");
  assert.equal(parseArgs(["doctor"]).command, "doctor");
  assert.throws(() => parseArgs(["doctor", "fade-in"]), /does not take an item/);
  assert.throws(() => parseArgs(["FadeIn"]), /kebab-case/);
  assert.throws(() => parseArgs(["missing.json"], { fileExists: () => false }), /not found/);
});

test("a registry catalog is not an item", () => {
  assert.throws(
    () => assertRegistryItem({ name: "animlets", items: [] }, "registry.json"),
    /catalog/,
  );
  assert.throws(() => assertRegistryItem({ name: "fade-in" }, "fade-in.json"), /files/);
  assert.equal(
    assertRegistryItem({ name: "fade-in", files: [{ path: "a.tsx", type: "registry:ui" }] }, "item").name,
    "fade-in",
  );
});

test("fade-in exports Demo and the page renders it", () => {
  const source = fs.readFileSync(path.join(repoRoot, "registry/animlets/fade-in.tsx"), "utf8");
  const names = parseComponentExports(source);
  assert.deepEqual(names.sort(), ["Demo", "FadeIn"]);
  assert.deepEqual(pickRender(names), { exportName: "Demo", withChildren: false });
  assert.deepEqual(pickRender(["FadeIn"]), { exportName: "FadeIn", withChildren: true });
  assert.throws(() => pickRender(["FadeIn", "SlideIn"]), /export Demo/);
  const page = renderDemoPage({
    importSpec: "@/components/animlets/fade-in",
    exportName: "Demo",
    withChildren: false,
    heading: "animlets fade-in",
  });
  assert.match(page, /data-verify-root/);
  assert.match(page, /from "@\/components\/animlets\/fade-in"/);
  assert.match(page, /<h1 className="text-lg font-medium">animlets fade-in<\/h1>/);
});

test("import paths follow the Next alias and the shadcn target", () => {
  assert.equal(
    aliasTargetToImport({ components: "@/components" }, "@components/animlets/fade-in.tsx"),
    "@/components/animlets/fade-in",
  );
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-motion-alias-"));
  fs.writeFileSync(
    path.join(appDir, "tsconfig.json"),
    '{\n  "compilerOptions": {\n    "paths": { "@/*": ["./*"] }\n  }\n}\n',
  );
  const file = path.join(appDir, "components/animlets/fade-in.tsx");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "export function Demo() { return null }\n");
  assert.equal(importSpecForFile(appDir, file), "@/components/animlets/fade-in");
  assert.equal(
    diskPathForImport(appDir, "@/components/animlets/fade-in"),
    file,
  );
});

test("reduced-motion samples overlap a 600 millisecond fade", () => {
  const times = Array.from(
    { length: REDUCED_SAMPLE_COUNT },
    (_, index) => REDUCED_SAMPLE_START_MS + index * REDUCED_SAMPLE_GAP_MS,
  );
  assert.equal(times[0] <= 100, true);
  assert.equal(times.some((time) => time < 600), true);
});

test("reduced motion stays still and the motion run has to move", () => {
  const still = [
    { opacity: "1", transform: "none", animations: [] },
    {
      opacity: "1",
      transform: "matrix(1, 0, 0, 1, 0, 0)",
      animations: [{ durationMs: 0, playState: "finished" }],
    },
  ];
  assert.equal(judgeReducedMotion(still).pass, true);
  assert.equal(judgeMotionPlayed(still).pass, false);
  const fade = [
    {
      opacity: "0.2",
      transform: "matrix(1, 0, 0, 1, 0, 8)",
      animations: [{ durationMs: 600, playState: "running" }],
    },
    { opacity: "1", transform: "none", animations: [] },
  ];
  assert.equal(judgeReducedMotion(fade).pass, false);
  assert.equal(judgeMotionPlayed(fade).pass, true);
  assert.match(judgeReducedMotion(fade).reason, /600/);
  const twitch = [
    {
      opacity: "1",
      transform: "none",
      animations: [
        {
          durationMs: 800,
          playState: "running",
          properties: [{ name: "transform", from: "none", to: "matrix(1, 0, 0, 1, 0.6, 0)" }],
        },
      ],
    },
    { opacity: "1.02", transform: "matrix(1, 0, 0, 1, 0.6, 0)", animations: [] },
  ];
  assert.equal(judgeMotionPlayed(twitch).pass, false);
  assert.match(judgeMotionPlayed(twitch).reason, /near-zero/);
  const slide = [
    { opacity: "1", transform: "matrix(1, 0, 0, 1, 0, 12)", animations: [] },
    { opacity: "1", transform: "none", animations: [] },
  ];
  assert.equal(judgeMotionPlayed(slide).pass, true);
  const draw = [
    {
      opacity: "1",
      transform: "none",
      animations: [
        {
          durationMs: 400,
          playState: "running",
          properties: [{ name: "strokeDashoffset", from: "24", to: "0" }],
        },
      ],
    },
    { opacity: "1", transform: "none", animations: [] },
  ];
  assert.equal(judgeMotionPlayed(draw).pass, true);
});

test("summary lists a missing check as failed and quotes the reduced-motion check", () => {
  const summary = formatSummary({
    itemName: "fade-in",
    runId: "20261021T000000Z",
    kind: "name",
    pass: false,
    checks: [],
    scores: { performance: 91, accessibility: 100, "best-practices": 100 },
    addSpec: "/tmp/fade-in.json",
    consoleErrors: [],
    consoleWarnings: ["dev warning"],
    artifacts: ["proofs/fade-in/20261021T000000Z/video.webm"],
  });
  assert.match(summary, /The result is fail\./);
  assert.match(summary, /tools failed\. not run\./);
  assert.match(summary, /Performance score is 91\./);
  assert.match(summary, new RegExp(REDUCED_MOTION_CHECK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(overallPass([], "name"), false);
  assert.equal(
    overallPass(
      requiredChecks("name").map((id) => ({ id, pass: true, detail: "ok" })),
      "name",
    ),
    true,
  );
});

test("lighthouse gates keep accessibility and best practices at 90", () => {
  assert.deepEqual(
    lighthouseScores({
      categories: {
        performance: { score: 0.905 },
        accessibility: { score: 1 },
        "best-practices": { score: 0.96 },
      },
    }),
    { performance: 91, accessibility: 100, "best-practices": 96 },
  );
  assert.equal(scoreCheck("lighthouse-accessibility", 89, ACCESSIBILITY_MIN).pass, false);
  assert.equal(scoreCheck("lighthouse-best-practices", 90, BEST_PRACTICES_MIN).pass, true);
  assert.equal(scoreCheck("lighthouse-performance", 40, null).pass, true);
});

test("run ids differ when two proofs start in the same millisecond", () => {
  const date = new Date("2026-10-22T13:27:13.123Z");
  assert.equal(makeRunId(date, 10, 1), "20261022T132713123Z-10-1");
  assert.notEqual(makeRunId(date, 10, 1), makeRunId(date, 11, 1));
  assert.notEqual(makeRunId(date, 10, 1), makeRunId(date, 10, 2));
});

test("stable stringify ignores key order", () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }), stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
});

test("the runner commands stay the ones the skill names", () => {
  assert.ok(CREATE_NEXT_APP_ARGS.includes("--app"));
  assert.ok(CREATE_NEXT_APP_ARGS.includes("--tailwind"));
  assert.ok(CREATE_NEXT_APP_ARGS.includes("--ts"));
  assert.ok(CREATE_NEXT_APP_ARGS.includes("--use-npm"));
  assert.deepEqual(SHADCN_INIT_ARGS, ["init", "--yes", "--defaults", "--no-monorepo", "--force"]);
  const runner = fs.readFileSync(path.join(scriptsDir, "verify-motion.mjs"), "utf8");
  assert.match(runner, /create-next-app@latest/);
  assert.match(runner, /shadcn@latest", "add"/);
  assert.match(runner, /SHADCN_INIT_ARGS/);
  assert.ok(BASE_CHECKS.includes("reduced-motion"));
  assert.equal(requiredChecks("name")[0], "tools");
  assert.equal(requiredChecks("name")[1], "registry-build");
  assert.equal(requiredChecks("url").includes("registry-build"), false);
});

test("the skill quotes the reduced-motion check and the feature map keeps its headings", () => {
  const skill = fs.readFileSync(path.join(repoRoot, ".cursor/skills/verify-motion/SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: verify-motion\n/);
  assert.match(skill, /description: Prove an Animlets registry item/);
  assert.ok(skill.includes(REDUCED_MOTION_CHECK));
  assert.equal(findRepoRoot(scriptsDir), repoRoot);
  const headings = [
    "## Sub-features",
    "## How to get to it (user POV)",
    "## Driving it with verify-motion",
    "## Gotchas",
  ];
  for (const feature of [
    "install-item.md",
    "fade-in.md",
    "reduced-motion.md",
    "number-ticker.md",
    "animated-tabs.md",
    "stagger-list.md",
    "success-check.md",
    "hold-to-confirm.md",
    "inline-loader.md",
    "copy-button.md",
  ]) {
    const text = fs.readFileSync(path.join(repoRoot, ".cursor/skills/verify-motion/features", feature), "utf8");
    let previous = -1;
    for (const heading of headings) {
      const index = text.indexOf(heading);
      assert.ok(index > previous, `${feature} missing ${heading}`);
      previous = index;
    }
  }
  const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "registry.json"), "utf8"));
  const fade = registry.items.find((item) => item.name === "fade-in");
  assert.ok(fade);
  assert.deepEqual(fade.dependencies, ["motion"]);
  assert.equal(fs.existsSync(path.join(repoRoot, fade.files[0].path)), true);
});
