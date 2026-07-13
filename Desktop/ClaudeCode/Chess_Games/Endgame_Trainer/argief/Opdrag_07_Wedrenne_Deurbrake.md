# Skaakmat Afrigter — Opdrag 7 van 12
## Wedrenne, Deurbrake en die Lokaas: Tipes 7, 11 en 12

> **Roadmap context:** Task 7 of 12. Opdrag 6 gave the quiet pawn endings (6/8/9/10) their contracts; this task does the same for the *violent* ones: races (T7), breakthrough sacrifices (T11), and the outside passer as decoy (T12). It completes Fase 2 — after this, every pawn-ending type is promote-tagged, rollout-budgeted, and contract-certified. It also hardens one piece of Opdrag 2's architecture that these types are the first to stress (§2).

---

## 1. The three contracts

| Tipe | Kontrak | Wenvoorwaarde |
|---|---|---|
| **7 — Wedren** | *Tel die tempo's:* who queens first — and does first mean winning? Counting is the skill; at gold, the promotion-with-check and skewer finesses. | `promote` |
| **11 — Piondeurbraak** | *Offer om deur te breek:* pawns alone manufacture a passer; the sacrifice is the only way through, and the king is too far to stop it. | `promote` |
| **12 — Buitenste Verbygeraakte Pion** | *Die buitepion is 'n lokaas:* give it away, drag the king offside, harvest the other wing. | `promote` |

## 2. Architecture amendment: promote-trigger hardening (build first)

Opdrag 2's promote rule — white promotion = instant win — was safe for every type so far because black could never counter-promote. Type 7 breaks that assumption: in a race, *both* sides may queen, and a child who promotes one tempo after black has could be handed a "win" in a position that is objectively drawn or lost. Amend `adjudicate()`:

- On white promotion, consult the engine evaluation that black's reply search produces anyway (same no-extra-search principle as hold-mode's adjudication): if the post-promotion position is winning for white (mate score, or ≥ +300 cp), grant the win as now.
- If not, the round **continues**, with a one-time message: *"Jou pion het gepromoveer — maar die stryd is nog nie verby nie!"* From there the round is decided by the ordinary fallbacks: checkmate still wins in every mode; stalemate, repetition and the move limit still fail.
- For every clean-race and quiet-conversion position this guard never fires; for gold races it correctly *grants* the win when white queens into a skewer (eval already decisive) and correctly *withholds* it when a child queens into a dead Q-vs-Q draw.
- Regression: re-run the Opdrag-2 promote manual test (T12 S2) and one Opdrag-6 T6 rollout to confirm the guard is invisible where it should be. Update CLAUDE.md's win-condition table.

## 3. Per-type rebuild specification

Target end-state per type: **5B / 3S / 2G active** (Fase 2 standard set in Opdrag 6).

### Tipe 7 — Wedren (re-tag + certify; lightest of the three)
- Re-tag all ten to `promote`; recompute limits from rollout budgets (60/75/85%).
- **Clean-race property (bronze & silver):** in the live-fire rollout, black's pawn must never promote — the child wins by counting and running, full stop. Any B/S position whose rollout shows black queening gets retired and replaced with a generated clean race.
- **Gold = the finesse tier:** black *does* queen (or threatens to next move), and white wins anyway — promotion with check, or the classic new-queen skewer. The hardened trigger (§2) is what makes these honestly playable. Verify each gold's rollout shows the finesse firing.
- No strict C5 gate for this type (in a won race, most pawn pushes win — the pedagogy is choosing to run at all); instead report C5 counts as INFO and ensure at least one plausible *king* move loses in every position (the child who hesitates must pay).

### Tipe 11 — Piondeurbraak (rebuild: 4 new bronzes; audit the rest)
- Current stock: 1 active bronze (the fixed 1.bxc6 position), 3 silvers, 2 golds — all mate-tagged. Re-tag survivors to `promote`, re-budget, and certify everything old and new against the contract:
- **Breakthrough certification:** C5 at threshold ≤2, and the winning move(s) must be *pawn* moves while at least one king move loses — the sacrifice must be binding, not decorative. The classic geometry (three abreast vs three abreast, defender's king a knight's-tour too far) is the template; vary files, ranks and which pawn spearheads.
- Construction realism: these are 6–8-man positions. ≤7 men: tablebase `category` certifies the result; 8 men: deep engine eval (depth ≥ 30, two independent runs agreeing) plus the rollout. Budgets from rollout in all cases.
- Silver/gold escalation: silver adds a defending king close enough that *move order* within the breakthrough matters; gold adds a black counter-passer so the child must count the breakthrough *and* the race it launches (T7's skill, compounded — deliberate curriculum echo).

### Tipe 12 — Buitenste Verbygeraakte Pion (rebuild around the decoy)
- Retire B2 and B3 (black has no pawns — nothing to harvest, no decoy possible; the July audit's finding stands). Audit S1–S3, G1, G2 (which do have f7/g7 pawns) against the new certifier; retire failures.
- **C8 — decoy detector (new, this type only):** a position is certified when its live-fire rollout game exhibits the theme's full arc:
  1. Black's king travels to the outside passer — reaching its file or the square in front of it;
  2. White's king, meanwhile, captures at least one black pawn on the opposite wing;
  3. White's promotion (the winning one) happens on the harvest wing — or on the passer's wing only if black abandoned the chase, which the game record must show.
  Store the extracted event sequence (moves + squares) per position; that's the certification artefact.
- Construction guidance: white's outside passer on the a/b-file, mutual kingside pawns (2–3 each), kings centralised. The *bait must be genuine*: if white can win without ever pushing the outside pawn, the position belongs to T6/T7, not here — spot-check by having the rollout replay with the passer's pushes forbidden for white's first N moves; if white still wins comfortably, reject the candidate.
- Bronze: minimal harvest (one black pawn), short arc. Silver: two harvest pawns, tighter king geometry. Gold: black gets counterplay (his own passer or an active king) so the decoy's *timing* matters.

## 4. Housekeeping

- Purge manifest, one row per touched position, reasons citing the condemning/certifying check (clean-race fail / C5-pawn-binding / C8 arc / rollout budget).
- CLAUDE.md: three contracts into the type documentation; §2's amended promote rule into the win-condition table; status table updated. Note that with this task Fase 2 is complete: all seven pawn-ending types promote-tagged and certified.
- Fase-gate integrity re-confirmed after the churn (derived state, load-time — verify, don't assume).

## Acceptance criteria (definition of done)

1. Per-type harness runs for 7, 11, 12: **0 ERRORs**; all active positions `promote`-tagged with rollout-derived limits; counts at 5/3/2 per type.
2. **§2 evidence:** a scripted game where white promotes into a non-winning position — the guard defers, the message shows once, the round continues and ends by the ordinary rules; plus the two regression tests showing the guard invisible on clean conversions.
3. **T7:** rollout table for all ten — B/S games show black never promoting; both gold games show black queening (or one move from it) and the finesse winning anyway.
4. **T11:** C5 table — winning moves all pawn moves, a named losing king move per position.
5. **T12:** C8 event-sequence table per certified position (king-decoy square, harvest capture, promotion wing); the forbidden-passer spot-check results for all new candidates.
6. Translation-aware dedup scan across the whole file: clean.
7. Purge manifest reconciles; all notes C6-clean, Afrikaans, on-contract vocabulary (*tel die tempo's / offer om deur te breek / die lokaas*).
8. CLAUDE.md per §4.

## Do not

- Do not touch Types 6, 8, 9, 10 (Opdrag 6's certified stock) beyond read-only dedup scanning.
- Do not weaken §2's guard to make a pretty gold race pass — the guard outranks the position.
- Do not accept a T12 candidate that survives the forbidden-passer spot-check (winning without the bait means the bait is scenery).
- Do not renumber or rename types.

---

*Wanneer die lokaas eg is, die deurbraak bindend, en die wedren eerlik getel — dan is Fase 2 voltooi. Opdrag 8 (toringeindspele: die brug en die vesting) volg.*
