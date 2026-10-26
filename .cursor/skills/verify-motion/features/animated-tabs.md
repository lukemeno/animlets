# Animated tabs

Animated tabs lets a person see the indicator slide from Overview to Usage.

## Sub-features

- `tabs-slide` moves the indicator during the motion capture.
- `tabs-still` leaves the indicator on Overview when reduced motion is requested.
- `tabs-video` records that capture for 3 seconds.

## How to get to it (user POV)

- Install `animated-tabs` and open the demo page the runner serves.
- The heading is `animlets animated-tabs` on a name run. The tab labels are Overview, Usage, and Billing.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `animated-tabs`, and `public/r/animated-tabs.json` matches the fresh build.

- **Play the slide.** Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs animated-tabs`. `summary.md` contains `motion passed` and `The result is pass.`
- **Watch the video.** Open `proofs/animated-tabs/<run-id>/video.webm`. The indicator leaves Overview and arrives on Usage.
- **Reduced motion.** `summary.md` contains `reduced motion passed`. `screenshot-reduced.png` shows the indicator on Overview.
- **Click a tab.** `interactions.json` records a click on Billing after playback has selected Usage. The billing panel stays visible, and that tab's state is `active`.

## Gotchas

- `Demo` changes the selected tab after 400 milliseconds. `AnimatedTabs` does not move selection by itself.
- The runner clicks Billing. It does not press arrow keys. Keyboard behavior comes from Radix Tabs and is not a separate drive in this command.
- The probe reads `[data-fade-in]` on the indicator. The indicator is a sibling of the triggers, so a slide does not paint over the previous label.
