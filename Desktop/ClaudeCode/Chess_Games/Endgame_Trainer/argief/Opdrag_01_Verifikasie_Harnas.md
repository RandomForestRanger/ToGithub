# Skaakmat Afrigter — Opdrag 1 van 12
## Verifikasie-Harnas (`tools/verify_positions.py`)

> **Roadmap context:** This is task 1 of a 12-task overhaul. Tasks: (1) verification harness, (2) win-condition architecture, (3) purge & patch broken positions, (4) phase gating, (5) rebuild Type 5, (6) rebuild pawn-ending cluster, (7) rebuild T11/T12, (8) rook endings, (9) minor-piece endings, (10) new types A, (11) new types B, (12) replay/hints/final QA. Every later task ends with "run the harness" — so this tool is built first and built well.

---

## Why this exists

A July 2026 Stockfish audit of the current `positions.js` found that ~30% of the 170 positions are broken: 27 are theoretically drawn (or lost — Type 5 gold evaluates at −0.7 for white), at least 5 are mathematically unwinnable within their move limits even with perfect play (e.g. all three Type 12 bronze positions are mate-in-14 against a limit of 12), 7 are stalemate minefields (Type 19 B1: 12 of 14 legal white moves are instant stalemate — including the move its own hint text recommends), and several "thematic" puzzles never require their theme (Type 10: triangulation is never the only win). None of this was visible without engine verification. This tool makes such defects impossible to reintroduce.

## Goal

A standalone Python CLI tool that reads `positions.js`, verifies every position against a battery of checks, prints a verdict table, writes `verification_report.md`, and exits non-zero if any ERROR-level defect exists. It must be runnable after every future edit to `positions.js` as a regression gate.

**This task does NOT modify `positions.js`, `app.js`, or any game code.** Tooling only.

## Environment & dependencies

- Python 3.10+, `python-chess` (`pip install chess`), `requests`.
- Stockfish binary: detect on PATH (`stockfish`), else `/usr/games/stockfish`, else fail with a clear install message (`apt install stockfish` / `brew install stockfish`).
- Lichess tablebase API for exact results on ≤7-piece positions: `https://tablebase.lichess.ovh/standard?fen=...`. Returns `category` (win/draw/loss...), `dtz`, and `dtm` (exact distance-to-mate, available for ≤5 pieces). Respect the service: max ~1 request/second, and cache every response in `tools/tb_cache.json` keyed by FEN so reruns are free and offline-tolerant (on network failure, fall back to Stockfish and mark the result `source: engine`).

## Parsing `positions.js`

The file is a JS module, not JSON. Two acceptable approaches, in order of preference:

1. **Node extraction (robust):** `node -e` script that loads the file's `POSITIONS`, `TIERS`, `ENDGAME_TYPES` objects and prints them as JSON to stdout; Python consumes that.
2. **Regex fallback** if node is unavailable: extract per type-block (`// ── Tipe N:`) and per tier (`bronze:`, `silver:`, `gold:`), capturing `fen`, optional per-position `moveLimit`, and optional `winCondition` (field arrives in Task 2; default `'mate'` when absent).

Effective move limit per position = per-position `moveLimit` override, else the tier default from `TIERS` (currently 12/24/36). A "move" is one full turn (one white move); Stockfish's "mate in N" counts white moves, so the two are directly comparable.

## The checks

Each check yields OK, WARN, or ERROR per position. ERRORs fail the build.

### C1 — Legality & house rules (ERROR on failure)
- FEN parses; `board.is_valid()`.
- White to move.
- No pawns on ranks 1 or 8.
- Kings not adjacent.
- No duplicate board positions (compare piece-placement + side-to-move fields only) across the entire file. WARN on near-duplicates: identical position shifted by one file/rank (detect by normalised translation — nice-to-have, WARN only).

### C2 — Theoretical result (ERROR if wrong for the win condition)
- If ≤7 pieces: query tablebase (cached). `category` must be `win` for `mate`/`promote` positions; must be `draw` (from the player's side) for `hold` positions.
- Else, or on network failure: Stockfish eval at depth 28. Classify: WON if mate score or cp ≥ +300; DRAWN if |cp| < 100; suspicious zone in between → WARN with the eval printed.
- ERROR if a `mate`-condition position is DRAWN or LOST. (This single check would have caught all 27 broken positions, including every Type 5 position.)

### C3 — Depth budget vs move limit (ERROR/WARN)
The audit found bronze puzzles with zero slack (Type 7 B2: mate-in-12, limit 12 — one imperfect move by an eight-year-old means failure). Enforce:

| Tier | Budget |
|---|---|
| Brons | DTM ≤ 60% of the move limit |
| Silwer | DTM ≤ 75% |
| Goud | DTM ≤ 85% |

- DTM source: tablebase `dtm` when ≤5 pieces (exact). Otherwise Stockfish deep search (depth 30, plus a 15-second `Limit(time=...)` pass if no mate announced); treat engine mate counts as **upper bounds** and label them so in the report.
- ERROR if DTM > move limit (unwinnable). WARN if DTM exceeds the tier budget but fits the limit.
- For `promote` positions the "target" is promotion, not mate: verify instead that Stockfish's PV promotes within the move limit's white moves (walk the PV; find the first white promotion move index). WARN if the PV doesn't promote within budget; this heuristic will be refined in Task 2.

### C4 — Stalemate-trap scan (ERROR/WARN)
For every legal white move from the start position: does it immediately stalemate black? Report `n_stalemating / n_legal`.
- ERROR if > 30% of moves stalemate (a minefield, cf. Type 19 B1's 12/14).
- WARN if any move stalemates (fine in a deliberate pat-awareness puzzle, but it must be a conscious choice).
- Nice-to-have (WARN only): repeat the scan one ply deep along Stockfish's top-3 replies, to catch cages that form on move 2.

### C5 — Thematic integrity: unique-winning-move test (WARN)
For positions belonging to types configured as *thematic* (config list in the script header; initially: 9 Zugzwang, 10 Driehoeksbeweging; later tasks extend it): evaluate every legal white move at depth 18; count moves that keep a winning eval (mate score or cp > +300 after the move).
- Ideal: exactly 1 winning move. WARN if ≥ 3 (the theme is decorative — the audit found Type 9 B3 with 5/6 moves winning). Print the winning moves in SAN so a human can judge whether the "natural" move fails.

### C6 — Note sanity (WARN)
Extract the first SAN-looking token from each position's `note` (pattern like `Kc6!`, `Td4!`, `1.b6!`). If it parses as a legal move from the FEN, check it isn't an instant stalemate and doesn't drop the eval below +100. If it doesn't parse as legal, WARN loudly — the audit found notes recommending outright illegal moves (Type 9 S1 recommends "Kd5!" with white's own pawn on d5) and stalemating moves (Type 19 B1's note recommends the pat).

## CLI interface

```
python tools/verify_positions.py            # full run, all checks
python tools/verify_positions.py --type 9   # one type only
python tools/verify_positions.py --fast     # skip C5, depth 20, engine-only (pre-commit speed)
python tools/verify_positions.py --no-net   # never call the tablebase API
```

- Progress line per position as it runs (these runs take minutes; silence reads as a hang).
- Configurable at the top of the file: engine depths, budget percentages, thematic-type list, eval thresholds.

## Output

1. **Console:** one line per position — `T09 silwer #1 | OK/WARN/ERROR | verdict summary` — followed by a totals block.
2. **`tools/verification_report.md`:** a table (Tipe, Pos, FEN, Uitspraak, Details) with ERRORs first, then WARNs, then a collapsed OK section; a header block with date, engine version, depth settings, and counts. The report is the artefact reviewed after every future task.
3. **Exit code:** 0 if no ERRORs, 1 otherwise — so it can gate CI or a git pre-commit hook.

## Acceptance criteria (definition of done)

1. Running against the **current** `positions.js` reproduces the known audit findings, minimally: all 8 Type 5 positions ERROR under C2; Type 12 bronze (all 3), Type 10 B3 and Type 11 B3 ERROR under C3; Type 19 B1/B3 ERROR under C4; Type 9 S2/S3 and G1/G2 ERROR under C2; Type 9 S1's note WARNs under C6.
2. `--fast` completes in under ~3 minutes on the full file; the full run may take 15–25 minutes and prints progress throughout.
3. Rerunning with a warm `tb_cache.json` makes no network calls.
4. A `tools/README.md` (10 lines) explains usage and how to read the report.

## Do not

- Do not modify `positions.js` or any app code in this task.
- Do not "fix" positions the tool flags — flagging is the job; fixing is Tasks 3–9.
- Do not hammer the lichess API: 1 req/s, cache everything, degrade gracefully offline.

---

*Wanneer die harnas die bekende foute korrek uitwys, is Opdrag 1 klaar. Opdrag 2 (wenvoorwaarde-argitektuur) volg.*
