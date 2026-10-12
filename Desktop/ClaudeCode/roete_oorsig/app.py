import time
import uuid
import logging
import functools
import click
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from services import kas
from services.geocoding import geocodeer
from services.routing import haal_roete
from services.overpass import (haal_dorpe, haal_riviere, haal_grense_en_sones,
                               vul_aan_met_steekproef)
from services.diagram import bou_svg
from config import SECRET_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = SECRET_KEY

# ---------------------------------------------------------------------------
# Job store — keeps route data between the staged API calls.  Jobs live in the
# SQLite cache (services/kas.py, soort "taak") rather than in memory, so a
# route in progress survives the dev server's reload on every code change.
# Each save refreshes the job's 30-minute lifetime.
# ---------------------------------------------------------------------------
_JOB_TTL_S = 30 * 60

# Abuse limits
MAKS_ROETE_KM    = 2000   # no route may be longer than this, via or not
VIA_MIN_DIREK_KM = 100    # the doubling rule applies to routes longer than this…
VIA_MAKS_FAKTOR  = 2      # …where a via may not make the route more than 2× as long


def _km_teks(km):
    """1399 → '1 399' (Afrikaans thousands separator)."""
    return f"{km:,}".replace(",", " ")


def _nuwe_job(koordinate, totale_afstand_m, totale_tyd_s,
              vertrekpunt, bestemming, totale_km, vars_data, via=None, via_km=None):
    kas.ruim_op()
    jid = str(uuid.uuid4())
    _stoor_job(jid, {
        "geskep":           time.time(),
        "koordinate":       koordinate,
        "totale_afstand_m": totale_afstand_m,
        "totale_tyd_s":     totale_tyd_s,
        "totale_km":        totale_km,
        "vertrekpunt":      vertrekpunt,
        "bestemming":       bestemming,
        "vars":             vars_data,
        "via":              via,
        "via_km":           via_km,
        "dorpe":            [],
        "riviere":          [],
        "grense":           [],
        "sones":            [],
    })
    return jid


def _kry_job(jid):
    return kas.kry("taak", jid, omseilbaar=False)


def _stoor_job(jid, job):
    kas.stoor("taak", jid, job, ttl_s=_JOB_TTL_S)


def _stadium(funksie):
    """
    Wrap a staged-update endpoint: load the job (404 if gone), run the stage
    with the job's fresh-data setting, save the job, return the rebuilt SVG.
    """
    @functools.wraps(funksie)
    def omhulsel(job_id):
        job = _kry_job(job_id)
        if not job:
            return jsonify({"fout": "Taak nie gevind nie"}), 404
        with kas.omseil(job.get("vars", False)):
            funksie(job)
        _stoor_job(job_id, job)
        return jsonify({"svg": _bou_svg(job)})
    return omhulsel


def _bou_svg(job):
    return bou_svg(
        dorpe=job["dorpe"],
        riviere=job["riviere"],
        grense=job["grense"],
        munisipaliteit_sones=job["sones"],
        vertrekpunt=job["vertrekpunt"],
        bestemming=job["bestemming"],
        totale_km=job["totale_km"],
        tyd_sekondes=job["totale_tyd_s"],
        via=job.get("via"),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def indeks():
    # Dev aid: /?vars=1 ignores cached data for the route requested from this
    # page (fresh answers are still written back, refreshing the cache).
    return render_template("index.html", vars_data=request.args.get("vars") == "1")


@app.route("/kaart", methods=["POST"])
def kaart():
    """
    Stage 0: geocoding + routing only (~10 s; instant when cached).
    Returns the initial map page with a bare route line + endpoints.
    The browser then drives subsequent stages via the /api/update/* endpoints.
    """
    vertrekpunt = request.form.get("vertrekpunt", "").strip()
    bestemming  = request.form.get("bestemming",  "").strip()
    via         = request.form.get("via", "").strip() or None
    vars_data   = request.form.get("vars") == "1"

    if not vertrekpunt or not bestemming:
        flash("Vul asseblief beide vertrekpunt en bestemming in.")
        return redirect(url_for("indeks"))

    with kas.omseil(vars_data):
        koords = {}
        for plek in filter(None, (vertrekpunt, via, bestemming)):
            koords[plek] = geocodeer(plek)
            if not koords[plek]:
                flash(f"Kon nie die plek '{plek}' vind nie. Probeer asseblief 'n meer spesifieke naam.")
                return redirect(url_for("indeks"))

        # The direct route is needed either way: it is the route without a via,
        # and the yardstick for the doubling rule with one.
        koordinate, totale_afstand_m, totale_tyd_s, _ = haal_roete(
            koords[vertrekpunt], koords[bestemming])
        via_afstand_m = None
        if koordinate is not None and via:
            direk_km = round(totale_afstand_m / 1000)
            koordinate, totale_afstand_m, totale_tyd_s, via_afstand_m = haal_roete(
                koords[vertrekpunt], koords[bestemming], koords[via])
    if koordinate is None:
        flash("Kon nie 'n roete vind nie. Kontroleer asseblief die plekname en probeer weer.")
        return redirect(url_for("indeks"))

    totale_km = round(totale_afstand_m / 1000)
    if via and direk_km > VIA_MIN_DIREK_KM and totale_km > VIA_MAKS_FAKTOR * direk_km:
        flash(f"Die roete via '{via}' ({_km_teks(totale_km)} km) is meer as dubbel so lank as "
              f"die direkte roete ({_km_teks(direk_km)} km). Kies asseblief 'n plek nader aan die pad.")
        return redirect(url_for("indeks"))
    if totale_km > MAKS_ROETE_KM:
        flash(f"Die roete is {_km_teks(totale_km)} km lank — die maksimum is "
              f"{_km_teks(MAKS_ROETE_KM)} km. Kies asseblief plekke nader aan mekaar.")
        return redirect(url_for("indeks"))

    via_km = round(via_afstand_m / 1000) if via_afstand_m is not None else None
    job_id = _nuwe_job(koordinate, totale_afstand_m, totale_tyd_s,
                       vertrekpunt, bestemming, totale_km, vars_data, via, via_km)

    # Initial SVG: route line + departure/destination dots only
    svg = _bou_svg(_kry_job(job_id))

    return render_template(
        "kaart.html",
        svg=svg,
        job_id=job_id,
        vertrekpunt=vertrekpunt,
        bestemming=bestemming,
        totale_km=totale_km,
    )


# ---------------------------------------------------------------------------
# Staged update API  (called sequentially by the browser after page load)
# ---------------------------------------------------------------------------

def _via_dorp(job):
    """The via as a fixed town (always drawn, big dot), or None."""
    if not job.get("via"):
        return None
    return {"naam": job["via"], "tipe": "city", "rang": 5, "bevolking": 0, "perp_m": 0,
            "stip_radius": 14, "afstand_km": job["via_km"], "via": True}


def _laai_dorpe(job):
    """Fetch Overpass towns into the job.  Returns False if some tiles could not be fetched."""
    via_dorp = _via_dorp(job)
    dorpe, volledig = haal_dorpe(job["koordinate"], job["totale_afstand_m"],
                                 vaste=[via_dorp] if via_dorp else ())
    job["dorpe"] = dorpe   # endpoint clearance is part of the spacing rule
    return volledig


def _laai_riviere(job):
    """Fetch Overpass river crossings into the job.  Returns False if some tiles could not be fetched."""
    riviere, volledig = haal_riviere(job["koordinate"], job["totale_afstand_m"])
    job["riviere"] = riviere
    return volledig


@app.route("/api/update/<job_id>/dorpe")
@_stadium
def api_dorpe(job):
    """Stage 1: fetch prominent towns from Overpass."""
    job["dorpe_misluk"] = not _laai_dorpe(job)
    logger.info("Dorpe stadium voltooi: %d dorpe%s", len(job["dorpe"]),
                " (onvolledig — ontbrekende teels weer probeer in stadium 3)" if job["dorpe_misluk"] else "")


@app.route("/api/update/<job_id>/riviere")
@_stadium
def api_riviere(job):
    """Stage 2: fetch river crossings from Overpass."""
    job["riviere_misluk"] = not _laai_riviere(job)
    logger.info("Riviere stadium voltooi: %d riviere%s", len(job["riviere"]),
                " (onvolledig — ontbrekende teels weer probeer in stadium 3)" if job["riviere_misluk"] else "")


@app.route("/api/update/<job_id>/munisipaliteite")
@_stadium
def api_munisipaliteite(job):
    """
    Stage 3: sample the route for province borders + municipality zones (~80 s;
    instant when cached).  Then retry any Overpass stage that was incomplete —
    outages come in waves of tens of seconds, so after the sampling Overpass
    has usually recovered.
    """
    grense, sones, dorpe_steekproef = haal_grense_en_sones(
        job["koordinate"], job["totale_afstand_m"]
    )
    job["grense"] = grense
    job["sones"]  = sones

    # The retry reads the cache even in fresh-data mode: stages 1–2 have just
    # refreshed every tile they could, so only the missing ones are fetched.
    with kas.omseil(False):
        if job.get("dorpe_misluk"):
            job["dorpe_misluk"] = not _laai_dorpe(job)
            logger.info("Dorpe herprobeer: %d dorpe%s", len(job["dorpe"]),
                        " (steeds onvolledig)" if job["dorpe_misluk"] else "")
        if job.get("riviere_misluk"):
            job["riviere_misluk"] = not _laai_riviere(job)
            logger.info("Riviere herprobeer: %d riviere%s", len(job["riviere"]),
                        " (steeds onvolledig)" if job["riviere_misluk"] else "")

    # Fill gaps the Overpass towns left (or replace them entirely if Overpass
    # is still unreachable) with the Nominatim sample towns, at their real positions.
    voor = len(job["dorpe"])
    job["dorpe"] = vul_aan_met_steekproef(job["dorpe"], dorpe_steekproef,
                                          job["koordinate"], job["totale_afstand_m"])
    if len(job["dorpe"]) > voor:
        logger.info("Steekproef-dorpe bygevoeg: %d", len(job["dorpe"]) - voor)
    logger.info("Munisipaliteite stadium voltooi: %d sones, %d grense", len(sones), len(grense))


# ---------------------------------------------------------------------------
# Cache management  (flask --app app kas-stand | kas-uitvee [SOORT])
# ---------------------------------------------------------------------------

@app.cli.command("kas-stand")
def kas_stand():
    """Show what the cache holds, per soort."""
    for soort, aantal, grootte in kas.statistiek():
        click.echo(f"{soort:24} {aantal:6} inskrywings  {(grootte or 0) / 1e6:8.2f} MB")


@app.cli.command("kas-uitvee")
@click.argument("soort", required=False)
def kas_uitvee(soort):
    """Delete the whole cache, or one SOORT (e.g. overpass_dorpe_v1, omgekeerd)."""
    click.echo(f"{kas.vee_uit(soort)} inskrywings verwyder")


if __name__ == "__main__":
    app.run(debug=True)
