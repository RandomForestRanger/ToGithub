# CLAUDE.md — Die Caro-Kann in Blokkie-wêreld (voorheen "Kamp Karpov")

## Oorsig / Overview

A web-based chess training game teaching the **Caro-Kann Defence (1.e4 c6)** to a young
Afrikaans-speaking student. Theme: a **Minecraft-inspired world of biomes** ("Blokkie-wêreld").
The student always plays **Black**. The game is a static site (HTML/CSS/JS, no backend)
deployed on **Netlify**, consistent with the existing suite (Leer die Bird Speel, Meester
Giacomo se Akademie, ens.).

**All UI text, coaching dialogue, and feedback is in Afrikaans.** Chess move notation remains
standard algebraic (English piece letters: K, Q, R, B, N), as in the rest of the suite.

---

## 1. Persona: Die Wyse ou Reisiger

The student's guide is **Die Wyse ou Reisiger** — a wandering, wise old traveller
(pixel-art avatar: hooded cloak, walking staff, small lantern, weathered pixel beard).
He has walked every biome and knows the paths through all of them. Voice and register:

* Calm, warm, a little mysterious — the tone of someone who has seen many games and lost
  none of his patience. Never sarcastic to the child.
* Speaks plain Afrikaans with occasional Minecraft vocabulary left in English where natural
  ("creeper", "spawn", "The End", "biome") — this mirrors how children actually speak.
* Speaks of **Anatoly Karpov** as a real person he once travelled with — not a mythic title
  layered onto the Reisiger's own identity. The two are kept clearly distinct: the Reisiger
  is the student's guide; Karpov is the historical player the Reisiger reminisces about.
  Karpov-lore appears in loading screens and biome intros ("Karpov het gesê: verbeter een
  stuk op 'n slag, dan word jou posisie so vas soos bedrock.").
* Short sentences. One idea per speech bubble. Maximum ±20 words per bubble.
* Signature habit: he *reads the land*. When the biome reveals itself (§2), it is the
  Reisiger who names it — reinforcing that the student, too, must read White's moves to
  know which world they are in.

---

## 2. Structure: Die Vier Biome (dynamic reveal — no player selection)

**The student never chooses a biome.** Every game begins on a neutral "spawn" background
(dawn light, plain grass, standard board). The engine (White) secretly selects the variation
at game start (selection rule in §4). The biome then **reveals itself through White's moves**:
the background, board skin, ambience, and music all transform the moment the variation is
disambiguated, with a short block-dissolve transition and a popup from Die Wyse ou Reisiger.

### Reveal logic
* **3.e5** → reveal **Die Muur** immediately after White's 3rd move.
* **3.Nc3** → reveal **Die Woud** immediately after White's 3rd move.
* **3.exd5** → ambiguous! Show an interim Reisiger bubble instead of a reveal:
  **"Hmm... die grond verander onder ons voete. Is dit Die Vlakte of Die Nether? Hou dop!"**
  Then after White's 4th move: **4.c4** → reveal **Die Nether**; any other 4th move
  (script plays 4.Bd3) → reveal **Die Vlakte**.
* This deliberately teaches the real-chess skill: *you don't pick the variation — you read
  your opponent's moves to discover which world you're in.*

### Reveal popup (template)
> "Gaaf! Nou gaan ons die **X**-bioom binne. Hierso is ons strategie mos **X**, en ons plan
> is om te **X** en te **X**."

Per-biome popup text (source of truth):
* **Die Vlakte:** "Gaaf! Nou gaan ons die Vlakte-bioom binne. Hierso is ons strategie mos
  aktiewe stukke, en ons plan is om vinnig te ontwikkel en die dubbelaanval op b7 en d5
  dop te hou."
* **Die Muur:** "Gaaf! Nou gaan ons die Muur-bioom binne. Hierso is ons strategie mos om
  ons gereedskap uit die huis te kry vóór ons die deur toemaak, en ons plan is om Bf5 te
  speel en later die muur met c5 te kraak."
* **Die Woud:** "Gaaf! Nou gaan ons die Woud-bioom binne. Hierso is ons strategie mos
  stukke-harmonie, en ons plan is om die e4-veld te beveg en ons ligte stukke perfek te
  plaas."
* **Die Nether:** "Gaaf! Nou gaan ons die Nether-bioom binne. Hierso is ons strategie mos
  kalm blokkade, en ons plan is om d5 te blokkeer en stukke af te ruil sodat Wit se eensame
  pion al swakker word."

The popup pauses the clock/flow; the student dismisses it with one tap ("Reg, kom ons gaan!").

### Die Biome

| # | Bioom (UI name) | Variation | Biome flavour |
|---|---|---|---|
| 1 | **Die Vlakte** | Exchange: 3.exd5 (no early c4) | Sunny, level plains — open, balanced terrain |
| 2 | **Die Muur** | Advance: 3.e5 | White builds a high wall; you undermine its foundations |
| 3 | **Die Woud** | Classical: 3.Nc3 | Dense forest, two dungeon paths (two sub-lines) |
| 4 | **Die Nether** | Panov-Botvinnik: 3.exd5 cxd5 4.c4 | Sharp, dangerous, lava everywhere — White attacks |

Biome 3 sub-paths (chosen by the **student's own 4th move** — both are permitted theory):
* **3a — Die Bospad** (Classical): 4...Bf5
* **3b — Karpov se Pad** (Karpov Variation): 4...Nd7
* The Reisiger names the path after the student's 4th move ("Aha — jy kies Karpov se
  Pad. Volg my.") — a small second reveal within the forest.

### Home screen
No biome selection. The home screen is a single "spawn" panel: the Reisiger by a campfire,
a **"Begin die reis"** button, and a progress map showing the four biomes with their ore
badges (brons/silwer/goud, §7) — visible as achievements, not tappable as choices.

### Out-of-scope White tries
The engine (as White) plays **only** the four scripted variations. It never opens with the
Two Knights (3.Nc3/Nf3 without d4-lines), the Fantasy (3.f3), or other sidelines. The chosen
variation fully determines White's first 8 moves (with small scripted branching, §4).

---

## 3. Chess content: theory per world

Scripted depth: **8 Black moves** of theory per line. Where the table says "toegelaat",
multiple Black moves are accepted as theory; otherwise only the main move is accepted.
Lines below are the source of truth for the script layer.

### World 1 — Die Vlakte (Exchange)
Main line: 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7 8.Nd2 e6
* Toegelaat at move 7...: **Qd7** (main) or **Na5** (alternative vs Qb3).
* Key teaching point (Reisiger bubble): after 7.Qb3 White attacks **b7 en d5 gelyktydig** —
  the student must see the double attack and defend correctly. This is the world's "trap check".
* Plans after theory: ...Bd6 or ...e6+...Be7, castle short, minority-attack ideas with ...Rb8/...b5
  are mentioned in the debriefing only (not required play).

### World 2 — Die Muur (Advance)
Main line: 1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 Nd7 6.O-O Ne7 7.Nbd2 h6 8.Nb3 Bh7 (waiting) or 8...c5
* Toegelaat at move 5...: **Nd7** or **c5** (immediate strike). If 5...c5, script continues
  6.Be3 Qb6 7.Nc3 Nc6 8.O-O cxd4 (simplified Short-System handling).
* **Critical pedagogy (corrects the original brief):** the light-squared bishop goes to f5
  **BEFORE** ...e6 locks the door. Die Reisiger: "Kry jou gereedskap uit die huis VOOR jy die
  deur toemaak! Eers Bf5, dan e6."
* The ...c5 break is framed as "die TNT onder die toring se fondament" — timing it is the
  world's core lesson.

### World 3a — Die Bospad (Classical, 4...Bf5)
Main line: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 9.Bd3 Bxd3 10.Qxd3 e6
* (Moves 6...h6 and 8...Bh7 count toward the 8 scripted Black moves; the script ends after
  10...e6.) Only main moves accepted here — this dungeon teaches one precise sequence.
* Key lesson: the bishop retreat dance (f5–g6–h7) and why ...h6 must precede it.

### World 3b — Karpov se Pad (4...Nd7)
Main line: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Nf3 Ngf6 6.Nxf6+ Nxf6 7.Bd3 e6 8.O-O Be7
* **Mandatory trap module:** before the first game in this dungeon, a one-screen interactive
  warning teaches the smothered-mate trap **5.Qe2 Ngf6?? 6.Nd6#**. The student must find
  the correct 5...Ndf6 (or 5...e6) once in the tutorial before playing. If the scripted engine
  branch plays 5.Qe2 (it does so in 1 of 3 games at random), playing 5...Ngf6 loses instantly
  with a special Reisiger debriefing ("Die creeper het ontplof! Onthou: kyk ALTYD vir skaakte
  voor jy outomaties speel."). This loss does not reset mastery progress.
* Branch: if 5.Ng5 (scripted in 1 of 3 games): 5...Ngf6 6.Bd3 e6 7.N1f3 Bd6 8.Qe2 h6.
* Framing: this is named directly for Karpov — the historical player, not the Reisiger — and
  Karpov-lore is heaviest in this dungeon.

### World 4 — Die Nether (Panov-Botvinnik)
Main line: 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 (then ...O-O)
* Toegelaat at move 6...: **Be7** (main) or **Bb4** (pin line; script then 7.cxd5 Nxd5 8.Bd2 Nc6).
* Key lesson: the **IQP** (isolated queen's pawn) — "White se toring staan op een been."
  Black blockades d5 and trades pieces; every trade makes the lonely pawn weaker.
* Die Reisiger warns at world entry: "Hier in die Nether speel Wit skerp. Bly kalm, blokkeer d5."

---

## 4. Engine architecture (three tiers)

### Variation selection (game start, hidden from the student)
Since the student no longer chooses a biome, the engine selects the variation at game start:
**weighted random, biased toward the student's least-mastered biomes** — weight descends one
per tier up the six-rung ladder (§7): geen = 6, redstone = 5, koper = 4, brons = 3, silwer = 2,
goud = 1 (`TIER_WEIGHT` in `js/data.js`; brons/silwer/goud keep their original numeric weights
unchanged from before the ladder grew). Guard rail: never the same biome three games in a row.
The selection is invisible until the reveal (§2).

White's moves are produced by a strict three-tier fallback:

1. **Script layer (moves 1–8):** White follows the scripted line for the chosen world,
   including the defined random branches (§3). Deterministic apart from declared branching.
2. **Book layer (from move 9):** query the **Lichess Opening Explorer API**
   (`https://explorer.lichess.ovh/masters` with `play=` UCI history; fall back to the
   `lichess` database endpoint if the masters DB returns no moves). Choose among the top
   book moves weighted by frequency. No API key required. Cache responses in-session.
3. **Stockfish layer (once out of book):** stockfish.js / Stockfish WASM running in a Web
   Worker. Configuration: **beatable but fair** — Skill Level ≈ 5–8 (tune in testing;
   target ±1200–1400 playing strength), movetime ≈ 500 ms.
   * **The planned blunder:** on **White's move 25**, the engine deliberately plays a bad
     move: generate the top engine move, then select a legal alternative that loses at
     least ~200 centipawns relative to it (prefer a move that hangs material or wrecks
     the king position, but never an instant mate-in-one against itself unless nothing
     else qualifies). If the game is already lost for White by move 25 (eval < −500 for
     White), skip the blunder — no mercy needed.
   * Apart from move 25, no artificial blunders: the engine plays its honest (skill-capped) game.
   * **D3 (move-25 grace, owner decision):** the single Black move replying to this scripted
     blunder can never be penalised — no −1 emerald, no blunder modal, and nothing that sets
     `hadBlunder` (so it cannot block Silwer, §7). Positive awards (an emerald for a good
     reply, or a diamond for finding the exact refutation) still apply normally. This is a
     deliberate, undisclosed mechanic — it must never appear in player-facing copy
     (`how-to-play.html` or elsewhere): describing it would defeat its pedagogy (the point is
     the student doesn't know White just handed them a gift).
* If the Lichess API is unreachable, skip tier 2 silently and go straight to Stockfish.

---

## 5. Student move handling

Two phases within the scripted window, then free play:

* **Moves 1–5 (rails):** if the student's move is not in the permitted theory set, the move
  is rejected (piece animates back) with Die Reisiger's bubble:
  **"Hierdie is nie die regte lyn nie — soek en vind!"**
  After 2 consecutive wrong tries: a soft hint (highlight the piece that must move).
  After 3: highlight the target square too. Never show the move outright.
* **Moves 6–8 (scored freedom):** any legal move stands. Theory moves earn emeralds (§6);
  non-theory moves are evaluated by Stockfish — if within 30 cp of the engine's best, the move
  is "Stockfish-approved" and earns an emerald anyway; worse than that scores nothing, and
  a drop of more than 100 cp costs one emerald (floor of zero — the total never goes negative).
* **Move 9 onward:** pure play. Emeralds/diamonds per §6.
* **Illegal moves:** silently rejected by the board library at all times (standard behaviour).

---

## 6. Scoring: emeralds and diamonds

Running total displayed as a Minecraft-style inventory bar (pixel icons).

| Event | Award |
|---|---|
| Theory move played (moves 1–8) | 1 **emerald** |
| Stockfish-approved move (within 30 cp of best), move 6 onward | 1 **emerald** |
| Engine-best move found (move 9 onward, exact top move) | 1 **diamond** (worth 3 emeralds) |
| Move losing > 100 cp (move 6 onward) | −1 emerald (never below 0) |
| Winning the game (mate or resignation trigger: engine eval < −900 for White) | +5 emeralds |
| Reaching move 30 ("The End") | +3 emeralds |

* A blunder (> 300 cp loss) triggers an immediate Reisiger bubble: **"Eina! Kyk weer — wat
  het ek net weggegee?"** plus a one-line explanation of what was lost. One free **terugvat
  (undo)** is allowed per game; using it forfeits any emerald for the replacement move.
* Sound: soft "ching" for emerald, brighter chime for diamond (Minecraft-adjacent, original
  sounds — no ripped game assets).

---

## 7. End of game and mastery tiers

### The End (move 30)
Hard stop when Black completes move 30 (unless mate/resignation earlier). Full-screen End-poem
style panel: **"Jy het al die pad tot by The End gekom, geluk!"** followed by Die Reisiger's
verdict: final Stockfish eval in child terms ("Jy staan beter!", "Dis gelykop — soos twee
ewe hoë torings", "Wit staan beter — maar jy het baie geleer"), emerald/diamond tally, and
**one** lesson: the single most instructive moment of the game (largest eval swing), shown
on a mini-board.

### Mastery per world (Geen → Redstone → Koper → Brons → Silwer → Goud)
Tracked in `localStorage`. Displayed as ore badges on the home screen's progress map (§2) —
achievements, not choices. Mastery also feeds the variation-selection weights (§4). Stated
outright to the player in a table on `how-to-play.html` (added when the ladder grew from 3
tiers to 5 — see build log).

**Tiers are gates, climbed one rung per game — not a single best-of-game score (corrected in
the build log; the ladder originally worked the other way).** Each game's raw stats are checked
against every tier's bar as before, but the tier actually **awarded** that game is capped at one
rung above whatever's already persisted for that world/path: a flawless, Goud-caliber game on a
brand-new biome still only earns Redstone; the next game there is "played for Koper," and so on
up to Goud. A game whose stats don't even clear the very next rung's bar earns nothing that game
(no regression either way — `upgradeTier` never downgrades a persisted tier).

* **Redstone:** finish a game (reach The End or win) with ≥ 10 emeralds (raw `emeraldsTotal`,
  not the diamond-boosted Silwer figure below).
* **Koper:** find (play correctly) ≥ 5 theory/opening moves in one game — counted whether the
  move happened during the strict rails phase or the scored-freedom phase, and regardless of
  whether an emerald was actually paid out for it (a forfeited replacement move after an undo
  still counts as "found").
* **Brons:** complete one game (reach The End or win) with all 8 theory moves played
  correctly (rails phase counts once passed without exhausting hints... brons requires ≤ 2
  hint escalations total).
* **Silwer:** finish a game with ≥ 12 *effective* emeralds and no blunder (> 300 cp) that was
  played through. Two owner decisions refine this:
  * **D1 (diamonds count toward Silwer):** each diamond counts as 3 emeralds for this check
    only — `emeraldsTotal + diamondsTotal × 3 ≥ 12`. The on-screen inventory bar and the
    end-of-game tally still display emeralds and diamonds separately; only the internal
    mastery check combines them.
  * **D2 (undo forgives a blunder):** a blunder that the student undoes (§6's free
    **terugvat**) does not block Silwer — only a blunder that is played through (the
    "Gaan voort" choice) sets the flag that blocks it.
* **Goud:** win a game outright, OR reach The End with eval ≥ +150 for Black AND ≥ 2 diamonds.
* World 3 (Die Woud) mastery = the lower of the two dungeons' tiers, shown per dungeon too.
* Every tier (including Redstone/Koper) requires `reachedEndOrWon` — an early loss (mate,
  draw, or the Karpov trap) awards nothing at any level, consistent with the original three
  tiers; this wasn't loosened when Redstone/Koper were added.

---

## 8. Visual and UI specification

* **Style:** Minecraft-inspired but legally original: blocky pixel aesthetic, dirt/grass/stone
  CSS textures (procedural or hand-made — **no Mojang assets, textures, or fonts**).
* **Fonts:** "Press Start 2P" (Google Fonts) for headings; a clean sans (e.g. "Rubik") for
  coaching text — pixel fonts are hard for children to read at length.
* **Board:** chessground (Lichess's board library, MIT) or chessboard.js; chess.js for rules.
  Board skinned with subtle block-texture squares; last move highlighted; legal-move dots ON.
* **Layout:** board centre-left; Die Reisiger avatar + speech bubble right; inventory bar (emeralds/
  diamonds/move counter as "daglig-meter" — the sun moves across a bar toward The End at 30).
* **Responsive:** must work on a tablet (the student's likely device). Touch-friendly:
  tap-tap moving, no drag required.
* **Language:** all UI Afrikaans. Move list in standard algebraic notation.

## 9. Technical stack and deployment

* Static site: `index.html` (home/spawn screen), one game page (SPA state; the biome is
  internal engine state, never a user-facing choice or query param).
* **Biome theming:** each biome = a CSS theme class on `<body>` (custom properties for
  background, board colours, ambience). The reveal transition = block-dissolve overlay
  (~1 s) + theme-class swap + popup. Spawn theme is the pre-reveal default.
* Vanilla JS or lightweight framework — match the suite's existing pattern (vanilla preferred).
* chess.js, chessground/chessboard.js, stockfish.js (WASM, Web Worker), Lichess Explorer API.
* `localStorage`: mastery tiers, emerald lifetime total, settings. No accounts, no backend.
* Deploy: Netlify, same account/pattern as the rest of the suite. Add link + tile to the
  unified Afrikaans portal landing page (separate small task: portal tile with Die Nether
  purple accent).
* Performance: lazy-load Stockfish only when the game starts; the home screen must load instantly.

## 10. Testing checklist (Claude Code: verify before done)

1. Each biome's script plays out correctly for every permitted Black alternative.
2. **Reveal logic:** 3.e5 → Die Muur at move 3; 3.Nc3 → Die Woud at move 3; 3.exd5 →
   interim bubble, then Die Nether on 4.c4 or Die Vlakte otherwise. Popup text matches §2
   verbatim; theme transition fires exactly once per game.
3. **Variation selection:** weighted by inverse mastery; no biome three games in a row.
4. The Nd6# trap branch fires ~1/3 of games in Karpov se Pad; tutorial gate works.
5. Rails phase: wrong move rejected with correct bubble; hint escalation at 2 and 3 tries.
6. Emerald arithmetic: never negative; diamond = exact engine-best only.
7. Move-25 blunder occurs (and is skipped when White already < −500).
8. The End panel at move 30; early mate/resignation panels.
9. Lichess API failure → silent Stockfish fallback (test offline).
10. Mastery persistence across reloads; per-path display in Die Woud; selection weights update.
11. All text renders correctly in Afrikaans (geen mojibake met ê, ô ens. nie).
12. Tablet touch play end-to-end, including popup dismissal by tap.

---

## 11. Implementation notes (build log — decisions made where this spec was silent)

Built July 2026: `index.html`/`js/home.js` (spawn screen), `game.html`/`js/game.js` (SPA),
`js/data.js` (opening trees + dialogue), `js/engine.js` (script/book/Stockfish waterfall),
`js/mastery.js`, `js/audio.js`, `css/style.css`. chessboard.js chosen over chessground (§8 left
it open) to match the rest of the suite's tap-to-move/highlight conventions exactly. Sound is
procedurally synthesized via Web Audio oscillators — no external audio files, per §8's "no
Mojang assets" spirit extended to sound.

**Calls made where the spec didn't fully specify behaviour:**

* **§5 rails-phase exception for Die Bospad:** the general rule is moves 1–5 strict / 6–8 scored
  freedom, but §3's Bospad entry separately says "Only main moves accepted here — this dungeon
  teaches one precise sequence." Read that as an override: Die Bospad is strict rails for its
  *entire* 10-move scripted line (never enters scored freedom). Encoded as
  `RAILS_STRICT_THROUGH.bospad = 10` in `data.js` vs. `5` for every other path.
* **§3 Karpov se Pad, 5.Qe2 non-trap continuation:** the spec mandates the trap
  (5...Ngf6?? 6.Nd6#) and the correct replies (5...Ndf6 or 5...e6), but not what White plays
  after a correct reply. Extrapolated a transposition back toward the 5.Nf3 main line
  (`TREE_KARPOV.branches.Qe2` in `data.js`, commented inline). Revisit if a real reference line
  is preferred.
* **§9 Lichess token:** implemented as `window.LICHESS_TOKEN || ''` (optional gitignored
  `config.local.js`, or Netlify snippet injection), matching the pattern the rest of the suite
  moved to in commit `710fe0a` ("Remove hardcoded Lichess token from all apps") — no token is
  committed to source. §9 didn't mention token handling at all; this just applies the suite-wide
  convention.
* **§7 "all 8 theory moves played correctly" (Brons):** implemented as "≤ 2 hint escalations for
  the whole game," per the parenthetical in the same bullet — treated as the operative
  definition rather than a separate condition to also track.
* **Blunder explanation (§6):** "a one-line explanation of what was lost" is approximated as the
  centipawn/pawn-equivalent size of the drop, not a material-specific explanation (e.g. "you hung
  your knight") — computing the latter reliably would need PV/threat analysis beyond what the
  eval waterfall returns. Worth a follow-up pass if the vague version reads flat to a kid.
* **Resignation check (§4 win trigger, eval < −900 for White):** only evaluated from White's
  move 10 onward (not every move) to cut down on live Stockfish/API calls; resignation this
  early is not realistic in these lines anyway.
* **Promotion:** auto-queens (no underpromotion picker UI). None of the scripted lines need
  underpromotion, and free play at this level rarely does either.
* **chessboard.js piece images — real bug, not a judgment call:** the unpkg CDN build
  (`@chrisoakman/chessboardjs@1.0.0`) does not ship the `img/chesspieces/wikipedia/*.png`
  files, only `dist/*.js|css`. Using that as `pieceTheme` silently breaks every piece image.
  Fixed by pointing `pieceTheme` at `https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png`
  instead, matching what Vind_die_Flater/Spanish_Opening/Bird_Opening already do.

**Verified so far** (Puppeteer against real Chrome — no Playwright on this machine): home
screen, navigation, tap-to-move + legal-move dots, rails accept/reject with correct bubbles,
White's scripted auto-replies, reveal logic for both the direct (3.Nc3→Woud) and ambiguous
(3.exd5→4.c4/Bd3) cases with exact popup text and theme swap, zero console errors.

**Not yet exercised end-to-end** — items 1, 3, 4, 6, 7, 8, 10 above still need a longer soak
test: a full game to move 30, the move-25 blunder and resignation trigger (need live
Stockfish/network for enough moves), the Karpov trap firing at its ~1/3 rate, and mastery-tier
persistence across reloads.

---

## 12. Round-2 polish pass (build log continued)

Renamed the product to **"Die Caro-Kann in Blokkie-wêreld"** (page titles, home `<h1>`); kept
"Kamp Karpov" and all of §1's Reisiger/Karpov lore as in-game flavor text/tagline rather than
removing it — the persona and biome system are unchanged, only the outward product name moved.

**New assets, all in `images/`:**
* `sprite_idea.jpg`, `sword_reference.jpg` — the user's reference images (bead-art adventurer,
  a diamond-sword icon). Not used directly; both were hand-recreated as original pixel art
  (CSS multi-div sprite / inline SVG data-URI) so no external image request is needed for either.
* `bg-vlakte.png`, `bg-muur.png`, `bg-woud-bospad.png`, `bg-woud-karpov.png`, `bg-nether.png` —
  **AI-generated (Nano Banana), confirmed by the user to not be Mojang assets**, despite looking
  like in-game screenshots. Wired as full-bleed `background-image` per `body.theme-*` class with
  a dark linear-gradient overlay for text legibility; the old procedural ground-texture strip
  (`body::before`) is hidden whenever a theme class is active. Die Woud gets a second background
  (`bg-woud-karpov.png`) once the student's move 4 resolves to Karpov se Pad, via an
  additional `body.path-karpov` class — a small third reveal moment matching §2's "second
  reveal within the forest." (Renamed from `bg-woud-legende.png` / `path-legende` in §14.)

**Reisiger sprite:** replaced the single-div placeholder avatar with a ~13-part CSS sprite
(`.reisiger-sprite` + `.rs-*` children in `css/style.css`) — fedora brim/crown/band, tan face
with eyes+mouth, jacket with a baked-in diagonal sash (CSS gradient, not a separate rotated
element), front/back arms and legs for a walking stance, boots, and a small lantern. Pure CSS,
reused identically on the home screen, game screen, and `karpov.html`.

**Hint highlight is now a Netherite sword**, not a blue ring: `.highlight-sword` (`css/style.css`)
overlays a 12×12 pixel-grid sword (inline SVG data-URI, shape loosely modeled on
`images/sword_reference.jpg` but recolored dark gunmetal grey instead of that reference's
diamond-blue) on the piece-square at the 2nd wrong try, and additionally on the target square at
the 3rd, both slowly pulsing.

**Move commentary + bubble timing:** `MOVE_COMMENTARY` in `js/data.js` holds ~20 short Afrikaans
explanations (why the move is good), keyed `pathId -> SAN`, covering each of the first 5 rails
moves per top-level biome (Woud's move 4 keeps its existing path-naming bubble instead; move 5's
commentary is keyed per Karpov branch since White's random 5th move changes what Black plays).
Shown via `showBubble()` when a rails move is accepted. `showBubble(text, autoClearMs)` now
supports an auto-clear timeout — the rails-wrong bubble uses `3000`ms — and any subsequent
`showBubble()` call (e.g. the correct-move commentary) cancels a pending auto-clear, satisfying
"disappears after 3s or when the right move is played" without extra bookkeeping.

**White's moves are slower (2000ms) and now draw a directional arrow.** `renderBoard()`
previously called `board.position(fen, false)` — passing `false` disables chessboard.js's
built-in animation entirely, which is why White's moves felt instant. Fixed by animating
(`true`) and driving per-move speed through a **mutable shared `boardConfig` object**: reading
`chessboard-1.0.0.js` confirmed the library never clones the config object you pass to
`Chessboard(id, config)` — it mutates that same object in place — so reassigning
`boardConfig.moveSpeed` before each `position()` call changes animation speed without
re-initializing the board. Black's own moves stay fast (350ms, the student already saw their tap
land); White's are 2000ms. Separately, `drawMoveArrow(from, to)` (`js/game.js`) draws a red arrow
between the actual rendered `.square-XX` elements' bounding rects into an SVG overlay
(`#move-arrow` inside a new `#board-frame` wrapper in `game.html`) — reading real DOM positions
rather than calculating file/rank geometry makes it orientation-proof for free.

**Notation panel renamed "Notasie" and no longer scrolls.** Replaced the `overflow-y:auto` move
list with click-based pagination (6 move-pairs per page, ◀/▶ buttons, auto-jumps to the latest
page on every new move). This was prompted by a real bug the pagination work surfaced during
testing, below.

**Bug fixed — every screen was stacked at once, forcing the whole page to scroll:**
`css/style.css`'s `.screen { display: none; }` / `.screen.active/.flex-active { display: ... }`
rules were losing the cascade to `game.html`'s inline `<style>` block, because
`#screen-loading`/`#screen-tutorial`/`#screen-end` also carry `.center-screen` and `#screen-play`
carries `.game-wrap` — both `display:flex` at the *same specificity* as `.screen`, and the inline
block loads after the external stylesheet so it won. Net effect: all four screens rendered
simultaneously (4 × 900px = exactly the 3600px scrollHeight Puppeteer measured), regardless of
which one JS had marked `active`. Fixed with `!important` on the three `.screen` rules (documented
inline in the CSS — this is one of the rare justified uses). Caught by an explicit
`document.documentElement.scrollHeight` check in the Puppeteer verification pass; worth keeping
that check in any future regression pass since it's cheap and would have caught this immediately.

**Three new info pages**, linked from three new buttons on the home screen (`index.html`):
`how-to-play.html` ("Hoe om te speel" — tap-to-move, rails vs. scored-freedom vs. free play, the
full emerald/diamond scoring table, blunder/undo, The End, mastery tiers), `biomes.html` (all 4
biomes with a wallpaper thumbnail, the real opening name, flavor text, and a "jou doel" callout
per §3), `karpov.html` (real Anatoly Karpov biography — 12th World Champion, positional style,
Caro-Kann connection — framed as the Reisiger reminiscing about a real person he once
travelled with, not a mythic title; see §14). All three reuse `css/style.css` and the
Reisiger sprite; content pages are
intentionally allowed to scroll (they're reached by a click from the home screen, not part of the
no-scroll gameplay loop) — the no-scroll requirement applies to `game.html` specifically.

**White's move animation, take three.** `board.position(fen, true)`'s built-in chessboard.js
animation was real (confirmed by polling actual rendered pixel position, not just the inline
style value) but still didn't read as "sliding" once deployed — likely overlapping
`position()` calls from Black's move and White's reply firing in close succession, since
script-layer moves resolve almost instantly. Replaced entirely with a custom animation: a
cloned `<img>` positioned over the source square, CSS-transitioned to the destination square,
independent of chessboard.js's own diff logic (`slidePiece`/`animateMove` in `js/game.js`).
`board.position(fen, false)` is now only used afterward to sync final state instantly. Verified
with `getBoundingClientRect()` polling (not `element.style.top`, which reports the assigned
target immediately rather than the actual interpolating position — a mistake made and caught
mid-session). All local script/stylesheet references got a `?v=N` cache-busting query string
after this round, since several iterations were likely masked by browser caching — currently
`?v=4` across every HTML file (`index.html`, `game.html`, `karpov.html`, `biomes.html`,
`how-to-play.html`). **Bump this same suffix on every file, every time**, whenever any CSS/JS
under `css/` or `js/` changes — a partial bump leaves some assets stale and reintroduces the
exact confusion this was added to fix.

## 13. Die Reisiger sprite (real pixel art, not CSS)

Replaced the CSS box-sprite with actual pixel-art images cropped from three AI-generated
(Nano Banana) sprite sheets the user supplied — confirmed non-Mojang, same as the biome
wallpapers. Source sheets kept at `images/reisiger/source/` for future re-cropping.

* **8 face expressions** (`images/reisiger/face-*.png`): happy, delighted, alert,
  concentrating, angry, furious, amused, bored. `js/reisiger.js` (`KKReisiger`) swaps the
  `<img id="reisiger-face">` src by name — the same "named expression drives a face" pattern
  as `Italiaans/src/components/GiacomoFace.jsx`, just with static cropped PNGs instead of
  procedural SVG rects. Also replays a random `amused`/`bored` "idle blip" every ~12–26s when
  nothing's happened, mirroring Giacomo's idle-animation timer, then reverts to the last
  explicitly-set expression.
* **3 full-body poses** (`images/reisiger/body-*.png`): `idle` (home screen hero + how-to-play),
  `happy` (karpov.html), `map-reading` (biomes.html). `.body-pose` / `.body-pose.small` in
  `css/style.css`.
* Expression wiring in `js/game.js`: `happy` = resting/waiting state (also the within-tolerance
  free-play outcome); `concentrating` = White's turn (set at the top of `playWhiteTurn`, cleared
  back to `happy` once the student can move again); `angry` = rails-wrong rejection; `furious` =
  blunder (>300cp) and the Karpov trap; `delighted` = correct rails move and diamond; `happy`
  also covers an approved free-play move and a won game. `alert` remains a valid expression in
  `js/reisiger.js`'s list but isn't currently triggered anywhere — free to reuse later. The End
  screen has its own `#end-face` image, set once at game-end based on outcome (not wired to the
  live `KKReisiger` module, since that instance is bound to the in-play panel).

## 14. Dropping the "Legende" conflation and all "Kamp" framing

User feedback: the "Die Legende" epithet was blurring two identities that should stay distinct
— **Die Reisiger** (the student's guide) and **Anatoly Karpov** (the historical player the
Reisiger reminisces about, having once travelled with him). §12's `karpov.html` had leaned into
this ambiguity on purpose ("Die mite van Die Legende"); the user asked to drop it in favor of a
plain "Reisiger talks about a real person" framing, and supplied replacement copy for
`karpov.html` (used near-verbatim). At the same time, the user asked to drop the "Kamp"/"Camp"
framing that §12 had explicitly *kept* as flavor text — reversing that earlier call.

**Renames applied throughout, code and copy:**
* World 3b path: `legende` id/name → `karpov` (`Die Legende se Pad` → `Karpov se Pad`), including
  `WOUD_PATHS`, `TREE_LEGENDE`→`TREE_KARPOV`, `LEGENDE_MAIN_TAIL`→`KARPOV_MAIN_TAIL`,
  `RAILS_STRICT_THROUGH.legende`→`.karpov`, `MOVE_COMMENTARY.legende`→`.karpov`,
  `REISIGER.legendeChosen`→`.karpovChosen`, `masteryState.legendeTutorialSeen`→`.karpovTutorialSeen`,
  `runLegendeTutorial`→`runKarpovTutorial`, CSS class `.path-legende`→`.path-karpov`, and the image
  asset `bg-woud-legende.png`→`bg-woud-karpov.png` (plain `mv`, not `git mv` — `images/` isn't
  tracked in this repo).
* Dialogue: "Die Legende het gesê..." → "Karpov het gesê..."; "Ek het eendag die Legende se sak
  gedra" → "Ek het eendag saam met Karpov gereis" (companion, not satchel-bearer to a title).
* "Terug na kamp" (4 files: `game.html`, `biomes.html`, `how-to-play.html`, `karpov.html`) →
  "Terug na spawn", matching the "spawn" vocabulary §2 already uses for the home screen.
* `index.html`: dropped the "Kamp Karpov — met Die Wyse ou Reisiger" subtitle (now just "Met Die
  Wyse ou Reisiger"); home bubble "Welkom by die kamp!" → "Welkom!"; nav button "Die Legende" →
  "Anatoly Karpov".
* File-header comments across `css/style.css` and every `js/*.js` file: `/* Kamp Karpov — ... */`
  → `/* Die Caro-Kann in Blokkie-wêreld — ... */`.
* §1 and §3 above were edited in place to match (not just this log) — this is a genuine spec
  correction, not merely an implementation-note addendum.

**Deliberately left unchanged:** `GAME_PREFIX = 'kampKarpov'` (`js/data.js`) — it's an internal
`localStorage` key prefix, invisible to the player, and renaming it would silently wipe every
saved player's badges/mastery/high-scores on next load for no user-facing benefit. If a full
namespace rename is ever wanted, it needs an explicit migration (read old key → write new key →
delete old), not a plain rename.

**Known side effect:** renaming `tiers.legende`→`tiers.karpov` and
`legendeTutorialSeen`→`karpovTutorialSeen` inside the *mastery* object (which does live under
`GAME_PREFIX`) means any player who had already earned a Woud sub-path tier or seen the trap
tutorial will show "Nog niks" for Karpov se Pad and re-see the tutorial once. Accepted as
low-stakes for this project's scale (a handful of named local players); flag if that ever
matters more.

---

## 15. `biomes.html` narrative rewrite

Earlier in the same session (before §14's Karpov/Kamp rename), the user supplied replacement
copy for `biomes.html` and asked for it to be worked in. The page's tone shifted from a
dry fact-sheet (opening name + one paragraph + a "Jou doel" callout per biome) to a
story-first read matching the Reisiger's voice elsewhere in the app:

* New **"Welkom by die Caro-Kann"** panel at the top of the page — the opening's philosophy
  (patient building over rushing), a 4-item "Onthou altyd hierdie vier dinge" checklist, and a
  Reisiger quote block. New **"Die Goue Reël van die Caro-Kann"** panel at the bottom, closing
  on the same four-item rule condensed to one line.
* Each biome card's flavour paragraph was replaced with short dramatic lines (Reisiger-style,
  one idea per line) and its "Jou doel" single paragraph became a **"Jou plan"** bullet list.
  The `Skaak-naam` (real opening name) line and thumbnail image were kept — useful technical
  anchor, doesn't clash with the story tone.
* Biome emoji changed to match the user's copy: Vlakte 🟩→🌾, Nether 🟪→🔥 (Muur 🧱 and Woud 🌲
  unchanged).
* New local CSS in `biomes.html`'s `<style>` block: `.story-panel`, `.rule-list`,
  `.reisiger-quote` — page-scoped, not added to the shared `css/style.css`, matching this
  page's existing pattern of a local `<style>` block for page-specific layout.
* `BIOMES.md` (see below) was updated to match the corrected "Biome" spelling but was **not**
  rewritten to carry this narrative — it stays a plain technical reference mirroring §2/§3,
  distinct from `biomes.html`'s player-facing copy.

---

## 16. Card 1 — hint-escalation counter was double/triple-counting

`handleBlackMove`'s rails-rejection branch (`js/game.js`) incremented `hintEscalations` on
*every* wrong try from the 3rd onward (`if (wrongTries >= 3) { ...; hintEscalations++; }`), so
one stuck rails move could burn 4+ escalations against Brons's `≤ 2` total (§7). Fixed by
splitting the `>= 3` block into `=== 3` (shows the piece+target sword hint, increments once)
and `>= 4` (keeps re-showing the same piece+target hint on every further wrong try, no further
increment). `=== 2` (piece-only hint, first increment) was already correct and untouched.

**Judgment call:** implemented as three separate `if` statements (`=== 2`, `=== 3`, `>= 4`)
rather than one `>= 3` hint block plus a separately-gated counter, since `showHint` only needs
one call site per tick either way and three flat conditions read clearer than combined guards.

**Verification:** no `module.exports` hook exists for `handleBlackMove` (it's private to
`game.js`'s closure) and Puppeteer isn't installed in this project (`node -e "require('puppeteer')"`
→ Cannot find module). Verified instead by transcribing the exact post-fix conditional block
into a standalone Node script and driving it through 5 consecutive wrong tries plus a reset —
confirmed `hintEscalations === 2`, hint sequence `[piece, piece+target, piece+target,
piece+target]`, and that resetting `wrongTries` to 0 leaves `hintEscalations` untouched. This is
an isolated-logic check, not an in-browser/full-app run — flagged in the card report.

**Cache-buster:** bumped `?v=4` → `?v=5` on every local script/stylesheet/image reference in
all 5 HTML files (`index.html`, `game.html`, `biomes.html`, `how-to-play.html`, `karpov.html`),
per §12's standing rule, since this touched `js/game.js`.

---

## 17. Card 2 — conditional Lichess auth header + full cache-buster sweep

**Bug A:** `cloudEval()` and `queryExplorer()` (`js/engine.js`) always sent
`Authorization: Bearer ` + `(window.LICHESS_TOKEN || '')`, so the default tokenless case (the
one both endpoints must survive per §9's convention) sent a malformed empty bearer and got
401'd by Lichess. Fixed at both call sites: build a `headers` object and only set
`headers.Authorization` when `window.LICHESS_TOKEN` is truthy; pass no `Authorization` key at
all otherwise.

**Bug B:** cache-buster drift — `endGame()` in `js/game.js` had a stray `?v=3` face-image URL,
`reisiger.js`'s `paint()` requested face images with no version suffix at all, and every HTML
asset sat at `?v=5` (from card 1, §16). Fixed by adding a single `ASSET_V` constant to
`js/data.js` (currently `6` — one higher than the previous repo-wide max of 5), used by both
JS-constructed face URLs (`endGame()` and `reisiger.js paint()`), and bumping every literal
`?v=` in all 5 HTML files to `?v=6` to match. `grep -rn 'v=' *.html js/` now shows a single
consistent version number (`6`) everywhere a real cache-buster is present (the two other
`v=`-substring hits from that broad grep — a comment in `data.js` and Lichess's own
`multiPv=` query param in `engine.js` — aren't cache-busters and are expected noise).

**Judgment calls:**
* `ASSET_V` lives in `data.js` (loads first in every HTML file's script order) rather than a
  new file, since the card explicitly names it as the preferred location; added it to
  `data.js`'s existing `module.exports` list purely so it's mechanically checkable via Node,
  matching the file's existing export pattern.
* HTML references were left as literal `?v=6` strings per the card's instruction that "HTML
  references stay literal" — no templating introduced there.

**Verification:** `window.LICHESS_TOKEN`/`fetch` don't exist under plain Node and `cloudEval`/
`queryExplorer` aren't exported from `KKEngine`'s closure, so the header fix was verified by
transcribing the exact two-line `headers` construction into an isolated Node script and
checking both the no-token case (no `Authorization` key present) and the token-set case
(well-formed `Bearer <token>`) — not a live network/devtools check. `ASSET_V` was verified
directly via `require('./js/data.js').ASSET_V === 6`. The full-repo grep for a single
consistent version number was run and read directly (see above) rather than simulated.

---

## 18. Card 3 — undo correctness: checkmate guard, script-tree restore, forfeit leak

Three related bugs in `handleBlackMove`/`scoreFreeMove`/`offerBlunderDecision`
(`js/game.js`), fixed together per the card's own dependency note (Fix C only matters once
Fix B lands):

* **Bug A (checkmate scored as blunder):** `scoreFreeMove` ran its Stockfish-analysis/scoring
  logic even when Black's move had just delivered mate (or a draw) — an already-terminal
  position analyses to a meaningless eval and could pop the "Eina!" blunder modal right after
  the child won. Fixed with a guard at the top of `scoreFreeMove`:
  `if (game.in_checkmate() || game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) return;`
  before any analysis or `evalHistory` write — `afterBlackMoveAdvance`'s existing terminal
  checks handle the end screen.
* **Bug B (undo permanently derails the script):** the scored-freedom branch's non-theory path
  set `scriptState.node = null` before scoring; if the child then blundered and undid, the
  tree stayed `null` forever, so White silently abandoned the scripted line for the rest of
  its theory moves. Fixed by snapshotting `{ node, pendingBMap, pendingTrap }` into a new
  closure variable `scriptSnapshot` at the very top of `handleBlackMove` (before any
  mutation), and restoring all three fields from that snapshot in the undo click-handler
  inside `offerBlunderDecision`, alongside the existing `game.undo()` / `blackMoveCount--` /
  `evalHistory.pop()`.
* **Bug C (forfeit leak, reachable once B lands):** with the tree correctly restored after
  undo, a replayed *theory* move now lands in the scored-freedom branch's theory-accepted
  path — which awarded an emerald unconditionally, ignoring `forfeitNextEmerald` (previously
  only consumed inside `scoreFreeMove`, so it would leak forward and wrongly eat a later
  unrelated move's award instead). Fixed by checking `forfeitNextEmerald` first in that
  branch: if set, clear it and skip `awardEmerald`; `handleSpecialAcceptance` and
  `theoryHandled = true` still run either way.

**Judgment call:** Bug A's guard checks all four chess.js terminal predicates
(`in_checkmate`/`in_draw`/`in_stalemate`/`in_threefold_repetition`), matching
`afterBlackMoveAdvance`'s existing compound check exactly, rather than only the two the card
names (`in_checkmate`/`in_draw`) — closes the same class of bug for stalemate/threefold too,
using a pattern the codebase already established rather than inventing a new one.

**Deliberately left alone:** `hadBlunder` semantics, per the card's explicit instruction
(Card 4's territory) — it's still set unconditionally inside the `>BLUNDER_CP_THRESHOLD`
branch of `scoreFreeMove`, now simply unreachable in the mate/draw case as a side effect of
Bug A's guard, not a direct edit.

**Verification:** no `chess.js` npm package or Puppeteer is available in this project (static
site, no build step, no `node_modules`), so both acceptance scenarios were verified by
transcribing the exact post-fix control flow from `handleBlackMove` / `scoreFreeMove` /
`offerBlunderDecision`'s undo handler into an isolated Node harness (mocking `game`'s terminal
predicates and a minimal script-tree), then driving: (1) a forced-mate free-play move — confirmed
zero `evalHistory` writes, `hadBlunder` and `awaitingBlunderDecision` stay `false`; (2) a
move-6 non-theory blunder → undo → replay of the real theory move — confirmed
`blackMoveCount` lands correctly, no emerald is awarded on the replay (forfeit consumed),
`forfeitNextEmerald` is `false` afterward, and `scriptState.node` is both restored by the undo
and correctly re-advanced to the move-7 node by the replay. The third acceptance item
(`undoUsed`'s one-per-game limit) was verified by reading the diff directly — its own
assignment/read logic (`canUndo = !undoUsed`, `undoUsed = true`) was not touched by any of the
three fixes.

---

## 19. Card 4 — Silwer accounting (diamonds count as 3) and undo-forgiven blunders

Two owner decisions (D1: diamonds count toward Silwer's 12-emerald bar at 3 each, display
stays split; D2: undoing a blunder forgives it), both settled by the card, implemented as
written:

* **Fix A (`js/mastery.js`, `evaluateGameResult`):** the Silwer check compared
  `result.emeraldsTotal >= 12` alone, so diamonds contributed nothing to mastery even though
  they're worth 3 emeralds everywhere else (`SCORE.ENGINE_BEST`) — a flawless game (8 theory +
  diamonds + 3 End bonus = 11 raw emeralds) could fail Silwer while a mediocre one passed.
  Fixed by computing `silwerEmeralds = result.emeraldsTotal + result.diamondsTotal *
  SCORE.ENGINE_BEST` and checking that against 12 instead. Purely an internal mastery-check
  change — the on-screen inventory bar and end-of-game tally still read `emeraldsTotal` and
  `diamondsTotal` separately, untouched.
* **Fix B (`js/game.js`):** `hadBlunder = true` was set inside `scoreFreeMove`'s blunder
  branch, before the child ever sees the undo/continue modal — so undoing a blunder didn't
  un-block Silwer. Moved the assignment out of `scoreFreeMove` entirely and into
  `offerBlunderDecision`'s "Gaan voort" (continue) click-handler; the undo click-handler never
  sets it. A blunder that's continued through still correctly blocks Silwer, since that's the
  path that now sets the flag.

**Judgment call:** `js/mastery.js` had no `module.exports` (unlike `data.js`), but the card's
own verification rule requires an actual Node test against `evaluateGameResult`, not inspection
— added `if (typeof module !== 'undefined') { module.exports = KKMastery; }` at the bottom,
matching `data.js`'s existing guard pattern exactly. This is test instrumentation for the
card's mandated verification method, not a behavioral change or refactor.

**Verification:** built a real Node test (`verify_card4.js`, scratch file, not committed) that
requires the actual `js/mastery.js` and calls the actual `evaluateGameResult` — no mocking of
the function under test. Since `mastery.js` references `TIER`/`TIER_ORDER`/`SCORE`/
`GAME_PREFIX` as bare globals (the same script-tag scope-sharing convention used throughout
this suite), the test bridges them via `global.X = require('./js/data.js').X` before requiring
`mastery.js`, mirroring how these files already share scope in the browser (`data.js` loads
first in every HTML file). All 7 cases passed, including the exact boundary from the
acceptance list: 9 emeralds + 1 diamond → `silwerEmeralds = 9 + 1×3 = 12` → Silwer; 8 emeralds
+ 1 diamond → `11` → no Silwer. Also covered: undo-forgiven blunder at exactly 12 → Silwer;
continued blunder in an otherwise-perfect game → no Silwer; and all three Goud branches
(`won`, `finalEvalForBlack >= 150 && diamondsTotal >= 2`, and the negative case where
`diamondsTotal < 2` correctly falls back to Silwer) — confirming the card's "Goud logic
unchanged" requirement by direct Node execution of the untouched code path, not just a
read.

---

## 20. Card 5 — resurrect the book layer; blunder-before-book; move-25 grace (D3)

Three changes, all touching `getWhiteMove`'s tier waterfall and the Black-move scoring path:

* **Fix A (`js/game.js`, book layer was dead):** `commitMove` never captured `game.move(...)`'s
  return value, so Black's moves were never pushed to `session.uciHistory` — only
  `playWhiteTurn` and `triggerTrap` pushed (White-only), so the Lichess Explorer's `play=`
  sequence was always an illegal White-only history and 401'd/empty'd out, silently killing
  tier 2 for every game. Fixed by capturing `commitMove`'s `game.move(...)` return and pushing
  `from + to + (promotion || '')` onto `session.uciHistory`, matching the existing pattern in
  `playWhiteTurn`/`triggerTrap`. Card 3's undo handler (§18) predates this fix and had no
  matching pop, so added `session.uciHistory.pop()` there too, right next to the existing
  `evalHistory.pop()` — confirmed exactly one occurrence in the file. Verified by inspection
  that all three `game.move()` call sites (`commitMove`, `triggerTrap`, `playWhiteTurn`) are
  now each paired 1:1 with a `uciHistory.push()`, and the sole `game.undo()` call is paired
  with the new `uciHistory.pop()` — so `session.uciHistory.length === game.history().length`
  holds as an invariant by construction, satisfying the card's 4th acceptance item without
  needing a live run.
* **Fix B (`js/engine.js`, book shadowed the blunder):** `getWhiteMove` queried `bookMove`
  before checking `whiteMoveNumber === SCORE.BLUNDER_MOVE_NUMBER`, so once Fix A made the book
  layer live, a genuine book hit at move 25 could shadow the planned blunder entirely. Fixed by
  moving the move-25 blunder block (with its `SKIP_BLUNDER_IF_WHITE_EVAL_BELOW` guard intact)
  ahead of the `bookMove` call — order is now script → move-25 blunder check → book → local
  Stockfish.
* **Feature C (D3, move-25 grace):** added `session.graceMove` (initialized `false` on the
  session object), set `true` in `playWhiteTurn` whenever `result.source === 'blunder'`.
  `scoreFreeMove` reads and clears it unconditionally near the top (before any branch), then
  uses the captured value to suppress every negative consequence of the very next Black
  reply: the −1 `BLUNDER_PENALTY` emerald award, the "Eina!" blunder modal
  (`awaitingBlunderDecision`/`offerBlunderDecision`), and therefore `hadBlunder` too (it's
  now only reachable via that modal's continue-handler per Card 4, §19, so skipping the modal
  automatically skips it). Positive awards (approved-move emerald, diamond) are untouched and
  still apply on a grace move.

**Judgment call (broader than the card's literal 3-item list):** the user restated D3 during
this session as "the grace move keeps its carrots and loses only the sticks" — read that as
governing intent over the card's narrower "no −1, no modal, no `hadBlunder`" phrasing, and also
suppressed the negative-toned `KKAudio.penalty()`/`KKAudio.blunder()` sound and
`setExpression('concentrating'/'furious')` calls in the penalty and severe-blunder branches
during a grace move, replacing both with `setExpression('happy')`. Firing the "Eina!"
audio/face at a child who just answered White's own scripted blunder would still read as
punitive even without the point deduction, which conflicts with the "no sticks" framing.

**Verification:** no live chess.js/Puppeteer available (see §18/§19), so Fix B's reordering and
Feature C's suppression logic were verified via an isolated Node harness (`verify_card5.js`,
scratch, not committed) mirroring the exact post-fix control flow — confirmed the move-25
blunder still fires when a book move exists for the position (book no longer shadows it), the
skip-guard still suppresses it when White is already below −500, a −250cp grace reply gets no
penalty/no modal, an exact-refutation grace reply still gets its diamond, and the very next
move after grace clears is scored normally again (both the −250cp penalty case and the >300cp
modal/`hadBlunder`-reachable case). The Explorer `play=` URL/alternation (acceptance item 1)
was checked directly: constructed the real `play=` string for the Vlakte main line through
move 8 using `URLSearchParams` (confirmed correct W/B/W/B/... alternation across all 16 plies)
and confirmed both `explorer.lichess.ovh` endpoints are reachable (HTTP 401, auth required —
matches the documented behavior in this file's Lichess APIs section) via a live `curl`: no
`LICHESS_TOKEN`/`config.local.js` exists in this sandbox, so the fully-authenticated round trip
returning real moves was **not** completed live — marked unverified-live per the card's own
fallback provision, though URL construction and server reachability are confirmed.

---

## 21. Adjacent-bug sweep after Cards 1–5

Each of Cards 1–5's own final report claimed "no adjacent bugs spotted beyond what's already
covered" — on inspection, that was never actually backed by a recorded finding; no concrete
adjacent bug was written down during any of the five cards despite reading `playWhiteTurn`,
`scoreFreeMove`, and `getWhiteMove` closely more than once (Cards 3 and 5 both touched
`playWhiteTurn` directly). Asked to go back and fix what should have been caught, the honest
starting point was: there was nothing on record to act on, so this entry is a fresh review
pass over `js/game.js`, `js/engine.js`, `js/mastery.js`, and `js/data.js` — not a resolution of
prior notes that didn't exist.

**Found and fixed — resignation check evaluated the wrong position:**
`playWhiteTurn` (`js/game.js`) captures `const fen = game.fen();` *before* White's move, uses
it correctly to ask `KKEngine.getWhiteMove(session, fen)` what White should play, then applies
the move (`game.move(result.san)`) — but the resignation check several lines later reused that
same stale pre-move `fen` for `KKEngine.evalForWhite(fen)`, instead of the actual current
position after White just moved. This meant §4's resignation trigger ("eval < −900 for White")
was being decided from the position *before* White's own most recent move, not after it — the
same family of bug as this file's root-level Common Pitfall #1 (stale position captured before
an async call), just via a reused variable rather than `game.turn()` inside a `.then()`. Fixed
by changing that one call to `KKEngine.evalForWhite(game.fen())`, matching how `endGame`'s own
final-eval call already does it correctly two dozen lines below. Confirmed by grepping all
`evalForWhite(...)` call sites: the other two (the move-25 blunder skip-guard in `engine.js`,
which *intentionally* uses the pre-move fen to ask "is White already winning enough to skip the
blunder," and `endGame`'s final verdict, which already used a fresh `game.fen()`) were both
correct as-is — this was an isolated instance, not a repeated pattern. Verified with an isolated
Node mock proving the pre-fix code path passed the stale (pre-move) FEN and the post-fix path
passes the fresh (post-move) one; a live in-game reproduction wasn't run (would need a scripted
15+ move game to reach the `whiteMoveCount >= 10` gate, tying up a live Stockfish/Lichess
session past what this pass's time box allowed).

**Checked and confirmed not a bug — `allTheoryCorrect` is hardcoded `true`:**
`endGame`'s `result` object always sets `allTheoryCorrect: true` regardless of what actually
happened during the rails phase. This looks suspicious in isolation, but §11's build log
already documents this as a deliberate call: Brons's "all 8 theory moves played correctly"
condition was implemented as "≤ 2 hint escalations for the whole game" per that section's own
parenthetical, with `allTheoryCorrect` reduced to inert dead weight rather than a tracked
signal. Left untouched — re-wiring it now would silently change Brons's award criteria, which
is a design question for the product owner, not a bug fix.

**Checked and confirmed not a bug — `evalHistory` has gaps:**
The "biggest eval swing" mini-board on the End screen only has data for moves that went
through `scoreFreeMove` (scored-freedom non-theory moves and all of move 9+); rails and
in-tree theory moves never populate `evalHistory`. A short, mostly-on-rails game can have very
few entries, but the `if (evalHistory.length >= 2)` guard already handles that (hides the
mini-board rather than showing something misleading). Consistent with the feature's intended
scope, not a defect.

**Not re-opened:** the two other loose ends already on record from the original build — the
approximated (not material-specific) blunder explanation, and the Woud sub-path mastery/trap
tutorial reset from the Legende→Karpov rename (§11, §14) — are pre-existing, explicitly
documented trade-offs with their own rationale, not bugs surfaced by Cards 1–5's work, so they
were left alone here too.

**Cache-buster:** bumped `ASSET_V` and every HTML `?v=` reference from 9 to 10 for this fix,
per the standing §12 rule (any `js/` change bumps the version), even though it falls outside
the five numbered cards.

---

## 22. Card 6 — spelling, copy, and spec–code consistency sweep

Words-only pass reconciling prose (HTML, `js/`/`css/` header comments, this file) with the
code as it now stands after Cards 1–5. No logic changed.

**Task A — Caro-Kahn → Caro-Kann:** fixed the double-n misspelling everywhere it appeared in
scope: `<title>`/`<h1>` of `index.html` and `game.html`, the header comment of all seven
`js/` files and `css/style.css`, and this file's own title (line 1) plus two build-log
mentions (§12, §12 continued). 14 occurrences total. `biomes.html`, `how-to-play.html`, and
`karpov.html`'s body copy already read "Caro-Kann" correctly and needed no change.
`grep -rin 'kahn' . --exclude-dir=.git --exclude-dir=images` now returns zero hits **outside**
the six `card-1` through `card-6-*.md` task-spec files, which are not part of this card's
`Files:` scope (they're historical work orders, not living documentation) and were
deliberately left untouched — rewriting a spec file's own description of the bug it assigned
would be revisionist to the record. Confirmed no hard-constraint conflicts: `GAME_PREFIX`
(`'kampKarpov'`), all localStorage keys, and every URL/`play=`/SAN/FEN/UCI string were
unaffected — none contained "Kahn" to begin with.

**Task B — player copy vs. implemented behaviour:** cross-checked every number in
`how-to-play.html` against the actual `SCORE` constants (`js/data.js`) and `WHITE_SLIDE_MS`
(`js/game.js`) with a mechanical Node script (regex-extracting each stated number from the
live HTML and asserting equality against the real constant, not eyeballed) — all 13 checks
passed on the first full run: the 30/100/300 cp thresholds, diamond=3 emeralds, +5 win, +3
The End, move 30 (three separate mentions), the 2-wrong-tries/3-wrong-tries rails hint
sequence, and the "omtrent twee sekondes" White-move-speed claim (now 2000ms, matches
`WHITE_SLIDE_MS`) all matched exactly — no drift found in this file's numbers. One content
gap (not a wrong number): the terugvat paragraph stated "replacement move earns nothing" but
never stated D2's other half, "an undone blunder is forgiven" — added one sentence: "As jy wel
terugvat, tel daardie flater ook nie teen jou Silwer-vlak nie — dis asof dit nooit gebeur het
nie." Did **not** add anything about the move-25 grace move per the card's explicit
instruction — it stays undisclosed to preserve the surprise. Also did a native-level read of
every visible Afrikaans string across all 5 HTML files and `js/data.js`'s `REISIGER`/
`MOVE_COMMENTARY` dialogue objects: found no spelling or grammar errors and no idiom uncertain
enough to flag — the existing copy was already clean.

**Task C — CLAUDE.md brought back into truth:**
* Recorded **D1** (diamonds count ×3 toward Silwer's 12-emerald threshold, display stays
  split) and **D2** (undo forgives a blunder for mastery purposes) directly in §7's Silwer
  bullet, and **D3** (the move-25 reply is never penalised; positive awards still apply;
  must never be disclosed in player-facing copy) in §4 next to the planned-blunder mechanic
  it modifies.
* Found and corrected one genuine constant drift while reconciling the spec: §12's build-log
  paragraph on White's move animation claimed White plays at **1400ms** and Black at
  **200ms** — the actual constants in `js/game.js` are `WHITE_SLIDE_MS = 2000` and
  `BLACK_SLIDE_MS = 350`. Corrected both numbers in that paragraph (two occurrences of the
  White figure, one of the Black figure) to match the code, which is authoritative per this
  card's own rule. Checked all other numbered constants mentioned in the spec (§4's Skill
  Level ≈5–8 / movetime ≈500ms against `PLAY_SKILL_LEVEL = 6` / `PLAY_MOVETIME_MS = 500`;
  §5/§7's rails/hint-escalation/Brons numbers; §6's own scoring table) — all already matched
  the code exactly, no further drift found.
* This entry is the build-log append for this card.

**Judgment call — resignation-check fix's cache-buster bump (§21) landed before this card
started:** Card 6's prerequisite says "Cards 1–5 are merged"; between finishing Card 5 and
starting this card, a separate adjacent-bug sweep (§21) had already bumped `ASSET_V` to 10
for an unrelated fix (the stale-FEN resignation bug in `playWhiteTurn`). This card's own
cache-buster bump (10 → 11) is on top of that, per the standing §12 rule triggered by this
card's own `js/`/`css/` header-comment edits.

**Verification:** Task A's grep was run mechanically (shown above). Task B's number
comparisons were run mechanically via a Node script requiring the real `js/data.js` and
regex-matching the live `how-to-play.html`/`js/game.js` source — not eyeballed. Task C's
drift-check was done by grepping CLAUDE.md for every numeric constant mention and cross
-referencing each against the corresponding `const` in `js/data.js`/`js/engine.js`/`js/game.js`.
Site load/play-through and localStorage-preservation (mastery data surviving the sweep) were
verified by inspection — the sweep touched no `localStorage` key, no JS logic, and no HTML
element `id`/structure, only prose and comments, so no behavioral runtime check was judged
necessary beyond confirming the touched lines are text-only diffs.

---

## 23. Two new mastery tiers (Redstone, Koper) below Brons, stated outright in the app

User feedback: the mastery ladder wasn't explained anywhere in the app (traced in the previous
turn — `how-to-play.html`'s "Vlakke" section only said badges exist and affect biome-selection
weighting, never what actually earns each one), and separately, the user wanted two additional,
easier-to-reach Minecraft-flavoured tiers below Brons so newer/younger players get an earlier
sense of progress. Both addressed together.

**New tiers (§7 updated in place, not just here):**
* **Redstone** — finish a game with ≥ 10 raw emeralds.
* **Koper** — find (play correctly) ≥ 5 theory/opening moves in one game, counted whether the
  emerald was actually paid out or forfeited (Card 3's undo-forfeit rule only withholds the
  reward, not recognition that the move was theory).

Ladder is now `Geen → Redstone → Koper → Brons → Silwer → Goud` (`TIER`/`TIER_ORDER` in
`js/data.js`).

**Implementation:**
* `js/data.js`: `TIER` gained `REDSTONE`/`KOPER`; `TIER_ORDER` gained both in position; new
  `TIER_WEIGHT` map is `{geen:6, redstone:5, koper:4, brons:3, silwer:2, goud:1}` — chosen
  specifically to leave brons/silwer/goud's existing numeric weights (3/2/1) unchanged, so
  players already sitting at those tiers see no shift in how often their biome gets picked.
* `js/game.js`: added a `theoryMovesFound` counter (didn't exist before — the closest existing
  field, `allTheoryCorrect`, has been a hardcoded `true` vestige since before Card 6 flagged
  it). Incremented in both places a theory move is accepted: the strict-rails branch and the
  scored-freedom theory-accepted branch of `handleBlackMove` (the latter increments even when
  `forfeitNextEmerald` withholds the reward). Passed into `endGame`'s `result` object alongside
  the existing fields.
* `js/mastery.js`: `evaluateGameResult` gained two more ascending checks
  (`emeraldsTotal >= 10` → Redstone, `theoryMovesFound >= 5` → Koper) inserted before the
  existing Brons check, following the same unconditional-assign-if-met pattern Brons/Goud
  already used — safe because each check only fires for a strictly higher tier than the one
  before it in evaluation order, so a later, higher-ranked tier always legitimately overwrites
  a lower one rather than accidentally downgrading it.
* `js/home.js`: `tierLabel()` extended with `redstone`/`koper` display names.
* `css/style.css`: added `--redstone` (#e0342f) and `--copper` (#c77b46) custom properties and
  matching `.badge-slot.tier-redstone`/`.tier-koper` label-color rules, alongside the existing
  `--bronze`/`--silver`/`--gold`. These are genuinely new concepts (the tiers didn't exist
  before this session), not a violation of the shared root CLAUDE.md's "don't invent new
  colors" rule, which governs the existing agreed palette, not colors for brand-new tiers.
* `how-to-play.html`: replaced the vague "Vlakke" paragraph with a table stating all 5
  achievable tiers and their exact criteria in plain Afrikaans (kept the existing register:
  emoji + short sentence per row, matching the page's other tables). Move-25 grace is still
  never mentioned anywhere in this file, unaffected by this change.

**Judgment calls:**
* Named the user's unnamed second tier **Koper** (copper) — Minecraft's most basic/common ore,
  reads as a natural "one step up from Redstone, still below the medal tiers" rung.
* "10 emeralds" read as the literal on-screen `emeraldsTotal`, not the diamond-boosted
  "effective" figure Silwer uses — keeps Redstone simple and visibly distinct from Silwer's
  more involved formula.
* Redstone/Koper both require `reachedEndOrWon` just like Brons/Silwer/Goud always have —
  kept the gate consistent rather than loosening it for the new, easier tiers, so an early
  loss still earns nothing at any level.

**Verification:** extended the Card 4-style Node harness (bridging `TIER`/`TIER_ORDER`/
`SCORE`/`GAME_PREFIX`/`TIER_WEIGHT` as globals, then requiring the real, unmocked
`js/mastery.js`) with boundary cases for both new tiers (9 vs. 10 emeralds; 4 vs. 5 theory
moves found), a check that meeting a lower tier's criteria alongside a higher tier's doesn't
prevent the higher tier from winning (monotonic upgrade chain), a check that
`reachedEndOrWon: false` still nulls out every tier including the new ones, and reran every
Card 4 regression case to confirm nothing broke. Also verified `woudTier` (still correctly
returns the lower of two sub-path tiers with the 6-tier `TIER_ORDER`), `upgradeTier` (still
refuses to downgrade a persisted tier), and `pickBiome` (200 runs, always returns a valid
top-level biome id with the new `TIER_WEIGHT` map) — all passed. Did not run a live/Puppeteer
check of the home screen's badge rendering or the new `how-to-play.html` table; both are
straightforward template/CSS changes reusing existing display code paths (`tierLabel`,
`.badge-slot.tier-*`, `.score-table`), so this was judged lower-risk than the mastery-logic
change itself, which was verified mechanically.

**Cache-buster:** bumped `ASSET_V` and every HTML `?v=` reference from 11 to 12, since this
touched `js/data.js`, `js/mastery.js`, `js/game.js`, `js/home.js`, and `css/style.css`.

---

## 24. Root-cause fix for false Gold/verdict reports, checkmate polish, and a win sequence

Reported by the user: 3 games where they were close to being mated still ended in a "Goud"
award, and separately, when White actually checkmates Black, (a) the mate wasn't visible
before the end panel covered the board, and (b) the popup text read like a win. All three
traced to one root cause, plus two smaller, genuinely separate fixes layered on top.

**Root cause — `cloudEval()` (`js/engine.js`) violated its own file's documented contract.**
The header comment states `sfAnalyse`'s cp/mate values are always **side-to-move perspective**,
and `stockfishOnlineAnalyse` correctly converts to that. `cloudEval()` did not — it passed
Lichess Cloud Eval's `pv.cp`/`pv.mate` straight through. Confirmed empirically (not assumed) by
querying the live API on the Fool's Mate position (`.../cloud-eval?fen=...b KQkq...`, Black to
move, mate-in-1-for-Black): Lichess returned `mate:-1`, i.e. "White gets mated" — proof the API
reports **White-absolute** perspective always, regardless of whose move it is. Every consumer
downstream (`evalForWhite`, and `toPerspective` in `js/game.js` which scores every free-play
move for emeralds/diamonds/blunders from move 6 on) assumed side-to-move and flipped the sign
whenever Black was to move — which is exactly the FEN `playWhiteTurn`'s resignation check uses
(right after White's own move). A real crushing White position (+900 white-absolute, correctly
reported as such by Lichess) got double-negated down to -900, tripping
`SCORE.RESIGN_EVAL_FOR_WHITE` and awarding `won: true` — which flows straight into Goud's
`result.won || ...` check regardless of how the game actually went. Fixed by adding the same
`whiteToMove` flip `stockfishOnlineAnalyse` already used. This has a wider blast radius than
just this bug report: it also silently corrupted `toPerspective`'s free-play move scoring
whenever cloudEval (the fastest, most-hit tier) supplied the analysis, so emerald/diamond/
blunder accuracy from move 6 onward should also improve, not just mastery tiers.

**Checkmate not visible before the end panel.** `playWhiteTurn`/`afterBlackMoveAdvance` called
`endGame()` (which immediately does `switchScreen('end')`) the instant `game.in_checkmate()`
was true, with no pause. Added `MATE_PAUSE_MS = 1800` plus a "Skaakmat!" bubble on the
White-mates-Black path before switching screens, so the final position is actually seen. The
Black-mates-White path got the richer treatment below instead of a plain pause.

**"You won" text on an actual loss.** `endGame`'s title/message/face were derived from a live
`evalForWhite(game.fen())` read taken on a position with **no legal moves** — semantically
undefined, and (compounded by the cloudEval bug above) could render a crushing loss as "Jy
staan beter!". Fixed by hardcoding text for the two outcomes that are already deterministically
known the moment they're detected (`mate-by-white` → "Skaakmat" + an honest loss message;
`draw` → its own message) instead of asking a live eval to describe a fact already in hand. The
eval-derived verdict is now used only for `'the-end'`, the one case where the game stopped
without a forced result and "how am I doing?" is a genuinely open question — unchanged there.

**Win sequence (checkmate delivered by Black only — never on a resignation win).** New
`playVictorySequence()` in `js/game.js`, modeled on the existing `playDissolve()` reveal
transition (build DOM burst → toggle `.active` → wait → tear down): ~34 CSS-only vine strands
(`.vine` in `css/style.css`, radial-gradient leaf clusters over a stem, `@keyframes vineDrop`)
fall over the board — semi-transparent, so the mate position stays visible underneath, keeping
the fix above intact — followed ~900ms later by a parchment `#pgn-artifact` panel fading in
with the real finished game's move list via `game.pgn()`, labeled `jy_wen.pgn`. Holds for 5.2s
before tearing down into the normal `endGame({ won: true, reason: 'mate-by-black' })` flow.
Reuses the existing `KKAudio.win()` fanfare (fired once, at sequence start; `endGame`'s own
`KKAudio.win()` call is now skipped specifically for `reason === 'mate-by-black'` to avoid a
double-trigger, but still fires normally for a resignation win). New markup: `#victory-overlay`
/ `#vine-field` / `#pgn-artifact` in `game.html`, sibling to `#dissolve-overlay`.

**Dev/testing cheat code — undocumented on purpose.** Pressing **X** during an active game
(`attachWinCheatCode()` in `js/game.js`) fires the exact same `playVictorySequence()` →
`endGame({ won: true, reason: 'mate-by-black' })` path as a real checkmate, regardless of actual
board state — added so the win sequence could be exercised without playing a full game to mate.
**Judgment call:** deliberately a hidden keyboard shortcut, not an on-screen button — this app's
whole point is the opening-theory/eval scoring loop for an 8–12-year-old on a tablet, and a
visible "instant win" affordance would be a standing temptation to tap. A keyboard-only trigger
has no visual presence for a young player to stumble onto, matching this file's existing
convention (§4, D3) of never disclosing test/mechanic shortcuts in player-facing copy.

**Landing page + spawn icons (separate, smaller asks, same session).** `Landing_Page.png` (only
a `.png` exists; the user said `.jpeg`) moved into `images/` alongside the other AI-generated
art and wired via a new `body.home-landing` class (`index.html`) with a flat 10%-black overlay
(`rgba(0,0,0,0.10)`) for the fade — a uniform wash rather than the top-heavy gradient the
in-game biome themes use, since the home screen has no busy board UI to protect. Separately,
the 4 progress-map badge icons (`js/home.js`) were emoji (`biome.ore`, still used unchanged by
the in-game reveal popup in `js/game.js` — a different element, `.biome-ore`, untouched) —
added a `bg` field per biome in `js/data.js` and swapped the home screen's `.ore-icon` span for
an `<img>` thumbnail of the matching AI-generated background (`bg-vlakte.png` etc; Die Woud
defaults to `bg-woud-bospad.png`).

**Verification:** no chess.js/Puppeteer available in this project (static site, no build step —
consistent with every prior card). The cloudEval fix, the evalForWhite round-trip, and the
endGame title/message/face branch were each verified with isolated Node harnesses reproducing
the exact post-fix logic against real inputs (the live Fool's Mate API response; a simulated
+900-white/Black-to-move resignation scenario; all six `info.reason`/`info.won` combinations for
the text branch) — not eyeballed. The victory sequence, cheat code, landing page, and spawn
icons were checked by cross-referencing every DOM id/class the JS/CSS reference against what
`game.html`/`index.html` actually define (all matched) and confirming every referenced image
file exists on disk; browser automation was offered and declined this session, so none of this
was exercised live in an actual browser — worth a real playthrough to a checkmate when
possible.

**Cache-buster:** bumped `ASSET_V` and every HTML `?v=` reference 12 → 17 across this session's
edits (`js/engine.js`, `js/game.js`, `js/data.js`, `js/home.js`, `css/style.css`, `game.html`,
`index.html`).

---

## 25. Mastery tiers changed from best-of-game to one-rung-per-game gates

User correction to §7/§23's original design (clarified after the fact — the ladder had always
been meant to work this way, this wasn't a new request): a single game should never be able to
jump straight to Goud regardless of how well it's played. Tiers are gates, climbed one rung at
a time — a flawless first game on a fresh biome earns Redstone only; the *next* game there is
"played for Koper," then Brons, then Silwer, then Goud. §7 above was rewritten in place to
describe this (a genuine spec correction, not just a build-log note — the old wording literally
said "awarded the highest tier they qualify for that game," which is exactly the behavior being
reversed).

**Implementation (`js/mastery.js`, `evaluateGameResult`):** the existing five threshold checks
are unchanged and still compute a `naturalTier` — the highest tier this game's raw stats alone
would satisfy, exactly as before (renamed from `achieved` for clarity). What's new: the tier
actually awarded is capped to at most one rung above the path's currently-persisted tier —
`achieved = TIER_ORDER[min(index(naturalTier), index(currentTier) + 1)]`. A game whose natural
stats don't even clear that next rung's bar still earns whatever lower tier (if any) it does
clear, same as always; it just can never overshoot by more than one step regardless of how good
`naturalTier` is.

**Adjacent fix, surfaced by the same change:** `evaluateGameResult` previously returned
`achieved` any time it was non-`GEEN`, even if that tier was *already* the persisted one (or
even lower than it) — harmless before, since a repeat/lower natural tier was rare, but under
gating it becomes the common case (most games won't naturally clear the next rung), so the
`js/game.js` end screen's "Nuwe vlak behaal" (new level reached) message would have fired
constantly and incorrectly. Fixed by only returning (and only calling `upgradeTier` for) a tier
that's a genuine improvement over the currently-persisted one; otherwise returns `null`, which
`js/game.js`'s existing `achievedTier && achievedTier !== TIER.GEEN` check already treats as
"nothing to announce" — no caller change needed.

**`how-to-play.html`:** the closing paragraph under the tier table stated the old model
outright ("Elke vlak is onafhanklik — jy kry altyd die hoogste vlak..."); rewritten to describe
the gate in the same plain terms as this section.

**Verification:** extended the existing Node harness pattern (bridging `TIER`/`TIER_ORDER`/
`TIER_WEIGHT`/`SCORE`/`GAME_PREFIX` as globals, requiring the real, unmocked `js/mastery.js`)
with a full six-game run of Goud-caliber stats replayed on the same fresh path, confirming it
lands on Redstone, then Koper, Brons, Silwer, Goud, then `null` (no further rung) in that exact
order across six consecutive calls — plus a weak-stats-on-a-fresh-path case (nothing earned), a
case where a player already at Brons plays a game whose natural stats only reach Redstone
(confirmed no downgrade and no false "new level" announcement), and the `reachedEndOrWon: false`
case regardless of gate state. All passed. No live/Puppeteer run (unavailable in this project,
per every prior card).

**Cache-buster:** bumped `ASSET_V` and every HTML `?v=` reference 17 → 18, since this touched
`js/mastery.js` and `how-to-play.html`.
