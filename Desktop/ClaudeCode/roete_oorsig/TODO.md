# Roete Oorsig — TODO

## Status (2026-10-14, late afternoon)

Historical sites layer implemented, **not yet committed**.  Main source switched from
OpenStreetMap to **Wikidata** (one region-wide SPARQL query, cached a year): OSM has very
few historical sites in SA (not one battlefield around Ladysmith).  The Overpass country
fetch was stopped at 1 697 / 3 484 tiles; those tiles are kept and read from the cache
only.  Added UNESCO World Heritage Sites, caves, museums (+ icons).  22 tests pass.

Results now: Johannesburg → Durban 5 sites (incl. Slag van Spioenkop, Willow Grange);
Johannesburg → Kaapstad 6 (Vredefort-koepel … Kaapse floraryk); Johannesburg → Pretoria 8.

## Speed (agreed — points 1–4)

Code done (2026-10-14).  Run: `flask --app app vooraf [--status PAD] [--geen-roetes]` —
slow (20 tiles/batch, 30 s pauses, 5 min after a failure), stores every batch as it
arrives, resumable: just start it again.  Started 2026-10-14 in the background.

1. [x] **Historical sites for the whole region** — replaced by one Wikidata SPARQL query
   (cached 1 year).  The Overpass tile fetch was stopped (see Status).  The sites stage
   now takes ~0 s on every route.
2. [x] **Drop the extra town-tile fetch** in `histories._plekke`: use the town tiles stage 1
   already fetched (0.15° buffer) instead of fetching them with the 0.35° buffer.  Sites
   15–30 km off the road count as out of town (only famous ones qualify there anyway).
3. [x] **Make the sites the last stage** (after municipalities) in `kaart.html`, so the
   core map is complete first; move the stage-3 retry/re-select accordingly.
4. [~] **Pre-warm the top routes** (code done; running under `caffeinate -i` since 16:07) — CLI command taking a route list, running all stages
   so towns, rivers and Nominatim samples are cached.  Candidates:
   Pretoria–Bloemfontein, Johannesburg–Durban, Bloemfontein–Kaapstad, Kaapstad–Gqeberha,
   Durban–Gqeberha, Pretoria–Kimberley, Johannesburg–Kaapstad, Johannesburg–Polokwane,
   Kaapstad–George, Durban–Bloemfontein, + 10 more (`VOORAF_ROETES` in `app.py`).
   Note: these entries expire after 90 days — decide whether to re-run periodically.

## Open items

- [x] Huge UNESCO regions and spread-out serial listings are skipped (area > 1 500 km²,
  parts > 50 km apart, + Namib Sand Sea / Makhonjwa by Q-ID).  8 sites on short routes: fine.
- [x] Bridge-gap crossings (river line ending ≤ 50 m from the road, pieces on both sides):
  Klein Jukskei recovered; no false crossings on the 3 test routes.
- [~] Named streams in river gaps > 25 km (lowest tier, double spacing, shorter tick) —
  code + tests done; **live test pending (Overpass 504)**: Randburg → Skeerpoort and the
  3 brief routes.  Renosterspruit (way 1312957902) and the Leeuwen stream are unnamed in
  OSM, so they cannot appear — unless someone adds `name=` in OSM.
- [ ] Re-run `vooraf` after the current warm-up (it runs the old code): fills the stream
  tiles for the 20 routes; everything else is cached and skipped.
- [ ] Calibrate `BEROEMD_SITELINKS` (15) and `MIN_SITELINKS` (2) on more routes.
- [x] Visual check (3 routes, headless Chrome): route line moved left to x=357, site names
  wrap onto up to 4 lines of 22 chars instead of ellipses; footer credits Wikidata.
- [ ] Wikidata `wbgetentities` sometimes answers `maxlag` (servers lagging): OSM extras then
  lack sitelinks for that run (not cached, fine) — maybe retry with a longer wait.
- [ ] Optional: a short waiting note for routes with no cached data at all (the
  municipality stage takes ~1 min there).  Draft text:
  "Hierdie roete gaan my 'n rukkie vat om saam te stel. Die dorpe en riviere neem nie
  lank nie, maar omdat ek hierdie roete nog nie tevore bereken het nie, gaan ek so
  'n minuut besig wees. Gee my net 'n kans!"
- [ ] Commit once the above is verified.
