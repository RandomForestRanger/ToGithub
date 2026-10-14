"""
Historical sites layer: up to MAKS_HISTORIES well-known sites along the route,
in the spirit of the old service-station road maps.

Sources:
  - Wikidata (main): ONE SPARQL query for all of SA and its neighbours —
    battles, forts, monuments, churches, archaeological and fossil sites, rock
    art, caves, museums, mines, UNESCO World Heritage Sites, … with coordinates,
    Afrikaans/English labels and sitelink counts.  Cached for a year.
  - OpenStreetMap (extra): historical sites with a wikidata/wikipedia tag from
    the Overpass tiles fetched earlier — read from the cache only, never fetched
    (OSM has very few historical sites in SA; Wikidata is far richer).

Two steps, so that selection can re-run on cached data without network calls:
  haal_histories()  — candidates with fame and position along the route.
  kies_histories()  — score, de-duplicate, space → the sites to draw.

Scoring favours sites out in the country on long empty stretches over famous
churches in towns: the point is to make the long stretches interesting.
"""
import logging
import time
import requests
from config import USER_AGENT
from services import kas
from services.geocoding import pas_korreksies_toe
from services.geometrie import RoeteMeetkunde, haversine
from services.overpass import (_haal_teels, _teels_vir_roete,
                               DORPE_SOORT, DORPE_FILTER, DORPE_UIT)
from services.ikone import ikoon_tipe, ikoon_vir_naam

logger = logging.getLogger(__name__)

# ── Tuning ──────────────────────────────────────────────────────────────────
MAKS_HISTORIES      = 8
KORRIDOR_KM         = 10    # every site within this distance of the road qualifies…
BEROEMD_KORRIDOR_KM = 30    # …famous ones (≥ BEROEMD_SITELINKS) up to this distance
BEROEMD_SITELINKS   = 15    # Wikipedia language editions that make a site "famous"
SPASIERING_DELER    = 12    # no two sites closer than route length / 12
NABY_BONUS          = 0.25  # up to +25 % for a site right next to the road
IN_DORP_FAKTOR      = 0.35  # a site inside a town scores about a third
STREK_BONUS         = 0.5   # up to +50 % for a site far from any town dot…
STREK_VOL_KM        = 50    # …reached at this along-route distance from the nearest dot
# A site is "in town" within this distance of a place node of that type
IN_DORP_RADIUS_KM   = {"city": 6.0, "town": 3.0, "village": 1.5}

UNESCO_FAKTOR       = 2.0   # World Heritage Sites score double and always count as famous
# …except huge regions and spread-out serial listings, whose single Wikidata point
# says little about where the road meets them (their components stand on their own)
UNESCO_MAKS_KM2        = 1500   # Cape Floral Region 78 555 km², Drakensberg 2 493; Vredefort 300
UNESCO_MAKS_SPREIDING_KM = 50   # parts further apart (Mandela Legacy Sites: 23 parts)
# Huge regions Wikidata has no area for (checked Oct 2026)
UNESCO_UITGESLUIT = {"Q65241628",   # Namib Sand Sea (~30 000 km²)
                     "Q19605615"}   # Makhonjwa Mountains (a mountain range)
# Notability for Wikidata items: sitelinks (Wikipedias + Commons etc.).  1 is not
# enough — bots created single-language stubs for ~900 SA mine shafts.
MIN_SITELINKS       = 2

# Wikidata, whole region in one query
SPARQL_URL = "https://query.wikidata.org/sparql"
LAND_SOORT = "wikidata_land_v2"
# SOEK_LANDE: South Africa, Namibia, Botswana, Lesotho, Eswatini, Zimbabwe, Mozambique
LANDE = ["Q258", "Q1030", "Q963", "Q1013", "Q1050", "Q954", "Q1029"]
UNESCO_ERFENIS = "Q9259"   # World Heritage Site (P1435 designation, sometimes P31)
# Wikidata class → icon type.  Matched on P31 and one level of P279.  When an item
# has several, the first icon in IKOON_VOORRANG wins.
WIKIDATA_KLASSE = {
    "Q178561": "slagveld", "Q4895508": "slagveld",                        # battle, battlefield
    "Q57821": "fort", "Q1785071": "fort", "Q23413": "fort", "Q82101": "fort",   # fortification, fort, castle, blockhouse
    "Q4989906": "monument", "Q5003624": "monument", "Q152081": "monument",  # monument, memorial, concentration camp
    "Q16970": "kerk", "Q24398318": "kerk", "Q1564373": "kerk", "Q44613": "kerk",  # church, religious building, mission, monastery
    "Q109607": "ruine",
    "Q839954": "argeologie", "Q1211146": "argeologie", "Q42195": "argeologie",   # archaeological site, rock art, petroglyph
    "Q1269827": "argeologie", "Q1149405": "argeologie", "Q9096832": "argeologie",  # rock painting, rock shelter, fossil site
    "Q35509": "grot", "Q2232001": "grot",                                   # cave, show cave
    "Q33506": "museum",
    "Q35112127": "gebou", "Q1802963": "gebou",                              # historic building, mansion
    "Q173387": "graf", "Q381885": "graf", "Q39614": "graf",                 # grave, tomb, cemetery
    "Q820477": "myn",
    "Q420962": "spoorweg",                                                  # heritage railway
}
IKOON_VOORRANG = ["slagveld", "fort", "grot", "argeologie", "monument", "myn", "spoorweg",
                  "kerk", "ruine", "graf", "museum", "gebou"]

# Tiles: 0.35° ≈ 32–39 km covers BEROEMD_KORRIDOR_KM in every direction
HISTORIES_BUFFER_GRAAD = 0.35
HISTORIES_TTL_S = 365 * 24 * 3600   # historical sites barely change
HISTORIES_SOORT  = "overpass_histories_v1"
HISTORIES_FILTER = [
    'nwr["historic"]["name"][~"^(wikidata|wikipedia)$"~"."]',
    'nwr["amenity"="place_of_worship"]["heritage"]["name"][~"^(wikidata|wikipedia)$"~"."]',
]
HISTORIES_UIT = "out tags center;"

WIKIDATA_URL    = "https://www.wikidata.org/w/api.php"
WIKIDATA_SOORT  = "wikidata_v1"
WIKIDATA_BONDEL = 50   # wbgetentities limit
# Sitelinks ending in "wiki" that are not Wikipedias
_NIE_WIKIPEDIA = {"commonswiki", "specieswiki", "metawiki", "mediawikiwiki", "wikidatawiki",
                  "sourceswiki", "wikimaniawiki", "outreachwiki", "incubatorwiki", "wikifunctionswiki"}


# ---------------------------------------------------------------------------
# Wikidata
# ---------------------------------------------------------------------------

def _wikidata(qids):
    """
    {qid: {"sitelinks": n, "af": label|None, "en": label|None}} for the given
    Q-IDs, from the cache where possible.  Returns (inligting, volledig);
    volledig is False if a batch could not be fetched (not cached, retried later).
    """
    inligting, ontbreek = {}, []
    for q in sorted(set(qids)):
        gekas = kas.kry(WIKIDATA_SOORT, q)
        if gekas is None:
            ontbreek.append(q)
        else:
            inligting[q] = gekas
    volledig = True
    for b in range(0, len(ontbreek), WIKIDATA_BONDEL):
        bondel = ontbreek[b:b + WIKIDATA_BONDEL]
        entiteite = _wikidata_versoek(bondel)
        if entiteite is None:
            volledig = False
            break
        for q in bondel:
            e = entiteite.get(q, {})
            if "missing" in e:
                waarde = {"sitelinks": 0, "af": None, "en": None}
            else:
                etikette = e.get("labels", {})
                waarde = {
                    "sitelinks": sum(1 for s in e.get("sitelinks", {})
                                     if s.endswith("wiki") and s not in _NIE_WIKIPEDIA),
                    "af": etikette.get("af", {}).get("value"),
                    "en": etikette.get("en", {}).get("value"),
                }
            kas.stoor(WIKIDATA_SOORT, q, waarde, ttl_s=HISTORIES_TTL_S)
            inligting[q] = waarde
    logger.info("Wikidata: %d Q-IDs, %d gehaal%s", len(set(qids)), len(ontbreek),
                "" if volledig else " (onvolledig)")
    return inligting, volledig


def _wikidata_versoek(bondel):
    """One wbgetentities call (one retry); the `entities` dict, or None on failure."""
    for poging in range(2):
        try:
            resp = requests.get(WIKIDATA_URL, params={
                "action": "wbgetentities", "ids": "|".join(bondel),
                "props": "sitelinks|labels", "languages": "af|en",
                "format": "json", "maxlag": 5,
            }, headers={"User-Agent": USER_AGENT}, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                if "entities" in data:
                    # Redirected Q-IDs come back under their target's ID
                    entiteite = data["entities"]
                    for e in list(entiteite.values()):
                        if "redirects" in e:
                            entiteite[e["redirects"]["from"]] = e
                    return entiteite
                logger.warning("Wikidata fout: %s", data.get("error", {}).get("code"))
            else:
                logger.warning("Wikidata HTTP %d", resp.status_code)
        except (requests.RequestException, ValueError) as e:
            logger.warning("Wikidata versoek misluk: %s", e)
        if poging == 0:
            time.sleep(5)
    return None


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------

def _qid(tags):
    q = tags.get("wikidata", "").split(";")[0].strip()
    return q if q.startswith("Q") and q[1:].isdigit() else None


def _plekke(meetkunde):
    """
    Place nodes (city/town/village) near the route, for the in-town test — from
    the town tiles stage 1 already fetched (normal buffer), so no extra fetching.
    Sites beyond those tiles (15–30 km off; only famous ones qualify there) count
    as out of town.
    """
    elemente, volledig = _haal_teels(DORPE_SOORT, DORPE_FILTER, DORPE_UIT,
                                     _teels_vir_roete(meetkunde), timeout_s=60)
    plekke = [(el["lat"], el["lon"], IN_DORP_RADIUS_KM[el["tags"]["place"]])
              for el in elemente if el.get("tags", {}).get("place") in IN_DORP_RADIUS_KM]
    return plekke, volledig


def _in_dorp(lat, lon, plekke):
    return any(abs(lat - p_lat) < 0.07 and haversine(lat, lon, p_lat, p_lon) <= r * 1000
               for p_lat, p_lon, r in plekke)


def _land_sparql():
    """The one region-wide SPARQL query (see WIKIDATA_KLASSE, LANDE, UNESCO_ERFENIS)."""
    klasse = " ".join(f"wd:{q}" for q in WIKIDATA_KLASSE)
    lande = " ".join(f"wd:{q}" for q in LANDE)
    return f"""
SELECT ?item ?klas ?unesco ?koord ?sl ?af ?en WHERE {{
  VALUES ?land {{ {lande} }}
  {{ VALUES ?klas {{ {klasse} }} ?item wdt:P31/wdt:P279? ?klas. }}
  UNION {{ ?item wdt:P1435|wdt:P31 wd:{UNESCO_ERFENIS}. BIND(true AS ?unesco) }}
  ?item wdt:P17 ?land; wdt:P625 ?koord; wikibase:sitelinks ?sl.
  OPTIONAL {{ ?item rdfs:label ?af. FILTER(LANG(?af) = "af") }}
  OPTIONAL {{ ?item rdfs:label ?en. FILTER(LANG(?en) = "en") }}
}}"""


def _unesco_sparql():
    """Area (m²) and part coordinates of every UNESCO site in the region."""
    lande = " ".join(f"wd:{q}" for q in LANDE)
    return f"""
SELECT ?item ?m2 ?deelkoord WHERE {{
  VALUES ?land {{ {lande} }}
  ?item wdt:P1435|wdt:P31 wd:{UNESCO_ERFENIS}; wdt:P17 ?land.
  OPTIONAL {{ ?item p:P2046/psn:P2046/wikibase:quantityAmount ?m2. }}
  OPTIONAL {{ ?item wdt:P527 ?deel. ?deel wdt:P625 ?deelkoord. }}
}}"""


def _sparql(query):
    """Rows of a SPARQL query, or None on failure."""
    try:
        resp = requests.get(SPARQL_URL, params={"query": query}, timeout=180,
                            headers={"User-Agent": USER_AGENT,
                                     "Accept": "application/sparql-results+json"})
        resp.raise_for_status()
        return resp.json()["results"]["bindings"]
    except (requests.RequestException, ValueError, KeyError) as e:
        logger.warning("Wikidata SPARQL misluk: %s", e)
        return None


def _punt(waarde):
    """'Point(lon lat)' → (lat, lon), or None (e.g. coordinates on another globe)."""
    lon_lat = waarde.removeprefix("Point(").removesuffix(")").split()
    return (float(lon_lat[1]), float(lon_lat[0])) if len(lon_lat) == 2 else None


def _spreiding_km(punte):
    return max((haversine(*a, *b) / 1000 for i, a in enumerate(punte) for b in punte[i + 1:]),
               default=0)


def _land_items():
    """
    Every Wikidata historical item in the region, from the cache or one SPARQL
    query: [{qid, naam, lat, lon, sitelinks, ikoon, unesco}].  None on failure
    (not cached, retried next time).
    """
    gekas = kas.kry(LAND_SOORT, "items")
    if gekas is not None:
        return gekas
    rye = _sparql(_land_sparql())
    unesco_rye = _sparql(_unesco_sparql()) if rye is not None else None
    if unesco_rye is None:
        return None
    oppervlak, dele = {}, {}
    for r in unesco_rye:
        qid = r["item"]["value"].rsplit("/", 1)[-1]
        if "m2" in r:
            oppervlak[qid] = max(oppervlak.get(qid, 0), float(r["m2"]["value"]) / 1e6)
        if "deelkoord" in r and (p := _punt(r["deelkoord"]["value"])):
            dele.setdefault(qid, set()).add(p)

    per_item = {}
    for r in rye:
        qid = r["item"]["value"].rsplit("/", 1)[-1]
        punt = _punt(r["koord"]["value"])
        if punt is None:
            continue   # coordinates on another globe (e.g. Mars craters)
        item = per_item.setdefault(qid, {
            "qid": qid, "lat": punt[0], "lon": punt[1],
            "sitelinks": int(r["sl"]["value"]), "klasse": set(), "unesco": False,
            "af": None, "en": None})
        if "klas" in r:
            item["klasse"].add(WIKIDATA_KLASSE[r["klas"]["value"].rsplit("/", 1)[-1]])
        if "unesco" in r:
            item["unesco"] = True
        item["af"] = item["af"] or r.get("af", {}).get("value")
        item["en"] = item["en"] or r.get("en", {}).get("value")

    items = []
    for item in per_item.values():
        naam = item["af"] or item["en"]
        if not naam or naam == item["qid"]:
            continue   # no usable label
        ikoon = ikoon_vir_naam(naam) or ("unesco" if item["unesco"] else next(
            (i for i in IKOON_VOORRANG if i in item["klasse"]), "ster"))
        qid = item["qid"]
        items.append({"qid": qid, "naam": naam, "lat": item["lat"], "lon": item["lon"],
                      "sitelinks": item["sitelinks"], "ikoon": ikoon, "unesco": item["unesco"],
                      "oppervlak_km2": oppervlak.get(qid),
                      "spreiding_km": round(_spreiding_km(list(dele.get(qid, ()))), 1)})
    kas.stoor(LAND_SOORT, "items", items, ttl_s=HISTORIES_TTL_S)
    logger.info("Wikidata SPARQL: %d items (%d rye)", len(items), len(rye))
    return items


def _osm_uit_kas(meetkunde):
    """OSM historical sites from the Overpass tiles fetched earlier — cache only, no network."""
    elemente = {}
    for t in _teels_vir_roete(meetkunde, HISTORIES_BUFFER_GRAAD):
        for el in kas.kry(HISTORIES_SOORT, f"{t[0]},{t[1]}") or []:
            elemente[(el["type"], el["id"])] = el
    return list(elemente.values())


def haal_histories(koordinate, totale_afstand_m):
    """
    Returns (kandidate, volledig).  kandidate: every notable historical site
    within the corridor, each {naam, qid, ikoon, afstand_km, perp_km, kant,
    sitelinks (None if unknown), unesco, in_dorp}.  volledig is False if
    Wikidata could not be reached (retry later; the cache keeps the rest).
    """
    meetkunde = RoeteMeetkunde(koordinate, totale_afstand_m)
    stukke = meetkunde.bbox_stukke(buffer_graad=HISTORIES_BUFFER_GRAAD)

    def langs_roete(lat, lon):
        if not any(s <= lat <= n and w <= lon <= e for s, w, n, e in stukke):
            return None
        return meetkunde.projekteer_met_kant(lat, lon, BEROEMD_KORRIDOR_KM)

    rou = []   # (naam, qid, ikoon, sitelinks, unesco, lat, lon, projeksie)
    items = _land_items()
    volledig = items is not None
    wd_qids = set()
    for it in items or []:
        wd_qids.add(it["qid"])
        if it["sitelinks"] < MIN_SITELINKS and not it["unesco"]:
            continue
        if it["unesco"] and ((it["oppervlak_km2"] or 0) > UNESCO_MAKS_KM2
                             or it["spreiding_km"] > UNESCO_MAKS_SPREIDING_KM
                             or it["qid"] in UNESCO_UITGESLUIT):
            continue   # a huge region or spread-out serial listing
        if projeksie := langs_roete(it["lat"], it["lon"]):
            rou.append((it["naam"], it["qid"], it["ikoon"], it["sitelinks"], it["unesco"],
                        it["lat"], it["lon"], projeksie))

    # OSM extras not already in the Wikidata set
    osm = []
    for el in _osm_uit_kas(meetkunde):
        punt = el if el["type"] == "node" else el.get("center")
        if not punt or _qid(el["tags"]) in wd_qids:
            continue
        if projeksie := langs_roete(punt["lat"], punt["lon"]):
            osm.append((el, punt, projeksie))
    wd, wd_volledig = _wikidata([q for el, _, _ in osm if (q := _qid(el["tags"]))])
    for el, punt, projeksie in osm:
        tags, qid = el["tags"], _qid(el["tags"])
        info = wd.get(qid) if qid else None
        naam = (info or {}).get("af") or tags.get("name:af") or tags["name"]
        rou.append((naam, qid, ikoon_tipe(tags), info["sitelinks"] if info else None, False,
                    punt["lat"], punt["lon"], projeksie))
    logger.info("Histories: %d in korridor (%d uit OSM-kas)%s", len(rou), len(osm),
                "" if volledig else " — Wikidata onbereikbaar")
    if not rou:
        return [], volledig

    plekke, plekke_volledig = _plekke(meetkunde)
    kandidate = [{
        "naam": pas_korreksies_toe(naam),
        "qid": qid,
        "ikoon": ikoon,
        "afstand_km": langs_km,
        "perp_km": perp_km,
        "kant": kant,
        "sitelinks": sitelinks,
        "unesco": unesco,
        "in_dorp": _in_dorp(lat, lon, plekke),
    } for naam, qid, ikoon, sitelinks, unesco, lat, lon, (langs_km, perp_km, kant) in rou]
    return kandidate, volledig and wd_volledig and plekke_volledig


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

def _in_korridor(k):
    if k["perp_km"] <= KORRIDOR_KM:
        return True
    beroemd = k.get("unesco") or (k["sitelinks"] or 0) >= BEROEMD_SITELINKS
    return beroemd and k["perp_km"] <= BEROEMD_KORRIDOR_KM


def _leegte(km, stippe_km):
    """0…1: how far (along the route) the site is from the nearest town dot."""
    naaste = min((abs(km - s) for s in stippe_km), default=STREK_VOL_KM)
    return min(naaste, STREK_VOL_KM) / STREK_VOL_KM


def _telling(k, stippe_km):
    """The site's score.  Fame first; closeness, countryside and empty stretches adjust it."""
    telling = max(k["sitelinks"] or 1, 1)
    telling *= 1 + NABY_BONUS * (1 - min(k["perp_km"] / BEROEMD_KORRIDOR_KM, 1))
    if k.get("unesco"):
        telling *= UNESCO_FAKTOR
    if k["in_dorp"]:
        telling *= IN_DORP_FAKTOR
    telling *= 1 + STREK_BONUS * _leegte(k["afstand_km"], stippe_km)
    return telling


def kies_histories(kandidate, dorpe, totale_km):
    """
    The sites to draw, sorted by route distance: candidates in the corridor,
    de-duplicated (same Wikidata item, else same name), taken greedily by
    score while at least totale_km / SPASIERING_DELER apart, at most
    MAKS_HISTORIES.  Fewer is fine — the list is never padded.
    `dorpe` are the selected towns (incl. the via); the endpoints count as dots.
    """
    stippe_km = [0, totale_km] + [d["afstand_km"] for d in dorpe]
    beste = {}
    for k in filter(_in_korridor, kandidate):
        telling = _telling(k, stippe_km)
        sleutel = k["qid"] or k["naam"].casefold()
        if sleutel not in beste or telling > beste[sleutel][0]:
            beste[sleutel] = (telling, k)
    # Same name under different Q-IDs (e.g. a battlefield and its memorial)
    per_naam = {}
    for telling, k in beste.values():
        n = k["naam"].casefold()
        if n not in per_naam or telling > per_naam[n][0]:
            per_naam[n] = (telling, k)

    min_km = totale_km / SPASIERING_DELER
    gekies = []
    for telling, k in sorted(per_naam.values(), key=lambda tk: -tk[0]):
        if len(gekies) == MAKS_HISTORIES:
            break
        if all(abs(k["afstand_km"] - g["afstand_km"]) >= min_km for g in gekies):
            gekies.append({**k, "telling": round(telling, 2)})
    gekies.sort(key=lambda g: g["afstand_km"])
    return gekies
