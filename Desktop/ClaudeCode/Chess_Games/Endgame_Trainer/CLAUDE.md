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

**Audience**: Young players (~8–12 years), mostly in Afrikaans.

---

## Three Tiers Per Badge

| Tier | Afrikaans | Move Limit | Puzzles Per Type | Hints |
|------|-----------|------------|-----------------|-------|
| Bronze | Brons | 12 moves | 5 | Always available |
| Silver | Silwer | 24 moves | 3 | First 10 moves only, then notification |
| Gold | Goud | 36 moves | 2 | None |

**Definition of "move":** One full turn = one white move + one black response.

---

## Badge & Progression Logic

- **Earning a tier:** A badge tier is earned by completing **any single puzzle** of that tier and type within the move limit. Quality of play is not assessed — mate within the limit = earned.
- **Once earned:** No further puzzles of that tier and type are ever offered to the player.
- **Unlocking:** Bronze is available from the start. Silver unlocks for a type once its Bronze is earned. Gold unlocks for a type once its Silver is earned.
- **Puzzle queue:** At the start, the player sees bronze puzzles only. Over time they may see a mix of tiers across different types. Puzzles are drawn **randomly** from all currently available (unearned) tiers and types.
- **Persistence:** All badge and puzzle progress persists via `localStorage`.

---

## 200 Starting Positions

All positions are hardcoded as FEN strings, stored in `positions.js` grouped by type and tier.

**Counts:** 5 bronze + 3 silver + 2 gold = 10 per type × 20 types = **200 total**

**Construction guidelines by type:**
- **Pure material endings (Types 1–5):** Use Syzygy tablebase theory. Bronze positions should be close to forced mate (within ~8–10 ideal moves). Silver positions mid-distance. Gold positions further back, requiring longer technique.
- **Structural/thematic endings (Types 6–20):** Construct canonical positions based on well-known endgame theory for each theme. Positions should clearly illustrate the concept being taught.
- **King & Two Knights (Type 5) special rule:** All positions — at all tiers — must be pre-constructed such that black's inaccuracy (see Engine Behaviour below) creates a genuine mating net reachable within the tier's move limit. These cannot be randomly generated; they require deliberate setup.

---

## Engine Behaviour (Black)

**Normal play:** Stockfish plays at maximum strength (depth 20+).

**Inaccuracy rule:**
- Applies **only** to endgame types that are theoretically unsolvable without it (currently: Type 5, King & Two Knights).
- Every **5th black move**, Stockfish plays the **second-best move** instead of the best.
- The inaccuracy counter **resets at the start of each new game**.
- Each inaccuracy must be exploitable by white within 5 moves — positions should be pre-validated to ensure this.

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
- 4×5 grid of 20 badges
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

## Current Sprint State (positions.js)

All 20 types complete (as of March 2026):

| Type | Status | Notes |
|------|--------|-------|
| 1 — K+Q vs K | ✅ Complete (5B 3S 2G) | |
| 2 — K+R vs K | ✅ Complete (5B 3S 2G) | |
| 3 — K+BB vs K | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 4 — K+BN vs K | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 5 — K+NN vs K | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5; inaccuracy rule in app.js |
| 6 — K+P vs K | ✅ Complete (5B 3S 2G) | |
| 7 — Passed Pawn Races | ✅ Complete (5B 3S 2G) | |
| 8 — Opposition & King Activity | ✅ Complete (5B 3S 2G) | |
| 9 — Zugzwang | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 10 — Triangulation | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 11 — Piondeurbraak | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 12 — Buitenste Verbygeraakte Pion | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 13 — Lucena | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 14 — Philidor | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 15 — Toring Agter Verbygeraakte Pion | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 16 — Aktiewe vs Passiewe Toring | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 17 — Goeie Loper vs Slegte Loper | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 18 — Loper teen Ruiter | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |
| 19 — Verkeerde Kleur Loper | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5; extra pawn provides winning resource |
| 20 — Q vs P on 7th | ✅ Complete (3B 3S 2G) | Bronze has 3 not 5 |

**All 20 types complete.** Next sprint: verify app.js Type 5 inaccuracy rule (every 5th black move → second-best), then full playthrough testing.

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
