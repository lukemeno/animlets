# Success check

Success check lets a person see a checkmark draw next to a confirmation.

## Sub-features

- `check-play` scales the icon and draws the mark during the motion capture.
- `check-still` shows the finished mark when reduced motion is requested.
- `check-video` records that capture for 3 seconds.

## How to get to it (user POV)

- Install `success-check` and open the demo page the runner serves.
- The heading is `animlets success-check` on a name run. The status text is `Account created`.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `success-check`, and `public/r/success-check.json` matches the fresh build.

- **Play the draw.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs success-check`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/success-check/<run-id>/video.webm`. The circle and the check draw, and the text `Account created` is visible.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows the finished mark and `Account created`.

## Gotchas

- The probe reads `[data-fade-in]` on the SVG. A path draw that does not move that element still needs the scale change, or an animation the probe can see.
- The runner does not drive a screen reader. The status role is checked by the accessibility score in the same command.
