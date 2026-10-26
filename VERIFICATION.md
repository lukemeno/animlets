# Verification

These checks cover the root commit `4c7ec1002dcfe1da386cacebc68148209fa2abd7`. That commit has no parent. This file is the commit after it.

## Identity

Command:

```bash
git log --format='%an <%ae> | %cn <%ce>'
```

Output:

```text
lukemeno <185674710+lukemeno@users.noreply.github.com> | lukemeno <185674710+lukemeno@users.noreply.github.com>
```

`git rev-list --parents -n 1 HEAD` prints only `4c7ec1002dcfe1da386cacebc68148209fa2abd7`.

## Secret scans

Both commands ran in a fresh clone of that commit. `gitleaks` is 8.30.1. `trufflehog` is 3.99.7.

```bash
gitleaks detect --source . --no-banner --redact
```

```text
11:10AM INF Unknown SCM platform. Use --platform to include links in findings. host=
11:10AM INF 1 commits scanned.
11:10AM INF scanned ~301042 bytes (301.04 KB) in 133ms
11:10AM INF no leaks found
```

Exit code 0.

```bash
trufflehog git file://. --no-update
```

```text
2026-10-26T11:10:38Z	info-0	trufflehog	finished scanning	{"chunks": 62, "bytes": 301195, "verified_secrets": 0, "unverified_secrets": 0, "scan_duration": "51.58171ms", "trufflehog_version": "3.99.7"}
```

Exit code 0. Verified secrets 0. Unverified secrets 0.

## Working tree search

Case-insensitive ripgrep over the clone, using the four patterns from the release instructions, printed no lines. Exit code 1 from ripgrep means no matches.

## Component proofs

`node .cursor/skills/verify-motion/scripts/verify-motion.mjs doctor` printed `doctor passed`.

Each item was installed with the shadcn CLI from `http://127.0.0.1:8765/r/<item>.json`. That server served the `public/` directory of the tree that became the root commit. The runner scaffolded Next.js 16.4.3 with the App Router, TypeScript, and Tailwind, then ran `shadcn` 4.22.1. Every summary ends with `The result is pass.` Each video is 3.00 seconds. Reduced motion passed on every item. Console errors are 0. Axe violations are 0 on the home page and 0 on the manual page.

Gzip sizes come from two identical runs of `node scripts/gzip-registry.mjs`.

| Item | Gzip bytes | Performance | Accessibility | Best practices | Console errors | Axe violations | Run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fade-in | 366 | 100 | 100 | 100 | 0 | 0 | 20261026T110043161Z-8387-1 |
| number-ticker | 756 | 97 | 100 | 100 | 0 | 0 | 20261026T110043159Z-8386-1 |
| animated-tabs | 1,276 | 97 | 100 | 100 | 0 | 0 | 20261026T105645162Z-6562-1 |
| stagger-list | 699 | 99 | 100 | 100 | 0 | 0 | 20261026T110417750Z-10407-1 |
| success-check | 687 | 100 | 100 | 100 | 0 | 0 | 20261026T110417747Z-10389-1 |
| hold-to-confirm | 2,246 | 97 | 100 | 100 | 0 | 0 | 20261026T105255054Z-4480-1 |
| inline-loader | 1,131 | 99 | 100 | 100 | 0 | 0 | 20261026T110417753Z-10417-1 |
| copy-button | 1,708 | 99 | 100 | 100 | 0 | 0 | 20261026T105255058Z-4488-1 |

`interactions.json` for hold-to-confirm records `Keep holding 2s -> Keep holding 1s -> Deleted` while `prefers-reduced-motion: reduce` matched, and the fill transform stayed still. Copy-button records `clipboard read-back demo-token-123` on both clicks. Animated tabs records `clicked Billing state active` after playback selected Usage.
