# Opdrag 8b — Fyn Kuns Manifes

Six new endgame types (22–27), a new Fase 5, generated via the Type 5
generate-and-verify pipeline (local filter → tablebase query → band select →
gauntlet), reused as a template rather than copied verbatim — each type's
construction differs enough (material, win condition, hold-mode) that the
generator scripts (`tools/generate_type22.py`…`generate_type27.py`) are
separate files, same shape. Generated 2026-07-13.

## Wiring (Opdrag 8b §0)

- `ENDGAME_TYPES` (positions.js): added ids 22–27 with Afrikaans names + icons.
- `FASES` (fases.js): added Fase 5 "Fyn Kuns", types `[22,23,24,25,26,27]`,
  gated by Fase 4's bronzes via the existing `isFaseUnlocked()` rule — no new
  app.js logic. Verified against the *real* app.js code (not reimplemented)
  via a small vm-sandboxed harness: fresh profile → Fase 5 locked; veteran
  profile (all Fase-4 gating types' bronze earned) → Fase 5 unlocked;
  `buildPool()` confirmed to actually serve all 6 new types (bronze tier)
  once unlocked.

## Tipe 22 — Koningin teen Toring (mate, 4 men)

Broad 64-square sweep (curated black-king positions × rook/king/queen
offsets), tablebase category=win filter, DTM-banded selection.

**Correction during selection:** first pass's bronze band (DTM 1–7 per the
spec's literal wording) picked three DTM=1 "mate in one, rook already
adjacent to king" positions — no hunt, no lesson. Floor raised to DTM≥3
before re-selecting (documented in the generator's source, not silently
fixed).

| Pos | DTM (white-moves) | FEN |
|---|---|---|
| Brons #1 | 3 | `8/8/8/6Q1/4K3/4r3/8/4k3 w - - 0 1` |
| Brons #2 | 3 | `6k1/5r2/8/6K1/2Q5/8/8/8 w - - 0 1` |
| Brons #3 | 3 | `8/8/8/3Q4/8/5K2/8/5r1k w - - 0 1` |
| Silwer #1 | 12 | `8/8/8/3Q4/8/3K4/8/1kr5 w - - 0 1` |
| Silwer #2 | 13 | `8/8/8/8/8/8/1r6/k2K1Q2 w - - 0 1` |
| Goud #1 | 20 | `8/8/8/k1r5/8/2K5/8/4Q3 w - - 0 1` |
| Goud #2 | 20 | `3k4/8/3r1K2/8/7Q/8/8/8 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

## Tipe 23 — Koningin teen 2 Verbonde Pionne (mate, 5 men)

Pawn-pair phalanx fixed per candidate (file pair × rank), king/queen swept
around it. Tablebase win-only filter is the entire quality bar per spec.

**Correction during selection:** gold's construction band (pawns on rank 6)
was initially sorted cheapest-DTM-first, same convention as bronze/silver —
but pawns already on the 6th are often just captured outright by the queen
(DTM 3), which is *easier* than bronze, not harder. Fixed to sort
hardest-first within the gold band (same bug, same fix, independently
re-derived in `generate_type24.py` before that type was even run).

| Pos | Pawns | DTM | FEN |
|---|---|---|---|
| Brons #1 | bc, rank 4 | 4 | `8/4Q3/8/8/1pp5/k2K4/8/8 w - - 0 1` |
| Brons #2 | cd, rank 5 | 5 | `8/2K5/8/k1pp1Q2/8/8/8/8 w - - 0 1` |
| Brons #3 | de, rank 5 | 5 | `8/4K3/8/2kpp3/8/8/8/Q7 w - - 0 1` |
| Silwer #1 | ef, rank 5 | 7 | `8/8/8/4ppk1/8/8/6K1/4Q3 w - - 0 1` |
| Silwer #2 | fg, rank 5 | 7 | `8/8/5k2/5pp1/3K4/8/3Q4/8 w - - 0 1` |
| Goud #1 | fg, rank 6 | 11 | `8/8/5pp1/1K2k3/8/8/8/2Q5 w - - 0 1` |
| Goud #2 | fg, rank 6 | 11 | `5K2/8/5pp1/5k2/8/8/8/3Q4 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

## Tipe 24 — Toring teen 2 Verbonde Pionne (mate, 5 men)

Same construction as Type 23, rook instead of queen.

**Structural finding, not a search gap:** exhaustively widened the bronze
search (382 win-candidates across 15 file/rank buckets, up to 30 sampled per
bucket) and confirmed the minimum achievable DTM at rank 4–5 is 8 white-moves
— a rook simply cannot convert this material faster than that, regardless of
king/rook placement. The default bronze budget (60% of 12 = 7.2) is
structurally unreachable here. Resolved the way this project always has for
a real (not search-coverage) budget miss: bumped `moveLimit` on the three
bronze positions (14/16/16) rather than accepting a WARN or forcing an
artificial position.

| Pos | Pawns | DTM | moveLimit | FEN |
|---|---|---|---|---|
| Brons #1 | bc, rank 4 | 8 | 14 | `8/4R3/8/8/1pp5/k2K4/8/8 w - - 0 1` |
| Brons #2 | fg, rank 4 | 9 | 16 | `8/8/8/8/2R1Kppk/8/8/8 w - - 0 1` |
| Brons #3 | bc, rank 5 | 9 | 16 | `2R5/8/2K5/1pp5/k7/8/8/8 w - - 0 1` |
| Silwer #1 | bc, rank 5 | 8 | 24 (verstek) | `8/8/8/kppK4/8/8/8/4R3 w - - 0 1` |
| Silwer #2 | bc, rank 5 | 9 | 24 (verstek) | `2R5/8/8/1pp5/k2K4/8/8/8 w - - 0 1` |
| Goud #1 | de, rank 6 | 29 | 36 (verstek) | `7K/8/3ppk2/8/8/8/1R6/8 w - - 0 1` |
| Goud #2 | de, rank 6 | 24 | 36 (verstek) | `5R2/8/3pp3/8/3k4/8/8/K7 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

## Tipe 25 — Ruiter-en-Pion teen Ruiter (promote, 5 men)

Curated skeleton (central pawn file/rank, plausible white-knight shielding
squares) × black-king sweep × defending-knight near/far sets (the spec's
brons="far"/goud="close" contract).

**Correction during selection (the real lesson of this type):** tablebase
DTM is not a reliable difficulty proxy for `promote` positions — the harness
verifies via real Stockfish-vs-Stockfish self-play rollout, not tablebase
DTM. First-pass gold #1 (tablebase DTM=25, category=win) **failed the
harness** (`geen bevordering binne 100 wit-skuiwe nie` — the real rollout
never converged). Diagnosed by rollout-testing a broader sample of
candidates directly: real convergence speed correlates only loosely with
tablebase DTM for this material. Replaced with a candidate whose *real
rollout* (16 white-moves) is comfortably within budget, and re-selected
silver by real rollout too (first pass's silver was rollout=2, statistically
indistinguishable from bronze — fixed to prefer the 'near'-label pool, giving
a genuine bronze(2–4) < silver(7–9) < gold(13–16) progression in actual
self-play, not just tablebase theory).

| Pos | Defender | DTM (tablebase) | Rollout (real, white-moves) | FEN |
|---|---|---|---|---|
| Brons #1 | far | 4 | 2 | `7k/2N5/4PK2/8/n7/8/8/8 w - - 0 1` |
| Brons #2 | far | 4 | 4 | `4k3/8/3PK3/8/2N5/8/8/n7 w - - 0 1` |
| Brons #3 | far | 4 | 3 | `k7/1NK5/3P4/8/7n/8/8/8 w - - 0 1` |
| Silwer #1 | near | 5 | 7 | `3k4/2N5/4P1n1/5K2/8/8/8/8 w - - 0 1` |
| Silwer #2 | near | 5 | 9 | `3k4/8/5n2/4PK2/6N1/8/8/8 w - - 0 1` |
| Goud #1 | near | 20 | 16 | `4N3/8/1n1PK3/7k/8/8/8/8 w - - 0 1` |
| Goud #2 | near | 25 | 13 | `k7/3N1n2/8/4P3/5K2/8/8/8 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

## Tipe 26 — Loper-en-Pion teen Loper, selfde kleur (promote, 5 men)

Same shape as Type 25, bishops instead of knights, plus the constraint that
makes the type real: both bishops must sit on same-coloured squares (the
opposite-colour case is Type 27's material, never sampled here).

Applied Type 25's lesson pre-emptively: **rollout-checked every candidate
before writing to positions.js**, not after. Caught one more real/tablebase
mismatch this way — the first bronze pick (tablebase DTM=3, category=win)
failed rollout (`None` — no promotion within 100 moves) and was swapped
*before* it ever reached the harness. Final picks are all rollout-confirmed.

| Pos | Defender | DTM (tablebase) | Rollout (real, white-moves) | FEN |
|---|---|---|---|---|
| Brons #1 | far | 3 | 2 | `1b4k1/8/3P4/3KB3/8/8/8/8 w - - 0 1` |
| Brons #2 | far | 6 | 2 | `5k2/8/3P4/3K4/1B6/8/8/6b1 w - - 0 1` |
| Brons #3 | far | 7 | 3 | `7b/8/8/4PK1k/8/2B5/8/8 w - - 0 1` |
| Silwer #1 | near | 5 | 5 | `4k3/2b5/3P4/3K4/5B2/8/8/8 w - - 0 1` |
| Silwer #2 | near | 5 | 6 | `1B5k/6b1/3P4/4K3/8/8/8/8 w - - 0 1` |
| Goud #1 | near | 24 | 13 | `k7/8/4P1b1/4K3/8/1B6/8/8 w - - 0 1` |
| Goud #2 | near | 23 | 10 | `8/8/6b1/3P3k/4K3/8/6B1/8 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

## Tipe 27 — Teenoorgestelde Lopers: Verdedig! (hold, 6 men)

The game's first real defence badge. White K+B vs black K+B(opposite colour)+P.
Construction generated broadly (not hand-derived square-colour geometry) and
filtered to tablebase category=draw; correctness is the tablebase's job, not
mine.

**Selection criterion (confirmed with Martin before generating):** among
draw-candidates, count how many of white's legal moves *also* hold the draw
— `verify_positions.classify_move_for_white` reused, tallying `'draw'`
instead of C5's `'win'` — preferring ≤3 such moves so the puzzle can't be
solved by any plausible shuffle.

**What actually happened:** a full reversed-C5 pass over all 198
draw-candidates projected to ~30 minutes (network-bound, one tablebase query
per legal move per candidate) — killed after confirming the projection, and
re-run capped to a stratified 50-candidate sample (~7 min). Bronze found 3
positions at ≤3 drawing moves, matching the confirmed criterion exactly. The
capped sample found *zero* silver/gold candidates that tight — silver and
gold instead use the tightest available candidates that still demonstrate a
genuine losing move (tallied and confirmed, not assumed): silver 9–10 safe
moves out of 13–15 legal, gold 6 safe out of 12–13 legal. This is a
documented shortfall against the letter of the ≤3 criterion, not a silent
one — a wider (uncapped, ~30min) sample might find tighter silver/gold
examples; not pursued further under the 60-minute-per-type budget.

| Pos | Construction | Safe/legal moves | Verlore voorbeeld | FEN |
|---|---|---|---|---|
| Brons #1 | king already on blockade | 2/7 | Ke5 | `8/2kB4/8/2p3b1/3K4/8/8/8 w - - 0 1` |
| Brons #2 | king already on blockade | 2/9 | Ba5 | `b7/8/1B6/1k1p4/3K4/8/8/8 w - - 0 1` |
| Brons #3 | king already on blockade | 3/4 | Ka3 | `8/8/8/1p3b2/K7/8/2kB4/8 w - - 0 1` |
| Silwer #1 | king already on blockade | 9/13 | Bf6 | `8/4B3/8/3p1k2/3K4/8/6b1/8 w - - 0 1` |
| Silwer #2 | king already on blockade | 10/15 | Bf8 | `6k1/4B3/8/3pK3/8/8/6b1/8 w - - 0 1` |
| Goud #1 | king must travel to blockade | 6/13 | Kg6 | `8/2b5/8/5K2/5p2/8/8/6kB w - - 0 1` |
| Goud #2 | king must travel to blockade | 6/12 | Kh4 | `8/8/8/8/4p3/1b5K/8/1kB5 w - - 0 1` |

Harness: 7 posisies, OK=7 WARN=0 ERROR=0.

### Live-fire (close-out gate)

**Correct defence, all 7, real engine-vs-engine self-play for `holdMoves`
full moves:** all 7 hold (5 survive cleanly to the move limit, silver #2
draws early via repetition/insufficient material at ply 45 — also a win
condition in `hold` mode, not a defect).

**Wrong-defence demonstration (bronze #3, playing the identified losing move
`1.Ka3??`):** tablebase confirms the position flips from `draw` to `win`
(for black, dtm=29 plies) the instant the blunder is played. Real
engine-vs-engine play from there: eval crashes to −762cp immediately,
reaches forced mate (`#-6`) by ply 10, delivers actual checkmate by ply 21 —
comfortably inside `hold` mode's early-adjudication trigger (mate found, or
worse than −800cp for two consecutive black moves), confirming the
adjudicator built in Opdrag 2 would correctly catch this exact mistake.

## Cross-file dedup scan

`tools/scan_duplicates.py`, full file, post-Opdrag-8b: **0 exact duplicates,
0 translation-aware near-duplicates among active positions.** One
pre-existing INFO shadow (T08 silver #6 vs the already-retired T10 bronze
#2) — unrelated to this task, not a new finding.

## Fase 5 gating — verified against the real app.js, not reimplemented

Ran a small vm-sandboxed harness loading positions.js + fases.js + app.js
directly and calling the actual `isFaseUnlocked()`/`buildPool()` functions:

- Fresh profile (nothing earned): `isFaseUnlocked(5)` → `false`. ✅
- Veteran profile (every Fase-4 gating type's bronze earned): `isFaseUnlocked(5)`
  → `true`. ✅
- `buildPool()` under the veteran profile includes all 6 new types at bronze
  tier (15-entry pool, 6 from Fase 5). ✅

## Totals reconciliation

| | Before Opdrag 8b | After Opdrag 8b | Δ |
|---|---|---|---|
| On file | 222 | 264 | +42 |
| Active | 164 | 206 | +42 |
| Retired | 58 | 58 | 0 |
| Types | 19 (1–20 minus 10/21) | 25 | +6 (22–27) |
| Fases | 4 | 5 | +1 (Fyn Kuns) |

Matches the spec's "lean counts throughout: 3B/2S/2G" exactly — 7 positions
× 6 types = 42, no retirements (nothing was shipped that failed the harness;
positions that failed generation-time checks were swapped before ever
reaching positions.js, not retired-and-replaced).
