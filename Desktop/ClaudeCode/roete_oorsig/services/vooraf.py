"""
Slow, resumable pre-fetch: the region-wide Wikidata query for historical sites,
then (in app.py) every stage of the popular routes.

Everything is stored the moment it arrives, so the job can be stopped at any
time and simply started again: it only fetches what the cache does not hold yet.

(An earlier version fetched every Overpass tile of SA for historical sites; it
was stopped at 1 697 of 3 484 tiles — OSM has very few historical sites in SA.
The tiles fetched are kept and used from the cache; the rest are not fetched.)

Progress is written as JSON to a status file for a monitor page.
"""
import os
import json
import time
import logging
from services import kas
from services.histories import _land_items, LAND_SOORT, HISTORIES_SOORT

logger = logging.getLogger(__name__)

FOUT_POUSE_S = 300   # after a failed attempt
MAKS_POGINGS = 3


class Status:
    """Progress as a JSON file, replaced atomically on every update."""

    def __init__(self, pad):
        self.pad = pad
        self.data = {"begin": time.time(), "fase": "begin", "log": []}

    def stel(self, **velde):
        self.data.update(velde)
        self.skryf()

    def log(self, boodskap):
        logger.info(boodskap)
        self.data["log"] = (self.data["log"] + [[time.time(), boodskap]])[-25:]
        self.skryf()

    def skryf(self):
        if not self.pad:
            return
        self.data["opgedateer"] = time.time()
        tydelik = self.pad + ".tmp"
        with open(tydelik, "w") as f:
            json.dump(self.data, f, ensure_ascii=False)
        os.replace(tydelik, self.pad)


def haal_wikidata_land(status):
    """The region-wide Wikidata query (one call; cached for a year).  True when cached."""
    osm_teels = sum(n for soort, n, _ in kas.statistiek() if soort == HISTORIES_SOORT)
    for poging in range(1, MAKS_POGINGS + 1):
        gekas = kas.kry(LAND_SOORT, "items") is not None
        status.stel(fase="wikidata", wikidata={"gekas": gekas, "poging": poging,
                                               "osm_teels": osm_teels})
        if gekas:
            break
        status.log(f"Wikidata-navraag vir die hele streek (poging {poging})…")
        t0 = time.time()
        items = _land_items()
        if items is not None:
            status.log(f"Wikidata: {len(items)} items in {time.time() - t0:.0f} s")
            continue
        status.log(f"Wikidata misluk — wag {FOUT_POUSE_S} s")
        time.sleep(FOUT_POUSE_S)
    items = kas.kry(LAND_SOORT, "items")
    status.stel(wikidata={"gekas": items is not None, "items": len(items or []),
                          "osm_teels": osm_teels})
    return items is not None
