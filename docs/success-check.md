# Success check

`SuccessCheck` draws a circle and a check, then shows `message` beside them. The path draw runs after mount. The message is available immediately.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `message` | `string` | `"Saved"` | The status text. |
| `className` | `string` | none | Extra classes on the row. The row keeps `flex items-center gap-3 text-foreground`. |

## Accessibility

The root has `role="status"`, which is a polite live region. `message` is in the DOM on the first render, including when motion is reduced. The SVG is `aria-hidden`, so the status text is the confirmation a screen reader gets.

## Reduced motion

When `useReducedMotion()` is true, the circle and the check are drawn in full and the icon does not scale.

The component waits until mount before it draws the path, so the server render and the first client render match.

## Bundle size

The gzip size is 687 bytes. The minified module is 1,501 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
