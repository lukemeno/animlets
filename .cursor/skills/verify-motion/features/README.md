# Animlets verification map

This directory is the maintained source for proving a registry item. Read the index, then use the feature file that matches the behavior you need to prove.

## Baseline preconditions

- The working directory is the repo root, the directory that contains `registry.json`.
- Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs doctor` and require the line `doctor passed`.
- Each run creates its own temp app under `/tmp/verify-motion/<run-id>` and binds its own port.
- Do not drive a Next.js server that this run did not start.
- Leave `proofs/` in place. Cleanup removes only the temp app and its server.

## Driving conventions

- Start from the baseline. One verify-motion command installs the item, builds the app, and records every artifact.
- Pass an item name, an item JSON URL, or a local item JSON path. Do not pass `registry.json`.
- Treat the commands below as literal.
- Prefer `[data-verify-root]`, `[data-fade-in]`, and the page heading over coordinates.
- A name run does not prove the URL entry. Run the URL as its own command when that entry is in scope.
- Record the feature id and the proof directory with the result.

## Proof and skip reporting

- The user path is `shadcn add` of the item JSON, then the demo page in a production build.
- UI proof is the 3 second video plus `screenshot.png`. The heading on that shot identifies the item.
- Reduced motion proof is `reduced-motion.json` and `screenshot-reduced.png`.
- Console proof is `console.log`. Any error fails the run.
- Lighthouse proof is `lighthouse.json` and the scores in `summary.md`.
- Report an entry point you did not run as not run. Do not treat a name run as a URL run.

## Feature entry contract

Each feature file starts with an H1 and one paragraph. It then uses these four H2 headings, in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-motion`
4. `Gotchas`

## Features

- [Install an item](./install-item.md) covers name, URL, and local JSON installs through the shadcn CLI.
- [Fade in](./fade-in.md) covers the sample item's entrance animation.
- [Reduced motion](./reduced-motion.md) covers `prefers-reduced-motion: reduce` for that animation.
- [Number ticker](./number-ticker.md) covers the count on a KPI figure.
- [Animated tabs](./animated-tabs.md) covers the sliding tab indicator.
- [Stagger list](./stagger-list.md) covers the staggered entrance of rows.
- [Success check](./success-check.md) covers the confirmation check.
- [Hold to confirm](./hold-to-confirm.md) covers the press-and-hold destructive action.
- [Inline loader](./inline-loader.md) covers the dots, bar, and spinner status marks.
- [Copy button](./copy-button.md) covers the clipboard button and its icon change.
