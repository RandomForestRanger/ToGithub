# Card 1 — Cap hint escalations at 2 per rails move

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**File:** `js/game.js` (rails branch of `handleBlackMove`)

## Bug

`if (wrongTries >= 3) { showHint(...); hintEscalations++; }` increments the counter on
the 3rd, 4th, 5th… wrong try. One stuck move can burn 4+ escalations and kill Brons
(`≤ 2` total per CLAUDE.md §7).

## Fix

Escalation is counted once per stage: increment at `wrongTries === 2` and
`wrongTries === 3` only. Keep re-showing the two-square sword hint on every wrong try
from the 3rd onward (`>= 3` for `showHint`, `=== 3` for the counter).

## Acceptance

- Simulate 5 consecutive wrong tries on one rails move → `hintEscalations === 2`.
- Piece-hint appears at try 2; piece+target at tries 3, 4, 5.
- A correct move still resets `wrongTries` to 0 without touching `hintEscalations`.

## Session rules

1. **Scope discipline.** Implement only this card. Adjacent bugs go in the final
   report, unfixed. No refactoring, renaming, or style changes beyond the card.
2. **Cache-buster rule (CLAUDE.md §12).** You are changing `js/game.js`, so bump the
   `?v=` suffix on **every** local script/stylesheet/image reference in **every** HTML
   file to one higher than the current highest number found. A partial bump is worse
   than none.
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

Do not begin coding until you have restated the fix in one sentence and listed any
ambiguity you intend to resolve by judgment call.
