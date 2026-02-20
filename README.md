# classroom-tools

## Build-time preview capture

Regenerate Hub app-card screenshots from built app outputs:

```bash
pnpm run build:pages
```

Run capture directly (after building app dists):

```bash
pnpm run capture:previews
pnpm run capture:previews -- --list
pnpm run capture:previews -- --only class-clock
pnpm run capture:previews -- --verbose
```

Screenshots are written to `apps/hub/public/images/`.

If Playwright Chromium is not installed yet:

```bash
pnpm exec playwright install chromium
```
