# Skaakmat Afrigter — Claude Code Brief
### Chess Endgame Trainer (Afrikaans UI)

A chess endgame training web app. The player always plays white; Stockfish plays black at full strength, always. The goal is checkmate, promotion, or holding a draw, depending on the puzzle. The app is a learning tool first, a game second. **The entire UI is in Afrikaans.** Audience: young players (~8–12 years).

This file describes the app as it stands today. For the blow-by-blow history of how it got here, see git log and `tools/opdrag_*_manifest.md`; the ten completed task specs live in `argief/` (`Opdrag_01`–`Opdrag_08b`).

---

## Tech Stack

Vanilla JS, no build step for local development — matching the other three games in `Chess_Games/` (see the shared `Chess_Games/CLAUDE.md`).

- **Chess logic:** `chess.js` 0.10.3, CDN `<script>` tag
- **Board UI:** `chessboard.js` 1.0.0 (chrisoakman fork), CDN, plus jQuery (its dependency)
- **Engine:** Stockfish 10.0.2, loaded inside `stockfish-worker.js` via `importScripts()` from a CDN — a real Web Worker file, not the Blob-worker trick the other three games use
- **Styling:** plain CSS in `styles.css`, no framework

`index.html` loads `positions.js` → `fases.js` → `app.js` in that order (plain `<script>` tags, no modules/bundling). Game logic lives in `app.js`; positions live in `positions.js`. Local dev needs no install or build — serve the directory over plain HTTP:

```
python3 -m http.server 8080
```

(Web Workers require HTTP; opening `index.html` as a `file://` URL will not work.)

**Deployment** does have a build step, added for repo hygiene (below): `netlify.toml`'s `command` copies the six files the app actually loads (`index.html`, `styles.css`, `positions.js`, `fases.js`, `app.js`, `stockfish-worker.js`) into `dist/`, and `dist/` is what's published — not the working directory, which also holds `tools/`, `argief/`, and the CLAUDE.md/task-spec files that shouldn't be publicly served.

---

## Repo Layout

```
index.html, app.js, positions.js, fases.js, styles.css, stockfish-worker.js   # the shipped app
assets/cats/             # 92 badge-mascot cat PNGs (23 types x 4 tiers), also shipped — see Kentekenkat below
New_Cat.png              # source reference cat for the assets/cats/ generator, kept for regeneration
netlify.toml            # deploy config; build step copies the above into dist/ (gitignored)
CLAUDE.md                # this file
SPEELTOETS.md            # one-page Afrikaans playtest checklist for the coach
tools/                   # verification harness + one-off position/asset generators (see below)
argief/                  # archive: old_version/ (abandoned React rewrite) + completed Opdrag_01-08b specs
Opdrag_09_Finale_QA.md   # the active task spec, until it's done too
```

`tools/` (all referenced by `tools/README.md` or by each other, none orphaned):
- `verify_positions.py` — the verification harness, see Certification Bars below
- `extract_positions.cjs` — Node helper `verify_positions.py` shells out to, to parse `positions.js`'s bare `const` declarations into JSON without reimplementing a JS parser
- `scan_duplicates.py` — exact + translation-aware near-duplicate scan across all positions
- `generate_type5.py`, `select_type5.py`, `generate_type22.py`...`generate_type27.py` — one-off candidate generators for the types built via the generate-and-verify pipeline (see the recipe below); kept as templates for future types, not run automatically
- `build_cats_from_single.py` — **the live generator** for `assets/cats/`, see Kentekenkat below; run it again if `New_Cat.png` changes
- `generate_cat_sprites.py`, `extract_cat_reference.py`, `build_cat_sprites_from_ref.py` — superseded attempts at the same asset set (from-scratch procedural cats, then extraction from a multi-cat sprite sheet), kept as a record of what didn't work rather than deleted — see Kentekenkat below for why
- `opdrag_06_purge_manifest.md`, `opdrag_08_manifest.md`, `opdrag_08b_manifest.md` — per-task manifests with full per-position evidence (tablebase DTM, rollout numbers, corrections made mid-task)
- `tb_cache.json` (gitignored) — Lichess tablebase response cache; delete to force fresh lookups
- `verification_report.md` — overwritten by every harness run, committed anyway as a snapshot

---

## The 23 Endgame Types (Badge Names in Afrikaans)

Each type is one badge. Listed by numeric ID, not play order — actual curriculum sequencing is the Fase-Poorte grouping below. **Type numbers 5, 10, 17, and 21 are permanently dead — never reuse them** (see Epitaphs).

| # | Afrikaans Name | English Reference |
|---|---|---|
| 1 | Koning & Koningin teen Koning | King & Queen vs King |
| 2 | Koning & Kasteel teen Koning | King & Rook vs King |
| 3 | Koning & Twee Biskoppe teen Koning | King & Two Bishops vs King |
| 4 | Koning, Biskop & Ruiter teen Koning | King & Bishop & Knight vs King |
| 6 | Koning & Pion teen Koning | King & Pawn vs King |
| 7 | Verbygeraakte Pion Wedren | Passed Pawn Races |
| 8 | Opposisie & Koningaktiwiteit | Opposition & King Activity |
| 9 | Zugzwang | Zugzwang |
| 11 | Piondeurbraak | Pawn Breakthrough |
| 12 | Buitenste Verbygeraakte Pion | Outside Passed Pawn |
| 13 | Lucena-posisie | Lucena Position |
| 14 | Philidor-posisie | Philidor Position |
| 15 | Kasteel Agter Verbygeraakte Pion | Rook Behind Passed Pawn |
| 16 | Aktiewe vs Passiewe Kasteel | Active vs Passive Rook |
| 18 | Biskop teen Ruiter | Bishop vs Knight |
| 19 | Verkeerde Kleur Biskop | Wrong-Coloured Bishop |
| 20 | Koningin teen Pion op 7de Ry | Queen vs Pawn on 7th Rank |
| 22 | Koningin teen Kasteel | Queen vs Rook |
| 23 | Koningin teen 2 Verbonde Pionne | Queen vs 2 Connected Pawns |
| 24 | Kasteel teen 2 Verbonde Pionne | Rook vs 2 Connected Pawns |
| 25 | Ruiter-en-Pion teen Ruiter | Knight & Pawn vs Knight |
| 26 | Biskop-en-Pion teen Biskop | Bishop & Pawn vs Bishop (same colour) |
| 27 | Teenoorgestelde Biskoppe: Verdedig! | Opposite-Coloured Bishops: Defend! |

Total badge count: **69** (23 types × 3 tiers).

**Piece-name convention:** Koning (King), Koningin (Queen), Kasteel (Rook), Biskop (Bishop), Ruiter (Knight), Pion (Pawn) — used consistently in every player-facing string and in this document. SAN-shorthand move notation inside position notes (e.g. `Kf5!`, `Bf3!`, `Td4!`) is standard algebraic notation, independent of this word choice — `tools/verify_positions.py`'s `NOTE_PIECE_LETTER_MAP` accepts both the Afrikaans-initial letters (K/Q/D/T/L/R) and English ones (B/N) for exactly this reason, and neither needed to change when the prose words did.

---

## Tiers

| Tier | Afrikaans | Default Move Limit | Puzzles Per Type | Hints |
|------|-----------|------------|-----------------|-------|
| Bronze | Brons | 12 moves | 5 | Always available |
| Silver | Silwer | 24 moves | 3 | First 10 moves only, then *"Jy kan dit doen!"* |
| Gold | Goud | 36 moves | 2 | None |

A puzzle may override its tier's default via `moveLimit` in `positions.js` (e.g. when a type's material can't structurally convert within the default — see Type 24 in the status table).

**Definition of "move":** one full turn = one white move + one black response.

**Earning a tier:** completing any single puzzle of that tier/type within the move limit. Quality of play is not assessed. Once earned, no further puzzles of that tier/type are ever offered. Silver unlocks once Bronze is earned for that type; Gold once Silver is earned — subject to the Fase gate below.

---

## Win Conditions (`winCondition`: mate | promote | hold)

Every position carries an optional `winCondition` field (absent ⇒ `'mate'`). Not every endgame theme is checkmate-shaped: conversion endgames (outside passed pawn, good/bad bishop) get `promote`; drawing techniques (Philidor, wrong-coloured bishop fortress, opposite-coloured bishops) get `hold`.

All end-of-round detection routes through one function, `adjudicate(game, phase, moveInfo, evalInfo)` in `app.js`, called after every half-move (`phase`: `'after-white'` | `'after-black'`).

| Condition | Win | Fail |
|---|---|---|
| `mate` (default) | Black is checkmated within the move limit | Stalemate (either colour), move-limit exhaustion, threefold repetition |
| `promote` | Any white pawn promotes **and the guard confirms it** (below) — under-promotions count too. Checkmating black also wins outright. | Same as `mate`, if the guard confirms; otherwise the round continues |
| `hold` | White is the *weaker* side; survives `holdMoves` full moves, or stalemate/repetition/insufficient material occurs | White is checkmated, or early-adjudicated (below) |

- `hold` positions carry a `holdMoves` field (`posn.holdMoves || moveLimit` — defaults to the tier's move limit if absent).
- **Hold early adjudication:** after each black reply, `adjudicate()` reuses the eval already produced by that same Stockfish search (no extra search) — if it announces forced mate against white, or the score is worse than −800cp for two consecutive black moves, the round ends immediately naming the white move that preceded the collapse: *"Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer!"*
- **Promote-trigger guard:** promotion is not an automatic win — some races (Type 7) mean black may also queen, and a child one tempo ahead shouldn't be handed a win in an objectively lost position. On white promotion, `adjudicate()` stashes the move and lets the round continue; black's reply eval (already computed, not researched) is checked on the *next* call: mate score or ≥ +300cp confirms the win; anything less defers, shows *"Jou pion het gepromoveer — maar die stryd is nog nie verby nie!"* once, and falls through to the ordinary rules (checkmate still wins; stalemate/repetition/limit still fail).

**Stalemate, repetition, move limit — one table, since the polarity flips by mode:**

| Event | `mate` / `promote` | `hold` |
|---|---|---|
| Stalemate | Failure — *"Pat — Swart het geen wettige skuiwe nie..."* | **Win** — *"Pat — en dis presies wat jy wou hê! Gelykspel gehou!"* |
| Threefold repetition | Failure — *"Dieselfde posisie drie keer herhaal..."* | **Win** — *"Drie keer dieselfde posisie — die gelykspel is verseël!"* |
| Move/hold limit reached | Failure — *"Tyd op — die outjie het weggekom..."* | **Win** — *"Vesting gehou! Die gelykspel is joune. Baie goed!"* |

The 50-move rule stays **disabled** in every mode — move limits are shorter anyway, and `app.js` never relies on chess.js's `game_over()`/`in_draw()` (which silently folds in fifty-move detection); it checks `in_checkmate()`/`in_stalemate()`/`in_threefold_repetition()`/`insufficient_material()` explicitly (`isRoundOver()`).

**Engine behaviour:** Stockfish plays every black move at full strength (depth 20+), permanently, in every mode and type. No scripted weakening exists anywhere, and none should be reintroduced.

---

## Badge & Progression Logic — Fase-Poorte (Curriculum Gate)

The 23 types are grouped into **5 fases** (`fases.js`), a curriculum sequence rather than a flat random pool.

| Fase | Afrikaans Name | Types |
|---|---|---|
| 1 | Basiese Mats | 1, 2, 3 |
| 2 | Pioneindspele | 6, 7, 8, 9, 11, 12 |
| 3 | Kasteeleindspele | 13, 14, 15, 16 |
| 4 | Meesterklas | 4, 18, 19, 20 |
| 5 | Fyn Kuns | 22, 23, 24, 25, 26, 27 |

Type 4 sits in Fase 4 despite being "basic material" — its DTM runs up to 33, the hardest technique in the app.

**Gating rule:** Fase 1 is open from the start. Fase N+1 unlocks once every type in Fase N *that has at least one active bronze position* has its bronze earned (`faseGatingTypes()` filters out zero-active-bronze types first — this is what stops a fully-retired type, like Type 10, from ever deadlocking progression). Tier-within-type unlocking is unchanged; the fase gate is an additional check inside `isTierUnlocked()`.

**Derivation, not storage:** fase-unlock state is **never persisted** — computed fresh every time from `progress.earned` + `POSITIONS` + `FASES` (`isFaseUnlocked()`). A legacy profile with, say, only a Type 13 bronze earned is automatically treated as having Fase 3 unlocked, because `isFaseUnlocked()` grandfathers in any fase containing an already-earned badge (`faseHasEarnedBadge()`), regardless of whether the earlier fase's own gate was ever technically satisfied. Earned badges are never revoked. Switching players re-evaluates fase state immediately from that player's own `progress`, no reload needed.

**Speel pool:** active positions ∩ unlocked fases ∩ unearned tiers, enforced automatically since `buildPool()`/`pickPuzzle()` both go through `isTierUnlocked()` — the single chokepoint both fase-gating and tier-gating share. Puzzles are drawn randomly from that pool.

**Persistence:** badge/puzzle progress persists via `localStorage`, keyed per player. Fase-unlock state does not (it's derived, above).

### Retirement (`retired: true`)

Positions the harness can't pass (theoretically drawn, or an unreachable move-limit budget) are **retired, never deleted**:

- Stay in `positions.js` under their original type/tier as an audit trail, with a one-line dated comment stating why.
- Never served: `activePositions(typeId, tier)` filters them out everywhere `app.js` iterates positions to show the player something — `buildPool()`, badge rendering, sidebar rendering. Raw `POSITIONS[id][tier]` access is never used outside that helper.
- A tier with zero active positions is unearnable regardless of prior-tier status.
- A type with zero active positions across all tiers renders greyed on the home grid, labelled **"In herbou 🔧"** (`typeIsActive()`), and contributes nothing to the pool.
- The stats-bar denominator (`totalEarnableTiers()`) counts (type, tier) pairs with ≥1 active position — computed, never hardcoded.
- The harness skips C2–C6 for retired positions (C1 legality still runs) and reports `Aktief: N · Afgetree: M` in its header.

---

## Hint System

*"Wenk"* button shows the single best move for white as a highlighted arrow (Stockfish depth 20).

| Tier | Hint Behaviour |
|------|---------------|
| Brons | Always available |
| Silwer | White's first 10 moves only; move 11 replaces the button with *"Jy kan dit doen!"* |
| Goud | No hint button |

---

## Post-Round Replay

Triggered automatically after **every** round, win or fail:

1. Board resets to the puzzle's starting FEN
2. Stockfish computes and plays a **strong game from scratch** — near-optimal white moves vs near-optimal black responses. "Strong," not "perfect": Stockfish without tablebases isn't perfect, and demonstrably isn't in some endings (e.g. KBN)
3. Each move shown with a 2-second delay, as arrows/highlights
4. Label is mode-aware: `mate` → *"Sterk spel vanaf hierdie posisie"*; `promote` → *"Sterk omskakeling vanaf hierdie posisie"*; `hold` → *"Sterk verdediging vanaf hierdie posisie"*
5. Termination is mode-aware: `mate` runs to checkmate/stalemate/repetition (80-ply safety cap); `promote` stops one beat after the first white promotion; `hold` runs `holdMoves` full moves or stops early — proudly, not apologetically — on repetition
6. After completion: **"Volgende Rondte"** and **"Probeer Weer"**. For a win, "Volgende Rondte" routes to badge-unlock (chaining to fase-unlock if that badge crossed a gate) or back to the badge map — the same routing a loss's "Volgende Rondte" always used, now reached after the replay instead of before it.

---

## UI Screens

### 1. Tuis / Kentekens (Home / Badge Map)
- Fase-sectioned: each fase gets a header (number, name, progress chip "{x}/{y} bronse" counting only that fase's ≥1-active-bronze types) and its type-badge grid (4-wide)
- Locked fases render their type badges greyed out, with a lock glyph and *"Ontsluit deur al die bronse in Fase {N−1} te verdien"*
- Each badge: Afrikaans type name, current tier colour
- *"Speel"* launches a random puzzle from the current pool; progress summary visible

### 2. Spelskerm (Game Screen)
- Chessboard, centre
- Top bar: badge name + tier, objective label (*"Doel: Skaakmat"* / *"Doel: Promoveer 'n pion"* / *"Doel: Hou die gelykspel — oorleef {n} skuiwe"*), move counter
- Conditional hint button per tier rules above
- **Sybalk links:** compact 2-column badge grid (`.badge-sidebar`, 112px), same helper (`renderSidebarBadges`) also serves the Replay screen. 23 is odd, so the grid always ends with one badge alone in column 1 — `.sidebar-badge-item:last-child` spans both columns and centres itself so it doesn't look stranded.
- **Sleutelgedagte panel:** a glass panel to the right of the board (`.sleutelgedagte-panel`, 260px — matches the shared Chess_Games "Analysis/Review" right-column convention). The key-idea text sits in a comic-style speech bubble (`.speech-bubble`, CSS triangle tail pointing down) attributed to the type's mascot cat (`.sleutelgedagte-cat`, ~85px) shown below it — see Kentekenkat below. Normally the bubble shows the current type's key-idea explanation: a <100-word Afrikaans paragraph on the core technique, addressed directly to the player (`ENDGAME_TYPES[i].sleutelgedagte` in `positions.js`, all 23 types). About 1 round in 10 the bubble shows a silly cat one-liner from `KAT_GRAPPIES` instead (and the "💡 Sleutelgedagte" heading hides itself for that round). All populated in `startGame()`. One thing to remember per type, not a theory lesson.

### 3. Uitslag (Result Screen)
Shown for every round, win or fail. Heading/icon/message vary by reason (`checkmate`, `promote`, `hold_survived`, `hold_stalemate`, `hold_repetition`, `hold_insufficient` for wins; `stalemate`, `black_checkmate`, `repetition`, `limit`, `hold_mated`, `hold_adjudicated` for failures) — wins styled green (`.win`), stalemate red, other failures orange. Transitions to replay after 2 seconds.

### 4. Herspeel (Replay Screen)
Board plays the strong game from the starting position; see Post-Round Replay above.

### 5. Kenteken Ontsluit (Badge Unlock Screen)
Shown when a badge tier is newly earned. *"Nuwe vlak ontsluit. Ramkat!"* Brief celebration, then badge map — unless this badge also crossed a fase gate, in which case it chains into Screen 6.

### 6. Fase Ontsluit (Fase Unlock Screen)
Shown immediately after badge-unlock, never concurrently (`finishRound()` snapshots unlocked fases before `earnBadge()` runs, diffs after, stashes any newly-crossed gate on `state.newlyUnlockedFase`, consumed by `finishBadgeUnlock()`). Fase name, row of type icons, *"Nuwe Fase Ontsluit! Ramkat!"* Auto-dismisses after ~4s or via *"Terug na Kentekens"*.

---

## Kentekenkat (Badge Mascot)

Each of the 23 types has its own mascot cat, shown in the Sleutelgedagte panel below the speech bubble. It wears no medal until Brons is earned for that type, then swaps to a bronze/silver/gold necklace pendant — driven by `highestEarnedTier(typeData.id)`, the same source of truth the badge system already uses, re-evaluated every `startGame()` call (`catImg.src = 'assets/cats/type' + catId + '_' + catTier + '.png'`).

**Asset pipeline** (`tools/build_cats_from_single.py` → `assets/cats/type{ID}_{tier}.png`, 23 types × 4 tiers = 92 PNGs; the type05/type17 PNGs were deleted 2026-08-20 when those types were removed):
- Source is a single reference image, `New_Cat.png` (user-supplied, gold necklace already on it) — not a multi-cat sprite sheet. An earlier attempt extracted cats from a 9×4-cell NanoBanana grid sheet; every cell's tail curled into the gap toward its neighbour, so no fixed crop boundary could avoid slicing through one cat's tail or bleeding in a stray fragment from the next. A single isolated cat sidesteps that entire class of bug — nothing adjacent to crop around.
- Its background is a baked-in checkerboard (not real alpha) — stripped via flood-fill from the image border over near-grey pixels; the cat's black outline reliably contains the fill so the interior fur is untouched.
- The necklace (chest-band region + gold colour threshold) is isolated, inpainted out with the surrounding chest colour for the medal-less "normal" tier, and recoloured in place — not redrawn — for bronze/silver/gold, preserving the original chain's shading/highlight pattern.
- Types 1–11 (first 9 in this doc's numeric order) get a gentle, low-saturation recolour (grey, chocolate, ginger, black, blue-grey, brown tabby, etc.) so they read as realistic cat colours; types 12–27 get a vivid hue-rotated + saturation-boosted "zany" coat. All 25 share one silhouette/pose — colour and medal are the only variety, a deliberate trade-off after two sprite-sheet extraction attempts (`generate_cat_sprites.py`, `build_cat_sprites_from_ref.py`) both produced cut/malformed cats despite looking fine on a spot-check.
- **Standing lesson for any future regeneration:** verify every one of the 100 output files by eye, not a sample — both failed attempts passed a 5-6-image spot-check and broke once every type was actually looked at.

**Speech bubble & grapkies:** the sleutelgedagte text sits in `.speech-bubble` (CSS triangle tail pointing down at the cat below it) so it reads as the cat talking, not a plain panel of prose. About 1 round in 10 (`Math.random() < 0.1` in `startGame()`), the bubble shows a random line from `KAT_GRAPPIES` (in `app.js`) instead of the real key-idea text, and the "💡 Sleutelgedagte" heading hides itself for that round — a heading over a meow would be a non-sequitur.

---

## Afrikaans UI String Reference

| Context | Afrikaans |
|---|---|
| App name | Skaakmat Afrigter |
| Check / Checkmate / Stalemate | Skaak / Skaakmat / Pat |
| Hint button | Wenk |
| Moves remaining | Skuiwe oor |
| Play / Next Round / Try Again | Speel / Volgende Rondte / Probeer Weer |
| Strong play/conversion/defence from this position | Sterk spel / omskakeling / verdediging vanaf hierdie posisie |
| Stalemate message | Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby. |
| Move limit message | Tyd op — die outjie het weggekom. Wat van nog 'n rondte? |
| Repetition message (mate/promote) | Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer. |
| Badge / Fase unlocked | Nuwe vlak ontsluit. Ramkat! / Nuwe Fase Ontsluit! |
| Fase locked hint | Ontsluit deur al die bronse in Fase {N} te verdien |
| Objective (mate/promote/hold) | Doel: Skaakmat / Doel: Promoveer 'n pion / Doel: Hou die gelykspel — oorleef {n} skuiwe |
| Promote win (queen / under-promotion) | Promosie! Die pion word 'n koningin. Baie goed! / Promosie — en boonop 'n ruiter! Slim gedaan! |
| Promote guard defers | Jou pion het gepromoveer — maar die stryd is nog nie verby nie! |
| Hold win (survived / stalemate / repetition) | Vesting gehou! Die gelykspel is joune. Baie goed! / Pat — en dis presies wat jy wou hê! Gelykspel gehou! / Drie keer dieselfde posisie — die gelykspel is verseël! |
| Hold fail (mated / adjudicated) | Skaakmat — die vesting het geval. Kyk in die herspeel waar dit gebeur het. / Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer! |
| Bronze / Silver / Gold | Brons / Silwer / Goud |
| King / Queen / Rook / Bishop / Knight / Pawn | Koning / Koningin / Kasteel / Biskop / Ruiter / Pion |
| White / Black | Wit / Swart |
| Home / Badges / Replay / Result | Tuis / Kentekens / Herspeel / Uitslag |

**Chess piece notation:** figurine algebraic (piece icons instead of letters) to avoid disambiguation issues.

---

## Verification Harness — Certification Bars

`tools/verify_positions.py` runs six checks against every position (full run 15–25 min; `--fast` skips C5 and shortens searches, for quick iteration — known to under-detect slow `promote` conversions, see the recipe below):

| Check | What it verifies |
|---|---|
| C1 | Legality — valid FEN, white to move, no duplicate FENs, kings not adjacent |
| C2 | Theoretical result matches `winCondition` (tablebase category if ≤7 men, else engine eval) |
| C3 | Move-limit budget — DTM (mate/hold) or self-play rollout (promote) fits within tier budget (60/75/85% of the move limit for bronze/silver/gold); ERROR if it exceeds the limit outright, WARN if it exceeds the budget but not the limit |
| C4 | Stalemate-trap scan — flags candidate moves that immediately stalemate black |
| C5 | Thematic integrity (engine-heuristic, types 9/10 only) — counts moves that retain a winning eval |
| C6 | Note sanity — any `Xd4!`-style move recommendation in a position's `note` must be a real legal move for that piece |

Two tablebase-exact hardenings exist for the K+P family, not currently wired to any active type but kept as working infrastructure:
- **C5-strict** (`check_c5_strict`) — confirms *exactly one* tablebase-winning move plus one "natural" (non-retreating) losing try, so a position can't be solved by just avoiding obvious blunders. Used for Types 8/9's `promote` positions.
- **C7** (`check_c7`) — reciprocal-zugzwang square-pair-plus-triangle-cycle detector, built for the never-shipped Type 10 (see Epitaphs). Both are tablebase-exact, validated against hand-confirmed reciprocal-zugzwang pairs.

`tools/scan_duplicates.py` runs separately: exact-FEN duplicates (active+retired combined) and a translation-aware near-duplicate scan (flags two active positions identical under a uniform file/rank shift) — engine-free, fast, run after any batch of new positions.

**Reusable pieces worth knowing about**, all in `tools/verify_positions.py`:
- `TablebaseClient` — cached Lichess tablebase queries (`tb_cache.json`), 1 req/s rate-limited
- `self_play_rollout()` — Stockfish plays both sides at `ROLLOUT_MOVETIME_S`/move; returns the white-move-number of the first promotion, retried once on a null result (movetime-based play isn't fully deterministic)
- `classify_move_for_white()` — after a candidate move, returns `'win'/'draw'/'loss'` from absolute white perspective via tablebase lookup of the resulting position; reusable for any "count how many moves keep the result X" selection criterion (used both for C5-strict's winning-move count and, reversed, for Type 27's drawing-move count)
- `find_stockfish()`, `plies_to_white_moves()` — small utilities, self-explanatory

---

## Standing Rules

These apply to any future position-generation work, not just one task:

- **60-minute timebox per type's generation.** Ship thin rather than search long — a tier with 2 positions is acceptable; a tier with 0 in an otherwise-active type should be filled or the gap noted in one line. When a search genuinely exhausts itself (Type 10's ~534-candidate C7 sweep, Type 27's capped reversed-C5 pass), stop, document exactly what was tried and why it didn't work, and move on. A 30-minute-projected full pass that can be capped to a 5–7 minute stratified sample without losing the point of the check should be capped.
- **No new certifiers unless the task explicitly asks for one.** Reuse C1–C7 and the existing helpers above. If a candidate fails an existing check, swap it for another candidate — don't loosen the check to fit.
- **Tablebase category/DTM is not a reliable difficulty or convergence proxy for `promote` positions.** Confirmed twice (Types 25 and 26): a tablebase-certified `win` can still fail to convert within 100 moves of real Stockfish-vs-Stockfish self-play. For `promote` types, select and verify by real rollout, not just tablebase DTM — tablebase DTM is fine as a rough first-pass filter, but the rollout is the authority.
- **A position that fails a check gets swapped, not patched.** If it's already shipped and later found to fail, it gets `retired: true` with a one-line dated reason — never deleted, never silently removed.
- **Log-don't-fix outside an explicit fix list.** When a task defines specific sections to fix (e.g. "§1–§3"), anything else discovered during that work gets logged, not fixed, unless it's a genuine one-liner. This keeps a "final QA" pass from ballooning back into open-ended rebuilding.

---

## How to Add a New Position (or a New Type)

The gauntlet, in order — this is the same shape `generate_type5.py`/`generate_type22.py`...`generate_type27.py` all follow:

1. **Construct or generate candidates.** For pure material endings, sweep piece placements programmatically (curated square lists, not a blind full-board sweep — keeps tablebase query counts in the low hundreds) and filter locally first: `board.is_valid()`, king-distance ≥ 2, not already stalemate/checkmate, no immediate 1-ply stalemate trap. Only send local-filter survivors to the tablebase.
2. **Query the tablebase** (`TablebaseClient`, ≤7 men) for `category` and `dtm`. For `mate`/`hold` positions, `category` must match `winCondition` (`win` or `draw`) — this is the entire quality bar for construction-heavy types (Types 23/24). For `promote` positions, treat `category: win` as a rough filter only (see Standing Rules) and verify with a real rollout before committing.
3. **Band by difficulty** into bronze/silver/gold. For `mate`/`hold`, tablebase DTM (converted to white-moves via `plies_to_white_moves`) against the tier budget (60/75/85% of the move limit). For `promote`, real `self_play_rollout()` result against the same budget — do this *before* writing to `positions.js`, not after (a lesson learned twice this way already).
4. **Select for variety** — different corners/files/constructions across the tier's positions where the material allows it; don't ship three near-identical configurations.
5. **Write to `positions.js`** under the type's tier array, with a one-line dated comment giving the generation evidence (tablebase DTM, rollout number, or C5-strict/C7 certification) — future contributors (and future you) need to know *why* a position was trusted, not just that it was.
6. **Run the harness**: `python tools/verify_positions.py --type N`. Target 0 ERRORs. A WARN on budget is acceptable if the position's material structurally can't do better (bump `moveLimit` with a comment explaining why, as Type 24's bronze did) — don't chase a WARN that reflects a genuine material limit.
7. **Run the dedup scan**: `python tools/scan_duplicates.py`. 0 exact, 0 translation-aware near-duplicates expected among actives.
8. **If it's a new type**, not just a new position: add it to `ENDGAME_TYPES` in `positions.js` (id, name, icon, and a `sleutelgedagte` under 100 words), add its bronze/silver/gold arrays to `POSITIONS`, and add it to the appropriate `FASES` row (or a new fase) in `fases.js` — no `app.js` changes needed, `isFaseUnlocked()`/`buildPool()` are fully generic over whatever's in `FASES`/`POSITIONS`. Verify this with a small vm-sandboxed test against the real `app.js` code (fresh profile locked, veteran profile unlocks, `buildPool()` serves the new type) rather than just reading the code and assuming.
9. **If a candidate fails step 6 or a rollout check**, swap it for another candidate from the same generation pass — don't loosen the check.

---

## Current State (positions.js)

**238 positions on file** across 23 types, **190 active (servable), 48 retired** (audit trail only, never served). Full harness: **0 ERRORs**, 6 WARNs (all pre-existing budget/stalemate-fraction notes on untouched positions, none blocking). Dedup scan: 0 exact, 0 translation-aware near-duplicates among actives (one pre-existing INFO shadow, T08 S6 vs retired T10 B2, not a defect).

**2026-08-20:** Type 5 (Koning & Twee Ruiters teen Koning) and Type 17 (Goeie Biskop vs Slegte Biskop) removed permanently — see Epitaphs. This dropped the totals from 264/206/58 across 25 types (75 badges) to the figures above (69 badges). Every player's medals/progress was also reset once-off (`storageKey()` bumped v1 → v2 in `app.js`) since old badge data no longer lines up with the shrunk type list.

| Type | Active (B/S/G) | Retired | Notes |
|---|---|---|---|
| 1 — K+Q vs K | 5/3/2 | 0 | Brons #1 `moveLimit` 14 (budget) |
| 2 — K+R vs K | 5/3/2 | 0 | Brons #5 `moveLimit` 19 (budget) |
| 3 — K+BB vs K | 2/3/2 | 1 | Mate-in-1 stalemate minefield retired |
| 4 — K+BN vs K | 3/3/2 | 2 | Two silvers replaced (were gold-depth DTM) |
| 6 — K+P vs K | 5/3/2 | 0 | `promote`; all limits rollout-budgeted |
| 7 — Verbygeraakte Pion Wedren | 5/3/2 | 0 | `promote`; golds are genuine promotion-with-check races |
| 8 — Opposisie & Koningaktiwiteit | 10/6/2 | 10 (legacy) | `promote`, C5-strict-certified throughout, incl. 2 distant-opposition golds |
| 9 — Zugzwang | 3/3/2 | 7 (legacy) | `promote`, C5-strict-certified at exactly 1 winning move each |
| 11 — Piondeurbraak | 5/3/2 | 5 (legacy) | C5-breakthrough-certified; gold has a running black counter-passer |
| 12 — Buitenste Verbygeraakte Pion | 5/3/2 | 6 (legacy) | Outside-file decoy + harvest pair; **bronze's decoy is present but not binding** (race-shaped, not a genuine forced-use arc) — open gap, see below |
| 13 — Lucena-posisie | 3/3/2 | 0 | `promote` — the bridge exists to force it |
| 14 — Philidor-posisie | 3/3/2 | 0 | Silwer #2 `moveLimit` 26 (budget) |
| 15 — Kasteel Agter Verbygeraakte Pion | 3/3/2 | 0 | `mate` |
| 16 — Aktiewe vs Passiewe Kasteel | 3/3/2 | 2 | |
| 18 — Biskop teen Ruiter | 3/2/2 | 5 (legacy) | Silver/gold rebuilt: bishop + two widely-separated passers vs a knight that can't blockade both, tablebase-certified |
| 19 — Verkeerde Kleur Biskop | 3/3/2 | 4 | S6 (silver) is `hold` mode — white is the weaker side, holds the wrong-colour corner |
| 20 — Koningin teen Pion op 7de Ry | 3/3/2 | 0 | Brons #3 `moveLimit` 17 (budget) |
| 22 — Koningin teen Kasteel | 3/2/2 | 0 | Broad K/Q/R sweep, tablebase DTM-banded |
| 23 — Koningin teen 2 Verbonde Pionne | 3/2/2 | 0 | Pawn-phalanx construction, tablebase win-only filter |
| 24 — Kasteel teen 2 Verbonde Pionne | 3/2/2 | 0 | Bronze `moveLimit` 14/16/16 — a rook can't convert this material faster than DTM 8, confirmed via a 382-candidate search |
| 25 — Ruiter-en-Pion teen Ruiter | 3/2/2 | 0 | `promote`, selected by real rollout (bronze 2–4, silver 7–9, gold 13–16 white-moves) |
| 26 — Biskop-en-Pion teen Biskop | 3/2/2 | 0 | `promote`, same-colour-bishop constraint, rollout-checked before writing |
| 27 — Teenoorgestelde Biskoppe: Verdedig! | 3/2/2 | 0 | First `hold`-type type; **silver/gold use the tightest available reversed-C5 candidate, not the confirmed ≤3-drawing-move bar bronze hit** — open gap, see below |
| _dev | 0/0/0 | — | Test scaffolding, always empty; `buildPool()` excludes it by name |

---

## Epitaphs

**Type 5 (Koning & Twee Ruiters teen Koning)** — cut permanently 2026-08-20, at the coach's judgement that the underlying technique doesn't work for this audience. Two knights can't mate a bare king without a helper pawn (the Troitsky method — block the pawn, drive the king to a corner, release the pawn at the exact tempo needed to avoid stalemate), and that fragility already showed up in the data: the type needed extended move limits (22/34/46 vs. the standard 12/24/36) throughout, and eight of its original positions had to be retired outright as tablebase draws, cursed-wins (mate only after 50+ moves), or DTM 84–86 misses against a 22-move limit. Even the eight replacement positions that did pass verification depended on a precise release-the-pawn timing that's a poor fit for the target age group.

**Type 17 (Goeie Biskop vs Slegte Biskop)** — cut permanently 2026-08-20, at the coach's judgement. Bronze #1 and Gold #2 were already retired as genuine theoretical draws (engine-confirmed, not a construction bug) across two prior rebuild passes (Opdrag 3, Opdrag 8), and the type never once reached a clean 3/3/2 despite that effort — a persistent sign the "infiltrate on the colour the bad bishop can't cover" technique doesn't compress reliably into a bounded-move-limit puzzle on this skeleton.

**Type 10 (Driehoeksbeweging)** — cut permanently. A genuine reciprocal-zugzwang core requires both black pawns to be simultaneously unguardable by the single black king (confirmed directly: whenever black's king can guard a pawn, it's a stable draw regardless of tempo, zero exceptions in 200 tested cases) — but that same unguardedness lets white's king simply walk over and capture the loose pawn instead of triangulating, faster than the tablebase's own detour, every time. Tried and failed across five structurally distinct families (~534 candidates total): bare 4-man, 6-man double-blocked, defended-reserve-pawn, adjacent mutually-guardable pairs, bare K+P vs K. The one untested escape route: a *tethered-by-passer* construction, where black's king is obligated elsewhere by an outside passed pawn rather than the blocked pair itself. `check_c7` and all retired Type 10 positions stay as working infrastructure should anyone reopen this.

**Type 21 (Hartjie van die Bord)** — removed. The "central checkmate only" constraint was unachievable: the pawns in those positions didn't reliably cage the king away from the edge, and B+N naturally mates on edge squares.

**All four numbers are permanently dead — never reuse 5, 10, 17, or 21 for a new type.**

---

## Open Gaps (log-don't-fix backlog)

Genuine, known, not-yet-fixed items — surfaced here rather than silently left implicit:

- **Type 12 (Buitenste Verbygeraakte Pion):** bronze's decoy pawn is present but not thematically binding — white wins with or without pushing it, since material is 3-vs-2 pawns overall. A tighter 2-vs-2 construction (one outside pawn + one contested-wing pawn per side, where the bait is what turns a draw into a win) would close this properly.
- **Type 27 (Teenoorgestelde Biskoppe: Verdedig!):** silver/gold ship with the tightest available reversed-C5 candidates from a capped 50-position sample, not ones meeting the confirmed ≤3-drawing-move bar bronze hit exactly. A wider (uncapped, ~30 min) sample might find tighter examples.

---

## Key Design Principles

- **Learning first:** every failure state is a teaching moment. Stalemate especially should feel instructive, not just punishing.
- **Afrikaans throughout:** every string, button, label, and message. No English visible to the player.
- **Young player friendly:** warm, encouraging, accessible language for a young club-level player.
- **No takebacks**, at any tier. The replay is the learning mechanism, not undo.
- **Celebration matters:** badge unlocks should feel rewarding. *"Ramkat!"* energy throughout.

---

## FEN Position Rules

- White always to move (` w ` in FEN)
- Pawns only on ranks 2–7 (never rank 1 or 8)
- Kings must not be adjacent in the starting position
- No duplicate FENs across any type or tier
- All positions hand-verified for legality, plus the harness (above)
