"""Printable roadmap of the Kelpwoud: every named line up to move 10, with its moves.

Not part of the game: a study sheet for a first-time player. Two A4 landscape pages
(4...Bxb4 accepted; 4...Bb6 declined and the countergambits), drawn as SVG and printed
to PDF with headless Chrome.

    python3 tools/roadmap.py            # writes Evans_Padkaart.pdf next to CLAUDE.md
"""
import base64
import json
import subprocess
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_PLY = 20  # end of move 10
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

W, H = 297, 210          # page, mm
TOP, BOTTOM = 30, 186    # band for the tree
LEFT = 10
COL = 47.5               # column pitch
BOX_W = 42.5
BOX_H = 7.4

INK = '#1b1b2f'
TRUNK = '#f5a400'        # the shared start (4.b4, 4...Bxb4, 4...Bb6)
# One bright colour per branch, so a line is easy to follow across the page.
BRANCH = ['#ff6b00', '#1e88e5', '#e91e63', '#8e44ec', '#00a86b', '#00acc1', '#e53935']
GREY = '#8a8a99'


def tint(hex_, k):
    """Mix a colour with white: k=1 is the colour, k=0 is white."""
    r, g, b = (int(hex_[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02x%02x%02x' % tuple(round(255 - (255 - c) * k) for c in (r, g, b))


def colours(lines, kids, top_ids, xy):
    """Each node at layout depth 2 starts a branch (so do childless top lines); the trunk is amber."""
    col, i = {}, 0
    def paint(lid, c):
        col[lid] = c
        for k in kids.get(lid, []):
            if k in xy:
                paint(k, c)
    col['evans-gambit'] = TRUNK
    for t in top_ids:
        ch = [k for k in kids.get(t, []) if k in xy]
        if not ch:
            paint(t, BRANCH[i % len(BRANCH)]); i += 1
            continue
        col[t] = TRUNK
        for k in ch:
            paint(k, BRANCH[i % len(BRANCH)]); i += 1
    return col


def font_face(name, path, weight):
    data = base64.b64encode(path.read_bytes()).decode()
    return (f"@font-face{{font-family:'{name}';font-weight:{weight};"
            f"src:url(data:font/woff2;base64,{data}) format('woff2');}}")


def load():
    d = json.loads((ROOT / 'data/evans_canon_app.json').read_text())
    lines = {l['id']: l for l in d['lines']}
    kids = {}
    for l in d['lines']:
        if l['parent']:
            kids.setdefault(l['parent'], []).append(l['id'])
    return lines, kids


def frond(lines, lid):
    """The numbered moves from the parent's end to this line's end (cut at move 10)."""
    l = lines[lid]
    start = lines[l['parent']]['plies'] if l['parent'] else 0
    mv = l['movesNumbered'][start:min(l['plies'], MAX_PLY)]
    # "4.b4 4...Bxb4 5.c3" reads better as "4.b4 Bxb4 5.c3"; keep the number on a leading Black move.
    out = [m if i == 0 or '...' not in m else m.split('...')[1] for i, m in enumerate(mv)]
    return ' '.join(out)


def layout(lines, kids, top_ids):
    """Root at the left; each leaf gets a row; a parent sits beside the middle of its children."""
    rows, pos = [], {}

    def visit(lid, depth):
        ch = [c for c in kids.get(lid, []) if lines[c]['plies'] <= MAX_PLY]
        if not ch:
            rows.append(lid)
            pos[lid] = (depth, len(rows) - 1)
            return
        for c in ch:
            visit(c, depth + 1)
        ys = [pos[c][1] for c in ch]
        pos[lid] = (depth, (ys[0] + ys[-1]) / 2)

    for t in top_ids:
        visit(t, 1)
    ys = [pos[t][1] for t in top_ids]
    pos['evans-gambit'] = (0, (ys[0] + ys[-1]) / 2)
    n = len(rows)
    pitch = (BOTTOM - TOP) / max(n - 1, 1)
    return {lid: (LEFT + d * COL, TOP + r * pitch) for lid, (d, r) in pos.items()}


def page_svg(lines, kids, top_ids, title, subtitle, later):
    xy = layout(lines, kids, top_ids)
    col = colours(lines, kids, top_ids, xy)
    out = []
    # stipes first, so the bulbs sit on top
    for lid, (x, y) in xy.items():
        p = lines[lid]['parent']
        if lid == 'evans-gambit' or p not in xy:
            continue
        px, py = xy[p]
        x0, x1 = px + BOX_W, x
        mid = (x0 + x1) / 2
        famous = lines[lid]['famous']
        out.append(f'<path d="M{x0:.2f},{py:.2f} C{mid:.2f},{py:.2f} {mid:.2f},{y:.2f} {x1:.2f},{y:.2f}" '
                   f'fill="none" stroke="{col[lid]}" stroke-width="{1.2 if famous else 0.75}" stroke-linecap="round"/>')
    for lid, (x, y) in xy.items():
        l = lines[lid]
        reef, famous = l['reef'], l['famous']
        c = col[lid]
        fill = tint(c, 0.38 if famous else 0.13)
        dash = ' stroke-dasharray="1.4,0.8"' if reef else ''
        out.append(f'<rect x="{x:.2f}" y="{y - BOX_H / 2:.2f}" width="{BOX_W}" height="{BOX_H}" rx="3.2" '
                   f'fill="{fill}" stroke="{c}" stroke-width="{0.7 if famous or reef else 0.45}"{dash}/>')
        name = l['label'] + (' ★' if famous else '') + (' ⚠' if reef else '')
        size = 2.75 if len(name) <= 27 else 2.75 * 27 / len(name)
        out.append(f'<text x="{x + 2:.2f}" y="{y - 0.6:.2f}" class="name" font-size="{size:.2f}">{escape(name)}</text>')
        mv = frond(lines, lid)
        msize = 2.75 if len(mv) <= 30 else 2.75 * 30 / len(mv)
        out.append(f'<text x="{x + 2:.2f}" y="{y + 2.7:.2f}" class="moves" font-size="{msize:.2f}">{escape(mv)}</text>')

    head = (f'<text x="{LEFT}" y="13" class="title">{escape(title)}</text>'
            f'<text x="{LEFT}" y="20" class="sub">{escape(subtitle)}</text>'
            f'<text x="{W - LEFT}" y="13" class="sub" text-anchor="end">Kaptein Evans se Kelpwoud · Padkaart tot skuif 10</text>')
    legend_y = 194
    legend = (f'<rect x="{LEFT}" y="{legend_y - 2.6}" width="6" height="3.6" rx="1.4" fill="{tint(GREY, 0.38)}" stroke="{GREY}" stroke-width="0.7"/>'
              f'<text x="{LEFT + 8}" y="{legend_y}" class="legend">★ bekende lyn</text>'
              f'<rect x="{LEFT + 36}" y="{legend_y - 2.6}" width="6" height="3.6" rx="1.4" fill="{tint(GREY, 0.13)}" stroke="{GREY}" stroke-width="0.45"/>'
              f'<text x="{LEFT + 44}" y="{legend_y}" class="legend">ander lyn</text>'
              f'<rect x="{LEFT + 66}" y="{legend_y - 2.6}" width="6" height="3.6" rx="1.4" fill="{tint(GREY, 0.13)}" stroke="{GREY}" stroke-width="0.7" stroke-dasharray="1.4,0.8"/>'
              f'<text x="{LEFT + 74}" y="{legend_y}" class="legend">⚠ rif: teorie, maar riskant vir Wit</text>'
              f'<text x="{LEFT}" y="{legend_y + 5.5}" class="legend">Elke kleur is een tak. Lees van links na regs. Elke blokkie wys die skuiwe wat jy by die vorige blokkie moet voeg.</text>')
    if later:
        legend += (f'<text x="{LEFT}" y="{legend_y + 11}" class="legend" style="font-size:{min(3.1, 3.1 * 150 / len(later)):.2f}px">'
                   f'<tspan font-weight="700">Ná skuif 10 gaan die kaart nog verder: </tspan>{escape(later)}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">'
            + head + ''.join(out) + legend + '</svg>')


def later_note(lines, kids, top_ids):
    """Lines past move 10 in these subtrees: named once, in small print."""
    seen, stack = [], list(top_ids)
    while stack:
        lid = stack.pop(0)
        for c in kids.get(lid, []):
            stack.append(c)
            if lines[c]['plies'] > MAX_PLY:
                seen.append(f"{lines[c]['label']} ({lines[c]['sub']})")
    return ' · '.join(seen)


def main():
    lines, kids = load()
    node = ROOT / 'node_modules/@fontsource'
    css = (font_face('Rye', node / 'rye/files/rye-latin-400-normal.woff2', 400)
           + font_face('Zilla Slab', node / 'zilla-slab/files/zilla-slab-latin-400-normal.woff2', 400)
           + font_face('Zilla Slab', node / 'zilla-slab/files/zilla-slab-latin-700-normal.woff2', 700))
    css += f"""
@page {{ size: A4 landscape; margin: 0; }}
html, body {{ margin: 0; background: #fff; }}
svg {{ display: block; page-break-after: always; }}
svg:last-child {{ page-break-after: auto; }}
.title {{ font-family: 'Rye', serif; font-size: 7.5px; fill: {INK}; }}
.sub {{ font-family: 'Zilla Slab', serif; font-size: 3.6px; fill: #4d6b6e; }}
.name {{ font-family: 'Zilla Slab', serif; font-weight: 700; fill: {INK}; }}
.moves {{ font-family: 'Zilla Slab', serif; fill: #222; }}
.legend {{ font-family: 'Zilla Slab', serif; font-size: 3.1px; fill: #4d6b6e; }}
"""
    acc = ['evans-gambit-accepted']
    dec = [c for c in kids['evans-gambit'] if c not in acc]
    pages = [
        page_svg(lines, kids, acc, 'Swart vat die lokaas: 4...Bxb4',
                 'Begin altyd met 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4. Hier vat Swart die pion.',
                 later_note(lines, kids, acc)),
        page_svg(lines, kids, dec, 'Swart vat dit nie: 4...Bb6, 4...b5 en 4...d5',
                 'Dieselfde begin, maar Swart weier die pion of gooi self een terug (teengambiet).',
                 later_note(lines, kids, dec)),
    ]
    html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(pages)}</body></html>'
    tmp = ROOT / 'dist' / 'roadmap.html'
    tmp.parent.mkdir(exist_ok=True)
    tmp.write_text(html)
    out = ROOT / 'Evans_Padkaart.pdf'
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={out}', tmp.as_uri()], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(out)


if __name__ == '__main__':
    sys.exit(main())
