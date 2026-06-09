# Skaakmat Afrigter — Claude Code Brief
### Chess Endgame Trainer (Afrikaans UI)

---

## Overview

Build a chess endgame training web app called **"Skaakmat Afrigter"**. The player always plays white; the engine (Stockfish via WebAssembly) plays black. The goal is always checkmate. The app is a learning tool first, a game second. The entire UI must be in **Afrikaans**.

---

## Tech Stack

- **Framework:** React (single page app)
- **Chess logic:** `chess.js` (move validation, game state)
- **Board UI:** `chessground` (Lichess's board library)
- **Engine:** Stockfish 16 via WebAssembly (`stockfish.wasm`)
- **Styling:** Tailwind CSS

The app is built with Vite. Run with `npm run dev`. The entry point is `index.html`; game logic lives in `app.js`; all 200 FEN positions are in `positions.js`.

---

## The 20 Endgame Types (Badge Names in Afrikaans)

Each type corresponds to one badge. Listed in recommended difficulty order:

| # | Afrikaans Name | English Reference |
|---|---|---|
| 1 | Koning & Koningin teen Koning | King & Queen vs King |
| 2 | Koning & Toring teen Koning | King & Rook vs King |
| 3 | Koning & Twee Lopers teen Koning | King & Two Bishops vs King |
| 4 | Koning, Loper & Ruiter teen Koning | King & Bishop & Knight vs King |
| 5 | Koning & Twee Ruiters teen Koning | King & Two Knights vs King |
| 6 | Koning & Pion teen Koning | King & Pawn vs King |
| 7 | Verbygeraakte Pion Wedren | Passed Pawn Races |
| 8 | Opposisie & Koningaktiwiteit | Opposition & King Activity |
| 9 | Zugzwang | Zugzwang |
| 10 | Driehoeksbeweging | Triangulation |
| 11 | Piondeurbraak | Pawn Breakthrough |
| 12 | Buitenste Verbygeraakte Pion | Outside Passed Pawn |
| 13 | Lucena-posisie | Lucena Position |
| 14 | Philidor-posisie | Philidor Position |
| 15 | Toring Agter Verbygeraakte Pion | Rook Behind Passed Pawn |
| 16 | Aktiewe vs Passiewe Toring | Active vs Passive Rook |
| 17 | Goeie Loper vs Slegte Loper | Good Bishop vs Bad Bishop |
| 18 | Loper teen Ruiter | Bishop vs Knight |
| 19 | Verkeerde Kleur Loper | Wrong-Coloured Bishop |
| 20 | Koningin teen Pion op 7de Ry | Queen vs Pawn on 7th Rank |

> Type 21 (Hartjie van die Bord) was removed — the "central checkmate only" constraint was unachievable because the pawns in those positions didn't reliably cage the king away from the edge, and B+N naturally mates on edge squares. Total badge count is **60** (20 types × 3 tiers).

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
- **Unlocking:** Bronze is available from the start. Silver unlocks for a type once its Bronze is earned. Gold unlocks for a type once its Silver is earned.
- **Puzzle queue:** At the start, the player sees bronze puzzles only. Over time they may see a mix of tiers across different types. Puzzles are drawn **randomly** from all currently available (unearned) tiers and types.
- **Persistence:** All badge and puzzle progress persists via `localStorage`.

---

## Starting Positions

All positions are hardcoded as FEN strings, stored in `positions.js` grouped by type and tier.

**Counts:** 20 types × (3B + 3S + 2G) ≈ **~160 positions** (some types have 3 bronze instead of 5).

**Construction guidelines by type:**
- **Pure material endings (Types 1–5):** Use Syzygy tablebase theory. Bronze positions should be close to forced mate. Silver positions mid-distance. Gold positions further back, requiring longer technique.
- **Structural/thematic endings (Types 6–20):** Construct canonical positions based on well-known endgame theory for each theme.
- **King & Two Knights (Type 5) special rule:** All positions must be pre-constructed such that the inaccuracy rule (random + second-best wobble, see Engine Behaviour) creates a mating net reachable within the tier's extended move limit (22 / 34 / 46). Positions include a "hook" pawn on rank 7 (bronze), 5 (silver), or 2 (gold) to prevent stalemate in the corner.

---

## Engine Behaviour (Black)

**Normal play:** Stockfish plays at maximum strength (depth 20+).

**Inaccuracy rule** — three types, implemented in `handleAfterWhiteMove` in `app.js`:

| Type | Rule |
|------|------|
| 5 — Twee Ruiters | Random legal move on black turns 4, 9, 14, 19, 24 (mc % 5 === 4); second-best on turns 5, 10, 15, 20, 25 (mc % 5 === 0). Double wobble every 5 turns. |
| 6 — K+P (gold only) | Second-best every 5th black move — prevents infinite repetition draws. |
| 17 — Goeie Loper | Second-best on black moves 4, 10, and 12 (all tiers). Provides the break needed to establish a material advantage before Stockfish seals the locked-pawn position. |

- The move counter (`blackMoveCount`) resets at the start of each new game.
- "Random" uses `chess.js moves({ verbose: true })` — picks uniformly from all legal moves, no Stockfish call needed.

**Stalemate:**
- If black is stalemated, the round ends immediately as a **failure**.
- Display: *"Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby."*
- This is a key teaching moment — stalemate is the most common beginner error in basic mating endings.

**Draw conditions:**
- Only two draw conditions exist: **stalemate** (above) or **move limit exhaustion**.
- The 50-move rule and threefold repetition are **disabled**.

**Move limit failure:**
- Display: *"Tyd op — die outjie het weggekom. Wat van nog 'n rondte?"*

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

Triggered automatically after **every** round (win, loss, or stalemate):

1. Board resets to the puzzle's original starting FEN
2. Stockfish computes and plays the **perfect game from scratch**: optimal white moves vs optimal black responses
3. Each move is shown with a **2-second delay**
4. Moves are displayed as arrows/highlights on the board
5. Label displayed throughout: *"Perfekte spel vanaf hierdie posisie"*
6. After replay completes, show buttons: **"Volgende Rondte"** and **"Probeer Weer"**

---

## UI Screens

### 1. Tuis / Kentekens (Home / Badge Map)
- 4×5 grid of 20 badges (was 21 — Type 21 removed)
- Each badge shows: Afrikaans type name, current tier colour (greyed out / bronze / silver / gold)
- A "Speel" (Play) button launches a random puzzle from the current available pool
- Progress summary visible (e.g., how many badges earned at each tier)

### 2. Spelskerm (Game Screen)
- Chessboard (centre)
- Top bar: current badge name + tier, move counter (*"Skuiwe oor: X"*)
- Conditional hint button (*"Wenk"*) per tier rules above
- Piece capture display optional

### 3. Uitslag (Result Screen)
- Win: *"Skaakmat! Baie goed!"*
- Stalemate failure: *"Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby."*
- Move limit failure: *"Tyd op — die outjie het weggekom. Wat van nog 'n rondte?"*
- Automatically transitions to replay after 2 seconds

### 4. Herspeel (Replay Screen)
- Board plays the perfect game from starting position
- Label: *"Perfekte spel vanaf hierdie posisie"*
- Move counter visible
- Buttons after completion: *"Volgende Rondte"* | *"Probeer Weer"*

### 5. Kenteken Ontsluit (Badge Unlock Screen)
- Shown when any badge tier is newly earned
- Display badge with new colour (bronze/silver/gold)
- Message: *"Nuwe vlak ontsluit. Ramkat!"*
- Brief celebration (confetti or glow animation), then returns to Badge Map

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
| Stalemate message | Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby. |
| Move limit message | Tyd op — die outjie het weggekom. Wat van nog 'n rondte? |
| Badge unlocked | Nuwe vlak ontsluit. Ramkat! |
| Bronze | Brons |
| Silver | Silwer |
| Gold | Goud |
| King | Koning |
| Queen | Koningin |
| Rook | Toring |
| Bishop | Loper |
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

## Current State (positions.js) — June 2026

All 20 active types complete:

| Type | Status | Notes |
|------|--------|-------|
| 1 — K+Q vs K | ✅ Complete (5B 3S 2G) | |
| 2 — K+R vs K | ✅ Complete (5B 3S 2G) | |
| 3 — K+BB vs K | ✅ Complete (3B 3S 2G) | |
| 4 — K+BN vs K | ✅ Complete (3B 3S 2G) | |
| 5 — K+NN vs K | ✅ Complete (3B 3S 2G) | Extended limits 22/34/46; random+second-best wobble rule |
| 6 — K+P vs K | ✅ Complete (5B 3S 2G) | |
| 7 — Passed Pawn Races | ✅ Complete (5B 3S 2G) | |
| 8 — Opposition & King Activity | ✅ Complete (5B 3S 2G) | |
| 9 — Zugzwang | ✅ Complete (3B 3S 2G) | |
| 10 — Triangulation | ✅ Complete (3B 3S 2G) | |
| 11 — Piondeurbraak | ✅ Complete (3B 3S 2G) | |
| 12 — Buitenste Verbygeraakte Pion | ✅ Complete (3B 3S 2G) | |
| 13 — Lucena | ✅ Complete (3B 3S 2G) | |
| 14 — Philidor | ✅ Complete (3B 3S 2G) | |
| 15 — Toring Agter Verbygeraakte Pion | ✅ Complete (3B 3S 2G) | |
| 16 — Aktiewe vs Passiewe Toring | ✅ Complete (3B 3S 2G) | |
| 17 — Goeie Loper vs Slegte Loper | ✅ Complete (3B 3S 2G) | Second-best on moves 4, 10, 12 (all tiers) |
| 18 — Loper teen Ruiter | ✅ Complete (3B 3S 2G) | |
| 19 — Verkeerde Kleur Loper | ✅ Complete (3B 3S 2G) | Extra pawn provides winning resource |
| 20 — Q vs P on 7th | ✅ Complete (3B 3S 2G) | |
| ~~21 — Hartjie van die Bord~~ | ❌ Removed | Central-checkmate constraint unachievable with B+N |

**Next:** playthrough testing of Types 5 and 17 under the new inaccuracy rules.

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
