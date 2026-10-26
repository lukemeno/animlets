# Install an item

Install an item lets a person add one Animlets registry item to a Next.js app with the shadcn CLI and see it on a page.

## Sub-features

- `install-name` resolves a kebab-case name through `registry.json`, builds the item JSON, and installs that file.
- `install-url` installs an item from an `http` or `https` URL of its JSON.
- `install-file` installs a local built item JSON file.
- `install-rendered` shows the installed export on the demo page after `next build`.

## How to get to it (user POV)

- Pass the item name to verify-motion. For the sample, that name is `fade-in`.
- Pass the URL of the built item JSON.
- Pass a local path to the built item JSON, such as `public/r/fade-in.json`.

## Driving it with verify-motion

Preconditions:

- Doctor printed `doctor passed`.
- `registry.json` lists `fade-in`.
- `public/r/fade-in.json` exists and matches `shadcn build` when the target is a name.

- **Name entry.** Install `fade-in` from the source registry. Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs fade-in`. The process exits 0. `summary.md` contains `shadcn add passed` and `The result is pass.` `screenshot.png` shows the heading `animlets fade-in`.
- **File entry.** Install the committed item JSON. Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs public/r/fade-in.json`. The process exits 0. `summary.md` shows the add target ending in `fade-in.json`.
- **URL entry.** Serve `public/r/fade-in.json` over HTTP and pass that URL. Run `node .cursor/skills/verify-motion/scripts/verify-motion.mjs http://127.0.0.1:<port>/fade-in.json` with a port you opened for that file. The process exits 0. `summary.md` shows that same URL as the add target.
- **Rendered item.** Open the heading in the screenshot from the run you just finished. The page shows `Fade in` inside `[data-verify-root]`.

## Gotchas

- `shadcn add fade-in` without a registry namespace installs the official shadcn item of that name, not this repo. verify-motion adds the built JSON file or URL instead.
- `shadcn add registry.json` is the catalog, not an item. The runner rejects a JSON object that has an `items` array or that has no `files` array. Pass the item file.
- A name run checks `public/r/<name>.json` against a fresh `shadcn build`. If they differ, the run fails until you rebuild and commit `public/r`.
- A name run does not prove the URL entry. Say the URL entry was not run.
- The temp Next.js app is deleted at the end. The proof under `proofs/` is the evidence.
