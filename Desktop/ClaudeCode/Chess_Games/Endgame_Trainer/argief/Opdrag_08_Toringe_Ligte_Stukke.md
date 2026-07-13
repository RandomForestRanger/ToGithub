# Skaakmat Afrigter — Opdrag 8 van 9 (hersiene plan)
## Toringe en Ligte Stukke: Vul die Gate, Niks Meer Nie

> **Scope:** Types 13–19, one light-touch pass. No new certifiers, no re-theming, no redesign. Healthy positions are untouchable. The only job: fill retired slots so no type runs empty-tiered, using the existing gauntlet (harness + rollout + live-fire). **Standing rules: 60-minute timebox per type's generation; prefer shipping thin over searching long; a tier with 2 positions is acceptable, a tier with 0 in an otherwise-active type should be filled or the gap noted in one line.**

## The gaps (from the status table — verify against the file, trust the file)
- **T16:** silver has 1 active (S2/S3 retired) → add 1–2 silvers.
- **T17:** bronze has 2 (B1 retired), gold has 1 (G2 retired) → add 1 bronze, 1 gold, `promote`-tagged like their siblings.
- **T18:** silver 0, gold 0 (all five retired as drawn) → this is the real work. Build 2 silvers + 2 golds on winning theory: the bishop side owns an outside passer the knight cannot both chase and blockade, OR knight-side wins with pawns fixed on the bishop's colour. `promote` condition. Tablebase-certify ≤7 men; 60-minute box — if gold won't come, ship silver-only and note it.
- **T19:** silver 1, gold 1 → add 1 silver, 1 gold (wrong-bishop-plus-resource pattern, same as the Opdrag-3 bronzes).
- **T13/T14/T15:** no gaps — do not touch.

## Optional (only if under budget, ~15 min): the _dev hold fixture, already built and verified in Opdrag 2, may be promoted to a real T19 silver — `winCondition: 'hold'`, an Afrikaans note (*die verkeerde loper kan nie die hoek dek nie — bly in die hoek en hou die gelykspel*), retire the `_dev` marker. The game's first defence puzzle, nearly free. Skip without guilt if anything else ran long.

## Close-out
- Standard gauntlet per new position; per-type harness runs 0 ERRORs; dedup scan; manifest rows; CLAUDE.md status table.
- **Coach playtest list:** end the report with a short list of the new positions (type/tier/FEN) for Martin to play by hand — human pedagogy sign-off replaces machine theme-certification from here on.

## Do not
- No new checks, detectors, or certifiers. No touching Fase 2 types or healthy positions. No search past its timebox.
