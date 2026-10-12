import logging
import requests
from config import ORS_API_KEY
from services import kas

logger = logging.getLogger(__name__)

ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"


def haal_roete(vertrek_koord, bestemming_koord, via_koord=None):
    """
    Fetch route from ORS (cached), optionally via an intermediate point.
    Returns (koordinate, totale_afstand_m, totale_tyd_s, via_afstand_m), where
    via_afstand_m is the distance from the departure to the via point (from
    ORS's per-leg segments) or None without a via.  All None on failure.
    """
    punte = [vertrek_koord] + ([via_koord] if via_koord else []) + [bestemming_koord]
    # Same key format as before for two points, so cached direct routes stay valid.
    sleutel = "|".join(f"{lat:.5f},{lon:.5f}" for lat, lon in punte)
    gekas = kas.kry("ors_roete", sleutel)
    if gekas:
        return gekas["koordinate"], gekas["afstand_m"], gekas["tyd_s"], gekas.get("via_afstand_m")

    payload = {
        "coordinates": [[lon, lat] for lat, lon in punte],
    }
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json, application/geo+json",
    }
    try:
        resp = requests.post(ORS_URL, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        route = data["routes"][0]
        summary = route["summary"]
        # Decode geometry (ORS returns encoded polyline by default)
        geometry = route.get("geometry")
        if isinstance(geometry, str):
            koordinate = _dekodeer_polyline(geometry)
        else:
            koordinate = geometry["coordinates"]  # list of [lon, lat]
            koordinate = [[c[1], c[0]] for c in koordinate]  # to [lat, lon]
        # segments[i] is the leg from waypoint i to waypoint i+1
        via_afstand_m = route["segments"][0]["distance"] if via_koord else None
        kas.stoor("ors_roete", sleutel, {"koordinate": koordinate,
                                          "afstand_m": summary["distance"],
                                          "tyd_s": summary["duration"],
                                          "via_afstand_m": via_afstand_m})
        return koordinate, summary["distance"], summary["duration"], via_afstand_m
    except Exception as e:
        logger.exception("ORS route fetch failed: %s", e)
        return None, None, None, None


def _dekodeer_polyline(encoded):
    """Decode Google-style encoded polyline to list of [lat, lon]."""
    coords = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        for is_lng in (False, True):
            shift = 0
            result = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            value = ~(result >> 1) if result & 1 else result >> 1
            if is_lng:
                lng += value
            else:
                lat += value
        coords.append([lat / 1e5, lng / 1e5])
    return coords
