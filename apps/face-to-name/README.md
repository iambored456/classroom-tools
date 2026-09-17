# Face to Name

A static, link-only face/name flashcard app for consenting adults. No accounts, analytics, backend, or public set directory. Organizer drafts and photos use IndexedDB; practice counts and the chosen mode use localStorage. Clearing browser data removes those local copies.

## Use locally

Run `pnpm dev:face-to-name` from the repository root and open `http://localhost:5193/face-to-name/`, or run `pnpm dev` and use the Classroom Tools hub.

Create a set, upload JPEG/PNG/WebP photos in bulk, and assign each to a new name or an existing person. Photos are resized to at most 900 pixels along their longest edge and encoded as JPEGs, without cropping the face. Each person may have one to three photos. Names must be unique after Unicode normalization, ignoring case and extra spaces. A complete set needs a title and four people. Exported JSON includes all images, so no companion folder is needed.

Drafts save automatically after changes. Unassigned uploads are temporary: assign them before leaving. Download backup works for incomplete drafts; Export for publishing requires a valid complete set. Import restores an exported set and retains its ID and person IDs.

## Publish a set manually

1. In the builder, choose **Export for publishing**.
2. From this repository, run `pnpm publish:face-set -- "C:\path\to\downloaded-set.json"`.
3. Run `pnpm build:pages`.
4. Commit/publish the generated `docs/` output and source set using your existing GitHub Pages process.
5. Share `https://iambored456.github.io/classroom-tools/face-to-name/?set=SET_ID`, replacing `SET_ID` with the ID printed by the command.

The command validates the export and writes `apps/face-to-name/public/sets/SET_ID.json`. There is no listing or index of published sets. The site is public: a link is not access control, and anyone with it can download the names and photos. The app requests that search engines not index its pages; this is not a privacy guarantee.

To update, edit the existing local set (or import its backup), export, and run the command again. Keep the same set ID for the same link. Creating a new set intentionally creates a new link. To unpublish, remove that set's JSON from `public/sets/`, rebuild, and publish the site again. This cannot retract downloaded copies.

## Practice rules

- Published links open the face/name gallery. Alternate photos can be browsed.
- Face → name, name → face, and mixed modes always offer four distinct people from the set; option order and photos vary.
- Correct answers accumulate to two for each person/direction. A mistake resets only that direction to zero. After the answer, the correct pairing is shown until the learner continues.
- Mixed requires both directions; a single-direction round requires its selected direction. Mode switching shares the direction counts.
- Missed people receive greater selection weight. The scheduler spaces appearances with at least two other questions where candidates allow it and avoids consecutive appearances when another unfinished person exists. At the end, the last unfinished person may appear consecutively.
- Counts save immediately after answering. Reloading resumes from those counts with a new question; unanswered questions do not count.
- Updated sets retain counts for unchanged people; changed names/photos reset that person's counts. Removed people disappear and new people start at zero. Set-title changes preserve progress.
- Starting fresh clears only the selected mode's directions. Progress is never reported to the organizer.

## Checks

`pnpm --filter face-to-name test`

`pnpm --filter face-to-name typecheck`

`pnpm --filter face-to-name build`

With the app's dev server running, `pnpm --filter face-to-name verify:ui` checks the full builder/practice/publishing flow on desktop and mobile using Playwright. It uses temporary labelled raster cards, removes its published fixture afterward, and saves screenshots under `node_modules/.cache/face-to-name-qa/`.
