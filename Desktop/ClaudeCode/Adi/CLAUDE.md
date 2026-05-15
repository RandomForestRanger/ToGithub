# Adi — West African Mancala

Single-file game (`index.html` with embedded CSS + JS). No build step.

Local dev: `python3 -m http.server 8765 --directory ~/Desktop/ClaudeCode/Adi/`

---

## Game Rules (important for AI / logic changes)

Adi is a two-row mancala of the Ewe people of Togo & Ghana.

- **Sowing direction**: anti-clockwise — right along P1's row, then left along P2's row.
- **Capture**: last seed lands in an opponent's hole making it exactly 3 → capture all 3.
- **Chain capture**: check the hole just before the captured one — if also exactly 3, capture that too. Keep going backwards.
- **Same-hole rule**: you cannot sow from a hole you just sowed from until the opponent lands a seed in it.
- **Round end**: when neither player has a valid move, the round ends.
- **Round setup**: the player with fewer seeds in store fills holes right-to-left with 4 each; opponent fills the same *count* of mirrored holes (`hole X ↔ hole 11-X`). Board shrinks each round.
- **Game end**: a player cannot fill even one hole (< 4 seeds in store) → opponent wins.

---

## Architecture

### Hole numbering
```
P2 (top):    [11][10][ 9][ 8][ 7][ 6]   ← displayed right-to-left
P1 (bottom): [ 0][ 1][ 2][ 3][ 4][ 5]
```
- Sowing order (CCW): 0 → 1 → … → 5 → 6 → 7 → … → 11 → 0 …
- `P2_DISPLAY_ORDER = [11,10,9,8,7,6]` (visual left→right)
- P1 visual position = `idx + 1`; P2 visual position from left = `12 - idx`

### `GameState` class
Key fields:
| Field | Description |
|-------|-------------|
| `holes[0..11]` | Seed counts |
| `p1Store` / `p2Store` | Captured seeds |
| `p1Owned` / `p2Owned` | Active holes this round |
| `p1Forbidden` / `p2Forbidden` | Same-hole rule: holes locked until opponent seeds land there |
| `current` | 1 = P1's turn, 2 = P2's turn |
| `round` | Current round number |
| `over` / `winner` | Game-over state |

`makeMove(h)` mutates state immediately and returns `{ captured, sowPath, captured_holes, roundEnded, gameOver }`.

---

## AI

| Mode | Strategy |
|------|----------|
| Easy | 60% takes a capturing move if available; else random |
| Hard | Minimax depth 4, α-β pruning, 10% random slip |

`hardMove(state)` returns **`{ move, slip, scores }`** — `scores` is a map of `{holeIdx: minimaxValue}` for all moves. Pass this to `explainAIMove` so it doesn't re-run minimax.

`evaluate(state, forPlayer)` weights: store diff × 10, seed diff × 1.5, mobility diff × 0.8.

---

## Animation (`animateSow`)

`animateSow(holeIdx)` is `async` and handles all visual sequencing:

1. Source hole glows yellow (`.sowing-source`) — **520 ms**
2. Seeds disappear from source hole
3. Each seed drops one at a time with a blue flash (`.seed-landing`) — **430 ms per seed**
4. `game.makeMove(holeIdx)` is called (state updates here, not before)
5. Captured holes pulse gold (`.just-captured`) — **1 900 ms**

During animation a `display[]` shadow array tracks what's shown; `renderBoard()` is only called after the animation completes.

**Important**: `game` state changes at step 4, not step 1. Don't read `game.holes` during animation — read `display[]`.

---

## Reasoning Panel (right sidebar)

`explainAIMove(stateBefore, chosenMove, difficulty, wasSlip, minimaxScores)` → HTML string.

Called **before** `animateSow` so the explanation is visible while the animation plays.

Factors explained:
- ⚔️ Capture / chain capture
- 🛡️ Counter-capture avoidance (which moves would hand player a capture)
- 🔢 Minimax rank + margin over next-best
- 📦 Store advantage/deficit context
- 🌱 Seed density (when building up for future captures)
- 🎲 Random slip (hard mode) or random pick (easy mode)

---

## Hole Tooltips

`setupHoleTooltips()` uses event delegation on `.board` — call once at startup, not per game.

Tooltip text is generated dynamically from `game` state:
- **`.forbidden`** → explains same-hole rule, says what unlocks it
- **`.inactive-hole`** → states round number, active hole count, why it's out of play

---

## Hole CSS States

| Class | Meaning | Visual |
|-------|---------|--------|
| `.clickable` | Valid P1 move (human's turn) | Pointer cursor, orange glow on hover |
| `.forbidden` | Just sowed from here | 45% opacity + ✕ marker |
| `.inactive-hole` | Not in play this round | 25% opacity, no pointer events |
| `.sowing-source` | Seeds being picked up | Yellow ring, scale 0.93 |
| `.seed-landing` | Seed just landed | Blue ring flash, 0.6 s animation |
| `.just-captured` | Hole being captured | Gold ring pulse, 1.9 s animation |
| `.last-moved` | Source of last move | Blue outline |

---

## Layout

Three-column flex layout, `max-width: 1480px`:
```
Guide sidebar (240px) | Game area (flex:1) | Reasoning panel (255px)
```

Board itself: 6 holes × 82px + gaps + padding + two 72px stores ≈ 734px wide.

---

## Gotchas

- `hardMove` must return `{move, slip, scores}` — if you flatten it to just a number, `explainAIMove` breaks (no scores → falls back to shallow eval but loses minimax context).
- The forbidden set for P2 is tracked in `game.p2Forbidden` but the `.forbidden` CSS class is only applied to P1 holes (the human can't click P2 holes anyway).
- `_wouldCapture(h, player)` simulates without mutating — safe to call repeatedly for explanation/AI analysis.
- Hole indices in `sowPath` and `captured_holes` are always 0–11 (absolute), never visual positions.
