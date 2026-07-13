# Skaakmat Afrigter — Opdrag 5 van 12
## Tipe 5 Herbou: Twee Ruiters, Eerlike Posisies

> **Roadmap context:** Task 5 of 12. Harness at 0 ERRORs, 137 active / 37 retired; fases live. Type 5 (Koning & Twee Ruiters teen Koning) sits in Fase 4 as "In herbou 🔧" — all eight legacy positions retired in Opdrag 3 as theoretically drawn or lost (the golds, with a black pawn on h2, evaluated at −0.7 *for white*). This task builds its replacement: eight tablebase-certified 2N vs K+P positions where full-strength Stockfish loses because the position is genuinely lost, not because a script makes it blunder.

---

## Why this exists — the theory this type must embody

Two knights cannot force mate against a bare king: every mating net ends in stalemate one tempo too soon. The paradox at the heart of this endgame — the most beautiful lesson in it — is that **black's own pawn is white's mating resource**. The method (Troitsky):

1. One knight **blockades** the pawn dead.
2. King + the other knight drive black's king to a corner — a slow squeeze black cannot prevent.
3. At the precise moment the net closes, the blockading knight **releases**: the pawn runs, and those pawn moves are the tempi that let black avoid stalemate while the freed knight travels round to deliver mate. Release too early and the pawn queens; too late and it's stalemate. Timing is everything.

This works only if the pawn is blockaded **on or behind the Troitsky line**: a4, b6, c5, d4, e4, f5, g6, h4 (per file; "behind" = less advanced, i.e. nearer black's own side). The legacy positions violated every precondition — pawns unblockaded, free to run, far past the line. Hence the wobble hack, now deleted. The rebuild inverts the approach: **theory first, positions generated and certified from it.**

## 1. Position specification

Eight new positions, 3 Brons / 3 Silwer / 2 Goud, all satisfying:

**Structural invariants (every position):**
- Exactly 5 men: wK, wN, wN, bK, bP. White to move.
- The black pawn stands **on its file's Troitsky square or less advanced**, and a white knight stands **directly on its stopping square** (the square in front of it, from black's perspective) — blockade pre-established. The child's task is the squeeze and the release, not the chase; establishing the blockade against a running pawn is a different (harder) lesson, and not bronze material.
- Lichess tablebase `category` = **`win`** — not `cursed-win`. (In-app the 50-move rule is disabled, so cursed wins are technically winnable here, but every position in the DTM bands below is a clean win anyway; requiring `win` keeps the certification unambiguous.)
- All Opdrag-1 C1 house rules; no FEN duplicating anything in the file, retired stock included (the dedup scan from Opdrag 3's close-out is the reference).
- C4: zero instant-stalemate white moves, verified to two ply. This family is the stalemate capital of chess — check it properly.

**Difficulty bands (exact Gaviota DTM via tablebase; the type keeps its historical extended limits 22/34/46):**

| Tier | Move limit | DTM band | Position character |
|---|---|---|---|
| Brons ×3 | 22 | **DTM 8–13** | King already cornered or nearly; the child executes the endgame's signature move — the release — and the final net. |
| Silwer ×3 | 34 | **DTM 16–25** | King driven to the edge but not yet cornered; the squeeze's second half plus the release. |
| Goud ×2 | 46 | **DTM 28–39** | King still near the centre; the full drive, edge, corner, release, mate. The complete Troitsky experience. |

(Bands sit within the budget rule: ≤60% / ≤75% / ≤85% of 22/34/46.)

**Variety requirements across the eight:** at least three different pawn files overall; the two golds on different pawn files; bronzes should showcase different mating corners. Prefer positions where the tablebase-optimal first move is *instructive* rather than mysterious (a king-approach or net-tightening move a coach could explain in one sentence) — check the PV head when choosing among candidates.

## 2. Generation method

This is a filter, not a search — 5-man space is small and the tablebase is the oracle:

1. Enumerate/sample candidates: pawn on a legal Troitsky-compliant square, blockading knight fixed in front of it, then place wK, second wN, bK across legal squares (respect C1: kings non-adjacent, white to move, no black king in a capture-the-knight-for-free tableau — the tablebase filters that automatically, since a position where black wins a knight is a draw, category ≠ win).
2. Query the cached tablebase client for category + DTM; keep candidates in band.
3. Run survivors through the full harness checks; apply the variety requirements; select the eight.
4. Show the harness line **and** the tablebase JSON (category, dtm) for each selected position in your report.

Respect the API budget: the Opdrag-1 client's 1 req/s + cache discipline applies. Sample intelligently (fix pawn+blockader, sweep king placements) rather than firehosing thousands of queries — a few hundred candidates should yield the eight comfortably.

## 3. Notes & strings

Each position gets a fresh Afrikaans `note` that teaches, C6-verified (recommended move legal, non-stalemating, eval-preserving). House style: warm, one idea per note. The type's core vocabulary for consistency across the eight: *die ruiter hou die pion vas* (blockade), *druk die koning na die hoek* (squeeze), *los die pion op die regte oomblik* (release). At least one bronze note should name the trap explicitly: *te vroeg gelos = die pion hardloop; te laat = pat.*

## 4. Integration

- New positions are appended as fresh entries; the eight retired legacies stay retired, untouched.
- Verify the badge exits "In herbou 🔧" automatically once active positions exist (the Opdrag-3 rendering rule should handle this — confirm, don't assume) and that Type 5 rejoins the Speel pool for players with Fase 4 unlocked, per-tier as normal.
- `CLAUDE.md`: rewrite the Type 5 section — Troitsky preconditions, DTM bands, extended limits retained, wobble history reduced to one line of past-tense record. Update the status table.

## Acceptance criteria (definition of done)

1. Eight new positions in the file, structural invariants verified, each report row showing: FEN, tier, tablebase category (`win`), exact DTM, harness verdict line.
2. Full `--type 5` harness run (per-type protocol, per our established practice): **0 ERRORs**; file-wide totals move to 145 active / 37 retired / 182 total.
3. **Live-fire test:** via the Node harness, Stockfish (full strength) plays *both* sides from each of the eight positions; every game ends in checkmate within the tier's move limit. This proves the limits work in practice, not just in DTM arithmetic. Include per-position move counts in the report.
4. **The dishonesty regression test:** `grep` confirms no reintroduction of any move-weakening logic; the live-fire games from criterion 3 are the same games a child's opponent will play.
5. Cross-file dedup scan clean (standalone, engine-free, per Opdrag 3's close-out method).
6. Badge renders normally (not "In herbou") for a Fase-4-unlocked test profile; still greyed-locked for a fresh profile.
7. All eight notes C6-clean, Afrikaans, on-vocabulary.
8. CLAUDE.md updated per §4.

## Do not

- Do not touch any other type, any retired position, or any limit outside Type 5.
- Do not weaken the engine, anywhere, for any reason — that era is over.
- Do not include positions requiring the blockade to be *established* (pawn unstopped at move one) — even at gold. If you find a beautiful candidate of that kind, park its FEN in a comment for Opdrag 12's stretch-ideas list instead.
- Do not exceed the DTM bands "because the position is pretty." The bands are the contract.

---

*Wanneer volsterkte Stockfish agt keer skaakmat gesit word binne die limiet — sonder een geskripte flater — het die twee ruiters hulle eer terug. Opdrag 6 (die pioneindspel-groep) volg.*
