#!/usr/bin/env python3
"""Opdrag 11c — build the final 25-type x 4-tier cat sprite set from the
user's NanoBanana reference sheet (Gemini_Generated_Image_jeth50jeth50jeth.png).

The sheet's own bronze/silver/gold cells turned out not to reliably match
their "normal" cell's coloring (independently-regenerated grid, common AI
sheet-consistency limitation) — so instead we extract 25 clean *normal*
(no-medal) cats from the sheet, normalize them onto a common canvas, and
composite our own necklace-and-pendant medal overlay (bronze/silver/gold,
matching the reference's collar+pendant style) for guaranteed color-correct
tiers. Types 1-11 (first 10 in CLAUDE.md's numeric order) keep the sheet's
natural fur colors; types 12-27 reuse a source cat's shape/shading but get a
hue-rotated "zany" coat, per the user's steer.

One-off generator, not run automatically. Usage:
    python3 tools/build_cat_sprites_from_ref.py
"""
import os
import colorsys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'Gemini_Generated_Image_jeth50jeth50jeth.png')
OUT_DIR = os.path.join(HERE, '..', 'assets', 'cats')

BG = (234, 244, 244)
TOL = 16
GROUP_W = 952 / 4.0
ROW_H = 821 / 9.0

UPSCALE = 4
CANVAS_W = 130 * UPSCALE
CANVAS_H = 115 * UPSCALE

# type_id -> (row, col, hue_shift_degrees or None)
# (row,col) picks a "normal"-pose cell from the reference grid (each group's
# left-hand cat is always the no-medal pose). hue None = keep native colors.
PICKS = {
    1:  (0, 0, None),
    2:  (0, 2, None),
    3:  (1, 0, None),
    4:  (4, 1, None),
    5:  (3, 3, None),
    6:  (3, 0, None),
    7:  (2, 2, None),
    8:  (5, 2, None),
    9:  (6, 1, None),
    11: (4, 3, None),
    12: (7, 1, 300),   # cotton candy pink
    13: (5, 1, 200),   # sky blue
    14: (7, 2, 265),   # lavender
    15: (3, 1, 150),   # mint green
    16: (6, 3, 45),    # sunshine yellow
    17: (8, 1, 350),   # coral red
    18: (5, 3, 180),   # turquoise
    19: (8, 2, 250),   # deep indigo
    20: (4, 0, 330),   # rose gold
    22: (1, 3, 95),    # lime green
    23: (7, 3, 320),   # magenta
    24: (8, 3, 270),   # cosmic purple
    25: (6, 0, 170),   # aqua teal (was 6,2 — too low-saturation a source to tint)
    26: (5, 0, 20),    # sunset orange (was 2,3 — near-neutral tuxedo, wouldn't tint)
    27: (8, 0, 355),   # ember red
}

TIER_COLORS = {
    'bronze': ('#cd7f32', '#7a4a1e', '#e8a866'),
    'silver': ('#c8c8c8', '#7d7d7d', '#f0f0f0'),
    'gold':   ('#ffd700', '#a37c00', '#fff2a6'),
}


def keyout_bg(img):
    arr = np.array(img.convert('RGBA'))
    mask = (
        (np.abs(arr[:, :, 0].astype(int) - BG[0]) <= TOL) &
        (np.abs(arr[:, :, 1].astype(int) - BG[1]) <= TOL) &
        (np.abs(arr[:, :, 2].astype(int) - BG[2]) <= TOL)
    )
    arr[mask, 3] = 0
    return Image.fromarray(arr, 'RGBA')


def keep_largest_component(img):
    arr = np.array(img)
    alpha = arr[:, :, 3] > 10
    structure = np.ones((3, 3), dtype=int)
    labeled, n = ndimage.label(alpha, structure=structure)
    if n <= 1:
        return img
    sizes = ndimage.sum(alpha, labeled, range(1, n + 1))
    biggest = np.argmax(sizes) + 1
    mask = labeled == biggest
    arr[~mask] = (0, 0, 0, 0)
    return Image.fromarray(arr, 'RGBA')


def trim(img, pad=2):
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad),
                      min(img.width, x1 + pad), min(img.height, y1 + pad)))


def extract_cell(sheet, row, col):
    # +11px skips the small bullet-dash the sheet prints just left of every
    # cat; without it, keep_largest_component sometimes keeps the dash too
    # (it anti-alias-bridges into a whisker in a few cells, e.g. row5/col1).
    x0 = col * GROUP_W + 11
    x1 = col * GROUP_W + 0.43 * GROUP_W
    y0 = max(0, row * ROW_H - 2)
    y1 = min(821, (row + 1) * ROW_H)
    cell = sheet.crop((int(x0), int(y0), int(x1), int(y1)))
    cell = keyout_bg(cell)
    cell = keep_largest_component(cell)
    cell = trim(cell)
    return cell


def normalize_and_upscale(cat):
    """Centre horizontally, bottom-align (cats stand on their shadow), onto a
    fixed native canvas, then nearest-neighbour upscale for crisp output."""
    native_w, native_h = 130, 115
    canvas = Image.new('RGBA', (native_w, native_h), (0, 0, 0, 0))
    x = (native_w - cat.width) // 2
    y = native_h - cat.height - 4
    canvas.paste(cat, (x, y), cat)
    return canvas.resize((CANVAS_W, CANVAS_H), Image.NEAREST)


def hue_shift(img, degrees, sat_boost=1.8):
    if degrees is None:
        return img
    arr = np.array(img.convert('RGBA')).astype(float) / 255.0
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    hsv = np.vectorize(colorsys.rgb_to_hsv)(r, g, b)
    h, s, v = hsv
    h = (h + degrees / 360.0) % 1.0
    # naturalistic source fur is fairly desaturated; the "zany" palette
    # needs a real saturation boost or a hue rotation just yields pale pastel.
    # Small additive floor too, so near-grey fur still picks up a visible
    # tint (true blacks/whites are unaffected since v swamps s there).
    s = np.clip(s * sat_boost + 0.12, 0, 0.85)
    rgb = np.vectorize(colorsys.hsv_to_rgb)(h, s, v)
    out = np.stack([rgb[0], rgb[1], rgb[2], a], axis=-1)
    out = (out * 255).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def draw_medal(img, tier_colors):
    img = img.copy()
    d = ImageDraw.Draw(img)
    main, dark, hi = [hexrgb(c) for c in tier_colors]
    w, h = img.size
    cx, cy = w * 0.5, h * 0.645
    r = w * 0.075
    # thin necklace chain draping down from the shoulders to the pendant
    d.line([(w * 0.34, h * 0.545), (cx, cy - r * 0.6)], fill=dark + (255,), width=max(2, int(w * 0.012)))
    d.line([(w * 0.66, h * 0.545), (cx, cy - r * 0.6)], fill=dark + (255,), width=max(2, int(w * 0.012)))
    # pendant: dark rim, main fill, small highlight cross
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=dark + (255,))
    d.ellipse([cx - r * 0.78, cy - r * 0.78, cx + r * 0.78, cy + r * 0.78], fill=main + (255,))
    hw = r * 0.14
    d.rectangle([cx - hw, cy - r * 0.4, cx + hw, cy + r * 0.4], fill=hi + (255,))
    d.rectangle([cx - r * 0.4, cy - hw, cx + r * 0.4, cy + hw], fill=hi + (255,))
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sheet = Image.open(SRC).convert('RGBA')
    count = 0
    for type_id, (row, col, hue) in PICKS.items():
        base = extract_cell(sheet, row, col)
        base = normalize_and_upscale(base)
        base = hue_shift(base, hue)
        tid = f"{type_id:02d}"
        base.save(os.path.join(OUT_DIR, f"type{tid}_normal.png"))
        count += 1
        for tier, colors in TIER_COLORS.items():
            medalled = draw_medal(base, colors)
            medalled.save(os.path.join(OUT_DIR, f"type{tid}_{tier}.png"))
            count += 1
    print(f"Wrote {count} sprites to {OUT_DIR}")


if __name__ == '__main__':
    main()
