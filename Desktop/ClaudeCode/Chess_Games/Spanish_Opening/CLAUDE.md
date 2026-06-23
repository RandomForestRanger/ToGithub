# Spanish Opening — Game-Specific Notes

Extends the shared conventions in `../CLAUDE.md`. Read that first.

---

## Identity

| Key | Value |
|-----|-------|
| Storage prefix | `ruylopez_trainer_` |
| Badge version | `1` (stored as `BADGE_VERSION`) |
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

**White's moves (inside `!isBlackMove`):**

| Badge | Condition |
|-------|-----------|
| `first_blood` | First capture, any move |
| `queen_capture` | Captures queen (`move.captured === 'q'`), any move |
| `castled` | `O-O` or `O-O-O`, any move |
| `center_control` | White pawns on e4 AND d4 simultaneously, any move |
| `exchange` | `Bxc6` before Black's `a6`, **moveNum ≤ 8** |
| `delayed_exchange` | `Bxc6` after Black's `a6`, **moveNum ≤ 10** |
| `cinderella` | `Ba4` after Black's `a6`, **moveNum ≤ 8** |
| `worrall` | `Qe2` at **moveNum === 6** exactly |
| `anti_marshall` | `a4` at **moveNum === 8** exactly |
| `noahs_ark` | Bb3 before c4 after b5 — **moveNum 8–12** |
| `gajewski` | d5 + exd5 + Bg4 all in history — **moveNum ≤ 15** |

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
| `keres` | `Nd7` or `a5` at **moveNum === 9** exactly |
| `archangel` | Nf6 → b5 → Bb7 in order, **moveNum ≤ 10** |
| `marshall` | `d5` with White castled and c3 in history, **moveNum 8–10** |
| `checkmate` | White delivers checkmate (any move) |

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

---

## Common Pitfalls

1. **Lichess token missing**: The token is injected at runtime via Netlify snippet injection — it is intentionally absent from the repo. Never hardcode it in `app.js`. If variation badges stop triggering and Black plays unusual moves, check that the Netlify snippet is still in place and the token hasn't expired on Lichess.
2. **Afrikaans `'n`**: String literals containing the Afrikaans article `'n` must use double quotes or a template literal — never single quotes.
3. **Badge icon source of truth**: The HTML `<span class="badge-icon">` inside each `.badge` div is what players see in the grid. The `icon:` field in the `BADGES` JS object is used for notifications and the game-over modal — keep them in sync.
