# Skaakmat Afrigter — Opdrag 8b
## Fase 5 — Fyn Kuns: Ses Nuwe Tipes (22–27)

> **Scope:** six new types, all 4–6 men, all exact-tablebase-certifiable, built with the existing pipeline (Type 5's generate-and-verify sweep is the template: local-filter → cached tablebase queries → band selection → gauntlet). **Standing rules: 60-minute timebox per type's generation; a type that won't come in its hour ships thin or is cut with a one-line note; lean counts throughout: 3B / 2S / 2G.** No new certifiers of any kind. Runs after Opdrag 8, before Opdrag 9's final sweep.
>
> R+P vs R is deliberately absent — Types 13–16 already are that endgame.

## 0. Structure
- New types numbered **22–27** (10 and 21 stay dead; never reuse numbers).
- New **Fase 5: "Fyn Kuns"**, one row in FASES, gated by Fase 4's bronzes per the standard rule. Badge grid renders it as a fifth section automatically — verify, don't rebuild.
- Standard tier limits (12/24/36) unless a type's DTM bands force overrides; budgets by the usual 60/75/85%.

## The six types

### 22 — Koningin teen Toring (`mate`, 4 men)
Exact DTM. Bands: brons DTM ≤ 7 (positions where the rook falls to a fork/skewer within a few moves — the child hunts the rook, then mates); silwer DTM 12–18; goud DTM 20–30 (rook glued to its king; the full separation technique). Notes vocabulary: *dryf hulle uitmekaar; die vurk wag*.

### 23 — Koningin teen 2 Verbonde Pionne (`mate`, 5 men)
Tablebase `win` only — the drawn/lost configurations (far-advanced pairs) are silently excluded by the filter, which is the entire quality bar. Brons: pawns on ranks 4–5, queen wins them cleanly. Goud: pawns on the 6th, only precise blockade-first technique wins. *Blokkeer eers, vreet dan.*

### 24 — Toring teen 2 Verbonde Pionne (`mate`, 5 men)
Same construction as 23 with a rook. The instructive tension: the rook must attack from behind/the side before the pawns reach the 6th. Bands as 23.

### 25 — Ruiter-en-Pion teen Ruiter (`promote`, 5 men)
Category `win`; budgets from rollout (promote standard). Brons: defender's knight far from the pawn's path; goud: knight close, and only the shielding dance gets the pawn home. *Skerm die pad met jou ruiter.*

### 26 — Loper-en-Pion teen Loper, selfde kleur (`promote`, 5 men)
Category `win`. Brons: defending bishop short of diagonals; goud: the classic squeeze — drive the bishop off one diagonal, occupy, promote. *Twee diagonale, een loper — hy kan nie albei hou nie.*

### 27 — Teenoorgestelde Lopers: Verdedig! (`hold`, 6 men)
The game's first real defence badge. White: K + bishop; Black: K + bishop (opposite colour) + one pawn. Tablebase category (both movers where relevant) = **draw**; construction: white's king or bishop already controls the pawn's path on white's bishop-colour. `holdMoves` from the tier limit; the hold adjudication (built and tested in Opdrag 2) does the honesty work — a child who abandons the blockade fails fast with the culprit move named. Brons: king already parked on the blockade square (survive by not wandering). Goud: the blockade must be *reached* first under pressure. *Jou loper se kleur is jou vesting.*
Selection care (the one subtle bit): prefer positions where several plausible-looking white moves lose — a hold that survives any shuffle teaches nothing; the harness's C5 machinery run in reverse (count *drawing* moves; prefer ≤3) is available and free.

## Close-out
- Full gauntlet per position; per-type harness 0 ERRORs; dedup (translation-aware) clean; live-fire per type — for 27, live-fire is Stockfish attacking a scripted correct defence *and* one deliberate wrong defence to show the adjudicator firing.
- Fresh-profile check: Fase 5 locked and rendered; veteran-profile check: gate derives correctly.
- Manifest rows; CLAUDE.md: six type sections (one paragraph each), Fase 5 row, status table; coach playtest list appended (one position per new type for Martin's hand).

## Do not
- No R+P vs R. No seventh type. No detectors. No search past its hour — cut and note instead.
