# Chess Games — Shared Architecture & Conventions

This file documents the patterns, APIs, UI conventions, and technical decisions common across all chess trainer apps in this directory. Read this before working on any game.

---

## The Four Games

| Game | Folder | Purpose | Moves | Badges |
|------|--------|---------|-------|--------|
| Vind die Flater | `Vind_die_Flater/` | Spot White's deliberate blunder (Afrikaans) | 16 | 22 |
| Spanish Opening | `Spanish_Opening/` | Learn Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5) | 20 | 33 |
| Bird Opening | `Bird_Opening/` | Learn Bird Opening (1.f4) | 10 | 16 |
| Endgame Trainer | `Endgame_Trainer/` | Deliver checkmate in N moves (60 puzzles) | Variable | 60 |

**Audience**: Young players (~8–12 years), mostly in Afrikaans.

---

## Stack & Dependencies

All games use the same vanilla JS stack — **no build step** required (Endgame Trainer uses Vite but still ships plain HTML):

```html
<!-- Chess logic -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
<!-- Board UI -->
<script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css">
<!-- jQuery (required by chessboard.js) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<!-- Stockfish (loaded as Blob worker — see below) -->
<!-- https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js -->
```

**Must be served via HTTP** (not `file://`) — CORS blocks Lichess cloud-eval and the Stockfish Blob worker.

Local dev: `python3 -m http.server 8000 --directory <game-folder>/`

---

## Eval Pipeline (multi-source fallback)

Every game uses the same evaluation waterfall. Implement in this order:

```
sfAnalyse(fen, depth, multipv)
  └─ 1. Lichess Cloud Eval      4s timeout   https://lichess.org/api/cloud-eval?fen=...&multiPv=N
  └─ 2. Stockfish.online API    6s timeout   https://stockfish.online/api/s/v2.php?fen=...&depth=...  (max depth 15)
  └─ 3. Local Stockfish.js      8s timeout   Blob worker from CDN, callback queue pattern
```

### Stockfish Blob Worker Pattern

```js
function initLocalStockfish() {
  fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
    .then(r => r.text())
    .then(code => {
      const blob = new Blob([code], { type: 'application/javascript' });
      stockfishWorker = new Worker(URL.createObjectURL(blob));
      stockfishWorker.onmessage = handleStockfishMessage;
      stockfishWorker.postMessage('uci');
    });
}
```

Use a **job ID + callback queue** to discard stale responses. Never trust a response without checking if the jobId still matches.

### Eval Sign Convention

- `cp` values are always **from White's absolute perspective** (positive = White winning).
- When displaying: green if White winning, red if Black winning.
- Capture `game.turn()` **synchronously before** any async eval call — never read it inside `.then()`.
- For mate: check `r.mate > 0` vs `r.mate < 0` explicitly; don't ignore sign.

---

## Lichess APIs

### Cloud Eval
```
GET https://lichess.org/api/cloud-eval?fen={FEN}&multiPv={N}
Authorization: Bearer LICHESS_TOKEN_REDACTED
```
Returns `{ pvs: [{moves, cp, mate}] }`. Use this first — fastest and most accurate for known positions.

### Opening Explorer
```
GET https://explorer.lichess.ovh/lichess?fen={FEN}&speeds=blitz,rapid,classical&ratings=1600,1800,2000
Authorization: Bearer LICHESS_TOKEN_REDACTED
```
Returns `{ moves: [{san, white, draws, black, averageRating}] }`. Sort by total games (`white+draws+black`) to get popularity rank.

**The auth header is required on both endpoints.** Without it, explorer returns 401.

Token: `LICHESS_TOKEN_REDACTED` (Lichess user J_P_B, no scopes needed)

### API Cache Pattern
All games cache Lichess responses to avoid hammering the API:
```js
const apiCache = new Map(); // key: FEN string, value: { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 50;
// Evict oldest entry when cache is full
```

---

## UI Layout

### Standard Three-Column Layout (Vind_die_Flater, Spanish_Opening, Bird_Opening)

```
┌──────────────┬──────────────────────┬──────────────┐
│  Badge Panel │    Board + Stats     │ Analysis /   │
│   (320px)    │   (flexible, 480px   │  Review      │
│  2-col grid  │    max board)        │  (280px)     │
└──────────────┴──────────────────────┴──────────────┘
```

Endgame Trainer uses a **multi-screen** approach (home / game / result / replay / badge-unlock) with screen transitions.

### Board Sizing
```css
#board { max-width: 480px; width: min(480px, calc(100vw - 60px)); margin: 0 auto; }
```

### Responsive Breakpoints
- `1200px`: side panels wrap below, stack vertically
- `600px`: full mobile stack, board takes full width

---

## Color Palette & Dark Theme

All games share a dark glassmorphism aesthetic.

### Background
```css
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
```

### Glass Panels
```css
background: rgba(255, 255, 255, 0.08); /* or 0.10–0.15 for lighter */
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.15);
border-radius: 12px;
```

### Accent Colors (use these, don't invent new ones)
| Role | Hex |
|------|-----|
| Primary orange (headers, highlights) | `#f39c12` |
| Success / win | `#2ecc71` |
| Danger / loss / blunder | `#e74c3c` |
| Warning / equal position | `#f39c12` (same orange) |
| Text primary | `#e8e8e8` |
| Text muted | `#aaa` |
| Bronze tier | `#cd7f32` |
| Silver tier | `#a8a8a8` |
| Gold tier | `#ffd700` |

Spanish Opening also uses its own themed palette (`--spanish-red: #c60b1e`, `--spanish-yellow: #ffc400`) alongside the shared palette.

### Typography
```css
font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
font-size: 18px; /* slightly larger for young readers */
/* Evals and move notation */
font-family: 'Consolas', 'Monaco', monospace;
```

---

## Badge System

All games implement the same badge mechanic:

- **Locked**: `opacity: 0.4; filter: grayscale(100%); cursor: not-allowed;`
- **Unlocked**: `border: 2px solid #2ecc71; box-shadow: 0 0 8px rgba(46,204,113,0.4);`
- **Unlock animation**: `@keyframes badgeUnlock { 0% { transform: scale(1) } 50% { transform: scale(1.1) } 100% { transform: scale(1) } }`
- **Grid**: 2-column CSS grid in sidebar, 4-column on badge home screen (Endgame Trainer)
- **Tooltips**: Hover over badge → show name + description in a positioned tooltip

Badge persistence uses `localStorage` with per-player keys:
```js
// Key pattern: {gamePrefix}_{playerName}_{dataType}
// e.g. vindFlater2_Jacob_badges
```

Players dropdown: `J, L, KC, CA, MB, T` (same across all games).

---

## Move Input: Two-Click Tap-to-Move

All games use tap-to-move (not drag-and-drop) as the primary input, for touch device compatibility:

1. **Click piece** → highlight selected square (orange), highlight legal moves (green dots)
2. **Click destination** → validate with chess.js, execute if legal
3. **Click elsewhere** → deselect

```js
// Extract square from chessboard.js CSS class
function getSquareFromElement(el) {
  const classes = el.className.split(' ');
  const sq = classes.find(c => /^square-[a-h][1-8]$/.test(c));
  return sq ? sq.replace('square-', '') : null;
}
```

Highlight classes:
- Selected piece: `highlight-selected` — **yellow inset ring** (`box-shadow: inset 0 0 0 4px #f1c40f`)
- Legal move target: `highlight-legal-move` — **grey dot** (25% `::after` pseudo-element, `rgba(0,0,0,0.4)`, `border-radius: 50%`). The square must also be `position: relative !important` for the pseudo-element to render.
- Hint / engine best move: `highlight-hint` — blue inset ring (`inset 0 0 0 4px #3498db`)
- Engine best move: `highlight-engine` — red inset ring (`inset 0 0 0 4px #e74c3c`)
- Popularity best move: `highlight-popularity` — blue inset ring (`inset 0 0 0 4px #3498db`)
- Both agree: `highlight-both` — green inset ring (`inset 0 0 0 4px #2ecc71`)

**Standard CSS block (copy into every game's stylesheet):**
```css
.highlight-selected {
  box-shadow: inset 0 0 0 4px #f1c40f !important;
}
.highlight-legal-move {
  position: relative !important;
}
.highlight-legal-move::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 25%; height: 25%;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  pointer-events: none;
}
.highlight-hint      { box-shadow: inset 0 0 0 4px #3498db !important; }
.highlight-engine    { box-shadow: inset 0 0 0 4px #e74c3c !important; }
.highlight-popularity{ box-shadow: inset 0 0 0 4px #3498db !important; }
.highlight-both      { box-shadow: inset 0 0 0 4px #2ecc71 !important; }
```

---

## Scoring Conventions

| Game | Scoring |
|------|---------|
| Vind_die_Flater | Binary — did player call the blunder? |
| Spanish_Opening | 5pts (#1 Lichess move), 4pts (top 2), 3pts (engine best), 2pts (ok), 1pt (weak), 0pts (blunder) |
| Bird_Opening | Points based on Black's popularity rank in opening explorer |
| Endgame_Trainer | Binary — checkmate within N moves (Bronze/Silver/Gold move limits) |

Score display: color the value green (good), orange (ok), red (bad) based on thresholds.

---

## Player Persistence (localStorage)

```js
function loadPlayerData(player) {
  const key = `${GAME_PREFIX}_${player}`;
  return JSON.parse(localStorage.getItem(key) || '{}');
}
function savePlayerData(player, data) {
  localStorage.setItem(`${GAME_PREFIX}_${player}`, JSON.stringify(data));
}
```

Always persist: badges earned, high scores, total games played.

---

## Animations Reference

```css
@keyframes badgeUnlock {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
@keyframes scorePopIn {
  0%   { transform: scale(0.5); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
```

---

## Common Pitfalls (bugs already fixed — don't reintroduce)

1. **Eval race condition**: Never call `game.turn()` inside a `.then()` callback. Capture turn synchronously before the async call.
2. **Mate sign ignored**: Always check `r.mate > 0` vs `< 0`. Don't just use `Math.abs`.
3. **Lichess Explorer 401**: The auth header is required — `Authorization: Bearer LICHESS_TOKEN_REDACTED`.
4. **Stale Stockfish responses**: Use job IDs. Discard any response whose job ID doesn't match the current pending request.
5. **CORS with Stockfish Blob worker**: Must serve via HTTP, not `file://`.
6. **Afrikaans `'n` in JS string literals**: The Afrikaans indefinite article `'n` (meaning "a/an") contains a single quote. Any JS string containing `'n` must use double quotes: `"gebruik 'n ruiter"` — never single quotes, or it will cause a syntax error.

---

## File Structure Convention

Each game folder contains:
```
index.html      # Single HTML file with embedded <style> and <script>
app.js          # OR inline in index.html — all game logic
styles.css      # OR inline — all styles
netlify.toml    # Deployment config (if deployed to Netlify)
CLAUDE.md       # Game-specific notes (overrides/extends this file)
```

Prefer **single-file** (`index.html` with embedded styles and scripts) for simplicity unless the JS exceeds ~1000 lines.
