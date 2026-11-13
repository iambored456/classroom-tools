# Math typesetting

The substitution scene uses MathJax 4 with the Fira Math font. Atkinson Hyperlegible remains the interface font.

Edit `src/math/system.js` to change the equation templates or presets, then run:

```sh
pnpm --filter numeracy-tools generate:math
pnpm --filter numeracy-tools check:math
```

Commit the generated `src/math/generated.json` alongside the notation changes. The preset SVG paths are bundled by Vite. Applying custom equations loads a local MathJax chunk to prepare the new lesson before playback. The generator is explicit and does not change the Pages build workflow.

`MathSvg.svelte` positions glyphs by their mathematical baseline. `src/math/layout.ts` uses their actual bounds to space solution rows, with room for stacked fractions. Scene descriptions retain readable equation and operation descriptions for assistive technology; the individual SVG fragments are decorative within that labelled scene.

MathJax and its Fira font package are Apache-2.0 licensed. The underlying Fira fonts are SIL OFL-1.1 licensed. See `public/THIRD-PARTY-NOTICES.txt` for the bundled font attribution and license.
