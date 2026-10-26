# Reduced motion

Reduced motion lets a person who asks the system to limit animation see `fade-in` stay still.

## Sub-features

- `reduce-query` turns on `prefers-reduced-motion: reduce` in the browser context.
- `reduce-still` keeps opacity and transform stable and keeps animation durations at or below 50 milliseconds.
- `reduce-shot` captures the still page.

## How to get to it (user POV)

- Install `fade-in`.
- Request reduced motion from the operating system or the browser, then load the demo page.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- The same command as the fade-in feature is the runner. Read the reduced-motion artifacts from that proof. Do not treat the motion video as this result.

- **Emulate the preference.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs fade-in`. The runner opens a second browser context with `reducedMotion` set to `reduce` and calls `emulateMedia` with that value.
- **Confirm the query.** In `reduced-motion.json`, `reducedMotion.mediaMatches` is `true`. If it is `false`, the emulation failed and the item was not judged.
- **Still paint.** `summary.md` contains `reduced motion passed`. The four samples in `reducedMotion.samples` share opacity and transform, and no sample animation duration is above 50 milliseconds.
- **Still frame.** `screenshot-reduced.png` shows `Fade in` already visible, without a second pose.

## Gotchas

- Playwright `reducedMotion: "reduce"` is the switch. Adding a CSS class in the page is not this check.
- Durations at or below 50 milliseconds count as minimal. Anything longer fails.
- The motion video can pass while this check fails. Read `reduced-motion.json`.
- Judge the item only after `mediaMatches` is true. A failed emulation is a failed run, not a skipped one.
- The first sample is 100 milliseconds after load. A 600 millisecond fade that ignored reduced motion is still running then. A later first sample would let that fade finish and still pass.
- A near-zero opacity or transform change does not pass the motion run. The reduced-motion run still fails when opacity or transform changes at all.
