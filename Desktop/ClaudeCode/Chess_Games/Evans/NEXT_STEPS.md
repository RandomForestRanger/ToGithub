# Next steps: Stoomdruk (Evans)

**Live:** https://stoomdruk-evans.netlify.app (still the 27 Oct build) · **Last session:** 28 October 2026 · All 28 unit tests pass · the 28 Oct changes are local only, not deployed yet.

## Pick up here (start of next session)

**28 Oct, evening: second pass after Martin's first test** (CLAUDE.md §0.1 "Second pass", §8, §9, §9a, §11a): the plaque now separates *Lokaas* (route bait only) from *Verloor* and *Vangs*, with piece icons; the needle names its move ("Druk van 9.Qb3"); checkpoints wait for a calm moment; new lines come in by tier, softly and interleaved, and gold lines return in about 1 round in 5; *Die Spookskip* plays once after his third round and from the lesson popup. 40 tests pass.

- [ ] **The lesson picture still says STUK.** `src/assets/aas-baas.webp` has "DIE STUK WEN VIR ONS DRUK" painted in its banner, while the text beside it now says *pion*. Ask the artist for a PION version (or decide that *stuk* stays and change `whyText` back).
- [ ] Wording pass on tonight's new drafts too: `UI.ledgerLost`, `UI.pressOf`, all of `UI.ghost`, and Martin's own `FORCED` / `RESCUE` lines (forced moves no longer get the usual praise; `['']` = silent).

**28 Oct, morning: the pressure redesign is built but not yet played by him.** See CLAUDE.md §0.1, §5, §9, §9a. Try it locally first:
`export PATH="/usr/local/opt/node/bin:$PATH" && npm run dev`, then http://localhost:5173.

1. **Watch him play two or three rounds** and note: does he look at the needle after his move? Does the *Lokaas* plaque register? Does he read the checkpoint card, or tap at random? Does he notice when Black slips (the Captain names it after his reply)?
2. **Tune from what you see** (all in `src/config.ts`):
   - `CRACK_P` 0.3: more slips = easier sea (0.5 gave 43% gold in simulation for a pressing White).
   - `PRESS_ZONES` amber .5 / green 1.1 / gold 3.5: if the needle sits in *Volstoom* too often, raise gold.
   - `CHECK_PLIES` 16, 24, 32: fewer checkpoints if they feel like homework.
3. **Wording pass on the new drafts** in `src/content/kaptein.ts` (marked "new on 28 Oct"): `QUESTION`, `CRACK_CAUGHT`, `CRACK_ESCAPED`, `CHECK_RIGHT`, `CHECK_WRONG`, `CHECK_HONEST`, and in `UI`: `ledgerBait/Catch/Even`, `routeHidden`, `graphPress/Eval`, `momentCrack`, `momentQuiet`, `momentDrop` (renamed), `checkTitle`, `checkHint`, `checkOptions`, `checkWhy`, `checkWhyNot`, `checkAlso`, `checkContinue`, `checkTally`; plus the two new paragraphs of `whyText`.
4. **Then commit and deploy.** The folder `.backup-2026-10-28/` holds the pre-redesign copies of every changed file; delete it once the work is committed to git.
5. **Not built yet** (from the 28 Oct review): depth-before-breadth target choice (first the accepted lines where White stays down at level or better: Compromised, Pierce, Waller, Dufresne, Stone-Ware, McDonnell, Morphy; then the "vis spoeg die hoek uit" lines; then declined; reef and deep-dip lines last, `routeLow` already finds them), and one "ghost ship" replay (5.O-O instead of 5.c3, played out until Black's extra pawn decides).

1. **Martin's wording pass.** Is `src/content/kaptein.ts` edited? If so: check it (quotes around `'n`, `{line}`/`{move}` kept, `ROUND_START`/`RETARGET`/`MISSED` unchanged), run the tests, build and redeploy.
2. **Decisions waiting for Martin** (Claude asks once, then acts):
   - [ ] Push the Evans commits to GitHub (branch `add-RandomForestRanger`, 6+ commits ahead)?
   - [x] Round intro: stages only for grey lines, full moves once green (28 Oct).
   - [x] Pawns invested under the dial: the *Lokaas* / *Vangs* plaque (28 Oct).
   - [ ] Skeepsligte off: should it also silence the Captain's two bishop lines?
   - [ ] Begin oor: keep "same line, saves nothing", or pick a new target / keep lines conquered so far?
3. **Touch test on a phone or tablet** (only tested on PC/MacBook so far): tap-to-move, pinch-zoom and pan in the forest, tapping bulbs, the intro card as a bottom sheet, the MISSED replay popup.

## Done (for reference)

- 28 Oct: **pressure redesign** after a pedagogical review: needle = pressure of his last move (null-move threat; `press` precomputed for the canon by `tools/add_pressure.py`), *Lokaas/Vangs* plaque, pressure-sensitive Black (`CRACK_P`), "Wat het jou pion gekoop?" checkpoints, grey-line briefs without moves, `QUESTION` line, lesson text *pion* for *stuk* with *druk* defined, round-end pressure + eval charts, new moments (slip, quietest move), typo fixes in `kaptein.ts`. 17 new tests. Calibration: 360 simulated open-sea games (Python + native Stockfish 17.1).

- 21 Oct: debug hooks only in dev/`VITE_SMOKE=1` builds, bundle split, check-8 unit test, stale root `canon_builder.py` removed.
- 22 Oct: deployed to Netlify (see Deploy below).
- 23 Oct: **Begin oor** button during a round (two-tap confirm, restarts the same line, saves nothing).
- 24 Oct: interim art — four Captain mood faces (`src/assets/kaptein/*.webp`, mood per line in `MOOD` in `kaptein.ts`) and the *Vixen* (`src/assets/vixen.webp`).
- 26 Oct:
  - MISSED popup **replays**: his game from 4.b4 (quick), pause on the needed move (green arrow), the line's route to its end, 5 s freeze, closes (`src/ui/MiniReplay.tsx`).
  - **Fixed Stoomdruk dial**: −3..+3, blue < −1 < amber < 0 < green < +1 < gold; only the needle (eval) moves. Round-end graph on the same scale. (CLAUDE.md section 9 still describes the old moving red/gold marks.)
  - **Round intro over the Kelpwoud**: camera glides to the target, route glows, card lists stages and moves, button "Ek is gereed!".
- 27 Oct: **painted Kelpwoud** — luminous turquoise water (aqua → deep teal), cream surface glow, breathing sunbeams, misty distant kelp, particles, rising bubbles, three orange tattoo-style fish, watercolour texture (`src/assets/wash.webp`, soft-light). Grey lines = translucent blue-green wash; green = saturated emerald (per-frond hues blue-green → lime) with dark-teal ink edges and cream flecks; gold = amber/gold, inked. Shapes and mechanics unchanged (`kelpShapes.ts` atmosphere helpers, styles in `styles.css`).
- 27 Oct (2): **sea life** (`src/ui/Creatures.tsx`, all behind the kelp): smaller underwater fish (schools, tail beat, fainter when far), three crabs that emerge, scurry slowly, pause and burrow (legs rest in the pauses), and visitors: moray eel every 2 min, dolphin every 4 min, whale shark every 7 min. **Cheat keys on the Kelpwoud: E = eel, D = dolphin, W = whale shark.** No visitors under reduced motion. **Fonts** bundled via npm (`@fontsource/rye`, `@fontsource/zilla-slab`): Rye for titles/headings/buttons/labels, Zilla Slab for sentences, moves and kelp labels; Pirata One not used (blackletter too hard to read for him). The bottom bar no longer blocks panning/zooming on the seabed.
- 27 Oct (3): Martin's Captain lines in `kaptein.ts`. Fewer, slower bubbles; crabs now visit occasionally (one about every 3 min, ~1 min each). **Game-screen backgrounds**: 10 Unsplash photos, resized to `src/assets/backgrounds/*.webp` (credits in `CREDITS.md` there), one at random per round under a dark wash; any `.webp` added there is picked up automatically. Originals in `art/backgrounds/` (gitignored). Not used: `5394608.jpg` (Stocksy watermark) and three wallpaperaccess.com images (licence unclear).
- 27 Oct (4): "Seker? Kliek weer"; **Begin oor now starts a brand-new round** (new target, brief over the Kelpwoud; the abandoned line is skipped). **Rope borders** (`src/assets/rope.svg`, nine-slice) on cards, briefs, popups, panels, speech bubble, and framing the Kelpwoud. **Fish families** in six colours (yellow, orange, blue, light blue, teal, grey), one colour per school. **Painted drukmeter** (`art/drukmeter.png` → `src/assets/drukmeter.webp`) with a live needle interpolated between the measured tick angles (-2..2); zone name and value inside the dial (long names shrink to fit). Old −3..+3 SVG dial removed.
- 27 Oct (5): next round prepared while he admires the forest (brief opens in ~55 ms); **badges** for 12 lines on gold, six a side; thicker twisted rope frame with corner knots on the Kelpwoud; Captain's `STEAM_THEORY` line for theory dips on the chart and a brief note for the 11 deep-dip lines; CLAUDE.md §0 "As built" added and §9/§12/§14 brought up to date.
- 27 Oct (6): replay slower from 1.e4; wavy forest rope; side decor + vignette; Hoof-wapen; lesson popup ("Hoekom speel ons soms die Evans?", aas_baas, bait metaphor; coal metaphor dropped).
- Play-testing so far: mechanics and rendering good, points feel fair, gold reachable with great effort. **Keep `GOLD_EVAL` at 1.00 for now.**

## Open, smaller

- [ ] When the kids' drawings arrive: replace the five files in `src/assets/` (same names; faces square), build, deploy. Brief: `art/Stoomdruk_Tekenopdrag_Kaptein_en_Vixen.docx`.
- [ ] Decide whether line labels on the cards get a short Afrikaans explanation.
- [x] CLAUDE.md §9 (gauge) and §14 (round intro) match what was built (28 Oct).
- [ ] Colour fill-in after a round: confirm it looks right after real rounds.
- [ ] Engine-phase scoring waits for the full depth-14 analysis (cap 2.5 s); tighten if it feels slow.
- [ ] Promotion always gives a queen; add a picker if it ever matters.
- [ ] Optional: hidden stats panel (gold rate, average final eval) for tuning from his own device.

## Deploy

- **Portal:** the Evans card is live on Lekker Bekker (https://lekker-bekker.netlify.app, Netlify site id `59bc328c-1ff5-4402-aba1-c53066851255`). Deploy the `Speletjies_Altesaam/` folder with `npx netlify-cli deploy --prod --dir . --no-build --site <id>` (27 Oct).

- Netlify site `stoomdruk-evans` (site id `105d8220-b2d0-4947-b9e3-6580f0c6108f`), CLI deploy, Netlify account martinjbekker@gmail.com.
- Every npm/npx command needs the Node workaround first: `export PATH="/usr/local/opt/node/bin:$PATH"`.
- Redeploy: `npm run build && npx netlify-cli deploy --prod --dir dist --no-build --site 105d8220-b2d0-4947-b9e3-6580f0c6108f`
- Smoke-test build (exposes `window.__ctl`): `VITE_SMOKE=1 npx vite build && npx vite preview --port 4173`, then `node tools/smoke.mjs 1`. Rebuild without `VITE_SMOKE` before deploying.

## Later (spec section 18)

- "Wat het jou pion gekoop?" checkpoints (suggested first: it carries the main lesson)
- Die Wrakduiker (replay famous Evans games)
- Bakboord & Stuurboord tactics harbour
- Several player profiles, sound
