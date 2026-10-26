# Stagger list

`StaggerList` reveals each child with opacity and a 12 pixel rise. Later children start 80 milliseconds after the previous one. The rise is a transform, so the list box does not change size.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `as` | `"div"` or `"ul"` | `"div"` | `ul` wraps each child in an `li`. `div` wraps each child in a `div`. |
| `children` | `ReactNode` | required | One node per row or card. |
| `className` | `string` | `"grid list-none gap-3 p-0"` | Classes on the outer element. Passing `className` replaces the default. |

The component does not render a `tr`. A wrapper inside `tbody` is invalid, and a transformed table row is a separate case.

## Accessibility

With `as="ul"`, the rows are list items. With `as="div"`, the component does not add a list role. Children stay in the accessibility tree while they enter. The animation does not set `aria-hidden` on them.

## Reduced motion

When `useReducedMotion()` is true, each child is in its final opacity and position. Nothing staggers.

The component waits until mount before it chooses motion, so the server render and the first client render match.

## Bundle size

The gzip size is 699 bytes. The minified module is 1,209 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react` and `motion` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
