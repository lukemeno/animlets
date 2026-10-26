# Inline loader

`InlineLoader` is a loading status with one of three marks. `dots` sits in a sentence or a button row. `bar` spans a card or a table row. `spinner` is an icon beside a label. The set stops there so the item stays one small module.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"dots"` \| `"bar"` \| `"spinner"` | `"dots"` | Which mark to show. Any other runtime value uses dots. |
| `label` | `string` | `"Loading"` | Status text. It is in the accessibility tree in every variant. |
| `className` | `string` | none | Extra classes on the status element. |

## Accessibility

The root has `role="status"` and `aria-live="polite"`. The status text is `label`. The mark is `aria-hidden`, so a screen reader gets the words and not the graphic.

## Reduced motion

When `useReducedMotion()` is true, the looping marks are not mounted.

- Dots become a typographic ellipsis.
- The bar becomes an empty track with a border, not a segment stopped mid-slide.
- The spinner becomes a solid dot, not an arc stopped mid-turn.

`label` stays visible in each case.

The component waits until mount before it chooses motion, so the server render and the first client render match.

## Bundle size

The gzip size is 1,131 bytes. The minified module is 2,651 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
