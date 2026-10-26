# Inline loader

Inline loader lets a person see dots, a bar, or a spinner next to a loading status.

## Sub-features

- `loader-dots` bounces three dots beside Saving.
- `loader-bar` slides a segment across Loading report.
- `loader-spinner` rotates an arc beside Refreshing.
- `loader-still` replaces each moving graphic with a still mark when reduced motion is requested.
- `loader-video` records the three marks for 3 seconds.

## How to get to it (user POV)

- Install `inline-loader` and open the demo page the runner serves.
- The heading is `animlets inline-loader` on a name run. The card shows Saving, Loading report, and Refreshing.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `inline-loader`, and `public/r/inline-loader.json` matches the fresh build.

- **Play the marks.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs inline-loader`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/inline-loader/<run-id>/video.webm`. The dots bounce, the bar segment travels, and the spinner rotates.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows the three labels with a still ellipsis, an empty track, and a solid dot.
- **Unmount.** `interactions.json` records removal of the demo root while the marks are moving.

## Gotchas

- The probe reads the first `[data-fade-in]`, on the Saving mark. That mark moves on entrance. The bar and spinner animations are extra.
- Reduced motion does not mount the looping Motion nodes. A frozen frame of those loops is not the fallback.
