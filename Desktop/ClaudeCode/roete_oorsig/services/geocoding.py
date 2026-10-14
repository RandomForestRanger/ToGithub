import re
import math
import time
import threading
import requests
import logging
from config import USER_AGENT
from services import kas

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": USER_AGENT}

# Restrict place search to South Africa and its road-trip neighbours; without
# this "Worcester", "Middelburg" and "Wellington" resolve to the USA, the
# Netherlands and New Zealand.
SOEK_LANDE = "za,na,bw,ls,sz,zw,mz"

# Nominatim usage policy: max 1 request/s.  Reverse lookups (the 20-sample loop)
# keep the wider 3 s spacing that avoided 429s in practice.
SOEK_INTERVAL_S    = 1.1
OMGEKEERD_INTERVAL_S = 3.0

# Reverse lookups are cached per grid cell of this size (~2 km): close enough
# for province / municipality / nearest town, and lets overlapping routes share.
OMGEKEERD_SEL_GRAAD = 0.02

_nominatim_slot = threading.Lock()
_laaste_oproep = [0.0]


def _nominatim(pad, params, interval_s=SOEK_INTERVAL_S):
    """
    GET a Nominatim endpoint, waiting first so that consecutive *network* calls
    are at least interval_s apart (cache hits never reach here, so they never
    wait).  Raises for HTTP errors; returns the parsed JSON.
    """
    with _nominatim_slot:
        wag = _laaste_oproep[0] + interval_s - time.monotonic()
        if wag > 0:
            time.sleep(wag)
        try:
            resp = requests.get(f"{NOMINATIM_URL}/{pad}", params=params,
                                headers={**HEADERS, "Accept-Language": "af"}, timeout=10)
        finally:
            _laaste_oproep[0] = time.monotonic()
    resp.raise_for_status()
    return resp.json()

AFRIKAANS_KORREKSIES = {
    "Cape Town": "Kaapstad",
    "Somerset West": "Somerset-Wes",
    "George": "George",
    "Johannesburg": "Johannesburg",
    "Pretoria": "Pretoria",
    "Stellenbosch": "Stellenbosch",
    "Paarl": "Paarl",
    "Worcester": "Worcester",
    "Mossel Bay": "Mosselbaai",
    "Knysna": "Knysna",
    "Port Elizabeth": "Gqeberha",
    "Gqeberha": "Gqeberha",
    "East London": "Oos-Londen",
    "Bloemfontein": "Bloemfontein",
    "Durban": "Durban",
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
    "Salt River": "Soutrivier",
}


# Whole-word, case-insensitive; longest names first so "Hex River" wins over any shorter key.
_KORREKSIE_PATROON = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(AFRIKAANS_KORREKSIES, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
_KORREKSIE_OPSOEK = {k.lower(): v for k, v in AFRIKAANS_KORREKSIES.items()}


def pas_korreksies_toe(naam):
    return _KORREKSIE_PATROON.sub(lambda m: _KORREKSIE_OPSOEK[m.group(0).lower()], naam)


def geocodeer(plek):
    """Resolve a place name to (lat, lon). Retries once after 2 s on failure. Cached."""
    sleutel = f"{' '.join(plek.lower().split())}|{SOEK_LANDE}"
    gekas = kas.kry("geocode", sleutel)
    if gekas:
        return tuple(gekas)
    for poging in range(2):
        try:
            results = _nominatim("search", {"q": plek, "format": "json", "limit": 1,
                                            "countrycodes": SOEK_LANDE})
            if results:
                koord = (float(results[0]["lat"]), float(results[0]["lon"]))
                kas.stoor("geocode", sleutel, koord)
                return koord
        except Exception as e:
            logger.warning("Geocoding poging %d misluk vir '%s': %s", poging + 1, plek, e)
        if poging == 0:
            time.sleep(2)
    logger.error("Geocoding finaal misluk vir '%s'", plek)
    return None


def geocodeer_naby(plek, lat, lon, radius_graad=0.4):
    """
    Resolve a place name to (lat, lon), searching only within ±radius_graad of
    a known point (~45 km) so that a common name like "Richmond" finds the town
    on the route, not its namesake in another province.  Returns None if not
    found or on failure.  Cached per name and 0.1° cell, including "not found"
    (a definite answer); failures are not cached.
    """
    sleutel = f"{plek.lower()}|{math.floor(lat * 10)},{math.floor(lon * 10)}"
    gekas = kas.kry("geocode_naby", sleutel)
    if gekas is not None:
        return tuple(gekas["koord"]) if gekas["koord"] else None
    try:
        results = _nominatim("search", {
            "q": plek, "format": "json", "limit": 1,
            "countrycodes": SOEK_LANDE, "bounded": 1,
            # settlements only: "Gariep Dam" must find the town, not the
            # reservoir whose centre lies 30 km away in the middle of the lake
            "featureType": "settlement",
            "viewbox": f"{lon - radius_graad},{lat + radius_graad},"
                       f"{lon + radius_graad},{lat - radius_graad}",
        })
    except Exception as e:
        logger.warning("Naby-geocoding misluk vir '%s': %s", plek, e)
        return None
    koord = (float(results[0]["lat"]), float(results[0]["lon"])) if results else None
    kas.stoor("geocode_naby", sleutel, {"koord": koord})
    return koord


def _is_distrik(naam):
    """Return True if the name is a district municipality.
    Catches both English ('District Municipality') and Afrikaans variants
    ('Distriksmunisipaliteit', 'Distrikmunisipaliteit', bare 'Distrik').
    """
    lower = naam.lower()
    return (
        "district municipality" in lower
        or "distriksmunisipaliteit" in lower
        or "distrikmunisipaliteit" in lower
        or " distrik" in lower
        or lower.startswith("distrik")
    )


def _is_nedersetting(naam):
    """Return True if the name looks like an actual settlement, not an admin area."""
    lower = naam.lower()
    return not any(k in lower for k in (
        "municipality", "metropolitan", "district", "local council",
        "munisipaliteit", "metropolitaans", "distrik",
    ))


def _is_muni_naam(naam):
    """Return True if the name looks like a local or metro municipality (not a district)."""
    lower = naam.lower()
    return (
        ("municipality" in lower or "munisipaliteit" in lower)
        and not _is_distrik(naam)
    )


# SA ward names in OSM follow "<Municipality> Ward <n>" (e.g. "Drakenstein Ward 25").
_WYK_PATROON = re.compile(r"^(.*\S)\s+(?:Ward|Wyk)\s+\d+$", re.IGNORECASE)


def _munisipaliteit_uit_adres(address):
    """
    Extract the local or metropolitan municipality from a Nominatim address dict.
    Returns "Onbekend" if none can be determined.

      Phase 1 — known fields (municipality, city_district, county) for a name
                containing "municipality"/"munisipaliteit" that is not a district.
      Phase 2 — the same test on every address value.
      Phase 3 — metro by elimination: `county` is admin_level 6, which in SA is
                either a district or a metro.  A non-district county is therefore
                a metro, even when its name lacks the word "municipality"
                ("Stad Kaapstad", "City of Tshwane", "eThekwini").
      Phase 4 — ward fallback: Nominatim sometimes omits the local municipality
                entirely but keeps the ward ("Drakenstein Ward 25").  The ward
                prefix names the municipality; metros were caught in phase 3, so
                it is reported as "<naam> Local Municipality" to match the names
                Nominatim returns elsewhere along the route.
    """
    for veld in ("municipality", "city_district", "county"):
        waarde = address.get(veld, "").strip()
        if waarde and _is_muni_naam(waarde):
            return waarde

    for waarde in address.values():
        if isinstance(waarde, str) and _is_muni_naam(waarde.strip()):
            return waarde.strip()

    county = address.get("county", "").strip()
    if county and not _is_distrik(county):
        return county

    for waarde in address.values():
        if isinstance(waarde, str):
            m = _WYK_PATROON.match(waarde.strip())
            if m:
                naam = m.group(1)
                if naam.lower().startswith(("city of", "stad ")):
                    return naam
                return f"{naam} Local Municipality"

    return "Onbekend"


def _omgekeerde_adres(lat, lon):
    """
    Raw Nominatim reverse `address` dict for (lat, lon), cached per
    OMGEKEERD_SEL_GRAAD cell.  The raw address is cached (not the derived
    province/municipality), so changes to the derivation apply to cached data.
    Retries with backoff on 429.  Returns None on failure (not cached).
    """
    sleutel = f"{math.floor(lat / OMGEKEERD_SEL_GRAAD)},{math.floor(lon / OMGEKEERD_SEL_GRAAD)}"
    gekas = kas.kry("omgekeerd", sleutel)
    if gekas is not None:
        return gekas
    for poging in range(3):
        try:
            address = _nominatim("reverse", {"lat": lat, "lon": lon, "format": "json"},
                                 OMGEKEERD_INTERVAL_S).get("address", {})
            kas.stoor("omgekeerd", sleutel, address)
            return address
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                wag = 10 * (poging + 1)
                logger.warning("Nominatim 429, wag %ds (poging %d)…", wag, poging + 1)
                time.sleep(wag)
            else:
                logger.exception("Area lookup misluk vir (%s, %s): %s", lat, lon, e)
                return None
        except Exception as e:
            logger.exception("Area lookup misluk vir (%s, %s): %s", lat, lon, e)
            return None
    return None


def reverse_areas(lat, lon):
    """Reverse geocode → (provinsie, munisipaliteit, dorpnaam, dorptipe).
    All four fields come from a single (cached) Nominatim call.

    SA OSM admin-level structure:
      admin_level=4  → province            → address.state
      admin_level=6  → district OR metro   → address.county
      admin_level=7  → local municipality  → address.municipality OR
                                             address.city_district OR
                                             other fields (varies by area)

    Local municipalities land in different address fields depending on how each
    area's OSM data is structured, and metros often lack the word "municipality";
    see _munisipaliteit_uit_adres for the four-phase search."""
    address = _omgekeerde_adres(lat, lon)
    if address is None:
        return "Onbekend", "Onbekend", "", ""

    provinsie = address.get("state", "Onbekend")
    munisipaliteit = _munisipaliteit_uit_adres(address)
    logger.info("Muni (%.4f,%.4f): %s | adres-velde: %s",
                lat, lon, munisipaliteit,
                {k: v for k, v in address.items()
                 if k in ("municipality", "city_district", "county", "suburb", "state")})

    # Town name: skip any value that looks like an admin-area name
    dorpnaam, dorptipe = "", ""
    for tipe in ("city", "town", "village", "hamlet"):
        kandidaat = address.get(tipe, "")
        if kandidaat and _is_nedersetting(kandidaat):
            dorpnaam = pas_korreksies_toe(kandidaat)
            dorptipe = tipe
            break

    return provinsie, munisipaliteit, dorpnaam, dorptipe
