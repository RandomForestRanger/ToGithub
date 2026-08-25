# Leer die Philidor & Ou-Indiër Speel — Project Spec

> **Visual theme superseded (see §12):** the app originally shipped with the Minecraft-inspired
> theme described in §2 below. As of the 2026-08-20 build it has been fully re-skinned to a
> "Sunset T20" cricket-stadium theme under an invented franchise identity, **D6 Dynamos** — no
> real IPL team names, logos, or wordmarks. §2 is kept as historical record of the original
> design; §12 documents what actually ships today. All gameplay/scoring logic, badge conditions,
> and opening theory content are unchanged by the reskin.

A web trainer that teaches a young chess player (Black) to meet **1.e4 with the
Philidor Defence** and **1.d4/1.c4/1.Nf3 with the Old Indian Defence** — using a single unifying
idea: **1...d6 opens both doors.**

This is a **30-move game** (not just an opening drill) — the first 6 moves are the guided theory
phase (Lichess-popularity pool, hints available), and moves 7–30 hand White over to pure Stockfish
so the session runs on into real middlegame play. Scope is deliberately "opening into early
middlegame," not just "first ten moves."

This spec mirrors the architecture, scoring engine, and API stack of the existing Bird Opening
trainer (`Leer die Bird Speel`), with colours swapped (the computer plays White, the student plays
Black) and the theming rebuilt around Minecraft.

---

## 1. Historical Background (for in-app "wisdom" flavour text, README, or an optional "Oor die
Opening" info panel)

**Philidor Defence (1.e4 e5 2.Nf3 d6)** — Named for François-André Danican Philidor
(1726–1795), a Frenchman who was simultaneously Europe's strongest chess player and a celebrated
opera composer. His 1749 book *Analyse du jeu des Échecs* was the first serious treatise on pawn
play and positional strategy — his most famous line, loosely paraphrased, is that pawns are the
soul of chess. Philidor himself favoured the sharp ...f5 push in this defence; modern theory
prefers the calmer **Hanham setup** (...Nd7, ...Ngf6, ...Be7, ...0-0), named after American
master James Moore Hanham. The opening also appears in the famous 1858 "Opera Game," where Paul
Morphy demolished the Duke of Brunswick and Count Isouard at the Paris Opera after they chose the
adventurous ...Bg4 continuation instead.

**Old Indian Defence (1.d4 Nf6 2.c4 d6)** — Part of the broader "Indian" family of openings, a
name that traces back to Moheschunder Bannerjee, a Brahmin player from Calcutta who played
fianchetto- and ...d6-based setups against the Scottish master John Cochrane in the 1850s —
decades before European "hypermodern" players got credit for similar ideas. Savielly Tartakower
proposed the "Indian" name in the 1920s specifically to honour Bannerjee. The Old Indian itself
was later developed by Mikhail Chigorin and differs from its flashier cousin, the King's Indian,
mainly in that Black develops the bishop to e7 rather than fianchettoing it to g7.

**The pedagogical hook:** in both openings, Black's very first useful move is the same pawn push —
**...d6**. It's flexible, doesn't commit to a structure too early, and quietly prepares ...e5 (or
...Nf6/...g6) depending on what White does. One block, many builds.

---

## 2. Visual Theme — "Minecraft-inspired," not Minecraft-branded

Build a **blocky, pixel-art aesthetic evocative of Minecraft** — grass/dirt/stone palette, chunky
pixel borders, a retro pixel font — using **original CSS and free-licensed assets only**. Do not
use Minecraft's actual textures, logo, or trademarked font; recreate the *feel* with:

- **Font:** Google Fonts `"Press Start 2P"` (free, pixel-style) for headers/labels; a clean
  sans-serif for body text/history so it stays readable.
- **Palette:**
  - Grass green `#5D9C43` / dark grass `#3F6E2E` — primary accents, headers
  - Dirt brown `#8B5A2B` / dark brown `#5C3A1E` — panel backgrounds, borders
  - Stone grey `#7D7D7D` / cobblestone grey `#5A5A5A` — buttons, board frame
  - Diamond blue `#5DCFE0` — highlights, "engine best move"
  - Gold `#FFD700` — score, high score, achievement flashes
  - Redstone red `#C13B2A` — errors/warnings
  - Obsidian `#1A1A1E` / near-black — dark background base
- **Borders:** 3–4px **stepped/pixelated borders** (no border-radius; use `box-shadow` layering or
  `clip-path` steps to fake a blocky outline) on all panels, buttons, and the board frame.
- **Buttons:** stone-textured gradient (`linear-gradient` grey tones), chunky pixel border,
  slight "press down" effect (`translateY(2px)` + shadow shrink) on `:active`.
- **Badge/achievement popups:** styled like a game "achievement toast" — dark translucent banner,
  diagonal accent stripe, pixel icon + gold text, sliding in from a corner. (This is a *style*
  homage, not a copy of any specific game's exact asset.)
- **Board:** keep `chessboard.js` standard piece set (Wikipedia theme, same as Bird game) for
  clarity — wrap it in a chunky cobblestone-style frame rather than reskinning the pieces
  themselves, so the chess remains legible for a learner.

---

## 3. Tech Stack (identical to Bird Opening trainer)

- `chess.js` 0.10.3 — move validation, FEN/PGN state
- `chessboard.js` 1.0.0 (`@chrisoakman` build) — board rendering, drag-free (tap-to-move, per Bird
  game's touch-friendly pattern)
- `jQuery` 3.7.1 — DOM/board glue
- **Stockfish.js** 10.0.2, loaded via `fetch` → `Blob` → `Worker` (avoids CORS issues), UCI
  protocol, `MultiPV` queries for top-2/top-5 lines
- **Lichess Cloud Eval API** (`lichess.org/api/cloud-eval`) — primary eval source, fast/cached
- **Lichess Opening Explorer** (`explorer.lichess.ovh/lichess`) — popularity data,
  `ratings=1600,1800,2000,2200,2500&speeds=rapid,classical`, same as Bird game
- Plain HTML/CSS/JS, no build step, `localStorage` for persistence — same as Bird game

---

## 4. Game Flow — White and Black roles are swapped from the Bird game

**The computer plays White. The student plays Black.** 30 rounds (Black moves 1–30) — longer than
Bird's 10-move arc by design, since this version is meant to carry the lesson from opening theory
into real middlegame decision-making.

### Move 1 (forced, mirrors Bird's forced `1.f4`)
- White's first move is drawn from a weighted pool: `e4` (45%), `d4` (40%), `c4` (10%), `Nf3` (5%).
- **Black's first move is always forced to `d6`**, regardless of what White played. If the
  student tries anything else, undo and show: *"Speel d6 — dit werk teen amper alles!"*
  ("Play d6 — it works against almost everything!")
- Store which "branch" the game is in based on White's move 1 (and re-check on move 2/3 in case
  of transposition — e.g. 1.Nf3 d6 2.e4 still becomes a Philidor branch):
  - `e4` present in history → **Philidor branch**
  - `d4`/`c4` present without `e4` → **Old Indian branch**

### Moves 2–30
- White's replies come from the same **Lichess popularity pool → Stockfish handoff** pattern as
  Bird's Black-move engine: a shrinking `WHITE_POOL_SIZES` array covering the opening-theory phase
  only — `[20, 16, 8, 4, 2, 2]` for moves 1–6 — then **pure Stockfish for White from move 7
  onward** (moves 7–30, i.e. 24 moves of genuine engine middlegame play). This is a bigger jump
  than Bird's version, where the engine-only phase was just moves 7–10; here it's the bulk of the
  game, which is the point — theory gets the student into a healthy position, then he has to
  actually play chess against a strong opponent for 24 more moves.
- Black's moves (the student's) are scored via the **identical unified scoring function** from the
  Bird game (see §5) — just run for Black-to-move positions instead of White-to-move ones.
- Keep Bird's UX rhythm: play move → 2s pause showing engine/popularity comparison → highlight →
  computer replies → eval updates → badge checks.
- **Hints stay restricted to moves 3–6** (the guided theory window), same as Bird — moves 1–2 are
  forced/too obvious, and moves 7–30 are deliberately hint-free so the student is practising real
  decision-making, not looking up answers for two-thirds of a 30-move game.

### Suggested flavour-boost overrides (optional, mirrors Bird's From's Gambit/Polar Bear boosts)
- After `1.e4 d6`, boost White's `2.d4` to ~60% (so most games reach real main-line Philidor
  territory quickly).
- After `1.d4 d6`, boost White's `2.c4` to ~55% (steers toward genuine Old Indian rather than
  stalling).

---

## 5. Scoring System — identical formula to Bird game, roles reversed

Reuse `scoreMove(fen, move)` exactly as built for Bird, with one **critical sign-convention
check**: Stockfish/Lichess cloud-eval `cp` values are relative to the **side to move**. In the
Bird game (White to move, scoring White) this was used directly. Here, when scoring **Black's**
move, make sure eval comparisons and the "Dominant" badge threshold are read as
**Black-favourable when negative from White's frame**, or simply keep evals relative to side-to-
move consistently — audit this carefully when porting, it's the one place transposing colours can
silently break scoring.

- 5 pts: move is top-2 by Lichess popularity **or** top-2 by Stockfish
- 4 pts: 3rd–4th in either
- 3 pts: 5th in either
- 2 pts: 6th in either
- 1 pt: anything else
- `< 20` games in the Lichess pool → fall back to pure Stockfish ranking/centipawn-loss scoring
  (same fallback logic as Bird)

`TARGET_SCORE = 150`, `MAX_MOVES = 30` (scaled up from Bird's 50/10 — same 5-points-per-move
ceiling, just over three times the moves).

---

## 6. UI Layout (Afrikaans strings) — mirrors Bird's structure

### Header
```
⛏️🟩 Leer die Philidor & Ou-Indiër Speel 🟩⛏️
Bemeester d6-verdedigings teen 1.e4 en 1.d4 — 30 skuiwe van teorie tot middelspel
```

### Stats panel (same fields as Bird, same order)
- **Speler** — player `<select>` dropdown: Debora, Jack, Jacobus, Sammy, Thomas, Martin, Coach
  Corno, Birdman (unchanged list)
- **Skuif** — `1/30` move counter
- **Punte** — `0/150` score
- **Hoogste Punt** — high score (per player, `localStorage`)
- **Evaluasie** — engine eval, remember the Black-perspective sign convention from §5
- Progress bar underneath

### Left panel: **Prestasies** (Achievements — Minecraft-flavoured rename of "Kentekens")
Hover tooltip area that shows either a random "wisdom" quote or, on badge hover, that badge's
unlock condition — identical interaction pattern to Bird's badge panel.

### Centre column
- Board (cobblestone-framed, per §2)
- Message box (status text — "Wit dink...", errors, hints)
- Info row: **"Wit reageer uit:"** (mirrors Bird's "Swart reageer uit:") showing pool size /
  "Beste enjin skuif" from round 7, plus **Puntelling: Gekombineerd**
- Move-score flash (`+5`/`+4`/etc., same colour-coded scale as Bird)
- Move history list
- Controls: **Nuwe Spel**, **Wys Beste Skuif** (hint button, same move-3–6-only restriction as
  Bird)

### Right panel (live game): **Skuif Analise**
- 🖥️ Rekenaar Beste (Stockfish top-2, with eval)
- 📊 Lichess Gewildste (top-2 popularity, with game counts/win rate)
- 🎯 Jou Skuif (comparison verdict, same four-tier messaging as Bird: top-2-both / engine-only /
  popular-only / weak)

### Right panel (after game): **Hersien Jou Spel**
Same back/forward review stepper, same best-moves-per-position lookup via Lichess Explorer.

### Achievement/badge notification
Slide-in toast (see §2 styling), icon + `"{Naam} Ontsluit!"`.

### Game-over modal
Score, rating message (reuse Bird's percentage-tier Afrikaans messages, reworded slightly if
desired), new-high-score flag, badges-earned strip, **Hersien Spel** / **Speel Weer** buttons.

---

## 7. Achievements ("Prestasies") — Minecraft icons, real opening theory underneath

| id | icon | naam | voorwaarde |
|---|---|---|---|
| `d6-boumeester` | ⛏️ | d6-Boumeester | Perfekte 150/150 punte in een spel |
| `philidor-verdediger` | 🛡️ | Philidor Verdediger | Voltooi 'n spel in die Philidor-tak (Wit het e4 gespeel) |
| `ou-indier-boumeester` | 🧱 | Ou-Indiër Boumeester | Voltooi 'n spel in die Ou-Indiër-tak (Wit het d4/c4 gespeel) |
| `hanham-vesting` | 🏰 | Hanham Vesting | Bereik die Hanham-opstelling: ...Nd7, ...Ngf6, ...Be7, ...0-0 |
| `antoshin-blok` | 🟫 | Antoshin Blok | Speel ...exd4 en bereik ...Be7 + ...0-0 daarna |
| `philidors-eie-keuse` | ⚔️ | Philidor se Eie Keuse | Speel die gewaagde ...f5-stoot (Philidor se eie aanbeveling) |
| `opera-spook` | 🎭 | Opera-spook | Speel ...Bg4 in die Philidor-tak — die Hertog van Brunswick se lyn teen Morphy |
| `chigorin-hoofline` | ♞ | Chigorin Hoofline | Bereik die Ou-Indiër hoofline: ...Nbd7, ...e5, met Wit se pion op e4 |
| `janowski-blok` | 💎 | Janowski Blok | Speel ...Bf5 in die Ou-Indiër-tak voor die pion e6/e5 die loper toemaak |
| `tsjeggiese-fondament` | 🧱 | Tsjeggiese Fondament | Speel ...c6 in die Ou-Indiër-tak |
| `tartakower-indier` | 📖 | Tartakower-Indiër | Speel ...Bg4 in die Ou-Indiër-tak |
| `koning-indier-oorgang` | 👑 | Koning-Indiër Oorgang | Fianchetto met ...g6 + ...Bg7 i.p.v. ...Be7 |
| `koningin-jagter` | ♛ | Koningin Jagter | Vang Wit se koningin |
| `teoretikus` | 📚 | Teoretikus | 15+ perfekte skuiwe (5 punte elk) in een spel |
| `grootmeester` | 🏆 | Grootmeester | 21+ perfekte skuiwe in een spel |
| `oorheersend` | 🔥 | Oorheersend | Eindig die spel met 'n evaluasie van -2.0 of beter (in Swart se guns) |

Badge-detection pattern: reuse Bird's two approaches — (a) exact `history()` sequence matching for
opening-order badges (`philidors-eie-keuse`, `opera-spook`, `janowski-blok`, `tsjeggiese-
fondament`, `tartakower-indier`), and (b) live `game.board()` piece-position checks for structural
badges (`hanham-vesting`, `chigorin-hoofline`, `koning-indier-oorgang`, `antoshin-blok`) — same as
Bird's `checkPolarBearSetup()`/`checkLeningradSetup()` pattern.

---

## 8. Wisdom Quotes (Afrikaans, random display in the achievements panel — original composition)

1. "...d6 is die sleutel wat amper elke deur oopsluit — teen e4 sowel as d4."
2. "Philidor het gesê pionne is die siel van skaak; d6 is waar daardie siel begin."
3. "Bou jou pionnestruktuur soos 'n fondament — blok vir blok, nie haastig nie."
4. "Die Hanham-opstelling is stadig maar staalvas: Nd7, Ngf6, Be7, dan rokade."
5. "In die Ou-Indiër ontwikkel jou loper na e7 — beskeie, maar betroubaar."
6. "Moheschunder Bannerjee het hierdie idees in Calcutta gespeel lank voor Europa dit 'hipermodern' genoem het."
7. "Tartakower het die naam 'Indiër' voorgestel uit respek vir daardie vroeë Indiese spelers."
8. "Chigorin het die Ou-Indiër ontwikkel as 'n soliede alternatief vir die Koning-Indiër."
9. "'n Fianchetto na g7 verander jou Ou-Indiër in 'n Koning-Indiër — weet watter pad jy kies."
10. "Philidor self was aggressief: hy het ...f5 aanbeveel, nie net verdedig nie."
11. "Morphy se opponente in die Opera-spel het ...Bg4 gespeel — en betaal daarvoor."
12. "Geduld bou vestings; haas bou net puinhope."
13. "'n Perd op d7 lyk passief, maar hou al die belangrike velde in die oog."
14. "Speel nooit ...e5 voor jou ontwikkeling reg is nie — bou eers, val dan aan."
15. "Die Tsjeggiese Variasie (...c6) is stil, maar dit laat geen skeure in jou fondament nie."
16. "Janowski het ...Bf5 gespeel om sy loper uit te kry voor die deur toeslaan."
17. "Elke groot vesting begin met een blok wat reg geplaas is."
18. "'n Koningin gevang is 'n groot prys — maar 'n goeie fondament wen die meeste speletjies."

---

## 9. Persistence (localStorage keys)

- High score: `philidorOldIndian_{player}_highScore`
- Badges: `philidorOldIndian_{player}_badges`
- Badge-version reset flag: `philidorOldIndian_badgeVersion` (bump to force a badge reset after
  design changes, same pattern as Bird's `birdOpening_badgeVersion`)

Player list (unchanged from Bird game): Debora, Jack, Jacobus, Sammy, Thomas, Martin, Coach Corno,
Birdman.

---

## 10. Open Assumptions to Confirm Before Build

- Forced `1...d6` for every game (rather than sometimes forcing `1...Nf6` first) — chosen for a
  clean, memorable pedagogical rule. Flag if you'd rather branch the forced first move by what
  White plays.
- Branch-completion badges (`philidor-verdediger`, `ou-indier-boumeester`) are new additions with
  no Bird equivalent — included so both halves of the lesson get celebrated even on games where no
  fancier variation badge triggers.
- Eval sign convention (§5) needs careful porting — worth a specific test pass once built, since
  it's the one part of "just reverse the colours" that can silently misscore.
- **30-move session length:** each Black move triggers a Lichess + Stockfish lookup (scoring), and
  each White move from round 7 on triggers a full Stockfish search — that's up to ~48 API/engine
  calls per game, plus the 2-second pause built into the UX rhythm after each move. A full game
  will likely run 15–25 minutes depending on engine depth/network latency. Worth deciding with
  Claude Code whether to keep `depth 10–12` (Bird's setting) throughout, or taper it down for
  moves deep in the middlegame to keep pacing reasonable for a young player's attention span.

---

## 11. Implementation Notes (changes from spec — recorded during build sessions)

### Visual theme — Minecraft pixel-art textures
Six 16×16 SVG pixel-art textures are embedded as CSS `data:image/svg+xml` URIs in `styles.css`
and applied as tiled `background-image` with a semi-transparent dark overlay for readability.
`image-rendering: pixelated` is set on all textured containers. Each panel uses a different block:
- **Background** — obsidian-dark gradient (no tile; CSS only)
- **Stats panel** — grass block top
- **Badge panel** — mossy cobblestone
- **Board frame** — cobblestone/stone bricks
- **Info panel** — stone bricks
- **Move history** — dirt
- **Controls** — oak planks
- **Achievement toast** — oak planks
- **Analysis / review panels** — quartz block

### Board squares
chessboard.js square classes are overridden with Minecraft colours:
- Light squares (`.white-1e1d7`): `#c8ccb2` — quartz off-white
- Dark squares (`.black-3c85d`): `#4a6b32` — mossy cobblestone green
Chess pieces (`#board img`) explicitly set `image-rendering: auto` to keep them smooth
(Wikipedia piece set — same as Bird Opening trainer).

### Badge list background
`.badge-list` has a flat `rgba(0,0,0,0.62)` background so individual badge slots remain
legible against the mossy cobblestone panel behind them.

### Engine-transition popup
An `#engine-popup` div (positioned fixed, centred) is shown once when `makeWhiteMove()` is
called with `currentMoveNumber === 7` — the first move White uses Stockfish instead of the
opening-popularity pool. Message: *"🤔 Nou moet ek begin dink!"* Auto-fades after 3.5 s.

### Stockfish depth for White's moves
`makeWhiteStockfishMove()` calls `fetchStockfishEval(fen, 5)` — depth 5 only. This keeps
White's engine moves fast and age-appropriate (depth 12 was unnecessary for a young-player
trainer and caused long waits in the 24-move middlegame stretch). Black's scoring evals still
use the default depth waterfall (Lichess Cloud Eval → stockfish.online → local worker).

### Hint / arrow availability
Hints (canvas arrows + "Wys Beste Skuif" button) are restricted to moves **3–6** only
(guided theory window). No hints on moves 1–2 (forced / obvious) or 7–30 (deliberate
practice — student must think for themselves for the whole middlegame).
`fetchBestMove()` skips its API calls outside moves 3–6 to save resources.

### Language fixes
- Stat label: **"Hoogste Punt"** (was "Hoogtepunt")
- Branch/variation label: **"Lyn:"** (was "Tak:")
- Badge name: **"Chigorin Hooflyn"** (was "Chigorin Hoofline")

### Target position tracker ("Doelwit" row)
A row below the message box shows five target-piece chips (♟ d6, ♞ f6, ♞ e5, ♝ e7, ♚ g8)
that turn green as Black achieves each element of the ideal Hanham/Old-Indian setup.
Detection uses `game.board()` array indexing (row 0 = rank 8, row 7 = rank 1; col 0 = file a).

### Canvas arrow system
`<canvas id="board-arrows">` is absolutely positioned over the board inside `.board-wrapper`.
`drawArrow(from, to, color)` uses Canvas 2D API with flipped-board coordinates
(`x = (7-file)*size + size/2`, `y = (rank-1)*size + size/2`).
Auto-hints (popularity + engine best move shown as coloured arrows) run only on
hint-eligible moves; the hint button draws a diamond-blue arrow for the top suggestion.

---

## 12. Cricket Redesign — "Sunset T20" (2026-08-20)

A complete visual/copy overhaul, agreed with the user via a design-canvas mockup review
before implementation. **Scope: full reskin including flavour text** (wisdom quotes,
achievement-toast copy, move-score flash labels, end-game rating messages) — badge IDs,
unlock conditions, scoring logic, `MAX_MOVES`/`TARGET_SCORE` (stayed 30/150 — see below),
and all historical/opening-theory content are untouched.

### Franchise identity
**D6 Dynamos** — an invented team name, not a real IPL franchise. Chosen over two runner-up
alternates ("Fianchetto Strikers", "Powerplay Titans") for its direct tie to the trainer's one
pedagogical rule: *"...d6 is die sleutel wat amper elke deur oopsluit."*

### Why the move count stayed at 30 (not 20 or 40)
Considered shortening to 20 for a literal "T20" echo. Rejected: the ball-count framing was
always stylized (a real T20 innings is 120 balls, not 30), so 20 wouldn't make the simulation
more accurate — it would only shrink the post-theory middlegame stretch (moves 7–30) from 24
moves down to 14, undoing the trainer's core differentiator from the Bird game (see intro).
40 was rejected too: no widely-recognised cricket format uses 40, so it buys no thematic
payoff while worsening the session-length/attention-span concern already flagged in §10.
Cricket flavour comes from **doodsbeurte** ("death overs") instead — see below.

### Doodsbeurte (death overs) — final-stretch phase pill
`updatePhaseInfo()` toggles a `.show` class on `#phase-pill` ("🔥 Doodsbeurte") whenever
`currentMoveNumber >= 26` and the game isn't over — the last 5 of 30 moves. Purely a mood
cue in the info row; White's move-selection logic (pure Stockfish from move 7 either way) is
unaffected. Called alongside `updateBranchInfo()`/`updateWhitePoolInfo()` in `makeWhiteMove()`,
and explicitly cleared in `newGame()`.

### Palette, typography, textures
- Fonts: **Rajdhani** (headers/labels/scoreboard, weights 500–800), **Mukta** (body/badge
  descriptions), **Share Tech Mono** (numeric stat values — LED-scoreboard feel). All three are
  Google Fonts; Rajdhani and Mukta are both Indian Type Foundry families, a deliberate nod to
  the Old Indian's own Calcutta origin (§1) rather than a generic sports-app font pick.
- Palette (CSS custom properties in `styles.css`): dusk-stadium navy/brown gradient background,
  `--accent` sunset orange `#FF7A18`, `--gold` trophy gold `#FFC94A`, `--teal` floodlight teal
  `#2EC4B6` (good moves/hints/links), `--red` ball red `#E63946` (errors/danger/doodsbeurte).
  Replaces the old beveled-pixel-border technique with glass panels
  (`background: rgba(28,42,74,0.62); backdrop-filter: blur(6px)`).
- The six Minecraft SVG data-URI textures are gone; no new tiled textures were added — the
  stadium-night feel comes from the body's `radial-gradient` background alone.

### Board
`.white-1e1d7`/`.black-3c85d` recoloured to pitch cream (`#EFE6CF`) / pitch green (`#285C34`).
`.board-container` is now a boundary-rope frame (`repeating-linear-gradient(135deg, cream 0 12px,
red 12px 24px)`); a new `.hoarding` row below the board (added to `index.html`, three `.ad-plate`
spans) shows invented placeholder sponsor plates — "d6 BANK", "FONDAMENT MOTORS", "OU-INDIËR
OLIE" — no real brands. Chess pieces stay the Wikipedia set, unchanged, per the original spec's
"don't reskin the pieces" rule (§2) — that rule carried forward into the cricket theme too.

### Hawk-Eye hint arrows
`drawArrow()` in `app.js` no longer draws a solid arrowhead — it draws a **dotted trajectory**
(`ctx.setLineDash(...)`) ending in a small filled circle ("ball") with a curved seam mark, at
the same colour-coded scheme as before (teal = popularity, ball-red = engine, gold = both
agree). Purely visual; the underlying `squareToXY()` coordinate math is untouched.

### Achievement toast → "Trofee Uitgereik!"
Restyled as a spotlight card (dark gradient + gold border), header text changed from
"⚒ Prestasie Behaal!" to "🏆 Trofee Uitgereik!". Badge **names and unlock conditions are
unchanged** — only six of sixteen badge icons were swapped (the clearly Minecraft-specific
ones: pickaxe, brick×2, brown square) for cricket-neutral or cricket-flavoured equivalents;
the other ten (shield, castle, swords, masks, knight, diamond, crane, book, crown, queen,
books, fire) were kept as-is since they read fine in either theme.

### Move-score flash → boundary-burst language
`updateDisplay()`'s score labels changed from generic praise ("Uitstekend!", "Redelik", …) to
cricket run-values: 5→**SES!**, 4→**VIER!**, 3→**Drie lopies!**, 2→**Twee lopies**,
1→**Enkelloop**. `.move-score` gained a radial-burst `::before` pseudo-element. Move-1's
hardcoded score of 5 (forced `d6`) still always shows "SES! (+5)".

### Stat labels renamed
Speler→**Kolwer**, Skuif→**Bal**, Punte→**Lopies**, Hoogste Punt→**Beste Telling**,
Evaluasie→**Momentum**. "Skuif" itself (the chess-move noun) was deliberately left alone
everywhere else — "Wit speel uit: Top X skuiwe", "Skuif Analise", review-mode's "Skuif 30"
label — since it's correct chess terminology, not a cricket-renameable concept; only the
per-move *counter* stat became "Bal".

### Buttons & modal
"Nuwe Spel"→"Nuwe Wedstryd", "Hersien Spel"→"Hersien Wedstryd" ("Wys Beste Skuif" and "Speel
Weer" kept, for functional clarity). Game-over modal: "Spel Voltooi!"→"Wedstryd Verby!",
score unit "punte"→"lopies", "NUWE HOOGTEPUNT!"→"NUWE BESTE TELLING!", "Prestasies
Verdien:"→"Trofeë Verdien:". `getEndMessage()`'s eight rating tiers were all rewritten with
cricket-innings metaphors (kept the same percentage thresholds).

### Wisdom quotes
All 18 entries in `WISDOM_QUOTES` were rewritten to layer a cricket metaphor onto the existing
chess-history fact rather than replace it — e.g. Philidor's pawn-play quote now closes on
*"d6 is die eerste bal van daardie innings"*; the Bannerjee/Calcutta quote now notes Calcutta's
own 200-year cricket history (Eden Gardens) as a genuine historical tie-in, not an invented one.

### Design process
Built via a design-canvas mockup (three artboards: full live-game screen, a "key moments" sheet
covering the boundary bursts/toast/Powerplay-popup/Hawk-Eye close-up, and the game-over modal)
reviewed and approved by the user before any implementation — see chat history for the
published artifact. Verified post-implementation with the same Playwright smoke-test pattern
used for the eval-sign bug fix: local `python3 -m http.server`, headless Chromium driving a
real game through moves 1–2, confirming scoring/analysis logic is byte-for-byte unchanged and
no new console errors were introduced by the reskin.

---

## 13. Bal-vir-Bal Commentary + Checkmate Detection (2026-08-20)

### No live LLM API — template bank instead
An LLM-generated commentary idea (Cricinfo-style, one call per move) was considered and
rejected in favour of a deterministic template bank: no API key to secure (this app family is
static/client-side, no server to hold a secret), no per-move latency added to an already
call-heavy pipeline, and no hallucination risk — an LLM freely judging move quality could
contradict `scoreMove()`'s actual verdict and teach the wrong lesson. `COMMENTARY_BANK` in
`app.js` (keyed 1–5, matching the existing score tiers) and `MATE_COMMENTARY` (checkmate, a
separate category) use the same random-pick-from-a-list pattern as `WISDOM_QUOTES` and the
SES!/VIER! labels — `fillTemplate()` does simple `{placeholder}` substitution from the move
chess.js just returned (`{san}`, `{piece}` via `PIECE_NAMES_AF`, `{square}`) plus
`{white}` (`lastWhiteMoveSan`, for lines that react to White's preceding move). Displayed in a
new `#commentary-line` element under the move-score flash — `showCommentary()`/
`showMateCommentary()`, called from `processBlackMove()` and the new checkmate/draw handlers.

### Checkmate detection — a real pre-existing gap
Before this, the game only ever ended via `currentMoveNumber >= MAX_MOVES` — a mid-game
checkmate (either side) was never detected. `checkGameTermination()` (checks
`game.in_checkmate()` then `game.game_over()` for stalemate/draw/insufficient-material/
threefold-repetition) is now called after every move — Black's, in `processBlackMove()` before
`showMoveAnalysis()` runs on what would otherwise be a terminal FEN, and White's, in
`makeWhiteMove()` before hints are shown for a Black move that will never happen.
`endGameByCheckmate(matedSide)` and `endGameByDraw()` set a new `gameEndReason` (`'moves'` |
`'checkmate-white-wins'` | `'checkmate-black-wins'` | `'draw'`), which `MODAL_TITLES` maps to
the modal heading — mind the naming: `'checkmate-white-wins'` means White delivered mate
(student lost), `'checkmate-black-wins'` means the student won. Caught and fixed a real bug
here during testing: the two `MODAL_TITLES` strings were initially swapped (student's win
showed a plain "Uitgeboul!", the loss showed "Swart Wen!") — found by tracing a real Fool's
Mate FEN through the code by hand rather than trusting the first pass.

### Fair rating on an early-ended game
`showEndGameModal()` used to always compute the end-of-game percentage against the fixed
`TARGET_SCORE` (150, i.e. a full 30-move game). That's unfair to a game that ends early via
checkmate — a student who played 5 perfect moves before delivering mate would have scored
5/150 (3%) and gotten "Moenie moed verloor nie" instead of a perfect rating. Fixed by computing
the percentage against `moveHistory.length * 5` (the points actually possible in the moves
played) instead — verified via a direct Fool's-mate injection test: 1 perfect move played,
5/5 = 100%, correctly shows "Perfekte beurt!". `modal-score` still always displays `X/150` for
context (the fixed full-game target), only the rating text's percentage changed.

### Six-celebration images — deferred
The user wants a celebratory image shown when a SES! (six) lands. First attempt (7
Gemini-generated images) was rejected: they reproduced the real IPL logo, real sponsor logos
(VIVO IPL, Dream11, TATA), real CSK team colours, and what reads as a specific recognizable
real cricketer's likeness — exactly what this project's own "inspired, not branded" rule (§2,
§12) exists to avoid, even for personal/local use. The user is re-processing their own images
(cropping, blurring the CSK/IPL marks) before handing them over.

---

## 14. Six-Celebration Photos — Wired In (2026-08-21)

### 16 user-supplied images, reviewed individually
The user re-processed their own AI-generated set (16 celebration photos in `six-celebrations/`,
plus `Logo.jpg`, `OUT.jpg`, `Victory.jpg` in the project root) and asked for a logo/likeness
review before use. Findings, file by file:
- **7 clean from the start**: `Celebrate_6`, `Celebrate2_6`, `Celebrate3_6`, `Celebrate6_6`,
  `Celebrate9_6`, `Celebrate14_6`, `Celebrate15_6` — generic non-identifiable crowds, either
  plain colours or our own "D6 Dynamos" branding.
- **6 fixed by blurring real sponsor/league logos**: `Celebrate5_6`, `Celebrate7_6`,
  `Celebrate8_6`, `Celebrate10_6`, `Celebrate11_6`, `Celebrate12_6` — VIVO, Dream11, TATA, CRED
  logos and text were still legible (some already had ad-hoc yellow dots over the biggest
  offender but missed the boundary-hoarding text and small chest badges entirely). Fixed with a
  Python/Pillow script (`blur_logos2.py`, scratch — not checked into the repo): pixelate down
  10x then Gaussian-blur back up, feathered mask edges so it reads as a soft-focus patch rather
  than a hard censor box. **Took several iterations** — first pass left text peeking out past
  box edges in three images, and one attempt at widening a "chest badge" box accidentally
  covered a player's *face* in two images (`Celebrate7_6`, `Celebrate11_6`) before being caught
  and corrected by zooming into the exact pixel region rather than trusting the thumbnail. Every
  fix was verified with a cropped/zoomed re-check, not just the full-image thumbnail — a small
  blur artifact in a thumbnail can look like leftover text when it isn't (false alarm caught on
  `Celebrate5_6`), so zoom in before concluding either way.
- **1 left untouched, low risk**: `Celebrate13_6` — no visible logo, just a yellow/blue kit
  colour that loosely evokes CSK. Nothing to blur.
- **3 excluded from the default pool — likeness, not trademark**: `celebrate4_6`,
  `Celebrate16__6` (already correctly branded "D6 Dynamos," no sponsor logos) and, discovered
  during this pass, `Celebrate10_6` too (logos fixed, but the batting stance/build still reads
  as a specific real cricketer). Blurring a face would defeat the point of a celebration photo,
  so this is a judgement call left to the user rather than something to silently paper over.
  Easy to add back into `CELEBRATION_IMAGES` in `app.js` once decided.
- `Logo.jpg` (fully original "D6 Dynamos Cricket Club" shield — no fixes needed), `OUT.jpg`
  (generic umpire, no branding), `Victory.jpg` (own "VICTORY D6 DYNAMOS!" jumbotron text; one
  low-stakes note — the boundary hoarding reads "Rajiv Gandhi Stadium," a real venue name, much
  lower-risk than a sponsor logo, treated as acceptable) are all clean. **Not yet wired into any
  feature** — no game trigger references them yet.

### The mechanism — per-game shuffled pool, no repeats until exhausted
`CELEBRATION_IMAGES` in `app.js` lists the 13 currently-approved filenames. `celebrationPool`
is a Fisher-Yates-shuffled copy, consumed via `.pop()` in `nextCelebrationImage()`; when it hits
zero it reshuffles a fresh copy automatically, so a long high-scoring game never runs dry —
verified directly (not by playing 13 real moves): a full draw of 13 pulls came back all-unique,
and the 14th pull correctly triggered a reshuffle. `refillCelebrationPool()` runs in `newGame()`
so every game starts with a fresh shuffle.

### Trigger, framing, sound
`showCelebrationPhoto()` is called from `processBlackMove()` only when `moveScore === 5`
("SES!"). Framed as a polaroid (`#celebration-photo` / `.polaroid` in `styles.css`) that
scales/rotates in centred over the board and auto-fades after 2.8s — same show/hide-by-class
pattern as the achievement toast. Paired with a full-screen `.camera-flash` pulse and a
synthesized camera-shutter click (`playShutterSound()` — a short decaying noise burst via the
Web Audio API, no external sound file: same "original assets only" approach as everything else
in this app, and it means there's no audio-licensing question to even ask). The shutter call is
wrapped in try/catch since some browsers block `AudioContext` without a prior user gesture — the
visual flash still plays either way, so a blocked sound never breaks the moment.

---

## 15. Blur Recalibration, C1–C4, Victory/OUT Wiring (2026-08-21)

### The first blur pass was too heavy-handed — user feedback, corrected
The six images fixed in §14 were blurred with generously-oversized boxes (large margins, full
chest/sleeve "bands" instead of tight boxes around just the badge) — safe, but visually
disruptive; the user pushed back directly: *"these ruin the pictures at the moment."* Redone
with tight boxes sized to the actual logo/text pixels (a few percent of margin, not generous
padding), and a lighter mosaic factor (8 instead of 10) so the patches read as small soft-focus
spots rather than large flat blocks. **Verify at normal display size, not just zoomed crops** —
a mosaic pattern of high-contrast pixels (e.g. white text on a red sponsor board) can look like
it's "still showing letters" under a 2–3x zoom purely from the block-averaging pattern, even
when the actual word is destroyed and unreadable at real size. Confirmed this with a direct
pixel-diff between the original and the output (every sampled pixel across the "suspicious" band
had changed) before trusting the visual read. Lesson: tight boxes first, verify at real size,
zoom in only to locate a gap — don't let a zoomed-in artifact talk you into re-inflating the box.

### C1–C4 reviewed and added to the pool
Four more user-supplied images (`six-celebrations/C1.jpg`–`C4.jpg`). `C1` and `C3` were clean
(correct "D6 Dynamos" branding or fully generic). `C2` had a real **Kingfisher** logo/wordmark
on the boundary hoarding; `C4` had a real **TATA** logo — both fixed with the same tight-box
approach, applied precisely from the start this time rather than needing a correction round.
All four added to `CELEBRATION_IMAGES` in `app.js` — the pool is now 17 images.

### Victory.jpg / OUT.jpg wired into the game-over modal
`showEndGameModal()` now sets a `#modal-outcome-photo` `<img>` based on `gameEndReason` (and
`score === TARGET_SCORE` for a perfect-game win even without a checkmate finish):
`checkmate-black-wins` (or a perfect score) → `Victory.jpg`; `checkmate-white-wins` →
`OUT.jpg`; every other ending (running out of moves without either, or a draw) shows no photo.
Verified on fresh page loads for both outcomes via direct FEN injection (Fool's Mate for the
win path, Scholar's Mate for the loss path) — an earlier combined single-session test showed
the loss path incorrectly returning `Victory.jpg`, which turned out to be a **test race
condition** (reusing page state across a `#modal-new-game` click without waiting for `newGame()`'s
async chain to fully settle), not a real bug — confirmed by re-running the same check on a clean
page load, where it passed correctly. Worth remembering: when a same-session before/after test
gives a surprising result, try it isolated on a fresh page before concluding the app is wrong.

---

## 16. Real Scoring Bug, Blur Recalibration Round 2, Polaroid/Board/Glide Fixes (2026-08-21)

### `findIndex()` returning -1, and -1 <= 1 being true — a real, significant scoring bug
The user reported "SES! appears to be awarded at every move of black." Root cause: both
`scoreMove()`'s combined-ranking branch and `scoreByStockfishOnly()`'s engine-only branch did
`const ei = engineTopMoves.findIndex(...); if (ei <= 1) return 5;` — but `findIndex()` returns
`-1` when nothing matches, and **`-1 <= 1` is `true` in JavaScript**. Every move the engine
*didn't* rank at all was silently scored as if it were a top-2 move. This had been live and
undetected through every previous testing pass because local dev always routes through
`scoreByStockfishOnly()` (no Lichess token → Explorer always 401s → `totalGames < 20` always),
and every move actually tested in prior smoke tests happened to be an engine-approved move (`d6`,
`Nf6`) — so `ei` was always a small non-negative number, never `-1`, and the bug never fired in
those specific tests. Fixed by explicitly checking `ei !== -1` (and `pi !== -1`) before the tier
comparisons in both functions, falling through to the centipawn-loss fallback (or tier 1) instead
of the false-positive shortcut. **Verified with a stubbed `fetchStockfishEval`**: called
`scoreByStockfishOnly()` directly with a move absent from `engineTopMoves` and a clearly-bad
fabricated evaluation — confirmed it now returns 1, not 5.

### Blur recalibration, round 2 — user feedback: too large, too noticeable
Round 1 (§14/§15) used tight rectangular boxes; still too visually heavy for a photo shown
briefly at a small, non-enlarged size — the user specifically called out the umpire-styled
`Celebrate11_6.jpg` and a couple of the cheerleader shots as "overwhelming." Recalibrated with
two techniques depending on what's being covered:
- **Single icon/short-wordmark logos** (TATA oval, Kingfisher bird, corner wordmarks, the small
  "eyes" logo pairs): genuinely tiny circles, sized just to the mark itself.
- **Wide multi-word sponsor bands** (Dream11/vivo/CRE strips): a soft rounded-rectangle mask
  (mosaic + Gaussian blur, rounded corners, feathered edge) — a true small circle can't cover a
  wide wordmark without leaving letters exposed at the edges, and a tapering ellipse mask
  under-covers content sitting near the box's top/bottom edge (found this the hard way on
  `Celebrate11_6.jpg`, which turned out to have **three stacked sponsor rows**, not one — traced
  precisely with `y`-column pixel-diff scans against the original rather than continuing to guess
  from cropped screenshots).
- Dropped the smaller chest/sleeve sponsor badges entirely on most images — small enough to
  already be borderline illegible, and removing them measurably reduces the "blur all over the
  person" feeling versus covering every last mark.
- Confirmed real coverage with pixel-diff scans (comparing original vs. output pixel-by-pixel
  along a column) rather than trusting a zoomed screenshot alone — repeatedly proved more
  reliable than the eye at small scale, in both directions: catching genuine gaps a normal-size
  view missed, and catching false "still looks off" alarms that were actually just JPEG/mosaic
  texture reading as letters under zoom.

### Polaroid frame — no cropping, fits varied dimensions
`.polaroid img` was `width:260px;height:260px;object-fit:cover` — forced every photo into a fixed
square, cropping anything not already square (most of the set: portraits, landscapes). Changed to
`max-width/max-height:240px` with `width/height:auto` and `object-fit:contain`, and `.polaroid`
itself to `display:inline-block` so the white polaroid border shrink-wraps to the image's actual
rendered size rather than a fixed box. Verified with a deliberately landscape (`Celebrate12_6.jpg`,
559×197) and deliberately portrait (`Celebrate5_6.jpg`, 205×624) image forced into the popup —
both now render fully uncropped at their own aspect ratio.

### Board boundary rope — team colours, with an occasional firework pink
`.board-container`'s diagonal stripe was cream/red (matching neither the actual "D6 Dynamos"
brand — blue and gold, per `Logo.jpg` and the celebration photos — nor anything cricket-specific).
Changed to a 7-stripe repeating cycle: blue/gold alternating, with one pink stripe per cycle for
the "still feels firework-y" accent the user asked to keep. New `--team-blue` (`#1E4FA0`) and
`--team-pink` (`#FF5FA8`) custom properties.

### White's move glide
`board.position(fen)` animates by default in chessboard.js, but with no explicit speed
configured it defaults fast enough (~200ms) to barely read as motion. Added explicit
`moveSpeed: 500, appearSpeed: 400, snapbackSpeed: 300, snapSpeed: 150` to the `Chessboard()` init
config so White's piece visibly glides to its new square instead of appearing to snap.

### Terminology
"wiket" → "paaltjie" throughout (wisdom quotes) per user correction.

---

## 17. Top Tier Scores 6, Not 5 (2026-08-21)

The user pointed out that awarding 5 points for a "SES!" (six) was counterintuitive — a real
cricket six is worth 6 runs. Changed the top tier from 5 to 6 across the whole app, which
happens to land on something more authentic than a coincidence: the scoring scale is now
**6, 4, 3, 2, 1** — skipping 5 entirely, exactly like real cricket, where a single ball scores
1, 2, 3, 4, or 6 (5 only happens on a rare overthrow).

Touched everywhere the tier value 6 (formerly 5) appears — this is the full list, useful if this
needs revisiting again:
- `scoreMove()` and `scoreByStockfishOnly()`: the top-tier `return 5` in each (three call sites:
  the ranked-comparison branch, the engine-only branch, and the centipawn-loss fallback) → `6`.
  The unrelated `pi === 5` / `ei === 5` checks (6th-place *rank index*, worth 2 points) were left
  alone — same digit, different meaning, easy to confuse if skimming.
- `TARGET_SCORE`: 150 → 180 (30 moves × 6).
- Move 1's forced-score hardcode and the `perfectMovesThisGame`/`showCelebrationPhoto()` gate
  checks: `=== 5` → `=== 6`.
- `COMMENTARY_BANK`'s key `5:` → `6:`, `updateDisplay()`'s label map key and text
  (`'SES! (+5)'` → `'SES! (+6)'`).
- CSS classes keyed on the tier value: `.move-score.score-5` → `.score-6`,
  `.score-badge.s5` → `.s6` (both className strings are built dynamically from the score value at
  runtime, so only the CSS selectors needed renaming, not any JS logic).
- Badge description text quoting old values: `d6-boumeester` ("150/150" → "180/180"),
  `teoretikus`/`grootmeester` ("5 lopies elk" → "6 lopies elk").
- `showEndGameModal()`'s fair-rating calculation (§16): `movesPlayed * 5` → `* 6`.
- `index.html`'s two hardcoded initial-state strings (`0/150` stat display, `Perfekte 150/150`
  badge description).

Verified live: fresh load shows `0/180`; the forced move-1 `d6` now shows `6/180`, `"SES! (+6)"`,
CSS class `score-6` (gold styling applied), and a `+6` history badge — all consistent.

---

## 18. Target Score to 165, Photo Gating, Sizing/Asset Polish (2026-08-21)

### TARGET_SCORE: 180 → 165, and a real off-by-semantics fix alongside it
User wanted a reachable target, not the flawless 30×6=180. Changed `TARGET_SCORE` to 165, and
along the way fixed the `d6-boumeester` badge (and the Victory.jpg modal-photo trigger) from
`score === TARGET_SCORE` to `score >= TARGET_SCORE` — with `===`, a player who plays perfectly
and scores *above* 165 would have missed the achievement entirely, which defeats the point of
lowering the bar. Badge description text rewritten since it no longer describes flawless play
("perfekte 180/180... optimaal" → "165 lopies of meer... 'n uitstekende beurt").

### Six-celebration photos held back until move 7
`showCelebrationPhoto()` now gated on `currentMoveNumber >= 7` in addition to `moveScore === 6` —
the photo pop-up is a middlegame flourish and shouldn't fire during the guided Powerplay theory
window (moves 1–6).

### Old-school camera sound
`playShutterSound()` now plays the user-supplied `camera_sound.mp3` (project root) via a plain
`Audio` object, falling back to the previous synthesized noise-burst click (renamed
`playSynthShutterSound()`) if the file fails to load or autoplay is blocked. Both paths are
non-essential flourishes wrapped in try/catch — the visual camera-flash always plays regardless
of whether either sound does.

### Background photo
`Background_image.jpg` (an aerial stadium-night shot, reviewed — no legible sponsor logos, just
atmosphere) is now the `body` background, with the existing dusk radial-gradient laid over it at
reduced opacity (rgba, not solid) so it tints toward the established palette and keeps foreground
text legible rather than replacing the gradient outright.

### Polaroid size
Bumped from `max-width/height: 240px` (170px mobile) to `280px` (200px mobile) — "slightly
bigger" per feedback.

### Badge panel — names no longer truncate
`.badge-name`/`.badge-desc` had `white-space: nowrap` + ellipsis truncation, cutting off longer
names ("Ou-Indiër Boumeester", "Koning-Indiër Oorgang," etc.). Switched both to wrapping text
(`.badge-info` already had the `min-width: 0` flex children need to wrap instead of overflowing)
and widened `.badge-panel` from 310px to 400px (~29% — within the "up to a third bigger" the user
offered) so two-line names still read comfortably.

### Subtitle wording
"...van Powerplay tot doodsbeurte" → "...vanaf die eerste powerplay tot in die doodsbeurte" per
user correction.

---

## 19. Randomised Sponsors, Logo Watermark, Lightbox Effect, Netlify Prep (2026-08-21)

### Randomised boundary-hoarding sponsors
`SPONSOR_POOL` in `app.js` — 7 invented sponsors (`d6 Bank`, `Fondament Motors`, and five new
ones: `Son Sonneblom Olie`, `Luilekker Kerries`, `Pensmens se Rys`, `Lawwehaas Kaasmakery`,
`Njam-njam Kitskos`). `pickBoardSponsors()` shuffles and picks 2, called from `newGame()` so
every game shows a different pair. The hoarding row's first plate is now a fixed "Geborg deur:"
label (`.ad-plate.ad-label` — a distinct dark/muted style so it doesn't get mistaken for a third
sponsor) instead of a third sponsor name; `#sponsor-1`/`#sponsor-2` hold the two random ones.

### Logo watermark — "surreptitious" placement
`Logo.jpg` now appears as a small (30px), low-opacity (0.4), circular corner bug in the
bottom-right of `.board-wrapper` (`.board-watermark`, `pointer-events: none` so it never
intercepts tap-to-move clicks) — a quiet broadcast-style bug rather than a prominent logo
placement, per the user's "surreptitiously" framing.

### Lightbox effect replaces the white camera-flash
The white full-screen flash was disorienting. `#camera-flash` (kept its id/class name — only its
CSS role changed) is now a dim backdrop (`rgba(8,10,16,0.62)`) that shows/hides in sync with the
photo itself (both toggle the same `.show` class together in `showCelebrationPhoto()`, instead of
the old one-shot `flashPulse` animation), turning the whole thing into a proper lightbox: the
background dims for as long as the photo is up, not just a brief pulse. The photo's pop-in/out
uses `transition: ... steps(3, end)` instead of smooth easing — a 3-step discrete transition
naturally passes through two intermediate sizes before settling (and the same two steps in
reverse on the way out), giving a deliberately choppy, old-slide-projector zoom to match the
shutter-click sound rather than a modern smooth animation.

### Reachable-target follow-through
(No new score changes this round — see §18. Confirmed the `>=` fix there still holds with the
new sponsor/photo changes layered on top; nothing here touches scoring.)

### Netlify deployment prep
Added `netlify.toml` (same pattern as the sibling chess trainers in this repo — `Caro-Kahn`,
`Spanish_Opening`: `publish = "."`, no build command since this is plain HTML/CSS/JS, security
headers, long-cache headers for `.js`/`.css`). Confirmed no hardcoded Lichess token anywhere in
the codebase — `fetchLichessData()`/`fetchStockfishEval()` both already gate on
`window.LICHESS_TOKEN`, which needs to be set via Netlify snippet injection (Site settings →
Build & deploy → Post processing → Snippet injection) after deploying, same as the other apps in
this portfolio — that's a dashboard step, not something committed to the repo.

---

## 20. Checkmate Bonus, Image Preloading, Engine Depth, Guided Window Widened to Move 1–7 (2026-08-24)

### Checkmate bonus — flat +30, not full marks
Delivering checkmate previously had no effect on `score` at all. Considered awarding full marks
(165) for a win, rejected: a fast forced mate against a weakened middlegame Stockfish (unlikely,
but possible) would trivialise the whole target — a handful of ordinary moves plus one mate would
read as a "perfect game" identical to 30 rounds of genuinely top-tier play. Went with a flat
`MATE_BONUS = 30` instead (added to `score` in `endGameByCheckmate()` only when `matedSide ===
'w'`, i.e. Black delivered mate) — a real win bonus on top of whatever move-quality score was
actually earned, rather than a substitute for it. `MATE_COMMENTARY.whiteMated` and the in-game
message now mention the bonus explicitly (`+{bonus} lopies`, filled via the existing
`fillTemplate()` helper). Interacts cleanly with the existing systems: `d6-boumeester` and the
`Victory.jpg` modal photo both already gate on `score >= TARGET_SCORE`, so a bonus-assisted 165+
correctly unlocks both; the §16 fair-rating calculation (`score / (movesPlayed * 6)`) also just
uses the post-bonus score, so a mate can legitimately push an early-ended game's rating to 100%+.

### Six-celebration images now preload
`preloadCelebrationImages()` creates an `Image()` object per filename in `CELEBRATION_IMAGES`
(kept alive in `preloadedCelebrationImgs` so they aren't garbage-collected before use) and is
called once on page load and again at the start of every match (`newGame()`). Warms the browser's
image cache during idle time — several rounds of "Wit dink..." pass before a six can even land
(the photo is still gated to `currentMoveNumber >= 7`, per §18) — so the polaroid pops in fully
rendered instead of painting in half-loaded over the network.

### White's Stockfish depth: 5 → 6
`makeWhiteStockfishMove()`'s `fetchStockfishEval(fen, 5)` → `fetchStockfishEval(fen, 6)`. Depth 5
(set in §11) had become a bit too forgiving for the middlegame stretch; one ply deeper without
reintroducing the original depth-12 pacing problem it was chosen to avoid.

### Guided window widened: moves 3–6 → moves 1–7
`hintsActiveNow()` changed from `currentMoveNumber >= 3 && currentMoveNumber <= 6` to
`currentMoveNumber <= 7` — hint arrows and the "Wys Beste Skuif" button are now available from
Black's very first move through the end of the opening-theory window (move 7 lines up with
White's first pure-Stockfish move, so the student gets one more guided reply right as the
Powerplay ends). Move 1 is special-cased in both `fetchBestMove()` and `showAutoHints()`: since
Black's first move is unconditionally forced to `d6` regardless of what the popularity/engine data
says (see `processBlackMove()`), querying either there could suggest a *different* move and
contradict the forced rule — both functions now short-circuit straight to a hardcoded `d6`
suggestion/arrow for move 1 instead.

### Proactive coaching — new, separate from the existing reactive commentary
`COMMENTARY_BANK` (§13) only ever reacts to a move Black already played. Added `COACHING_BANK`, a
parallel template bank shown *before* Black replies — right after White's move, in the same spot
in `makeWhiteMove()` where `showAutoHints()`/`fetchBestMove()` already run — walking the student
through the Hanham/Old-Indian plan move by move for the guided window (1–7): d6 (forced) → Nf6 →
Nbd7 → e5 → Be7 → O-O → consolidate (c6/Re8), branch-aware (`philidor` / `oldindian` / `unknown`
for a still-undetermined branch, e.g. after 1.Nf3 d6 2.Nc3) and referencing White's actual last
move via `{white}` (same `fillTemplate()` substitution pattern as everywhere else). Rendered in a
new `#coach-line` element (`.coach-line` in `styles.css` — teal left-border "coach's whiteboard
note" style, distinct from `.commentary-line`'s italic post-move style) placed above the target
tracker in `index.html`. `hideCoaching()` clears it the moment Black actually moves (so the
reactive `commentary-line` takes over cleanly) and in `newGame()`.

---

## 21. Six-Celebration Smoothness, Coaching Made Position-Aware (2026-08-25)

### Six-celebration: real causes of the "delayed and jerky" feel
Investigated rather than assumed -- the images themselves are small (50-200KB, ~300-700px), so
decode cost wasn't the bottleneck. Real causes found: (1) the whole "SES!" moment (score flash +
commentary + photo) was gated behind `await scoreMove(...)`'s full Lichess+Stockfish eval
waterfall (up to ~8s on the slow fallback) with zero visual feedback while it ran -- worse,
celebration-eligible positions (move 7+ only, per §18) are exactly the ones least likely to be
Lichess-cloud-cached, so the reward moment was disproportionately likely to hit the slow path;
(2) the pop-in transition used a deliberately choppy `steps(3, end)` 0.35s zoom (an intentional
retro homage from §19) which read as literal jank rather than charm once it was the game's
headline moment; (3) the shutter sound was a fresh `new Audio()` per shot, never primed, so first
playback could stall and desync from the visual; (4) the `.show` class was toggled after several
DOM-heavy synchronous calls in the same tick (`updateHistory()`, `checkBadges()`), competing for
the frame; (5) no guard against a rapid re-trigger stomping the previous hide timer.

Fixes: `.camera-flash`/`.celebration-photo` transitions changed from `steps(3,end)` to a smooth
`ease-out`/back-out `cubic-bezier(0.34, 1.56, 0.64, 1)` over 0.4-0.5s (still has a slight overshoot
"pop", just no discrete steps) with `will-change: opacity, transform` added to pre-promote both
elements to their own compositor layer. `primeShutterSound()` creates one persistent `Audio`
element with `preload='auto'` up front (called alongside `preloadCelebrationImages()`, both at
page load and in `newGame()`); `playShutterSound()` now rewinds and replays that one element
instead of constructing a new one each time. `showCelebrationPhoto()` gained a
`celebrationHideTimer` guard (`clearTimeout` the previous one before starting a new show/hide
cycle). In `processBlackMove()`, the celebration trigger moved to fire immediately once
`moveScore` is known, before `updateHistory()`/`checkBadges()`, and a `"🎥 Analiseer jou skuif..."`
message now shows the instant Black's move is accepted -- this doesn't shrink the real eval
latency (inherent to the shared eval-waterfall architecture), but it means the wait now reads as
"the app is working" rather than "stuck", which was very likely feeding the "delayed" complaint as
much as any actual lag.

### Proactive coaching: from a hand-scripted line to a position-aware one
User feedback: the §20 coaching wasn't actually aware of the moves played -- it recited a single
anticipated sequence (d6 → Nf6 → Nbd7 → e5 → Be7 → O-O) keyed purely by move NUMBER + top-level
branch, so it could recommend a move already played, or contradict a legitimate alternate setup
this app's own badges reward (Bg4, Bf5, a King's Indian fianchetto). Proposed fix under discussion:
a hand-authored tree keyed on the actual move sequence (4 first moves × 4 second replies × 3 × 3 =
144+ branches by move 4 alone). Rejected in favour of a dynamic approach: unbounded authoring
effort for the tree, and *any* line outside the anticipated branches -- including transpositions --
reintroduces the exact same staleness the tree was meant to fix.

Replaced with two dynamic pieces layered onto a short, trimmed move-number/branch opener (the old
openers had specific move recommendations baked in -- e.g. "Nou het jy 'n keuse: e5 of Nbd7..." --
which is exactly the content that goes stale; trimmed down to pure scene-setting like "Wit speel
{white} in hierdie Philidor-lyn," leaving the recommendation entirely to the dynamic parts below):

1. **Real candidate moves for the exact current position.** `fetchGuidanceData(fen)` (new, in the
   hint system) fetches the Lichess-popularity top move and the engine's top move ONCE per move,
   and is now shared by `fetchBestMove()` (the hint button), `showAutoHints()` (the arrows), AND
   `showProactiveCoaching()` -- previously the first two each ran this same query independently for
   the same FEN (a pre-existing redundancy), and coaching would have been a third redundant copy;
   sharing one fetch actually reduces total API/engine load versus before, despite adding a third
   consumer and widening the guided window to moves 1-7 (§20). `MIN_POPULARITY_SAMPLE = 20` is a
   named version of the same threshold `scoreMove()`/`scoreByStockfishOnly()` already used as a
   magic number, now shared for consistency (the popularity move is only named in the coaching
   text if the pool has at least this many games).
2. **What to work toward, read from the actual board.** `getCoachingProgress()` checks: has Nf6
   been played, has the central `e5` break been attempted (`history().includes('e5')`), has the
   c8-bishop left home *at all* (not specifically to e7 -- Bg4/Bf5/a g6+Bg7 fianchetto all count),
   has the king moved *at all* (not specifically O-O to g8 -- covers queenside castling or a manual
   king move too). `nextSuggestedIdea()` returns the first not-yet-done step in that order, or a
   "your own plan" message once all four are done. This can never recommend something already
   played, and never contradicts a legitimate alternate line -- it reflects whatever position was
   actually reached, by however many moves and whichever specific ones got there.

`showProactiveCoaching()` dropped its own `async`/network code entirely (it now just consumes the
`guidance` object passed in from `makeWhiteMove()`, which already did the one shared fetch) and
assembles: `{opener}{options in brackets, if any}{Ons plan: nextSuggestedIdea()}.` Move 1 still
shows just the opener (forced move, no options/idea to add).
