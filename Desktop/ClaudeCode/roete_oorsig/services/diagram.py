"""
SVG diagram builder — vertical straight-line route schematic.

Drawing layers (bottom to top):
  1. Province border lines (dashed, full-width)
  2. River crossing ticks
  3. Road-texture dashed line + main route line
  4. Town dots and labels
  5. Header / footer
"""

import unicodedata

from services.geocoding import pas_korreksies_toe

# Colours
KLEUR_ROETE    = "#2c5f2e"   # dark green — route line and town dots
KLEUR_RIVIER   = "#1a5276"   # dark blue  — river ticks and labels
KLEUR_GRENS    = "#7b241c"   # dark red   — province border lines and labels
KLEUR_KOPTEKS  = "#444"
KLEUR_SUBTEKS  = "#888"
KLEUR_VOETNOOT = "#aaa"

# Vertical route line: departure dot at Y_BEGIN, destination dot at Y_EINDE
Y_BEGIN = 170
Y_EINDE = 1060
STIP_RAND_PX     = 2    # white rim drawn around every town dot
EINDPUNT_RADIUS  = 14   # departure / destination dot radius

# White outline behind label glyphs: lines passing behind a label (province
# borders, zone edges) are masked instead of striking through the text.
HALO = 'paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"'

DORP_LABEL_SPASIE   = 30   # px per town label block (13 px name + 11 px km line)
RIVIER_LABEL_SPASIE = 10   # px per river label (8 px text)

# Municipality zone colours — gentle, pastel; index matches kleur_indeks from overpass.py
# Each tuple: (fill, stroke/label colour)
SONE_KLEURE = [
    ("#f5e8a0", "#8a7000"),  # soft yellow
    ("#f2b0b0", "#8a2020"),  # soft rose-red
    ("#a8cce8", "#1a5276"),  # soft sky-blue
    ("#a8daa8", "#2e6b2e"),  # soft green
    ("#c8b0e8", "#4a1e8a"),  # soft lavender
    ("#f5c888", "#8a4a00"),  # soft peach-orange
]
# Colour for zones where the municipality could not be determined (kleur_indeks == -1)
SONE_KLEUR_ONBEKEND = ("#e0e0e0", "#999999")   # neutral grey

# Strip occupies x=635–662 — well right of all route labels
SONE_X1 = 635
SONE_X2 = 662

# Leg-distance strip (left margin) mirrors the municipality strip: both sit
# 238 px from the route line.  x=123–159 lies between the province labels
# (x≥44, ~65 px wide) and the right-aligned town labels (ending at x=377).
BEEN_X1 = 123
BEEN_X2 = 159
# Alternating bands so consecutive legs are told apart; (fill, stroke, text)
BEEN_KLEURE = [("#eef4ee", "#b8d0b8", "#2c5f2e"),
               ("#dbe8db", "#a6c4a6", "#2c5f2e")]


def _verkort_muni(naam):
    """Strip common SA municipality suffixes (English and Afrikaans) for compact strip labels."""
    for suffix in (
        " Metropolitan Municipality",
        " Metropolitaanse Munisipaliteit",
        " Local Municipality",
        " Plaaslike Munisipaliteit",
        " District Municipality",
        " Distriksmunisipaliteit",
        " Municipality",
        " Munisipaliteit",
    ):
        if naam.endswith(suffix):
            naam = naam[: -len(suffix)]
            break
    return naam[:24]


# ── River hierarchy ──────────────────────────────────────────────────────
# Each entry is one river with its known spellings (Afrikaans, English, isiZulu…).
# Matching is on _normaliseer_rivier(), so "Oranjerivier", "Orange River" and
# "Gariep" all hit the same entry.  Generic names that occur many times across
# the country (Riet, Klip, Buffels, Krokodil, Sand, Elands…) are deliberately
# left out: they would promote every small stream that happens to share them.
RIVIER_VLAK_1 = [   # never dropped
    ("oranje", "orange", "gariep"),
    ("vaal",),
    ("limpopo",),
    ("thukela", "tugela", "uthukela"),
    ("bree", "breede"),
]
RIVIER_VLAK_2 = [
    ("olifants",),
    ("grootvis", "greatfish"),
    ("sondags", "sundays"),
    ("grootkei", "greatkei", "kei"),
    ("gourits", "gouritz"),
    ("mzimvubu", "umzimvubu"),
    ("caledon", "mohokare"),
    ("modder",),
    ("komati", "nkomati"),
    ("pongola", "phongolo"),
]
RIVIER_VLAK_3 = [
    ("berg",), ("doring",), ("gamtoos",), ("swartkops",), ("keiskamma",),
    ("mbashe", "mbhashe", "bashee"), ("mkomazi", "umkomazi", "umkomaas"),
    ("mgeni", "umgeni", "umngeni"), ("sabie",), ("letaba", "grootletaba"),
    ("mogalakwena",), ("marico", "groot marico", "grootmarico"), ("harts", "hartz"),
    ("wilge",), ("sak",), ("molopo",), ("gamka",), ("hex",), ("kowie",),
    ("mtamvuna", "umtamvuna"),
]
_RIVIER_VLAK = {
    alias.replace(" ", ""): vlak
    for vlak, lys in ((1, RIVIER_VLAK_1), (2, RIVIER_VLAK_2), (3, RIVIER_VLAK_3))
    for rivier in lys
    for alias in rivier
}
_ONGEVLAK = 4   # everything not in a tier list


def _normaliseer_rivier(naam):
    """'Breërivier' → 'bree', 'Great Fish River' → 'greatfish', 'Groot-Kei' → 'grootkei'."""
    n = unicodedata.normalize("NFKD", naam.lower())
    n = "".join(c for c in n if not unicodedata.combining(c))
    for agtervoegsel in ("rivier", "river"):
        if n.endswith(agtervoegsel):
            n = n[: -len(agtervoegsel)]
    return "".join(c for c in n if c.isalnum())


def rivier_vlak(naam):
    """Tier (1–3) of a named river, or 4 if it is not in a tier list."""
    return _RIVIER_VLAK.get(_normaliseer_rivier(naam), _ONGEVLAK)


def _filter_riviere(riviere, totale_km, min_pct=2.0, max_riviere=50):
    """
    Select rivers to label using a hierarchy of elimination.

      1. Tier 1 rivers (RIVIER_VLAK_1) are always kept — even when they sit
         closer than min_km to another river.
      2. Everything else competes for space in order: tier 2, then tier 3,
         then untiered.  Within a tier, `telling` (number of OSM ways carrying
         the name — a rough prominence proxy) breaks ties, then route distance.
      3. Greedy spacing: a river is added only if it is at least min_km
         (min_pct of the route) from every river already kept, tier 1 included.
      4. Hard cap of max_riviere on the non-tier-1 rivers.

    Example (Kaapstad → Johannesburg, min_km = 28): the Vaal (tier 1, telling 2)
    is kept although the Rietspruit (telling 10) is 16 km away; the Rietspruit
    is then dropped for being too close to it.
    """
    if totale_km <= 0:
        return riviere[:max_riviere]
    min_km = totale_km * min_pct / 100

    gevang = [r for r in riviere if rivier_vlak(r["naam"]) == 1]
    gevang_km = [r["afstand_km"] for r in gevang]

    res = sorted(
        (r for r in riviere if rivier_vlak(r["naam"]) != 1),
        key=lambda r: (rivier_vlak(r["naam"]), -r.get("telling", 1), r["afstand_km"]),
    )
    bygevoeg = 0
    for rivier in res:
        if bygevoeg >= max_riviere:
            break
        if all(abs(rivier["afstand_km"] - km) >= min_km for km in gevang_km):
            gevang.append(rivier)
            gevang_km.append(rivier["afstand_km"])
            bygevoeg += 1

    gevang.sort(key=lambda r: r["afstand_km"])
    return gevang


def km_vir_stippe(r1, r2, totale_km):
    """
    Route km two dots of radius r1 and r2 must be apart so that they (and their
    white rims) do not overlap on the diagram.  Long routes squeeze many km into
    each pixel: two city dots need 32 px ≈ 50 km on a 1400 km route, two town
    dots only 24 px ≈ 38 km.
    """
    return totale_km * (r1 + r2 + 2 * STIP_RAND_PX) / (Y_EINDE - Y_BEGIN)


def _versprei(gewens, spasie, y_min, y_max):
    """
    1-D label placement: given desired y positions (sorted ascending), return
    positions at least `spasie` apart, as close as possible to the desired ones.

    Overlapping labels are merged into clusters; each cluster is centred on the
    mean of its members' desired positions (so labels spread both up and down
    around their dots instead of drifting ever further down), then clamped to
    [y_min, y_max].
    """
    trosse = []   # each: [eerste_indeks, aantal, bo_y]
    for i, y in enumerate(gewens):
        trosse.append([i, 1, y])
        while len(trosse) > 1:
            vorige, huidige = trosse[-2], trosse[-1]
            if vorige[2] + vorige[1] * spasie <= huidige[2]:
                break
            eerste, aantal = vorige[0], vorige[1] + huidige[1]
            gemiddeld = sum(gewens[eerste:eerste + aantal]) / aantal
            bo = gemiddeld - (aantal - 1) * spasie / 2
            bo = max(y_min, min(bo, y_max - (aantal - 1) * spasie))
            trosse[-2:] = [[eerste, aantal, bo]]
    geplaas = []
    for _, aantal, bo in trosse:
        geplaas.extend(bo + k * spasie for k in range(aantal))
    return geplaas


def bou_svg(dorpe, riviere, grense, munisipaliteit_sones,
            vertrekpunt, bestemming, totale_km, tyd_sekondes, via=None):
    # Apply river spacing filter before drawing (2 % of route = min gap)
    riviere = _filter_riviere(riviere, totale_km)

    breedte = 794
    hoogte  = 1123
    lyn_x   = 397        # route line x (centre of page)
    y_begin = Y_BEGIN
    y_einde = Y_EINDE

    ure    = int(tyd_sekondes // 3600)
    minute = int((tyd_sekondes % 3600) // 60)
    tyd_teks = f"{ure}u {minute}m"

    def y_van_km(km):
        return y_begin + (y_einde - y_begin) * km / totale_km if totale_km else y_begin

    vertrekpunt = pas_korreksies_toe(vertrekpunt)
    bestemming  = pas_korreksies_toe(bestemming)

    svg = []

    svg.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{breedte}" height="{hoogte}" '
        f'style="background:#fff;font-family:Arial,sans-serif;">'
    )

    # ── Header ────────────────────────────────────────────────────────────
    svg.append(
        f'<text x="{breedte//2}" y="45" text-anchor="middle" '
        f'font-size="28" font-weight="bold" fill="{KLEUR_ROETE}">Roete Oorsig</text>'
    )
    svg.append(
        f'<text x="{breedte//2}" y="75" text-anchor="middle" '
        f'font-size="16" fill="{KLEUR_KOPTEKS}">{_esc(vertrekpunt)} na {_esc(bestemming)}'
        f'{" via " + _esc(pas_korreksies_toe(via)) if via else ""}</text>'
    )
    svg.append(
        f'<text x="{breedte//2}" y="97" text-anchor="middle" '
        f'font-size="13" fill="{KLEUR_SUBTEKS}">'
        f'Totale afstand: {totale_km} km  \u2022  Geskatte tyd: {tyd_teks}</text>'
    )

    # ── Legend ────────────────────────────────────────────────────────────
    lx, ly = 60, 118
    svg.append(f'<circle cx="{lx+6}" cy="{ly-4}" r="6" fill="{KLEUR_ROETE}"/>')
    svg.append(f'<text x="{lx+16}" y="{ly}" font-size="10" fill="{KLEUR_SUBTEKS}">Stad/dorp</text>')
    svg.append(f'<line x1="{lx+75}" y1="{ly-4}" x2="{lx+91}" y2="{ly-4}" stroke="{KLEUR_RIVIER}" stroke-width="2"/>')
    svg.append(f'<text x="{lx+95}" y="{ly}" font-size="10" fill="{KLEUR_SUBTEKS}">Rivier</text>')
    svg.append(
        f'<line x1="{lx+140}" y1="{ly-4}" x2="{lx+156}" y2="{ly-4}" '
        f'stroke="{KLEUR_GRENS}" stroke-width="1.5" stroke-dasharray="4 3"/>'
    )
    svg.append(f'<text x="{lx+160}" y="{ly}" font-size="10" fill="{KLEUR_SUBTEKS}">Provinsie grens</text>')
    svg.append(
        f'<rect x="{lx+270}" y="{ly-10}" width="12" height="12" '
        f'fill="{SONE_KLEURE[0][0]}" stroke="{SONE_KLEURE[0][1]}" stroke-width="0.5" rx="2"/>'
    )
    svg.append(f'<text x="{lx+286}" y="{ly}" font-size="10" fill="{KLEUR_SUBTEKS}">Munisipaliteit</text>')
    svg.append(
        f'<rect x="{lx+370}" y="{ly-10}" width="12" height="12" '
        f'fill="{BEEN_KLEURE[1][0]}" stroke="{BEEN_KLEURE[1][1]}" stroke-width="0.5" rx="2"/>'
    )
    svg.append(f'<text x="{lx+386}" y="{ly}" font-size="10" fill="{KLEUR_SUBTEKS}">Afstand tussen dorpe</text>')

    # ── Municipality zone strip (right margin, x=635–662) ─────────────────
    for sone in munisipaliteit_sones:
        y_van = y_van_km(sone["van_km"])
        y_tot = y_van_km(sone["tot_km"])
        hoogte_sone = y_tot - y_van
        if hoogte_sone < 2:
            continue
        if sone["kleur_indeks"] == -1:
            vul, teks_kleur = SONE_KLEUR_ONBEKEND
        else:
            vul, teks_kleur = SONE_KLEURE[sone["kleur_indeks"]]
        # Coloured rectangle
        svg.append(
            f'<rect x="{SONE_X1}" y="{y_van:.1f}" '
            f'width="{SONE_X2 - SONE_X1}" height="{hoogte_sone:.1f}" '
            f'fill="{vul}" stroke="{teks_kleur}" stroke-width="0.5" opacity="0.85" rx="2"/>'
        )
        # Vertical label inside strip (rotated), shown only if zone is tall enough
        if hoogte_sone >= 28:
            y_midden = (y_van + y_tot) / 2
            x_midden = (SONE_X1 + SONE_X2) / 2
            # ~4.6 px per 8 px glyph; trim so the rotated label stays inside its band
            kort = _esc(_verkort_muni(sone["naam"])[:int((hoogte_sone - 6) / 4.6)])
            svg.append(
                f'<text x="{x_midden:.1f}" y="{y_midden:.1f}" '
                f'text-anchor="middle" dominant-baseline="middle" '
                f'font-size="8" fill="{teks_kleur}" '
                f'transform="rotate(-90 {x_midden:.1f} {y_midden:.1f})">'
                f'{kort}</text>'
            )

    # ── Leg-distance strip (left margin, x=123–159) ──────────────────────
    # One band per leg — departure → town 1 → … → destination — with its edges
    # level with the dots and the leg's km centred in it.  Legs come from the
    # integer afstand_km values, so they always add up to the total.
    for van_km, tot_km, i in _bene(dorpe, totale_km):
        y_van, y_tot = y_van_km(van_km), y_van_km(tot_km)
        vul, rand, teks_kleur = BEEN_KLEURE[i % 2]
        svg.append(
            f'<rect x="{BEEN_X1}" y="{y_van:.1f}" width="{BEEN_X2 - BEEN_X1}" '
            f'height="{y_tot - y_van:.1f}" fill="{vul}" stroke="{rand}" stroke-width="0.5" rx="2"/>'
        )
        if y_tot - y_van >= 12:
            svg.append(
                f'<text x="{(BEEN_X1 + BEEN_X2) / 2:.1f}" y="{(y_van + y_tot) / 2:.1f}" '
                f'text-anchor="middle" dominant-baseline="middle" font-size="9" '
                f'font-weight="bold" fill="{teks_kleur}" {HALO}>{tot_km - van_km} km</text>'
            )

    # ── Province border lines (background) ────────────────────────────────
    for grens in grense:
        y = y_van_km(grens["afstand_km"])
        svg.append(
            f'<line x1="40" y1="{y:.1f}" x2="{breedte-40}" y2="{y:.1f}" '
            f'stroke="{KLEUR_GRENS}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>'
        )
        voor = _esc(grens["voor_provinsie"])
        na   = _esc(grens["na_provinsie"])
        # Both labels at the far left margin, clear of the right-aligned town labels;
        # 'voor' sits just above the border (in its province), 'na' just below it.
        svg.append(
            f'<text x="44" y="{y - 4:.1f}" text-anchor="start" '
            f'font-size="10" fill="{KLEUR_GRENS}" font-style="italic">{voor}</text>'
        )
        svg.append(
            f'<text x="44" y="{y + 13:.1f}" text-anchor="start" '
            f'font-size="10" fill="{KLEUR_GRENS}" font-style="italic">{na}</text>'
        )

    # ── River crossing ticks ───────────────────────────────────────────────
    rivier_y = [y_van_km(r["afstand_km"]) for r in riviere]
    rivier_lbl_y = _versprei(rivier_y, RIVIER_LABEL_SPASIE, y_begin, y_einde)
    for rivier, y, lbl_y in zip(riviere, rivier_y, rivier_lbl_y):
        svg.append(
            f'<line x1="{lyn_x - 28}" y1="{y:.1f}" x2="{lyn_x + 28}" y2="{y:.1f}" '
            f'stroke="{KLEUR_RIVIER}" stroke-width="1"/>'
        )
        if abs(lbl_y - y) > 2:
            svg.append(
                f'<line x1="{lyn_x + 28}" y1="{y:.1f}" x2="{lyn_x + 33}" y2="{lbl_y:.1f}" '
                f'stroke="{KLEUR_RIVIER}" stroke-width="0.5"/>'
            )
        svg.append(
            f'<text x="{lyn_x + 35}" y="{lbl_y:.1f}" text-anchor="start" dominant-baseline="middle" '
            f'font-size="8" fill="{KLEUR_RIVIER}" {HALO}>{_esc(pas_korreksies_toe(rivier["naam"]))}</text>'
        )

    # ── Road texture + main route line ────────────────────────────────────
    svg.append(
        f'<line x1="{lyn_x}" y1="{y_begin}" x2="{lyn_x}" y2="{y_einde}" '
        f'stroke="#ccc" stroke-width="10" stroke-dasharray="18 8"/>'
    )
    svg.append(
        f'<line x1="{lyn_x}" y1="{y_begin}" x2="{lyn_x}" y2="{y_einde}" '
        f'stroke="{KLEUR_ROETE}" stroke-width="3"/>'
    )

    # ── Departure dot (always left-side label) ────────────────────────────
    svg.append(
        f'<circle cx="{lyn_x}" cy="{y_begin}" r="14" '
        f'fill="{KLEUR_ROETE}" stroke="#fff" stroke-width="2"/>'
    )
    svg.append(_dorp_label(lyn_x, y_begin, vertrekpunt, 0))

    # ── Intermediate town dots (all labels on the left) ───────────────────
    # Labels are spread by _versprei and kept clear of the endpoint labels;
    # a thin leader line joins any label that had to move to its dot.
    dorp_y = [y_van_km(d["afstand_km"]) for d in dorpe]
    dorp_lbl_y = _versprei(dorp_y, DORP_LABEL_SPASIE,
                           y_begin + DORP_LABEL_SPASIE, y_einde - DORP_LABEL_SPASIE)
    for dorp, y, lbl_y in zip(dorpe, dorp_y, dorp_lbl_y):
        r = dorp["stip_radius"]
        svg.append(
            f'<circle cx="{lyn_x}" cy="{y:.1f}" r="{r}" '
            f'fill="{KLEUR_ROETE}" stroke="#fff" stroke-width="2"/>'
        )
        if abs(lbl_y - y) > 3:
            svg.append(
                f'<line x1="{lyn_x - r - 2}" y1="{y:.1f}" x2="{lyn_x - 18}" y2="{lbl_y:.1f}" '
                f'stroke="#999" stroke-width="0.75"/>'
            )
        svg.append(_dorp_label(lyn_x, lbl_y, pas_korreksies_toe(dorp["naam"]), dorp["afstand_km"]))

    # ── Destination dot (left-side label) ─────────────────────────────────
    svg.append(
        f'<circle cx="{lyn_x}" cy="{y_einde}" r="14" '
        f'fill="{KLEUR_ROETE}" stroke="#fff" stroke-width="2"/>'
    )
    svg.append(_dorp_label(lyn_x, y_einde, bestemming, totale_km))

    # ── Footer ────────────────────────────────────────────────────────────
    svg.append(
        f'<text x="{breedte//2}" y="{hoogte - 20}" text-anchor="middle" '
        f'font-size="10" fill="{KLEUR_VOETNOOT}">'
        f'Gegenereer deur Roete Oorsig \u2022 OpenStreetMap-data</text>'
    )

    svg.append('</svg>')
    return "\n".join(svg)


def _bene(dorpe, totale_km):
    """[(van_km, tot_km, indeks)] for each leg between consecutive stops."""
    stoppe = [0] + [d["afstand_km"] for d in dorpe] + [totale_km]
    return [(van, tot, i) for i, (van, tot) in enumerate(zip(stoppe, stoppe[1:])) if tot > van]


def _dorp_label(lyn_x, y, naam, afstand_km):
    """Two-line label (bold name above, km below), vertically centred on y."""
    return (
        f'<text x="{lyn_x - 20}" y="{y - 6:.1f}" text-anchor="end" dominant-baseline="middle" '
        f'font-size="13" font-weight="bold" fill="#111" {HALO}>{_esc(naam)}</text>\n'
        f'<text x="{lyn_x - 20}" y="{y + 9:.1f}" text-anchor="end" dominant-baseline="middle" '
        f'font-size="11" fill="#666" {HALO}>{afstand_km} km</text>'
    )


def _esc(text):
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
