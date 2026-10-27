# Open Middle questions

37 activities are available, including #59 Fractions on a Number Line and #109 Comparing Fractions from Open Middle. The September 2026 worksheet collection originally supplied 37 activities from 38 files; the ladybug and cutouts-board activities are currently hidden. The two #180 files have identical content and share one activity. Source coverage and mathematical corrections are documented in [SOURCE-MAP.md](SOURCE-MAP.md).

**#59 Fractions on a Number Line** is available at `#59`. Use digits 0–5 at most once in five numerators over the fixed denominators 2, 3, 4, 6, and 8. Drag the completed fractions onto the number line, then move them to show the correct order and spacing. Equivalent fractions share a point, and improper fractions are allowed. Tap placement, keyboard movement, optional tick snapping, checking, reset, and saved progress support the same activity.

**#109 Comparing Fractions** is available at `#109-comparing-fractions`. Choose four unique digits from 1–9 to make one fraction strictly below ½ and another strictly above ½. Improper fractions are accepted above ½; printed benchmark digits do not use bank digits. It shares the existing paper theme, circular digit controls, feedback, keyboard/drag/tap input, reset, and saved attempts. The existing #109 Equivalent Fractions retains its `#109` link.

Run `pnpm --filter open-middle dev` from the repository root, then open `http://localhost:5194/open-middle/`. Use `pnpm --filter open-middle test` for the shared model and all activity tests, and `pnpm --filter open-middle build` for the production bundle.

Landing-page links show a screenshot preview while the pointer hovers over them. The previews omit navigation controls, ignore pointer events, and use a fresh, empty activity state. After changing question layouts or styling, run `pnpm --filter open-middle capture:previews` to regenerate images for the available activities in `public/question-previews/` and rebuild the app.

## Drag Assist for smartboards

In a number activity, open Settings and enable **Drag Assist** to keep a move active through brief contact interruptions. It is off initially; the choice is saved in this browser across activities and reloads. Touch, pen, and primary mouse input are supported, including boards that report mouse input. If browser storage is blocked, the setting still works for the current session.

During a drag, lifting keeps the number visible for 300 ms. Touch within 48 CSS pixels of its last position to continue the same move. An intentional release settles after this short pause; an abandoned or cancelled move leaves its source unchanged. A dashed outline indicates the reconnect window. Tap a digit and then a space, or use the existing keyboard controls, as alternatives.

The shared controller covers #34/#38/#40, catalog digit tasks, the numerator digits and complete fractions in #59, and coordinate question #495. Domino dragging retains its existing behavior. Reset, navigation, challenge changes, dialogs, Escape, page hiding, and window blur clear pending gestures. Puzzle state changes only when a drop commits.

Focused verification: `node --test apps/open-middle/src/drag-assist.test.js` from the repository root. With the Open Middle dev server running, run `node apps/open-middle/scripts/verify-drag-assist.mjs`; `OPEN_MIDDLE_URL` can select another local server. The browser harness uses a separate headless Chromium context and covers interruption recovery, native mouse/touch, click suppression, unique/repeated digits, settings, cleanup, storage restrictions, and fitted layouts. It never uses the teacher's browser session. Run `pnpm --filter open-middle build` for production validation.

Local verification passed on October 25, 2026: 35 focused controller/model tests, browser checks, and the production build. Real smartboard testing is still needed to confirm whether its dropout timing fits the initial 300 ms / 48 px values.

## Activity types

- `src/questions/index.js` registers and sorts the entire library. Numeric and string IDs are supported, with stable `#<id>` links and a landing page listing all activities in one left-aligned column.
- `src/questions/34.js`, `38.js`, and `40.js` retain the existing sum square and two-digit equation experiences, including base-ten blocks and side totals. Their digit handling comes from `@classroom-tools/open-middle-core`.
- `src/numeric-catalog.js` defines 24 number, fraction, decimal, percent, geometry, and probability tasks. Diagrams use structured slot/group/fraction tokens; each rule has its own evaluator. Cross-products and integer hundredths avoid floating-point equality errors.
- `src/numeric-view.js` implements digit dragging, select-and-place, keyboard entry, reset, challenge modes, automatic feedback, and up to 20 saved arrangements per question. Digit activities use circular spaces and live green/red highlighting when complete; instructions are in Help and saved arrangements are in Settings. Unique-digit tasks swap placed digits; repeatable tasks retain the bank.
- `src/manipulatives.js` supplies ladybug spots, domino arrangement/flipping, shared boards, fraction number-line placement, and coordinate plots with three possible pairings. `src/fraction-line-model.js` checks unique numerator digits and number-line spacing and handles pointer/keyboard position conversion. Domino corner cells contribute to both adjacent side totals. Line comparisons use integer cross and dot products, including vertical, coincident, and degenerate lines.
- `src/explorations.js` provides apple stories, editable dice outcome tables, the corner-rope model, rounded backpay, and grid/staggered coin arrangements, with checkable responses and written reasoning.

The new activities save work in local browser storage. Numeric and exploration tasks can save attempts; resets preserve those attempts. Original #34/#38/#40 retain their previous fresh-on-open behavior. No server or account is required, and source DOCX files are not runtime dependencies.

## Rules and validation

Student diagrams and explicit prompt constraints govern the activities. Copied teacher headings, invalid example equations, and answer-count claims are not displayed as authoritative solutions. Tests enumerate the extrema for #33/#43/#53/#180 and exact solutions for #116/#279, and cover fractions, repeating digits, invalid denominators, probability, domino orientations, geometry, rounding, and coin fit.

For the ambiguous source wording, #33/#43 use positive differences; #53 uses each chosen digit at most once. These assumptions are visible in the activity instructions. Multi-digit numbers in the new tasks that accept zero cannot begin with zero unless the slots represent a decimal part. The original two-digit tasks retain their previous leading-zero convention. In #71 the printed zero does not consume a movable digit. #279 has a repeatable base task and a unique-digit challenge, each with two-digit percent, quantity, and result.

The coin model uses the worksheet's stated 18 mm diameter. It checks the proposed arrangement without claiming a global packing optimum. Backpay uses the stipulated rounding of each pay stub before subtraction. These are classroom models, with their assumptions shown alongside the controls.
