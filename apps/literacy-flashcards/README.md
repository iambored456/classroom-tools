# Literacy Tools

The homepage offers Blending Board for UFLI blending drills and a card-set library with independent saved progress:

- **EyeWords:** all 100 two-sided cards from *Eye Sight Words Flashcards 100 Words.pdf*.
  Each side is fitted individually to its artwork, word, and cue text, excluding
  the black print border and copyright footer from the displayed crop.
- **Heart Words:** all 94 word cards from *Flashcards - UFLI Heart Words.pdf*.
  The front crops the original UFLI artwork to show the word, hearts, and sound boxes
  without the footer logo. Source images remain intact. Flipping
  reveals an original sentence using the word in a familiar, everyday situation.
  Sentences use three to five words, with clarity guiding the length. The introductory page and cover panels are excluded.
- **Reading Universe - Closed Syllables:** all 308 single-sided cards from
  *flash-card-deck-closed-syllables.pdf*. The original syllable artwork is rotated
  to read horizontally. Cards do not flip, and no flip prompts are shown.
- **Nonsense Words:** single-sided text cards using the supplied sets A (50 words),
  B (100), C (181), and D (30). The landing-page button opens a picker with the
  supplied syllable and R/S/L blend information, word counts, and examples. Choose
  one set or mix several; shared words appear only once in a combined deck.
  Set choices and progress for each combination are saved independently. Supplied
  word lists and skill descriptions are preserved as given.

- Open `/literacy-flashcards/` to select a tool or card set; `#eyewords`, `#heart-words`, and `#closed-syllables`
  link directly to the corresponding decks.
- `#nonsense-words` resumes the last chosen nonsense combination (Set A initially).
- Tap a two-sided card or press Space to switch between its front and its cue side.
- Next completes a card; Reshuffle keeps it available for later.
- Progress and the shuffled order are stored locally; completed cards do not repeat.
- The top-right back arrow or Left Arrow reopens the last completed card and
  reduces that set's completed count. Existing EyeWords progress is preserved.
- Help includes theme selection and a confirmed restart. Fullscreen supports projection.

The original PDF image assets and word/cue pairings are preserved in lossless WebP
under `public/cards/`, `public/cards/heart-words/`, and `public/cards/closed-syllables/`. EyeWords display crops are
recorded in `src/eyewords-crops.json` and applied with SVG viewports and clipping,
enlarging the content while retaining the complete original source assets.
Each directory's `source.json` records the source filename and SHA-256. The Heart
Words cards retain the original UFLI logos and symbol placement (© 2022 University
of Florida Literacy Institute). These supplied artwork assets retain their original
copyright and are not relicensed under the repository's code license. The source
has two distinct cards for “not”; both are intentionally retained.
Reading Universe's cards are extracted from the two card regions on PDF pages
2–155, excluding the introduction and material outside the print cut lines.
The original typography is preserved (Reading Universe, © WETA; support provided
by the American Federation of Teachers, AFL-CIO).

`pnpm --filter literacy-flashcards dev` starts the app on port 5195. The hub proxies
the route on its usual port 5173. Run `pnpm --filter literacy-flashcards typecheck`,
`pnpm --filter literacy-flashcards test`, and `pnpm --filter literacy-flashcards build`
for focused validation. The existing Pages scripts discover and assemble this app.

EyeWords and Heart Words use a shared display scale within each set, based on
the original image width rather than the tight artwork crop. Artwork is centred
in a 3:2 canvas, limited to 80% of the card width and 48rem, and shrinks to fit
short or narrow screens. Landing previews retain their compact crops.
