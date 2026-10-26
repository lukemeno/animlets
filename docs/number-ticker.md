# Number ticker

`NumberTicker` counts from `from` to `value` with a spring and renders the final value when reduced motion is requested.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | The value the count ends on. |
| `from` | `number` | `0` | The value the count starts from. A `from` above `value` counts down. |
| `prefix` | `string` | `""` | Text before the formatted number. |
| `suffix` | `string` | `""` | Text after the formatted number. |
| `format` | `(value: number) => string` | rounded `en-US` integer | Formats the visible number and the announced value. |
| `className` | `string` | `text-4xl font-semibold tracking-tight text-foreground` | Extra figure classes. `tabular-nums` stays applied. |

## Accessibility

The visible figure is `aria-hidden` because it changes on every frame. A visually hidden element with `aria-live="polite"` holds the formatted final value, including `prefix` and `suffix`. That text is present on the first render.

## Reduced motion

When `useReducedMotion()` is true, the component renders the final value. It does not run the spring and it does not move the figure.

The component waits until mount before it chooses motion. `useReducedMotion()` is null during server render, so the server and the first client render both show the final value.

## Bundle size

The gzip size is 756 bytes. The minified module is 1,415 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports, so this number is the item file, not the Motion package. The script checks that the bundle contains `data-fade-in` before it prints the size.
