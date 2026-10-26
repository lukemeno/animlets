# Animlets

Small animated components for shadcn/ui. One command each.

Animlets is an open shadcn registry of animated React and Tailwind components. The components are built with [Motion](https://motion.dev).

## Install

`registry.json` is the catalog. `npx shadcn@latest build registry.json` writes one installable file per item under `public/r`. Add an item with the shadcn CLI and the raw URL of that file. Pass the item file, not `registry.json`.

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/fade-in.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/number-ticker.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/animated-tabs.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/stagger-list.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/success-check.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/hold-to-confirm.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/inline-loader.json
```

```bash
npx shadcn@latest add https://raw.githubusercontent.com/lukemeno/animlets/main/public/r/copy-button.json
```

Item notes for everything except `fade-in` are in `docs/`.

## Reduced motion

Each component calls `useReducedMotion` from Motion. When you prefer reduced motion, the component skips the movement or swaps it for a static state. The component waits until mount before it chooses, so the server HTML and the first client render match.

## License

Animlets is licensed under the MIT License. The copyright holder is lukemeno. See [LICENSE](LICENSE).
