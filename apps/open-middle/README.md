# Open Middle questions

57 activities are available, including #59 Fractions on a Number Line and #109 Comparing Fractions from Open Middle. The September 2026 worksheet collection originally supplied 37 activities from 38 files; the ladybug and cutouts-board activities are currently hidden. The two #180 files have identical content and share one activity. Source coverage and mathematical corrections are documented in [SOURCE-MAP.md](SOURCE-MAP.md).

**Additional number tasks:** #29 Order Numbers, #51 Adding 3-Digit Numbers, #73 Multiplication, #81–82 Rounding, and #86 Subtraction with Zeros join the existing subtraction activities. Their source prompts, mathematical goals, and input controls are documented below and in SOURCE-MAP.md.

**#89, #90, #107, #108, #117, and #118** add mixed-number equations, comparison of thousandths, constant-change patterns, and decimal labels on a number line. Existing **#119 Decomposing Tenths and Hundredths** remains available without a duplicate entry. All use the existing draggable digits, keyboard input, saved work, reset, and live feedback.

**#142–144 Canadian Pocket Change** use a reusable coin bank and a canvas. Drag coins to add or move them; drag them back to the bank or select and remove them. Tap/Enter adds a coin, arrow keys move a focused coin, and Delete removes it. The CAD total and denomination counts update immediately using integer cents. #142 uses pennies, nickels, and dimes to make $1.00; #143 requires equal counts totaling $1.44; #144 requires exactly 15 coins totaling $1.00 and also offers quarters, loonies, and toonies. The Canadian penny is retained as a teaching manipulative to preserve the original targets. Coin positions and amounts are saved separately for each question. Focused checks: `node --test apps/open-middle/src/numeric-catalog.test.js apps/open-middle/src/money-model.test.js`; browser checks: `OPEN_MIDDLE_URL=<local URL> node apps/open-middle/scripts/verify-fractions-and-money.mjs`. Add `--capture` to regenerate previews or `--money-only` to check just the coin canvases.

**#59 Fractions on a Number Line** is available at `#59`. Use digits 0–5 at most once in five numerators over the fixed denominators 2, 3, 4, 6, and 8. Drag the completed fractions onto the number line, then move them to show the correct order and spacing. Equivalent fractions share a point, and improper fractions are allowed. Tap placement, keyboard movement, optional tick snapping, checking, reset, and saved progress support the same activity.

**#109 Comparing Fractions** is available at `#109-comparing-fractions`. Choose four unique digits from 1–9 to make one fraction strictly below ½ and another strictly above ½. Improper fractions are accepted above ½; printed benchmark digits do not use bank digits. It shares the existing paper theme, circular digit controls, feedback, keyboard/drag/tap input, reset, and saved attempts. The existing #109 Equivalent Fractions retains its `#109` link.

Run `pnpm --filter open-middle dev` from the repository root, then open `http://localhost:5194/open-middle/`. Use `pnpm --filter open-middle test` for the shared model and all activity tests, and `pnpm --filter open-middle build` for the production bundle.

**#43 and #44 subtraction blocks:** one combined base 10 visualization sits beneath the equation. Shared amounts are grey, crossed-out blocks; the positive difference stays solid, and a negative difference uses bare strikes without a block behind them. The model updates while placing digits. The answer appears after `=` only when every digit space is filled; #44 keeps its goal of getting close to 39. Focused checks: `node --test apps/open-middle/src/subtraction-visual.test.js`.

Landing-page links show a screenshot preview while the pointer hovers over them. The previews omit navigation controls, ignore pointer events, and use a fresh, empty activity state. After changing question layouts or styling, run `pnpm --filter open-middle capture:previews` to regenerate images for the available activities in `public/question-previews/` and rebuild the app.

**#56 and #57 Closest Difference to 200:** both reuse the circular digit controls, centered subtraction equation, live base-ten cancellation blocks, keyboard/drag/tap placement, reset, and saved attempts from #43/#44. #56 chooses six distinct digits from 1–9 and calculates the answer; the closest possible differences are 198 and 202. #57 uses 1–9 exactly once across both operands and the entered three-digit answer; 196 is optimal. Feedback checks the equation before the distance from 200.

**#68, #84 and #85 subtraction activities:** #68 keeps the printed 4 and 1 in 4□□ − 1□□ and accepts answers strictly closer to 200 than 300; repeating digits are allowed, with an optional unique-digit challenge. #84 has two independent equations of □□□ − 291 = □□□, each with its own digit bank and live blocks; both equations must be true and different. The printed 291 does not use bank digits. #85 uses six distinct input digits and a calculated answer, aiming for 329 exactly. All three share the existing paper theme, input controls, reset and saved attempts.

## Question controls

Every question has Help, QR code, and Fullscreen controls in that order. Settings appear below the instructions in Help, including saved attempts for numeric activities. The QR popup shares the current question’s direct link; local previews share its published GitHub Pages URL. The landing-page QR continues to share the activity collection.

With the dev server running, `node apps/open-middle/scripts/verify-question-controls.mjs` checks every question’s controls and QR destination, saved preferences and attempts, fullscreen/reset, and 320px/390px layouts. These browser checks, five QR URL tests, and the production build passed on October 27, 2026.

## Drag Assist for smartboards

In a number activity, open Help and enable **Drag Assist** in the Settings section at the bottom to keep a move active through brief contact interruptions. It is off initially; the choice is saved in this browser across activities and reloads. Touch, pen, and primary mouse input are supported, including boards that report mouse input. If browser storage is blocked, the setting still works for the current session.

During a drag, lifting keeps the number visible for 300 ms. Touch within 48 CSS pixels of its last position to continue the same move. An intentional release settles after this short pause; an abandoned or cancelled move leaves its source unchanged. A dashed outline indicates the reconnect window. Tap a digit and then a space, or use the existing keyboard controls, as alternatives.

The shared controller covers #34/#38/#40, catalog digit tasks, the numerator digits and complete fractions in #59, and coordinate question #495. Domino dragging retains its existing behavior. Reset, navigation, challenge changes, dialogs, Escape, page hiding, and window blur clear pending gestures. Puzzle state changes only when a drop commits.

Focused verification: `node --test apps/open-middle/src/drag-assist.test.js` from the repository root. With the Open Middle dev server running, run `node apps/open-middle/scripts/verify-drag-assist.mjs`; `OPEN_MIDDLE_URL` can select another local server. The browser harness uses a separate headless Chromium context and covers interruption recovery, native mouse/touch, click suppression, unique/repeated digits, settings, cleanup, storage restrictions, and fitted layouts. It never uses the teacher's browser session. Run `pnpm --filter open-middle build` for production validation.

Local verification passed on October 25, 2026: 35 focused controller/model tests, browser checks, and the production build. Real smartboard testing is still needed to confirm whether its dropout timing fits the initial 300 ms / 48 px values.

## Activity types

- `src/questions/index.js` registers and sorts the entire library. Numeric and string IDs are supported, with stable `#<id>` links and a landing page listing all activities in one left-aligned column.
- `src/questions/34.js`, `38.js`, and `40.js` retain the existing sum square and two-digit equation experiences, including base-ten blocks and side totals. Their digit handling comes from `@classroom-tools/open-middle-core`.
- `src/numeric-catalog.js` defines 41 number, fraction, decimal, percent, geometry, and probability tasks. Diagrams use structured slot/group/fraction tokens; each rule has its own evaluator. Cross-products and integer hundredths avoid floating-point equality errors.
- `src/numeric-view.js` implements digit dragging, select-and-place, keyboard entry, reset, challenge modes, automatic feedback, and up to 20 saved arrangements per question. Digit activities use circular spaces and live green/red highlighting when complete; instructions are in Help and saved arrangements are in the Settings section of Help. Unique-digit tasks swap placed digits; repeatable tasks retain the bank.
- `src/manipulatives.js` supplies ladybug spots, domino arrangement/flipping, shared boards, fraction number-line placement, and coordinate plots with three possible pairings. `src/fraction-line-model.js` checks unique numerator digits and number-line spacing and handles pointer/keyboard position conversion. Domino corner cells contribute to both adjacent side totals. Line comparisons use integer cross and dot products, including vertical, coincident, and degenerate lines.
- `src/explorations.js` provides apple stories, editable dice outcome tables, the corner-rope model, rounded backpay, and grid/staggered coin arrangements, with checkable responses and written reasoning.

The new activities save work in local browser storage. Numeric and exploration tasks can save attempts; resets preserve those attempts. Original #34/#38/#40 retain their previous fresh-on-open behavior. No server or account is required, and source DOCX files are not runtime dependencies.

## Rules and validation

Student diagrams and explicit prompt constraints govern the activities. Copied teacher headings, invalid example equations, and answer-count claims are not displayed as authoritative solutions. Tests enumerate the extrema for #33/#43/#53/#180 and exact solutions for #116/#279, and cover fractions, repeating digits, invalid denominators, probability, domino orientations, geometry, rounding, and coin fit.

For the ambiguous source wording, #33/#43 use positive differences; #53 uses each chosen digit at most once. These assumptions are visible in the activity instructions. Multi-digit numbers in the new tasks that accept zero cannot begin with zero unless the slots represent a decimal part. The original two-digit tasks retain their previous leading-zero convention. In #71 the printed zero does not consume a movable digit. #279 has a repeatable base task and a unique-digit challenge, each with two-digit percent, quantity, and result.

The coin model uses the worksheet's stated 18 mm diameter. It checks the proposed arrangement without claiming a global packing optimum. Backpay uses the stipulated rounding of each pay stub before subtraction. These are classroom models, with their assumptions shown alongside the controls.
