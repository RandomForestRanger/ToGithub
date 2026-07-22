# Card 4 — Silwer accounting (diamonds = 3) and undo-forgiven blunders

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**Files:** `js/game.js`, `js/mastery.js`

## Owner decisions (do not re-litigate)

* **D1.** Diamonds count as 3 toward Silwer's 12-emerald bar — mastery check only;
  the visible inventory and end tally keep emeralds and diamonds separate.
* **D2.** Undoing a blunder forgives it: an undone blunder must not block Silwer.

## Bug A — diamonds contribute nothing to Silwer

`evaluateGameResult` tests `emeraldsTotal >= 12` against the emerald counter alone. A
flawless game (8 theory emeralds + all diamonds + 3 End bonus = 11) fails Silwer while
a mediocre one passes.

### Fix A (per D1)

Compute the Silwer total as `emeraldsTotal + diamondsTotal * SCORE.ENGINE_BEST` inside
`evaluateGameResult` (both fields are already in the result object). Do **not** change
the on-screen inventory or end tally — display stays split.

## Bug B — undone blunder still voids Silwer

`hadBlunder = true` is set in `scoreFreeMove` before the undo/continue decision, so an
undone blunder still blocks Silwer.

### Fix B (per D2)

Move the `hadBlunder = true` assignment out of `scoreFreeMove` and into the
**Gaan voort** handler in `offerBlunderDecision`. The undo path never sets it. (An
earlier *continued* blunder must still count — moving the assignment, rather than
clearing the flag on undo, gets this right for free.)

## Acceptance

- Simulated result: 9 emeralds + 1 diamond, no blunder, reached The End → Silwer
  (9 + 3 = 12, boundary). 8 emeralds + 1 diamond → no Silwer (11).
- Blunder → undo → finish cleanly with ≥ 12 effective → Silwer achieved.
- Blunder → continue → otherwise perfect game → no Silwer.
- Goud logic (`won || (finalEvalForBlack >= 150 && diamondsTotal >= 2)`) unchanged.

## Session rules

1. **Scope discipline.** Implement only this card. Adjacent bugs go in the final
   report, unfixed. No refactoring, renaming, or style changes beyond the card.
2. **Cache-buster rule (CLAUDE.md §12).** You are changing `js/` files, so bump the
   `?v=` suffix on **every** local script/stylesheet/image reference in **every** HTML
   file (and in JS-constructed URLs) to one higher than the current highest number
   found.
3. **Verify against the acceptance list**, item by item. The mastery checks run
   headlessly via the `module.exports` hooks in `js/data.js` / `js/mastery.js` — build
   a small Node test constructing result objects for each boundary case. State which
   items were verified mechanically and which by reading the code only.
4. **Time box.** If any single run exceeds 60 minutes, stop and propose the cheapest
   acceptable cut.
5. **Build log.** Append a short entry to CLAUDE.md's implementation notes: what
   changed, judgment calls, anything deliberately left alone.
6. **Report.** Files touched, per-file diff summary, acceptance checklist with
   pass/fail/unverified, adjacent bugs spotted but not fixed.

Do not begin coding until you have restated both fixes in one sentence each and listed
any ambiguity you intend to resolve by judgment call.
