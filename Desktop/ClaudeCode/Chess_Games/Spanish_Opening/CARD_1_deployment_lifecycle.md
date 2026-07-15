# CARD 1 of 4 — Deployment & Game Lifecycle

**Project:** Spanish Opening (Ruy Lopez) trainer — `Spanish_Opening/`
**Scope:** `netlify.toml`, `app.js` (game flow only). Do NOT touch badge logic, engine/eval internals, or tooltip text — those are Cards 2–4.
**Standing rule:** If any single fix exceeds 60 minutes, stop and propose the cheapest cut.

Read `../CLAUDE.md` (shared conventions) and `Spanish_Opening/CLAUDE.md` before starting.

---

## Task 1.1 — Fix the caching strategy (do this first)

**Problem:** `netlify.toml` sets `Cache-Control: public, max-age=31536000` on `/*.js` and `/*.css` with no filename fingerprinting. A returning browser may not fetch a deployed bugfix for up to a year. Every fix in Cards 1–4 is worthless to a returning player until this is fixed.

**Fix:** Change the JS and CSS header blocks to:
```
Cache-Control: public, max-age=0, must-revalidate
```
Netlify serves ETags, so revalidation is a cheap 304 round-trip. Do not introduce a build step or filename hashing — this project is deliberately buildless.

**Accept when:** `netlify.toml` no longer contains `max-age=31536000` for any asset that can change between deploys.

## Task 1.2 — Stale timeouts survive "Nuwe Spel"

**Problem:** `startNewGame()` resets state but never invalidates pending `setTimeout` callbacks (`makeBlackMove`, `makeAIBlackMove`, the modal delay in `checkGameEnd`). Repro: play `e4`, click Nuwe Spel within 800 ms → the scheduled Black reply fires against the fresh game. `makeAIBlackMove` only guards on `isGameActive`, which the new game just set back to `true`, so it can play a move (for the wrong side!) on the new board.

**Fix:** Add a module-level generation counter:
```js
let gameGeneration = 0;
```
- Increment it at the top of `startNewGame()`.
- Every `setTimeout` that continues game flow captures `const gen = gameGeneration;` at scheduling time and bails immediately inside the callback if `gen !== gameGeneration`.
- Apply the same guard inside `makeAIBlackMove` after each `await` (the Lichess fetch can straddle a New Game click).

**Accept when:** the repro above leaves the fresh board untouched at the start position, for both the forced-move path (moves 1–2) and the AI path (move 3+), including a New Game click *during* the AI's Lichess fetch.

## Task 1.3 — Stalemate/draw after White's move soft-locks the game

**Problem:** `handlePlayerMove` only checks `game.in_checkmate()` after White's move. If White's move produces stalemate or any other draw (`game.game_over()` true, checkmate false), `makeAIBlackMove` returns early and `checkGameEnd` never runs. No modal, game hangs forever.

**Fix:** In `handlePlayerMove`, after the checkmate check, add:
```js
if (game.game_over()) {
    endGame('Gelykop! Die spel is klaar.');
    return;
}
```
Mirror the same completeness in `checkGameEnd` (it already handles both mates; make sure stalemate/draw there produces a sensible Afrikaans message rather than the default title).

Note: this codebase uses chess.js **0.10.3** — the old API (`game_over()`, `in_checkmate()`, `in_stalemate()`, `in_draw()`). Do not use the modern `isGameOver()` names.

**Accept when:** setting up any stalemate via the console (`game.load(fen)`) and making the stalemating White move ends the game with a draw modal.

## Task 1.4 — Hint button active during Black's turn, and an off-by-one

**Problem A:** After White's scored move, `updateUI()` re-enables the hint button before Black replies (~1 s window). `showHint()` analyses `game.fen()` — Black to move — so the player is shown *Black's* best move, and `lastHintInfo` is stored with a FEN that can never match scoring.

**Fix A:** Add a turn guard: the hint button is only enabled when `game.turn() === 'w'` (in addition to `canUseHint()`), and `showHint()` returns early if it is not White's turn. Re-enable after Black's move completes.

**Problem B:** `canUseHint()` uses `currentMoveNumber <= hintLimit`. At the decision point for move N the counter reads N−1, so with limit 16 the hint is still available when choosing move 17. Spec (CLAUDE.md): hints for moves 4–10 (players J, L) and 4–16 (all others).

**Fix B:** Change the condition to `currentMoveNumber >= 3 && currentMoveNumber < getHintLimit()`. Verify against the spec table: J/L last hinted decision = move 10; others = move 16.

**Accept when:** (a) during Black's reply window the button is disabled and a forced call to `showHint()` from console does nothing; (b) for player KC the hint works when choosing move 16 and refuses when choosing move 17; for J it refuses when choosing move 11.

---

## Guardrails (all cards)

- Never hardcode the Lichess token in `app.js` — it arrives via `window.LICHESS_TOKEN` (Netlify snippet injection).
- Afrikaans `'n` in string literals: double quotes or template literals only.
- No new dependencies, no build step, no refactors beyond the tasks above.
- Update `Spanish_Opening/CLAUDE.md` if any documented behaviour changed (the hint table changes here — the mechanics, not the move ranges).

## Done-when checklist

- [ ] All four accept criteria pass in a local browser session
- [ ] `runEvaluationTests()` in console still passes (Tests 4–5 at minimum; 1–3 need network/token)
- [ ] CLAUDE.md updated where behaviour changed
- [ ] One-paragraph report: what changed, anything out-of-scope discovered (report it, don't fix it — it may be on a later card)
