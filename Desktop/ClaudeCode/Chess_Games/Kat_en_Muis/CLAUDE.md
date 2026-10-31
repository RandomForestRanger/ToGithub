# Kat en Muis: Mat in 10

## What this is

An Afrikaans chess game for the suite's young players. Each round shows a position from a real Lichess game in which one side mates in exactly 10 moves. The player studies the frozen board, clicks **Ek het dit!**, and then plays the mate against Stockfish's best defence, within a move budget they chose before the round.

The attacking side is the cat. The defending king is the mouse.

A "move" here always means one attacker move. Mate in 10 means the attacker's 10th move gives mate.

## Core rules

- The player is always the attacker. Board orientation follows the attacking side, so it flips for Black.
- Every position in the bank:
  - is a forced mate in exactly 10 for the side to move,
  - has more than 16 units on the board (kings and pawns included),
  - comes from a real Lichess game.
- Before the round the player picks **Ekstra skuiwe**: +1, +3 or +5. The budget is 10 plus the extra moves (11, 13 or 15).
- **Freeze.** The board is locked for a minimum of 10 seconds, shown as a slowly draining ring around the board (no ticking number). After 10 seconds the **Ek het dit!** button appears. There is no upper time limit; the board stays locked until the player clicks.
- **Play.** The player moves; Stockfish replies with the longest resistance. A counter shows *Skuif 4 van 13*.
- **Win.** Mate within the budget. Mate on move 10 is a perfect round; a slower mate still wins and goes straight to the reveal.
- **Lose.** Either the budget runs out without mate, or the forced mate no longer fits in the remaining budget (early end, see Engine).
- **Oops pause and take-back.** When a move lets the mouse escape (or stalemates), the round does not end at once. The board stops on that move with a red arrow and a pop-up: *Ai, met hierdie skuif gaan die muis wegglip!* with **Probeer 'n ander skuif** (take back the move and the mouse's reply, keep playing) and **Wys my die kortste pad** (end the round). A win after a take-back counts as *Gevang* but earns no stars and no *Presies 10*; the position can be retried later for stars. Agreed with Martin on 30 Oct 2026: stopping at the mistake teaches more than playing a lost round out or jumping to the replay.
- **Reveal.** Every round ends with the fastest line, but it waits: the final position stays on the board under a **▶ Die kortste pad** button and nothing moves until the child clicks. Then it plays slowly (2.2 s per move). Where the player's game left that pace, the moves where they lost time are marked.

## Afrikaans UI strings

| Key | Text |
|---|---|
| title | Kat en Muis |
| subtitle | Mat in 10 |
| prompt_white | Wit speel en mat in 10 |
| prompt_black | Swart speel en mat in 10 |
| freeze | Kyk eers mooi... |
| ready_button | Ek het dit! |
| handicap_label | Ekstra skuiwe |
| counter | Skuif {n} van {budget} |
| win_perfect | Gevang! Mat in presies 10. |
| win_slow | Gevang! Mat in {n}. Kyk hoe dit in 10 kon gebeur. |
| lose_budget | Die muis het weggekom. |
| lose_escaped | Die muis het 'n gat gevind. |
| oops | Ai, met hierdie skuif gaan die muis wegglip! |
| oops_stalemate | Ai, dis pat! Nou kan die muis nie meer gevang word nie. |
| take_back | Probeer 'n ander skuif |
| show_me | Wys my die kortste pad |
| win_helped | Gevang, met 'n terugskuif! Probeer later weer vir sterre. |
| replay_button | ▶ Die kortste pad |
| reveal_title | Die kortste pad |
| next | Volgende |
| retry | Probeer weer |
| source | Uit 'n Lichess-speletjie, {maand} {jaar} |

## Interface (Lichess-esque)

- Board centre-left, move list on the right; on phones the move list stacks below the board.
- Plain Lichess look: brown board, a standard piece set, coordinates on the edges, last-move and check highlights, legal-move dots, click-click and drag-and-drop, Lichess-style promotion picker.
- No eval bar and no engine lines during play. They would give the game away.
- Sidebar: prompt (*Wit speel en mat in 10*), handicap chips, move counter, source line.
- The Kat en Muis art lives in the header and on the win and lose screens only. The board itself stays plain.
- Board library: chessground (Lichess's own, GPL-3) gives the closest feel. If the suite is not GPL, use a permissively licensed board library instead. Check the licence of the chosen piece set too.

## Engine

- A Stockfish WebAssembly build running in a Web Worker.
- **Main line from the bank.** While the player stays on the stored principal variation, defender replies come from the bank: instant and guaranteed best.
- **Off the main line.** The defender move is chosen live: run MultiPV (3 to 5 lines) and take the move with the longest mate distance.
- **Budget check.** After each attacker move off the main line, search the position with a time cap.
  - Engine reports a forced mate that fits in the remaining budget: continue.
  - Engine reports no mate, or a mate longer than the remaining budget: search once more with double the time. If it still doesn't fit, end the round with *Die muis het 'n gat gevind*.
  - Bias toward continuing. Telling a child they failed when they hadn't is the worst error this game can make, and budget exhaustion at the end is always definitive anyway.
- **Reveal.** Replays the stored principal variation with step buttons and an auto-play option.

## Position bank (offline pipeline)

Python with python-chess, zstandard and a native Stockfish binary. Runs on Martin's machine, not in the browser. Output is a single `posisies.json` baked into the game.

1. **Source.** The Lichess open database (database.lichess.org, CC0), monthly rated standard games. Only computer-analysed games carry `[%eval ...]` comments, and they are a small share of all games.
2. **Cheap pre-filter.** Scan the raw text for `[%eval #10]` to `[%eval #14]` (and the negative versions) before parsing anything, so only a sliver of each dump reaches python-chess. Lichess's server analysis is shallow, so its mate scores are upper bounds: in testing, every position tagged #10 was really a mate in 8 or 9 on a deeper search, while a #11 to #14 tag can hide an exact 10.
3. **Candidate positions.** Take every position in the game after an annotated move where the side to move is the mating side, the tag is #10 to #14, and there are more than 16 units on the board (up to six per game).
4. **One per game.** Certify a game's candidates in order and stop at the first exact 10. Dedupe by FEN (placement, side to move, castling, en passant).
5. **Certification.** Stockfish with a large fixed node budget must report mate in exactly 10 for the attacker, stable over the last iterations, with no shorter mate ever shown. Record the principal variation. With this many pieces there is no tablebase proof, so this is strong engine evidence rather than proof. A shorter mate turning up later wouldn't break the game (a faster mate still wins), but it would make *presies 10* untrue, so certify tightly.
6. **Enrichment.**
   - For each attacker turn on the principal variation, list every attacker move that keeps the exact remaining mate distance (MultiPV pass, widened automatically when every searched line is perfect). These count as perfect alternatives during play and in the reveal.
   - Count the quiet (non-checking) attacker moves on the principal variation.
   - Flag underpromotions and other special moves.
7. **Second source (optional).** Lichess broadcast PGNs of over-the-board events. These usually carry no evals, so they need our own Stockfish scan of every position with more than 16 units, which is far more expensive. Start with rated games; add broadcasts if the yield is thin or if named-player flavour is wanted.

### Privacy

Rated games are played by online players, many of them children. Show only the month, year and a rating band, never usernames or game links. Games from public over-the-board broadcasts may show players and event.

### Entry format

`id` is `km-` plus the first 8 hex digits of the SHA-1 of the FEN key, so it stays the same when the bank grows and saved progress never shifts. Entries also carry `defenderChoices` and `difficulty`, and `source.speed`.

```json
{
  "id": "km-6e49e552",
  "fen": "r1b2rk1/...",
  "attacker": "w",
  "mateIn": 10,
  "units": 21,
  "pv": ["e5f7", "e8f7", "..."],
  "perfectAlternatives": { "0": ["e5f7"], "2": ["d1h5", "d1g4"] },
  "quietMoves": 2,
  "flags": [],
  "source": { "type": "lichess-rated", "month": "2024-05", "ratingBand": "1800-2000" },
  "verified": { "engine": "Stockfish", "nodes": 0, "date": "" }
}
```

## Difficulty

Order positions by the number of quiet attacker moves on the principal variation. Zero quiet moves (every move is check) is the friendliest rung; lines that need two or three quiet moves are the hard end. Secondary signals: how many defender options exist and how crowded the board is.

## Build order

1. Run the pipeline on one month of games and report the yield.
2. Build the bank (target size to be decided).
3. UI prototype with five hard-coded positions.
4. Engine integration and budget logic.
5. Reveal.
6. Portal tile, art, progress.

## Implementation notes (30 Oct 2026)

- **Files.** `index.html`, `css/kat-en-muis.css`, `js/app.js` (game), `js/enjin.js` (Stockfish worker), `js/kuns.js` (cat and mouse SVGs), `js/kleur.js` (random colour themes), `data/posisies.json` (bank), `vendor/` (chessground 9.2.1, chess.js 1.4.0, Stockfish 19 lite single-threaded, the same engine build Evans uses), `pipeline/` (bank builder and its README), `netlify.toml`.
- **Serving.** Must be served over HTTP like the rest of the suite: `python3 -m http.server 8000` from this folder, then open <http://localhost:8000>.
- **Start screen (31 Oct 2026).** Kid-friendly: *Wie speel?* (Thomas, Jacobus, Ander; Martin's choice for this game, replacing the suite's J/L/KC/... list) and *Wat speel ons?* (Mat in 5 or Mat in 10), then **Begin, {naam}!**. The house button (and the logo) go back to it. `katEnMuis_speler` and `katEnMuis_modus` remember the last choice; `katEnMuis_{player}_vordering` (Mat in 10) and `katEnMuis_{player}_vordering5` (Mat in 5) hold results, handicap, current position and games played.
- **Colours.** **Gee my 'n nuwe kleur** in the header, always available: `js/kleur.js` picks a random hue, dark or light, one of eight drifting background textures (dots, stripes, grid, waves, blocks, paw prints, stars, grain) and one of nine board colour pairs, and spreads it from the button in a circle (View Transitions; instant where unsupported or with reduced motion). Saved per player in `katEnMuis_{player}_kleur`. The board squares are drawn with a CSS conic gradient from `--board-light`/`--board-dark`.
- **Look.** Deliberately Lichess-style (dark Lichess palette, light variant for light-mode devices) rather than the suite's glassmorphism, as asked for this game. Tap-to-move works, drag-and-drop too.
- **Notation.** Figurine notation in the move list, so no choice between Afrikaans piece letters is needed.
- **Early end.** First check 1.5 s, second check 3 s. If the engine finds no mate at all but the attacker is still at least +3 ahead, the round carries on and the budget decides.
- **Lost pace.** After an off-line attacker move the engine's mate distance is compared with one less than before; the difference is shown as an orange `+n` tag in *Jou spel*. Perfect alternatives get a blue tag.
- **Stars (provisional, open question 2).** Win with +1 = three stars, +3 = two, +5 = one; a mate in exactly 10 adds *Presies 10!*.
- **Test positions.** The engine-made test bank (`"source": {"type": "dev"}`, labelled *Toetsposisie* in the game) is kept in `pipeline/uitvoer/toetsposisies-dev.json`.
- **Bank (30 Oct 2026).** `data/posisies.json` now holds 70 certified positions from the January 2015 Lichess dump (build order step 1 done, step 2 started). Build into `pipeline/uitvoer/` (the resume cache lives there) and copy the JSON into `data/`. Yield and cost are in `pipeline/README.md`: about 100 positions per 45 minutes of engine time.

## Mat in 5 (training wheels, built 31 Oct 2026)

An easier mode for the real game, chosen on the start screen.

- **No separate bank.** Each Mat in 10 position is played forward 5 moves each side along its certified line; the board then shows the cat's first 5 moves slowly (1.4 s each) with *Kyk hoe die kat begin...*, and the usual 10-second freeze follows. Because those moves are best play, the remaining position is an exact mate in 5, and the bank's perfect alternatives still apply (ply numbers shifted by 10). All 70 positions keep 12 to 26 units after the 10 plies, above the floor of 10 Martin set for this mode.
- **Retry** (*Probeer weer*) skips the opening show and goes straight to the position.
- Same budget chips (+1/+3/+5, so 6, 8 or 10 moves), stars and take-back rules; perfect is *Presies 5!*.
- Side-effect, deliberately kept: a child who has done a Mat in 5 has seen the end of the matching Mat in 10.
- Still open: whether +5 is too generous for a mate in 5, and whether Mat in 5 should unlock Mat in 10.

## Open questions

1. Is there a +0 option (exactly 10, no slack) for the strongest players, or is +1 the floor?
2. Rewards: stars by handicap (for example +1 = three stars, +3 = two, +5 = one) with a perfect-10 bonus, or something suite-specific?
3. Retry: can a failed position be retried at once, or does it come back later?
4. Ordering: free choice of positions, or a ladder by difficulty?
5. Does "more than 16 pieces" count all units including kings and pawns? (Assumed yes above.)
6. Portal: does Kat en Muis share progress storage with the other games in the suite?

## Deploy

- Live at <https://kat-en-muis.netlify.app> (Netlify site id `3af94a87-a640-4c1a-87ad-7c3d2ecf5761`, deployed 31 Oct 2026), with a card on Lekker Bekker (`Speletjies_Altesaam/`, icon `img/kat-en-muis.svg` is the game logo).
- Deploy only the game files, not `pipeline/` or this file: copy `index.html netlify.toml css js data vendor` into a clean folder, then `npx netlify-cli deploy --prod --dir <folder> --no-build --site 3af94a87-a640-4c1a-87ad-7c3d2ecf5761` (with `PATH="/usr/local/opt/node/bin:$PATH"`).
