#!/usr/bin/env python3
"""Opdrag 11b — extract the 9 clean cat identities x 4 tiers (normal/bronze/
silver/gold) out of the user's NanoBanana reference sheet
(Gemini_Generated_Image_jeth50jeth50jeth.png), chroma-key the flat background
to transparent, and auto-trim each to its own bounding box.

One-off extractor, not run automatically. Usage:
    python3 tools/extract_cat_reference.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'Gemini_Generated_Image_jeth50jeth50jeth.png')
OUT_DIR = os.path.join(HERE, '..', 'assets', 'cats_ref')

BG = (234, 244, 244)
TOL = 16

GROUP_W = 952 / 4.0
ROW_H = 821 / 9.0
ROW_PAD_TOP = 2
ROW_PAD_BOTTOM = 0

TIER_SLICES = {
    # tier -> (group_index, x_frac_start, x_frac_end)
    'normal': (0, 0.0, 0.43),
    'bronze': (1, 0.46, 1.0),
    'silver': (2, 0.46, 1.0),
    'gold':   (3, 0.46, 1.0),
}


def keyout_bg(img):
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - BG[0]) <= TOL and abs(g - BG[1]) <= TOL and abs(b - BG[2]) <= TOL:
                px[x, y] = (r, g, b, 0)
    return img


def keep_largest_component(img):
    """Drop disconnected specks (stray arrow dashes, divider fragments) that
    survive chroma-keying — keep only the largest alpha-connected blob (the
    cat + its shadow, which touch)."""
    arr = np.array(img)
    alpha = arr[:, :, 3] > 10
    structure = np.ones((3, 3), dtype=int)  # 8-connectivity
    labeled, n = ndimage.label(alpha, structure=structure)
    if n <= 1:
        return img
    sizes = ndimage.sum(alpha, labeled, range(1, n + 1))
    biggest = np.argmax(sizes) + 1
    mask = labeled == biggest
    arr[~mask] = (0, 0, 0, 0)
    return Image.fromarray(arr, 'RGBA')


def trim(img, pad=3):
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sheet = Image.open(SRC).convert('RGBA')
    count = 0
    for row in range(9):
        y0 = max(0, row * ROW_H - ROW_PAD_TOP)
        y1 = min(821, (row + 1) * ROW_H + ROW_PAD_BOTTOM)
        for tier, (g, fx0, fx1) in TIER_SLICES.items():
            x0 = g * GROUP_W + fx0 * GROUP_W
            x1 = g * GROUP_W + fx1 * GROUP_W
            cell = sheet.crop((int(x0), int(y0), int(x1), int(y1)))
            cell = keyout_bg(cell)
            cell = keep_largest_component(cell)
            cell = trim(cell)
            out_path = os.path.join(OUT_DIR, f"ref_row{row}_{tier}.png")
            cell.save(out_path)
            count += 1
    print(f"Wrote {count} crops to {OUT_DIR}")


if __name__ == '__main__':
    main()
