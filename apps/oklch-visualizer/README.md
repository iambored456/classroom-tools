The refactored app now builds as part of the `classroom-tools` monorepo and is published under the
`oklch-visualizer` route.

The selector below the title switches between standard OKLCH and experimental Oklch+.
Slider values are interpreted in the selected space, so switching with the same values changes
the colours. Palettes, spiral lightness steps, gamut searches, the LC graph, and 3D coordinates
all use the selected space. Copied TSV includes a `space` column; HEX output remains sRGB.
Oklch+ chroma uses a 0–0.55 plotting range (OKLCH uses 0–0.4); values above 0.4 are clamped
when switching back to OKLCH. Neither plotting range guarantees a colour is in gamut.

Oklch+ is implemented as a local custom mode in the existing Culori 4 library using
Naoyuki Uchida's [2026 paper, section 3.5](https://arxiv.org/html/2606.05255v1#S3.SS5):
`L' = L^0.73`, `C' = C^0.87 / (C^0.87 + 0.34^0.87)`, and unchanged hue.
The inverse converts back through OKLCH for sRGB rendering and gamut checks.
This is an experimental research model, not a replacement for CSS `oklch()`.
No additional downloaded colour-space package is needed; see
[Culori's custom-mode API](https://culorijs.org/api/#useMode).

Run the conversion regression checks with `pnpm --filter oklch-visualizer test`,
and build with `pnpm --filter oklch-visualizer build`.

Supporting materials from the original top-level project were moved into this folder:

- `legacy/OKLCH Visualizer CodeFolder/`: preserved copy of the original standalone app folder.
- `reference/oklch-picker/`: upstream reference project that was sitting beside the standalone app.
- `research/`: documents and images from the original `0C. OKLCH Visualizer` folder.
