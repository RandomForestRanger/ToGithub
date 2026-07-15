# Skaakmat Afrigter — Opdrag 9 van 9
## Finale QA: Maak Skoon, Maak Reg, Stuur Uit

> **Scope:** the last pass. Fixed list, no discoveries welcome — anything new found gets logged, not fixed, unless it's a one-liner.

## 1. The known fix
Wins currently skip the result/replay screens straight to badge-unlock (flagged since Opdrag 2). Restore the designed flow: Uitslag → Herspeel → (badge/fase unlock if earned). Verify once per win condition (mate, promote, hold if present).

## 2. One-string honesty fix
Replay label *"Perfekte spel vanaf hierdie posisie"* → **"Sterk spel vanaf hierdie posisie"** (Stockfish without tablebases is near-perfect, not perfect — and in KBN it demonstrably isn't). All modes' variants updated to match.

## 3. Repo hygiene
File inventory: every file classified as referenced (by index.html/app.js/tools), generated, documented, or orphaned. Show the orphan list; on approval, move orphans to `/argief` and exclude it from deployment/publish config. Delete nothing.

## 4. Full sweep
- All types, per-type harness protocol: 0 ERRORs anywhere; dedup scan clean; totals line (aktief/afgetree/totaal) reconciled against the manifest chain.
- Stats bar, badge grid, fase gates: one scripted pass with a fresh profile and one with a veteran profile (grandfathering intact).
- Ten scripted Speel draws per fase-unlock state: never a retired position, never a locked type.

## 5. CLAUDE.md final rewrite
It has accreted nine tasks of amendments. Rewrite clean: current architecture (win conditions, fases, retirement, certification bars), current status table, the epitaphs (T10, T21), the standing 60-minute rule, and a short "how to add a position" recipe (gauntlet steps) for future Martin.

## 6. Handover artefact: the coach's checklist
End with `SPEELTOETS.md` — a one-page Afrikaans checklist for Martin's own playthrough: one position per type (chosen for teaching value), the three win-condition flows, one deliberate stalemate (to see the teaching message), one hold-mode loss (to see the adjudication), one fase unlock. The game is signed off by its coach, not its compiler.

## Do not
- No new features, positions, or refactors. Log-don't-fix applies to everything outside §1–§3.
