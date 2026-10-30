# Stoomdruk: Kaptein Evans se Kelpwoud

*Working title.* An Afrikaans chess training game that teaches the **Evans Gambit** to a 9-year-old rated about 1600. He always plays White. Each round follows one named Evans line chosen by the app. When he plays the line correctly, that line's branch on a big kelp tree turns green. When he also turns the gambit's compensation into a real advantage by the end of move 20, the branch turns gold.

**The lesson behind everything:** *Die pion wen vir ons druk.* In the Evans, White gives up a pawn (sometimes two or three) to gain time, and time only lasts while every move asks Black a question. *Druk* (pressure) means: Black has to answer every move, so he never gets the free move he needs to enjoy his extra pawn. The *Stoomdruk* needle shows how big a question his last move asked; the plaque under it shows what he paid. Black is more likely to slip when the road is narrow, so pressure pays off the way it does against a human.

This file is the build spec. The data the game needs is already computed: `data/evans_canon_app.json`. Do not hardcode opening lines anywhere; everything comes from that file.

---

## 0. As built (October 2026) — overrides the sections below where they differ

**Live:** https://stoomdruk-evans.netlify.app (Netlify site `stoomdruk-evans`, CLI deploy; commands and history in `NEXT_STEPS.md`). Every `npm`/`npx` needs `export PATH="/usr/local/opt/node/bin:$PATH"` first. Check that `vite build` succeeds before testing.

- **Look:** painted Kelpwoud — turquoise water to deep teal, sunbeams, misty distant kelp, watercolour texture (`assets/wash.webp`). Grey lines are translucent washes; green/gold lines are saturated and inked (dark teal, `vector-effect: non-scaling-stroke`). Fonts bundled via npm: **Rye** for titles/buttons/labels, **Zilla Slab** for reading text.
- **Rope:** thin nine-slice rope (`assets/rope.svg`) on cards, briefs, popups, panels, speech bubble; a thicker twisted rope with corner knots frames the Kelpwoud (`ui/RopeFrame.tsx`).
- **Sea life** (`ui/Creatures.tsx`, always behind the kelp): fish families in six colours (one colour per school); crabs visit about every 3 min; visitors: moray eel every 2 min, dolphin every 4, whale shark every 7. **Cheat keys on the Kelpwoud: E eel, D dolphin, W whale shark.** None under reduced motion.
- **Art (interim):** Captain's four mood faces and the *Vixen* from `art/`; mood per line in `MOOD` (`content/kaptein.ts`). Badge emblem from the artist brief (`assets/emblem.webp`, ribbon blank).
- **Round flow:** while he admires the forest, the next round is prepared (engine warm, target chosen, images preloaded), so the brief opens at once. The **brief** sits over the Kelpwoud: camera glides to the target, its route glows, the card lists the route's stages, and its moves once the line is green (`Ek is gereed!`). (The `theoryDip` note was retired on 28 Oct; `routeLow` stays for a later curriculum.) **Begin oor** (two clicks: `Seker? Kliek weer`) abandons the round, saves nothing, and starts a new round with a new target and brief.
- **MISSED popup** replays: his game from 4.b4, a pause on the needed move (green arrow), the line's route to its end, a 5 s freeze (`ui/MiniReplay.tsx`).
- **Badges** (`game/badges.ts`): 12 lines (Pierce, Morphy, Bronstein, Slow, Anderssen Variation, Stone-Ware | McDonnell Defense, Mayet, Declined 5.a4, Declined 4...Bb6, Hein, Fontaine) earn a badge when they turn gold; shown only when earned, six a side of the Kelpwoud, with an arrival animation the first time.
- **Game background:** a random photo per round from `assets/backgrounds/` (Unsplash, credits in `CREDITS.md`) under a dark wash. Any `.webp` added there joins the rotation.
- **Kelpwoud extras:** wavy rope frame with corner knots; side decor (foreground kelp, rocks, anchor) and a left/right vignette (`ui/EdgeDecor.tsx`); the Hoof-wapen under the title; the button `Hoekom speel ons soms die Evans?` opens the lesson popup (`aas_baas` picture + the Captain's text in `UI.whyText`). The teaching image is **bait** (lokaas), not coal: *Die pion wen vir ons druk.*
- **MISSED replay** waits 1 s, plays from 1.e4 at half speed.
- **Captain's lines** are Martin's own wording now (`content/kaptein.ts` is the source; §12's table is the original draft).

### 0.1 The pressure redesign (28 October 2026): overrides §5, §7, §9 and §14 where they differ

Why: a review found the game rewarded following the route, not understanding the trade. The needle showed the plain eval (0.0 read amber, so 4.b4 itself read "Die stoom lek effens", and 43% of perfect route positions read amber or cold); the pawns he had paid were invisible; and Black's 50 cp window removed exactly the slips that make gambits work against humans.

- **Needle = pressure** (§9): what Black would lose by skipping his move after his last move (null move). Precomputed for every Black-to-move canon node (`press`, `tools/add_pressure.py`, depth 16); in open sea two depth-12 searches. Zones: cold < 0.5, amber < 1.1, green < 3.5, gold ≥ 3.5 pawns, sitting exactly on the painted ticks (−1, =, 1); `PRESS_FULL` 6 reaches the right tick. Code: `game/pressure.ts`.
- **Pawn ledger** under the dial: *Lokaas* with one pawn per pawn invested, *Vangs* (gold pawns) when he is ahead, *Gelyk* when level (`ui/Stoomdruk.tsx`).
- **Pressure-sensitive Black** (§5): when his last move asked ≥ 0.8 pawns (or gave check) and Black has exactly one candidate inside the 50 cp window, Black misses it with probability `CRACK_P` (0.3) and plays the best of the unsafe candidates. Never on an obvious take-back. After his reply the Captain names it (`CRACK_CAUGHT` / `CRACK_ESCAPED`), only if the slip really cost Black ≥ 0.5 at depth 14. Simulation (360 games from chart ends to move 20): gold for a pressing / quiet club White went from 13% / 17% without slips to 38% / 28% at 0.3 (43% / 30% at 0.5).
- **"Wat het jou pion gekoop?"** checkpoints (§9a) before his 9th, 13th and 17th moves while he is a pawn or more down.
- **Brief:** for a grey line the stages only (`UI.routeHidden`); the moves appear once the line is green, as on the Kelpwoud card. The theory-dip note is gone (the needle no longer follows the eval).
- **Captain:** `QUESTION` ("Wat vra jou skuif vir Swart?") is added after `CHART_END`, after a cold needle in open sea, and after every checkpoint answer. Leak lines (amber/cold) only in open sea and only while he has a pawn invested. `whyText` now says *pion* (not *stuk*), defines *druk*, and explains the needle and the plaque.
- **Round end:** two small charts on one move axis (pressure bars per move, quiet moves dim; the eval line below), the checkpoint tally, and two new moments: Black's slip (`crack`) and his quietest open-sea move while invested (`quiet`). At most three moments.

**Second pass, 28 Oct evening (after Martin's first play-test):**
- **Plaque split** (`game/ledger.ts`): *Lokaas* is only material given on the opening route (the gambit's own sacrifice; it shrinks as he wins it back and never grows after the route); *Verloor* is anything else he is down; *Vangs* anything he is up; shown as piece icons. Knights and bishops count as one class, so a bishop-for-knight trade nets to nothing. Checkpoints, leak lines and `DEBT_PAID` follow the lokaas, not the material.
- **Needle caption:** "Druk van 9.Qb3" under the dial, so it is clear which move the reading belongs to.
- **Checkpoints wait for calm** (§9a): never while he is fighting for his life.
- **Soft curriculum** (§8): new lines come in by tier, never shut, interleaved; gold lines keep returning.
- **Die Spookskip** (§11a): the contrast film, once after his third round and from the lesson popup.
- **No cheering for forced moves** (§12): a good move he had to play still scores, but the Captain says `FORCED` / `RESCUE` instead of the usual praise.
- **Sea life:** the whale shark's and the dolphin's dorsal fins now sweep back toward the tail (they leaned forward).

### 0.2 Toernooi mode and the roadmap (30 October 2026)

- **Easier Black everywhere:** `BLACK_ENGINE_DEPTH` 6 → 5.
- **Toernooi** (`Speel 'n toernooi` on the Kelpwoud; `RoundController` with `mode: 'toernooi'`): he must play 1.e4, 2.Nf3, 3.Bc4, 4.b4 (Black's e5, Nc6, Bc5 are automatic); Black's 4th move is drawn from the master replies after 4.b4, weighted by games + 1 (so mostly 4...Bxb4, sometimes 4...Bb6, rarely the countergambits). Then open play, no chart, no target. Moves 5–20 are engine-scored as usual.
- **Black in a toernooi:** the normal engine Black (depth 5, 50 cp window, cracks under pressure), plus a **wobble**: with `TOERNOOI_WOBBLE_P` (0.1) per move, a random candidate costing Black `WOBBLE_MIN_CP`–`WOBBLE_MAX_CP` (50–150) from a MultiPV `WOBBLE_MULTIPV` (8) search (`wobbleMove`, `game/pressure.ts`). **Perfect Black:** from his 16th move on (`PERFECT_FROM_PLY` 31), once White is `PERFECT_EVAL_CP` (+3.00) or better, Black plays its best move at `PERFECT_DEPTH` 12 to the end of the game, no cracks, no wobbles (`ctl.perfect`, sticky).
- **No aids:** no needle, plaque, Captain (he speaks only the end line: `END_TOERNOOI_WON` / `END_TOERNOOI` / the mate and draw lines), checkpoints, bishop lights or points chips; the panel shows `Toernooi`, the entry instruction, the move number and the move list. The end card shows the score, the split `Skuiwe n/64 · Bonus b`, and the eval chart without the pressure bars.
- **Bonus:** `TOERNOOI_BONUS` (10) if the final eval is ≥ `GOLD_EVAL`; `TOERNOOI_BONUS_MATE` (20) for giving mate (plus 4 per unplayed move, as in verkenning).
- **Records:** two separate top scores in the store, `best.verkenning` and `best.toernooi` (filled in from old rounds on first load), shown under the counter on the Kelpwoud, and `Nuwe rekord!` on the end card. Toernooi games go to `toernooi` (last 50), never to `rounds` or `lines`: **the Kelpwoud is untouched**.
- Tests: `game/controller.toernooi.test.ts`. Browser smoke: `tools/smoke_toernooi.mjs` (`SMOKE_W`/`SMOKE_H` for a phone).
- **Roadmap PDF** (not part of the game): `python3 tools/roadmap.py` writes `Evans_Padkaart.pdf`, two A4 landscape pages (accepted; declined + countergambits), every named line to move 10 with its moves, one bright colour per branch, built from the canon via headless Chrome.

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

**Black's move:** Stockfish **depth 5, MultiPV 3** (6 until 30 Oct). Keep the candidates whose score (from Black's side) is within `BLACK_WINDOW_CP` (50) of the best, and choose one uniformly at random. Mate scores count as +-10000. Thinking delay 400 to 900 ms.

**Black cracks where the road is narrow** (since 28 Oct, `chooseBlackMove` in `game/pressure.ts`): if exactly one candidate is inside the window, the others are outside it, his last move's pressure is at least `CRACK_MIN_PRESS` (0.8) or Black is in check, and the safe move is not a take-back on the square White just moved to, then with probability `CRACK_P` (0.3) Black plays the best unsafe candidate instead. This is how an opponent facing an unfamiliar gambit actually goes wrong, and it is what makes pressure pay.

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
- after Black's 20th move, the eval from White's side, at depth 16 or more, is at least `GOLD_EVAL` (+1.00 pawns) (the gold line on the round-end eval chart);
- or he delivered checkmate.

A draw or stalemate does not capitalise.

At the end of a round, every line in `conqueredThisRound` becomes green, or gold if the round was capitalised. This includes the shallow lines passed on the way (Accepted, Main Line, Pierce Defense...), so the tree greens from the trunk outward. The root line "Evans Gambit" (4.b4) is reached in every round.

Calibration of +1.00: I simulated play from 12 chart-end positions to move 20 against the engine Black above. A strong White finished at +1.00 or better in 7 of 12 games; a weaker, 1600-style White in 6 of 12. So gold is earned in roughly half of good games. Tune `GOLD_EVAL` after real play.

---

## 8. Choosing the target

The pool is every line except the root `evans-gambit` (4.b4) and except the last 2 targets (`chooseRoundTarget`, `game/targets.ts`).

1. Choose a state class: grey 60%, green 25%, gold 15% (`CLASS_ODDS`). Renormalise over the classes that are not empty. Gold lines keep coming back, so the game never runs dry.
2. Within the class, weight each line by `(famous ? 3 : 1) * (1 + log10(1 + games))`, and:
   - **grey lines only:** times their tier's openness;
   - **any class:** times `TIER_REPEAT` (0.5) if the last two targets were both from this line's tier (interleaving).

**Tiers** (`tierOf` in `data.ts`, computed from the data, no hand list):

| Tier | Lines | Rule |
|---|---|---|
| 1 | 27, e.g. Accepted, Main Line, Pierce, Compromised, Stone-Ware, McDonnell, Morphy, Waller, Dufresne | White is still a pawn or more down at the line's end, at −0.2 or better |
| 2 | 6: Slow Variation, 6...d6, Tartakower, Alapin-Steinitz, Lasker, Levenfish | the pawn comes back, or the line ends a little worse |
| 3 | 6: Declined 4...Bb6 and 5.a4, Cordel Variation, Showalter, Hein, Fontaine | never a pawn down |
| 4 | 11: the reef lines and every line whose theory dips to −0.5 or worse (Hirschbach, Lange, Sokolsky, Anderssen Defense, Vasquez, Richardson, Hicken, Steinitz, Pavlov, Fraser-Mortimer, Mortimer-Evans) | risky |

**Openness** (`tierOpenness`): tier 1 is always 1. Tier *t* starts at `TIER_FLOOR[t]` (0.35 / 0.3 / 0.08) and rises linearly to 1 as the share of the easier tiers that is green or gold reaches `TIER_NEED[t]` (40% / 50% / 60%). Never zero, so lessons interleave and it feels random. Measured (20,000 picks): a fresh forest serves tier 1 / 2 / 3 / 4 in 82% / 7% / 9% / 1.5% of rounds; with tier 1 all green, 29% / 20% / 32% / 19%; with half the forest gold, a gold line comes up in about 1 round in 5.

Use the same weights for `chooseTarget(open)` during the round (sections 4.2 and 4.4), restricted to the open lines.

## 9. Stoomdruk (the steam gauge)

The painted **drukmeter** (`art/drukmeter.png` → `assets/drukmeter.webp`, banners *LAE DRUK* and *HOË DRUK*) beside the board; **only the needle moves**, the scale and colours never change.

- **Needle = pressure of his last move**: `max(0, eval if Black passed − eval now)`, in pawns from White's side, mates clamped to ±15. A check counts as `PRESS_CHECK` (1.5). It updates after each of his moves and holds during Black's turn. Before 4.b4 it is dimmed at =.
- **Source:** canon positions use `node.press` (depth 16, `tools/add_pressure.py`); elsewhere two searches at `PRESS_DEPTH` (12), capped at `PRESS_MAX_MS` each, cached by FEN.
- **Zones** (`pressZone`): cold < 0.5 · amber < 1.1 · green < 3.5 · gold. `pressToDial` puts the thresholds exactly on the painted ticks −1, =, 1 and `PRESS_FULL` (6) on 2. Calibrated on 360 simulated open-sea games: about 10% / 20% / 40% / 30% of club moves. A quiet move in a quiet Italian is about 0.2; attacking a piece is 3 or more. The zone name (`UI.zones`) is written inside the dial; no number.
- **Caption** under the dial: `UI.pressOf` ("Druk van 9.Qb3"), the move the reading belongs to.
- **Ledger plaque** under that (`game/ledger.ts`, piece icons drawn in `ui/Stoomdruk.tsx`): *Lokaas* = material given on the opening route (on the route every bit he is down is the gambit's own; after the route it only shrinks, as he wins it back); *Verloor* = anything else he is down; *Vangs* = anything he is up; *Gelyk* when level. Classes queen / rook / minor (knight and bishop together) / pawn, so ordinary trades net out; more than 6 icons shows +n.
- **Captain:** a zone change says `STEAM_*` (at most every 6 half-moves), cold adds `QUESTION`. On the chart only gold/green praise (the route chose his move); amber/cold only in open sea and only while there is lokaas in the water. `DEBT_PAID` when the lokaas shrinks.
- **Round end:** pressure bars per move above the eval line (fixed lines at 0 and +1), one shared move axis.

## 9a. "Wat het jou pion gekoop?" (checkpoints)

Before his 9th, 13th and 17th moves (`CHECK_PLIES` 16, 24, 32), if there is lokaas in the water, the Captain asks what the pawn bought. **Never while he is fighting for his life:** in check, at `CHECK_CALM_EVAL` (−1.5) or worse, facing mate, or with only one move that doesn't lose `CHECK_ONLY_MOVE_CP` (1.5 pawns; MultiPV 2 at depth 12, so a forced take-back counts). Then the question waits for a calm moment, at most `CHECK_DEFER_PLIES` (two of his moves), and is otherwise skipped. In master positions about 1 checkpoint moment in 7 is such a fight. (Black merely attacking something does not count: in gambit positions that is true most of the time.) His move waits until he taps one of five answers; `Verder` or his next move closes the card. The card sits over the side panel (a bottom sheet on phones), never over the board.

Each answer is checked on the board (`game/checkpoint.ts`, calibrated on 217 canon positions):

| Answer | True when |
|---|---|
| `tyd`: Tyd: meer stukke in die spel | White's developed pieces (minor pieces off home squares, +1 for castling) exceed Black's by `CHECK_DEV_LEAD` (1) |
| `sentrum`: Die sentrum | White has at least 2 pawns on d4/e4/d5/e5, and more than Black |
| `lyne`: Oop lyne vir my stukke | White has `CHECK_MOB_LEAD` (8) more legal moves than Black |
| `koning`: Swart se koning sit vas in die middel | Black's king is on d8–f8/d7–f7 and cannot castle next move (no rights, or f8/g8 occupied or attacked) |
| `niks`: Niks meer nie | none of the above, and the eval is at most `CHECK_NOTHING_CP` (−0.7) |

If nothing is true but the eval is above −0.7, there is no fair question and nothing is asked. Any true answer is right; the card then shows why, and what else the pawn bought; a wrong answer shows why it is not true and what is. The Captain says `CHECK_RIGHT` / `CHECK_HONEST` (for a right *niks*) / `CHECK_WRONG`, then `QUESTION`. The round-end card shows `checkTally`.

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

## 11a. Die Spookskip (the ghost ship)

The contrast case for "time runs out" (`ui/GhostShip.tsx`, data `data/ghost_ship.json` from `tools/ghost_ship.py`, captions `UI.ghost`):

1. **Chapter 1, the slow ship:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.O-O Nf6 6.c3 Be7 7.Qc2 O-O 8.Re1 Bc5 9.d3 d6 10.a4 a6 11.Nbd2 Ba7 12.Ba2 h6 13.h3 Be6. White always plays the quietest move within 0.2 of the best and never drops material; Black plays Stockfish's best. Black castles and develops and is still exactly one pawn up (eval −1.0). Moves 1 to 4 play fast, then about a second a move, with three captions (5.O-O, Black castles, Black is ready).
2. **Chapter 2, "'n ruk later":** the pawn ending with the same queenside pawns (White a+c against Black a+b+c: the missing b-pawn is the bait) and the kingside as it stood; Stockfish rates it −5.5 and plays it out until Black's c-pawn queens.

Shown once automatically when he returns to the Kelpwoud after his `GHOST_AFTER_ROUNDS` (3rd) round (`settings.ghostSeen`), and any time from the button `Kyk na die Spookskip` in the lesson popup. `Weer` replays.

---

## 12. Kaptein Evans (all strings)

The voice: a 19th-century Welsh packet-ship captain who speaks warm, short, punchy Afrikaans with a few Welsh words (*Da iawn* = very good, *Bendigedig* = wonderful, *Ardderchog* = excellent, *Hwyl fawr* = goodbye). Sentences stay short; chess terms are fine. Keep every string in `src/content/kaptein.ts`. Where a category has several lines, pick one at random. `{line}` is a label in quotes; `{move}` is numbered SAN.

**`src/content/kaptein.ts` is the source of truth** (Martin rewrote the lines in October 2026); the table below is the original draft, kept for reference. These three must stay exactly:
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

**Forced moves** (since 28 Oct): when his best move was the only one that doesn't lose `FORCED_GAP_CP` (1.5 pawns; or the only legal move), a move scoring 3 or 4 still gets its marks, but the Captain says `FORCED` ("Ja-nee, swart het jou nie regtig 'n keuse gegee nie.") instead of `POINTS_*` (or `LINE_MOVE` on the chart), and `RESCUE` ("Dankie tog daar was daardie opsie.") if he was also at `RESCUE_EVAL_CP` (−1.5) or worse. Martin's wording, to be refined; `['']` makes the Captain stay silent.

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
  "settings": { "bishopLights": true, "ghostSeen": false }
}
```

`played` counts rounds where the line was the target (including re-targets). A missing or unreadable store means a fresh, all-grey forest; the game must still work.

---

## 14. Screens

1. **Kelpwoud (home):** the forest in its rope frame; counter at the top; earned badges at the sides; `Begin 'n rondte` at the bottom.
2. **Brief** (over the Kelpwoud, see §0): route lit up, stages, and the moves only once the line is green or gold (`UI.routeHidden` for grey lines), `Ek is gereed!`.
3. **Game:** board (on top on a phone) over the round's background photo; panel with target banner, drukmeter with the ledger plaque, the Captain (mood face + speech), `Skuif 7/20` and `Punte 23`, the move list with points chips, and `Begin oor`. Last move highlighted. No hints, no takebacks. Checkpoint card (§9a) over the panel.
4. **Round end:** score out of 64, the checkpoint tally, lines coloured this round, the pressure and eval charts, up to three key moments; `Nog 'n rondte` and `Terug na die Kelpwoud` (plays the colouring animation and any badge arrivals).

---

## 15. Config (one file, `src/config.ts`)

| Name | Default | Used in |
|---|---|---|
| `TOP2_TOLERANCE_CP` | 30 | 4.5 |
| `BLACK_ENGINE_DEPTH` / `BLACK_MULTIPV` / `BLACK_WINDOW_CP` | 5 / 3 / 50 | 5 |
| `ANALYSIS_DEPTH` / `ANALYSIS_MAX_MS` / `ANALYSIS_MIN_DEPTH` | 14 / 2500 / 10 | 5 |
| `FINAL_EVAL_DEPTH` | 16 | 7 |
| `GOLD_EVAL` | 1.00 (pawns) | 7, 9 |
| `POINT_BANDS_CP` | 25 / 60 / 120 | 6 |
| `CLASS_ODDS` | grey .60 / green .25 / gold .15 | 8 |
| `TIER_FLOOR` / `TIER_NEED` / `TIER_REPEAT` | tiers 2–4: .35 .3 .08 / .4 .5 .6 / 0.5 | 8 |
| `FAMOUS_WEIGHT` | 3 | 8 |
| `RECENT_EXCLUDE` | 2 | 8 |
| `MOVES_PER_ROUND` | 20 | 3 |
| `STEAM_SMOOTHING` | 0.5 (eval series on the round-end chart) | 9 |
| `PRESS_DEPTH` / `PRESS_MAX_MS` / `PRESS_CHECK` | 12 / 1200 / 1.5 | 9 |
| `PRESS_ZONES` / `PRESS_FULL` | amber .5 / green 1.1 / gold 3.5, full 6 (pawns) | 9 |
| `CRACK_P` / `CRACK_MIN_PRESS` | 0.3 / 0.8 | 5 |
| `CRACK_REAL_CP` / `CRACK_KEEP_CP` | 50 / 60 | 5 (when the Captain names a slip, and whether he caught it) |
| `CHECK_PLIES` / `CHECK_DEV_LEAD` / `CHECK_MOB_LEAD` / `CHECK_NOTHING_CP` | 16, 24, 32 / 1 / 8 / −70 | 9a |
| `CHECK_CALM_EVAL` / `CHECK_ONLY_MOVE_CP` / `CHECK_DEFER_PLIES` | −150 / 150 / 4 | 9a |
| `GHOST_AFTER_ROUNDS` | 3 | 11a |
| `FORCED_GAP_CP` / `RESCUE_EVAL_CP` | 150 / −150 | 12 |

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
8. A round ends after Black's 20th move with exactly 16 scored White moves (checkpoints answered on the way).
9. Pressure (`game/pressure.test.ts`): zone thresholds land on the painted ticks; every Black-to-move canon node has `press` (null only in check); Black cracks only when squeezed, never with room to breathe or on a take-back.
10. A whole round with a fake engine where every Black decision is narrow: Black slips, the Captain names it, the round-end moments show it (`game/controller.crack.test.ts`).
11. Checkpoints (`game/checkpoint.test.ts`): the Compromised Defence reads *tyd* + *koning*; a slow, castled Black with the engine at −1.2 reads *niks*; no question when the board shows nothing and the engine disagrees.
12. Plaque (`game/ledger.test.ts`): the greedy line is three pawns of lokaas; winning one back leaves two; a knight dropped in open sea is verloor, not lokaas; bishop for knight nets to nothing; an extra pawn is vangs.
13. Targets (`game/targets.test.ts`): tiers come from the data; a fresh forest serves mostly tier 1 but every tier can appear; tiers open as tier 1 greens; gold lines return; two same-tier rounds lower that tier next.
14. Die Spookskip (`game/ghost.test.ts`): every move legal; Black exactly one pawn up throughout chapter 1, and castled; chapter 2 has a+c against a+b+c and ends with Black queening.
15. Forced moves (`game/controller.forced.test.ts`): with one good move and every other losing 3 pawns, his good moves score 4 and the Captain says `FORCED`, never `POINTS_4`; at −2.5 he says `RESCUE`.

---

## 18. Not in v1 (ideas for later)

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

Then add the pressure field (only adds `press` to Black-to-move nodes; nothing else changes):

```
python tools/add_pressure.py data/evans_canon_app.json --stockfish /path/to/stockfish --depth 16
```

The ghost ship film (any time; it is independent of the canon):

```
python tools/ghost_ship.py --stockfish /path/to/stockfish --out data/ghost_ship.json
```

With a larger game database (for example a Lichess masters export, or `--lichess-masters`), raise `--min-games` to keep the tree a similar size; `--sweep` prints the tree size for several thresholds. The famous list and the reef rule live at the top of `canon_builder.py`.
