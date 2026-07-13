# Skaakmat Afrigter — Opdrag 2 van 12
## Wenvoorwaarde-Argitektuur (`winCondition: mate | promote | hold`)

> **Roadmap context:** Task 2 of 12. Task 1 built `tools/verify_positions.py` (the regression gate; currently reporting 37 ERRORs against the legacy positions — expected and untouched by this task). This task changes the game's core rule: victory no longer always means checkmate. Tasks 3–11 depend on this architecture; nothing here adds or removes positions.

---

## Why this exists

The single design constraint "the goal is always checkmate" is the root cause of most of the broken content. It forced scripted engine blunders into Type 17 (the good-vs-bad-bishop win is a conversion, not a mate), made Type 12 bronze mathematically unwinnable (mate-in-14 against a 12-move limit — the theme's natural payoff is promotion), and means the app teaches nothing about defence, though endgames like the Philidor and the wrong-coloured bishop exist *as drawing methods*. Real endgame skill is three skills: mate, convert, hold. The app gets all three.

## Goal

1. Every position gains a `winCondition` field: `'mate'` (default when absent), `'promote'`, or `'hold'`.
2. `app.js` implements win/lose/draw logic per condition.
3. All scripted engine-inaccuracy ("wobble") rules are deleted.
4. The threefold-repetition contradiction between `app.js` and `CLAUDE.md` is resolved by explicit policy (below).
5. UI communicates the objective per round, in Afrikaans, prominently — a child must never wonder what winning means.

**This task does NOT purge or rebuild positions** (Task 3+). Exception: three existing positions are re-tagged `promote` as living proof of the architecture (see §6).

## 1. Data model (`positions.js`)

Per-position optional field, sitting alongside the existing optional `moveLimit`:

```js
{ fen: '...', note: '...', moveLimit: 24, winCondition: 'promote' }
```

- Absent ⇒ `'mate'`. No mass-edit of existing positions.
- `hold` positions will also carry `holdMoves` (integer; defaults to the tier move limit) — the number of full moves white must survive.

## 2. Game logic (`app.js`)

Route all end-of-round detection through one function, e.g. `adjudicate(chessGame, state)`, called after every half-move. Behaviour per condition:

### `mate` (current behaviour, unchanged)
- Win: black is checkmated within the move limit.
- Fail: stalemate (either colour), move-limit exhaustion, threefold repetition (see §4).

### `promote`
- **Win: any white pawn promotes.** Instant win the moment the promotion move completes — even if the resulting position could still be misplayed. Rationale: the lesson is the conversion; the resulting K+Q/K+R win is a badge the player already owns (Fase 1). Show the promotion square glowing before the result screen.
- Checkmating black also wins (don't punish overachievement).
- Fail: stalemate, move-limit exhaustion, threefold repetition.
- Under-promotion counts (a knight promotion is still a promotion — and a delightful one).

### `hold` (player defends; draws are victories)
White is the *weaker* side. Success = the draw survives:
- **Win:** surviving `holdMoves` full moves without being mated; OR stalemate (either colour — if white is stalemated, that *is* the draw: celebrate it); OR threefold repetition; OR insufficient material.
- **Fail:** white is checkmated.
- **Early adjudication (important):** a defender who blunders the drawing resource shouldn't shuffle hopelessly for 20 moves before losing. After each black reply, take Stockfish's evaluation (the engine is already thinking; reuse its score — no extra search): if it announces forced mate against white, or the score is worse than −800 cp for two consecutive black moves, end the round as a failure with the teaching message. Store which white move preceded the collapse for the result screen ("Die vesting het geval ná {move}").
- Stockfish plays black at full strength — the whole point is that the draw holds against perfect pressure.

### Message strings (Afrikaans, add to the string table)

| Event | String |
|---|---|
| Objective label, mate | `Doel: Skaakmat` |
| Objective label, promote | `Doel: Promoveer 'n pion` |
| Objective label, hold | `Doel: Hou die gelykspel — oorleef {n} skuiwe` |
| Promote win | `Promosie! Die pion word 'n koningin. Baie goed!` |
| Promote win (under-promotion) | `Promosie — en boonop 'n ruiter! Slim gedaan!` |
| Hold win (survived) | `Vesting gehou! Die gelykspel is joune. Baie goed!` |
| Hold win (stalemate) | `Pat — en dis presies wat jy wou hê! Gelykspel gehou!` |
| Hold win (repetition) | `Drie keer dieselfde posisie — die gelykspel is verseël!` |
| Hold fail (mated) | `Skaakmat — die vesting het geval. Kyk in die herspeel waar dit gebeur het.` |
| Hold fail (adjudicated) | `Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer!` |

The objective label lives in the game-screen top bar next to the tier badge, always visible. In `hold` mode the move counter counts *up* toward `holdMoves` ("Oorleef nog: X") rather than down.

## 3. Delete the wobble rules

Remove from `app.js`, entirely:
- The Type 5 random/second-best rule (`mc % 5 === 4` / `mc % 5 === 0`).
- The Type 6 gold second-best rule.
- The Type 17 moves-4/10/12 second-best rule.
- `getSecondBestMove`, the MultiPV plumbing, `getRandomMove`, and `blackMoveCount` if nothing else uses them.

Stockfish plays every black move at full strength in every mode, permanently. (Types 5 and 17 become temporarily *harder* until Tasks 5 and 9 rebuild their positions — acceptable: they are already broken, and the harness says so.) Update the Engine Behaviour section of `CLAUDE.md` accordingly.

## 4. Threefold repetition policy (resolving the contradiction)

`CLAUDE.md` claims repetition is disabled; `app.js` line ~486 enforces it. **Policy: keep it enforced, reframe it.** In `mate`/`promote` mode a repetition means the player isn't making progress — ending the round as a failure with `Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer.` is honest and instructive. In `hold` mode repetition is a *win* (§2). The 50-move rule stays disabled in all modes (move limits are shorter anyway; verify chess.js's `in_draw()`/fifty-move detection isn't ending rounds silently — if it is, gate it off). Update `CLAUDE.md` to match reality.

## 5. Replay & hints across modes

- Replay label becomes mode-aware: `mate` → existing label; `promote` → `Perfekte omskakeling vanaf hierdie posisie`; `hold` → `Perfekte verdediging vanaf hierdie posisie`.
- Replay termination: `promote` replay stops at the promotion move + one beat of celebration; `hold` replay shows `holdMoves` moves of perfect defence, or stops early on repetition (which it should display proudly, not apologetically).
- Hint button is mode-agnostic (Stockfish best move for white) — no changes beyond making sure it works in `hold` mode where "best" means "most solid".

## 6. Proof-of-architecture re-tags (permanent, not test scaffolding)

Re-tag these three existing Type 12 positions `winCondition: 'promote'` — the July audit found them winning (+6.7 to +7.1) but with no mate in reach, i.e. exactly the conversion endgames this architecture exists for:
- Tipe 12 S2: `8/5pp1/3k4/P7/8/8/5PP1/6K1 w`
- Tipe 12 G1: `8/5pp1/8/P2k4/8/8/5PP1/6K1 w`
- Tipe 12 G2: `8/5pp1/8/P7/4k3/8/5PP1/6K1 w`

For `hold`-mode testing (no current position qualifies — every legacy position has white winning), use this canonical wrong-coloured-bishop draw as a temporary dev fixture, clearly commented `// TYDELIK — toetsposisie vir hold-modus, verwyder in Opdrag 3`:
- `8/8/8/8/3b4/5k1p/8/6K1 w - - 0 1` (white Kg1 vs black Kf3, Bd4, ph3 — h1 is the wrong colour for the dark bishop; white holds by staying in the corner; `holdMoves: 12`, `winCondition: 'hold'`). Park it in a `_dev` type or behind a debug flag — it must not enter the child-facing puzzle pool.

## 7. Harness alignment (`tools/verify_positions.py`)

Small update: the harness already defaults `winCondition` to `'mate'`; ensure it now *reads* the field from `positions.js` and applies the correct C2/C3 logic (promote: PV-promotes-within-budget; hold: theoretical result must be a draw). The three re-tagged Type 12 positions should move from ERROR to OK/WARN. The dev fixture, if visible to the parser, must pass as `hold`.

## Acceptance criteria (definition of done)

1. `grep -n "second\|random\|blackMoveCount\|MultiPV" app.js` returns nothing wobble-related.
2. Manual test, promote mode: load Tipe 12 S2, push the a-pawn home — the round ends in victory *at the moment of promotion*, with the correct Afrikaans message and objective label shown throughout.
3. Manual test, hold mode: load the dev fixture; (a) shuffle the king in the corner for 12 moves → victory; (b) deliberately walk the king out toward the pawn → the early-adjudication failure fires within a few moves, naming the culprit move.
4. Manual test, mate mode: one Type 1 bronze plays exactly as before (no regression).
5. Harness run: the three re-tagged Type 12 positions no longer ERROR; the total ERROR count drops from 37 to 34; **no new ERRORs appear anywhere** (the remaining 34 are Task 3's job).
6. `CLAUDE.md` updated: win-condition table added, wobble section deleted, repetition policy corrected.
7. All new user-facing strings are Afrikaans; no English leaks into the UI.

## Do not

- Do not purge, rebuild, or "improve" any positions beyond the three §6 re-tags (Task 3).
- Do not add new endgame types (Tasks 10–11).
- Do not touch badge/fase structure (Task 4).
- Do not weaken the engine anywhere, for any reason.

---

*Wanneer al sewe kriteria slaag — veral die daling van 37 na presies 34 harnas-foute — is Opdrag 2 klaar. Opdrag 3 (skoonmaak van gebroke posisies) volg.*
