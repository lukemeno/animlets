# Fade in

Fade in lets a person see the installed sample move from transparent and slightly lower to fully visible.

## Sub-features

- `fade-play` changes opacity by at least 0.05 or transform by at least 2 pixels, or runs an animation longer than 50 milliseconds that is not a near-zero opacity or transform change.
- `fade-video` records that capture for 3 seconds.
- `fade-settled` shows the readable final text in `screenshot.png`.

## How to get to it (user POV)

- Install `fade-in` and open the demo page the runner serves.
- The heading is `animlets fade-in` on a name run. The animated text is `Fade in`.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- The motion context forces `reducedMotion` to `no-preference`. A host that prefers reduced motion must not leak into this capture.

- **Play the fade.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs fade-in`. `summary.md` contains `motion passed`. `reduced-motion.json` has `motion.mediaMatches` set to `false` and `motion.pass` set to `true`.
- **Watch the video.** Open `proofs/fade-in/<run-id>/video.webm`. The text `Fade in` appears over the 3 second clip. `ffprobe` reports a duration from 2.8 to 3.2 seconds. `summary.md` contains `video passed`.
- **Settled frame.** Open `screenshot.png` from the same directory. The heading `animlets fade-in` and the text `Fade in` are both visible.

## Gotchas

- The fade starts after mount, so the component can hydrate without a server and client HTML mismatch. Sample through the first second. A single late screenshot can miss the motion.
- Judge `[data-fade-in]`, not the page heading. The heading does not move.
- A component that never animates fails `motion`, even when reduced motion passes.
- The reduced-motion screenshot is not evidence for this feature.
