"""
Monochrome icons for historical sites, in a period road-map style.

Hand-drawn SVG on a 16 × 16 grid, drawn at ~14 px.  Each icon is a <symbol>
in the map's <defs> and placed with <use>.  IKONE is the one place that maps
icon types to their drawing and Afrikaans legend name (its order is the legend
order); ikoon_tipe() maps OSM tags to an icon type (Wikidata classes are mapped
in histories.WIKIDATA_KLASSE).
"""

KLEUR_HISTORIE = "#6e4b1f"   # brown, like the old road maps
_K = KLEUR_HISTORIE
_W = "#fff"

# type → (Afrikaans legend name, SVG body on a 16 × 16 grid)
IKONE = {
    # UNESCO World Heritage emblem, simplified: a square inside a circle
    "unesco": ("Wêrelderfenis (UNESCO)",
        f'<circle cx="8" cy="8" r="6.6" fill="none" stroke="{_K}" stroke-width="1.5"/>'
        f'<path d="M4.6 4.6 H11.4 V8.6 L8 11.6 L4.6 8.6 Z" fill="{_K}"/>'),
    "slagveld": ("Slagveld",
        f'<g stroke="{_K}" stroke-width="1.6" stroke-linecap="round" fill="none">'
        f'<path d="M3 3 L13 13 M13 3 L3 13"/>'
        f'<path d="M9.5 12.5 L12.5 9.5 M3.5 9.5 L6.5 12.5"/></g>'),
    "fort": ("Fort",
        f'<path d="M2 14.5 V6 H4 V3.5 H6 V6 H7 V3.5 H9 V6 H10 V3.5 H12 V6 H14 V14.5 Z" fill="{_K}"/>'
        f'<path d="M6.8 14.5 V11.5 A1.2 1.2 0 0 1 9.2 11.5 V14.5 Z" fill="{_W}"/>'),
    "monument": ("Monument",
        f'<path d="M8 1 L9.2 3 L10 12 H6 L6.8 3 Z" fill="{_K}"/>'
        f'<rect x="4.5" y="12" width="7" height="2.5" fill="{_K}"/>'),
    "kerk": ("Kerk",
        f'<path d="M8 0.5 V3.2 M6.8 1.5 H9.2" stroke="{_K}" stroke-width="1"/>'
        f'<path d="M5.5 14.5 V6.5 L8 3.8 L10.5 6.5 V14.5 Z M10.5 9.5 L12.8 7.5 L15 9.5 V14.5 H10.5 Z" fill="{_K}"/>'
        f'<path d="M7.2 14.5 V11.5 A0.8 0.8 0 0 1 8.8 11.5 V14.5 Z" fill="{_W}"/>'),
    "ruine": ("Ruïne",
        f'<path d="M5 13.5 V6.5 L6.5 4.5 L7.8 6 L9.5 3.2 L11 5 V13.5 Z" fill="{_K}"/>'
        f'<rect x="3.5" y="13.5" width="9" height="1.5" fill="{_K}"/>'
        f'<path d="M7 7 V13 M9 6.5 V13" stroke="{_W}" stroke-width="0.6"/>'
        f'<rect x="12.5" y="12" width="3" height="1.5" fill="{_K}"/>'),
    "argeologie": ("Rotskuns",
        f'<g fill="{_K}"><ellipse cx="8.5" cy="10.5" rx="3.4" ry="3.6"/>'
        f'<ellipse cx="5.8" cy="5.2" rx="1" ry="2.2" transform="rotate(-12 5.8 5.2)"/>'
        f'<ellipse cx="8" cy="4.2" rx="1" ry="2.4"/>'
        f'<ellipse cx="10.2" cy="4.7" rx="1" ry="2.3" transform="rotate(10 10.2 4.7)"/>'
        f'<ellipse cx="12.1" cy="6.6" rx="0.9" ry="1.9" transform="rotate(22 12.1 6.6)"/>'
        f'<ellipse cx="4.3" cy="10.2" rx="0.95" ry="2.1" transform="rotate(-50 4.3 10.2)"/></g>'),
    "grot": ("Grot",
        f'<path d="M0.8 14.5 Q3.5 3.5 8 3.5 Q12.5 3.5 15.2 14.5 Z" fill="{_K}"/>'
        f'<path d="M5 14.5 V11.2 A3 3 0 0 1 11 11.2 V14.5 Z" fill="{_W}"/>'),
    "museum": ("Museum",
        f'<path d="M1.5 6 L8 2 L14.5 6 Z" fill="{_K}"/>'
        f'<rect x="2" y="6.6" width="12" height="1.2" fill="{_K}"/>'
        + "".join(f'<rect x="{x}" y="8.4" width="1.4" height="4.2" fill="{_K}"/>'
                  for x in (2.9, 5.8, 8.8, 11.7))
        + f'<rect x="1.5" y="13" width="13" height="1.5" fill="{_K}"/>'),
    "gebou": ("Ou gebou",
        f'<path d="M1.8 8 L8 2.5 L14.2 8 H12.5 V14.5 H3.5 V8 Z" fill="{_K}"/>'
        f'<rect x="7" y="10.5" width="2" height="4" fill="{_W}"/>'),
    "korbeelhuis": ("Korbeelhuis",
        f'<path d="M2.5 14.5 C2.5 6 5 2 8 2 C11 2 13.5 6 13.5 14.5 Z" fill="{_K}"/>'
        f'<path d="M6.9 14.5 V11.5 A1.1 1.1 0 0 1 9.1 11.5 V14.5 Z" fill="{_W}"/>'),
    "graf": ("Graf",
        f'<path d="M4.5 13.5 V6 A3.5 3.5 0 0 1 11.5 6 V13.5 Z" fill="{_K}"/>'
        f'<rect x="2.5" y="13.5" width="11" height="1.5" fill="{_K}"/>'
        f'<path d="M8 5.5 V10.5 M6.5 7 H9.5" stroke="{_W}" stroke-width="1"/>'),
    "myn": ("Myn",
        f'<g stroke="{_K}" stroke-width="1.4" stroke-linecap="round" fill="none">'
        f'<path d="M3 13 L11 5"/><path d="M8.2 2.2 Q12.8 2.2 13.8 6.8"/>'
        f'<path d="M4 4 L10.5 10.5"/><path d="M2.8 5.2 L5.2 2.8"/></g>'
        f'<path d="M9.6 11.8 L11.8 9.6 L14.6 12.4 L12.4 14.6 Z" fill="{_K}"/>'),
    "spoorweg": ("Spoorweg",
        f'<g fill="{_K}"><rect x="2" y="7" width="8.5" height="4"/>'
        f'<rect x="10" y="3.5" width="4.5" height="7.5"/><rect x="3.3" y="4" width="2" height="3"/>'
        f'<path d="M2 11 L0.6 13.5 H2.5 Z"/>'
        f'<circle cx="4.3" cy="12.6" r="1.7"/><circle cx="8.3" cy="12.6" r="1.7"/>'
        f'<circle cx="12.3" cy="12.6" r="1.7"/></g>'
        f'<rect x="11.2" y="4.7" width="2.1" height="2.3" fill="{_W}"/>'),
    "ster": ("Bekende plek",
        f'<path d="M8 1.2 L9.9 5.9 L14.9 6.2 L11 9.4 L12.3 14.3 L8 11.6 L3.7 14.3 '
        f'L5 9.4 L1.1 6.2 L6.1 5.9 Z" fill="{_K}"/>'),
}

# historic=* value → icon type
_HISTORIC = {
    "battlefield": "slagveld",
    "fort": "fort", "castle": "fort", "city_gate": "fort", "citywalls": "fort",
    "monument": "monument", "memorial": "monument",
    "church": "kerk", "chapel": "kerk", "monastery": "kerk", "wayside_chapel": "kerk",
    "ruins": "ruine",
    "archaeological_site": "argeologie", "rock_art": "argeologie", "petroglyph": "argeologie",
    "building": "gebou", "house": "gebou", "manor": "gebou", "farm": "gebou", "mansion": "gebou",
    "tomb": "graf", "grave": "graf", "grave_yard": "graf", "cemetery": "graf",
    "mine": "myn", "mine_shaft": "myn", "mine_adit": "myn",
    "railway": "spoorweg", "locomotive": "spoorweg", "railway_car": "spoorweg",
    "railway_station": "spoorweg",
}


def ikoon_vir_naam(naam):
    """An icon type the name alone gives away (Karoo corbelled houses), or None."""
    naam = naam.lower()
    return "korbeelhuis" if "korbeel" in naam or "corbel" in naam else None


def ikoon_tipe(tags):
    """The icon type for a site's OSM tags; "ster" if nothing more specific fits."""
    naam = " ".join(tags.get(k, "") for k in ("name", "name:af", "name:en"))
    historic = tags.get("historic", "")
    if ikoon_vir_naam(naam) or tags.get("building") == "corbelled":
        return "korbeelhuis"
    if historic == "memorial" and tags.get("memorial") in ("grave", "tomb"):
        return "graf"
    if historic in _HISTORIC:
        return _HISTORIC[historic]
    if tags.get("amenity") == "place_of_worship" or tags.get("building") in ("church", "chapel"):
        return "kerk"
    return "ster"


def ikoon_defs(tipes):
    """<symbol> definitions for the given icon types."""
    return "".join(f'<symbol id="ikoon-{t}" viewBox="0 0 16 16">{IKONE[t][1]}</symbol>'
                   for t in sorted(tipes))


def gebruik_ikoon(tipe, x, y, grootte=14):
    """Place an icon centred on (x, y)."""
    return (f'<use href="#ikoon-{tipe}" x="{x - grootte / 2:.1f}" '
            f'y="{y - grootte / 2:.1f}" width="{grootte}" height="{grootte}"/>')
