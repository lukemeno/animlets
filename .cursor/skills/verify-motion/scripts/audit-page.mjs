import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readAxeSource() {
  return fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "node_modules", "axe-core", "axe.min.js"),
    "utf8",
  );
}

function pushError(bucket, message) {
  bucket.errors.push(message);
}

async function settleEntrance(page) {
  await page
    .waitForFunction(() => {
      const running = document.getAnimations().filter((animation) => {
        const timing = animation.effect && animation.effect.getComputedTiming();
        if (!timing || timing.iterations === Infinity) return false;
        return animation.playState === "running";
      });
      return running.length === 0;
    }, null, { timeout: 4000 })
    .catch(() => {});
}

async function runAxe(page) {
  await page.addScriptTag({ content: readAxeSource() });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ["violations"] });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 6).map((node) => ({
        target: node.target,
        html: node.html,
      })),
    }));
  });
}

async function textOf(locator) {
  return ((await locator.innerText()) || "").replaceAll(/\s+/g, " ").trim();
}

export function countdownCovered(samples) {
  const at2 = samples.findIndex((label) => /(?:^|\s)2s(?:\s|$)/.test(label));
  const at1 = samples.findIndex((label) => /(?:^|\s)1s(?:\s|$)/.test(label));
  const done = samples.findIndex((label) => label.includes("Deleted"));
  return at2 >= 0 && at1 > at2 && done > at1;
}

export function fillStayedStill(transforms) {
  return transforms.every((value) => value === "none" || value === "matrix(1, 0, 0, 1, 0, 0)");
}

async function exerciseHold(page, notes) {
  const button = page.locator("[data-hold-button]");
  await button.waitFor({ timeout: 5000 });
  const idle = await textOf(button);
  if (idle.includes("Deleted")) {
    throw new Error(`manual hold started confirmed: ${idle}`);
  }

  const box = await button.boundingBox();
  if (!box) throw new Error("hold button has no box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(220);
  const mid = await page.locator("[data-fade-in]").first().evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.up();
  await page.waitForTimeout(80);
  const released = await textOf(button);
  const scaleMatch = String(mid).match(/matrix\(([-0-9.]+)/);
  const scale = scaleMatch ? Number(scaleMatch[1]) : 0;
  notes.push(`early release transform ${mid} label ${released}`);
  if (released.includes("Deleted")) throw new Error("early pointer release confirmed the hold");
  if (!(scale > 0.05)) throw new Error(`hold fill did not grow: ${mid}`);

  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.mouse.down();
  await page.waitForTimeout(1600);
  const held = await textOf(button);
  notes.push(`full hold label ${held}`);
  if (!held.includes("Deleted")) throw new Error(`full hold did not confirm: ${held}`);
  await page.mouse.up();

  await page.reload({ waitUntil: "load" });
  await page.locator("[data-manual]").waitFor({ timeout: 5000 });
  await page.locator("[data-confirm-now]").click();
  await page.waitForTimeout(50);
  const direct = await textOf(page.locator("[data-hold-button]"));
  notes.push(`confirm without holding label ${direct}`);
  if (!direct.includes("Deleted")) throw new Error(`confirm without holding left ${direct}`);

  await page.reload({ waitUntil: "load" });
  await page.locator("[data-hold-button]").waitFor({ timeout: 5000 });
  await page.locator("[data-hold-button]").focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(180);
  await page.keyboard.up("Space");
  await page.waitForTimeout(50);
  const keyed = await textOf(page.locator("[data-hold-button]"));
  notes.push(`early key release label ${keyed}`);
  if (keyed.includes("Deleted")) throw new Error("early Space release confirmed the hold");

  await page.keyboard.down("Space");
  await page.waitForTimeout(100);
  await page.goto("about:blank");
  notes.push("unmounted during keyboard hold");
}

async function readClipboard(page) {
  return page.evaluate(async () => navigator.clipboard.readText());
}

async function exerciseCopy(page, notes) {
  const button = page.locator("[data-copy-button]");
  await button.waitFor({ timeout: 5000 });
  const expected = ((await page.locator("code").innerText()) || "").trim();
  if (!expected) throw new Error("copy demo has no code text");
  await button.click();
  await page.waitForFunction(
    () => (document.querySelector("[data-copy-button]")?.textContent ?? "").includes("Copied"),
    null,
    { timeout: 4000 },
  );
  const copied = await readClipboard(page);
  notes.push(`clipboard read-back ${copied}`);
  if (copied !== expected) {
    throw new Error(`clipboard read ${JSON.stringify(copied)} expected ${JSON.stringify(expected)}`);
  }
  const first = await textOf(button);
  notes.push(`first copy label ${first}`);
  if (!first.includes("Copied")) throw new Error(`copy label ${first}`);
  await button.click();
  const again = await readClipboard(page);
  notes.push(`second clipboard read-back ${again}`);
  if (again !== expected) throw new Error(`second clipboard read ${JSON.stringify(again)}`);
  await page.goto("about:blank");
  notes.push("unmounted after copy");
}

async function exerciseTabs(page, notes) {
  const billing = page.getByRole("tab", { name: "Billing" });
  if ((await billing.count()) === 0) return;
  await page.getByText("42,180 events in the last 24 hours.").waitFor({ timeout: 5000 });
  notes.push("playback selected Usage");
  await billing.click();
  const invoice = page.getByText("Next invoice is $240 on May 1.");
  await invoice.waitFor({ timeout: 3000 });
  await page.waitForTimeout(700);
  if ((await invoice.count()) === 0) throw new Error("billing panel did not stay after the click");
  const state = await billing.getAttribute("data-state");
  notes.push(`clicked Billing state ${state}`);
  if (state !== "active") throw new Error(`Billing tab state ${state}`);
}

function watchPage(page, localErrors) {
  page.on("console", (message) => {
    if (message.type() === "error") localErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    localErrors.push(error instanceof Error ? error.message : String(error));
  });
}

async function exerciseHoldReduced(browser, url, notes, localErrors) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  watchPage(page, localErrors);
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${url}?manual=1`, { waitUntil: "load", timeout: 45000 });
    await page.locator("[data-manual]").waitFor({ timeout: 5000 });
    const media = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    notes.push(`reduced hold media ${media}`);
    if (!media) throw new Error("reduced hold did not match prefers-reduced-motion");
    const button = page.locator("[data-hold-button]");
    const box = await button.boundingBox();
    if (!box) throw new Error("reduced hold button has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const sampled = await page.evaluate(async () => {
      const button = document.querySelector("[data-hold-button]");
      const samples = [];
      const transforms = [];
      const started = performance.now();
      while (performance.now() - started < 2500) {
        const label = (button?.innerText || "").replace(/\s+/g, " ").trim();
        if (samples.at(-1) !== label) samples.push(label);
        const fill = document.querySelector("[data-fade-in]");
        transforms.push(fill ? getComputedStyle(fill).transform : "missing");
        if (label.includes("Deleted")) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return { samples, transforms };
    });
    await page.mouse.up();
    const { samples, transforms } = sampled;
    notes.push(`reduced countdown ${samples.join(" -> ")}`);
    if (!countdownCovered(samples)) {
      throw new Error(`reduced countdown did not run 2s then 1s then Deleted: ${samples.join(" -> ")}`);
    }
    if (!fillStayedStill(transforms)) {
      throw new Error(`reduced hold fill moved: ${transforms.join(" | ")}`);
    }
    notes.push("reduced countdown completed with a still fill");
  } finally {
    await context.close();
  }
}

async function exerciseLoaders(page, notes) {
  const loaders = page.locator("[data-inline-loader]");
  const count = await loaders.count();
  notes.push(`loader count ${count}`);
  if (count < 3) throw new Error(`expected 3 inline loaders, found ${count}`);
  const labels = await loaders.allInnerTexts();
  notes.push(`loader labels ${labels.join(" | ")}`);
  await page.evaluate(() => {
    document.querySelector("[data-verify-root]")?.remove();
  });
  notes.push("removed the demo root during loader motion");
}

export async function auditInstalledDemo({ browser, url, proofDir, bucket }) {
  const notes = [];
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(url).origin });
  const page = await context.newPage();
  const localErrors = [];
  watchPage(page, localErrors);
  let homeViolations = [];
  let manualViolations = [];

  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await page.locator("[data-verify-root]").waitFor({ timeout: 10000 });
    await settleEntrance(page);
    homeViolations = await runAxe(page);
    notes.push(`home axe violations ${homeViolations.length}`);
    for (const violation of homeViolations) {
      pushError(bucket, `axe ${violation.id}: ${violation.help}`);
    }

    const supports = await page.locator("[data-supports-manual]").count();
    const hasHold = (await page.locator("[data-hold-button]").count()) > 0;
    const hasCopy = (await page.locator("[data-copy-button]").count()) > 0;
    const hasLoaders = (await page.locator("[data-inline-loader]").count()) > 0;

    await exerciseTabs(page, notes);
    if (hasLoaders) await exerciseLoaders(page, notes);
    if (!supports) notes.push("page has no manual mode");
    if (supports && (hasHold || hasCopy)) {
      await page.goto(`${url}?manual=1`, { waitUntil: "load", timeout: 45000 });
      await page.locator("[data-manual]").waitFor({ timeout: 5000 });
      await settleEntrance(page);
      manualViolations = await runAxe(page);
      notes.push(`manual axe violations ${manualViolations.length}`);
      for (const violation of manualViolations) {
        pushError(bucket, `axe ${violation.id}: ${violation.help}`);
      }
      if (hasHold) {
        await page.goto(`${url}?manual=1`, { waitUntil: "load", timeout: 45000 });
        await page.locator("[data-manual]").waitFor({ timeout: 5000 });
        await exerciseHold(page, notes);
        await exerciseHoldReduced(browser, url, notes, localErrors);
      }
      if (hasCopy) {
        const again = await context.newPage();
        watchPage(again, localErrors);
        await again.goto(`${url}?manual=1`, { waitUntil: "load", timeout: 45000 });
        await again.locator("[data-manual]").waitFor({ timeout: 5000 });
        await exerciseCopy(again, notes);
        await again.close();
      }
    }

    for (const error of localErrors) pushError(bucket, error);
    fs.writeFileSync(
      path.join(proofDir, "axe.json"),
      `${JSON.stringify({ home: homeViolations, manual: manualViolations }, null, 2)}\n`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notes.push(`audit failed: ${message}`);
    pushError(bucket, `interaction ${message}`);
    fs.writeFileSync(
      path.join(proofDir, "axe.json"),
      `${JSON.stringify({ error: message }, null, 2)}\n`,
    );
  } finally {
    fs.writeFileSync(path.join(proofDir, "interactions.json"), `${JSON.stringify({ notes }, null, 2)}\n`);
    await context.close();
  }
}
