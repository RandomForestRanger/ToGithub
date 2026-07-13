# Skaakmat Afrigter — Claude Code Brief
### Chess Endgame Trainer (Afrikaans UI)

---

## Overview

Build a chess endgame training web app called **"Skaakmat Afrigter"**. The player always plays white; the engine (Stockfish via WebAssembly) plays black. The goal is always checkmate. The app is a learning tool first, a game second. The entire UI must be in **Afrikaans**.

---

## Tech Stack

Vanilla JS, no build step — matching the other three games' stack (see the shared `Chess_Games/CLAUDE.md`), not the React/Vite/Tailwind/chessground stack this section used to describe (that was an abandoned early rewrite; its files now live in `argief/old_version/`, kept for reference, not shipped — see Known Issues / Open Items).

- **Chess logic:** `chess.js` 0.10.3, loaded via CDN `<script>` tag
- **Board UI:** `chessboard.js` 1.0.0 (chrisoakman fork), loaded via CDN, plus jQuery (its dependency)
- **Engine:** Stockfish 10.0.2, loaded inside `stockfish-worker.js` via `importScripts()` from a CDN — a real Web Worker file, not the Blob-worker trick the other three games use
- **Styling:** plain CSS in `styles.css`, no framework

Entry point is `index.html`, which loads `positions.js` → `fases.js` → `app.js` in that order (plain `<script>` tags, no modules/bundling). Game logic lives in `app.js`; positions live in `positions.js` (count changes as rebuild Opdragte land — see Current State below for the authoritative figure, not a hardcoded number here). No `npm install` or dev server build is needed; serve the directory over plain HTTP (see Running Locally in the shared CLAUDE.md) — `netlify.toml` confirms this for deployment too ("No build command — pure HTML/CSS/JS, no build step").

---

## The 25 Endgame Types (Badge Names in Afrikaans)

Each type corresponds to one badge. Listed by numeric ID, **not** play order — since Opdrag 4, actual curriculum sequencing is the Fase-Poorte grouping below (Type 4 in particular plays last, in Fase 4, despite its low ID). Types 22–27 (Opdrag 8b) are a fifth curriculum group, Fase 5 "Fyn Kuns" — see Fase-Poorte below.

| # | Afrikaans Name | English Reference |
|---|---|---|
| 1 | Koning & Koningin teen Koning | King & Queen vs King |
| 2 | Koning & Kasteel teen Koning | King & Rook vs King |
| 3 | Koning & Twee Biskoppe teen Koning | King & Two Bishops vs King |
| 4 | Koning, Biskop & Ruiter teen Koning | King & Bishop & Knight vs King |
| 5 | Koning & Twee Ruiters teen Koning | King & Two Knights vs King |
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
| 17 | Goeie Biskop vs Slegte Biskop | Good Bishop vs Bad Bishop |
| 18 | Biskop teen Ruiter | Bishop vs Knight |
| 19 | Verkeerde Kleur Biskop | Wrong-Coloured Bishop |
| 20 | Koningin teen Pion op 7de Ry | Queen vs Pawn on 7th Rank |
| 22 | Koningin teen Kasteel | Queen vs Rook |
| 23 | Koningin teen 2 Verbonde Pionne | Queen vs 2 Connected Pawns |
| 24 | Kasteel teen 2 Verbonde Pionne | Rook vs 2 Connected Pawns |
| 25 | Ruiter-en-Pion teen Ruiter | Knight & Pawn vs Knight |
| 26 | Biskop-en-Pion teen Biskop | Bishop & Pawn vs Bishop (same colour) |
| 27 | Teenoorgestelde Biskoppe: Verdedig! | Opposite-Coloured Bishops: Defend! |

> Type 21 (Hartjie van die Bord) was removed — the "central checkmate only" constraint was unachievable because the pawns in those positions didn't reliably cage the king away from the edge, and B+N naturally mates on edge squares.
>
> Type 10 (Driehoeksbeweging) was cut permanently (Opdrag 6b) — see the Current State table below for the epitaph. Numbers 10 and 21 are dead permanently — never reused. Total badge count is **75** (25 types × 3 tiers).

**Audience**: Young players (~8–12 years), mostly in Afrikaans.

---

## Three Tiers Per Badge

| Tier | Afrikaans | Default Move Limit | Puzzles Per Type | Hints |
|------|-----------|------------|-----------------|-------|
| Bronze | Brons | 12 moves | 5 | Always available |
| Silver | Silwer | 24 moves | 3 | First 10 moves only, then notification |
| Gold | Goud | 36 moves | 2 | None |

Individual puzzles may override the tier default via `moveLimit` in `positions.js`. Type 5 uses 22 / 34 / 46 instead of the defaults.

**Definition of "move":** One full turn = one white move + one black response.

---

## Badge & Progression Logic

- **Earning a tier:** A badge tier is earned by completing **any single puzzle** of that tier and type within the move limit. Quality of play is not assessed — mate within the limit = earned.
- **Once earned:** No further puzzles of that tier and type are ever offered to the player.
- **Unlocking (tier-within-type):** Bronze is available from the start (subject to the fase gate below). Silver unlocks for a type once its Bronze is earned. Gold unlocks for a type once its Silver is earned.
- **Puzzle queue:** Puzzles are drawn **randomly** from all currently available (unearned tier, unlocked fase) tiers and types — see Fase-Poorte below for what "unlocked fase" means.
- **Persistence:** All badge and puzzle progress persists via `localStorage`. Fase-unlock state is never separately persisted — see Fase-Poorte.

### Fase-Poorte (Curriculum Gate) — Opdrag 4

The (now 25) types are grouped into **5 fases** (`fases.js`), replacing the old flat random-pool-of-everything lottery with a curriculum sequence. Type 4 is deliberately placed last in Fase 4 — despite being a "basic material" mate, its DTM runs up to 33, making it the hardest technique in the app. Type 10 was permanently cut from Fase 2's list in Opdrag 6b (see Current State) — its absence from `faseGatingTypes()` is exactly the same mechanism that already handled Type 5's temporary retirement, so no special-casing was needed. Fase 5 "Fyn Kuns" (Opdrag 8b) reuses the exact same `isFaseUnlocked()` gate a fifth time — no new app.js logic was needed, only a new `FASES` row.

| Fase | Afrikaans Name | Types |
|---|---|---|
| 1 | Basiese Mats | 1, 2, 3 |
| 2 | Pioneindspele | 6, 7, 8, 9, 11, 12 |
| 3 | Kasteeleindspele | 13, 14, 15, 16 |
| 4 | Meesterklas | 4, 5, 17, 18, 19, 20 |
| 5 | Fyn Kuns | 22, 23, 24, 25, 26, 27 |

**Gating rule:** Fase 1 is open from the start. Fase N+1 unlocks once every type in Fase N *that has at least one active bronze position* has its bronze badge earned (`faseGatingTypes()` in `app.js` filters out types with zero active bronzes before checking completeness — this is what keeps a fully-retired type from ever deadlocking progression; Type 5 was exactly this case at Opdrag 4's writing, before its Opdrag 5 rebuild gave it active positions again). Tier-within-type unlocking (above) is unchanged; the fase gate is an additional, orthogonal check applied inside `isTierUnlocked()`.

**Derivation, not storage:** Fase-unlock state is **never persisted** — it's computed fresh every time from `progress.earned` + `POSITIONS` + `FASES` (`isFaseUnlocked()` in `app.js`). This means no migration code was ever needed and none should be added: a legacy profile that already has, say, only a Type 13 bronze earned (pre-dating Opdrag 4 entirely) is automatically treated as having unlocked Fase 3, because `isFaseUnlocked()` grandfathers in any fase containing an already-earned badge (`faseHasEarnedBadge()`) regardless of whether the previous fase's own gate was ever technically satisfied. Earned badges are never revoked by this logic. Because it's derived, switching players re-evaluates fase state from that player's own `progress` immediately, with no reload required.

**Speel pool:** active positions ∩ unlocked fases ∩ unearned tiers — enforced automatically since `buildPool()`/`pickPuzzle()` both go through `isTierUnlocked()`, the single chokepoint both fase-gating and tier-gating share.

### Retirement (`retired: true`) — Opdrag 3

Positions the harness can't pass (theoretically drawn, or a cruel move-limit budget) are **retired**, not deleted:

- Stay in `positions.js` under their original type/tier as an audit trail, each with a one-line dated comment stating why. Tasks 5–9 may cannibalise them when rebuilding.
- Never served: `activePositions(typeId, tier)` in `app.js` filters them out everywhere — `buildPool()`, `pickPuzzle()`, badge rendering, sidebar rendering. Raw `POSITIONS[id][tier]` access is never used directly outside that helper.
- A tier with zero active positions is unearnable (`isTierUnlocked()` returns false regardless of prior-tier status) — its pip never shows "unlocked".
- A type with zero active positions across all tiers renders greyed on the Tuis grid with the label **"In herbou 🔧"** (`typeIsActive()`) and contributes nothing to `buildPool()`.
- The stats-bar denominator (`totalEarnableTiers()`) counts (type, tier) pairs with ≥1 active position — computed, never hardcoded.
- The harness skips C2–C6 for retired positions (C1 legality still runs — a retired position must still be a legal chess position) and reports `Aktief: N · Afgetree: M` in its header.

---

## Starting Positions

All positions are hardcoded as FEN strings, stored in `positions.js` grouped by type and tier.

**Counts (post-Opdrag 8b):** 264 positions on file (types 1–20 and 22–27; `_dev` empty, excluded from this count), 206 active (servable), 58 retired (audit trail, never served) — see Current State below for the per-type breakdown and `tools/verification_report.md` for the authoritative, harness-generated numbers.

**Construction guidelines by type:**
- **Pure material endings (Types 1–5):** Use Syzygy/Gaviota tablebase theory. Bronze positions should be close to forced mate. Silver positions mid-distance. Gold positions further back, requiring longer technique.
- **Structural/thematic endings (Types 6–20):** Construct canonical positions based on well-known endgame theory for each theme.
- **King & Two Knights (Type 5) — Troitsky method (Opdrag 5 rebuild):** Two knights cannot force mate against a bare king alone — every mating net ends in stalemate one tempo too soon. Black's own pawn is white's mating resource (Troitsky's method): one knight **blockades** the pawn dead on or behind the Troitsky line (per file: a4, b6, c5, d4, e4, f5, g6, h4 — "behind" = less advanced, nearer black's own side); king + the second knight drive black's king to a corner; at the precise moment the net closes, the blockading knight **releases** — the pawn's forced moves supply the tempi that let black avoid stalemate while the freed knight travels round to deliver mate. Release too early and the pawn queens; too late and it's stalemate. Every one of the 8 rebuilt positions has the blockade **pre-established** (establishing it against a running pawn is a harder, different lesson, deliberately excluded even at gold). Extended tier limits are retained (22/34/46, not the 12/24/36 default) with DTM bands 8–13 (brons) / 16–25 (silwer) / 28–39 (goud), each certified `category: 'win'` (not `cursed-win`) via the Lichess tablebase. The original 8 legacy positions (retired in Opdrag 3) had assumed black's now-deleted engine-inaccuracy wobble would create the mating net within these limits — with Stockfish permanently at full strength, that assumption failed and they stayed retired; the replacements are theory-first, generated and tablebase-certified rather than hand-guessed.

---

## Win Conditions (`winCondition`: mate | promote | hold)

Every position carries an optional `winCondition` field in `positions.js` (absent ⇒ `'mate'`, no mass-edit of existing positions). Introduced in Opdrag 2 to stop forcing every endgame theme through a checkmate-shaped hole — conversion endgames (Type 12/17) and drawing techniques (Philidor, wrong-coloured bishop) get their own honest win condition instead.

All end-of-round detection routes through one function, `adjudicate(game, phase, moveInfo, evalInfo)` in `app.js`, called after every half-move (`phase`: `'after-white'` | `'after-black'`).

| Condition | Win | Fail |
|---|---|---|
| `mate` (default) | Black is checkmated within the move limit | Stalemate (either colour), move-limit exhaustion, threefold repetition |
| `promote` | **Any white pawn promotes AND the guard confirms it (Opdrag 7 §2, below)** — under-promotions count too. Checkmating black also wins outright, guard or no guard. | Same as `mate`, *if* the guard confirms; otherwise the round simply continues |
| `hold` | White is the *weaker* side; surviving `holdMoves` full moves, stalemate (either colour), threefold repetition, or insufficient material | White is checkmated, or early-adjudicated (below) |

- `hold` positions carry a `holdMoves` field (defaults to the tier move limit) — the number of full moves white must survive.
- **Hold early adjudication:** after each black reply, `adjudicate()` reuses the eval already produced by that same Stockfish search (no extra search) — if it announces forced mate against white, or the score is worse than −800cp for two consecutive black moves (`state.holdBadStreak`), the round ends immediately as a failure naming the white move that preceded the collapse (`state.lastWhiteMoveSan`): *"Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer!"*
- **Promote-trigger hardening (Opdrag 7 §2):** promotion is no longer an automatic win — Type 7's races mean black may also queen, and a child one tempo ahead could otherwise be handed a "win" in an objectively drawn or lost position. On white promotion, `adjudicate()` stashes the move (`state.pendingPromoteMoveInfo`) and lets the round continue rather than deciding immediately. Black's reply is computed as normal (via `getBestMove`, searching the exact post-promotion position before black's move is applied) and that search's eval — reused, not recomputed, same no-extra-search principle as `hold`'s early adjudication — is checked on the *next* `adjudicate()` call (`phase: 'after-black'`): mate score, or ≥ +300cp, confirms the win there and then; anything less defers entirely, clears the pending flag, and shows a one-time message on white's next turn (`state.pendingPromoteContinueMessage`, since the routine "Jou beurt" text would otherwise overwrite it before the player sees it) — *"Jou pion het gepromoveer — maar die stryd is nog nie verby nie!"* From there the round is decided purely by the ordinary rules above (checkmate wins; stalemate, repetition, and the move limit still fail) — no new special-casing, the guard just declines to short-circuit them.

---

## Engine Behaviour (Black)

**Stockfish plays every black move at full strength (depth 20+), permanently, in every mode and every type.** The scripted engine-inaccuracy ("wobble") rules that used to weaken black for Types 5, 6 (gold), and 17 were deleted in Opdrag 2 — along with `getSecondBestMove`, `getRandomMove`, `blackMoveCount`, and the MultiPV plumbing they depended on. Type 5 was rebuilt against this permanent full-strength baseline in Opdrag 5 (see Starting Positions above) and confirmed via live-fire self-play through the real `getBestMove()` path — no weakening was reintroduced, or ever will be. Type 17 remains harder than before until its positions are rebuilt (Opdrag 9) — expected, and already flagged by `tools/verify_positions.py`.

**Stalemate:**
- In `mate`/`promote` mode: if black is stalemated, the round ends immediately as a **failure**. Key teaching moment — stalemate is the most common beginner error in basic mating endings.
- In `hold` mode: stalemate (either colour) is a **win** — that's the whole point of the drawing technique. Celebrate it: *"Pat — en dis presies wat jy wou hê! Gelykspel gehou!"*

**Threefold repetition — kept enforced, reframed per mode (resolves the old CLAUDE.md/app.js contradiction):**
- `mate`/`promote`: a repetition means the player isn't making progress — ends the round as a failure: *"Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer."*
- `hold`: a repetition **is the win** — *"Drie keer dieselfde posisie — die gelykspel is verseël!"*
- The **50-move rule stays disabled in all modes** — move limits are shorter anyway. `app.js` never relies on chess.js's `game_over()`/`in_draw()` (which silently folds in fifty-move detection); it checks `in_checkmate()`/`in_stalemate()`/`in_threefold_repetition()`/`insufficient_material()` explicitly instead (see `isRoundOver()`).

**Move limit:**
- `mate`/`promote`: reaching the limit is a **failure** — *"Tyd op — die outjie het weggekom. Wat van nog 'n rondte?"*
- `hold`: reaching `holdMoves` is the **win** — *"Vesting gehou! Die gelykspel is joune. Baie goed!"*

---

## Hint System

A "Wenk" (Hint) button shows the single best move for white as a highlighted arrow on the board (Stockfish depth 20).

| Tier | Hint Behaviour |
|------|---------------|
| Brons | Always available |
| Silwer | Available for white's first 10 moves. On move 11, button is replaced with: *"Jy kan dit doen!"* |
| Goud | No hint button |

---

## Post-Round Replay

Triggered automatically after **every** round, win or fail (Opdrag 9 §1 — previously wins skipped straight to badge-unlock/map; see Known Issues history below for why that was wrong):

1. Board resets to the puzzle's original starting FEN
2. Stockfish computes and plays the **strong game from scratch**: near-optimal white moves vs near-optimal black responses (Stockfish without tablebases — "strong," not "perfect," per Opdrag 9 §2's honesty fix)
3. Each move is shown with a **2-second delay**
4. Moves are displayed as arrows/highlights on the board
5. Label is mode-aware: `mate` → *"Sterk spel vanaf hierdie posisie"*; `promote` → *"Sterk omskakeling vanaf hierdie posisie"*; `hold` → *"Sterk verdediging vanaf hierdie posisie"*
6. Termination is mode-aware too: `mate` runs to checkmate/stalemate/repetition (80-ply safety cap); `promote` stops one beat after the first white promotion; `hold` runs `holdMoves` full moves or stops early — proudly, not apologetically — on repetition
7. After replay completes, show buttons: **"Volgende Rondte"** and **"Probeer Weer"**. For a win, "Volgende Rondte" routes to badge-unlock (chaining to fase-unlock if that badge also crossed a gate) or straight back to the badge map, exactly as it always did — only the timing moved, from immediately to after the replay.

---

## UI Screens

### 1. Tuis / Kentekens (Home / Badge Map)
- **Fase-sectioned (Opdrag 4):** the old flat 4×5 grid is now 4 fase sections, each with a header (fase number, name, progress chip "{x}/{y} bronse" counting only the fase's types with ≥1 active bronze), followed by that fase's type-badge grid (still 4-wide within a section)
- Locked fases render their type badges greyed out (with a lock glyph in the header) plus a hint: *"Ontsluit deur al die bronse in Fase {N−1} te verdien"*
- Each badge shows: Afrikaans type name, current tier colour (greyed out / bronze / silver / gold)
- A "Speel" (Play) button launches a random puzzle from the current available pool
- Progress summary visible (e.g., how many badges earned at each tier)

### 2. Spelskerm (Game Screen)
- Chessboard (centre)
- Top bar: current badge name + tier, **objective label** (*"Doel: Skaakmat"* / *"Doel: Promoveer 'n pion"* / *"Doel: Hou die gelykspel — oorleef {n} skuiwe"*, always visible next to the tier badge), move counter (*"Skuiwe oor: X"* counting down, or *"Oorleef nog: X"* counting up in `hold` mode)
- Conditional hint button (*"Wenk"*) per tier rules above
- **Sleutelgedagte panel (Opdrag 10):** a glass panel to the right of the board (`.sleutelgedagte-panel`, 260px, matching the shared Chess_Games "Analysis/Review" right-column convention) showing the current puzzle type's `sleutelgedagte` — a <100-word Afrikaans key-idea explanation of that endgame's core technique, addressed directly to the player ("jy"). Data lives per-type on `ENDGAME_TYPES[i].sleutelgedagte` in `positions.js`, all 25 types covered; populated in `startGame()` alongside the rest of the header. Not a full theory lesson — one thing to remember per type.
- Piece capture display optional

### 3. Uitslag (Result Screen)
- Win: now shown like any other round (Opdrag 9 §1) — heading/icon/message vary by win reason (`checkmate`, `promote`, `hold_survived`, `hold_stalemate`, `hold_repetition`, `hold_insufficient`), styled with the `.win` heading colour (green). Transitions to replay after 2 seconds, same as failures.
- Stalemate failure: *"Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby."* (mate/promote only — `hold` mode wins on stalemate)
- Move limit failure: *"Tyd op — die outjie het weggekom. Wat van nog 'n rondte?"* (mate/promote only — `hold` mode wins on reaching `holdMoves`)
- Repetition failure (mate/promote): *"Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer."*
- Hold failure (mated): *"Skaakmat — die vesting het geval. Kyk in die herspeel waar dit gebeur het."*
- Hold failure (adjudicated): *"Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer!"*
- Automatically transitions to replay after 2 seconds

### 4. Herspeel (Replay Screen)
- Board plays the perfect game from starting position
- Label is mode-aware — see Post-Round Replay above
- Move counter visible
- Buttons after completion: *"Volgende Rondte"* | *"Probeer Weer"*

### 5. Kenteken Ontsluit (Badge Unlock Screen)
- Shown when any badge tier is newly earned
- Display badge with new colour (bronze/silver/gold)
- Message: *"Nuwe vlak ontsluit. Ramkat!"*
- Brief celebration (confetti or glow animation), then returns to Badge Map — **unless** this badge also just unlocked a new fase, in which case it chains into Screen 6 instead (see below)

### 6. Fase Ontsluit (Fase Unlock Screen) — Opdrag 4
- Shown immediately **after** the badge-unlock screen, never concurrently with it — `finishRound()` snapshots which fases are unlocked before `earnBadge()` runs and diffs against the post-earn state to detect a newly-crossed gate; the result is stashed on `state.newlyUnlockedFase` and consumed by `finishBadgeUnlock()`, which chains to `showFaseUnlock()` only if that stash is set
- Displays: fase name (large), a row of the fase's type icons, message *"Nuwe Fase Ontsluit! Ramkat!"*
- Auto-dismisses after ~4 seconds, or immediately via **"Terug na Kentekens"** button
- Returns to the Badge Map, which re-renders with the newly-unlocked fase's section now active

---

## Afrikaans UI String Reference

| Context | Afrikaans |
|---|---|
| App name | Skaakmat Afrigter |
| Check | Skaak |
| Checkmate | Skaakmat |
| Stalemate | Pat |
| Hint button | Wenk |
| Moves remaining | Skuiwe oor |
| Play | Speel |
| Next Round | Volgende Rondte |
| Try Again | Probeer Weer |
| Well done! | Baie goed! |
| You can do it! | Jy kan dit doen! |
| Perfect play from this position | Perfekte spel vanaf hierdie posisie |
| Perfect conversion from this position | Perfekte omskakeling vanaf hierdie posisie |
| Perfect defence from this position | Perfekte verdediging vanaf hierdie posisie |
| Stalemate message | Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby. |
| Move limit message | Tyd op — die outjie het weggekom. Wat van nog 'n rondte? |
| Repetition message (mate/promote) | Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer. |
| Badge unlocked | Nuwe vlak ontsluit. Ramkat! |
| Fase unlocked heading | Nuwe Fase Ontsluit! |
| Fase locked hint | Ontsluit deur al die bronse in Fase {N} te verdien |
| Fase unlock button | Terug na Kentekens |
| Objective, mate | Doel: Skaakmat |
| Objective, promote | Doel: Promoveer 'n pion |
| Objective, hold | Doel: Hou die gelykspel — oorleef {n} skuiwe |
| Promote win | Promosie! Die pion word 'n koningin. Baie goed! |
| Promote win (under-promotion) | Promosie — en boonop 'n ruiter! Slim gedaan! |
| Promote guard defers (Opdrag 7) | Jou pion het gepromoveer — maar die stryd is nog nie verby nie! |
| Hold win (survived) | Vesting gehou! Die gelykspel is joune. Baie goed! |
| Hold win (stalemate) | Pat — en dis presies wat jy wou hê! Gelykspel gehou! |
| Hold win (repetition) | Drie keer dieselfde posisie — die gelykspel is verseël! |
| Hold fail (mated) | Skaakmat — die vesting het geval. Kyk in die herspeel waar dit gebeur het. |
| Hold fail (adjudicated) | Die vesting het geval ná {move} — Swart breek nou deur. Probeer weer! |
| Bronze | Brons |
| Silver | Silwer |
| Gold | Goud |
| King | Koning |
| Queen | Koningin |
| Rook | Kasteel |
| Bishop | Biskop |
| Knight | Ruiter |
| Pawn | Pion |
| White | Wit |
| Black | Swart |
| Home | Tuis |
| Badges | Kentekens |
| Replay | Herspeel |
| Result | Uitslag |

---

## Chess Piece Notation (for move display)

Use figurine algebraic notation (piece icons instead of letters) to avoid disambiguation issues. Recommended.

---

## Current State (positions.js) — Opdrag 8b (2026-07-13)

Post-Opdrag-8b: **264 positions on file across types 1–20 and 22–27** (`_dev` empty, excluded from this count), **206 active (servable), 58 retired** (audit trail only). Harness: **0 ERRORs** across all six new types (22–27). "Active" below counts (Brons/Silwer/Goud); a retired position still occupies a slot in `positions.js` but is never dealt to a player.

### Opdrag 8b additions — Fase 5 "Fyn Kuns", six new types (22–27)

New curriculum group, gated by Fase 4's bronzes via the existing `isFaseUnlocked()` mechanism (no new app.js logic — verified against the real app.js code via a small vm-sandboxed harness, not just read). All six types generated via the Type 5 pipeline (local filter → tablebase query → band select → gauntlet) as a template, lean counts throughout (3B/2S/2G = 7 positions × 6 types = 42 new, 0 retirements — candidates that failed generation-time checks were swapped before ever reaching `positions.js`). Full per-position evidence (tablebase DTM/rollout/drawing-move-count, harness lines, corrections made mid-task) in `tools/opdrag_08b_manifest.md`.

- **Type 22 (Koningin teen Kasteel, Q vs R, mate):** broad king/rook/queen sweep, tablebase-win-filtered, DTM-banded. Bronze's DTM≤7 band initially picked three mate-in-1s (rook already adjacent to the king — no hunt, no lesson); floor raised to DTM≥3 before final selection. 3/3/2, harness 7/7 OK.
- **Type 23 (Koningin teen 2 Verbonde Pionne, mate):** pawn-phalanx construction (bronze/silver rank 4–5, gold rank 6), tablebase-win-only filter is the entire quality bar per spec. Gold's construction band was initially sorted cheapest-DTM-first like the other tiers — but pawns already on rank 6 are often just captured outright (DTM 3, *easier* than bronze); fixed to sort hardest-first within gold's band. 3/2/2, harness 7/7 OK.
- **Type 24 (Kasteel teen 2 Verbonde Pionne, mate):** same construction as Type 23, rook instead of queen. Same gold-ordering fix applied pre-emptively. Structural finding (not a search gap): exhaustively widened the bronze search (382 win-candidates) and confirmed a rook cannot convert this material faster than DTM 8 — the default bronze budget (7.2) is structurally unreachable here. Resolved the established way: bumped `moveLimit` on the three bronze positions (14/16/16) rather than accept a WARN. 3/2/2, harness 7/7 OK, 0 WARN.
- **Type 25 (Ruiter-en-Pion teen Ruiter, promote):** curated skeleton, defender-knight near/far sets (brons=far/goud=near per spec). **Real lesson of this type:** tablebase DTM is not a reliable difficulty/convergence proxy for `promote` positions — first-pass gold (tablebase DTM=25, category=win) **failed the harness** (`geen bevordering binne 100 wit-skuiwe nie`, real self-play rollout never converged). Diagnosed by rollout-testing a broad candidate sample directly; replaced with a rollout-confirmed candidate (16 white-moves) and re-selected silver the same way (first pass was rollout=2, indistinguishable from bronze). Final picks are real-rollout-confirmed: bronze 2–4, silver 7–9, gold 13–16 white-moves. 3/2/2, harness 7/7 OK.
- **Type 26 (Biskop-en-Pion teen Biskop, selfde kleur, promote):** same shape as Type 25 plus the same-colour-bishop constraint (opposite-colour is Type 27's material, never sampled here). Applied Type 25's lesson pre-emptively — rollout-checked every candidate *before* writing to positions.js, catching one more tablebase/real-play mismatch this way (a bronze pick swapped before it ever reached the harness). 3/2/2, harness 7/7 OK.
- **Type 27 (Teenoorgestelde Biskoppe: Verdedig!, hold):** the game's first real defence badge — white K+B vs black K+B(opposite colour)+P, `winCondition: 'hold'`. Construction generated broadly and filtered to tablebase `category: 'draw'`; correctness is the tablebase's job. **Selection criterion (confirmed before generating):** among draw-candidates, count how many of white's legal moves also hold the draw (`classify_move_for_white` reused, tallying `'draw'` instead of C5's `'win'`), preferring ≤3 such moves. A full pass over all 198 draw-candidates projected to ~30 minutes (one tablebase query per legal move per candidate) — killed and re-run capped to a stratified 50-candidate sample (~7 min). Bronze hit the ≤3 criterion exactly (2/7, 2/9, 3/4 safe moves); the capped sample found no silver/gold that tight, so those use the tightest available candidates with a *confirmed* genuine losing move instead (silver 9–10/13–15 safe, gold 6/12–13 safe) — a documented shortfall against the letter of the criterion, not a silent one. **Live-fire:** all 7 confirmed to hold under real engine-vs-engine self-play; the wrong-defence demonstration (bronze #3, playing the identified losing move `1.Ka3??`) shows eval crashing to −762cp immediately, forced mate by ply 10, actual checkmate by ply 21 — comfortably inside `hold` mode's early-adjudication trigger, confirming the Opdrag-2 adjudicator would catch this exact mistake. 3/2/2, harness 7/7 OK.
- **Dedup scan** (`tools/scan_duplicates.py`, full file): 0 exact duplicates, 0 translation-aware near-duplicates among active positions. One pre-existing INFO shadow (T08 S6 vs retired T10 B2), unrelated to this task.

### Opdrag 8 additions (light-touch gap fill — no new certifiers, no re-theming)

- **Type 16 (Aktiewe vs Passiewe Kasteel):** silver was down to 1 active (S1) after two retirements. Added 2 new silvers (S4, S5) — identical piece skeleton to S1, black king shifted to g6/h6. Self-play confirms clean, fast mates (9–11 white moves), 0 stalemate traps. Silver now 3/3.
- **Type 17 (Goeie Biskop vs Slegte Biskop):** bronze was 2 (B1 retired), gold was 1 (G2 retired). Added 1 bronze (bad bishop shifted to d8) and 1 gold (bad bishop to b4, the most active placement yet) on the exact existing skeleton. Self-play: bronze promotes at white-move 20 (within its 26-move budget), gold at move 28 (bumped to `moveLimit: 32` for margin). Bronze 3/—, gold —/2.
- **Type 18 (Biskop teen Ruiter):** silver and gold were both fully empty (all 5 legacy positions were tablebase-drawn) — the real work this task. Rebuilt on new winning theory per the spec: bishop + two widely-separated passers (a- and h-file) vs a bare knight that cannot chase and blockade both. All 4 new positions (2 silver, 2 gold) are **tablebase-certified** (≤6 men, `category: 'win'`), DTM 27–51 plies (14–26 white moves), 0 stalemate traps at the root. Silver 0→2, gold 0→2.
- **Type 19 (Verkeerde Kleur Biskop):** file-checked against the spec's stated gap ("silver 1, gold 1") and found silver already had 2 active (S1, S2) — the spec's number was stale; per the task's own "trust the file" instruction, silver was left untouched. Added 1 gold (G3) via the same generate-and-verify protocol used for the Opdrag-3 bronzes: same a-pawn/wrong-bishop/h-pawn skeleton as B4/B5, plus an extra black pawn (g2) as a defensive resource near white's king. Tablebase-certified `win`, DTM 15 plies (8 white moves), 0 stalemate traps. Gold 1→2.
- **Optional `_dev` promotion (taken, ~10 min):** the Opdrag-2 hold-mode test fixture (white as the *weaker* side, holding the wrong-bishop corner against a bishop+pawn) was promoted to a real T19 silver (S6, `winCondition: 'hold'`, `holdMoves: 12`). The `_dev` copy was removed outright rather than retired-with-identical-FEN — retiring it would have tripped `scan_duplicates.py`'s exact-duplicate check for no benefit, since `_dev` was never part of the audit-trail convention that applies to the 20 real types. The `_dev` key itself stays (empty arrays) since `buildPool()` in `app.js` explicitly filters on it by name.
- **Type 15:** not touched — no gap (spec confirmed no-touch).
- All four types verified via `--fast` harness mode (0 ERRORs) plus targeted manual self-play/tablebase checks for every new position, since `--fast`'s single-PV-scan under-detects promotions in slow positional conversions (a known, pre-existing limitation, not a new defect — see the WARN pattern shared with untouched siblings in types 17/18).

### Opdrag 7 additions

- **§2, promote-trigger hardening (`app.js`):** white promotion no longer wins instantly — the guard reuses black's reply-search eval (no extra search) to decide. Mate score or ≥ +300cp grants the win there; anything less defers, shows a one-time message, and falls through to the ordinary rules. See the win-condition table above.
- **Type 7 (Wedren):** all ten re-tagged `promote`. Bronze/silver are "clean races" — black never promotes, confirmed via rollout. Gold is the finesse tier: both golds were rebuilt from scratch (the originals never actually raced under full-strength play — tablebase-exact PVs showed black's pawn never even advancing) into genuine promotion-with-check positions where black's own pawn *does* queen (rollout-confirmed) and white's check wins anyway.
- **Type 11 (Piondeurbraak):** rebuilt from scratch. All 6 legacy survivors (B1, S1–S3, G1, G2) failed a new C5-breakthrough certification (winning moves must be pawn moves only, ≤2 of them, and every king move must lose) — with kings too far from the pawn wall, king "waiting" moves also retained a winning evaluation, making the sacrifice decorative. Replaced with 10 new positions (kings placed exactly 2 files + 1 rank from the pawn triple's center), each C5-certified; gold additionally carries a genuine black counter-passer that runs during self-play (one reaches move away from queening before mate).
- **Type 12 (Buitenste Verbygeraakte Pion):** audit found B2, B3, S1, and S3 all had **zero black pawns** — same "nothing to harvest" defect the spec flagged for B2/B3 only; all four retired. G2 also retired (its harvest happened via the post-promotion queen, not the king, a weaker match to the decoy contract). 10 new positions built around an outside-file (a or h) decoy paired with a same-side-pair harvest target (f/g, g/h, or b/c) — b/c- and e/f-file decoy attempts repeatedly fizzled into pawn-trade draws in self-play, confirming the bait must sit on the genuinely outermost file. **Known limitation:** the mandated forbidden-passer spot-check (win without ever pushing the decoy pawn) was applied to a sample and failed for the sampled candidates — material is 3 pawns vs 2, so white can often win by other means regardless of the bait. A follow-up perfect-replay check across one position per tier found the **silver and gold tiers do use the decoy genuinely** (black's king travels to and captures the bait while white's king independently harvests the far wing), but the sampled **bronze** position did not (white's outside pawn just races home unopposed, structurally closer to Type 7). All 10 are shipped active — **bronze tier is flagged as thematically uncertified: decoy present but not binding (race-shaped), acceptable for a bronze tier but not a genuine C8 arc.** The documented fix, if ever revisited, is a tighter 2-vs-2 material construction (one outside pawn + one contested-wing pawn per side) where the bait is what turns a draw into a win, rather than extra material that wins regardless.

### The four contracts (Opdrag 6 §1)

| Tipe | Kontrak (the one thing it teaches) | Wenvoorwaarde |
|---|---|---|
| 6 — Sleutelblokkies | Can my king reach a key square? The yes/no grammar of pawn endings. | `promote` |
| 8 — Opposisie | Opposition is die sleutel tot die deur: the win exists only for the player who takes (or keeps) the opposition — including **distant** opposition at gold. | `promote` |
| 9 — Zugzwang | Die wagskuif wen: the natural, active move throws the win away; only quiet patience works. | `promote` |

Type 10 (Driehoeksbeweging) is no longer one of the app's types — cut permanently in Opdrag 6b. See its Current State epitaph below.

**Certification, so future contributors know the bar:** Type 9 is **C5-strict-certified** — every active position has the tablebase confirm *exactly one* winning move, plus at least one losing move that's a "natural" (non-retreating) king try, so the position can't be solved by just avoiding obvious blunders (`check_c5_strict` in `tools/verify_positions.py`, superseding the old engine-heuristic `check_c5` for type 8/9). `check_c7` (the reciprocal-zugzwang-square-pair-plus-triangle-cycle detector) and the whole core-sweep methodology remain in `tools/verify_positions.py` and `tools/scan_duplicates.py`, validated against real, hand-confirmed reciprocal-zugzwang pairs — kept in place as working infrastructure should Type 10 (or a similar type) ever be reopened, even though it's not currently wired to any active type. Both checks are tablebase-exact, not engine-heuristic. `tools/scan_duplicates.py` also runs the translation-aware near-duplicate scan (flags two active positions identical under a uniform file/rank shift) — it caught a real self-inflicted collision during Opdrag 6 (see that task's purge manifest) before it could ship.

| Type | Active (B/S/G) | Retired | Status | Notes |
|------|------|---------|--------|-------|
| 1 — K+Q vs K | 5/3/2 | 0 | ✅ | Brons #1 `moveLimit` bumped to 14 (budget) |
| 2 — K+R vs K | 5/3/2 | 0 | ✅ | Brons #5 `moveLimit` bumped to 19 (budget) |
| 3 — K+BB vs K | 2/3/2 | 1 (B2) | ✅ | B2 retired — mate-in-1 with a 12/19 stalemate minefield |
| 4 — K+BN vs K | 3/3/2 | 2 (S2, S3) | ✅ | S2/S3 retired (exact DTM 31/29 — gold-depth, not silver) and **replaced** with two new silvers (DTM 14/17), same generate-and-verify protocol as Type 19 |
| 5 — K+NN vs K | 3/3/2 | 8 (all legacy) | ✅ | Rebuilt from scratch (Opdrag 5) per Troitsky method — 8 new positions, blockade pre-established, `category: 'win'` + DTM 8/9/8 (brons), 17/20/20 (silwer), 28/32 (goud), all tablebase-certified; extended limits 22/34/46 retained. The two golds are deliberately distinct (different pawn file, opposite-side mating corner, DTM 28 vs 32) after a first draft coincidentally landed both at the gold band's DTM floor. Legacy 8 stay retired (theoretically drawn/lost/cursed-win under exact tablebase) as audit trail |
| 6 — K+P vs K | 5/3/2 | 0 | ✅ | Re-tagged `promote` (Opdrag 6) — all ten limits recomputed from rollout × 60/75/85%. B2/B4's black king moved one square off the old B1/B3 file-shift (Opdrag 6's new translation-aware dedup scan caught the twin) |
| 7 — Verbygeraakte Pion Wedren | 5/3/2 | 0 | ✅ | Opdrag 7: re-tagged `promote`; both golds rebuilt — genuine promotion-with-check finesse, black's own pawn queens too (rollout-confirmed) and white's check wins anyway |
| 8 — Opposisie & Koningaktiwiteit | 10/6/2 | 10 (all legacy) | ✅ | Rebuilt from scratch (Opdrag 6) — all 8 legacy actives failed C5-strict (3–5 winning moves, not ≤2); 10 new (5B/3S) plus 2 new distant-opposition golds, all C5-strict-certified, `promote`-tagged, rollout-budgeted |
| 9 — Zugzwang | 3/3/2 | 7 (all legacy bronze + upper tiers) | ✅ | S1 ("die pêrel", unique winner Kc5) stays as the template, re-tagged `promote`; the 3 legacy bronzes failed C5-strict (2–5 winning moves, not =1) and were replaced; 2 new silver + 2 new gold escalate to K+2P vs K+P, all C5-strict-certified at exactly 1 winning move |
| ~~10 — Driehoeksbeweging~~ | — | 8 (audit trail) | ❌ **Cut (Opdrag 6b)** | Structural finding, not a detector fault: a genuine reciprocal-zugzwang core requires **both** black pawns to be simultaneously unguardable by the single black king — that's mathematically necessary for the tempo-sensitivity to exist (confirmed directly: whenever black's king sits close enough to guard a pawn, the position is a stable draw regardless of tempo, zero exceptions in 200 tested cases). But that same unguardedness means any white king displaced from the exact core square can simply walk over and capture the loose pawn instead of triangulating — faster than the tablebase's own detour, every time it was tried. Tried and failed across five materially distinct families: bare 4-man, 6-man double-blocked, a defended-reserve-pawn variant, adjacent (mutually-guardable) pairs, and bare K+P vs K — confirmed via ~35 hand-traced calibration attempts, all with the same outcome. The one untested escape route, should anyone reopen this: a **tethered-by-passer** construction, where black's king is obligated elsewhere by an *outside passed pawn* rather than by the blocked pair itself — never tried, and structurally different enough from every family above that the same shortcut may not apply. `check_c7`, the core-sweep tooling, and all retired Type 10 positions stay in the codebase as working infrastructure; badge, Fase 2 gate, and Speel pool all exclude the type automatically (zero active positions was already sufficient, per the same mechanism that handled Type 5's temporary retirement in Opdrag 4). |
| 11 — Piondeurbraak | 5/3/2 | 5 (old B1, S1–S3, G1, G2 = 6, minus nothing kept) | ✅ | Opdrag 7: full rebuild — all 6 legacy survivors failed the new C5-breakthrough certifier (non-pawn king moves also "won," decorative sac); replaced with 10 C5-certified positions, kings placed exactly 2 files + 1 rank from the pawn wall; gold adds a genuine running black counter-passer |
| 12 — Buitenste Verbygeraakte Pion | 5/3/2 | 6 (old B1–B3, S1, S3, G2) | ✅ | Opdrag 7: B2/B3/S1/S3 retired (zero black pawns — nothing to harvest); G2 retired (harvest via queen, not king). 10 new positions built on outside-file decoy + same-side harvest pair. **Bronze flagged**: forbidden-passer spot-check and perfect-replay sampling show bronze's decoy is present but not binding (race-shaped, 3-vs-2 material wins regardless) — acceptable for bronze, not a genuine C8 arc. Silver/gold sampling confirmed genuine decoy use. Documented fix if revisited: tighter 2-vs-2 material |
| 13 — Lucena-posisie | 3/3/2 | 0 | ✅ | All 8 re-tagged `winCondition: 'promote'` — the bridge exists to force promotion |
| 14 — Philidor-posisie | 3/3/2 | 0 | ✅ | Silwer #2 `moveLimit` bumped to 26 (budget) |
| 15 — Kasteel Agter Verbygeraakte Pion | 3/3/2 | 0 | ✅ | Left as `mate` — Opdrag 8 revisits its difficulty curve |
| 16 — Aktiewe vs Passiewe Kasteel | 3/3/2 | 2 (S2, S3) | ✅ | Opdrag 8: added 2 silvers (S4, S5) on S1's exact skeleton, black king g6/h6 — clean 9–11 move mates, 0 stalemate traps |
| 17 — Goeie Biskop vs Slegte Biskop | 3/3/2 | 2 (B1, G2) | ✅ | Opdrag 8: added 1 bronze (bad bishop d8, promotes move 20) and 1 gold (bad bishop b4, promotes move 28, `moveLimit` 32) on the existing skeleton |
| 18 — Biskop teen Ruiter | 3/2/2 | 5 (all legacy S, all legacy G) | ✅ | Opdrag 8: rebuilt silver+gold on new theory — bishop + two widely-separated passers (a/h-file) vs bare knight that can't chase and blockade both. All 4 tablebase-certified `win`, DTM 27–51 plies, 0 stalemate traps |
| 19 — Verkeerde Kleur Biskop | 3/3/2 | 4 (B1, B3, S3, G1) | ✅ | Opdrag 8: file audit found silver already had 2 active (spec's "1" was stale, left untouched); added 1 gold (B4/B5-style skeleton + extra black defending pawn), tablebase DTM=15. Also: the Opdrag-2 `_dev` hold fixture promoted to a real silver (S6, `hold`, white as the weaker side) |
| 20 — Koningin teen Pion op 7de Ry | 3/3/2 | 0 | ✅ | Brons #3 `moveLimit` bumped to 17 (budget) |
| ~~21 — Hartjie van die Bord~~ | — | — | ❌ Removed | Central-checkmate constraint unachievable with B+N |
| 22 — Koningin teen Kasteel | 3/2/2 | 0 | ✅ | Opdrag 8b: broad K/Q/R sweep, tablebase DTM-banded (bronze floor raised to DTM≥3 to avoid mate-in-1 picks) |
| 23 — Koningin teen 2 Verbonde Pionne | 3/2/2 | 0 | ✅ | Opdrag 8b: pawn-phalanx construction (bronze/silver rank 4–5, gold rank 6); gold selection fixed to hardest-first within its band |
| 24 — Kasteel teen 2 Verbonde Pionne | 3/2/2 | 0 | ✅ | Opdrag 8b: same construction as T23 with a rook; bronze `moveLimit` bumped (14/16/16) — a rook structurally cannot convert this material faster than DTM 8, confirmed via a 382-candidate search |
| 25 — Ruiter-en-Pion teen Ruiter | 3/2/2 | 0 | ✅ | Opdrag 8b: defender-knight near/far construction; final picks selected by real self-play rollout, not tablebase DTM, after a tablebase-win gold candidate failed the harness outright |
| 26 — Biskop-en-Pion teen Biskop (selfde kleur) | 3/2/2 | 0 | ✅ | Opdrag 8b: same-colour-bishop constraint added to T25's shape; every candidate rollout-checked before writing to positions.js, catching one more tablebase/real-play mismatch pre-emptively |
| 27 — Teenoorgestelde Biskoppe: Verdedig! | 3/2/2 | 0 | ✅ | Opdrag 8b: first `hold`-mode type since T19 S6 — opposite-colour bishops, tablebase `draw`-filtered. Selection by reversed-C5 (count drawing moves, prefer ≤3); bronze hit that bar, silver/gold used the tightest available with a confirmed genuine losing move instead (documented shortfall). Live-fire confirmed both correct defence and a wrong-defence adjudication trigger |
| _dev (test scaffolding) | 0/0/0 | — | ✅ Emptied (Opdrag 8) | Its one hold-mode fixture was promoted to a real T19 silver (see above) and removed here (not retired — `_dev` was never part of the audit-trail convention, and a retired copy with an identical FEN would only have tripped the exact-duplicate scan for no benefit). The `_dev` key itself stays, empty, since `buildPool()` in `app.js` filters on it by name. |

**Next:** Opdrag 8b (Fase 5 "Fyn Kuns", six new types 22–27) is complete — 0 ERRORs across all six, dedup-clean, Fase 5 gating verified against the real app.js. Opdrag 8 (light-touch gap fill for 16/17/18/19) remains complete from before. Remaining rebuild ownership per the roadmap: Opdrag 9 → minor-piece endings, specifically Type 17's B1/G2 (retired, genuine draws) and Type 12's bronze decoy-certification gap (flagged in Opdrag 7); Type 27's silver/gold could be revisited with a wider (uncapped) reversed-C5 search if a tighter ≤3-drawing-move example is ever wanted.

---

## Known Issues / Open Items

- **Wins skip the result/replay screens entirely** (`finishRound()` in `app.js` routes any win straight to badge-unlock or the badge map, regardless of `winCondition`). This predates Opdrag 2 — it's the original checkmate-only behaviour, just generalised to all three conditions — but it contradicts the "replay after every round" teaching principle implied by Post-Round Replay's framing above. Worth reconciling: even a win might be worth showing the "perfect game" replay for comparison. To be addressed in Opdrag 12 (replay/hints/final QA).
- **`argief/old_version/` — an abandoned React/Vite/Tailwind/chessground rewrite**, archived (not deleted) during a repo cleanup: `App.jsx` + components + hooks, `package.json`/`vite.config.js`/`tailwind.config.js`/`postcss.config.js`, a stale forked copy of `positions.js` under `src/data/`, and the Stockfish assets that build expected under `public/`. Never shipped — `netlify.toml` has always deployed the vanilla-JS app directly, no build step. Also archived alongside it: three redundant early precursors to `tools/verify_positions.py` (`check_bronze.py`/`.js`/`.mjs`, a narrower "bronze mate-in-≤12 only" check), and `chess_endgame_trainer_brief.md` (an early draft of this very file). None of this is referenced by `index.html`, `app.js`, or `tools/` — safe to ignore unless resurrecting the React rewrite specifically. Moved from `old_version/` (project root) to `argief/old_version/` in Opdrag 9's repo-hygiene pass, alongside the ten completed `Opdrag_01`–`Opdrag_08b` task specs (also now under `argief/`) — `Opdrag_09_Finale_QA.md` stays at the root while it's the active task. `netlify.toml`'s build step (see Deployment below) excludes `argief/` from what actually gets published.

---

## Key Design Principles

- **Learning first:** Every failure state is an opportunity to teach. Stalemate especially should feel instructive, not just punishing.
- **Afrikaans throughout:** Every string, button, label, and message must be in Afrikaans. No English visible to the player.
- **Young player friendly:** Language should be warm, encouraging, and accessible to a young club-level chess player.
- **No takebacks:** Not available at any tier. The replay is the learning mechanism, not undo.
- **Celebration matters:** Badge unlock moments should feel rewarding. *"Ramkat!"* energy throughout.

---

## FEN Position Rules

- White always to move (` w ` in FEN)
- Pawns only on ranks 2–7 (never rank 1 or 8)
- Kings must not be adjacent in the starting position
- No duplicate FENs across any type or tier
- All positions hand-verified for legality
