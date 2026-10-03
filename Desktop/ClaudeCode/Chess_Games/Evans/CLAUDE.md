# Stoomdruk: Kaptein Evans se Kelpwoud

*Working title.* An Afrikaans chess training game that teaches the **Evans Gambit** to a 9-year-old rated about 1600. He always plays White. Each round follows one named Evans line chosen by the app. When he plays the line correctly, that line's branch on a big kelp tree turns green. When he also turns the gambit's compensation into a real advantage by the end of move 20, the branch turns gold.

**The lesson behind everything:** in the Evans, White gives up a pawn (sometimes two or three) to gain time. Material lasts, but time doesn't. The *Stoomdruk* gauge makes the compensation visible: what did your pawn buy, and are you spending it before it runs out?

This file is the build spec. The data the game needs is already computed: `data/evans_canon_app.json`. Do not hardcode opening lines anywhere; everything comes from that file.

---

## 1. Stack and layout

- **React + Vite + TypeScript**, static single-page app, deploy to Netlify. No backend.
- **chess.js** for rules, SAN and FEN.
- **react-chessboard** for the board (needs custom square styles and arrows).
- **Stockfish WASM** (npm `stockfish`, single-threaded lite build) in a **Web Worker**, behind one queued `EngineService`.
- **d3-hierarchy** for the tree layout only; render the tree as React SVG.
- **localStorage** for progress (see section 13), with every read and write wrapped in try/catch.
- No sound in v1. Respect `prefers-reduced-motion`.

```
/data/evans_canon_app.json      the canon (do not edit by hand)
/tools/canon_builder.py         rebuilds the canon (Python, python-chess, Stockfish)
/tools/evans_master_games.pgn   the master games it was built from
/src/engine/EngineService.ts    Stockfish worker + queue
/src/game/round.ts              round state machine (sections 3 to 7)
/src/game/targets.ts            target choice (section 8)
/src/game/scoring.ts            points (section 6)
/src/ui/Board, Stoomdruk, Captain, Kelpwoud, RoundEnd ...
/src/content/kaptein.ts         every Afrikaans string (section 12)
```

---

## 2. The data file

`data/evans_canon_app.json`, built by `tools/canon_builder.py`. It covers every named Evans line in the Lichess opening list (51 lines) plus every continuation played in at least 2 master games (both players rated 2200+), up to the end of move 16.

### 2.1 Position key

Nodes are keyed by **position, not move order**, so transpositions merge. The key is the first four FEN fields (placement, side to move, castling, en passant), with the en-passant square kept **only when an en-passant capture is actually legal**; otherwise it is `-`. Use exactly this helper:

```ts
export function posKey(chess: Chess): string {
  const [placement, side, castling, ep] = chess.fen().split(' ');
  let epField = '-';
  if (ep !== '-') {
    const epLegal = chess.moves({ verbose: true }).some(m => m.flags.includes('e'));
    if (epLegal) epField = ep;
  }
  return `${placement} ${side} ${castling} ${epField}`;
}
```

### 2.2 Shape

```jsonc
{
  "meta": { "entry": ["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"], "rootKey": "<key after 4.b4>", "capPly": 32, ... },
  "lines": [ {
      "id": "stone-ware-variation",
      "name": "Evans Gambit, Stone-Ware Variation",   // Lichess name
      "label": "Stone-Ware Variation",                // shown to the player
      "sub": "5...Bd6",                               // defining move, shown under the label
      "movesSan": ["e4","e5", ...], "movesNumbered": ["1.e4","1...e5", ...],
      "plies": 10, "endKey": "<key>",
      "parent": "evans-gambit-accepted",              // for drawing the tree (strict tree)
      "frondPlies": 2,                                // plies from parent's end to this end
      "famous": true, "reef": false, "games": 58
  } ],
  "nodes": { "<key>": {
      "fen": "...", "ply": 9, "toMove": "w",
      "eval": 54,              // centipawns, White's view, Stockfish depth 18 (mate = +-10000)
      "material": -1,          // White minus Black, pawns (P1 N3 B3 R5 Q9)
      "debt": 1,               // max(0, -material)
      "steam": 1.54,           // Stoomdruk in pawns (section 9)
      "best": "d4",
      "top2": [{"san":"d4","uci":"d2d4","cp":54},{"san":"O-O","uci":"e1g1","cp":31}],  // White-to-move nodes only
      "endOf": ["stone-ware-variation"],   // named lines that END at this position
      "reach": ["stone-ware-variation"],   // named lines still reachable from here (including endOf)
      "toward": { "<lineId>": "<uci>" },   // the canon move that heads for each reachable line
      "moves": [{"uci":"d2d4","san":"d4","games":31,"named":false,"to":"<key>"}],  // canon moves from here
      "chartEnd": false                    // true = no canon moves: the engine takes over here
  } }
}
```

Labels are not unique on their own (there are three Lichess lines called just "Evans Gambit"). Always show `label` together with `sub`, and use `id` everywhere in code and storage.

---

## 3. A round

1. **Choose the target line** (section 8) and show the round intro: `Hierdie rondte speel ons die "{label}".`
2. **The entry (moves 1 to 4) is forced.** He must play 1.e4, 2.Nf3, 3.Bc4, 4.b4; Black's replies (e5, Nc6, Bc5) are automatic. Any other move snaps back and the Captain says `Ons vaar na die Evans: speel {move}.` These moves are not scored.
3. **Chart phase** (from Black's 4th move): Black steers towards the target using the data (section 4). This lasts until the chart ends (`chartEnd`), he leaves the chart, or move 16 is complete.
4. **Engine phase:** Stockfish plays Black (section 5) until the round ends.
5. **The round ends** after Black's 20th move, or earlier on checkmate, stalemate or a draw.
6. **Colouring** (section 7), then the round-end screen and back to the Kelpwoud.

**No move is ever prevented after 4.b4.** Every legal move is accepted. What a move changes is its points, the Captain's message, whether play stays on the chart, and whether the target can still be conquered.

---

## 4. The chart phase

Round state: `target` (line id), `onChart` (bool), `conqueredThisRound` (set of line ids), and `prevWhiteNode` (the node before his last move).

### 4.1 After every move while on the chart

For each `id` in `node.endOf`, add it to `conqueredThisRound` and show `LINE_CONQUERED` for that line (at most one message per move; prefer the target). Conquest is position-based, so reaching a line's end by a different move order counts.

### 4.2 Black's turn (on the chart)

```
node = nodes[posKey]
if node.chartEnd:                       -> onChart = false; Captain CHART_END; engine phase
elif target in node.toward:             -> play node.toward[target]
else:                                   // target conquered already, or unreachable
    open = node.reach minus conqueredThisRound
    if open is not empty:
        target = chooseTarget(open)     // same weights as section 8
        Captain CHAIN                   // "Ons hou aan: volgende vaar ons na die ..."
        play node.toward[target]
    else:
        play one of node.moves, weighted by games
```

Add a natural thinking delay of 400 to 900 ms before Black moves.

### 4.3 His turn (on the chart)

Let `before = nodes[posKey before his move]`, and `needed = before.toward[target]` (the move the target required, if any).

| He plays | Points | What happens |
|---|---|---|
| A canon move (`before.moves`) that keeps the target reachable (`target in nodes[after].reach`), or any canon move once the target is already conquered | 4 | Stay on the chart. Short `LINE_MOVE` praise, occasionally. |
| A canon move that makes the target unreachable | 4 | **Re-target** (4.4). Stay on the chart. |
| Not a canon move, but one of the engine's top two (4.5) | 4 | Leave the chart; engine phase from now. If there is a target and it is not yet conquered: `TOP_TWO` prefix + `MISSED` popup. Otherwise `OFF_CHART`. |
| Anything else | engine-scored (section 6) | Leave the chart; engine phase from now. If there is a target and it is not yet conquered: `MISSED` popup. Otherwise `OFF_CHART`. |

### 4.4 Re-targeting

```
after   = nodes[key after his move]
landed  = after.endOf                         // lines ending right here (e.g. Slow Variation after 6.O-O)
open    = after.reach minus conqueredThisRound minus landed
if landed or open:
    shown  = landed[0] if landed else chooseTarget(open)
    target = chooseTarget(open) if open else shown
    popup RETARGET with {line} = shown
    small second line: RETARGET_NOTE with the old target and needed
else:
    popup MISSED
    target = none                             // lost for this round: play stays on the chart,
                                              // Black follows master moves (4.2), no second MISSED
```

Example: target "Pierce Defense", he plays 6.O-O instead of 6.d4. The popup says `Geen probleem, jy het sopas oorgeskuif na die "Slow Variation".`; Slow Variation is conquered on the spot, and the new target is chosen from what is still reachable (for example "Lasker Defense").

### 4.5 "Top two"

From `before.top2` (precomputed, depth 18):
- The best move always counts.
- The second move counts only if it is within `TOP2_TOLERANCE_CP` (30) of the best. In some positions the engine's second choice loses material; it is not protected.

### 4.6 The MISSED popup

- Text: `Om die "{line}" lyn te ontsluit moes jy hierso {move} gespeel het.` with `{move}` numbered SAN (for example `6.d4`).
- Show a small mini-board inside the popup with the position before his move and an arrow for the needed move. This is how he learns the line through repetition.
- Save the needed move as `lastMissed` on that line (section 13); the line's card on the tree shows it.
- The popup does not block the game: it auto-closes after 7 seconds, or with a tap.

---

## 5. The engine phase

**Black's move:** Stockfish **depth 6, MultiPV 3**. Keep the candidates whose score (from Black's side) is within `BLACK_WINDOW_CP` (50) of the best, and choose one uniformly at random. Mate scores count as +-10000. Thinking delay 400 to 900 ms.

Why the window: a test of 140 Black decisions showed that choosing freely among the top three gave away more than a pawn on about 1 move in 5. With the 50-centipawn window, that dropped to about 1 in 16.

**Analysis** (for the gauge and for points): after every half-move, analyse at **depth 14** (MultiPV 2 when White is to move), capped at 2.5 seconds. Depth 6 is too noisy for the gauge: in testing it differed from a deep search by more than three-quarters of a pawn on 1 position in 10.

**EngineService** runs one worker with a queue: Black's move search first, then the analysis. If he moves before the analysis of his position has finished, wait for it to reach at least depth 10 (show a small "Die Kaptein dink...").

---

## 6. Points

Moves 5 to 20 are scored, 1 to 4 points each: **64 maximum** per round.

- **4:** a canon move on the chart, or a top-two move (4.5), or a move losing at most 25 centipawns.
- **3:** loses at most 60 centipawns.
- **2:** loses at most 120.
- **1:** anything worse.

Loss = the best move's eval before his move minus the eval after his move (both from White's side). On the chart, "before" comes from the data (`before.eval`, `before.top2`); "after" comes from the runtime analysis. If he gives mate, every unplayed move scores 4. If he is mated, unplayed moves score 0.

---

## 7. Conquest and colouring

Every line is in one of three states, and **a state never goes down**:

| State | Meaning |
|---|---|
| **Grey** | Not yet conquered. |
| **Green** | Its end position was reached **while on the chart** in some round. |
| **Gold** | Green in a round that he also **capitalised**. |

**Capitalised** means one of:
- after Black's 20th move, the eval from White's side, at depth 16 or more, is at least `GOLD_EVAL` (+1.00 pawns); on the gauge, the needle is at least one pawn above the red mark;
- or he delivered checkmate.

A draw or stalemate does not capitalise.

At the end of a round, every line in `conqueredThisRound` becomes green, or gold if the round was capitalised. This includes the shallow lines passed on the way (Accepted, Main Line, Pierce Defense...), so the tree greens from the trunk outward. The root line "Evans Gambit" (4.b4) is reached in every round.

Calibration of +1.00: I simulated play from 12 chart-end positions to move 20 against the engine Black above. A strong White finished at +1.00 or better in 7 of 12 games; a weaker, 1600-style White in 6 of 12. So gold is earned in roughly half of good games. Tune `GOLD_EVAL` after real play.

---

## 8. Choosing the target

The pool is every line except the root `evans-gambit` (4.b4) and except the last 2 targets.

1. Choose a state class: grey 70%, green 25%, gold 5%. Renormalise over the classes that are not empty.
2. Within the class, weight each line by `(famous ? 3 : 1) * (1 + log10(1 + games))`.

Use the same weights for `chooseTarget(open)` during the round (sections 4.2 and 4.4), restricted to the open lines.

---

## 9. Stoomdruk (the steam gauge)

A boiler pressure dial beside the board, always visible from 4.b4 onward.

- **Steam** = `clamp(eval / 100, -15, 15) + debt`, in pawns, where `debt = max(0, -material)` (the pawns White has invested).
- **Red mark** at `debt`. The needle above the red mark means White is better (eval > 0); below it, the compensation isn't paying for the pawn. When he wins material back, the debt shrinks and the red mark visibly slides down (`DEBT_PAID`).
- **Gold mark** at `debt + GOLD_EVAL`: the line he needs to be above at move 20 for gold.
- **Dial range** -2 to +8 pawns (clamp the needle). Zones:
  - above the gold mark: gold, "Volstoom"
  - between the red and gold marks: green
  - from 0 up to the red mark: amber, "Die stoom lek"
  - below 0: cold blue, "Die ketel is koud"
- **Source:** on the chart use `node.steam` from the data (no noise, no waiting). In the engine phase use the runtime analysis, smoothed: `shown = 0.5 * new + 0.5 * previousShown`.
- **Animation:** move the needle over 600 ms. A zone change triggers the Captain's `STEAM_*` line, at most once every 3 moves.

The round-end screen draws the steam over the whole game as a line, with the red mark and gold mark as step lines, so he can see where the pressure leaked.

---

## 10. Bakboord and Stuurboord

White's two bishops have names and ship's lights (Captain Evans invented the red and green navigation lights):

- **Bakboord** is the dark-squared bishop (from c1; in the Evans it goes to a3 or b2). It has a **red** light.
- **Stuurboord** is the light-squared bishop (from f1; in the Evans it sits on c4). It has a **green** light.

On the board, each bishop has a soft halo in its colour. Squares on its open diagonals get a faint tint in that colour. The beam brightens, with a small sparkle, when:
- Stuurboord attacks **f7**;
- Bakboord attacks **f8 or e7** while Black's king is still uncastled (Ba3 stops ...O-O).

The Captain mentions each only once per round (`BISHOP_*`). Add a setting to switch the lights off.

---

## 11. Die Kelpwoud (the tree)

The home screen, and the heart of the game: one big underwater kelp forest that holds every named Evans line. It starts all grey. As he conquers lines, their fronds turn green and then gold.

**Scene**
- Seabed at the bottom. The holdfast there is the root line "Evans Gambit" (4.b4).
- Water fading lighter upward, with soft light shafts.
- At the surface, a small silhouette of Evans's paddle steamer *Vixen*, red light on its left (port) side and green on its right (starboard).
- The kelp is modelled on the Cape's **sea bamboo** (*Ecklonia maxima*): a long stipe with a gas-filled bulb at the top and fronds streaming from it.

**Structure**
- Each line is one stipe growing from its parent's bulb (`parent`), ending in its own **bulb** (the clickable node).
- Stipe length is proportional to `frondPlies` (about 26 px per ply, minimum 40 px), so long lines dangle long.
- Lines with no children carry long streaming fronds.
- Lay out with `d3.tree` (root at the bottom, growing up), then draw each stipe as a gentle Bezier curve.
- Animate a slow sway, like a current (CSS transforms only; off under reduced motion).
- The forest is wider than a phone screen: allow pan and pinch-zoom, and start zoomed to fit.

**States**
- **Grey:** desaturated, semi-transparent.
- **Green:** living kelp green.
- **Gold:** gold, with a slow shimmer on the bulb.

Each stipe takes its own line's state, so the path from the holdfast to a gold line can still show grey side branches.

**Flags**
- **Famous lines:** slightly thicker stipe, label always visible. Other labels show on hover or tap.
- **Reef lines** (`reef: true`, the 4...Bb6 5.b5 family): barnacle-rough edges and a rust-red outline, whatever their state. Card note: `Pas op: hierdie lyn is teorie, maar riskant vir Wit.`

**Tap a bulb** to open a card with:
- label and `sub`, plus the full Lichess name in small text;
- the state, and how many times the line was played, turned green, and turned gold;
- if green or gold: the line's moves from 4.b4 on (`movesNumbered`), as a reward and a study aid;
- if he has missed it before: `Laas moes jy hierso {move} speel.`

**Counter** at the top: `Groen 12/50 · Goud 4/50` (the root is not counted).

**After a round:** pan to the lines that changed, pulse their bulbs, and send up a few bubbles as the colour fills in.

---

## 12. Kaptein Evans (all strings)

The voice: a 19th-century Welsh packet-ship captain who speaks warm, short, punchy Afrikaans with a few Welsh words (*Da iawn* = very good, *Bendigedig* = wonderful, *Ardderchog* = excellent, *Hwyl fawr* = goodbye). Sentences stay short; chess terms are fine. Keep every string in `src/content/kaptein.ts`. Where a category has several lines, pick one at random. `{line}` is a label in quotes; `{move}` is numbered SAN.

These three are Martin's own wording; keep them exactly:
- `ROUND_START`: `Hierdie rondte speel ons die "{line}".`
- `RETARGET`: `Geen probleem, jy het sopas oorgeskuif na die "{line}".`
- `MISSED`: `Om die "{line}" lyn te ontsluit moes jy hierso {move} gespeel het.`

The rest are drafts for Martin to edit:

| Key | Lines |
|---|---|
| `ROUND_FLAVOUR` | `Die gety is reg, matroos. Gooi die lokaas!` · `Stoom op! Die kaart lê oop.` |
| `ENTRY_WRONG` | `Ons vaar na die Evans: speel {move}.` |
| `BAIT` (4.b4) | `Die lokaas is in die water.` |
| `BLACK_ACCEPTS` (4...Bxb4) | `Die vis byt!` |
| `BLACK_DECLINES` (4...Bb6) | `Die vis kyk en swem verby.` |
| `COUNTERGAMBIT` (4...b5, 4...d5) | `Die vis byt terug! 'n Teengambiet.` |
| `GREEDY` (7...dxc3) | `Die gulsige vis sluk die hoek, lyn en sinker!` |
| `SPITS_HOOK` (Lasker Defense reached) | `Die vis spoeg die hoek uit. Hy wil die pion teruggee.` |
| `LINE_MOVE` | `Da iawn! Reg op koers.` · `Presies volgens die kaart.` · `Bendigedig!` · `Die kompas wys reg.` |
| `LINE_CONQUERED` | `Die "{line}" is joune! Die blaas word groen.` |
| `CHAIN` | `Ons hou aan: volgende vaar ons na die "{line}".` |
| `RETARGET_NOTE` (small, under RETARGET) | `(Vir die "{line}" moes jy hierso {move} gespeel het.)` |
| `TOP_TWO` (prefix to MISSED) | `Sterk skuif! ` · `Ardderchog, dis 'n topskuif! ` |
| `OFF_CHART` | `Ons is van die kaart af. Van nou af stuur jy self.` |
| `CHART_END` | `Die kaart is klaar. Van hier af is dit oop see.` |
| `STEAM_GOLD` | `Volstoom! Die ketel sing.` |
| `STEAM_GREEN` | `Goeie druk. Hou die vuur aan die brand.` |
| `STEAM_AMBER` | `Die stoom lek! Wat het jou pion gekoop?` |
| `STEAM_COLD` | `Die ketel is koud. Kry die vuur weer aan.` |
| `DEBT_PAID` | `Skuld betaal! Nou is dit wins.` |
| `POINTS_4` | `Ardderchog!` · `Netjies.` |
| `POINTS_3` | `Goed. Daar was 'n effens vinniger koers.` |
| `POINTS_2` | `Die enjin hik.` |
| `POINTS_1` | `Oeps. Daar's 'n gat in die romp.` |
| `BISHOP_STUURBOORD` | `Stuurboord se lig skyn op f7!` |
| `BISHOP_BAKBOORD` | `Bakboord sluit die deur. Die koning kan nie kasteel nie!` |
| `END_GOLD` | `Goud! Jy het die pion belê en die wins ingebring. Hwyl fawr!` |
| `END_GREEN` | `Groen! Die lyn is joune. Volgende keer: maak die stoom wins.` |
| `END_MISSED` | `Die lyn het weggeglip. Die kaart onthou wat jy moes speel.` |
| `END_WHITE_MATES` | `Skaakmat! Die vangs van die dag!` |
| `END_WHITE_MATED` | `Ons het gesink. Maar elke kaptein word een keer nat.` |
| `END_DRAW` | `Remise. Die see is kalm vandag.` |

Pacing: at most one Captain line per half-move. Popups (RETARGET, MISSED) take priority over the speech bubble. Points reactions only in the engine phase or for non-canon moves.

The UI is Afrikaans throughout; line names stay in English as proper nouns, in quotes.

---

## 13. Storage

One key, `stoomdruk.v1`:

```jsonc
{
  "profile": { "name": "" },
  "lines": { "<lineId>": { "state": "grey|green|gold", "played": 0, "green": 0, "gold": 0,
                           "lastMissed": { "move": "6.d4", "date": "2026-10-02" } } },
  "rounds": [ { "date": "...", "target": "<lineId>", "conquered": ["..."], "gold": false,
                "score": 41, "finalEval": 0.62 } ],          // keep the last 100
  "recentTargets": ["<lineId>", "<lineId>"],
  "settings": { "bishopLights": true }
}
```

`played` counts rounds where the line was the target (including re-targets). A missing or unreadable store means a fresh, all-grey forest; the game must still work.

---

## 14. Screens

1. **Kelpwoud (home):** the forest fills the screen. Counter at the top; the button `Begin rondte` at the bottom.
2. **Round intro:** an old sea-chart card with `Hierdie rondte speel ons die "{label}".`, the `sub` move, and a `ROUND_FLAVOUR` line. Button: `Gooi die lokaas`.
3. **Game**
   - Board on the left (on top on a phone).
   - Panel with: the target banner (label + sub, updated on re-target or chain), the Stoomdruk dial, the Captain's speech bubble, the move list with a small points chip on each of his moves, `Skuif 7/20`, and `Punte 23`.
   - Last move highlighted. No hints, no takebacks.
4. **Round end**
   - The score out of 64.
   - The lines coloured this round, as green or gold chips.
   - The steam graph (section 9).
   - Up to three key moments: the missed line move, the biggest steam drop, and his best engine-phase move.
   - Buttons: `Nog 'n rondte` and `Terug na die Kelpwoud` (which plays the colouring animation).

---

## 15. Config (one file, `src/config.ts`)

| Name | Default | Used in |
|---|---|---|
| `TOP2_TOLERANCE_CP` | 30 | 4.5 |
| `BLACK_ENGINE_DEPTH` / `BLACK_MULTIPV` / `BLACK_WINDOW_CP` | 6 / 3 / 50 | 5 |
| `ANALYSIS_DEPTH` / `ANALYSIS_MAX_MS` / `ANALYSIS_MIN_DEPTH` | 14 / 2500 / 10 | 5 |
| `FINAL_EVAL_DEPTH` | 16 | 7 |
| `GOLD_EVAL` | 1.00 (pawns) | 7, 9 |
| `POINT_BANDS_CP` | 25 / 60 / 120 | 6 |
| `CLASS_ODDS` | grey .70 / green .25 / gold .05 | 8 |
| `FAMOUS_WEIGHT` | 3 | 8 |
| `RECENT_EXCLUDE` | 2 | 8 |
| `MOVES_PER_ROUND` | 20 | 3 |
| `STEAM_SMOOTHING` | 0.5 | 9 |

---

## 16. Edge cases

- A canon move that transposes into the target's path by another move order: the target stays reachable (`reach` is position-based), so nothing is said.
- The target is already conquered, or already lost (4.4), when he leaves the chart: no MISSED popup, just `OFF_CHART`.
- The chart ends on his turn (`chartEnd` on a White node): he simply plays on; the engine phase starts with Black's next move.
- Lines that end on a White move (Slow Variation 6.O-O, Tartakower Attack 7.Qb3, Fraser Attack 10.Qa4...) are conquered the moment he plays that move.
- A short line such as the Fontaine Countergambit (4...b5) has no master continuation, so the engine phase starts at move 5.
- A draw by repetition or stalemate before move 20 ends the round: final eval 0, no gold.
- If the Stockfish worker fails to load, show a friendly message (`Die enjinkamer is toe. Probeer weer.`) and do not start a round.

---

## 17. Acceptance checks

Automate these with fixed random seeds:

1. Target "Stone-Ware Variation": Black plays 4...Bxb4, and after 5.c3 plays 5...Bd6. The line turns green at the end of the round.
2. Target "Pierce Defense", he plays 6.O-O: RETARGET popup naming "Slow Variation"; Slow Variation is conquered; the target banner changes.
3. Target "Pierce Defense", he plays 6.d3: not canon and not in the top two, so MISSED with `6.d4`, and the engine phase starts. (6.Qb3, by contrast, is canon: it re-targets or, if nothing is reachable, loses the target while staying on the chart.)
4. Lasker Defense reached by 6.d4 d6 7.O-O Bb6 (not the named order): Lasker Defense is conquered.
5. Target "Fontaine Countergambit": the engine phase starts at move 5.
6. A gold line stays gold after a bad round.
7. For every node, every id in `reach` (except those in `endOf`) has a `toward` entry, and every `toward` move is legal in `fen`. `tools/check_canon.py` checks this and simulates thousands of chart phases under these rules; port its round logic as the reference for `round.ts` tests.
8. A round ends after Black's 20th move with exactly 16 scored White moves.

---

## 18. Not in v1 (ideas for later)

- **"Wat het jou pion gekoop?"**: at three checkpoints the Captain asks what the pawn bought (development lead, king stuck in the centre, open lines, centre, Black's bishop wasting time), and he taps an answer.
- **Die Wrakduiker:** replay famous Evans games (Evans v McDonnell, Anderssen v Dufresne 1852, Fischer v Fine 1963, Kasparov v Anand 1995) by guessing the master's moves.
- **Bakboord en Stuurboord tactics harbour:** short puzzles on the Evans motifs, aimed at the motifs he missed.
- Several player profiles; sound.

---

## 19. Rebuilding the data

```
pip install chess
python tools/canon_builder.py --pgn tools/evans_master_games.pgn --stockfish /path/to/stockfish \
    --min-games 2 --max-ply 32 --depth 18 --out evans_canon.json --app-out data/evans_canon_app.json
```

With a larger game database (for example a Lichess masters export, or `--lichess-masters`), raise `--min-games` to keep the tree a similar size; `--sweep` prints the tree size for several thresholds. The famous list and the reef rule live at the top of `canon_builder.py`.
