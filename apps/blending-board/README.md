# Blending Board

Local Classroom Tools app at `/blending-board/`. Run `pnpm dev:blending-board` from the monorepo root (port 5197), or open it from Literacy Tools in the Classroom Tools hub.

The board has four colour-coded segment banks with tiles that toggle on and off, a blended word display, recallable word history, a tile picker, editable banks, fullscreen, and local browser persistence. The right sidebar and UFLI lesson dialog follow ReadAlong Highlighter's visual pattern. Choosing a lesson clears the current word/history and loads its banks.

## Lesson data

`src/lessons.json` contains 138 lesson entries, including lettered variants, covering lessons 1–128. The 104 entries for lessons 5–98 have banks; lessons 1–4 and 99–128 are shown disabled and crossed out.

Sources supplied by the user:

- `ufli_blending_drills.xlsx`, worksheet **Blending Drills**, columns A–I. `sourceRow` records the original spreadsheet row.
- `UFLIFO~1.PDF`, 278-page master lesson scan. `pdfPage` is the one-based PDF page position, not the printed manual folio.
- Interface reference: https://ufli.education.ufl.edu/tdr/file/bca9ju45kvvrvoan@research.dwi.ufl.edu_op.n?embed

All 104 printed segment tables were visually checked against the master PDF. `data/pdf-corrections.json` records differences from the spreadsheet, including missing letters, misread graphemes, misplaced ending tiles, and the observed word-chain omissions. Segment order follows the table's columns, top to bottom. The raw source files are not bundled with the app.

Printed segment inventories are preserved even where the source table itself does not cover every word in its chain (for example, lesson 72 prints initial `pr` while its chain includes `fridge`, and lesson 78 prints final `r` while its chain includes `bit`). These are not silently inferred or dictionary-corrected. Teachers can change any bank with **Edit segments**. Word chains are a teacher reference; the app does not invent segmentations or automatically advance through them.

## Focused checks

`pnpm --filter blending-board typecheck`

`pnpm --filter blending-board test`

`pnpm --filter blending-board build`

The existing Pages build discovers this app automatically. No Pages build or preview refresh is needed for ordinary local development.
