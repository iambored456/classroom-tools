# Numberle

A standalone Svelte classroom adaptation of the equation-guessing game at https://numberle.org/. This is an original implementation; it does not embed the reference site's code, advertising, or services.

Guess the exact equation in six attempts. Includes 5–12 symbols, four selectable target operators, hard mode, unlimited or local-date daily puzzles, teacher-set answers, statistics, copyable spoiler-free results, dark/high-contrast modes, and keyboard/touch input. Progress stays in local storage; no account or backend is required. Daily puzzles are deterministic for the same date, length, and operator selection. They are generated locally and do not match numberle.org's daily answers.

## Development

From the repository root:

```sh
pnpm install
pnpm dev:numberle
pnpm --filter numberle test
pnpm --filter numberle typecheck
pnpm --filter numberle build
```

Open http://localhost:5196/numberle/ or launch the full hub with `pnpm dev`. The existing Pages build and assembly scripts discover this app automatically. For a standalone Pages build, set `BASE_URL=/classroom-tools/numberle/`.

The parser uses exact rational arithmetic and ordinary operator precedence, without `eval`. Right-hand results are non-negative integers; leading zeros, unary operators, parentheses, and division by zero are rejected. Fractional intermediate results are permitted. Hard mode retains correct positions and minimum revealed symbol counts. Operator settings restrict generated answers, not guesses or teacher-set answers.

To project a custom puzzle, open Settings → Set a classroom equation, enter the answer, and start before displaying the board. The answer is stored locally and revealed when the game ends; this is a classroom aid, not a secure assessment system.
