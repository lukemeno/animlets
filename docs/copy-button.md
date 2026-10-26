# Copy button

`CopyButton` writes `value` to the clipboard. The icon scales to a check after a successful write, or to an error mark when the write fails. The button text matches that result, and a polite live region announces it.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | The text to write. |
| `idleLabel` | `string` | `"Copy"` | Button text before a write. |
| `copiedLabel` | `string` | `"Copied"` | Button text and announcement after a successful write. |
| `errorLabel` | `string` | `"Copy failed"` | Button text and announcement when the write fails. |
| `resetMs` | `number` | `1600` | How long the result stays visible before the button returns to idle. A non-positive value uses 1600. Ignored when `feedback` is set. |
| `feedback` | `"idle"` \| `"copied"` \| `"error"` | uncontrolled | The visible result. Pass this with `onFeedbackChange` to control it. |
| `onFeedbackChange` | `(feedback) => void` | none | Called with the result of a write. |
| `onCopy` | `(value: string) => void` | none | Called after a successful write. |
| `onError` | `(error: unknown) => void` | none | Called when both clipboard writes fail. |
| `className` | `string` | none | Extra classes on the wrapper. |

## Accessibility

The control is a native button. Its accessible name is the visible label. The icon is `aria-hidden`. A visually hidden live region repeats `copiedLabel` or `errorLabel` when the result changes.

A later click replaces an in-flight write. The component ignores the older result. Unmounting clears the reset timer and ignores a write that resolves after that.

## Clipboard

The button tries `navigator.clipboard.writeText`. If that throws, or the API is missing, it selects a temporary textarea and calls `document.execCommand("copy")`. If that returns false, the button shows `errorLabel`.

## Reduced motion

When `useReducedMotion()` is true, the icon swaps in one frame. It does not scale.

The component waits until mount before it chooses motion, so the server render and the first client render match.

`Demo` sets `feedback` on a timer so a recording shows the check without clipboard permission. `CopyButton` does not change its icon until a write finishes, unless `feedback` is controlled. Open the demo with `?manual=1` to click the real button.

## Bundle size

The gzip size is 1,708 bytes. The minified module is 3,962 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
