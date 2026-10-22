# Open Middle questions

37 interactive activities cover all 38 supplied September 2026 worksheets. The two #180 files have identical content and share one activity. Both #13 versions are separate activities; the domino cutouts become a reusable board with both tile sets. Source coverage and mathematical corrections are documented in [SOURCE-MAP.md](SOURCE-MAP.md).

Run `pnpm --filter open-middle dev` from the repository root, then open `http://localhost:5194/open-middle/`. Use `pnpm --filter open-middle test` for the shared model and all activity tests, and `pnpm --filter open-middle build` for the production bundle.

Landing-page links show a screenshot preview while the pointer hovers over them. The previews omit navigation controls, ignore pointer events, and use a fresh, empty activity state. After changing question layouts or styling, run `pnpm --filter open-middle capture:previews` to regenerate the 37 images in `public/question-previews/` and rebuild the app.

## Activity types

- `src/questions/index.js` registers and sorts the entire library. Numeric and string IDs are supported, with stable `#<id>` links and a searchable landing page.
- `src/questions/34.js`, `38.js`, and `40.js` retain the existing sum square and two-digit equation experiences, including base-ten blocks and side totals. Their digit handling comes from `@classroom-tools/open-middle-core`.
- `src/numeric-catalog.js` defines 23 number, fraction, decimal, percent, geometry, and probability tasks. Diagrams use structured slot/group/fraction tokens; each rule has its own evaluator. Cross-products and integer hundredths avoid floating-point equality errors.
- `src/numeric-view.js` implements digit dragging, select-and-place, keyboard entry, reset, challenge modes, automatic feedback, and up to 20 saved arrangements per question. Digit activities use circular spaces and live green/red highlighting when complete; instructions are in Help and saved arrangements are in Settings. Unique-digit tasks swap placed digits; repeatable tasks retain the bank.
- `src/manipulatives.js` supplies ladybug spots, domino arrangement/flipping, shared boards, and coordinate plots with three possible pairings. Domino corner cells contribute to both adjacent side totals. Line comparisons use integer cross and dot products, including vertical, coincident, and degenerate lines.
- `src/explorations.js` provides apple stories, editable dice outcome tables, the corner-rope model, rounded backpay, and grid/staggered coin arrangements, with checkable responses and written reasoning.

The new activities save work in local browser storage. Numeric and exploration tasks can save attempts; resets preserve those attempts. Original #34/#38/#40 retain their previous fresh-on-open behavior. No server or account is required, and source DOCX files are not runtime dependencies.

## Rules and validation

Student diagrams and explicit prompt constraints govern the activities. Copied teacher headings, invalid example equations, and answer-count claims are not displayed as authoritative solutions. Tests enumerate the extrema for #33/#43/#53/#180 and exact solutions for #116/#279, and cover fractions, repeating digits, invalid denominators, probability, domino orientations, geometry, rounding, and coin fit.

For the ambiguous source wording, #33/#43 use positive differences; #53 uses each chosen digit at most once. These assumptions are visible in the activity instructions. Multi-digit numbers in the new tasks that accept zero cannot begin with zero unless the slots represent a decimal part. The original two-digit tasks retain their previous leading-zero convention. In #71 the printed zero does not consume a movable digit. #279 has a repeatable base task and a unique-digit challenge, each with two-digit percent, quantity, and result.

The coin model uses the worksheet's stated 18 mm diameter. It checks the proposed arrangement without claiming a global packing optimum. Backpay uses the stipulated rounding of each pay stub before subtraction. These are classroom models, with their assumptions shown alongside the controls.
