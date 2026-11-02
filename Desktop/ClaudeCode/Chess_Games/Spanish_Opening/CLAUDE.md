# Spanish Opening — Game-Specific Notes

Extends the shared conventions in `../CLAUDE.md`. Read that first.

---

## Identity

| Key | Value |
|-----|-------|
| Storage prefix | `ruylopez_trainer_` |
| Badge version | `2` (stored as `BADGE_VERSION`) - bumped in Card 3 since several badge conditions were chess-theoretically wrong and had to change; existing players' earned badges reset on next load, high score and games-played survive. Deliberately not bumped in Nov 2026: the badge fixes would have wiped the children's collections, so any badge earned falsely before then stays earned |
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

Stockfish, at one depth, for every position from the first move to the last. This differs on purpose from the cloud-first waterfall in the shared `../CLAUDE.md`. The eval used to switch from deep cloud eval in the opening to local Stockfish at depth 8 later on, and the display jumped when it did.

```
getStockfishEval(fen, multiPv)
  └─ 1. Stockfish 10, WebAssembly build, depth ENGINE_DEPTH (14), blob worker from cdnjs
        └─ if that can't start within ENGINE_LOAD_LIMIT: the older JavaScript build, at depth 10
  └─ 2. Lichess Cloud Eval, only if Stockfish can't load at all or crashes mid-game
```

- **One search per position.** `apiCache.engineEval` holds the search itself, so the Evaluering display, scoring, hints, the analysis panel and Black's engine moves all share one result and can't disagree. White-to-move positions get four lines, Black-to-move positions one.
- **Contempt is off** (`setoption name Contempt value 0`). Stockfish 10 defaults to 24, which tilts the score toward whichever side is to move, so the eval saw-tooths by about a pawn every half-move.
- **Hash carries through a game.** `ucinewgame` is sent only at Nuwe Spel.
- **Bound lines are ignored.** `upperbound`/`lowerbound` scores are provisional.
- **WebAssembly, not the JavaScript build.** Same search (identical node counts) and much faster: in a test browser the first search at depth 10 took 0.2 s against 3.6 s, and later searches ran roughly three to six times faster. Don't time the engine in the Claude desktop app's browser pane: on the same Mac it measured 400,000 nodes a second at one moment and 8,000 at another, probably because the pane or app was in the background. From a blob worker this build can't find its `.wasm` file, so `loadEngineWorker` prepends a small fetch redirect. `Module.locateFile` does not work in this build.
- **The first search runs behind the loading screen,** and gives the eval for the starting position.
- **Stopping:** a search gets `ENGINE_TIME_LIMIT` (8 s), then `stop`, and still waits for `bestmove` so that line can't end the next search. A hard stop 2 s later covers an engine too busy to answer. A new `go` then takes over the running search and the engine answers with two `bestmove` lines, so `engineStale` swallows the extra one.
- **The JavaScript build runs at depth 10** (`ENGINE_DEPTH_FALLBACK`), because it can't finish a cold depth 14 search within the limits. It is a last resort for browsers without WebAssembly. The eval-loss bands are set for depth 14, so it reads a little harsher.

Measured on three full games (Steinitz, Chigorin, Marshall), counting half-move eval changes of a pawn or more:

| Setup | Changes of a pawn or more | Largest change |
|-------|---------------------------|----------------|
| Depth 10, contempt on | 6, 3, 8 | 1.6 |
| Depth 12, contempt off | 0, 0, 1 | 1.2 |
| Depth 14, contempt off (used) | 0, 0, 1 | 1.0 |

The one remaining change is in the Marshall, around ...Qh3, where the attack comes into the search's view.

**Trade-off:** depth 14 is shallower than cloud eval, so the engine's first choice isn't always the book move (at 5...Be7 it can prefer 6.Bxc6 to 6.Re1). Popularity still scores main-line moves at full marks, and `pickIdeaMove` keeps hints on the main line when the engine finds the popular move sound.

### Scoring: rank and popularity, capped by eval loss

A move first scores the higher of its engine rank and its Lichess popularity rank (see `scoreMove`). That alone rewards popular blunders: 8.Qxd4 in the Noah's Ark line is the most played move at that node and loses a bishop. So `assessEvalLoss()` then caps the score by what the move gave away, on the win-chance scale Lichess uses for its own move labels (`winChance()`, -1 to +1):

| Win-chance loss | Label | Score cap | Example at depth 14 |
|-----------------|-------|-----------|---------------------|
| 0.40 or more | `flater` | 1 | 3...a6 4.O-O leaves the bishop hanging (0.80); 8.Qxd4 in the Noah's Ark (0.45) |
| 0.25 or more | `fout` | 2 | 9.a4 against the Marshall (0.38); 5.Nxe5 in the Exchange (0.25) |
| 0.15 or more | `onakkuraat` | 3 | 4.Bc4 after 3...a6 (0.17); 6.c3 after 5...Be7 (0.16) |

- The engine's best move is never capped.
- Loss compares the position after the best move with the position after the played move, searched alike (`moveLoss`). Comparing with the score at the root reads too harshly, because that search ends a half-move earlier.
- The bands are set for depth 14, which reads losses a little larger than a deep search does. If `ENGINE_DEPTH` changes, recheck them: every blunder tested sat at 0.45 or more, and no main-line move above 0.06.
- The note is stored in `lastMoveNote`, which `showScorePopup` and `showMoveAnalysis` read so the popup and the Jou Skuif panel agree with the capped score. The "val van X na Y" note shows the Evaluering before and after the move.

### Eval perspective convention

- **Local Stockfish** (raw UCI `score cp`/`score mate`): side-to-move-relative.
- **Lichess Cloud Eval** (fallback only): White-POV. Verified empirically in Card 2.
- `getStockfishEval()` returns lines as the source gave them, which agree only when White is to move. For a Black-to-move FEN use `getWhitePovEval()`, which flips local results. `makeAIBlackMove` passes a Black-to-move FEN but only reads the move.

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
| `carbon` | `currentScore < 50` |
| `chorizo` | 5+ total games played |

### Named variations: earned on an exact position

`BADGE_LINES` in `app.js` lists each named variation as a move sequence. A badge is earned when the board matches the position at the end of its line (`LINE_AWARDS`), checked after every move. This replaced the old move-number windows and loose move-name checks, which awarded badges in unrelated lines. Any move order that reaches the position counts.

| Badge | Line (from 1.e4 e5 2.Nf3 Nc6 3.Bb5) |
|-------|-------------------------------------|
| `morphy`, `berlin`, `bird`, `steinitz`, `schliemann`, `cozio`, `classical` | 3...a6, 3...Nf6, 3...Nd4, 3...d6, 3...f5, 3...Nge7, 3...Bc5 |
| `open` | 3...a6 4.Ba4 Nf6 5.O-O Nxe4, or with 5...b5 6.Bb3 Nxe4 |
| `closed` | 3...a6 4.Ba4 Nf6 5.O-O Be7, or with 5...b5 6.Bb3 Be7 |
| `averbakh` | ...5.O-O Be7 6.Re1 d6 |
| `archangel` | ...5.O-O b5 6.Bb3 Bb7 |
| `worrall` | ...5.O-O Be7 6.Qe2 (Lichess names 5.Qe2 the Wormald, which earns nothing) |
| `marshall` | ...6.Re1 b5 7.Bb3 O-O 8.c3 d5 |
| `anti_marshall` | ...7.Bb3 O-O 8.a4 |
| `breyer`, `zaitsev`, `chigorin`, `smyslov`, `kholmov` | after 8...d6 9.h3: 9...Nb8, 9...Bb7, 9...Na5, 9...h6, 9...Be6 |
| `keres` | after 9.h3: 9...a5 or 9...Nd7 (see naming note) |
| `gajewski` | after 9...Na5 10.Bc2: 10...d5 |

### Other badges

| Badge | Condition |
|-------|-----------|
| `first_blood` | White's first capture, any move |
| `queen_capture` | White captures the queen (`move.captured === 'q'`), any move |
| `castled` | White plays `O-O` or `O-O-O`, any move |
| `center_control` | White pawns on e4 AND d4 simultaneously, any move |
| `exchange` | `Bxc6` at **moveNum === 4**, after Black's `a6` (3...a6 4.Bxc6) |
| `delayed_exchange` | `Bxc6` at **moveNum 5 to 10**, after Black's `a6` |
| `cinderella` | `Bc2`, with `Ba4` then `Bb3` already in history, **moveNum <= 14** |
| `noahs_ark` | The trap position is on the board (3...a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4) and White plays anything except 8.Qxd4 |
| `checkmate` | White delivers checkmate |

`carbon` is not awarded after White mates Black, because an early win leaves few moves to score.

### Black steers toward locked lines

Black used to pick only from the top five moves by popularity. That made 3...Nd4, 3...f5, 9...a5 and 9...Nd7 impossible, and the deep lines very rare. Now `pickSteerMove()` runs first in `makeAIBlackMove`:

- `STEER_CHANCE` (0.6) of the time, if the position lies on a line whose badge this player hasn't earned, Black plays the next move of such a line. Each locked line counts once, so a move leading to many locked badges is more likely. Otherwise Black plays by popularity as before.
- White must still play the line's moves. If he leaves it, the board stops matching and Black plays normally.
- After 8.Qxd4 in the Noah's Ark line, Black always springs the trap (`TRAP_REPLIES`), so the lesson lands.
- Simulated with live Explorer shares, a player who always follows the main lines earns the whole set in a median of about 46 games, against never before.

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

---

## Hint System

- Players J and L: hints available moves 4 to 10 only
- All other players: hints available moves 4 to 16
- Two steps, on the same button:
  1. **Wenk** shows the idea behind the best move (`describeMoveIdea`), not the move. The move can now score at most `HINT_IDEA_CAP` (4).
  2. **Wys die skuif** shows the move and highlights its destination: engine best (green), most popular (blue), both (purple). The move can now score at most `HINT_MOVE_CAP` (3).
- A hinted move can never score 5, so the Perfek badges can't be earned through hints. Playing the suggested best move always earns the full capped score, even if the scoring call ranks it differently.
- `lastHintInfo` holds the hint for the current FEN, including its `stage`. It only applies if the FEN still matches when the move is scored.
- The hint stays on screen until a move is played. The old 3-second timer is gone, because it wiped the score breakdown if the player moved quickly.
- `canUseHint()` gates on `currentMoveNumber < getHintLimit()` (not `<=`) — `currentMoveNumber` counts moves already played, so at the decision point for move N it still reads N−1. The last hintable decision is move `hintLimit` itself (move 10 for J/L, move 16 for others); the following move (11 / 17) is refused.
- `updateHintButton()` sets the label and enabled state, and additionally gates on `game.turn() === 'w'`. It runs from `updateUI()`, including once Black's reply lands.

---

## Review Screen

The review plays the whole game by itself, like a GIF (`runReview`). Hersien Spel on the game-over modal starts it, and **Gaan voort** leaves for a new game at any time, including during a popup.

Each half-move runs: arrows up, a pause, the move plays, then any popups it earned.

| Step | Arrows | Pause |
|------|--------|-------|
| White, free move | Orange: the best moves, at most 3. Green: the move he chose. If his move is one of the best, the green arrow gets an orange edge | `REVIEW_WHITE_MS` (2 s) |
| White, forced moves 1 to 3 | Green only, because there was no choice | `REVIEW_FORCED_MS` |
| Black | Orange: his other options, at most 2. No arrow for the move he then plays | `REVIEW_BLACK_MS` (1.5 s), or `REVIEW_FORCED_MS` if there are none |

**The best moves** (`reviewBestMoves`): the engine's lines within `REVIEW_BEST_MARGIN` of its top line, so a poor second choice never gets an arrow, plus the main-line move if it is sound. That is the same test scoring and hints use, because depth 14 doesn't always rank the book move first. **Black's options** (`reviewBlackOptions`) work the same way with `REVIEW_OPTION_MARGIN`, leaving out the move he played.

**Popups** pause the run for `REVIEW_POPUP_MS` (`reviewPopupsFor`), in this order after the move:

- **Oepsie:** the move was a `flater` (see the eval-loss bands).
- **Mooi skuif!:** the move earned 5 before any hint cost (the engine's best, or the main-line move and sound), or it was a sound sacrifice (`isSoundSacrifice`). Not if a hint revealed the move.
- **{badge name} gespeel:** every badge this game touched, earned before or not, from `gameBadgeLog`. `awardBadge` logs each key once per game at the current half-move, before its already-earned check. End-of-game badges show after the last move. Chorizo only counts games played, so it shows only the time it is earned.

The Evaluering display follows the replay (`showEvalAt`), using the searches from the game. Skuif and Telling stay on the final values.

The arrows are an SVG over the board (`#review-arrows`, 800 units wide, 100 a square), repositioned on every draw and on resize so they stay on the squares. To stop a running review, bump `reviewRun` (`startNewGame` does); the loop checks it after every wait. Each step is prepared one half-move ahead, so leaving early leaves little queued for the engine, and a step that isn't ready in `REVIEW_PREP_LIMIT` runs without its orange arrows rather than holding up the run.

---

## Common Pitfalls

1. **Lichess token missing**: The token is injected at runtime via Netlify snippet injection — it is intentionally absent from the repo. Never hardcode it in `app.js`. If variation badges stop triggering and Black plays unusual moves, check that the Netlify snippet is still in place and the token hasn't expired on Lichess.
2. **Afrikaans `'n`**: String literals containing the Afrikaans article `'n` must use double quotes or a template literal — never single quotes.
3. **Badge icon source of truth**: The HTML `<span class="badge-icon">` inside each `.badge` div is what players see in the grid. The `icon:` field in the `BADGES` JS object is used for notifications and the game-over modal — keep them in sync.
4. **Stale async callbacks after "Nuwe Spel"**: `startNewGame()` increments a module-level `gameGeneration` counter. Any `setTimeout` that continues game flow (Black's scheduled reply, the game-over modal delay) must capture `const gen = gameGeneration;` at scheduling time and bail if `gen !== gameGeneration` when it fires; `makeAIBlackMove()` rechecks the same way after each `await`, since its Lichess fetch can straddle a New Game click. When adding a new scheduled continuation of game flow, follow this pattern rather than trusting `isGameActive` alone — a fresh game sets that back to `true` immediately.
5. **High score is earned, not accrued**: `updateUI()` may pulse the `#high-score` display when the running score is on pace to beat the stored high score, but must never mutate the `highScore` variable or call `savePlayerData()` mid-game — an abandoned game must not record a high score for a game never finished. `highScore` is only committed and persisted in `endGame()`, which captures `previousHigh` before comparing, so the "Nuwe Hoogste Telling!" message can compare the *final* score against the score that stood before this game (strictly greater than, so a tie is not a new record).

---

## Changelog

### 2026-11-02 (later): 35 badges

Dropped `sixteen_perfect`, which sat one move away from `perfect_game` (16 of the 17 free moves, against all 17). 35 badges fill every row: 5 across on desktop and phone, 7 across at tablet widths. A saved `sixteen_perfect` in a player's data is harmless and simply no longer shows.

### 2026-11-02 (later): Self-playing review

Replaced the old step-through review panel (buttons and "Posisie: 2/40") with the self-playing review. See "Review Screen".

### 2026-11-02 (later): Stockfish from the first move to the last

See "Eval Pipeline". One engine at depth 14 for the display, scoring, hints and analysis; contempt off; WebAssembly build with the JavaScript build and then cloud eval as fallbacks; the display opens on Stockfish's own eval rather than a fixed +0.3. Eval-loss bands reset for this engine, and loss now compares like with like. Hint ideas prefer the popular move when the engine finds it sound. Removed `getLocalStockfishEvalForDisplay`.

### 2026-11-02: Teaching and badge pass

- **Text:** corrected the bishop "bly op b5" claim (it would be lost to ...axb5), the Re1 message (it frees f1, not d1), the Anti-Marshall tooltip (8.a4 attacks b5, it doesn't stop ...b5), the Kasparov message (he dodged the Marshall with 8.a4), the unqualified "wins e5" message, "verassing" and "retreat".
- **Cache:** added the one-time `?v=2` on `app.js` and `styles.css` that was specified in July but never went in.
- **Scoring:** added the eval-loss cap. See "Scoring" above.
- **Castling bug:** Lichess cloud eval writes castling as e1h1, which chess.js rejects, so castling vanished from the engine's list even when it was best, and hints named a different move. Black's engine fallback could also end up on a different move for the same reason. `convertPvsToMoves` now normalises it (`CASTLING_UCI`) and also keeps mate scores.
- **Badges:** named variations now require the exact position, removing false awards (Zaitsev also earning Archangel, Averbakh on 5...b5 6.Bb3 d6, Smyslov on 9...h6 in the Berlin, Closed on any ...Be7, Open on 4...Nxe4 in the Berlin, Marshall on the Gajewski, Gajewski on any ...d5 exd5 ...Bg4). Noah's Ark now rewards declining 8.Qxd4. Worrall is 6.Qe2 only. Carbón no longer follows a win by mate.
- **Steering:** Black steers toward locked lines, so Bird, Schliemann and Keres are reachable and the deep lines come up.
- **Hints:** two steps with a score cost; timer bug fixed. See "Hint System".
- `BADGE_VERSION` deliberately not bumped, so the children keep their badges.
- A backup of the folder from before this pass is in `../Spanish_Opening_backup_2026-11-02`.

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
- **Task 4.7 (afterthought):** softened the Spanish theme palette in `styles.css` — `--spanish-red` (`#c60b1e` → `#a02224`) and `--spanish-yellow` (`#ffc400` → `#e9b23a`) moved warmer and less saturated, and the `body` background gradient's hardcoded dark stops (`#4a0d0d`/`#2d0a0a` → `#6b2d24`/`#4a241c`) were lifted out of the near-black range. `--spanish-dark-red`, `--spanish-gold`, `--spanish-orange`, `--cream`, and `--terracotta` are unchanged. The ~30 hardcoded `rgba(198, 11, 30, …)` / `rgba(255, 196, 0, …)` translucent borders/glows scattered through the file were mechanically updated to match (`160, 34, 36` / `233, 178, 58`) — same alpha values, same rules, just the RGB numbers. Every text/background pairing touching these variables was verified against the WCAG relative-luminance formula; all clear at least large-text AA (3:1), most clear normal-text AA (4.5:1). One known, disclosed exception: `.badge.unlocked .badge-name` (small bold 0.75rem caption) sits at 3.88:1 — below normal-text AA, but this was already only 4.34:1 before the change (never fully compliant) and the full badge description is available at 7–18:1 contrast via the hover tooltip. `.modal-content`'s separate hardcoded `#2d0a0a` was deliberately left untouched (different gradient, out of the stated scope). Score-band classes (`score-1`–`score-5`) were not edited, but inherit the warmer tones via the `var(--spanish-red)`/`var(--spanish-yellow)` cascade — the red/gold scoring semantics are unchanged. Hint colours in `app.js` and the chessboard itself were not touched.
