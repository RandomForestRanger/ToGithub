"""
Persistent cache ("kas") for raw external-API answers, plus the job store.

Raw answers are cached — geocodes, ORS routes, Overpass tiles, Nominatim
addresses — never finished maps: selection and drawing re-run on top of the
cached data in well under a second, so rule changes take effect immediately
and overlapping routes share data.

Only successful answers are stored; failures are simply retried next time,
so incomplete routes fill in cumulatively.

Storage: one SQLite file (data/roete_oorsig.db, gitignored), table
kas(soort, sleutel, waarde JSON, verval epoch).  One connection per thread.
"""
import os
import json
import time
import sqlite3
import threading
import contextlib
import contextvars

DB_PAD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "data", "roete_oorsig.db")
VERSTEK_TTL_S = 90 * 24 * 3600   # OSM data changes slowly

_plaaslik = threading.local()
_omseil = contextvars.ContextVar("kas_omseil", default=False)


def _db():
    con = getattr(_plaaslik, "con", None)
    if con is None:
        os.makedirs(os.path.dirname(DB_PAD), exist_ok=True)
        con = sqlite3.connect(DB_PAD, timeout=30)
        con.execute("PRAGMA journal_mode=WAL")
        con.execute(
            "CREATE TABLE IF NOT EXISTS kas ("
            " soort TEXT NOT NULL, sleutel TEXT NOT NULL, waarde TEXT NOT NULL,"
            " verval REAL NOT NULL, PRIMARY KEY (soort, sleutel))"
        )
        _plaaslik.con = con
    return con


@contextlib.contextmanager
def omseil(aan=True):
    """
    Within this block, cache reads miss (fresh data is fetched) but successful
    answers are still written, refreshing the cache.  Jobs are never bypassed.
    """
    teken = _omseil.set(bool(aan))
    try:
        yield
    finally:
        _omseil.reset(teken)


def kry(soort, sleutel, omseilbaar=True):
    """Return the cached value, or None if absent, expired or bypassed."""
    if omseilbaar and _omseil.get():
        return None
    ry = _db().execute(
        "SELECT waarde FROM kas WHERE soort = ? AND sleutel = ? AND verval > ?",
        (soort, sleutel, time.time()),
    ).fetchone()
    return json.loads(ry[0]) if ry else None


def stoor(soort, sleutel, waarde, ttl_s=VERSTEK_TTL_S):
    con = _db()
    with con:
        con.execute(
            "INSERT OR REPLACE INTO kas (soort, sleutel, waarde, verval) VALUES (?, ?, ?, ?)",
            (soort, sleutel, json.dumps(waarde, separators=(",", ":")), time.time() + ttl_s),
        )


def ruim_op():
    """Delete expired entries."""
    con = _db()
    with con:
        con.execute("DELETE FROM kas WHERE verval <= ?", (time.time(),))


def vee_uit(soort=None):
    """Delete all entries (of one soort, if given). Returns the number deleted."""
    con = _db()
    with con:
        if soort:
            return con.execute("DELETE FROM kas WHERE soort = ?", (soort,)).rowcount
        return con.execute("DELETE FROM kas").rowcount


def statistiek():
    """[(soort, aantal, grootte_bytes)] for every soort in the cache."""
    return _db().execute(
        "SELECT soort, COUNT(*), SUM(LENGTH(waarde)) FROM kas GROUP BY soort ORDER BY soort"
    ).fetchall()
