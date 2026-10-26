# Animated tabs

`AnimatedTabs` renders a tab list with a shared indicator. The indicator is one pill behind the labels. It springs to the measured box of the active tab. The tabs are Radix Tabs (`@radix-ui/react-tabs`).

A `layoutId` pill inside the newly active trigger paints over the previous label while it moves. The pill is a sibling of the triggers so the labels stay visible.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tabs` | `{ value: string; label: string; content: ReactNode }[]` | required | One entry per tab. An empty array renders nothing. |
| `label` | `string` | `"Sections"` | Accessible name of the tab list. |
| `value` | `string` | uncontrolled | The selected tab. Pass this with `onValueChange` to control selection. |
| `defaultValue` | `string` | the first tab | Initial selection when `value` is omitted. |
| `onValueChange` | `(value: string) => void` | none | Called when the selected tab changes. |
| `className` | `string` | none | Classes on the root. |

## Accessibility

Radix Tabs provides the keyboard behavior. Arrow keys move between tabs. Home and End move to the ends. Tab moves from the list into the active panel. Each trigger's accessible name is its `label`. The indicator is `aria-hidden`.

Labels use the foreground color on the muted track. The pill shows which tab is selected. An earlier muted-foreground gray measured 4.34 to 1 on that track, under the 4.5 minimum.

`Demo` selects the second tab after 400 milliseconds so a recording can show the slide. `AnimatedTabs` does not change the selection on its own.

## Reduced motion

When `useReducedMotion()` is true, the indicator is a static box on the active tab. Changing tabs moves that box in one frame. `Demo` stays on the first tab in that case, so the reduced-motion recording does not switch tabs.

The component waits until mount before it mounts the moving indicator, so the server render and the first client render match.

## Bundle size

The gzip size is 1,276 bytes. The minified module is 2,576 bytes.

`node scripts/gzip-registry.mjs` measured that on two runs, and both runs printed the same bytes. The command bundles the item with esbuild (`--minify --format=esm --jsx=automatic --packages=external`) and compresses the result with gzip level 9. `react`, `motion`, and `@radix-ui/react-tabs` stay as imports. The script checks that the bundle contains `data-fade-in` before it prints the size.
