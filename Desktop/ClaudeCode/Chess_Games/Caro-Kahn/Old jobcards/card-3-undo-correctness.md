# Card 3 — Undo correctness: checkmate guard, script-tree restore, forfeit in theory branch

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**File:** `js/game.js`

## Bug A — checkmate scored as blunder

`scoreFreeMove` runs before `afterBlackMoveAdvance`'s mate check. Analysing a mated
position yields no PV, so `actualCpForBlack` becomes 0 and a winning move can trigger
the "Eina!" blunder modal after the child delivers mate.

### Fix A

At the top of `scoreFreeMove` (or before the call): if `game.in_checkmate()` or
`game.in_draw()` after Black's move, skip all scoring and evalHistory bookkeeping and
return immediately — `afterBlackMoveAdvance` handles the game end.

## Bug B — undo permanently derails the script

In the scored-freedom branch, a non-theory move sets `scriptState.node = null`
*before* scoring. If the child then blunders and undoes, the tree stays null: the
replayed move can't be recognised as theory, and White abandons the scripted line for
the remaining theory moves.

### Fix B

Snapshot `scriptState` (`node`, `pendingBMap`, `pendingTrap`) at the top of
`handleBlackMove`, before any mutation. In the undo handler, restore the snapshot
alongside the existing `game.undo()` / `blackMoveCount--` / `evalHistory.pop()`.

## Bug C — forfeit leak (reachable once Fix B lands)

`forfeitNextEmerald` is only consumed inside `scoreFreeMove`. With the script tree
restored, a post-undo replayed *theory* move is accepted in the theory branch and
awarded an emerald despite the forfeit rule — and the stale flag later eats an
unrelated move's award.

### Fix C

In the scored-freedom theory-accepted branch, check `forfeitNextEmerald` first: if
set, clear it and skip `awardEmerald` (still run `handleSpecialAcceptance` and set
`theoryHandled`).

## Acceptance

- Black mates White at any move ≥ 9 → win screen, no blunder modal, no −1.
- At move 6+: play a non-theory blunder, undo, replay the theory move → move is
  accepted as theory, **no** emerald awarded (forfeit), White continues the scripted
  line at moves 7–8, and `forfeitNextEmerald` is false afterward.
- The one-undo-per-game limit (`undoUsed`) is unchanged.

## Session rules

1. **Scope discipline.** Implement only this card. Adjacent bugs go in the final
   report, unfixed. Do not touch `hadBlunder` semantics — that is Card 4's territory.
2. **Cache-buster rule (CLAUDE.md §12).** You are changing `js/game.js`, so bump the
   `?v=` suffix on **every** local script/stylesheet/image reference in **every** HTML
   file (and in JS-constructed URLs, if a shared constant exists from Card 2) to one
   higher than the current highest number found.
3. **Verify against the acceptance list**, item by item. Use Node with the
   `module.exports` hooks in `js/data.js` / `js/mastery.js`, or Puppeteer against
   `python3 -m http.server 8000` (file:// will not work — Web Workers and CORS). State
   which items were verified mechanically and which by reading the code only.
4. **Time box.** If any single run exceeds 60 minutes, stop and propose the cheapest
   acceptable cut.
5. **Build log.** Append a short entry to CLAUDE.md's implementation notes: what
   changed, judgment calls, anything deliberately left alone.
6. **Report.** Files touched, per-file diff summary, acceptance checklist with
   pass/fail/unverified, adjacent bugs spotted but not fixed.

Do not begin coding until you have restated the three fixes in one sentence each and
listed any ambiguity you intend to resolve by judgment call.
