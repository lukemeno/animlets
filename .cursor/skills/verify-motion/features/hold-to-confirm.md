# Hold to confirm

Hold to confirm lets a person press and hold a destructive button until it confirms, or confirm in one action.

## Sub-features

- `hold-fill` grows the fill while the pointer or Space or Enter stays down.
- `hold-release` cancels the action when the press ends early.
- `hold-direct` confirms from Confirm without holding.
- `hold-still` shows a seconds countdown instead of the fill when reduced motion is requested.
- `hold-video` records the playback hold for 3 seconds.

## How to get to it (user POV)

- Install `hold-to-confirm` and open the demo page the runner serves.
- The heading is `animlets hold-to-confirm` on a name run. The card title is Project Atlas. The hold button starts as Delete project.
- Playback presses the hold button for the recording. `/?manual=1` leaves the button idle so a pointer or keyboard press can drive it.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `hold-to-confirm`, and `public/r/hold-to-confirm.json` matches the fresh build.

- **Play the hold.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs hold-to-confirm`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/hold-to-confirm/<run-id>/video.webm`. The rose button fills, then turns green and reads Deleted.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows Keep holding and a seconds count, with Confirm without holding still available.
- **Interrupt.** `interactions.json` records an early pointer release, a second hold that confirms, Confirm without holding, an early Space release, and an unmount during Space.
- **Reduced-motion countdown.** The same file records a hold under `prefers-reduced-motion: reduce`. The label shows `2s`, then `1s`, then `Deleted`, and the fill transform stays still.

## Gotchas

- `Demo` starts the hold on the default page. `HoldToConfirm` does not start a hold by itself.
- The runner's manual pass uses `/?manual=1`. A name run without that query still records playback.
- The probe reads `[data-fade-in]` on the fill. Reduced motion renders that node with `sr-only` and does not scale it.
