# Copy button

Copy button lets a person copy a string and see the icon change to a check, or to an error mark when the clipboard rejects the write.

## Sub-features

- `copy-morph` scales the icon from the copy mark to the check during playback.
- `copy-return` scales back to the copy mark before the 3 second capture ends.
- `copy-still` shows the finished check with no scale when reduced motion is requested.
- `copy-fail` shows Copy failed when both clipboard writes reject.
- `copy-video` records the playback morph for 3 seconds.

## How to get to it (user POV)

- Install `copy-button` and open the demo page the runner serves.
- The heading is `animlets copy-button` on a name run. The code text is `demo-token-123`.
- Playback changes the icon on a timer. `/?manual=1` leaves the button idle so a click writes to the clipboard.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `copy-button`, and `public/r/copy-button.json` matches the fresh build.

- **Play the morph.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs copy-button`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/copy-button/<run-id>/video.webm`. The icon becomes a check and later returns to the copy mark.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows the check and the word Copied with no scale change.
- **Click.** `interactions.json` records two clicks on `/?manual=1`. The label becomes Copied, and `navigator.clipboard.readText()` returns the code text `demo-token-123`. The page is then unloaded.

## Gotchas

- `Demo` sets `feedback` on a timer so the recording does not depend on clipboard permission. `CopyButton` still writes the clipboard when the button is activated.
- The manual pass grants clipboard read and write, clicks the button, and requires the clipboard text to equal the code text. A label of Copy failed fails the run.
- The probe reads `[data-fade-in]` on the icon slot. Reduced motion renders that slot as a plain element with no scale.
