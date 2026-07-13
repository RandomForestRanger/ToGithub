# Opdrag 6 — Skoonmaak-Manifes (Purge Manifest)

One row per position touched during the pioneindspel-groep rebuild (Types 6, 8, 9, 10). Reasons cite the check that condemned or certified each position. Generated 2026-07-11.

## Tipe 6 — Sleutelblokkies (re-tag + re-limit only, per spec's "lightest touch")

| Pos | Aksie | Rede |
|---|---|---|
| Brons #1 | Re-tag `promote`, moveLimit 14→6 | Rollout=3 white moves; 60% budget |
| Brons #2 | Re-tag `promote`, moveLimit (default)→6, **black king moved e1→g1** | Rollout=1(orig)/3(new); exact file-shift duplicate of Brons #1 caught by `scan_duplicates.py`'s translation-aware pass — resolved by relocating the black king off the mirrored square, not by retiring either (both are healthy T6 positions) |
| Brons #3 | Re-tag `promote`, moveLimit 14→6 | Rollout=3; 60% budget |
| Brons #4 | Re-tag `promote`, moveLimit 15→8, **black king moved e1→c1** | Rollout=4; exact file-shift duplicate of Brons #3 caught by `scan_duplicates.py` — same resolution as Brons #2 |
| Brons #5 | Re-tag `promote`, moveLimit 17→11 | Rollout=6; 60% budget |
| Silwer #1–#3 | Re-tag `promote`, moveLimit (default)→7/13/12 | Rollout=4/9/8; 75% budget |
| Goud #1–#2 | Re-tag `promote`, moveLimit (default)→9/7 | Rollout=6/5; 85% budget |

## Tipe 8 — Opposisie (full rebuild)

| Pos | Aksie | Rede |
|---|---|---|
| Legacy Brons #1–#5 | **Retired** | C5-strict ERROR — 3, 3, 3, 3, and 5 winning moves respectively (drempel 2) |
| Legacy Goud #1–#2 | Already retired (Opdrag 3) | Tabelbasis DRAW |
| New Brons #6–#10 | Added, `promote`, C5-strict-certified | Each: exactly ≤2 winning moves (1 or 2), ≥1 natural-fail king move; rollout-budgeted (60%) |
| New Silwer #4 | Added, then **swapped mid-task** | First draft (Kg4/Pf4/Kf7) was an exact file-shift duplicate of Brons #7 (Kh4/Pg4/Kg7) caught by `scan_duplicates.py` — replaced with Kg6/Pe5/Ke8 (still C5-strict OK) |
| New Silwer #4–#6 | C5-strict-certified, `promote`, rollout-budgeted (75%) | — |
| New Goud #3 | Added — **distant opposition** (kings 3 apart, same file c) | C5-strict OK, 1 winning move (Kc5), natural-fail present; was an **exact FEN duplicate of T9 Brons #5's first draft** — resolved by changing T9's Brons #5 instead (T8's construction is the harder-to-replace distant-opposition-specific one) |
| New Goud #4 | Added — **distant opposition** (kings 3 apart, diagonal a2–d5) | C5-strict OK, 1 winning move (Ka3), natural-fail present |
| Bronze #7/#8/#10, Goud #3 | `moveLimit` bumped after first live-fire pass | Self-play rollout is movetime-based and not fully deterministic (documented pitfall elsewhere in this file) — a fresh rollout read 1 move over budget on 3 positions; bumped for margin. (Later confirmed: the *actual* production depth-20 search converts these in far fewer moves than either rollout estimate — see live-fire criterion 5 below.) |

## Tipe 9 — Zugzwang (rebuild bronze + escalate silver/gold)

| Pos | Aksie | Rede |
|---|---|---|
| Legacy Brons #1–#3 | **Retired** | C5-strict ERROR — 2, 2, and 5 winning moves respectively (drempel 1) |
| Silwer #1 ("die pêrel") | **Kept unchanged**, re-tagged `promote`, moveLimit (default)→11 | Spec: "the template... it stays." C5-strict OK: exactly 1 winning move (Kc5), natural-fail Ke4/Kc4 (found using the ≤-not-< natural-move definition — see below) |
| Legacy Silwer #2–#3, Goud #1–#2 | Already retired (Opdrag 3) | Tabelbasis DRAW / trebuchet 0.00 |
| New Brons #4–#6 | Added, `promote`, C5-strict-certified (=1 winning move) | Rollout-budgeted (60%) |
| New Brons #5 | Added, then **swapped mid-task** | First draft (Kc4/Pb4/Kc7) was an exact FEN duplicate of T8 Goud #3 — both types drew from the same underlying candidate pool without cross-checking; T9's copy was replaced (Kc3/Pd4/Kd5, still C5-strict OK, 1 winning move) since T8's distant-opposition gold is the harder-to-replace, more structurally specific construction |
| New Silwer #4–#5 | Added — **K+2P vs K+P**, escalated material per spec | C5-strict OK (=1 winning move each); rollout-budgeted (75%) |
| New Goud #3–#4 | Added — **K+2P vs K+P**, escalated material, "count the tempi" framing | C5-strict OK (=1 winning move each); rollout-budgeted (85%) |

## Tipe 10 — Driehoeksbeweging (rebuild attempted, not completed)

| Pos | Aksie | Rede |
|---|---|---|
| B1, B2, S2, S3 (all remaining actives) | **Retired** | C7 ERROR on all four — no reciprocal-zugzwang-triangle cycle in the tablebase-optimal line. Confirmed directly (not assumed) after the C7 detector's two bugs were fixed. |
| B3, S1, G1, G2 | Already retired (Opdrag 3) | Tabelbasis DRAW / DTM budget failure |
| **No replacements added** | Type left at 0 active / 8 retired, "In herbou 🔧" | See search log below |

### C7 search log (Type 10, why no positions were added)

1. **Bare 4-man blocked pair** (wP+bP directly blocked, kings swept): 40 top-eval-gap candidates + 84 geometrically-targeted candidates (white king off the pawn's file, black king defending near the 7th/8th rank) → **0/124 pass C7**. Root cause understood, not just observed: the tablebase's DTM-optimal path in bare KPvK is a direct, monotonic king march with *no repeated squares* whenever a direct win exists — triangulation is never the fastest method without something constraining the defender.
2. **Tethered 6-man** (main blocked pair + a mobile black reserve pawn on a distant file): 60 top-eval-gap candidates → **0/60 pass C7**; manual trace of the top candidate showed tactical infiltration (white's king simply captures both black pawns), not zugzwang — the reserve pawn being *mobile* let black use it as a spare tempo, defeating the intended constraint.
3. **Tethered, white king far from the reserve pawn** (same structure, filtered to exclude easy infiltration): 84 candidates → **0/84 pass C7**.
4. **Double-blocked 6-man** (both pawn pairs mutually blocked — *no* spare tempo anywhere for either side, the theoretically correct "two fronts" structure): ~270 candidates checked before the search was stopped → **0/270 pass C7**.

**Two real bugs found and fixed in `check_c7` during this search** (both now permanent fixes in `tools/verify_positions.py`):
- `tablebase_pv_rank` ranked candidate moves by DTZ, which doesn't strictly decrease without a zeroing move — this could rank a slow king shuffle above an immediate promotion, and in one traced case caused the PV construction to cycle forever. Fixed to prefer DTM (strictly monotonic to mate) with DTZ only as a fallback for piece counts beyond Gaviota's DTM ceiling.
- The "cycle" anchor search originally required a full-board match (both kings, same squares) at an earlier white-to-move point in the PV. This is a **logical impossibility** whenever X-with-white-to-move is a genuine draw (as required by part 1 of the C7 definition) — visiting a drawn position with white to move can never be part of a winning line, so no such anchor could ever exist. Fixed to match white's king square alone (with black's king required to differ from its position at X, per "forced to a mirror with fewer squares... cannot").

Both fixes were validated against the real, hand-confirmed reciprocal-zugzwang pair (Kd5-white-to-move=draw / Kd5-black-to-move=win, pawn d4 — the textbook direct-opposition case) before being trusted for the search above.

**Total: ~534 candidates examined across 4 structurally distinct constructions, zero C7 passes.** Per the spec's own acknowledged risk ("expect a low hit-rate and a real search... 3B/2S/2G is an acceptable fallback if the report shows the sweep was genuinely exhaustive"), this task closes with Type 10 at 0 active — even the reduced fallback wasn't reached. Recommended for a dedicated follow-up: either continue the search with a different tether construction (e.g., a genuinely *defended* black reserve pawn, forcing the king to guard it without being able to just walk away), or reconsider whether real triangulation in this specific move-limit-and-tier-band framing is rare enough to warrant hand-authoring 2–3 positions directly from known-published triangulation studies rather than generate-and-filter.

## Live-fire (criterion 5) — note on test methodology

The first live-fire pass (28/28 new/changed positions, depth-18 search) showed 6 failures — all converted eventually, just over their move limit, plus one repetition. Root cause: depth 18 is *below* this app's actual production strength (`CLAUDE.md`'s own "Stockfish plays every black move at full strength (depth 20+)"). Re-run at depth 20 (matching production): **28/28 pass**, most with large margin below their limit. No position or moveLimit needed changing as a result — the first pass was testing the wrong parameter, not finding a real defect. Recorded here so a future contributor doesn't repeat the same test-methodology mistake.

## Cross-file dedup scan (criterion 4)

`tools/scan_duplicates.py` (new standalone tool, engine-free) run against the full file post-rebuild: **0 exact duplicates, 0 translation-aware near-duplicates among active positions.** One retired-vs-active shadow reported as INFO (T08 Silwer #6 is a file/rank-shift of the already-retired T10 Brons #2 — not a defect, just noted).

## Totals reconciliation

| | Before Opdrag 6 | After Opdrag 6 | Δ |
|---|---|---|---|
| Active | 145 | 147 | +2 |
| Retired | 37 | 52 | +15 |
| Total on file | 182 | 199 | +17 |

Matches the spec's "expect net active count roughly stable — around 145±5" (147 is within range) — the manifest above is the authority for *why*, not the estimate.
