# Number ticker

Number ticker lets a person see the revenue figure count to its final value.

## Sub-features

- `ticker-play` moves the figure during the motion capture.
- `ticker-still` shows `$12,840` already settled when reduced motion is requested.
- `ticker-video` records that capture for 3 seconds.

## How to get to it (user POV)

- Install `number-ticker` and open the demo page the runner serves.
- The heading is `animlets number-ticker` on a name run. The card label is `Revenue`.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `number-ticker`, and `public/r/number-ticker.json` matches the fresh build.

- **Play the count.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs number-ticker`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/number-ticker/<run-id>/video.webm`. The revenue figure changes during the 3 second clip.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows `$12,840`.

## Gotchas

- The probe reads `[data-fade-in]` on the figure. The polite live region is visually hidden and is not the motion target.
- The runner does not read the live region with a screen reader. Lighthouse accessibility is the automated check in the same command.
- A near-zero flicker does not pass `motion`. The figure has to move by the threshold in the skill.
