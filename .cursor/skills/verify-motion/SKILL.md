---
name: verify-motion
description: Prove an Animlets registry item in a fresh Next.js app. Scaffolds the latest stable Next.js App Router app with Tailwind and TypeScript, installs the item with the shadcn CLI, and records animation, reduced-motion, console, and Lighthouse evidence. Use before a component pull request, or when adding or changing a registry item.
---

# verify-motion

Prove one registry item the way a user installs it. A pull request that adds or changes a component includes the proof bundle for that item.

The repo has no running app. Each run creates a temporary Next.js app, installs one item, and deletes that app. The proof stays in the repo.

## Launch

From the repo root:

```bash
node .cursor/skills/verify-motion/scripts/verify-motion.mjs <item>
```

`<item>` is one of these.

- A kebab-case item name from `registry.json`, such as `fade-in`.
- An `http` or `https` URL whose body is one built registry item JSON file.
- A local path to one built registry item JSON file.

The script runs these commands in a new temp directory. Do not point `shadcn add` at `registry.json`.

```bash
npx --yes create-next-app@latest <app> --ts --tailwind --app --eslint --use-npm --import-alias @/* --disable-git --no-agent-feedback --yes
npx --yes shadcn@latest init --yes --defaults --no-monorepo --force
npx --yes shadcn@latest add <item json url or local item json> --yes --overwrite
npm run build
npm run start -- -p <port> -H 127.0.0.1
```

For an item name, the script first runs `npx --yes shadcn@latest build registry.json --output <temp>/registry` and adds that built item file. `public/r/<name>.json` must match that build.

Ready means `http://127.0.0.1:<port>/` returns HTTP 200 and the page has `[data-verify-root]`. A listening port alone is not ready.

The first cold run installs npm packages in `.cursor/skills/verify-motion/scripts` and downloads Playwright Chromium when they are missing.

## Doctor

Doctor is read-only. Run it when a run looks wrong, and before the first proof of the day.

```bash
node .cursor/skills/verify-motion/scripts/verify-motion.mjs doctor
```

It prints `doctor passed` only when all of these are true.

- Node is 20 or newer.
- `registry.json` has `name`, `homepage`, and `items`.
- `google-chrome`, `ffmpeg`, and `ffprobe` are on `PATH`.
- Playwright and Chromium are installed for this skill.

If Playwright is missing, install it, then run doctor again.

```bash
npm install
npx playwright install chromium
```

Run those in `.cursor/skills/verify-motion/scripts`.

## Drive

Drive the demo page in the temporary app. Do not import the component into a hand-built page outside this runner, and do not call React render helpers instead of the browser.

Stable handles:

- `[data-verify-root]` wraps the demo on the generated page.
- `[data-fade-in]` marks the node the item animates. `fade-in` sets it. If a future item omits it, the probe uses the first element inside `[data-verify-root]`.
- The visible heading is the registry name plus the item name for a name run, or the item title for a URL or file run.

The motion browser context sets `reducedMotion` to `no-preference`. The reduced-motion context sets `reducedMotion` to `reduce`. The runner also calls `page.emulateMedia` with the same value. It reads `matchMedia("(prefers-reduced-motion: reduce)")` before judging the component.

The reduced-motion check uses Playwright. The browser context sets reducedMotion to reduce. That emulates `prefers-reduced-motion: reduce`. The run reads `matchMedia("(prefers-reduced-motion: reduce)")` and samples the demo four times. Each sample records computed opacity, computed transform, and `getAnimations({ subtree: true })` on `[data-verify-root]`. An animation record includes duration and the keyframe property endpoints when the browser exposes them. Opacity and transform come from `[data-fade-in]` when that node exists, and otherwise from the first element inside `[data-verify-root]`. The first reduced-motion sample waits 100 milliseconds after load, and the next samples are 200 milliseconds apart. The check passes when the media query matches, every animation duration is at or below 50 milliseconds, and opacity and transform stay the same. The motion run sets reducedMotion to no-preference and uses the same probe. It passes when the media query does not match and either opacity changes by at least 0.05, transform moves by at least 2 pixels or an equivalent scale or rotation, or an animation longer than 50 milliseconds targets a change that is not a near-zero opacity or transform.

Console errors and page errors fail the run. Warnings are recorded and do not fail it. The runner writes a demo page into the temp app so the installed export has a route. That page is scaffolding. It is deleted with the temp app.

An item must export `Demo` with no required props, or export exactly one component. A single component is rendered with a text child. `fade-in` exports `Demo`.

## Evidence

The proof directory is `proofs/<item-name>/<run-id>/`. The run id is UTC plus the process id and a counter, such as `20261021T201512123Z-4242-1`, so two runs that start in the same second do not share a temp directory. The directory is gitignored. Copy it into the pull request as artifacts. The script prints `summary.md` on stdout.

The bundle contains:

- `video.webm`, a 3 second capture of the motion run.
- `screenshot.png`, the motion page after the fade.
- `screenshot-reduced.png`, the same page with reduced motion.
- `console.log`, browser warnings and errors.
- `reduced-motion.json`, both probes and the check text.
- `lighthouse.json`, the raw Lighthouse report.
- `summary.md`, pass or fail, scores, and artifact paths.
- `run.log`, the commands and their output.

Every run writes `axe.json` and `interactions.json`. Axe waits until finite animations finish, so an entrance fade is scored after it is opaque. Looping animations keep running. Axe violations and failed interaction checks are recorded as console errors, so a clean console means both came back empty. Manual clicks run when the demo renders `data-supports-manual` and the control the check drives.

Lighthouse categories are performance, accessibility, and best practices. Accessibility and best practices must score at least 90. Performance is recorded and has no minimum.

Pass every check in `summary.md`. A missing check is a failure. The result line is `The result is pass.` or `The result is fail.`. The process exits 0 only on pass.

This path installs with the shadcn CLI, builds with `next build`, and serves with `next start`. It does not call a test-only renderer. The temp demo page is the only scaffolding, and cleanup deletes it. Mocks are not used.

## Cleanup

The script kills the Next.js process group it started and deletes `/tmp/verify-motion/<run-id>`. It does not delete `proofs/`.

After a crashed run:

```bash
node .cursor/skills/verify-motion/scripts/verify-motion.mjs clean
```

`clean` reads `server.pid` files under `/tmp/verify-motion` and signals those process groups, then removes that directory. It never kills by process name. It never removes proof files.

Two runs can proceed at the same time. Each run has its own temp directory and its own port. Do not drive a server this run did not start. Do not run `clean` while another run is still going. `clean` stops every temp server and deletes `/tmp/verify-motion`.

## Helpers

The runner and its checks live in `.cursor/skills/verify-motion/scripts/`.

```bash
node .cursor/skills/verify-motion/scripts/verify-motion.mjs doctor
node .cursor/skills/verify-motion/scripts/verify-motion.mjs clean
node .cursor/skills/verify-motion/scripts/verify-motion.mjs fade-in
node .cursor/skills/verify-motion/scripts/verify-motion.mjs https://example.com/r/fade-in.json
node --test .cursor/skills/verify-motion/scripts/lib.test.mjs
```

`lib.mjs` holds the target parser, the render choice, the motion judgments, and the summary formatter. `lib.test.mjs` covers those. `verify-motion.mjs` is the command.

## Maintenance

When the registry or this runner changes, update the feature map under `features/` and run `/maintain-verification-skill`.
