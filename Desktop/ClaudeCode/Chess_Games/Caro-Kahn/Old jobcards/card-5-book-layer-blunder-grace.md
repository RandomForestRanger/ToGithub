# Card 5 — Resurrect the book layer; blunder-before-book; move-25 grace

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**Files:** `js/game.js`, `js/engine.js`

**Prerequisite:** Cards 1–4 are merged. In particular this card interacts with
Card 3's undo handler — see Fix A.

## Owner decision (do not re-litigate)

* **D3.** The single Black move replying to White's scripted move-25 blunder can never
  be penalised — no −1, no blunder modal, no `hadBlunder`. Positive awards (emerald or
  diamond for finding the refutation) still apply.

## Bug A — the book layer is dead

Black's moves are never pushed to `session.uciHistory` (only `playWhiteTurn` and
`triggerTrap` push). The Lichess Explorer receives an illegal White-only `play=`
sequence, rejects it, and tier 2 silently never fires — every White move from 9 onward
comes from skill-6 Stockfish.

### Fix A

In `commitMove`, capture the return of `game.move(...)` and push
`from + to + (promotion || '')` onto `session.uciHistory`. The undo handler (from
Card 3) must also `session.uciHistory.pop()` — add it if absent; verify it happens
exactly once per undo.

## Bug B — book shadows the scripted blunder

`getWhiteMove` checks the book before the move-25 blunder, so once the book works, a
genuine book hit at White's move 25 would shadow the planned blunder.

### Fix B

Move the `whiteMoveNumber === SCORE.BLUNDER_MOVE_NUMBER` block ahead of the
`bookMove` call — still after the script layer, still respecting the
`SKIP_BLUNDER_IF_WHITE_EVAL_BELOW` guard.

## Feature C — move-25 grace (per D3)

`getWhiteMove` already returns `source`. In `playWhiteTurn`, when
`result.source === 'blunder'`, set a `graceMove = true` session flag. In
`scoreFreeMove`, if `graceMove` is set: clear it, still push evalHistory, still award
a diamond or emerald if earned, but apply no −1, open no blunder modal, and set
nothing that leads to `hadBlunder`. The flag clears after the very next Black move
regardless of outcome.

## Acceptance

- After a scripted opening, log the Explorer request URL: `play=` alternates
  White/Black UCI correctly and the API returns moves (test one known line, e.g. the
  Vlakte main line through move 8).
- Force `whiteMoveNumber = 25` with a mid-game FEN: the blunder fires even when the
  book has a move for the position; the skip-guard (White already below −500) still
  suppresses it.
- On the Black move after the blunder: a −250cp reply → no penalty, no modal; the
  exact refutation → diamond as normal. The move after *that* is scored normally.
- Undo after a post-book Black move leaves `session.uciHistory` consistent with
  `game.history().length`.

## Session rules

1. **Scope discipline.** Implement only this card. Adjacent bugs go in the final
   report, unfixed. No refactoring, renaming, or style changes beyond the card.
2. **Cache-buster rule (CLAUDE.md §12).** You are changing `js/` files, so bump the
   `?v=` suffix on **every** local script/stylesheet/image reference in **every** HTML
   file (and in JS-constructed URLs) to one higher than the current highest number
   found.
3. **Verify against the acceptance list**, item by item. Use Node with the
   `module.exports` hooks, or Puppeteer against `python3 -m http.server 8000`
   (file:// will not work — Web Workers and CORS). Live Lichess calls are permitted
   for the Explorer check; if the network is unavailable, verify the constructed URL
   string instead and mark the item unverified-live. State which items were verified
   mechanically and which by reading the code only.
4. **Time box.** If any single run exceeds 60 minutes, stop and propose the cheapest
   acceptable cut.
5. **Build log.** Append a short entry to CLAUDE.md's implementation notes: what
   changed, judgment calls, anything deliberately left alone.
6. **Report.** Files touched, per-file diff summary, acceptance checklist with
   pass/fail/unverified, adjacent bugs spotted but not fixed.

Do not begin coding until you have restated the three changes in one sentence each and
listed any ambiguity you intend to resolve by judgment call.
