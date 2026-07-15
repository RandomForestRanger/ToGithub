# CARD 4 of 4 — Pedagogical Text, Cosmetics & Closeout

**Project:** Spanish Opening (Ruy Lopez) trainer — `Spanish_Opening/`
**Prerequisite:** Cards 1–3 merged. Read Card 3's report first — it lists the badges whose meaning changed and whose tooltips must be rewritten here.
**Scope:** `index.html`, `app.js` (BADGES text, dead code, high-score persistence), `Spanish_Opening/CLAUDE.md`.
**Standing rule:** If any single fix exceeds 60 minutes, stop and propose the cheapest cut.

**Language guardrail (critical here):** all player-facing text is Afrikaans, warm and child-appropriate (players are 8–9 years old, ~1600 ELO), with the existing light Spanish flavour (¡Olé! etc.). Afrikaans `'n` must sit inside double quotes or template literals. Keep the existing register — do not make the tooltips drier.

---

## Task 4.1 — Factual corrections in badge descriptions

1. **Schliemann:** the tooltip claims the variation is named after "die Duitse argeoloog Adolf Schliemann (wat ook Troje ontdek het!)". Two Schliemanns have been conflated: Troy was **Heinrich** Schliemann; the chess variation honours **Adolf** Schliemann, a lawyer. Rewrite — a wink that he was the *other* Schliemann (the one who dug through legal briefs, not Troy) fits the house style.
2. **Marshall:** "8 jaar lank geheim gehou" — the legend is usually told as roughly a decade and is itself disputed. Soften to "byna 'n dekade (so lui die legende)". The 1918 Capablanca date is correct; keep it.
3. **Berlin:** "gebruik het om Kasparov te klop in 2000" — Kramnik won the *match*; the Berlin games themselves were the drawing wall. Adjust to say he used it to neutralise Kasparov and win the match.
4. **Keres/Karpov (per Card 3):** tooltip must say 9...a5 is die Keres-lyn and 9...Nd7 die Karpov-variasie — both honoured under one badge.
5. **Rewrites required by Card 3's logic changes:** `exchange`, `delayed_exchange` (before/after ...a6 wording is now inverted-correct), `noahs_ark` (survival = the bishop stepped aside before ...c4 landed), `cinderella` (now the Ba4–b3–c2 retreat dance — the flamenco framing finally makes sense; remove the "na a5 of a6" nonsense), `worrall` (5. or 6.Qe2). Check every rewritten description against the actual awarding condition in `checkBadges` — description and code must agree.

## Task 4.2 — Icon deduplication (CLAUDE.md pitfall #3 applies)

Duplicates in the grid: `keres` and `sixteen_perfect` share ⭐; `morphy` and `castled` share 🏰. Choose distinct replacements for `keres` and `morphy` (suggestions: keres 🌊 — Estonian Baltic; morphy 🎩 — the New Orleans gentleman; your judgement). **Update both sources of truth**: the `<span class="badge-icon">` in `index.html` AND the `icon:` field in the `BADGES` object — they must match.

## Task 4.3 — Comment counts and small HTML lies

`index.html` comments claim "Opening Variation Badges (20)" and "Achievement Badges (13)". Actual counts: 22 and 14. Fix the comments (or drop the numbers entirely — they'll drift again).

## Task 4.4 — Dead code removal

- `onDragStart`, `onDrop`, `onSnapEnd` are defined but never registered (`Chessboard` config has `draggable: false` and wires none of them). Delete all three.
- The `isForced` branch of `showScorePopup` ("Ruy Lopez! (+5)") is never called — CLAUDE.md specifies no popup for forced moves. Delete the branch and the parameter.
- Delete `stockfishQueue` remnants if Card 2 left any.

## Task 4.5 — High score should be earned, not accrued

**Problem:** `updateUI()` commits and *persists* `highScore` mid-game. An abandoned game at move 10 records a high score for a game never finished, and the game-over modal's "Nuwe Hoogste Telling!" comparison is made against a value already overwritten during play.

**Fix:** during play, `updateUI` may still show the pulse when the running score exceeds the *stored* high score, but must not mutate or save it. Commit `highScore` in `endGame()` only: capture `const previousHigh = highScore;` before comparison, update + save if beaten, and let `showGameOverModal` compare against `previousHigh` so the "Nuwe Hoogste Telling!" message is truthful (strictly greater, not >=, so a tie doesn't claim a new record).

## Task 4.6 — Closeout & QA sweep

1. `runEvaluationTests()` — all runnable tests pass.
2. Full manual game as player KC: forced moves 1–3, one hint, a scored move of each band if achievable, game to move 20, modal shows, review mode walks positions.
3. Hover every badge: tooltip renders, no raw `'n` quoting breakage, description matches the awarding condition.
4. New Game mid-analysis: board stays clean (Card 1 regression check).
5. Final `Spanish_Opening/CLAUDE.md` sync: badge tables, hint section, eval-pipeline notes, token notes, and a short **Changelog** section at the bottom summarising the four-card remediation with today's date.

## Done-when checklist

- [ ] Every description matches its awarding condition (spot-check all six rewritten badges)
- [ ] No duplicate icons in the grid; HTML and JS icons in sync
- [ ] Dead code gone; `git grep onDragStart` returns nothing
- [ ] High score only persists at `endGame`; tie does not claim a new record
- [ ] QA sweep items 1–5 pass
- [ ] Report: what changed, plus a final list of anything discovered but deliberately left alone
