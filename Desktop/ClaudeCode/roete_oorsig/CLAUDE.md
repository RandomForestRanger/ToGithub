# Roete Oorsig — CLAUDE.md

## Project Overview

**Roete Oorsig** (Afrikaans: "Route Overview") is a Flask web application that takes a departure
point and a destination, fetches the driving route via OpenRouteService, and renders it as a
**print-optimised A4 diagram** — a straight vertical line (like a train/metro schematic) with
~10 prominent towns marked as dots, plus river crossings and provincial border markers.
Each town shows its distance from the start; a strip in the left margin shows the
distance of each leg (town to town), and a strip in the right margin shows the
municipalities passed through.
The target audience is a 10-year-old following progress during a road trip.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+ / Flask |
| Templating | Jinja2 (Flask built-in) |
| Frontend | Plain HTML + CSS + vanilla JS (no framework) |
| Routing API | OpenRouteService (ORS) — free tier |
| Geocoding | Nominatim (OpenStreetMap) — free, no key required |
| Geo features | Overpass API (OpenStreetMap) — towns, rivers, provincial borders |
| Diagram | SVG, generated server-side and embedded in the HTML response |
| Styling | Single CSS file; `@media print` block controls A4 output |

---

## Project Structure

```
roete-oorsig/
├── app.py                  # Flask application entry point
├── config.py               # Config (API keys loaded from .env)
├── requirements.txt
├── .env.example
├── services/
│   ├── __init__.py
│   ├── routing.py          # ORS route fetching
│   ├── geocoding.py        # Nominatim place-name lookups (Afrikaans locale)
│   ├── geometrie.py        # Route projection / intersection (RoeteMeetkunde)
│   ├── kas.py              # SQLite cache for raw API answers + job store
│   ├── overpass.py         # Overpass API: towns, rivers, provincial borders
│   └── diagram.py          # SVG vertical-line diagram builder
├── templates/
│   ├── base.html           # Base layout with print CSS
│   ├── index.html          # Input form (vertrek + bestemming)
│   └── kaart.html          # The rendered A4 diagram page
└── static/
    └── style.css           # Screen styles + @media print overrides
```

---

## API Keys & Environment

Create a `.env` file (never commit it). Use `.env.example` as the template:

```
ORS_API_KEY=your_openrouteservice_api_key_here
SECRET_KEY=   # optional; signs flash cookies, random per run if unset
```

`.gitignore` excludes `.env`, `key.txt` (a stray copy of the ORS key) and `data/`
(the SQLite cache).

ORS free-tier keys are obtained at https://openrouteservice.org/dev/#/signup  
Nominatim requires **no API key** but must include a descriptive `User-Agent` header
(e.g. `User-Agent: RoeteOorsig/1.0`).

Load env vars in `config.py` using `python-dotenv`.

---

## Core Features & Behaviour

### 1. Input Form (`index.html`)
- Two text fields: **Vertrekpunt** (departure) and **Bestemming** (destination).
- Both fields support free-text entry (city names, addresses).
- A single **"Wys Roete"** ("Show Route") submit button.
- Form submits via POST to `/kaart`.

### 2. Geocoding (`services/geocoding.py`)
- Use the **Nominatim Search API** to resolve place names to coordinates.
  - Endpoint: `https://nominatim.openstreetmap.org/search`
  - Params: `q=<place>`, `format=json`, `limit=1`, `countrycodes=za,na,bw,ls,sz,zw,mz`
    (`SOEK_LANDE`), plus `Accept-Language: af` header.
  - The country restriction is essential: without it "Worcester", "Middelburg" and
    "Wellington" resolve to the USA, the Netherlands and New Zealand.
- Always request Afrikaans locale (`accept-language: af`) so that place names
  returned are in Afrikaans where the API supports it.
- Return `(lat, lon)` for each place.

### 3. Route Fetching (`services/routing.py`)
- Use the **ORS Directions API** (driving-car profile).
  - Endpoint: `https://api.openrouteservice.org/v2/directions/driving-car`
  - Request format: GeoJSON (`format=geojson`)
  - Pass `Authorization: <ORS_API_KEY>` header.
- Extract from the response:
  - The full list of route geometry coordinates (polyline).
  - Total route distance in kilometres.
  - Total estimated duration.

### 4. Geographical Features (`services/overpass.py`)

All queries go through `_overpass()`, which POSTs with a `User-Agent` header
(overpass-api.de returns **406** without one) and falls through `OVERPASS_URLS`
(overpass-api.de → private.coffee → kumi.systems) on 429/5xx/timeouts.  Outages hit
all instances at once in waves of tens of seconds, so there are four rounds with
growing pauses (`OVERPASS_WAGTYE = (5, 10, 20)`).  On total failure `_overpass`,
`haal_dorpe` and `haal_riviere` return `None` (distinct from `[]` = nothing found);
`app.py` records this as `job["dorpe_misluk"]` / `job["riviere_misluk"]` and **stage 3
retries the failed stage after its ~80 s of sampling**, before falling back to the
Nominatim sample towns.

Queries use `_bbox_unie()`: a union of small bboxes (one per ~60 km route piece,
+0.15° buffer) from `RoeteMeetkunde.bbox_stukke()` instead of one bbox around the
whole route — far less data on diagonal routes.

**Route geometry (`services/geometrie.py`, `RoeteMeetkunde`)**: thins the ORS polyline
by distance (≥0.5 km), splits straights into ≤5 km pieces, converts to a local planar
km grid and buckets segments in a 20 km spatial grid.  `projekteer()` projects a point
onto the nearest *segment* (not vertex); `eerste_kruising()` intersects a polyline with
the route.  All km values are scaled to the ORS total distance.  (The old approach —
nearest of 80 index-spaced vertices — left 45 km gaps on long straights, dropping
on-route towns and mis-placing km by ~20 km.)

#### 4a. Prominent towns (`haal_dorpe`)
- Query Overpass for all `place` nodes (city / town / village / hamlet) with a
  `name` tag in the ~25 km tiles along the route (see Caching).
- **Drop smallholdings and township sections** (`_is_kleinhoewe`): OSM often tags these
  as town/village, but no child would call them a dorp.  Matched on `name` and `name:af`:
  trailing `AH` / `A.H.`, "Agricultural Holdings", "Landbouhoewes", "Kleinhoewes",
  "Small Farms", "Smallholdings", "Unit 14", "Ext 3" / "Extension 3" / "Uitbreiding 3".
  (E.g. "Johandeo AH" is tagged `town` and used to beat Evaton and Vanderbijlpark.)
  The same filter applies to the Nominatim fallback towns.
- For each result, project it onto the route polyline to get:
  - cumulative distance from departure (`afstand_km`)
  - perpendicular distance from the route (discard if > `MAKS_AFWYKING_KM` = 15 km)
- **Prominence** (`_prominensie`, higher wins) — used for dedup, phase 1 and gap fill:
  1. place type (`rang`: city 4 > town 3 > village 2 > hamlet 1);
  2. population (`bevolking`, parsed from the OSM `population` tag, 0 if absent);
  3. closeness to the route.
  Population decides between two towns that the road happens to pass at different
  distances (Vanderbijlpark 95 840 beats untagged Evaton).  Only ~1 in 5 SA place nodes
  carry a population tag; untagged places tie at 0 and fall through to distance.
- Deduplicate by name: for each name, keep the most prominent entry.
- Apply **spacing-aware selection** via `_kies_dorpe_met_spasiering`:
  - **Base spacing** `_min_spasiering(totale_km) = min(MIN_SPASIERING_KM = 40,
    totale_km / TEIKEN_DORPE)` with `TEIKEN_DORPE = 10`: 40 km on routes ≥ 400 km,
    a tenth of the route on shorter ones (6.8 km on the 68 km Randburg → Brits; a fixed
    40 km there left no room for any town).
  - **Dot clearance, per pair** (`_te_naby`): two dots must also be far enough apart not
    to overlap on paper: `diagram.km_vir_stippe(r1, r2, totale_km)` = km equivalent of
    `r1 + r2 + 2 × STIP_RAND_PX` px.  This only exceeds the base spacing on long routes
    and only for big dots: on 1400 km, town–town needs 37.7 km (base 40 governs) but
    city–city needs 50 km.  (A single worst-case 50 km floor used to drop Kroonstad,
    50 km from Ventersburg.)
  - The departure and destination count as spaced towns too (radius
    `EINDPUNT_RADIUS = 14`), so no town crowds them.
  - **Phase 1 — greedy by prominence**: iterate candidates by `_prominensie`; skip any
    town too close (`_te_naby`) to an already-selected town or an endpoint.
    This prevents bunching — even large cities get dropped if another city is nearby.
  - **Phase 2 — gap fill** (`_vul_gate`): scan for stretches between consecutive
    selected towns (including start/end) exceeding `MAX_GAT_KM = 150 km`. For each
    such gap, add the most prominent candidate inside it **that still passes
    `_te_naby`**. Restart scan after each insertion. A gap with no such candidate stays
    open (a squeezed-in town would overlap its neighbour).
  - Result: at most 25 towns, no overlapping dots; 150 km gaps are filled wherever a
    suitably spaced candidate exists.
- Sort final selection by `afstand_km` for diagram ordering.
- Dot radius: `city=14 px`, `town=10 px`, `village=7 px`, `hamlet=5 px`.
- Prefer `name:af` tag; fall back to `name`; then `pas_korreksies_toe` (before dedup).
- Reference results: Johannesburg → De Aar (760 km) → Vanderbijlpark, Parys, Kroonstad,
  Ventersburg, Winburg, Verkeerdevlei, Bloemfontein, Trompsburg, Gariep Dam, Colesberg,
  Hanover.  Randburg → Brits (68 km) → Diepsloot, Broederstroom, Bapong.

#### 4b. River crossings (`haal_riviere`)
- Query Overpass for `waterway=river` ways with a `name` tag within the bbox union.
- Use `out geom` to get the full node geometry of each way.
- Intersect each river polyline with the route (`RoeteMeetkunde.eerste_kruising`,
  grid-indexed segment × segment checks).  Rivers that run alongside the road without
  crossing it are **not** included.
- Keep only the **first** crossing per river name.
- `telling` = number of OSM ways carrying the name (prominence proxy for the diagram's
  river spacing filter).
- Result: list of `{naam, afstand_km, telling}`, sorted by distance.

#### 4c. Provincial borders, municipality zones, and town fallback (`haal_grense_en_sones`)
A **single sampling pass** (20 evenly-spaced points + route end) reverse-geocodes each point
via `reverse_areas()` and extracts all three datasets from the same Nominatim calls:

- **Provincial borders**: consecutive samples with different province values → crossing at midpoint.
  Result: list of `{voor_provinsie, na_provinsie, afstand_km}`.

- **Municipality zones**: wall-to-wall colour bands alongside the route line.

  **South Africa's three-tier municipal system:**
  | Tier | Examples | Include? |
  |---|---|---|
  | **Metropolitan municipality** | City of Johannesburg, City of Ekurhuleni, eThekwini, City of Cape Town, Mangaung, Buffalo City, Nelson Mandela Bay | ✅ Yes |
  | **Local municipality** | Naledi, Matjhabeng, Midvaal, Emfuleni, Ngwathe | ✅ Yes |
  | **District municipality** | Sedibeng, Fezile Dabi, OR Tambo, John Taolo Gaetsewe | ❌ Never |

  Metro and local municipalities together tile the entire country like a honeycomb —
  they never overlap and leave no gaps.  District municipalities are administrative
  groupings *of* local municipalities and must be completely ignored: they would
  double-count and confuse the zones.

  - **SA OSM admin-level structure** (critical to understanding the detection logic):
    | admin_level | Type | Nominatim field |
    |---|---|---|
    | 4 | Province | `address.state` |
    | 6 | District Municipality **or** Metropolitan Municipality | `address.county` |
    | 7 | Local Municipality | `address.municipality`, `address.city_district`, or varies |

    Local municipalities (admin_level=7) appear in different `address` fields depending
    on the area's OSM structure, and metro names often lack the word "municipality".
    `_munisipaliteit_uit_adres()` in `geocoding.py` therefore searches in four phases:
    - **Phase 1**: check `municipality`, then `city_district`, then `county` — accept
      the first value that (a) is non-empty and (b) passes `_is_muni_naam()`.
    - **Phase 2**: scan *all* address values for any string passing `_is_muni_naam()`
      (catches e.g. `city: "Breede Valley Local Municipality"`).
    - **Phase 3 — metro by elimination**: `county` is admin_level 6 = district *or*
      metro, so a non-district `county` is a metro: `"Stad Kaapstad"`,
      `"City of Tshwane"`, `"eThekwini"`.
    - **Phase 4 — ward fallback**: Nominatim sometimes omits the local municipality but
      keeps the ward (`suburb: "Drakenstein Ward 25"`).  `_WYK_PATROON` takes the prefix
      and reports `"<naam> Local Municipality"` (metros were already caught in phase 3).
    - Each call logs the result + relevant address fields at INFO level for debugging.

  - `_is_muni_naam(naam)` accepts a name if it contains `"municipality"` or
    `"munisipaliteit"` AND `_is_distrik()` returns False.
  - `_is_distrik(naam)` in `geocoding.py` matches both English and Afrikaans district
    names: `"district municipality"`, `"distriksmunisipaliteit"`, `"distrikmunisipaliteit"`,
    any name containing `" distrik"`, or any name starting with `"distrik"`.
  - **Gap-filling**: forward-fill then backward-fill any `"Onbekend"` entries so that
    every kilometre of the route belongs to a named zone (wall-to-wall coverage).
  - **Zone boundaries** sit at the midpoint between the last sample of one zone and the
    first sample of the next (like province borders), so a zone seen at only one
    sample — typically the departure metro — still gets half an interval each side.
    Resolution is ± half the sample interval (~35 km on a 1400 km route); zones shorter
    than one interval can be missed.
  - Each unique municipality is assigned a colour index (0–5, cycling) from `SONE_KLEURE`
    in `diagram.py`.
  - Result: list of `{naam, van_km, tot_km, kleur_indeks}`.

- **Town fallback** (`dorpe_steekproef`): extracted free-of-charge from the same Nominatim
  responses. Used when Overpass returns no towns, and to fill gaps it left
  (`vul_aan_met_steekproef`, see Staged Map Assembly).
  - Only actual settlements are included — `_is_nedersetting(naam)` in `geocoding.py`
    excludes any name containing admin-area keywords in English or Afrikaans:
    `"municipality"`, `"metropolitan"`, `"district"`, `"local council"`,
    `"munisipaliteit"`, `"metropolitaans"`, `"distrik"`.
  - Deduplicates names; excludes towns within 10 km of start/end (the spacing rule then
    applies as for Overpass towns).
  - Each entry carries the *sample's* `afstand_km` and `lat`/`lon` (can be ±35 km off the
    town itself); `vul_aan_met_steekproef` refines them before use.

**Implementation notes:**
- Samples are stored as dicts `{"prov", "muni", "dorp", "tipe", "afstand"}`.
- 20 samples with 3 s sleep between calls ≈ 65–80 s (stage 3 runs in the background).
- Nominatim 429 responses are retried with 10 s × attempt backoff.

### 5. Afrikaans Place Names
- **Always** request `accept-language=af` in all Nominatim calls.
- Apply a **post-processing correction table** for common known
  English→Afrikaans substitutions that the API may miss. Maintain this table
  in `services/geocoding.py` as a plain Python dict. Seed it with at minimum:

```python
AFRIKAANS_KORREKSIES = {
    "Cape Town": "Kaapstad",
    "Somerset West": "Somerset-Wes",
    "George": "George",           # same
    "Johannesburg": "Johannesburg",  # same
    "Pretoria": "Pretoria",          # same
    "Stellenbosch": "Stellenbosch",  # same
    "Paarl": "Paarl",                # same
    "Worcester": "Worcester",        # same
    "Mossel Bay": "Mosselbaai",
    "Knysna": "Knysna",
    "Port Elizabeth": "Gqeberha",    # official name; add both
    "Gqeberha": "Gqeberha",
    "East London": "Oos-Londen",
    "Bloemfontein": "Bloemfontein",  # same
    "Durban": "Durban",              # same
    "Pietermaritzburg": "Pietermaritzburg",
    "Beaufort West": "Beaufort-Wes",
    "Caledon": "Caledon",
    "Swellendam": "Swellendam",
    "Oudtshoorn": "Oudtshoorn",
    "De Doorns": "De Doorns",
    "Hex River": "Hexrivier",
    "Three Sisters": "Drie Susters",
    "Touws River": "Touwsrivier",
    "Matjiesfontein": "Matjiesfontein",
}
```

  Apply this table as a final pass on every place name before display.
  `pas_korreksies_toe` matches whole words, case-insensitively, longest key first
  ("cape town" → "Kaapstad", "Georgetown" untouched).  `bou_svg` applies it to the
  header, endpoints, towns and rivers; Overpass names are also corrected before dedup.

### 6. SVG Diagram (`services/diagram.py`)
This is the heart of the app. Generate a pure SVG that represents the route as
a **straight vertical line** regardless of the route's actual geographic shape.

**SVG canvas:**
- Dimensions: `794px × 1123px` (A4 at 96 dpi, portrait).
- Route line centred horizontally at `x = 397`.
- Departure dot at `y = 170`; destination dot at `y = 1060`.

**Drawing layers (bottom to top):**
0. Margin strips: municipality zones on the right (x=635–662, see 4c) and **leg
   distances on the left** (`BEEN_X1`–`BEEN_X2` = x=123–159, mirroring the municipality
   strip at 238 px from the route line).  The leg strip has one band per leg —
   departure → town 1 → … → destination (`_bene`) — whose edges are level with the dots,
   alternating between two soft greens (`BEEN_KLEURE`), with the leg's km (bold 9 px,
   white `HALO`) centred horizontally in it when the band is ≥ 12 px tall.  Legs are
   differences of the integer `afstand_km` values, so they always sum to the total.
   The cumulative "x km" under each town name stays as is.
1. Province border lines — full-width dashed horizontal lines (`stroke="#7b241c"`,
   `stroke-dasharray="6 4"`).  Both province names sit at the **far left margin**
   (`x=44`, clear of the right-aligned town labels): the departing province just
   **above** the line, the entering province just **below** it.
2. River crossing ticks — thin horizontal lines (`stroke="#1a5276"`, `stroke-width="1"`,
   28 px each side), labelled in blue to the right at `font-size="8"`. River labels use
   a tight 9 px minimum vertical spacing (no extra padding, just enough to avoid overlap).
   Rivers pass through `_filter_riviere`, a **hierarchy of elimination**:
   - **Tier 1** (`RIVIER_VLAK_1`, 5 rivers: Oranje, Vaal, Limpopo, Thukela, Breë) —
     never dropped, regardless of spacing.
   - **Tier 2** (`RIVIER_VLAK_2`, 10) → **tier 3** (`RIVIER_VLAK_3`, 20) → untiered
     compete for space in that order; within a tier, `telling` then distance breaks ties.
   - Greedy spacing: a river is kept only if ≥ 2 % of the route length from every
     river already kept (tier 1 included).  Cap: 50 non-tier-1 rivers.
   - Names match via `_normaliseer_rivier` (lowercase, accents and "rivier"/"river"
     suffix stripped, non-alphanumerics removed), so each list entry holds its
     spellings: `("oranje", "orange", "gariep")`.  Generic names occurring many times
     nationally (Riet, Klip, Buffels, Krokodil, Sand, Elands, Vis) are deliberately
     kept out of the tiers.
3. Road-texture dashed line + main route line (`stroke="#2c5f2e"`, 3 px).
4. Town dots and labels — circles of varying radius; labels on the left.
5. Header, legend, footer.

**Town dot radii:**
- `city` → 14 px, `town` → 10 px, `village` → 7 px, `hamlet` → 5 px.
- Departure and destination always drawn at 14 px.

**Labels:**
- All town labels (including departure and destination) are on the left
  (`text-anchor="end"`, `x = lyn_x - 20`): bold 13 px name above an 11 px km line,
  centred on the label's y.  River labels (8 px) are on the right.
- `_versprei(gewens, spasie, y_min, y_max)` does 1-D label placement: overlapping
  labels merge into clusters centred on their dots (spreading up *and* down), clamped
  to the page.  Spacing: `DORP_LABEL_SPASIE = 30`, `RIVIER_LABEL_SPASIE = 10`.
  Town labels are clamped between the departure and destination labels.
- A thin grey leader line joins any town label that had to move > 3 px to its dot
  (blue, for river labels moved > 2 px).
- Municipality strip labels are trimmed to fit their band height.
- Town and river labels carry a white outline (`HALO`: `paint-order="stroke"`,
  3 px white stroke) so province border lines passing behind them are masked
  instead of striking through the text.

**Legend (below header):**
- Small row of colour-coded symbols: green dot = stad/dorp, blue line = rivier,
  dashed red line = provinsie grens, yellow square = munisipaliteit, pale green
  square = afstand tussen dorpe.

**Header (top of page):**
- App name: **"Roete Oorsig"** — large, bold, centred, 28px.
- Subtitle: `"<Vertrekpunt> na <Bestemming>"` — 16px, centred.
- Total distance + estimated time — 13px, centred, muted colour.

**Footer (bottom of page):**
- Small centred text: `"Gegenereer deur Roete Oorsig • OpenStreetMap-data"` — 10px, muted.

### 7. Print Behaviour (`static/style.css`)
```css
@media print {
  /* Hide everything except the SVG diagram */
  /* #kaart-wrapper is inside .kaart-bladsy — hide siblings, not the container */
  body > *:not(.kaart-bladsy) { display: none; }
  .kaart-bladsy > *:not(#kaart-wrapper) { display: none; }
  #kaart-wrapper { display: block; margin: 0; padding: 0; }
  svg { width: 210mm; height: 297mm; page-break-after: avoid; }
  @page { size: A4 portrait; margin: 0; }
}
```
- The screen view shows the diagram plus a **"Druk Kaart"** ("Print Map") button.
- The print button calls `window.print()`.
- On print, only the SVG is visible — no form, no nav, no button.
- The SVG must NOT use `viewBox` scaling that would cause blurriness;
  target physical A4 dimensions directly via the `@page` rule.

### 8. Error Handling
- If geocoding fails for either location: flash a friendly Afrikaans error:
  `"Kon nie die plek '<naam>' vind nie. Probeer asseblief 'n meer spesifieke naam."`
- If ORS routing fails (no route found, API error): flash:
  `"Kon nie 'n roete vind nie. Kontroleer asseblief die plekname en probeer weer."`
- All errors redirect back to the index form with the error message displayed.
- Log full exception details server-side via Python's `logging` module.

---

## Flask Routes

| Method | Path | Description |
|---|---|---|
| GET  | `/` | Render the input form (`index.html`) |
| POST | `/kaart` | Stage 0: geocode + route → initial SVG → render `kaart.html` |
| GET  | `/api/update/<job_id>/dorpe` | Stage 1: Overpass towns → updated SVG (JSON) |
| GET  | `/api/update/<job_id>/riviere` | Stage 2: Overpass rivers → updated SVG (JSON) |
| GET  | `/api/update/<job_id>/munisipaliteite` | Stage 3: Nominatim sampling → zones + borders → final SVG (JSON) |

---

## Staged Map Assembly

The map is assembled progressively so the user sees it grow in stages rather than
waiting ~90 seconds for a single response.

**Stage 0 — Initial load** (~10 s, blocks the browser):
- Geocode departure + destination via Nominatim
- Fetch route polyline + distance + duration from ORS
- Store all route data as a job in the SQLite cache (`kas`, soort `"taak"`) keyed on a `uuid4` job ID
- Render and return `kaart.html` with a bare SVG (route line + departure/destination dots only)

**Stages 1–3 — Progressive API calls** (browser-driven, non-blocking):
- `kaart.html` embeds the `job_id` and runs JS that calls the three `/api/update/` endpoints sequentially
- Each endpoint fetches its data, updates the job store, rebuilds the **complete** SVG, and returns it as JSON `{"svg": "..."}` 
- The JS replaces `#kaart-wrapper` innerHTML with the new SVG after each response
- A status bar (`#stadium-balk`) shows the current stage and disappears when complete

**Stage order:**
1. Towns (Overpass, fast ~5 s) → town dots appear
2. Rivers (Overpass, fast ~5 s) → river ticks appear
3. Municipality zones + province borders (Nominatim 20-sample loop, ~65 s) → colour bands + dashed lines appear

**Town fallback**: Stage 3 calls `vul_aan_met_steekproef(job["dorpe"], dorpe_steekproef, …)`:
- Overpass returned no towns → the sample towns go through the full spacing-aware
  selection.
- Otherwise → only gaps > `MAX_GAT_KM` are filled (under the same spacing rule);
  Overpass towns are never displaced.
- Only candidates that could be used are **refined**: `geocodeer_naby()` looks the name
  up within ±0.4° of its sample point (`bounded=1`, so "Richmond" finds the one on the
  route; `featureType=settlement`, so "Gariep Dam" finds the town, not the reservoir), then the town is projected onto the route like an Overpass town and dropped
  if > 15 km off it.  ~1 s per candidate (e.g. sample "Paarl" at 70 km → real 59 km).

**Job lifecycle**: jobs live in the SQLite cache (soort `"taak"`, never bypassed), not in
memory, so a route in progress survives the dev server's reload on code changes.  Each
stage saves the job, refreshing its 30-minute lifetime; expired rows are purged by
`kas.ruim_op()` at the start of each `/kaart` request.  Stage endpoints share the
`_stadium` decorator (load job → run stage under the job's fresh-data setting → save →
return SVG).

---

## Caching (`services/kas.py`)

**Principle: cache raw API answers, never finished maps.**  Selection and drawing re-run
on cached data in well under a second, so rule changes (spacing, river tiers, …) apply
immediately and overlapping routes share data.  **Failures are never cached**, so
incomplete routes fill in cumulatively on later runs.

Storage: `data/roete_oorsig.db` (SQLite, WAL, one connection per thread), table
`kas(soort, sleutel, waarde JSON, verval)`.  Default lifetime 90 days.

| soort | Key | Value | Where |
|---|---|---|---|
| `geocode` | query lowercased + `SOEK_LANDE` | `[lat, lon]` (found only) | `geocodeer` |
| `geocode_naby` | name + 0.1° cell | `{"koord": [lat, lon] \| null}` (not-found is cached) | `geocodeer_naby` |
| `omgekeerd` | 0.02° cell (`OMGEKEERD_SEL_GRAAD`, ~2 km) | raw Nominatim `address` dict | `_omgekeerde_adres` |
| `ors_roete` | start/end coords to 5 decimals | `{koordinate, afstand_m, tyd_s}` | `haal_roete` |
| `overpass_dorpe_v1` | tile `i,j` | raw place nodes in the tile | `_haal_teels` |
| `overpass_riviere_v1` | tile `i,j` | raw river ways (`out geom`) with ≥1 vertex in the tile | `_haal_teels` |
| `taak` | job id | the job dict (30 min) | `app.py` |

**Overpass tiles**: `TEEL_GRAAD = 0.25` (~25 km).  `_teels_vir_roete` lists every tile
touched by the route's `bbox_stukke`; `_haal_teels` serves cached tiles and fetches the
rest in batches of `TEEL_BONDEL = 60`, storing each batch as it arrives (empty tiles
are stored too — "nothing here" is an answer).  If a batch fails it stops and returns
`(elements, volledig=False)`; the map draws what it has and the missing tiles are retried
in stage 3 and on later runs.  **Bump the `_vN` suffix when a query changes.**
River ways are stored whole in every tile they have a vertex in (duplicated across
tiles, de-duplicated by OSM id on read; ~60 KB/tile).  Clipping each copy to its tile
would shrink this further if size ever matters.

**Nominatim rate limiting** is central: every call goes through `geocoding._nominatim`,
which waits only before *network* calls (`SOEK_INTERVAL_S = 1.1`, reverse lookups
`OMGEKEERD_INTERVAL_S = 3.0`).  Cache hits never wait, so a cached stage 3 takes ~0 s
instead of ~80 s.  Do not add `time.sleep` around Nominatim calls elsewhere.

**Fresh-data mode** (dev): open `/?vars=1`; the form carries a hidden `vars=1`, stored as
`job["vars"]`.  Under `kas.omseil(True)` cache reads miss but successful answers are
still written (refreshing the cache).  The stage-3 retry of incomplete Overpass stages
deliberately reads the cache (`kas.omseil(False)`) so tiles refreshed moments earlier
are not fetched twice.

**CLI**:
- `flask --app app kas-stand` — entries and size per soort.
- `flask --app app kas-uitvee [SOORT]` — clear everything, or one soort.

Measured: Johannesburg → De Aar cold ≈ 2 min; fully cached ≈ 0.8 s for all four stages.

## Data Flow Summary

```
POST /kaart
  Nominatim geocodes departure + destination           [~2 s]
  ORS Directions API → polyline + distance + duration  [~5 s]
  Store job in SQLite (kas, soort "taak"); render initial SVG
        ↓ browser receives kaart.html (~10 s total)
        ↓
  JS fetch → GET /api/update/{id}/dorpe
    Overpass (bbox) → prominent towns → spacing-aware selection  [~5 s]
    Returns updated SVG (towns added)
        ↓
  JS fetch → GET /api/update/{id}/riviere
    Overpass (bbox union) → named river ways (out geom) → route intersections  [~5–30 s]
    Returns updated SVG (rivers added)
        ↓
  JS fetch → GET /api/update/{id}/munisipaliteite
    Nominatim reverse_areas × 20 samples (3 s sleep each) → ~65 s
    Province border crossings + local/metro municipality zones
    + town fallback if Overpass was empty
    Returns final complete SVG
        ↓
  Status bar hides; "Druk Kaart" ready
```

---

## requirements.txt (seed content)

```
flask>=3.0
python-dotenv>=1.0
requests>=2.31
```

---

## Development Notes

- Run dev server: `flask --app app run --debug --port 5001` (port 5000 is taken by
  macOS AirPlay)
- Never commit `.env` — only `.env.example`.
- The SVG is generated as a Python string in `services/diagram.py` and passed
  to the Jinja2 template via `render_template('kaart.html', svg=svg_string, ...)`.
  Mark it safe in the template with `{{ svg | safe }}`.
- Keep all ORS and Nominatim HTTP calls inside `services/` — never in `app.py`.
- Respect Nominatim's usage policy: max **1 request per second** — enforced centrally
  by `geocoding._nominatim` (see Caching).  Never call Nominatim around it.
- The index page's loading overlay counts down 20 s (stage 0 only) and resets on
  `pageshow` when the page is restored from the back/forward cache.
- ORS free tier allows 2 000 daily requests and 40 requests/minute — sufficient
  for development and light production use.

---

## Language & Copy Conventions

All user-visible text must be in **Afrikaans**:

| English | Afrikaans |
|---|---|
| Route Overview | Roete Oorsig |
| Departure | Vertrekpunt |
| Destination | Bestemming |
| Show Route | Wys Roete |
| Print Map | Druk Kaart |
| Total distance | Totale afstand |
| Estimated time | Geskatte tyd |
| hours / minutes | uur / minute (abbreviated: u / m) |
| Generated by | Gegenereer deur |
| Error messages | See §8 above |

---

## Out of Scope (do not implement)

- User accounts or saved routes.
- Map tiles or geographic background imagery.
- Zoom, pan, or interactive map controls.
- Mobile-responsive layout (print is the primary output).
- Multiple route alternatives.
- Traffic or live data.
