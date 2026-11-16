# MPM2D Cycle 4 Math Diagnostic

From the Classroom Tools checkout, run `pnpm dev:numeracy-tools` and open
[Cycle 4 Math Diagnostic](http://localhost:5198/numeracy-tools/#cycle-4-diagnostic).
The app also opens from its card on the Numeracy Tools sub-hub.

## Assessment

The diagnostic covers solving quadratics by factoring and the number and
algebra skills that feed it. The interactive map shows all 88 workbook skills
and all five Cycle 4 branches. The formula, applications, circles and systems
branches still need their own item banks and course-specific checks.

- Two independent correct responses mark a skill **Demonstrated**. Two
  incorrect responses mark it **Practise next**. If the first two split, the
  diagnostic asks a third item from a different family.
- Usable evidence below either threshold gives **Needs another check**.
  A skill without usable evidence is **Not assessed yet**. Choosing **I’m not
  sure** records a skip and defers the skill for the current session.
- A question becomes eligible once the student demonstrates its essential
  prerequisites. Each essential group must be satisfied, and any member can
  satisfy a group. Item requirements apply to the method or expression shown.
  Supporting references describe preparation and verification.
- The default session limit is 10 responses, including skips. This gives
  students a regular stopping point while leaving room for several skills. A
  secure path through all 37 banked skills takes 74 responses over eight
  sessions. Students can pause sooner, view a partial checklist, and finish
  when they have enough information to plan practice.
- Every question states the allowed support. The attempt records the policy
  for each item. The early number facts use unaided recall. Later questions
  can allow calculator use when arithmetic is secondary to the skill.

## Answer entry

The app uses labelled coefficient, intermediate-step and root fields, along
with method choices. This keeps the response format consistent, supports
keyboard use, and lets the diagnostic assess a step such as rewriting a
quadratic or identifying factors. Numeric checks accept equivalent finite
decimals and fractions. Set responses check all distinct values in either
order. Exact answers, rounding and units are controlled by the item. A
format correction does not count as an attempt.

## Saving and review

The browser stores one attempt for this browser profile and site address on
this device. The optional nickname and answer history stay in browser storage
until a new attempt replaces them or site data is cleared. Download the
results JSON to retain the attempt. The checklist is also printable.

Select a skill in the results tree or checklist to open a focused check.
Focused checks use the attempt's demonstrated prerequisites and prefer
question families the student has yet to see. The browser saves the latest
focused check separately from the main diagnostic and its downloadable report.

Teacher review can inspect the map, workbook question routes, reviewed
dependencies, item answers and saved responses. It can open a downloaded
results file locally. This prototype has no authentication. Anyone with
access to the app can open the review tools and see the item answers. Avoid
identifying information in nicknames or shared exports.

Saved attempts and exports include versioned rules, the skill map and full
snapshots of attempted questions. A supported older record remains readable
for review. Resuming requires matching map, bank and rules versions.

## Data and checks

- [Prerequisite review](./README-diagnostic-dependencies.md) explains the
  workbook links and changes.
- `src/diagnostic/skills.ts` holds the map. `src/diagnostic/items.ts` holds
  the question bank. `src/diagnostic/engine.ts` holds the configurable rules.
- When extending the diagnostic, add original item families for the assessed
  skill IDs, specify the exact methods required per item, and update the
  relevant data version. Review question routes that use multiple methods
  before enabling their bank.
- Run `pnpm exec tsx --test apps/numeracy-tools/diagnostic.test.ts`
  from the repo root for the rules and validation checks.
