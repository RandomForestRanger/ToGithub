"""
Route geometry: project points onto the route polyline and intersect lines with it.

The route is thinned by distance (not by index — ORS packs thousands of points
into cities and passes but very few onto long straight highways), converted to
a local planar km grid, and its segments are bucketed in a spatial grid so that
each lookup only checks nearby segments.
"""
import math

_KM_PER_GRAAD_LAT = 110.574
_KM_PER_GRAAD_LON = 111.320


def haversine(lat1, lon1, lat2, lon2):
    """Distance in metres between two lat/lon points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class RoeteMeetkunde:
    """
    Planar model of a route for fast projection and intersection queries.

    afstande are scaled to `totale_afstand_m` (the ORS distance) so that every
    km figure on the diagram is consistent with the header total.
    """

    def __init__(self, koordinate, totale_afstand_m, min_spasie_km=0.5, maks_seg_km=5.0,
                 sel_km=20.0):
        # Thin by distance: keep a vertex once it is min_spasie_km from the last kept one.
        gedun = [tuple(koordinate[0])]
        for lat, lon in koordinate[1:-1]:
            if haversine(gedun[-1][0], gedun[-1][1], lat, lon) >= min_spasie_km * 1000:
                gedun.append((lat, lon))
        gedun.append(tuple(koordinate[-1]))

        # Split long straights so that bbox_stukke() pieces stay small.
        punte = [gedun[0]]
        for (lat1, lon1), (lat2, lon2) in zip(gedun, gedun[1:]):
            n = math.ceil(haversine(lat1, lon1, lat2, lon2) / (maks_seg_km * 1000))
            for k in range(1, n + 1):
                punte.append((lat1 + (lat2 - lat1) * k / n, lon1 + (lon2 - lon1) * k / n))

        self._lat0 = sum(p[0] for p in punte) / len(punte)
        self._cos0 = math.cos(math.radians(self._lat0))
        self._xy = [self._na_xy(lat, lon) for lat, lon in punte]

        kum = [0.0]
        for i in range(1, len(punte)):
            kum.append(kum[-1] + haversine(*punte[i - 1], *punte[i]) / 1000)
        self._skaal = (totale_afstand_m / 1000) / kum[-1] if kum[-1] else 0
        self._kum = kum

        # Spatial grid: segment i (xy[i] → xy[i+1]) goes into every cell its bbox touches.
        self._sel = sel_km
        self._rooster = {}
        for i in range(len(self._xy) - 1):
            (x1, y1), (x2, y2) = self._xy[i], self._xy[i + 1]
            for cx in range(self._c(min(x1, x2)), self._c(max(x1, x2)) + 1):
                for cy in range(self._c(min(y1, y2)), self._c(max(y1, y2)) + 1):
                    self._rooster.setdefault((cx, cy), []).append(i)

    def _na_xy(self, lat, lon):
        return lon * _KM_PER_GRAAD_LON * self._cos0, lat * _KM_PER_GRAAD_LAT

    def _c(self, v):
        return math.floor(v / self._sel)

    def _segmente_naby(self, x_min, y_min, x_max, y_max):
        gevind = set()
        for cx in range(self._c(x_min), self._c(x_max) + 1):
            for cy in range(self._c(y_min), self._c(y_max) + 1):
                gevind.update(self._rooster.get((cx, cy), ()))
        return gevind

    def _langs_km(self, seg_i, t):
        km = self._kum[seg_i] + t * (self._kum[seg_i + 1] - self._kum[seg_i])
        return km * self._skaal

    def projekteer(self, lat, lon, maks_km=15.0):
        """
        Project a point onto the route.
        Returns (afstand_langs_roete_km, loodregte_afstand_km), or None if the
        point is further than maks_km from the route.
        """
        naaste = self._naaste(lat, lon, maks_km)
        if naaste is None:
            return None
        d2, i, t, _, _ = naaste
        return self._langs_km(i, t), math.sqrt(d2)

    def projekteer_met_kant(self, lat, lon, maks_km=15.0):
        """
        As projekteer(), plus the side of the road in the direction of travel:
        returns (afstand_langs_roete_km, loodregte_afstand_km, "links" | "regs"),
        or None.
        """
        naaste = self._naaste(lat, lon, maks_km)
        if naaste is None:
            return None
        d2, i, t, px, py = naaste
        (x1, y1), (x2, y2) = self._xy[i], self._xy[i + 1]
        kruis = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)   # > 0: left of travel
        return self._langs_km(i, t), math.sqrt(d2), "links" if kruis > 0 else "regs"

    def _naaste(self, lat, lon, maks_km):
        """(perp_km², seg_i, t, px, py) of the nearest route segment, or None beyond maks_km."""
        px, py = self._na_xy(lat, lon)
        beste = None   # (perp_km², seg_i, t)
        for i in self._segmente_naby(px - maks_km, py - maks_km, px + maks_km, py + maks_km):
            (x1, y1), (x2, y2) = self._xy[i], self._xy[i + 1]
            dx, dy = x2 - x1, y2 - y1
            lengte2 = dx * dx + dy * dy
            t = 0.0 if lengte2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / lengte2))
            qx, qy = x1 + t * dx, y1 + t * dy
            d2 = (px - qx) ** 2 + (py - qy) ** 2
            if beste is None or d2 < beste[0]:
                beste = (d2, i, t)
        if beste is None or beste[0] > maks_km ** 2:
            return None
        return (*beste, px, py)

    def eerste_kruising(self, lyn):
        """
        Intersect a polyline [(lat, lon), …] with the route.
        Returns the route distance (km) of the earliest crossing, or None.
        """
        xy = [self._na_xy(lat, lon) for lat, lon in lyn]
        vroegste = None
        for j in range(len(xy) - 1):
            (ax, ay), (bx, by) = xy[j], xy[j + 1]
            for i in self._segmente_naby(min(ax, bx), min(ay, by), max(ax, bx), max(ay, by)):
                t = _sny(self._xy[i], self._xy[i + 1], (ax, ay), (bx, by))
                if t is not None:
                    km = self._langs_km(i, t)
                    if vroegste is None or km < vroegste:
                        vroegste = km
        return vroegste

    def bbox_stukke(self, stuk_km=60.0, buffer_graad=0.15, van_km=None, tot_km=None):
        """
        Split the route into ~stuk_km pieces and return one (s, w, n, e) bbox per
        piece.  A union of these hugs the route far more tightly than a single
        bbox — a diagonal 1400 km route's bbox covers a whole province or three.
        With van_km/tot_km (route km), only the pieces overlapping that stretch.
        """
        stukke = []
        begin = 0
        for i in range(1, len(self._kum)):
            if self._kum[i] - self._kum[begin] >= stuk_km or i == len(self._kum) - 1:
                if ((van_km is not None and self._kum[i] * self._skaal < van_km)
                        or (tot_km is not None and self._kum[begin] * self._skaal > tot_km)):
                    begin = i
                    continue
                xs = [p[0] for p in self._xy[begin:i + 1]]
                ys = [p[1] for p in self._xy[begin:i + 1]]
                lons = [x / (_KM_PER_GRAAD_LON * self._cos0) for x in xs]
                lats = [y / _KM_PER_GRAAD_LAT for y in ys]
                stukke.append((min(lats) - buffer_graad, min(lons) - buffer_graad,
                               max(lats) + buffer_graad, max(lons) + buffer_graad))
                begin = i
        return stukke


def _sny(p1, p2, p3, p4):
    """
    If segment p1–p2 intersects segment p3–p4, return the parameter t along
    p1–p2 (0…1) of the intersection; otherwise None.
    """
    (x1, y1), (x2, y2), (x3, y3), (x4, y4) = p1, p2, p3, p4
    noemer = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
    if noemer == 0:
        return None   # parallel or degenerate
    t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / noemer
    u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / noemer
    if 0 <= t <= 1 and 0 <= u <= 1:
        return t
    return None
