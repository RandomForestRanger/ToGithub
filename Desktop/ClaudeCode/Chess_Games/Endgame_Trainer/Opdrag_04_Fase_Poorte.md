# Skaakmat Afrigter — Opdrag 4 van 12
## Fase-Poorte: Van Lotery na Leerplan

> **Roadmap context:** Task 4 of 12. The harness stands at 0 ERRORs on 137 active positions (37 retired). This task touches **no positions at all** — it restructures progression. Currently a brand-new player's Speel button draws randomly from all twenty types: a beginner can be served a Lucena before they can mate with a queen. This task replaces the lottery with a curriculum.

---

## Why this exists

The design goal is "harder, not easier, as you progress" — but difficulty in the current app is governed only by tier (bronze→silver→gold) *within* a type, while the types themselves arrive in random order. Endgame knowledge is cumulative: pawn endings presuppose the basic mates (you must know K+Q vs K before a pawn race means anything, because that's what the race *becomes*); rook endings presuppose pawn endings (Philidor and Lucena are pawn-ending logic with rooks attached). Four gated fases encode that dependency structure.

## 1. The fase structure

Add a `FASES` definition (in `positions.js` or a small `fases.js` — your call, but data, not code):

| Fase | Naam (UI) | Tipes | Rationale |
|---|---|---|---|
| 1 | **Basiese Mats** | 1 (K+Q), 2 (K+R), 3 (2 Lopers) | The alphabet. Every later win terminates here. |
| 2 | **Pioneindspele** | 6, 7, 8, 9, 10, 11, 12 | Kings and pawns: key squares, opposition, races, breakthrough, decoys. |
| 3 | **Toringeindspele** | 13, 14, 15, 16 | The most common practical endgame family. |
| 4 | **Meesterklas** | 4 (L+R-mat), 5 (2 Ruiters — tans In herbou), 17, 18, 19, 20 | Full-distance technique and specialist knowledge. |

Note Type 4 (B+N mate) moves conceptually from "basic mate" to Meesterklas — it *is* a basic-material mate, but at DTM up to 33 it's the hardest technique in the app and belongs at the end, not the beginning.

## 2. Gating rules

- **Fase 1 is open from the start.**
- **Fase N+1 unlocks when every type in Fase N with at least one active bronze position has its bronze badge earned.** The "at least one active bronze" clause is load-bearing: it makes the gate robust to retirement (a fully-retired type like Type 5, or a future type whose bronzes are all retired, must never deadlock progression).
- Within a type, the existing tier chain is unchanged (bronze → silver → gold, earned per type). Fases gate *which types are visible and servable*; tiers gate depth within a type.
- The Speel pool = active positions ∩ unlocked fases ∩ unearned tiers, exactly as now but with the fase filter added.

## 3. Migration & multi-player correctness

Progress lives in `localStorage`, keyed per player (the Speler dropdown: Besoeker, Jacobus, Thomas, …). Requirements:

- **Fase state is derived, never stored.** Compute unlocked fases from earned badges at load time by the §2 rule. No new persisted state means no migration bugs and no way for stored fase-state to drift from badge reality.
- **Grandfathering:** earned badges are never revoked. Additionally, any fase containing an already-earned badge is treated as unlocked for that player even if the previous fase's gate isn't met — a player who earned a Lucena bronze under the lottery regime must not find that badge orphaned behind a lock.
- Verify the derivation runs per player and updates on player-switch.

## 4. UI

### Tuis / Kentekens
- The 4×5 grid becomes **four fase sections**, each with a header: fase number, name, and a progress chip (`3/7 bronse` style, counting only types with active bronzes).
- Locked fases: badges visible but greyed, a lock glyph on the section header, and the line *"Ontsluit deur al die bronse in Fase {N−1} te verdien"*.
- "In herbou 🔧" types render as in Opdrag 3, inside their fase, and never count toward gates.
- The stats bar keeps its computed totals from Opdrag 3; add nothing new to it beyond what the fase headers already show.

### Fase-unlock celebration (new screen or overlay)
When a badge award causes a fase gate to open, show it *after* the badge-unlock screen: fase name large, the types it contains as a row of badge icons, message **"Nuwe Fase Ontsluit! Ramkat!"**, same celebration energy as badge unlocks (confetti/glow), auto-dismiss ~4s with a "Terug na Kentekens" button. The badge screen and fase screen must not fight — sequence them.

### Strings (Afrikaans, add to the table)

| Context | String |
|---|---|
| Fase names | `Basiese Mats` / `Pioneindspele` / `Toringeindspele` / `Meesterklas` |
| Locked hint | `Ontsluit deur al die bronse in Fase {n} te verdien` |
| Fase unlock heading | `Nuwe Fase Ontsluit!` |
| Progress chip | `{x}/{y} bronse` |
| Under rebuild | `In herbou 🔧` (existing) |

## 5. CLAUDE.md

Update: fase table (§1), gating rule (§2), derivation-not-storage principle (§3), UI sections. Retire the old "Badge & Progression Logic" random-pool description.

## Acceptance criteria (definition of done)

1. **Fresh profile:** only Fase 1 types are servable; 30 scripted Speel draws (Node harness) never yield a type outside Fase 1; Fases 2–4 render locked with correct hint text.
2. **Scripted progression:** programmatically earn bronzes for Types 1, 2, 3 → the fase-unlock screen fires exactly once, after the third badge's unlock screen, and Fase 2 types immediately enter the Speel pool.
3. **Deadlock robustness:** with Type 5 fully retired, scripted-earn all *other* Fase 4 prerequisites and confirm nothing ever blocks on Type 5; then simulate a hypothetical Fase 2 type with zero active bronzes (temporarily flag one in a test copy) and confirm Fase 3 still unlocks.
4. **Grandfathering:** seed a legacy profile with an earned T13 bronze and nothing else → Fase 3 renders unlocked for that player, Fase 2 locked, and no badge is lost.
5. **Per-player isolation:** two players with different progress see different lock states after switching, without reload.
6. Harness: **0 ERRORs, totals identical to Opdrag 3's close** (137 active / 37 retired) — this task must not touch a single position. `git diff positions.js` shows only the FASES data addition (or nothing, if fases live in their own file).
7. CLAUDE.md updated per §5; all new strings Afrikaans.

## Do not

- Do not add, retire, re-tag, or re-limit any position (the `FASES` structure is the only permissible addition to `positions.js`).
- Do not change tier-within-type unlock logic.
- Do not redesign the visual style of the badge map beyond the sectioning — Task 12 owns polish.
- Do not store fase state; derive it (§3).

---

*Wanneer 'n splinternuwe speler net Fase 1 sien, en 'n veteraan niks verloor nie, is Opdrag 4 klaar. Opdrag 5 (Tipe 5-herbou — die twee ruiters kry eerlike posisies) volg.*
