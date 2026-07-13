# Opdrag 8 — Toringe en Ligte Stukke: gap-fill manifest

Light-touch pass per `Opdrag_08_Toringe_Ligte_Stukke.md`. No new certifiers, no re-theming, no redesign of healthy positions. Only job: fill retired slots so no active type runs a tier empty.

Standing rules applied: 60-minute timebox per type's generation (none of the four types came close — total elapsed for all four was ~10 minutes); ship thin rather than search long; a tier with 2 is acceptable.

## T16 — Aktiewe vs Passiewe Toring (silver 1 → 3)

| # | FEN | Change | Evidence |
|---|---|---|---|
| S4 | `8/1R6/6k1/8/3K2P1/8/8/1r6 w - - 0 1` | Added | S1's exact skeleton, black king g6. Self-play: checkmate, white-move 11, 0 stalemate traps. |
| S5 | `8/1R6/7k/8/3K2P1/8/8/1r6 w - - 0 1` | Added | Same skeleton, black king h6. Self-play: checkmate, white-move 9, 0 stalemate traps. |

## T17 — Goeie Loper vs Slegte Loper (bronze 2 → 3, gold 1 → 2)

| # | FEN | Change | Evidence |
|---|---|---|---|
| B4 | `3b4/8/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1` | Added | Existing skeleton, bad bishop on d8. Self-play: promotes white-move 20 (budget 26, `moveLimit: 26`), 0 stalemate traps. |
| G3 | `8/8/3k4/2p1p3/1bP1P3/4B3/4K3/8 w - - 0 1` | Added | Existing skeleton, bad bishop on b4 (most active placement in the family). Self-play: promotes white-move 28 (`moveLimit` bumped to 32 for margin), 0 stalemate traps. |

## T18 — Loper teen Ruiter (silver 0 → 2, gold 0 → 2) — the real rebuild

All 5 legacy silver/gold positions were tablebase-drawn (Opdrag 3 finding); this is the one type where Opdrag 8 did genuine construction, per spec: bishop owns two widely-separated passers (a-file + h-file) that a bare knight cannot simultaneously chase and blockade.

| # | FEN | Tier | Tablebase | DTM (plies → white-moves) | C4 stalemate |
|---|---|---|---|---|---|
| Si1 | `8/8/6k1/8/3K4/1B6/P5n1/8 w - - 0 1` | Silver | `win` | 31 → 16 | 0/17 |
| Si2 | `8/8/8/4k3/2B5/8/P3n2P/3K4 w - - 0 1` | Silver | `win` | 27 → 14 | 0/17 |
| Go1 | `8/8/3k4/8/2B5/8/P4n1P/3K4 w - - 0 1` | Gold | `win` | 49 → 25 | 0/5 |
| Go2 | `8/8/8/2k1n3/2B5/8/P6P/3K4 w - - 0 1` | Gold | `win` | 51 → 26 | 0/19 |

All 4: ≤6 men (K+B+P+P vs K+N), within Lichess tablebase's 7-piece limit — exact certification, not engine heuristic. Every position's `category` was independently confirmed `win` before construction was accepted; 3 rejected candidates along the way were `draw` or illegal (opposite-check) and discarded.

## T19 — Verkeerde Kleur Loper (gold 1 → 2; silver left untouched)

Spec's stated gap was "silver 1, gold 1." File audit found silver already had 2 active (S1, S2) — only S3 was retired. Per the task's explicit "verify against the file, trust the file" instruction, silver was **not** touched.

| # | FEN | Change | Evidence |
|---|---|---|---|
| G3 | `7k/7P/6B1/P7/8/8/6p1/5K2 w - - 0 1` | Added | Same skeleton as B4/B5 (a-pawn rescuer + wrong-colour bishop + h-pawn), plus an extra black pawn (g2) as a defending resource near white's king. Tablebase `win`, DTM 15 plies → 8 white-moves, `moveLimit: 14`. C4: 0/5 stalemate traps. |

### Optional: `_dev` → T19 silver promotion (taken)

The Opdrag-2 hold-mode test fixture (`8/8/8/8/3b4/5k1p/8/6K1 w - - 0 1` — white is the *weaker* side, holding the wrong-bishop corner) was promoted to T19 silver S6 (`winCondition: 'hold'`, `holdMoves: 12`). The `_dev` copy was **removed**, not retired-with-identical-FEN: retiring it would have tripped `scan_duplicates.py`'s exact-duplicate check (active vs. "retired" identical FEN) for no benefit, since `_dev` was always test scaffolding, never part of the 20-type audit-trail convention. The `_dev` key stays in `positions.js` with empty arrays, since `buildPool()` in `app.js` filters on the key by name.

## Verification

- `python3 tools/verify_positions.py --type {16,17,18,19} --fast`: **0 ERRORs** on all four. WARNs present are the documented `--fast`-mode single-PV-scan limitation (slow positional conversions aren't found by a single fixed-depth PV) — identical pattern already present on the untouched, pre-existing siblings in types 17/18, not a new defect. All new positions individually confirmed via direct `self_play_rollout` and/or tablebase query (T18/T19 gold) instead.
- `python3 tools/scan_duplicates.py`: 0 exact duplicates, 0 translation-aware near-duplicates (active×active), 1 pre-existing INFO shadow (T08×T10, unrelated to this task).
- `node --check positions.js`: syntax OK.

## Final counts

222 positions on file, 164 active, 58 retired — confirmed independently by both `tools/scan_duplicates.py`'s own tally and `grep -c "fen:" positions.js`. 9 new active positions added this task (2+2+4+1 across T16/17/18/19) plus 1 net removal (`_dev`'s superseded fixture). See the per-type table in CLAUDE.md for the authoritative per-type breakdown.

## Not done (in scope per spec, correctly skipped)

- T13/T14/T15: no gaps, not touched.
- T18 gold's second position needed the DTM-51 candidate (Go2) since a `Go2b` with black king on c6 gave an identical DTM/category — only one was kept, no duplication risk since they weren't both added.
