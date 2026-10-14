# Feature: Historical sites layer for the strip map

## Context

This app takes a departure and destination, computes a route, and renders a strip map (always roughly A4) showing the towns, rivers and provinces the route passes through. That part works. Do not change existing behaviour.

The new feature is an optional layer that adds up to **eight** well-known historical sites along or near the route, each with a small icon, in the spirit of the 1970s/80s South African service-station road maps.

**Before writing code:** read the codebase and summarise back to me how the route geometry is stored, how existing features (towns, rivers, provinces) are fetched and rendered, and where the splash screen and settings live. Then propose a plan that fits the existing architecture. Wait for my go-ahead before implementing.

## 1. Guiding principle

Keep it light and fast. This is a garnish, not a research engine.

- **Target is 8 sites, regardless of route length.** The map is always about A4, so 8 always fits.
- **Fewer is fine.** Never pad with obscure sites to reach 8. Johannesburg to Pretoria might show two or three, or none. Johannesburg to Cape Town will have many candidates and must be selective.
- Minimise API calls. One Overpass query per route, plus at most one batched Wikidata lookup.

## 2. Data source and notability filter

Query OpenStreetMap via the Overpass API for features within the route corridor that:

- carry a `historic=*` tag (e.g. `battlefield`, `monument`, `memorial`, `ruins`, `fort`, `castle`, `archaeological_site`, `building`, `church`, `tomb`, `mine`, `railway`), or are heritage-tagged places of worship, **and**
- have a `name` **and** a `wikipedia=*` or `wikidata=*` tag.

The Wikipedia/Wikidata requirement is the notability filter. It keeps out unnamed plaques and obscure features and keeps the result set small, which keeps the query fast.

Corridor: buffer the route by **10 km** (a constant, easy to change). For long routes, simplify the route polyline before using it in the query (an `around:` filter on a simplified line, or a few bounding-box segments), and set a sensible Overpass timeout.

Then make **one batched Wikidata call** for the returned items to get their number of Wikipedia language sitelinks. This is the fame score. If the Wikidata call fails, fall back to ranking by OSM data alone.

Cache results per route so re-rendering the same trip makes no new calls. Respect the Overpass and Wikidata usage policies and set a proper User-Agent.

## 3. Ranking

Score each candidate with a single, easy-to-tweak function:

- Wikipedia sitelink count (main signal)
- Small bonus for being closer to the route

Deduplicate features that point to the same Wikidata item (e.g. a battlefield polygon and a memorial node for the same battle): keep one.

## 4. Selection and spacing

1. Sort candidates by score.
2. Fill up to 8 slots greedily from the top.
3. Apply a spacing rule along the route: no two selected sites closer than `route_length / 12` (roughly) in along-route distance. If a candidate is too close to one already chosen, skip it. This stops the KZN battlefields or the Cape Winelands from eating the whole quota.
4. If spacing leaves fewer than 8, that is fine. Do not relax the notability filter to fill the gaps.

Store each selected site's along-route position (distance from departure) and its distance from the route, for placement on the strip.

## 5. Icons

Small, monochrome SVG icons in a period road-map style, legible at ~12 to 16 px. Draw them as hand-written SVG paths rather than pulling in an icon library. Keep the type-to-icon mapping in one config object.

| Type | Icon |
|---|---|
| battlefield | crossed swords |
| fort, castle | small battlement / fort outline |
| monument, memorial | obelisk |
| church, historic religious building | church with steeple |
| ruins | broken column or broken wall |
| archaeological_site, rock art | stylised artefact or hand print |
| historic building, house (incl. Karoo corbelled houses) | small house outline; dome variant for corbelled houses if identifiable by name or tag |
| grave, tomb | small headstone |
| mine | crossed pick and shovel |
| historic railway | small locomotive |
| anything else | generic star |

## 6. Rendering

- A separate layer drawn above roads/rivers but below town labels.
- Each site: icon plus a short label (name, truncated if long). Labels must not collide with existing labels; if a label cannot be placed, show the icon alone.
- A small legend showing only the icon types present on the current map.

## 7. Settings

Keep it minimal:

- **A historical sites on/off toggle on the splash screen**, alongside the departure and destination inputs.
- Max sites, corridor width, and spacing divisor as constants in one config file (not exposed in the UI).

## 8. Testing

Run these routes and show me the selected sites for each:

- Johannesburg to Pretoria (expect 0 to 3)
- Johannesburg to Durban via N3 (expect 8, check spacing through the battlefields)
- Johannesburg to Cape Town (expect 8, well spread)

Write unit tests for scoring, deduplication and the spacing rule using fixture data, so tests do not depend on live APIs.

## Notes

- OSM coverage is crowd-sourced and uneven. Fail gracefully: if the query returns nothing or times out, render the map without the layer.
- Keep the existing code style and stack. Do not add heavy dependencies without asking.
