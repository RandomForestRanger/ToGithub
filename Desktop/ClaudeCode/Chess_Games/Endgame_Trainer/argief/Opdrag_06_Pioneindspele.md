# Skaakmat Afrigter — Opdrag 6 van 12
## Pioneindspel-Groep: Vier Tipes, Vier Skerp Identiteite

> **Roadmap context:** Task 6 of 12. This is the largest rebuild: Types 6, 8, 9 and 10 — the K+P family. The July audit's harshest structural finding was that these four badges are largely *one endgame wearing four labels* (T9 B1 and T8 B2 are the same position shifted one file), with themes that are decorative rather than binding (triangulation puzzles winnable without the triangle; "zugzwang" bronzes where five of six moves win). This task gives each type a sharp, non-overlapping identity, certified mechanically.
>
> **Scope decision, made here so you don't have to:** the four types remain four badges (merging would ripple through the badge economy, fase gates and saved progress for no pedagogical gain). "Consolidation" means *identity-sharpening*: each type gets a one-line contract, positions are certified against it, and cross-type near-duplication is eliminated. Their numeric order (6 → 8 → 9 → 10) already reads as the curriculum order within Fase 2.

---

## 1. The four contracts

| Tipe | Kontrak (the one thing it teaches) | Wenvoorwaarde |
|---|---|---|
| **6 — K+P teen K** | *Sleutelblokkies:* can my king reach a key square? The yes/no grammar of pawn endings. | `promote` |
| **8 — Opposisie** | *Opposisie is die sleutel tot die deur:* the win exists only for the player who takes (or keeps) the opposition — including **distant** opposition at gold. | `promote` |
| **9 — Zugzwang** | *Die wagskuif wen:* the natural, active move throws the win away; only quiet patience works. | `promote` |
| **10 — Driehoeksbeweging** | *Verloor 'n tempo om die deur oop te maak:* reciprocal zugzwang exists, and white must return to the same position with black to move. | `promote` |

All four re-tag to `promote` (Type 6's ten healthy positions included): the K+Q mate that follows promotion is Fase 1 property, and replaying it every round is rote, not learning. Recompute every limit from promote-rollout budgets — expect them to *shorten* substantially (promotion typically lands in 6–10 white moves; a bronze limit of ~10 is likely right where the mate-era limit was 14–17). Apply the 60/75/85% budget rule against rollout move-counts.

## 2. Certification machinery (build before positions)

Two harness extensions; both run only for types configured to need them:

**C5-strict (T9, and T8/T10 at threshold ≤2):** the existing unique-winning-move check, hardened. For T9: **exactly one** winning white move from the start position, and — the zugzwang signature — the *most natural* alternative must fail. Operationalise "natural": among the losing moves there must be at least one forward king move (a move decreasing king-distance to the black king or the promotion path). A puzzle where the only losing moves are obvious blunders teaches nothing.

**C7 — triangle detector (T10 only):** certify real triangulation, defined mechanically:
1. **Reciprocal zugzwang exists on the critical square:** find a position X in the optimal line such that X-with-white-to-move is *not* a win (tablebase: draw) but X-with-black-to-move *is* a white win. Verify both sides of X against the tablebase.
2. **The winning line uses it:** the tablebase-optimal line from the start shows white's king returning to a previously occupied square within a 3-move cycle (the triangle) while black's king, forced to a mirror with fewer squares, cannot — i.e. the position after the cycle repeats the pre-cycle position with the move flipped to black.
3. Start position passes C5 at ≤2 winning moves.
A T10 position failing C7 is *by definition* mislabelled, whatever its other virtues.

Also implement now the translation-aware near-duplicate scan (the Opdrag-1 nice-to-have): flag any two active positions identical under a file/rank shift. It runs engine-free; add it to the standalone dedup tool. The Type 5 gold-twin question from Opdrag 5's close-out is the cautionary tale.

## 3. Per-type rebuild specification

Target end-state per type: 5B / 3S / 2G active (T6 already has 5/3/2 — re-tag and re-budget only, plus replace any position the new scans condemn).

### Tipe 6 — Sleutelblokkies (lightest touch)
Re-tag all ten to `promote`; recompute limits via rollout; run the new near-duplicate scan against T8/9/10 survivors and retire any T6 position that collides (T6 keeps priority as the *basic* form — collisions retire the other type's position, except where T6's own positions collide with each other). Notes: audit each against the key-squares vocabulary (*sleutelblokkies*, *voor die pion*, *die koning lei*).

### Tipe 8 — Opposisie
- Keep the six healthy bronze/silver positions **iff** they pass C5≤2 (the audit measured ~3/5 winning moves — some will fail; retire failures and replace).
- **Rebuild gold as distant opposition ×2:** kings 3–5 squares apart on the same file/rank/diagonal with an odd number of squares between them; white wins only by *keeping* the distant opposition while approaching. Certify: C5≤2, and the losing alternatives must include the naive direct approach.
- All positions: taking/holding opposition must be the binding idea — if the pawn can win by tempo-moves alone (spare pawn pushes), it's a T6 position, not a T8 one; construct with the pawn's tempi exhausted or blocked.

### Tipe 9 — Zugzwang
- **S1, the gem, is the template** (unique winner Kc5; note already fixed). It stays.
- Retire the three weak bronzes (they're also the T8 near-duplicates) and build **3 new B, 2 new S, 2 new G**, every one passing C5-strict.
- Bronze may be pure K+P; silver/gold should escalate material richness (K+2P vs K+P with a locked pair is the classic zugzwang laboratory — 6–7 men: `category` from the tablebase still certifies win/draw; budgets come from rollout, which is already how promote positions are graded).
- Gold idea worth attempting: *mutual* zugzwang where the child must first recognise *whose* move matters (count the tempi). If certified candidates prove scarce, gold-tier pure-KP zugzwang at greater depth is acceptable — C5-strict is the contract, not the material.

### Tipe 10 — Driehoeksbeweging
- Retire all six survivors (B1, B2, S2, S3 fail the theme by measurement; the type restarts).
- Build **5B/3S/2G** passing **C7**. Construction guidance: real triangulation lives in positions where black's king is *tethered* — obligated to defend a pawn or blockade square — so it cannot mirror white's triangle. Pure untethered K+P vs K almost never qualifies (the audit's core finding); start from blocked-pawn structures (white pawn fixed against black pawn) and sweep king placements, letting C7 filter. Expect a low hit-rate and a real search; this is the task's hardest deliverable, and 3B/2S/2G is an acceptable fallback *if* the report shows the sweep was genuinely exhaustive within 6-man space.
- Bronze notes must name the manoeuvre (*loop die driehoek: d4–e3–d3 en terug*) — and C6 will now catch it if the named route is illegal, which is precisely why C6 exists.

## 4. Housekeeping

- Every retirement/addition/re-tag/re-limit in the purge-manifest format, one row per position, reasons cited to the check that condemned or certified it (C5-strict fail / C7 pass / near-dup of T6 B2 / rollout budget).
- CLAUDE.md: the four contracts (§1) become the types' documentation; status table updated; a short "certification" paragraph records that T9 is C5-strict-certified and T10 is C7-certified, so future contributors know the bar.
- Fase 2 gating: verify the gate math survives the churn (types briefly at zero active bronzes mid-task must not corrupt a live player's derived fase state — the derivation is load-time, so this should be automatic; confirm).

## Acceptance criteria (definition of done)

1. Full per-type harness runs for 6, 8, 9, 10: **0 ERRORs**, every active position `promote`-tagged with rollout-derived limits.
2. **C5-strict table for T9:** all eight active positions, each showing exactly 1 winning move (SAN), and at least one failing forward king move named per position.
3. **C7 table for T10:** per position — the reciprocal-zugzwang square-pair X (both tablebase verdicts shown), and the triangle cycle extracted from the optimal line.
4. Translation-aware near-duplicate scan across the whole file: zero collisions among active positions (report any retired-vs-active shadows as INFO).
5. Live-fire: every *new* position played Stockfish-vs-Stockfish to promotion within its limit; move counts tabled.
6. Purge manifest complete; totals reconciled (expect net active count roughly stable — around 145±5 — but the manifest, not the estimate, is the authority).
7. All notes C6-clean, Afrikaans, on-contract vocabulary per type.
8. CLAUDE.md per §4; fase-gate integrity confirmed.

## Do not

- Do not merge, renumber, or rename the four types.
- Do not touch Types 7, 11, 12 (Task 7 owns them) beyond the near-duplicate scan's read-only pass.
- Do not accept a T10 position on aesthetic grounds if C7 fails — the detector outranks the eye here, by design.
- Do not let limits stay at mate-era lengths after the promote re-tag; every limit must trace to a rollout measurement.

---

*Vier tipes, vier kontrakte, elke kontrak masjien-gesertifiseer. Wanneer die driehoek-verklikker sy eerste egte driehoek vind, is die moeilikste deel verby. Opdrag 7 (wedrenne en deurbrake) volg.*
