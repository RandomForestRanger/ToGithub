# Skaakmat Afrigter — Opdrag 3 van 12
## Skoonmaak: Verwyder, Herklassifiseer, Herstel (`positions.js` triage)

> **Roadmap context:** Task 3 of 12. Task 1 built the harness (now DTZ-bug-fixed, 37 ERRORs against current content); Task 2 gave every position a `winCondition` and deleted the wobble rules. This task drives the harness to **zero ERRORs** — not by rebuilding content (Tasks 5–9 own that), but by triaging what exists: retire the unfixable, re-tag the mislabelled, bump the impossible limits, correct the lying notes. After this task, every position a child can be served is honest.

---

## Why this exists

The harness currently reports 37 ERRORs: theoretically drawn positions (all of Type 5; most of Type 18 silver/gold), mate limits that are mathematically unbeatable (Type 12 bronze), stalemate minefields whose own hint text recommends the drawing move (Type 19 B1/B3), and puzzles with zero slack for an eight-year-old (Type 7's mate-in-12 against a limit of 12). Some of these are genuinely broken positions; others are *correct positions filed under the wrong win condition* — Task 2's architecture means a conversion endgame flagged "no mate in reach" may simply need `winCondition: 'promote'`. Triage accordingly: **re-tag before retiring, retire before rebuilding.**

## 1. The retirement mechanism (build first)

Add a per-position field `retired: true`. Retired positions:
- Stay in `positions.js` (audit trail; Tasks 5–9 may cannibalise them) under their original type/tier, each with a one-line comment stating the retirement reason and date.
- Are **never** served: the puzzle-pool selector filters them out. If a tier of a type has zero active positions, that tier is unearnable; if an entire type has zero active positions, its badge on the Tuis grid renders greyed with the label **"In herbou 🔧"** and is excluded from the Speel pool.
- Are skipped by the harness's C2–C6 checks (C1 legality still runs), and counted separately in the report header: `Aktief: N · Afgetree: M`.

Update the stats bar while you're in there: `index.html` hardcodes `0/63`, a stale artefact of the removed Type 21. The denominator must be computed from active content (currently 20 types × 3 tiers = 60, minus any tier rendered unearnable by retirement — compute it, don't hardcode it).

## 2. The triage list

Derive the definitive list from the harness report, not from this table — but the July audit predicts the following, and any *divergence* between this prediction and the harness must be called out in your report rather than silently resolved:

### 2a. Re-tag to `promote` (conversion endgames misfiled under mate)
- **Tipe 12 B1, B2, B3** — currently mate-in-14 vs limit 12 (impossible); promotion arrives far earlier. Re-tag; keep active. (The decoy *theme* is still missing — black has no pawns — but as honest promotion puzzles they're serviceable until Task 7 rebuilds them.)
- **Tipe 12 S1, S3** — same logic, consistency with S2/G1/G2 from Task 2.
- **Tipe 13 (Lucena) — all 8 positions.** The Lucena's payoff *is* the promotion; the bridge exists to force it. Re-tagging dissolves the B1/S1/S2 zero-slack problems and the B2 possibly-impossible mate in one stroke. Verify each passes the strengthened promote check (§4).
- **Tipe 17 B1–B3, S1–S3, G1** — winning conversions (+2.6 to +38) that only "needed" the deleted wobble because mate was out of reach. Re-tag; they become playable today. G2 is a genuine draw: retire it.
- **Tipe 15 — leave as `mate`** (mate-in-6-to-8; already sound) but note in CLAUDE.md that Task 8 revisits its difficulty curve.

### 2b. Retire (theoretically drawn, or unsalvageable by tag/limit)
- **Tipe 5: all 8** (drawn or lost; gold evaluates at −0.7 for white). Whole type → "In herbou"; Task 5 rebuilds.
- **Tipe 9: S2, S3, G1, G2** (opposition draws; the trebuchet is 0.00 with white to move).
- **Tipe 10: S1, G1, G2** (drawn) **and B3** (mate-in-19 vs limit 16 — a limit bump to ≥32 would exceed even silver's; not a bronze puzzle; Task 6 rebuilds the type anyway).
- **Tipe 8: G1, G2** (drawn — black reaches the blockade with opposition).
- **Tipe 11: B3** (mate-in-15 vs 12; a compliant bronze limit would be 25 — retire, Task 7 rebuilds).
- **Tipe 16: S2, S3** (drawn).
- **Tipe 18: S1, S2, S3, G1, G2** (all five 0.00 — the type keeps only its three healthy bronzes; Task 9 rebuilds the upper tiers).
- **Tipe 19: S3, G1** (drawn — black's counterpawn saves the half-point) **and B1, B3** (the stalemate minefields — see §3 for replacements).
- **Tipe 3: B2** (mate-in-1 where 12 of 19 legal moves are instant stalemate — as an unmarked bronze it's a booby trap; retire, and note it as a candidate for a future deliberate pat-awareness lesson).

### 2c. Limit bumps (sound positions, cruel budgets)
Apply the budget rule (bronze: DTM ≤ 60% of limit) via per-position `moveLimit`:
- **Tipe 7 B2, B5** (mate-in-12, limit 12 → `moveLimit: 20`).
- **Tipe 8 B1** (mate-in-14, limit 16 → `moveLimit: 24`).
- Sweep the harness report for any other C3 budget WARNs on `mate` positions and bump those too, *except* in types slated for full rebuild (5, 9, 10, 11, 12) — don't polish what Task 5–7 will replace.

### 2d. Note corrections (C6 findings)
- **Tipe 9 S1:** note recommends "Kd5!" — illegal (white's own pawn occupies d5). The unique winning move is **Kc5**. Rewrite the note around it; this is the best zugzwang puzzle in the file and deserves an accurate hint.
- Sweep every remaining C6 WARN. Any note recommending an illegal, stalemating, or eval-collapsing move gets rewritten against the engine's verdict. Notes on retired positions may be left as-is.

## 3. Two replacement positions for Tipe 19 brons

B1 and B3 must be *replaced*, not merely retired, or the type drops to one bronze. Construct two new wrong-coloured-bishop bronzes to these constraints, using the harness as your verifier (this is exactly what it's for):

- **Theme:** white's rook-pawn + wrong-coloured bishop would be a book draw *on their own*; a second resource (an extra pawn on the other wing, or a well-placed king) converts the win. The child's lesson: recognise the dead end, find the living resource.
- **Hard constraints:** C4 must report **zero** instant-stalemate moves from the start position (test to two ply — the old B1's cage was pre-formed, so the child's very first natural move drew); black's king must have ≥2 legal moves in the starting position; DTM ≤ 7 (tablebase-exact — these are ≤5-piece positions); no duplicate of any existing FEN.
- **Method:** generate candidates (perturb the healthy B2's pattern — shift kings/pawns by a file or rank), run each through the harness, keep the two best-scoring, and show me the harness lines for both in your report.
- Write fresh Afrikaans notes for both, engine-checked per C6.

## 4. Harness strengthening: the promote rollout

Task 1's promote check (scan the PV for a promotion move) was flagged as a heuristic from the start and is now the weakest gate guarding sixteen freshly re-tagged positions. Replace it with a **self-play rollout**: Stockfish plays both sides (movetime ~250ms/move, cap the rollout at the position's move limit); count *white moves* until the first white promotion. PASS if promotion occurs within the tier budget (60/75/85% of the limit), WARN within the limit but over budget, ERROR if the rollout hits the limit without promoting. Cache rollout results by FEN in `tb_cache.json` alongside tablebase entries (they're expensive). Keep the old PV scan as a fast pre-filter in `--fast` mode.

## 5. Reporting: the purge manifest

Nothing disappears silently. Your report ends with a manifest table — one row per touched position: `Tipe | Pos | FEN | Aksie (afgetree / hergetag promote / limiet 12→20 / nota herskryf / vervang) | Rede (one line)`. Diff-check: every position in the *old* file is accounted for in the new one (active, retired, or replaced-with-successor-noted); the two new Type 19 positions are marked as additions.

## Acceptance criteria (definition of done)

1. **Full harness run: 0 ERRORs.** This is the milestone the first three tasks exist for.
2. Remaining WARNs are enumerated in the report, each with a one-line justification (expected categories: thematic weakness in Types 9/10 bronze pending Task 6; promote rollouts over budget but within limit; near-duplicate warnings in the K+P cluster pending consolidation).
3. Active/retired counts in the harness header match the purge manifest exactly.
4. In-app: the Speel button, drawn 30 times in a row (scriptable via your Node harness from Opdrag 2), never serves a retired position; Type 5's badge renders "In herbou 🔧"; the stats-bar denominator is computed, correct, and no longer 63.
5. The two new Type 19 bronzes: harness lines shown, zero stalemate traps to two ply, DTM ≤ 7 tablebase-verified, fresh engine-checked Afrikaans notes.
6. Tipe 9 S1's note now recommends Kc5.
7. The purge manifest accounts for every position; any divergence between §2's predicted triage and the harness's actual findings is explicitly called out with your resolution.
8. `CLAUDE.md`: status table updated (per-type active counts, "In herbou" markers, pointers to the rebuild task that owns each retired group).

## Do not

- Do not construct new positions beyond the two Type 19 replacements — Tasks 5–9 own rebuilds, and they'll do it with proper theory per type.
- Do not delete any position outright; retirement preserves the audit trail.
- Do not "improve" the playable-but-thematically-weak Type 9/10 bronzes — they're honest puzzles wearing slightly grand labels, and Task 6 gives them the real treatment.
- Do not touch fase/badge progression structure (Task 4) beyond the "In herbou" rendering and the stats-bar fix.

---

*Nul harnas-foute is die mylpaal. Daarna is elke legkaart wat 'n kind kan trek, eerlik — en Opdrag 4 (fase-poorte) kan op skoon fondamente bou.*
