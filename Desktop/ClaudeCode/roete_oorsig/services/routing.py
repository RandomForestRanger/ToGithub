import logging
import requests
from config import ORS_API_KEY
from services import kas

logger = logging.getLogger(__name__)

ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"


def haal_roete(vertrek_koord, bestemming_koord):
    """Fetch route from ORS (cached). Returns (koordinate, totale_afstand_m, totale_tyd_s)."""
    lon1, lat1 = vertrek_koord[1], vertrek_koord[0]
    lon2, lat2 = bestemming_koord[1], bestemming_koord[0]

    sleutel = f"{lat1:.5f},{lon1:.5f}|{lat2:.5f},{lon2:.5f}"
    gekas = kas.kry("ors_roete", sleutel)
    if gekas:
        return gekas["koordinate"], gekas["afstand_m"], gekas["tyd_s"]

    payload = {
        "coordinates": [[lon1, lat1], [lon2, lat2]],
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
        kas.stoor("ors_roete", sleutel, {"koordinate": koordinate,
                                          "afstand_m": summary["distance"],
                                          "tyd_s": summary["duration"]})
        return koordinate, summary["distance"], summary["duration"]
    except Exception as e:
        logger.exception("ORS route fetch failed: %s", e)
        return None, None, None



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
