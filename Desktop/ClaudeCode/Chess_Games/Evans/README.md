# Stoomdruk: Kaptein Evans se Kelpwoud — MVP

Built from the spec in `CLAUDE.md` (2 Oct 2026). React + Vite + TypeScript, chess.js, react-chessboard 4.7,
Stockfish 19 lite single-threaded WASM in a Web Worker, d3-hierarchy for the kelp-forest layout.

## Run

```bash
export PATH="/usr/local/opt/node/bin:$PATH"   # same Node workaround as the other projects
npm install
npm run dev          # http://localhost:5173
npm test             # vitest: chart-phase acceptance checks + storage/scoring
npm run build        # dist/ (Netlify: netlify.toml is ready, publish = dist)
```

Browser smoke test (plays whole rounds in headless Chrome against the real engine):

```bash
npx vite build && npx vite preview --port 4173 &
node tools/smoke.mjs 3                 # random-ish White
STRONG=1 node tools/smoke.mjs 3        # Stockfish-guided White (reaches move 20)
```

## Where things are

| File | What |
|---|---|
| `src/config.ts` | every tunable number (section 15) |
| `src/data.ts` | typed import of `data/evans_canon_app.json` |
| `src/game/round.ts` | pure chart-phase rules (4.1–4.5), mirrors `tools/check_canon.py` |
| `src/game/targets.ts` | target choice (section 8) + seeded RNG for tests |
| `src/game/scoring.ts` | point bands, top-two rule |
| `src/game/controller.ts` | round state machine: entry → chart → engine → end; steam, Captain pacing, bishop beams, final eval |
| `src/game/storage.ts` | `stoomdruk.v1` store; states never go down |
| `src/engine/EngineService.ts` | one Stockfish worker, FIFO queue, MultiPV parsing |
| `src/content/kaptein.ts` | every Afrikaans string (Captain lines + UI labels) |
| `src/ui/*` | Kelpwoud (forest, pan/pinch/wheel zoom, line cards), GameScreen (board, gauge, speech, move list, popups with mini-board), Stoomdruk dial, round intro/end, steam graph |

## Status against section 17 (acceptance checks)

1. Stone-Ware: 4...Bxb4 5.c3 Bd6 conquers it. **Unit test passes.**
2. Pierce + 6.O-O → RETARGET "Slow Variation", conquered, target changes. **Passes.**
3. Pierce + 6.d3 → MISSED with 6.d4, chart left. **Passes.**
4. Lasker Defense by transposition. **Passes.**
5. Fontaine: engine phase from move 5. **Passes.**
6. Gold stays gold after a bad round. **Passes.**
7. Data invariants + 500 simulated noisy chart phases. **Passes.**
8. Round ends after Black's 20th move with exactly 16 scored White moves. **Checked in the browser smoke test (`scored: 16`, `plies: 40`)**; not a unit test because it needs the engine.

## Choices I made without you (easy to change)

- **Promotion** always to a queen.
- Drag-and-drop works as well as tap-to-move.
- When the chart ends on **his** turn, the engine phase (and engine scoring) starts with that move; the Captain says CHART_END.
- Captain "face" is a ⚓ placeholder; the Vixen is a simple silhouette. Both need proper art.
- Line cards show the moves from `4.b4` onward.
- `played` counts every line that was a target during the round (start, chains and re-targets).
- Key moment "best engine-phase move" = his 4-point engine-phase move with the highest eval afterwards.
- The forest starts zoomed to fit on desktop; on a portrait phone it fits the height and centres on the holdfast (pan sideways for the rest).
- `window.__ctl` / `window.__engine` are exposed for the smoke test. Harmless, but you can remove them before release.

## Not done yet / open

- Not deployed to Netlify, not committed to git.
- No real-device touch test (pinch-zoom was written but only tested with a mouse and in headless Chrome).
- `GOLD_EVAL` is uncalibrated against real play. In the bot runs, gold never happened, because Black's engine play at depth 6 is quite strong against a random White.
- The "pulse + bubbles" after a round work; the colour does not yet "fill in" gradually.
- `canon_builder.py` in the project root is different from `tools/canon_builder.py`. I left both untouched.
- The Captain's draft lines are copied verbatim from the spec, ready for your edits in `src/content/kaptein.ts`.
