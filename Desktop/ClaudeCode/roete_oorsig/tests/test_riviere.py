"""River and stream crossings: bridge gaps, gaps that get streams, stream tier — fixture data only."""
import unittest

from services.geometrie import RoeteMeetkunde, haversine
from services.overpass import _kruisings, _gate, STROOM_GAT_KM
from services.diagram import _filter_riviere

# A straight route due north along lon 28.0, ~55 km
BEGIN, EINDE = (-26.0, 28.0), (-25.5, 28.0)
KOORDINATE = [BEGIN, ((BEGIN[0] + EINDE[0]) / 2, 28.0), EINDE]
AFSTAND_M = haversine(*BEGIN, *EINDE)
GRAAD_PER_KM_LON = 1 / 100.2   # at ~25.8° S
GRAAD_PER_KM_LAT = 1 / 110.6


def way(naam, punte):
    return {"type": "way", "id": hash((naam, tuple(punte))), "tags": {"name": naam},
            "geometry": [{"lat": la, "lon": lo} for la, lo in punte]}


def oos(km):
    """Longitude `km` east of the route (negative: west)."""
    return 28.0 + km * GRAAD_PER_KM_LON


class TestKruisings(unittest.TestCase):
    def setUp(self):
        self.m = RoeteMeetkunde(KOORDINATE, AFSTAND_M)

    def test_real_crossing(self):
        k = _kruisings([way("Krokodilrivier", [(-25.8, oos(-3)), (-25.8, oos(3))])], self.m)
        self.assertIn("Krokodilrivier", k)
        self.assertAlmostEqual(k["Krokodilrivier"][0], 22.1, delta=0.5)

    def test_bridge_gap_counts(self):
        # The named line stops 20 m east of the road and resumes 30 m west of it
        k = _kruisings([
            way("Klein Jukskei", [(-25.8, oos(2)), (-25.8, oos(0.02))]),
            way("Klein Jukskei", [(-25.8, oos(-0.03)), (-25.801, oos(-2))]),
        ], self.m)
        self.assertIn("Klein Jukskei", k)
        self.assertAlmostEqual(k["Klein Jukskei"][0], 22.1, delta=0.5)

    def test_river_alongside_does_not_count(self):
        # Runs beside the road, 30 m east, and its piece ends there: one side only
        k = _kruisings([
            way("Krokodilrivier", [(-25.80, oos(0.03)), (-25.75, oos(0.03))]),
            way("Krokodilrivier", [(-25.75, oos(0.03)), (-25.70, oos(0.5))]),
        ], self.m)
        self.assertNotIn("Krokodilrivier", k)

    def test_line_ending_far_from_road_does_not_count(self):
        k = _kruisings([way("Magalies", [(-25.6, oos(5)), (-25.6, oos(1.2))])], self.m)
        self.assertNotIn("Magalies", k)


class TestGate(unittest.TestCase):
    def test_stretches_without_rivers(self):
        self.assertEqual(_gate([10, 20, 70], 100, STROOM_GAT_KM), [(20, 70), (70, 100)])

    def test_no_rivers_at_all(self):
        self.assertEqual(_gate([], 55, STROOM_GAT_KM), [(0, 55)])

    def test_short_route_dense_rivers(self):
        self.assertEqual(_gate([10, 30, 50], 60, STROOM_GAT_KM), [])


class TestStroomVlak(unittest.TestCase):
    def test_stream_never_beats_a_river(self):
        riviere = [{"naam": "Bloubankspruit", "afstand_km": 50, "telling": 30, "stroom": True},
                   {"naam": "Sandspruit", "afstand_km": 51, "telling": 1}]
        self.assertEqual([r["naam"] for r in _filter_riviere(riviere, 1000)], ["Sandspruit"])

    def test_streams_need_double_spacing(self):
        # Route 100 km → rivers 2 km apart, streams 4 km
        riviere = [{"naam": "Rivier", "afstand_km": 50, "telling": 1},
                   {"naam": "Spruit A", "afstand_km": 53, "telling": 1, "stroom": True},
                   {"naam": "Spruit B", "afstand_km": 55, "telling": 1, "stroom": True}]
        self.assertEqual([r["naam"] for r in _filter_riviere(riviere, 100)], ["Rivier", "Spruit B"])


if __name__ == "__main__":
    unittest.main()
