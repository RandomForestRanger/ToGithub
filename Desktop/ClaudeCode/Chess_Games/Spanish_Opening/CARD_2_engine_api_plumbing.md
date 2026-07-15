# CARD 2 of 4 — Engine & API Plumbing

**Project:** Spanish Opening (Ruy Lopez) trainer — `Spanish_Opening/`
**Prerequisite:** Card 1 merged.
**Scope:** `app.js` — Stockfish worker handling, eval perspective, Lichess fetch headers. Do NOT touch badge logic or tooltip text (Cards 3–4).
**Standing rule:** If any single fix exceeds 60 minutes, stop and propose the cheapest cut.

Read `../CLAUDE.md` and `Spanish_Opening/CLAUDE.md` before starting.

---

## Task 2.1 — Serialise the local Stockfish worker

**Problem:** `stockfishEngine.onmessage` broadcasts every UCI line to *all* callbacks in `stockfishQueue`, and concurrent requests interleave `ucinewgame`/`position`/`go` commands on one engine. Two overlapping analyses (e.g. `showMoveAnalysis` running "in background" while `makeAIBlackMove`'s fallback or the next `updatePositionEval` starts) can attribute results to the wrong position. Additionally, callbacks `splice` the queue during the `forEach` broadcast, which can skip entries.

**Fix (cheapest correct cut):** Replace the broadcast queue with a promise-chain mutex so exactly one request owns the engine at a time:

```js
let engineBusy = Promise.resolve();

function withEngine(fn) {
    const run = engineBusy.then(fn, fn);
    engineBusy = run.catch(() => {});   // keep the chain alive on failure
    return run;
}
```

- `getLocalStockfishEval` and `getLocalStockfishEvalForDisplay` wrap their existing body in `withEngine(...)`.
- Inside, register a single `activeCallback` variable (not a queue); `onmessage` forwards to it if set. Clear it on `bestmove` or timeout.
- Keep the existing per-request timeouts (6 s / 3 s) — they now also release the mutex.
- Delete `stockfishQueue` entirely once nothing references it.

**Accept when:** in console, `Promise.all([getLocalStockfishEval(fenA, 10, 2), getLocalStockfishEval(fenB, 10, 2)])` (two different FENs) returns results whose first moves are legal in their *own* positions — verify with `new Chess(fenA).move(...)`. Before the fix this can cross-contaminate; after, it cannot.

## Task 2.2 — Verify and fix the eval perspective (probable sign flip)

**Problem:** Both `updatePositionEval` paths negate the eval when the FEN contains `' b '`. That is correct for local Stockfish (UCI reports from the side to move) but Lichess Cloud Eval is believed to report **from White's perspective already** — in which case the cloud path double-flips after every White move, and the displayed eval alternates correct/incorrect each half-move.

**Step 1 — verify empirically, do not assume:** fetch
```
https://lichess.org/api/cloud-eval?fen=<FEN after 1.e4 e5 2.Nf3, Black to move>
```
White stands slightly better here. If `pvs[0].cp` comes back **positive** (~+20 to +40), Cloud Eval is White-POV and the flip is wrong for the cloud path. If negative, it is side-to-move and the current code is right — record the finding in CLAUDE.md and skip Step 2.

**Step 2 — fix (if confirmed White-POV):**
- In `updatePositionEval`, remove the `' b '` sign flip on the **cloud** branch only. Keep it on the local Stockfish branch.
- Audit `getStockfishEval`/`convertPvsToMoves`: the `cp` values passed through to `showMoveAnalysis` come from the same cloud endpoint. They are only ever displayed for positions where White is to move (pre-move analysis), so White-POV and side-to-move coincide there — confirm this and leave a one-line comment saying why no flip is needed.
- Also note the mate-score conversion (`10000 - mateIn*10`) exists in two places; make both branches consistent with whatever perspective rule you established.

**Accept when:** after 1.e4 (Black to move) the eval display reads a small **positive** number, and after Black's reply it is still sensible (no sign oscillation across ten consecutive half-moves — watch the console log).

## Task 2.3 — Don't send an empty Bearer header

**Problem:** `getLichessPopularity` always sends `'Authorization': 'Bearer ' + (window.LICHESS_TOKEN || '')`. When the token is absent, the malformed `Bearer ` header can cause a 401 on an endpoint that would work fine with no header at all.

**Fix:**
```js
const headers = window.LICHESS_TOKEN
    ? { 'Authorization': 'Bearer ' + window.LICHESS_TOKEN }
    : {};
```
While there: test whether `explorer.lichess.ovh` actually requires auth at all (open a private window without the Netlify snippet and hit the endpoint). Update the "Lichess Token" section of `Spanish_Opening/CLAUDE.md` with what you find — the current text claims all Explorer calls 401 without a token, which may actually have been rate-limiting (429). Do not remove the token mechanism either way; it buys rate-limit headroom.

**Accept when:** with `window.LICHESS_TOKEN` undefined, the Explorer call either succeeds or fails with a documented, understood status — and no `Bearer `-with-empty-token header is ever sent.

---

## Guardrails (all cards)

- Never hardcode the Lichess token in `app.js`.
- Afrikaans `'n` in string literals: double quotes or template literals only.
- chess.js 0.10.3 API (`game_over()`, not `isGameOver()`).
- No new dependencies, no build step, no refactors beyond the tasks above.

## Done-when checklist

- [ ] All three accept criteria pass
- [ ] `runEvaluationTests()` passes Tests 2–5 (Test 3 requires local Stockfish loaded)
- [ ] CLAUDE.md: eval-pipeline section and token section updated with findings
- [ ] One-paragraph report: what changed, the empirical result of Task 2.2 Step 1, anything out-of-scope discovered
