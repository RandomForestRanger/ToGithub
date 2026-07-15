# CARD 3 of 4 — Badge Logic & Chess Theory

**Project:** Spanish Opening (Ruy Lopez) trainer — `Spanish_Opening/`
**Prerequisite:** Cards 1–2 merged.
**Scope:** `app.js` (`checkBadges` and `variationState` only) + the badge tables in `Spanish_Opening/CLAUDE.md`. Tooltip/description *text* is Card 4 — but where a badge's meaning changes here, flag it in your report so Card 4 rewrites the right tooltips.
**Standing rule:** If any single fix exceeds 60 minutes, stop and propose the cheapest cut.

**Important:** several documented conditions in `Spanish_Opening/CLAUDE.md` are chess-theoretically wrong; the spec propagated the bugs. Where this card contradicts CLAUDE.md, this card wins. Update CLAUDE.md's tables to match at the end.

---

## Task 3.1 — Exchange vs. Delayed Exchange is inverted

**Problem:** Code awards `exchange` for Bxc6 played *before* ...a6, and `delayed_exchange` after. Theory is the opposite. The Exchange Variation **is** 3...a6 4.Bxc6. The Delayed Exchange (DERLD) is Bxc6 on move 5–6 after 4.Ba4 (typically 4.Ba4 Nf6 5.Bxc6 or ...5.O-O Be7 6.Bxc6). As written, a child playing the textbook Exchange is told they played the Delayed Exchange.

**Fix:**
- `exchange`: `san === 'Bxc6' && variationState.morphyPlayed && moveNum === 4`
- `delayed_exchange`: `san === 'Bxc6' && variationState.morphyPlayed && moveNum >= 5 && moveNum <= 10`
- Bxc6 *without* ...a6 having been played (e.g. 4.Bxc6 against the Berlin) earns **neither** badge — it is not either variation.

## Task 3.2 — Noah's Ark badge rewards falling into the trap

**Problem:** Current logic awards "survival" when Bb3 was played *before* ...c4. But the trap works precisely because the bishop sits on b3 (hemmed by its own a2/c2 pawns) when ...c4 arrives — b5 covers a4, c4 occupies the last flight square. The badge currently fires for the victim.

**Fix (thin rule):** award `noahs_ark` at the moment **Black plays ...c4** (moveNum 8–12, exact SAN token `c4` played by Black — see 3.3) **if White's light-squared bishop is on the board and NOT on b3**. That means White saw the pawn storm coming and stepped aside (Bc2, Bd5, prior exchange, etc.) — genuine survival.
- Detect the bishop: scan `game.board()` (or `game.get()` over candidate squares) for a white bishop on a light square; simplest robust check is: no white bishop on `b3` AND at least one white bishop remains whose square is light.
- Note this check now runs on a **Black** move; move the block accordingly (it currently sits in the `!isBlackMove` branch).

## Task 3.3 — Kill the substring false-positives

**Problem:** `history.join(' ').includes('c3')` matches `Nc3`, `bxc3`, `Bc3`; `.includes('d5')` matches `Nd5`, `cxd5`, `Qd5`. Marshall can fire after Nc3 with no c3 pawn; Gajewski after any d5-adjacent move.

**Fix:** never substring-match SAN. Use exact-token tests on the history array:
```js
const hist = game.history();
const has = (san) => hist.indexOf(san) >= 0;
```
- **Marshall** (`d5` by Black, moveNum 8–10): require White castled (`O-O` at an even index — existing logic is fine), exact token `c3` present, **and** Black castled (`O-O` at an odd index) — the Marshall proper has both kings castled.
- **Gajewski**: exact tokens `d5`, `exd5`, `Bg4`, and additionally require that `d5` was played by **Black** (odd index) — otherwise White's own d5 push satisfies it.
- **Archangel** already uses exact `indexOf` — verify the three tokens are Black's moves (odd indices) while you're there.

## Task 3.4 — The Flamenco (cinderella) badge is trivial

**Problem:** It currently fires on `Ba4` after ...a6 — the single most common move in the whole opening. Every main-line game awards it instantly, devaluing the badge economy. ("Cinderella bishop" is also not real terminology, but naming is Card 4's problem.)

**Fix — redefine to the actual elegant manoeuvre:** the Spanish bishop's full retreat dance **Bb5→a4→b3→c2**. Award `cinderella` when White plays `Bc2` and the history contains exact tokens `Ba4` and `Bb3` in that order before it, moveNum ≤ 14. This is earnable, non-trivial, and genuinely instructive (the c2 bishop aiming at h7 is *the* classical Spanish plan).

## Task 3.5 — Worrall too rigid; Keres mislabelled

- **Worrall:** the classical Worrall is 5.Qe2 as often as 6.Qe2. Change to `san === 'Qe2' && (moveNum === 5 || moveNum === 6)`.
- **Keres:** 9...a5 is the Keres; 9...Nd7 is conventionally the **Karpov** Variation. Keep both triggers on the single badge (no new badge slot), but flag for Card 4 that the tooltip must credit both names correctly.

## Task 3.6 — Bump BADGE_VERSION

Badges were earned under wrong rules. Set `BADGE_VERSION = 2` so existing players' badge sets reset on next load (high scores and games-played survive — verify `loadPlayerData` preserves them, it should).

---

## Verification

Use console-driven games (`game.move(...)` sequences plus manual clicks, or temporarily call `checkBadges` with constructed positions):

1. 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 **4.Bxc6** → `exchange`, not `delayed_exchange`.
2. ...3...a6 4.Ba4 Nf6 **5.Bxc6** → `delayed_exchange`.
3. 3...Nf6 4.Bxc6 → neither.
4. A line where White plays Nc3 (never c3) and Black plays ...d5 on move 8–10 with both sides castled → **no** `marshall`.
5. Main line to Bc2 (e.g. ...Na5 10.Bc2) → `cinderella`; main line stopping at Ba4 → no `cinderella`.
6. a6/b5 line where the bishop goes to c2 before Black achieves ...c4 → `noahs_ark`; bishop parked on b3 when ...c4 lands → no badge.
7. 5.Qe2 → `worrall`.

## Guardrails (all cards)

- Never hardcode the Lichess token. Afrikaans `'n`: double quotes/template literals. chess.js 0.10.3 API. No refactors beyond the tasks.
- Do NOT edit badge names, icons, or descriptions — Card 4.

## Done-when checklist

- [ ] All seven verification lines behave as specified
- [ ] `BADGE_VERSION === 2`; high score survives the version bump
- [ ] Both CLAUDE.md badge tables (White's and Black's) updated to match the new conditions, including the moved Noah's Ark row
- [ ] Report: what changed + explicit list of badges whose *meaning* changed (for Card 4's tooltip rewrites): expected at minimum `exchange`, `delayed_exchange`, `noahs_ark`, `cinderella`, `worrall`, `keres`
