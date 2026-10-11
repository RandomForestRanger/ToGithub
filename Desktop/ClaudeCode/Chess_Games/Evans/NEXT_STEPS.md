# Next steps: Stoomdruk (Evans)

Status on 3 October 2026: the MVP is playable end to end (see `README.md`). All 10 unit tests pass, and the browser smoke test plays full rounds against the real Stockfish without errors.

## 1. Play-test with the real player (first priority)

- [ ] Play 5–10 rounds yourself, then let him play (laptop **and** tablet/phone).
- [ ] Note each time:
  - Final eval at move 20. **Does gold ever happen?** If gold almost never happens, lower `GOLD_EVAL` (1.00 → 0.6?). Another option is to make Black weaker, by lowering `BLACK_ENGINE_DEPTH` or widening `BLACK_WINDOW_CP` in `src/config.ts`.
  - Is the thinking time (400–900 ms) right?
  - Is the MISSED popup readable in 7 seconds? Is it in the way?
  - Are the points fair? (Point bands: 25/60/120 cp.)
- [ ] Touch test on a real device: tap-to-move, pinch-zoom and pan in the forest, tapping bulbs.

## 2. Content and wording (Martin)

- [ ] Edit the Captain's draft lines in `src/content/kaptein.ts`. Keep `ROUND_START`, `RETARGET` and `MISSED` exactly as they are. Use double quotes for any string containing `'n`.
- [ ] Check the UI labels in the same file (`UI` object): "Verder", "Eindtelling", "Sleutelmomente", "Skeepsligte", etc.
- [ ] Decide whether line labels on the cards should get a short Afrikaans explanation as well.

## 3. Art and look

- [ ] Captain Evans portrait (4 faces) and the *Vixen*: the kids draw these, brief in `art/Stoomdruk_Tekenopdrag_Kaptein_en_Vixen.docx`. Scans go in `art/`.
- [x] Sea-bamboo look (11 Oct): tapered stipes, gas-bladder bulbs with crowns, strap fronds streaming with the current, holdfast, seabed, barnacles on reef lines (`src/ui/kelpShapes.ts`).
- [x] Label overlap: greedy placement (above/right/left/below); labels keep their screen size; the less famous ones appear when zoomed in.
- [x] Colour fills in up the stipe after a round, then the fronds and bulb colour in. Not yet seen after a real round; check it in play-testing.

## 4. Smaller technical items

- [ ] Remove `window.__ctl` / `window.__engine` from `src/App.tsx` before release (only needed by `tools/smoke.mjs`), or keep them behind `import.meta.env.DEV`.
- [ ] The engine-phase wait for depth ≥ 10 is simplified: scoring waits for the full depth-14 analysis, capped at 2.5 s. Tighten if it feels slow.
- [ ] Promotion always gives a queen. Add a picker if it ever matters.
- [ ] Code-split the bundle (Vite warns about a >500 kB chunk, mostly the canon JSON).
- [ ] Two different copies of `canon_builder.py` exist (project root and `tools/`). Decide which one is canonical and delete the other.
- [ ] Unit test for check 8 (16 scored moves) using a mocked `EngineService`.

## 5. Deploy

- [ ] Netlify: `netlify.toml` is ready (`npm run build`, publish `dist`, WASM content-type header).
- [ ] Add a card for it in the games portal (`Speletjies_Altesaam`), like the other games.

## 6. Later (spec section 18)

- "Wat het jou pion gekoop?" checkpoints
- Die Wrakduiker (replay famous Evans games)
- Bakboord & Stuurboord tactics harbour
- Several player profiles, sound
