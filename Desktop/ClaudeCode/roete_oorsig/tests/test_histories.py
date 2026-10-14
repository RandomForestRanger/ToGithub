"""Scoring, de-duplication, corridor and spacing of historical sites — fixture data, no live APIs."""
import unittest
from unittest import mock

from services import histories
from services.histories import (kies_histories, _telling, _in_korridor, MAKS_HISTORIES,
                                BEROEMD_SITELINKS, KORRIDOR_KM, BEROEMD_KORRIDOR_KM,
                                SPASIERING_DELER)
from services.ikone import ikoon_tipe


def plek(naam, km, sitelinks=5, perp_km=2.0, in_dorp=False, qid=None, ikoon="ster", unesco=False):
    return {"naam": naam, "qid": qid, "ikoon": ikoon, "afstand_km": km, "perp_km": perp_km,
            "kant": "links", "sitelinks": sitelinks, "in_dorp": in_dorp, "unesco": unesco}


def dorp(km):
    return {"naam": f"Dorp{km}", "afstand_km": km}


class TestTelling(unittest.TestCase):
    STIPPE = [0, 1000]

    def test_fame_is_the_main_signal(self):
        self.assertGreater(_telling(plek("A", 500, sitelinks=20), self.STIPPE),
                           _telling(plek("B", 500, sitelinks=5), self.STIPPE))

    def test_closer_to_the_road_scores_higher(self):
        self.assertGreater(_telling(plek("A", 500, perp_km=0.5), self.STIPPE),
                           _telling(plek("B", 500, perp_km=9), self.STIPPE))

    def test_in_town_sites_are_penalised(self):
        # A famous church in town loses to a less famous site in the country
        kerk  = plek("Kerk", 500, sitelinks=10, in_dorp=True)
        veld  = plek("Slagveld", 500, sitelinks=6)
        self.assertGreater(_telling(veld, self.STIPPE), _telling(kerk, self.STIPPE))

    def test_empty_stretches_score_higher(self):
        stippe = [0, 100, 300, 1000]
        by_dorp = plek("A", 105)
        leeg    = plek("B", 200)   # 100 km from the nearest dot
        self.assertGreater(_telling(leeg, stippe), _telling(by_dorp, stippe))

    def test_unknown_sitelinks_count_as_one(self):
        # Wikidata unavailable: ranking still works on OSM data alone
        self.assertEqual(_telling(plek("A", 500, sitelinks=None), self.STIPPE),
                         _telling(plek("A", 500, sitelinks=1), self.STIPPE))


    def test_unesco_scores_higher(self):
        self.assertGreater(_telling(plek("A", 500, unesco=True), self.STIPPE),
                           _telling(plek("B", 500), self.STIPPE))


class TestKorridor(unittest.TestCase):
    def test_unesco_counts_as_famous(self):
        self.assertTrue(_in_korridor(plek("Vredefort-koepel", 0, sitelinks=3, perp_km=25, unesco=True)))

    def test_every_site_within_the_base_corridor(self):
        self.assertTrue(_in_korridor(plek("A", 0, sitelinks=0, perp_km=KORRIDOR_KM)))

    def test_famous_site_in_the_wide_corridor(self):
        self.assertTrue(_in_korridor(plek("A", 0, sitelinks=BEROEMD_SITELINKS, perp_km=25)))

    def test_obscure_site_outside_the_base_corridor(self):
        self.assertFalse(_in_korridor(plek("A", 0, sitelinks=BEROEMD_SITELINKS - 1, perp_km=25)))

    def test_nothing_beyond_the_wide_corridor(self):
        self.assertFalse(_in_korridor(plek("A", 0, sitelinks=100, perp_km=BEROEMD_KORRIDOR_KM + 1)))

    def test_unknown_fame_never_widens_the_corridor(self):
        self.assertFalse(_in_korridor(plek("A", 0, sitelinks=None, perp_km=12)))


class TestDuplikate(unittest.TestCase):
    def test_same_wikidata_item_kept_once(self):
        gekies = kies_histories([
            plek("Slagveld van Colenso", 300, qid="Q1", perp_km=8),
            plek("Colenso-gedenkteken", 302, qid="Q1", perp_km=1),
        ], [], 1000)
        self.assertEqual(len(gekies), 1)
        self.assertEqual(gekies[0]["naam"], "Colenso-gedenkteken")   # closer → higher score

    def test_same_name_different_items_kept_once(self):
        gekies = kies_histories([
            plek("Spioenkop", 300, qid="Q1", sitelinks=20),
            plek("spioenkop", 450, qid="Q2", sitelinks=3),
        ], [], 1000)
        self.assertEqual([g["qid"] for g in gekies], ["Q1"])


class TestSpasiering(unittest.TestCase):
    def test_sites_too_close_together_are_skipped(self):
        # Route 1200 km → minimum gap 100 km; a cluster of battlefields gets one slot
        gekies = kies_histories([
            plek("A", 400, sitelinks=30),
            plek("B", 450, sitelinks=20),
            plek("C", 480, sitelinks=10),
            plek("D", 600, sitelinks=5),
        ], [], 1200)
        self.assertEqual([g["naam"] for g in gekies], ["A", "D"])

    def test_spacing_rule_holds_for_every_pair(self):
        totale_km = 1400
        kandidate = [plek(f"P{km}", km, sitelinks=km % 37 + 1) for km in range(0, 1400, 13)]
        gekies = kies_histories(kandidate, [dorp(300), dorp(800)], totale_km)
        kms = [g["afstand_km"] for g in gekies]
        self.assertEqual(kms, sorted(kms))
        for a, b in zip(kms, kms[1:]):
            self.assertGreaterEqual(b - a, totale_km / SPASIERING_DELER)

    def test_at_most_eight(self):
        kandidate = [plek(f"P{km}", km) for km in range(0, 2000, 10)]
        self.assertEqual(len(kies_histories(kandidate, [], 2000)), MAKS_HISTORIES)

    def test_never_padded(self):
        self.assertEqual(kies_histories([plek("Enigste", 30)], [], 60)[0]["naam"], "Enigste")
        self.assertEqual(kies_histories([], [], 60), [])

    def test_sites_outside_corridor_are_not_used_to_fill(self):
        self.assertEqual(kies_histories([plek("Ver", 30, sitelinks=2, perp_km=20)], [], 60), [])


def ry(qid, lat, lon, sl, klas=None, unesco=False, af=None, en=None):
    r = {"item": {"value": f"http://www.wikidata.org/entity/{qid}"},
         "koord": {"value": f"Point({lon} {lat})"}, "sl": {"value": str(sl)}}
    if klas:
        r["klas"] = {"value": f"http://www.wikidata.org/entity/{klas}"}
    if unesco:
        r["unesco"] = {"value": "true"}
    if af:
        r["af"] = {"value": af}
    if en:
        r["en"] = {"value": en}
    return r


class TestWikidataLand(unittest.TestCase):
    RYE = [
        # Spioenkop: battle and memorial → the battle icon wins (IKOON_VOORRANG)
        ry("Q1", -28.65, 29.52, 15, klas="Q5003624", af="Slag van Spioenkop"),
        ry("Q1", -28.65, 29.52, 15, klas="Q178561", af="Slag van Spioenkop"),
        # UNESCO overrides the class icon
        ry("Q2", -27.0, 27.5, 12, klas="Q35509", en="Vredefort Dome"),
        ry("Q2", -27.0, 27.5, 12, unesco=True, en="Vredefort Dome"),
        # Corbelled house recognised by name
        ry("Q3", -31.0, 21.0, 2, klas="Q35112127", en="Corbelled house, Williston"),
        # No label → dropped; coordinates on another globe → dropped
        ry("Q4", -30.0, 25.0, 5, klas="Q33506"),
        {**ry("Q5", 0, 0, 5, klas="Q33506", en="Mars"),
         "koord": {"value": "<http://www.wikidata.org/entity/Q111> Point(10 20)"}},
    ]

    def test_parsing(self):
        antwoord = mock.Mock(status_code=200)
        antwoord.json.return_value = {"results": {"bindings": self.RYE}}
        unesco = mock.Mock(status_code=200)
        q2 = {"value": "http://www.wikidata.org/entity/Q2"}
        unesco.json.return_value = {"results": {"bindings": [
            {"item": q2, "m2": {"value": "300000000"}, "deelkoord": {"value": "Point(27.0 -27.0)"}},
            {"item": q2, "m2": {"value": "300000000"}, "deelkoord": {"value": "Point(27.5 -27.0)"}},
        ]}}
        with mock.patch.object(histories.requests, "get", side_effect=[antwoord, unesco]), \
             mock.patch.object(histories.kas, "kry", return_value=None), \
             mock.patch.object(histories.kas, "stoor") as stoor:
            items = {i["qid"]: i for i in histories._land_items()}
        self.assertEqual(set(items), {"Q1", "Q2", "Q3"})
        self.assertEqual(items["Q1"]["ikoon"], "slagveld")
        self.assertEqual(items["Q1"]["naam"], "Slag van Spioenkop")
        self.assertEqual(items["Q2"]["ikoon"], "unesco")
        self.assertTrue(items["Q2"]["unesco"])
        self.assertEqual(items["Q3"]["ikoon"], "korbeelhuis")
        self.assertEqual(items["Q2"]["oppervlak_km2"], 300)
        self.assertAlmostEqual(items["Q2"]["spreiding_km"], 49.6, delta=0.5)
        self.assertIsNone(items["Q1"]["oppervlak_km2"])
        self.assertEqual((items["Q1"]["lat"], items["Q1"]["lon"]), (-28.65, 29.52))
        stoor.assert_called_once()

    def test_failure_is_not_cached(self):
        with mock.patch.object(histories.requests, "get",
                               side_effect=histories.requests.ConnectionError("af")), \
             mock.patch.object(histories.kas, "kry", return_value=None), \
             mock.patch.object(histories.kas, "stoor") as stoor:
            self.assertIsNone(histories._land_items())
        stoor.assert_not_called()


class TestIkone(unittest.TestCase):
    def test_types(self):
        self.assertEqual(ikoon_tipe({"historic": "battlefield", "name": "Spioenkop"}), "slagveld")
        self.assertEqual(ikoon_tipe({"amenity": "place_of_worship", "heritage": "4", "name": "NG Kerk"}), "kerk")
        self.assertEqual(ikoon_tipe({"historic": "memorial", "memorial": "grave", "name": "X"}), "graf")
        self.assertEqual(ikoon_tipe({"historic": "building", "name": "Corbelled House"}), "korbeelhuis")
        self.assertEqual(ikoon_tipe({"historic": "milestone", "name": "X"}), "ster")


if __name__ == "__main__":
    unittest.main()
