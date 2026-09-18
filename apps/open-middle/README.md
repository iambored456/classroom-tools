# Open Middle questions

This app is a workspace package. The shared `@classroom-tools/open-middle-core` package contains digit placement, number words, equation feedback, and side totals. The UI lives in this app.

Question data lives in `src/questions/`, with #34, #38, and #40 registered in `src/questions/index.js`. Each definition supplies its title, instructions, digit bank, and layout. #38 uses A + B = C + D; #40 uses A + B = C. #34 uses eight single-digit spaces in a square, with four linked three-digit sums. All reuse digit handling and equation feedback; #34 shows numeric totals at the ends of each equation, with summaries ordered Left, Top, Bottom, Right.

To add a question, create a definition in `src/questions/` and register it in `index.js`. Use a unique numeric `id` for its URL (`#<id>`). Two-digit equations configure `numberCount`, `sides`, instruction placement, and optional side sum toggles. Sum squares configure `slotCount` and four `lines` of shared slot indices, then use the separate `sum-square.js` view. A different operation needs its own evaluation rule. Each question gets a fresh empty puzzle when opened.
