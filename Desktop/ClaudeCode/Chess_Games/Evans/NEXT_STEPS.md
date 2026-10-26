# Next steps: Stoomdruk (Evans)

**Live:** https://stoomdruk-evans.netlify.app · **Last session:** 26 October 2026 · All 11 unit tests pass.

## Pick up here (start of next session)

1. **Martin's wording pass.** Is `src/content/kaptein.ts` edited? If so: check it (quotes around `'n`, `{line}`/`{move}` kept, `ROUND_START`/`RETARGET`/`MISSED` unchanged), run the tests, build and redeploy.
2. **Decisions waiting for Martin** (Claude asks once, then acts):
   - [ ] Commit + deploy the portal card in `Speletjies_Altesaam` (together with Martin's own D6 Dynamos wording edits there)?
   - [ ] Push the Evans commits to GitHub (branch `add-RandomForestRanger`, 6+ commits ahead)?
   - [ ] Round intro shows the target's full moves every round. Keep, or show only the stages for grey lines and the full moves once a line is green?
   - [ ] Pawn icons (♙) under the dial to show how many pawns are invested (the moving red mark was removed with the fixed dial)?
   - [ ] Skeepsligte off: should it also silence the Captain's two bishop lines?
   - [ ] Begin oor: keep "same line, saves nothing", or pick a new target / keep lines conquered so far?
3. **Touch test on a phone or tablet** (only tested on PC/MacBook so far): tap-to-move, pinch-zoom and pan in the forest, tapping bulbs, the intro card as a bottom sheet, the MISSED replay popup.

## Done (for reference)

- 21 Oct: debug hooks only in dev/`VITE_SMOKE=1` builds, bundle split, check-8 unit test, stale root `canon_builder.py` removed.
- 22 Oct: deployed to Netlify (see Deploy below).
- 23 Oct: **Begin oor** button during a round (two-tap confirm, restarts the same line, saves nothing).
- 24 Oct: interim art — four Captain mood faces (`src/assets/kaptein/*.webp`, mood per line in `MOOD` in `kaptein.ts`) and the *Vixen* (`src/assets/vixen.webp`).
- 26 Oct:
  - MISSED popup **replays**: his game from 4.b4 (quick), pause on the needed move (green arrow), the line's route to its end, 5 s freeze, closes (`src/ui/MiniReplay.tsx`).
  - **Fixed Stoomdruk dial**: −3..+3, blue < −1 < amber < 0 < green < +1 < gold; only the needle (eval) moves. Round-end graph on the same scale. (CLAUDE.md section 9 still describes the old moving red/gold marks.)
  - **Round intro over the Kelpwoud**: camera glides to the target, route glows, card lists stages and moves, button "Ek is gereed!".
- Play-testing so far: mechanics and rendering good, points feel fair, gold reachable with great effort. **Keep `GOLD_EVAL` at 1.00 for now.**

## Open, smaller

- [ ] When the kids' drawings arrive: replace the five files in `src/assets/` (same names; faces square), build, deploy. Brief: `art/Stoomdruk_Tekenopdrag_Kaptein_en_Vixen.docx`.
- [ ] Decide whether line labels on the cards get a short Afrikaans explanation.
- [ ] Update CLAUDE.md section 9 (gauge) and section 14 (round intro) to match what was built.
- [ ] Colour fill-in after a round: confirm it looks right after real rounds.
- [ ] Engine-phase scoring waits for the full depth-14 analysis (cap 2.5 s); tighten if it feels slow.
- [ ] Promotion always gives a queen; add a picker if it ever matters.
- [ ] Optional: hidden stats panel (gold rate, average final eval) for tuning from his own device.

## Deploy

- Netlify site `stoomdruk-evans` (site id `105d8220-b2d0-4947-b9e3-6580f0c6108f`), CLI deploy, Netlify account martinjbekker@gmail.com.
- Every npm/npx command needs the Node workaround first: `export PATH="/usr/local/opt/node/bin:$PATH"`.
- Redeploy: `npm run build && npx netlify-cli deploy --prod --dir dist --no-build --site 105d8220-b2d0-4947-b9e3-6580f0c6108f`
- Smoke-test build (exposes `window.__ctl`): `VITE_SMOKE=1 npx vite build && npx vite preview --port 4173`, then `node tools/smoke.mjs 1`. Rebuild without `VITE_SMOKE` before deploying.

## Later (spec section 18)

- "Wat het jou pion gekoop?" checkpoints (suggested first: it carries the main lesson)
- Die Wrakduiker (replay famous Evans games)
- Bakboord & Stuurboord tactics harbour
- Several player profiles, sound
