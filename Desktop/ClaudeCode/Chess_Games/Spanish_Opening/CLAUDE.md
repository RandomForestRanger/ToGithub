# Spanish Opening — Game-Specific Notes

Extends the shared conventions in `../CLAUDE.md`. Read that first.

---

## Identity

| Key | Value |
|-----|-------|
| Storage prefix | `ruylopez_trainer_` |
| Badge version | `2` (stored as `BADGE_VERSION`) - bumped in Card 3 since several badge conditions were chess-theoretically wrong and had to change; existing players' earned badges reset on next load, high score and games-played survive |
| Max moves | 20 (moves 1–3 are forced) |
| Target score | 100 pts (17 free moves × up to 5 pts each + 3 forced × 5 pts) |
| Players | J, L, KC, CA, MB, T |

---

## Lichess Token

`window.LICHESS_TOKEN` must be set **before** `app.js` runs. It is **not** hardcoded in the repo. Two valid approaches:

1. **Netlify snippet injection** (production): Netlify dashboard → Site settings → Build & deploy → Post processing → Snippet injection. The snippet sets `window.LICHESS_TOKEN = 'lip_...'` in the page `<head>`.
2. **Local gitignored config** (dev): a file like `token.js` loaded before `app.js` in `index.html`, added to `.gitignore`.

To find the current token: Netlify dashboard snippet injection, or log into the J_P_B Lichess account → Preferences → API access tokens.

This token is required for `getLichessPopularity()` (Opening Explorer at `explorer.lichess.ovh`). Without it all Explorer calls return 401, breaking:
- Black's AI move selection (falls back to pure Stockfish — less varied opening lines)
- Scoring's Lichess popularity component
- Most opening variation badges (Black never plays the right moves)

**Verified empirically (Card 2, Task 2.3):** this is a genuine, consistent 401 auth requirement, not rate-limiting — a request with no `Authorization` header at all and a request with a malformed empty `Bearer ` header both return the identical `401 Authorization Required` from nginx. `getLichessPopularity()` now omits the header entirely when `window.LICHESS_TOKEN` is unset, rather than sending `Bearer ` with nothing after it — functionally the same 401 either way, but avoids sending a malformed header.

The Cloud Eval endpoint (`lichess.org/api/cloud-eval`) does **not** need auth and has no token in its fetch call — that is correct.

---

## Eval Pipeline

Currently **two-tier** (the Stockfish.online middle tier from the shared CLAUDE.md spec is **not implemented**):

```
getStockfishEval(fen, multiPv)
  └─ 1. Lichess Cloud Eval   (no auth needed)
  └─ 2. Local Stockfish.js   (blob worker, depth 10)
```

For this opening the missing middle tier has minimal impact — Cloud Eval covers virtually every Ruy Lopez position. If it ever becomes a problem, add the Stockfish.online tier between the two:

```
GET https://stockfish.online/api/s/v2.php?fen=...&depth=...   (max depth 15, 6s timeout)
```

### Eval perspective convention (verified empirically, Card 2 Task 2.2)

The two eval sources use **different** POV conventions for `cp`/`mate` — this is the opposite of what the shared `../CLAUDE.md` "cp is always from White's absolute perspective" convention describes for the other games, so don't assume Spanish_Opening matches them without checking:

- **Lichess Cloud Eval** (`lichess.org/api/cloud-eval`): already **White-POV**. Verified by fetching the FEN after `1.e4 e5 2.Nf3` (Black to move, White slightly better) — `pvs[0].cp` came back **positive** (+18), not negative. Do not flip this for Black to move; `updatePositionEval`'s cloud branch no longer does.
- **Local Stockfish.js** (raw UCI `score cp`/`score mate`): genuinely **side-to-move-relative**, as UCI always is. `updatePositionEval`'s local branch and `getLocalStockfishEvalForDisplay` still flip on `fen.includes(' b ')` — that flip is correct and must stay.
- `getStockfishEval()` (used by `scoreMove`, `showMoveAnalysis`, `showHint`) returns cp from either source depending on which one answered, but every caller only ever passes a **White-to-move** FEN — so White-POV and side-to-move-POV coincide there and no flip is needed either way.
- Both mate-to-cp conversions use the same `10000 - mateIn*10` formula, but `mateIn` means different things in each: Cloud Eval's `mate` is White-POV directly (no flip needed, same as `cp`); local Stockfish's `mate` is side-to-move (needs the flip, same as `cp`). Don't "fix" one to match the other's formula — they're intentionally different inputs to the same conversion.

---

## Forced Opening Moves

Moves 1–3 are enforced:

```
1. e4  / e5
2. Nf3 / Nc6
3. Bb5 / (free — Black's choice defines the variation)
```

Forced moves auto-score 5 pts with no popup. Free play starts at move 4.

---

## Badge System

### Scoring badges (awarded at `endGame`)

| Badge | Condition |
|-------|-----------|
| `perfect_game` | `currentScore >= 100` (all 20 moves top-scored) |
| `seven_perfect` | ≥ 7 free moves scored 5 pts |
| `twelve_perfect` | ≥ 12 free moves scored 5 pts |
| `sixteen_perfect` | ≥ 16 free moves scored 5 pts |
| `carbon` | `currentScore < 50` |
| `chorizo` | 5+ total games played |

### Move-number windows for all other badges

Opening badges are locked to realistic move ranges. `moveNum = Math.ceil(game.history().length / 2)` — includes the current move.

**Card 3 note:** several conditions below were chess-theoretically wrong before Card 3 and were corrected there — see "Badges whose meaning changed (Card 3)" at the bottom of this section before writing tooltip text (Card 4) or reasoning about historical badge-earning data.

**White's moves (inside `!isBlackMove`):**

| Badge | Condition |
|-------|-----------|
| `first_blood` | First capture, any move |
| `queen_capture` | Captures queen (`move.captured === 'q'`), any move |
| `castled` | `O-O` or `O-O-O`, any move |
| `center_control` | White pawns on e4 AND d4 simultaneously, any move |
| `exchange` | `Bxc6` at **moveNum === 4** exactly, after Black's `a6` — the textbook Exchange Variation (3...a6 4.Bxc6) |
| `delayed_exchange` | `Bxc6` at **moveNum 5–10**, after Black's `a6` — Bxc6 played later than move 4 (e.g. 4.Ba4 Nf6 5.Bxc6, or 6.Bxc6 after ...Be7) |
| `cinderella` | `Bc2`, with exact tokens `Ba4` then `Bb3` both already in history — the Spanish bishop's full retreat dance Bb5→a4→b3→c2, **moveNum ≤ 14** |
| `worrall` | `Qe2` at **moveNum === 5 or 6** |
| `anti_marshall` | `a4` at **moveNum === 8** exactly |
| `gajewski` | exact tokens `d5` (must be Black's move), `exd5`, `Bg4` all in history — **moveNum ≤ 15** |

Note: `Bxc6` with no `a6` having been played first (e.g. 3...Nf6 4.Bxc6) earns neither `exchange` nor `delayed_exchange` — it isn't either named variation.

**Black's moves (inside `isBlackMove`):**

| Badge | Condition |
|-------|-----------|
| `morphy` | `a6` at **moveNum === 3** |
| `berlin` | `Nf6` at **moveNum === 3** |
| `bird` | `Nd4` at **moveNum === 3** |
| `steinitz` | `d6` at **moveNum === 3** |
| `schliemann` | `f5` at **moveNum === 3** |
| `cozio` | `Nge7` at **moveNum === 3** |
| `classical` | `Bc5` at **moveNum === 3** |
| `open` | `Nxe4`, **moveNum ≤ 10**, mutually exclusive with `closed` |
| `closed` | `Be7`, **moveNum ≤ 10**, mutually exclusive with `open` |
| `averbakh` | `d6` at **moveNum === 6** exactly |
| `breyer` | `Nb8` at **moveNum === 9** exactly |
| `zaitsev` | `Bb7` at **moveNum === 9** exactly |
| `chigorin` | `Na5` at **moveNum === 9** exactly |
| `smyslov` | `h6` at **moveNum === 9** exactly |
| `kholmov` | `Be6` at **moveNum === 9** exactly |
| `keres` | `Nd7` or `a5` at **moveNum === 9** exactly — see naming note below |
| `archangel` | exact tokens `Nf6` → `b5` → `Bb7` in order, **all three must be Black's moves (odd history index)**, **moveNum ≤ 10** |
| `marshall` | `d5` at **moveNum 8–10**, requires exact token `c3` in history, White castled (`O-O` at an even index), **and** Black castled (`O-O` at an odd index) — the Marshall proper has both kings castled |
| `noahs_ark` | `c4`, **moveNum 8–12** — awarded only if White's light-squared bishop is NOT on b3 (and at least one white bishop remains on a light square) at that moment. This fires on the move that *would* spring the Noah's Ark Trap, rewarding the case where White saw it coming and stepped the bishop aside (e.g. to c2, or traded it off) |
| `checkmate` | White delivers checkmate (any move) |

**Naming note (`keres`):** this single badge slot fires for both `9...a5` (the true **Keres Variation**) and `9...Nd7` (conventionally the **Karpov Variation**, not Keres). This is a deliberate simplification to avoid adding a new badge slot — the `description` text (Card 4) now credits both names correctly rather than calling both lines "Keres"; the `name`/`title` fields were deliberately left as `Keres` / `Keres Lyn` to avoid UI width/consistency issues, so the short badge label still only shows one name.

### Badges whose meaning changed (Card 3)

Chess-theoretic errors in the original conditions above (this file was wrong, not just the code — see git history for the pre-Card-3 tables). Card 4 rewrote tooltip/description text for these to match:

- **`exchange`** — used to fire on *any* early `Bxc6` played *before* `a6` (i.e. exactly backwards). Now correctly requires `a6` first and fires only on the immediate 4.Bxc6.
- **`delayed_exchange`** — used to fire on the textbook immediate Exchange (`Bxc6` any time up to move 10, no `a6` requirement distinguishing it from `exchange`). Now correctly means Bxc6 played *later* (moves 5–10) than the immediate exchange.
- **`noahs_ark`** — used to reward the bishop being trapped on b3 (the victim's badge, awarded to the player who fell into the trap). Now correctly rewards the player whose bishop *escaped* b3 before the trap could spring. Also moved from White's move handler to Black's (it triggers on Black's `...c4`, not on any White move).
- **`cinderella`** — used to fire on the single most common move in the whole opening (`Ba4` after `...a6`), earned in nearly every game. Now requires the full `Bb5→a4→b3→c2` bishop retreat, a genuinely earnable and instructive milestone.
- **`worrall`** — used to require `Qe2` at exactly move 6. Now also accepts move 5, since the Worrall Attack is played on either move number depending on move order.
- **`keres`** — condition (`Nd7` or `a5` at move 9) is unchanged, but the *label* was wrong: `Nd7` is the Karpov Variation, not Keres. The code still awards one badge for both (no new slot), but the name/tooltip must stop claiming both are "Keres".

Not a meaning change, but also fixed in Card 3: `marshall`, `archangel`, and `gajewski` previously used substring matching (`history.join(' ').includes(...)`) that could false-positive on tokens like `Nc3` matching a `'c3'` substring search, or `Nd5`/`cxd5` matching a `'d5'` search. These now use exact-token history checks, and `marshall`/`gajewski` also gained new structural requirements (both sides castled; `d5` specifically played by Black) that make them fire less often but only in genuinely correct positions — this narrows *when* they fire but doesn't redefine what they represent, so no tooltip rewrite is needed for these three.

### `open` / `closed` mutual exclusivity

Tracked via `variationState`:

```js
variationState = {
    morphyPlayed: false,        // set when Black plays a6 on move 3
    openDefenseEntered: false,  // set when open badge fires
    closedDefenseEntered: false // set when closed badge fires
};
```

`open` only fires if `closedDefenseEntered === false`, and vice versa. Whichever move comes first in the game locks out the other. Reset at `startNewGame()`.

---

## Hint System

- Players J and L: hints available moves 4–10 only
- All other players: hints available moves 4–16
- Hint highlights engine best (green) and most popular (blue) destination squares; both combined = purple
- `lastHintInfo` caches hint data and is used as a scoring safeguard: if the player plays the hinted #1 engine move, they are guaranteed 5 pts regardless of what the scoring API returns
- `canUseHint()` gates on `currentMoveNumber < getHintLimit()` (not `<=`) — `currentMoveNumber` counts moves already played, so at the decision point for move N it still reads N−1. The last hintable decision is move `hintLimit` itself (move 10 for J/L, move 16 for others); the following move (11 / 17) is refused.
- The hint button, and `showHint()` itself, additionally gate on `game.turn() === 'w'`. Right after White's move is scored, `updateUI()` runs while it's still Black's turn to reply — without the turn check the hint would analyse Black's position and cache `lastHintInfo` under a FEN that scoring can never match. The button is re-enabled by calling `updateUI()` again once Black's reply lands (in `makeBlackMove()` and at every success path of `makeAIBlackMove()`).

---

## Common Pitfalls

1. **Lichess token missing**: The token is injected at runtime via Netlify snippet injection — it is intentionally absent from the repo. Never hardcode it in `app.js`. If variation badges stop triggering and Black plays unusual moves, check that the Netlify snippet is still in place and the token hasn't expired on Lichess.
2. **Afrikaans `'n`**: String literals containing the Afrikaans article `'n` must use double quotes or a template literal — never single quotes.
3. **Badge icon source of truth**: The HTML `<span class="badge-icon">` inside each `.badge` div is what players see in the grid. The `icon:` field in the `BADGES` JS object is used for notifications and the game-over modal — keep them in sync.
4. **Stale async callbacks after "Nuwe Spel"**: `startNewGame()` increments a module-level `gameGeneration` counter. Any `setTimeout` that continues game flow (Black's scheduled reply, the game-over modal delay) must capture `const gen = gameGeneration;` at scheduling time and bail if `gen !== gameGeneration` when it fires; `makeAIBlackMove()` rechecks the same way after each `await`, since its Lichess fetch can straddle a New Game click. When adding a new scheduled continuation of game flow, follow this pattern rather than trusting `isGameActive` alone — a fresh game sets that back to `true` immediately.
5. **High score is earned, not accrued**: `updateUI()` may pulse the `#high-score` display when the running score is on pace to beat the stored high score, but must never mutate the `highScore` variable or call `savePlayerData()` mid-game — an abandoned game must not record a high score for a game never finished. `highScore` is only committed and persisted in `endGame()`, which captures `previousHigh` before comparing, so the "Nuwe Hoogste Telling!" message can compare the *final* score against the score that stood before this game (strictly greater than, so a tie is not a new record).

---

## Changelog

### 2026-07-15 — Four-card remediation (Cards 1–4)

A full pass fixing deployment/lifecycle bugs, engine/API plumbing bugs, chess-theoretically wrong badge conditions, and pedagogical text/cosmetic issues accumulated in the original build.

**Card 1 — Deployment & Game Lifecycle**
- Fixed a year-long browser cache header in `netlify.toml` that could leave returning players stuck on a stale build.
- Added the `gameGeneration` counter so stale `setTimeout`s and in-flight `await`s can no longer act on a game that's since been reset via "Nuwe Spel".
- Fixed a soft-lock where stalemate/draw after White's move never ended the game (only checkmate did).
- Fixed the hint button being enabled during Black's reply window, and an off-by-one in the hint move-limit boundary.

**Card 2 — Engine & API Plumbing**
- Replaced the broadcast Stockfish queue with a promise-chain mutex (`withEngine`) so concurrent local-engine requests can no longer interleave UCI commands or steal each other's results.
- Fixed a sign-flip bug in `updatePositionEval`: Lichess Cloud Eval is White-POV (verified empirically against a live position), not side-to-move like local Stockfish's raw UCI output, so the cloud branch was double-flipping the eval after every White move.
- Stopped sending a malformed empty `Bearer` header when `window.LICHESS_TOKEN` is unset; confirmed empirically that the Explorer endpoint 401s identically either way (a genuine auth requirement, not rate-limiting).

**Card 3 — Badge Logic & Chess Theory**
- Corrected badge conditions that were chess-theoretically wrong (the spec propagated the bugs, not just the code): `exchange`/`delayed_exchange` were inverted, `noahs_ark` rewarded falling into the trap instead of avoiding it, `cinderella` fired on the single most common move in the opening, `worrall` was too rigid about move number, `keres` mislabeled the Karpov Variation.
- Replaced substring history matching (`history.join(' ').includes(...)`) with exact-token matching for `marshall`, `archangel`, and `gajewski` to kill false positives (e.g. `Nc3` satisfying a `'c3'` substring search).
- Bumped `BADGE_VERSION` to `2` — existing players' earned badges reset on next load; high score and games-played survive.

**Card 4 — Pedagogical Text, Cosmetics & Closeout**
- Rewrote 9 badge descriptions: the six whose *meaning* changed in Card 3, plus three unrelated factual errors (`schliemann` conflated Adolf Schliemann the lawyer with Heinrich Schliemann who discovered Troy; `marshall`'s "8 years secret" overstated the legend; `berlin` credited Kramnik with beating Kasparov in-game rather than winning the match).
- Deduplicated badge icons: `keres` → 🌊 (was sharing ⭐ with `sixteen_perfect`), `morphy` → 🎩 (was sharing 🏰 with `castled`) — verified all 36 badge keys now have unique icons and match 1:1 between `index.html` and `BADGES`.
- Fixed stale badge-count comments in `index.html` (claimed 20/13, actually 22/14).
- Removed dead code: `onDragStart`/`onDrop`/`onSnapEnd` (never wired into the `Chessboard` config — `draggable: false`), and `showScorePopup`'s unused `isForced` branch/parameter (its one call site never passed it).
- Fixed high-score persistence timing (see Common Pitfalls #5) — `updateUI()` no longer mutates or saves `highScore` mid-game; it's committed once in `endGame()`, and the game-over modal's record message now requires strictly beating the score that stood before the game, not `>=`.
