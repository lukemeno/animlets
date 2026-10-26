# Stagger list

Stagger list lets a person see account rows appear one after another.

## Sub-features

- `stagger-play` fades and raises the first row during the motion capture.
- `stagger-still` shows every row settled when reduced motion is requested.
- `stagger-video` records that capture for 3 seconds.

## How to get to it (user POV)

- Install `stagger-list` and open the demo page the runner serves.
- The heading is `animlets stagger-list` on a name run. The first row is Northwind.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `stagger-list`, and `public/r/stagger-list.json` matches the fresh build.

- **Play the stagger.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs stagger-list`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/stagger-list/<run-id>/video.webm`. The rows appear in order, and the card positions do not jump.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows all four rows.

## Gotchas

- The probe reads `[data-fade-in]` on the first row. Later rows can still be entering after that node has settled.
- The runner does not measure layout shift with a score. The video is the check that the rows keep their box.
