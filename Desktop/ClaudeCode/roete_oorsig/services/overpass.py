"""
Queries the Overpass API for geographical features along a route.

Queries cover the ~25 km tiles the route passes through (see "Tile cache")
rather than one box around the whole route — far less data for diagonal
routes, fewer timeouts, and tiles are shared between overlapping routes.  The `around:radius,polyline` filter
is NOT used: it times out even for small polylines due to server-side CPU cost.
"""
import re
import math
import time
import logging
import requests
from services import kas
from services.geocoding import reverse_areas, pas_korreksies_toe, geocodeer_naby
from services.diagram import km_vir_stippe, EINDPUNT_RADIUS
from services.geometrie import RoeteMeetkunde, haversine

logger = logging.getLogger(__name__)

# Tried in order; the main instance rejects requests without a User-Agent (406)
# and is often overloaded (504), so fall through to mirrors.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
HEADERS = {"User-Agent": "RoeteOorsig/1.0"}

PLEK_RADIUS = {"city": 14, "town": 10, "village": 7, "hamlet": 5}
PLEK_RANG   = {"city":  4, "town":  3, "village": 2, "hamlet": 1}

MIN_SPASIERING_KM = 40   # spacing between towns on routes of 400 km and longer
TEIKEN_DORPE      = 10   # shorter routes: spacing = route / 10, so ~10 towns still fit
MAX_GAT_KM        = 150  # never leave a stretch longer than this without a town
MAKS_AFWYKING_KM  = 15   # discard towns further than this from the route


# ---------------------------------------------------------------------------
# Overpass request helper
# ---------------------------------------------------------------------------

# Pause before each further round.  Outages tend to hit all instances at once
# for tens of seconds, so the waits grow: ~35 s of waiting in the worst case.
OVERPASS_WAGTYE = (5, 10, 20)


def _overpass(query):
    """
    POST a query to Overpass, falling through the mirrors on 429/5xx/timeouts.
    Returns the list of elements, or None if every attempt failed.
    """
    for rondte in range(len(OVERPASS_WAGTYE) + 1):
        if rondte:
            time.sleep(OVERPASS_WAGTYE[rondte - 1])
        for url in OVERPASS_URLS:
            try:
                resp = requests.post(url, data={"data": query}, headers=HEADERS, timeout=70)
            except requests.RequestException as ex:
                logger.warning("Overpass %s: %s", url, ex)
                continue
            if resp.status_code == 200:
                try:
                    return resp.json().get("elements", [])
                except ValueError:
                    logger.warning("Overpass %s: ongeldige JSON", url)
                    continue
            logger.warning("Overpass %s: HTTP %d", url, resp.status_code)
            if resp.status_code == 400:
                logger.error("Overpass het die navraag verwerp:\n%s", query)
                return None
    logger.error("Alle Overpass-pogings het misluk")
    return None


# ---------------------------------------------------------------------------
# Tile cache
# ---------------------------------------------------------------------------
# Overpass answers are cached per TEEL_GRAAD × TEEL_GRAAD tile (~25 km), so
# routes that overlap share tiles: Johannesburg → De Aar pre-loads half of
# Johannesburg → Kaapstad.  Missing tiles are fetched in batches and each batch
# is stored as soon as it arrives — a route that only partly loads still draws
# what it has, and next time only the missing tiles are fetched.

TEEL_GRAAD  = 0.25
TEEL_BONDEL = 60     # tiles per Overpass query

# Bump the version when a query changes, so old tiles are not reused.
DORPE_SOORT   = "overpass_dorpe_v1"
DORPE_FILTER  = 'node["place"~"^(city|town|village|hamlet)$"]["name"]'
DORPE_UIT     = "out body;"
RIVIERE_SOORT  = "overpass_riviere_v1"
RIVIERE_FILTER = 'way["waterway"="river"]["name"]'
RIVIERE_UIT    = "out geom;"


def _teels_vir_roete(meetkunde):
    """Every tile touched by the route's bbox pieces (route + 0.15° buffer)."""
    teels = set()
    for s, w, n, e in meetkunde.bbox_stukke():
        for i in range(math.floor(s / TEEL_GRAAD), math.floor(n / TEEL_GRAAD) + 1):
            for j in range(math.floor(w / TEEL_GRAAD), math.floor(e / TEEL_GRAAD) + 1):
                teels.add((i, j))
    return sorted(teels)


def _teel_bbox(teel):
    i, j = teel
    return i * TEEL_GRAAD, j * TEEL_GRAAD, (i + 1) * TEEL_GRAAD, (j + 1) * TEEL_GRAAD


def _teels_van_element(el, kandidate):
    """
    Tiles (out of `kandidate`) an element belongs to: a node's own tile, or
    every tile containing at least one vertex of a way.  (Not the way's bounds:
    a long river's bounds cover many tiles it never enters.  River vertices lie
    a few hundred metres apart, so no 25 km tile is crossed without one.)
    """
    if el["type"] == "node":
        punte = [el]
    else:
        punte = [p for p in el.get("geometry", []) if p]
    teels = {(math.floor(p["lat"] / TEEL_GRAAD), math.floor(p["lon"] / TEEL_GRAAD)) for p in punte}
    return teels & kandidate


def _haal_teels(soort, filter_, uit, teels, timeout_s):
    """
    Return (elements, volledig): the de-duplicated elements of all `teels`,
    from the cache where possible, fetching the rest from Overpass.
    volledig is False if some tiles could not be fetched — their elements are
    simply missing, and they will be fetched again next time.
    """
    elemente = {}
    ontbreek = []
    for teel in teels:
        gekas = kas.kry(soort, f"{teel[0]},{teel[1]}")
        if gekas is None:
            ontbreek.append(teel)
        else:
            elemente.update(((el["type"], el["id"]), el) for el in gekas)
    logger.info("%s: %d teels in kas, %d ontbreek", soort, len(teels) - len(ontbreek), len(ontbreek))

    for b in range(0, len(ontbreek), TEEL_BONDEL):
        bondel = ontbreek[b:b + TEEL_BONDEL]
        dele = "".join(f"  {filter_}({s:.2f},{w:.2f},{n:.2f},{e:.2f});\n"
                       for s, w, n, e in map(_teel_bbox, bondel))
        resultaat = _overpass(f"[out:json][timeout:{timeout_s}];\n(\n{dele});\n{uit}")
        if resultaat is None:
            # Overpass is down; later batches would only repeat the long retry cycle.
            logger.warning("%s: %d teels nie gehaal nie", soort, len(ontbreek) - b)
            return list(elemente.values()), False
        per_teel = {teel: [] for teel in bondel}
        kandidate = set(bondel)
        for el in resultaat:
            elemente[(el["type"], el["id"])] = el
            for teel in _teels_van_element(el, kandidate):
                per_teel[teel].append(el)
        for teel, lys in per_teel.items():
            kas.stoor(soort, f"{teel[0]},{teel[1]}", lys)
    return list(elemente.values()), True


# ---------------------------------------------------------------------------
# Spacing-aware town selection
# ---------------------------------------------------------------------------
# Smallholdings and township sections that OSM often tags as town/village but
# that no child would recognise as a dorp: "Johandeo AH", "Unaville AH",
# "Evaton Small Farms", "Sebokeng Unit 14", "Kosmos Ext 3", "… Landbouhoewes".
_KLEINHOEWE_PATROON = re.compile(
    r"\bA\.?H\.?$|agricultural holding|landbouhoew|kleinhoew|small\s*farms?\b|smallholding"
    r"|\bunit\s+\d+|\bext(ension)?\.?\s*\d+$|\buitbreiding\s*\d+$",
    re.IGNORECASE,
)


def _is_kleinhoewe(naam):
    return bool(_KLEINHOEWE_PATROON.search(naam))


def _bevolking(tags):
    """OSM population tag as int ("95840", "95 840", "95,840"); 0 if absent or unparseable."""
    syfers = re.sub(r"[\s,.]", "", tags.get("population", ""))
    return int(syfers) if syfers.isdigit() else 0


def _prominensie(k):
    """
    Ranking key (higher = more prominent): place type, then population, then
    closeness to the route.  Population decides between two "towns" like
    Vanderbijlpark (95 840) and Evaton (no tag) — distance from the road says
    nothing about how well-known a place is.  Only ~1 in 5 SA place nodes carry
    a population tag; untagged places tie at 0 and fall through to distance.
    """
    return k["rang"], k.get("bevolking", 0), -k["perp_m"]


def _min_spasiering(totale_km):
    """
    Base minimum km between towns (and between a town and an endpoint):
    MIN_SPASIERING_KM, but at most a tenth of the route — a fixed 40 km would
    leave no room at all on a 68 km route like Randburg → Brits.
    _te_naby raises it per pair where the two dots would otherwise overlap.
    """
    return min(MIN_SPASIERING_KM, totale_km / TEIKEN_DORPE)


def _te_naby(k, gekies, totale_km, basis_km):
    """
    True if candidate k is too close to any chosen town or to either endpoint:
    closer than basis_km, or close enough that the two dots would overlap on
    the diagram (km_vir_stippe, which depends on both dots' radii).
    """
    km, r = k["afstand_km"], k["stip_radius"]
    eindpunt_km = max(basis_km, km_vir_stippe(r, EINDPUNT_RADIUS, totale_km))
    if km < eindpunt_km or km > totale_km - eindpunt_km:
        return True
    return any(abs(km - g["afstand_km"])
               < max(basis_km, km_vir_stippe(r, g["stip_radius"], totale_km))
               for g in gekies)


def _vul_gate(gekies, kandidate, totale_km, min_km, top_n):
    """
    Gap fill: while a stretch between consecutive chosen towns (or the route
    endpoints) exceeds MAX_GAT_KM, add the most prominent candidate inside it
    (_prominensie) that still respects min_km spacing.  A gap with
    no such candidate is left open — a town squeezed against its neighbour
    would overlap it on the diagram without really shortening the gap.
    Mutates and returns `gekies`.
    """
    gekiese_name = {g["naam"] for g in gekies}
    while len(gekies) < top_n:
        ankerpunte = sorted([0] + [g["afstand_km"] for g in gekies] + [totale_km])
        beste = None
        for van, tot in zip(ankerpunte, ankerpunte[1:]):
            if tot - van <= MAX_GAT_KM:
                continue
            in_gat = [k for k in kandidate
                      if van < k["afstand_km"] < tot
                      and k["naam"] not in gekiese_name
                      and not _te_naby(k, gekies, totale_km, min_km)]
            if in_gat:
                beste = max(in_gat, key=_prominensie)
                break   # restart gap scan after each insertion
        if beste is None:
            break
        gekies.append(beste)
        gekiese_name.add(beste["naam"])
    return gekies


def _kies_dorpe_met_spasiering(kandidate, totale_km, top_n=25, vaste=()):
    """
    Two-phase selection, starting from the `vaste` (fixed) towns — the via town —
    which are always kept; every other town is spaced around them:
      Phase 1 — greedy by prominence: iterate candidates by _prominensie (type,
                then population, then closeness to the route);
                skip any town within min_km of an already-chosen town or of the
                departure/destination.
      Phase 2 — gap fill (_vul_gate) under the same spacing rule.
    min_km comes from _min_spasiering (scaled down on short routes); _te_naby
    raises it per pair on long routes so that dots never overlap.
    Returns list sorted by afstand_km, capped at top_n.
    """
    gekies = list(vaste)
    if not kandidate:
        return sorted(gekies, key=lambda x: x["afstand_km"])
    min_km = _min_spasiering(totale_km)

    for k in sorted(kandidate, key=_prominensie, reverse=True):
        if not _te_naby(k, gekies, totale_km, min_km):
            gekies.append(k)
        if len(gekies) >= top_n:
            break

    _vul_gate(gekies, kandidate, totale_km, min_km, top_n)
    gekies.sort(key=lambda x: x["afstand_km"])
    return gekies


def vul_aan_met_steekproef(dorpe, steekproef, koordinate, totale_afstand_m, top_n=25):
    """
    Supplement Overpass towns with the Nominatim-derived sample towns from stage 3.

      - No Overpass towns at all (the via town, if any, does not count) → the
        sample towns go through the full spacing-aware selection around the via.
      - Otherwise → only gaps > MAX_GAT_KM are filled; existing towns are never
        displaced.

    Sample towns carry the *sample point's* distance, which can be ±35 km off
    (the sample at km 70 reports "Paarl", which is at km 59).  Each candidate is
    therefore looked up by name near its sample point and projected onto the
    route like an Overpass town; candidates that cannot be found, or lie more
    than MAKS_AFWYKING_KM off the route, are dropped.  Lookups cost ~1 s each, so
    only candidates that could actually be used are refined.
    """
    if not steekproef:
        return dorpe
    totale_km = round(totale_afstand_m / 1000)
    vaste = [d for d in dorpe if d.get("via")]
    gewone = [d for d in dorpe if not d.get("via")]

    if gewone:
        ankerpunte = sorted([0] + [d["afstand_km"] for d in dorpe] + [totale_km])
        gate = [(van, tot) for van, tot in zip(ankerpunte, ankerpunte[1:]) if tot - van > MAX_GAT_KM]
        if not gate:
            return dorpe
        steekproef = [k for k in steekproef
                      if any(van < k["afstand_km"] < tot for van, tot in gate)]
        if not steekproef:
            return dorpe

    steekproef = [k for k in steekproef if not _is_kleinhoewe(k["naam"])]
    meetkunde = RoeteMeetkunde(koordinate, totale_afstand_m)
    verfyn = []
    for k in steekproef:
        posisie = geocodeer_naby(k["naam"], k["lat"], k["lon"])
        projeksie = posisie and meetkunde.projekteer(*posisie, MAKS_AFWYKING_KM)
        if not projeksie:
            logger.info("Steekproef-dorp '%s' verwerp (nie gevind of te ver van roete)", k["naam"])
            continue
        langs_km, perp_km = projeksie
        verfyn.append({**k, "afstand_km": round(langs_km), "perp_m": perp_km * 1000,
                       "rang": PLEK_RANG.get(k["tipe"], 0)})

    if not gewone:
        return _kies_dorpe_met_spasiering(verfyn, totale_km, top_n, vaste)
    gekies = _vul_gate(list(dorpe), verfyn, totale_km,
                       _min_spasiering(totale_km), top_n)
    gekies.sort(key=lambda d: d["afstand_km"])
    return gekies


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def haal_dorpe(koordinate, totale_afstand_m, top_n=25, vaste=()):
    """
    Query Overpass for cities/towns/villages/hamlets near the route.
    Returns (dorpe, volledig): dorpe sorted by route distance after spacing-aware
    selection; volledig is False if some tiles could not be fetched from
    Overpass (the selection then covers only the tiles that were available).
    Each dict: {naam, tipe, stip_radius, afstand_km}.  `vaste` towns (the via)
    are always included and the rest are spaced around them.

    Selection rules:
      - No two towns closer than _min_spasiering() (prefer prominent ones),
        nor that close to the departure or destination.
      - No gap longer than MAX_GAT_KM without at least one town.
      - At most top_n towns returned.
    """
    meetkunde = RoeteMeetkunde(koordinate, totale_afstand_m)
    elements, volledig = _haal_teels(DORPE_SOORT, DORPE_FILTER, DORPE_UIT,
                                     _teels_vir_roete(meetkunde), timeout_s=60)
    logger.info("Overpass dorpe: %d resultate%s", len(elements), "" if volledig else " (onvolledig)")

    totale_km = round(totale_afstand_m / 1000)

    # Build candidate list; keep perp_m and bevolking for dedup and tiebreaking
    kandidate_raa = []
    for el in elements:
        tags = el.get("tags", {})
        if _is_kleinhoewe(tags["name"]) or _is_kleinhoewe(tags.get("name:af", "")):
            continue
        projeksie = meetkunde.projekteer(el["lat"], el["lon"], MAKS_AFWYKING_KM)
        if projeksie is None:
            continue
        langs_km, perp_km = projeksie
        tipe = tags.get("place", "hamlet")
        kandidate_raa.append({
            "naam": pas_korreksies_toe(tags.get("name:af") or tags["name"]),
            "tipe": tipe,
            "rang": PLEK_RANG.get(tipe, 0),
            "afstand_km": round(langs_km),
            "stip_radius": PLEK_RADIUS.get(tipe, 5),
            "perp_m": perp_km * 1000,
            "bevolking": _bevolking(tags),
        })

    # Deduplicate by name: keep the most prominent entry
    gesien = {}
    for k in kandidate_raa:
        if k["naam"] not in gesien or _prominensie(k) > _prominensie(gesien[k["naam"]]):
            gesien[k["naam"]] = k
    uniek = list(gesien.values())

    return _kies_dorpe_met_spasiering(uniek, totale_km, top_n, vaste), volledig


def haal_riviere(koordinate, totale_afstand_m):
    """
    Query Overpass for named rivers with full geometry (`out geom`) and
    intersect each one with the route.  Only rivers the route actually
    crosses are returned, at the km of the first crossing per river name.

    `telling` (number of OSM ways carrying the name) is a prominence proxy used
    by the diagram's spacing filter: the Oranje has dozens, a spruit has one.

    Returns (riviere, volledig): list of dicts {naam, afstand_km, telling}
    sorted by route distance; volledig as for haal_dorpe.
    """
    meetkunde = RoeteMeetkunde(koordinate, totale_afstand_m)
    elements, volledig = _haal_teels(RIVIERE_SOORT, RIVIERE_FILTER, RIVIERE_UIT,
                                     _teels_vir_roete(meetkunde), timeout_s=90)
    logger.info("Overpass riviere: %d resultate%s", len(elements), "" if volledig else " (onvolledig)")

    kruisings = {}   # naam → km of first crossing
    tellings  = {}   # naam → way count
    for el in elements:
        tags = el.get("tags", {})
        naam = pas_korreksies_toe(tags.get("name:af") or tags["name"])
        tellings[naam] = tellings.get(naam, 0) + 1
        lyn = [(p["lat"], p["lon"]) for p in el.get("geometry", []) if p]
        if len(lyn) < 2:
            continue
        km = meetkunde.eerste_kruising(lyn)
        if km is not None and (naam not in kruisings or km < kruisings[naam]):
            kruisings[naam] = km

    resultate = [
        {"naam": naam, "afstand_km": round(km), "telling": tellings[naam]}
        for naam, km in kruisings.items()
    ]
    resultate.sort(key=lambda x: x["afstand_km"])
    return resultate, volledig


def haal_grense_en_sones(koordinate, totale_afstand_m, n_steekproef=20):
    """
    Single sampling pass that returns all three from one set of Nominatim calls:
      - Provincial border crossings  → grense
      - Local municipality zones     → sones
      - Town fallback list           → dorpe_steekproef

    dorpe_steekproef is used when Overpass is unavailable. It extracts the
    nearest town/city from the same reverse-geocode response that already
    provides province and municipality — no extra API calls.

    Returns: (grense, sones, dorpe_steekproef)
    """
    # Sample evenly along the polyline's own (haversine) length, then scale
    # each sample's distance to the ORS total so km figures stay consistent.
    segmente = [haversine(*koordinate[i - 1], *koordinate[i]) for i in range(1, len(koordinate))]
    lyn_totaal = sum(segmente)
    skaal = totale_afstand_m / lyn_totaal if lyn_totaal else 0
    interval = lyn_totaal / n_steekproef
    steekproewe = []
    volgende = 0.0
    cum = 0.0

    for i, seg in enumerate(segmente, start=1):
        lat1, lon1 = koordinate[i - 1]
        lat2, lon2 = koordinate[i]
        while volgende < cum + seg and len(steekproewe) < n_steekproef:
            t = (volgende - cum) / seg
            steekproewe.append((
                lat1 + t * (lat2 - lat1),
                lon1 + t * (lon2 - lon1),
                volgende * skaal,
            ))
            volgende += interval
        cum += seg
    steekproewe.append((*koordinate[-1], totale_afstand_m))

    # One Nominatim call per sample — province + municipality + nearest town.
    # Rate limiting (3 s between network calls) lives in geocoding._nominatim;
    # cached samples return instantly.
    samples = []   # list of dicts (mutable for gap-filling below)
    for lat, lon, afstand in steekproewe:
        prov, muni, dorp, tipe = reverse_areas(lat, lon)
        samples.append({"prov": prov, "muni": muni, "dorp": dorp,
                        "tipe": tipe, "afstand": afstand, "lat": lat, "lon": lon})

    # Wall-to-wall municipality coverage: forward-fill then backward-fill gaps.
    # Gaps arise when a sample falls in an area with no OSM local-municipality data.
    last = ""
    for s in samples:
        if s["muni"] != "Onbekend":
            last = s["muni"]
        elif last:
            s["muni"] = last
    last = ""
    for s in reversed(samples):
        if s["muni"] != "Onbekend":
            last = s["muni"]
        elif last:
            s["muni"] = last

    # ── Province border crossings ─────────────────────────────────────────
    grense = []
    for i in range(1, len(samples)):
        pv, av = samples[i - 1]["prov"], samples[i - 1]["afstand"]
        pn, an = samples[i]["prov"],     samples[i]["afstand"]
        if pv != pn and pv != "Onbekend" and pn != "Onbekend":
            grense.append({
                "voor_provinsie": pv,
                "na_provinsie": pn,
                "afstand_km": round((av + an) / 2 / 1000),
            })

    # ── Municipality zones ────────────────────────────────────────────────
    # Any sample still "Onbekend" after gap-filling becomes "Onbekende Munisipaliteit"
    # so the colour strip has no blank patches.
    for s in samples:
        if s["muni"] == "Onbekend":
            s["muni"] = "Onbekende Munisipaliteit"

    kleur_toekenning = {}
    kleur_volgende = [0]

    def ken_kleur_toe(naam):
        if naam == "Onbekende Munisipaliteit":
            return -1   # sentinel → grey in diagram.py
        if naam not in kleur_toekenning:
            kleur_toekenning[naam] = kleur_volgende[0] % 6
            kleur_volgende[0] += 1
        return kleur_toekenning[naam]

    # Zone boundaries sit at the midpoint between the last sample of one zone and
    # the first sample of the next (as for province borders), so a zone seen at a
    # single sample still gets half an interval either side instead of 0 km.
    sones = []
    vorige_afstand = 0.0
    for s in samples:
        muni, afstand = s["muni"], s["afstand"]
        if sones and sones[-1]["naam"] == muni:
            vorige_afstand = afstand
            continue
        grens_km = round((vorige_afstand + afstand) / 2 / 1000) if sones else 0
        if sones:
            sones[-1]["tot_km"] = grens_km
        sones.append({
            "naam": muni,
            "van_km": grens_km,
            "tot_km": None,
            "kleur_indeks": ken_kleur_toe(muni),
        })
        vorige_afstand = afstand
    if sones:
        sones[-1]["tot_km"] = round(totale_afstand_m / 1000)

    # ── Town fallback (from same Nominatim calls, no extra cost) ─────────
    # Deduplicate names; strip towns within 10 km of start/end (departure and
    # destination are always drawn explicitly).  afstand_km is the *sample's*
    # distance and lat/lon the sample point — vul_aan_met_steekproef refines both.
    totale_km = round(totale_afstand_m / 1000)
    gesien = set()
    dorpe_steekproef = []
    for s in samples:
        dorp, tipe, afstand = s["dorp"], s["tipe"], s["afstand"]
        if not dorp or dorp in gesien:
            continue
        afstand_km = round(afstand / 1000)
        if afstand_km <= 10 or afstand_km >= totale_km - 10:
            continue
        gesien.add(dorp)
        dorpe_steekproef.append({
            "naam": dorp,
            "tipe": tipe,
            "afstand_km": afstand_km,
            "stip_radius": PLEK_RADIUS.get(tipe, 7),
            "lat": s["lat"],
            "lon": s["lon"],
        })

    return grense, sones, dorpe_steekproef
