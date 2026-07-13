# Skaakmat Afrigter — Opdrag 6b (tussenopdrag)
## Tipe 10 Voltooi: Soek die Kern, Nie die Naald Nie

> **Roadmap context:** Surgical follow-up to Opdrag 6, run before Opdrag 7. Opdrag 6's sweep — ~534 candidates across four construction families — produced zero C7 passes, and Type 10 sits at 0 active / "In herbou". Before that becomes a conclusion about chess ("certifiable triangulation is vanishingly rare"), it must survive a conclusion about the instrument. Two detector bugs were already found mid-run; this task calibrates the detector against self-verified ground truth, inverts the search, and finishes the type.

---

## 1. The diagnosis to test first

C7 requirement (1) looks for the reciprocal-zugzwang position X "in the optimal line." Suspect implementation error: **X never appears in a winning line with white to move** — avoiding X-wtm (the drawn twin) is precisely what the theme teaches. X appears only as X-*btm*. If the detector scanned the line for the wtm occurrence, or matched the full position including side-to-move, zero hits across any number of candidates is the guaranteed output. First deliverable: read the detector's matching logic against this hypothesis and report the finding — whether it's this bug, another, or genuinely sound.

## 2. Invert the search: cores first

Stop generating starts and testing for triangles. Instead:

**Step 1 — RZ-core sweep (pure tablebase, no line analysis).** Enumerate 5-man blocked-pawn positions (wK, wP, bK, bP with the pawns mutually blocked on one file): for each piece configuration X, query the tablebase twice — X with white to move, X with black to move. Collect **reciprocal-zugzwang cores**: `category(X, btm) = win` (for white) and `category(X, wtm) ≠ win` (draw *or* loss — the trebuchet family, where the mover loses the pawn and the game, is the loss case and is guaranteed non-empty). Cache aggressively; this is a bounded sweep (two kings × blocked-pair placements) well within the 1 req/s discipline given the cache. **Report the core count.** If it is zero, the query harness is broken — that is a checkable fact, not a judgement call.

**Step 2 — Detector calibration against ground truth.** Take 5–10 cores. For each, construct starts S: white king displaced one or two triangle-steps from its core square, white to move, `category(S) = win` (tablebase-checked). These starts *require* triangulation by construction — the win runs through arriving at X with black to move. Run C7 on each. **Every calibration failure is a detector bug with a concrete reproducing case in hand**; fix and re-run until the calibration set passes. This table — core, start, verdict — is the task's central artefact. No production search happens until calibration is clean.

**Step 3 — Production build.** Sweep starts around the certified cores at graded depths (rollout move-counts into the 60/75/85% bands), apply the standard gauntlet: C5 ≤ 2, C7, C1 house rules, translation-aware dedup, live-fire to promotion within limit, `promote`-tagged, budget-derived limits.

**Step 4 — If 5-man cores yield too little variety** (shallow or samey puzzles), extend the core sweep to 6-man space (K+2P vs K+P, one pair blocked): `category` remains tablebase-certifiable at both movers; budgets come from rollout as standard. Do not reach for 6-man before exhausting 5-man — exact DTM makes the smaller space strictly easier to certify.

## 3. Targets & fallback

- Target: **5B / 3S / 2G**, per the Fase 2 standard.
- Acceptable fallback: **3B / 2S / 2G**, only with the calibration table clean *and* the core-sweep counts showing the space genuinely thin. "The detector passed known-good positions and the certified cores support only N puzzles" is an honest outcome; "the sweep found nothing" without calibration is not.
- If even the fallback proves unreachable with a clean instrument (I judge this unlikely once the search is core-first), stop and report rather than lowering C7's bar — the contract outranks the count, and we would then discuss re-scoping the type together.

## 4. Housekeeping

- Badge exits "In herbou 🔧" automatically on first active positions — confirm the rendering and Fase 2 gate math (Type 10 re-enters the gate once it has active bronzes; a player mid-progression must not lose an already-derived unlock — verify the grandfathering rule covers this re-entry direction).
- Notes: on-contract vocabulary (*verloor 'n tempo*, *loop die driehoek*, and name the route explicitly in at least one bronze — C6 will verify it's legal).
- Purge manifest rows for all additions; CLAUDE.md: shortfall entry replaced by the certification paragraph, status table updated.

## Acceptance criteria (definition of done)

1. §1 finding reported: the detector's matching logic audited against the X-btm hypothesis, with the verdict and any fix described.
2. Core-sweep count reported for 5-man space (and 6-man if reached), with the draw-twin and loss-twin (trebuchet) cases tallied separately.
3. **Calibration table:** ≥5 constructed known-good starts, all passing C7 post-fix.
4. Final positions (target or documented fallback), each with its C7 artefact: the core X, both tablebase verdicts, the extracted triangle cycle.
5. `--type 10` harness: 0 ERRORs; live-fire table; dedup clean; totals reconciled in the manifest.
6. Badge and gate behaviour per §4 confirmed for both a fresh and a mid-progression profile.
7. CLAUDE.md updated; all notes C6-clean and Afrikaans.

## Do not

- Do not lower C7's definition to rescue the count — calibrate the instrument, then trust it.
- Do not touch any other type; Opdrag 7's scope (7, 11, 12) starts only after this closes.
- Do not skip Step 2 to save time. The calibration table *is* the task.

---

*Eers die kern, dan die driehoek daaromheen. As die verklikker die klassieke posisies herken, sal hy die nuwes ook vind. Daarna: Opdrag 7.*
