# Hold to confirm

`HoldToConfirm` is a button for a destructive action. The action runs after the pointer, or Space, or Enter, stays down for `durationMs`. Releasing early cancels it. A second button, Confirm without holding, runs the same action on one click.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `"Delete"` | Accessible name while the button is idle. |
| `holdingLabel` | `string` | `"Keep holding"` | Button text during the hold. |
| `successLabel` | `string` | `"Deleted"` | Button text after confirmation. |
| `durationMs` | `number` | `1200` | How long the hold must last. A non-positive value uses 1200. |
| `onConfirm` | `() => void` | none | Called once when the hold completes or Confirm without holding is used. |
| `className` | `string` | none | Extra classes on the group. |

## Accessibility

The hold control is a native button. Its accessible name is the visible text. A description, linked with `aria-describedby`, tells the user to press and hold, and names Confirm without holding.

Space and Enter follow the [button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/). The key has to stay down for `durationMs`. The component calls `preventDefault` on keydown so the browser does not also activate the button on keyup. Key repeat is ignored. Releasing the key, blurring the button, or releasing the pointer early cancels the hold.

People who cannot sustain a press use Confirm without holding. That control is a native button, so one click, Space, or Enter confirms. This is the path that removes the time limit for [WCAG 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).

A polite live region announces "Holding. Release to cancel.", "Cancelled.", or "Confirmed." A progressbar exposes the fill as a percent. The fill and the check icon are `aria-hidden`.

## Reduced motion

When `useReducedMotion()` is true, the fill does not scale. During the hold the button shows `holdingLabel` and a seconds countdown. The countdown is `aria-hidden` so the button name stays stable. Confirmation still waits for `durationMs`, and Confirm without holding is unchanged.

The component waits until mount before it chooses motion, so the server render and the first client render match.

`Demo` starts a hold so a recording can show the fill. `HoldToConfirm` does not start a hold on its own. Open the demo with `?manual=1` to press the button yourself.

## Bundle size

The gzip size is 2,246 bytes. The minified module is 5,322 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
