#!/usr/bin/env python3
"""Opdrag 11d — build the 25-type x 4-tier cat sprite set from a single
clean reference cat (New_Cat.png), rather than extracting from a multi-cat
grid sheet. The grid-sheet approach (Opdrag 11c) kept slicing through tails
that curled into the gap between neighboring cats — no fixed crop boundary
could avoid that. A single isolated cat has no neighbor to cut into, so this
is far more robust: same checker-background removal technique, but nothing
else to accidentally bleed in or slice.

Pipeline:
  1. Strip the baked-in checkerboard background (flood-fill from the image
     border over near-grey pixels — safe because the cat's black outline
     blocks the flood from leaking into the interior).
  2. Isolate the gold necklace (chest-band region + gold color threshold),
     dilate slightly for full coverage of its dark rim.
  3. "normal" tier = necklace region inpainted with the surrounding chest
     colour (flat-fill; it's a small patch, doesn't need to be exact).
  4. bronze/silver/gold = necklace pixels recoloured in place (hue/sat/value
     remap), preserving the original chain's shading/highlight pattern
     instead of redrawing it.
  5. Types 1-11 keep the source cat's natural cream fur (with small
     brightness/hue nudges for variety); types 12-27 get the fur hue-rotated
     + saturation-boosted into the "zany" palette. Necklace recolouring
     happens after fur hue-shifting so medal colours stay tier-correct
     regardless of coat colour.

One-off generator, not run automatically. Usage:
    python3 tools/build_cats_from_single.py
"""
import os
import colorsys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'New_Cat.png')
OUT_DIR = os.path.join(HERE, '..', 'assets', 'cats')

UPSCALE = 5


def strip_checker_background(im):
    arr = np.array(im.convert('RGBA')).astype(int)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    sat = maxc - minc
    is_greyish = (sat <= 10) & (maxc >= 195)
    labeled, n = ndimage.label(is_greyish, structure=np.ones((3, 3)))
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)
    bg_mask = np.isin(labeled, list(border_labels))
    arr[bg_mask, 3] = 0
    return arr  # int array, RGBA


def necklace_mask(arr):
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    sat = maxc - minc
    yy, xx = np.mgrid[0:h, 0:w]
    # chest band only — keeps this from also matching the (similarly warm-
    # toned) head/ear fur, which sits above this band.
    band = (yy >= 34) & (yy <= 75) & (xx >= 6) & (xx <= 74)
    is_gold = (a > 10) & (sat > 40) & (r > 145) & ((r.astype(int) - b.astype(int)) > 55) & band
    mask = ndimage.binary_dilation(is_gold, iterations=2)
    return mask


def chest_fill_color(arr, mask):
    h, w = arr.shape[:2]
    # sample a strip just above the necklace band as the fill colour
    strip = arr[28:33, 25:60, :3].reshape(-1, 3)
    return tuple(np.median(strip, axis=0).astype(int))


def inpaint_necklace(arr, mask, fill_rgb):
    out = arr.copy()
    out[mask, 0] = fill_rgb[0]
    out[mask, 1] = fill_rgb[1]
    out[mask, 2] = fill_rgb[2]
    return out


def recolor_region(arr, mask, target_hue_deg, sat_mult=1.0, val_mult=1.0):
    """Recolour only `mask` pixels: rotate hue to a fixed target (not a
    relative shift — the necklace's own hue varies pixel to pixel between
    highlight/shadow, so an absolute target keeps every tier internally
    consistent), scale saturation/value to taste, keep alpha untouched."""
    out = arr.copy().astype(float)
    sel = mask
    r, g, b = out[sel, 0] / 255, out[sel, 1] / 255, out[sel, 2] / 255
    hsv = np.array([colorsys.rgb_to_hsv(*px) for px in zip(r, g, b)])
    h, s, v = hsv[:, 0], hsv[:, 1], hsv[:, 2]
    h[:] = target_hue_deg / 360.0
    s = np.clip(s * sat_mult, 0, 1)
    v = np.clip(v * val_mult, 0, 1)
    rgb = np.array([colorsys.hsv_to_rgb(hh, ss, vv) for hh, ss, vv in zip(h, s, v)])
    out[sel, 0] = np.clip(rgb[:, 0] * 255, 0, 255)
    out[sel, 1] = np.clip(rgb[:, 1] * 255, 0, 255)
    out[sel, 2] = np.clip(rgb[:, 2] * 255, 0, 255)
    return out.astype(np.uint8)


def recolor_natural(arr, target_hue_deg, target_sat, value_mult, exclude_mask=None):
    """Gentle absolute-target recolor for the first-10 'natural' cats — sets
    saturation to a fixed low value and scales brightness, instead of the
    zany path's relative hue-rotate + saturation-boost (which reads as
    vivid/synthetic even for a small hue nudge)."""
    out = arr.astype(float)
    a = out[:, :, 3]
    apply = a > 10
    if exclude_mask is not None:
        apply = apply & ~exclude_mask
    r, g, b = out[apply, 0] / 255, out[apply, 1] / 255, out[apply, 2] / 255
    hsv = np.array([colorsys.rgb_to_hsv(*px) for px in zip(r, g, b)])
    h, s, v = hsv[:, 0], hsv[:, 1], hsv[:, 2]
    h[:] = target_hue_deg / 360.0
    s[:] = target_sat
    v = np.clip(v * value_mult, 0, 1)
    rgb = np.array([colorsys.hsv_to_rgb(hh, ss, vv) for hh, ss, vv in zip(h, s, v)])
    out[apply, 0] = np.clip(rgb[:, 0] * 255, 0, 255)
    out[apply, 1] = np.clip(rgb[:, 1] * 255, 0, 255)
    out[apply, 2] = np.clip(rgb[:, 2] * 255, 0, 255)
    return out.astype(np.uint8)


def hue_shift_fur(arr, degrees, sat_boost=1.7, exclude_mask=None):
    if degrees is None:
        return arr
    out = arr.astype(float)
    a = out[:, :, 3]
    apply = a > 10
    if exclude_mask is not None:
        apply = apply & ~exclude_mask
    r, g, b = out[apply, 0] / 255, out[apply, 1] / 255, out[apply, 2] / 255
    hsv = np.array([colorsys.rgb_to_hsv(*px) for px in zip(r, g, b)])
    h, s, v = hsv[:, 0], hsv[:, 1], hsv[:, 2]
    h = (h + degrees / 360.0) % 1.0
    s = np.clip(s * sat_boost + 0.10, 0, 0.85)
    rgb = np.array([colorsys.hsv_to_rgb(hh, ss, vv) for hh, ss, vv in zip(h, s, v)])
    out[apply, 0] = np.clip(rgb[:, 0] * 255, 0, 255)
    out[apply, 1] = np.clip(rgb[:, 1] * 255, 0, 255)
    out[apply, 2] = np.clip(rgb[:, 2] * 255, 0, 255)
    return out.astype(np.uint8)


TIER_HUE = {
    'bronze': (28, 1.1, 0.85),
    'silver': (0, 0.05, 0.92),  # near-zero sat -> grey; val<1 keeps shading (no white blowout)
    'gold':   (46, 1.15, 1.05),
}

# type_id -> None (native cream) | ('nat', hue_deg, sat, value_mult) | ('zany', hue_deg)
# First 10 (CLAUDE.md numeric order) = muted/realistic; 12-27 = vivid.
PALETTES = {
    1:  None,                          # native warm cream/tan
    2:  ('nat', 30, 0.12, 0.92),       # grey (near-neutral, cool-ish)
    3:  ('nat', 40, 0.10, 1.12),       # pale/white
    4:  ('nat', 25, 0.45, 0.55),       # chocolate brown
    5:  ('nat', 30, 0.55, 1.0),        # ginger/orange
    6:  None,                          # native cream (2nd)
    7:  ('nat', 40, 0.06, 0.32),       # black/charcoal
    8:  ('nat', 210, 0.16, 0.85),      # blue-grey
    9:  ('nat', 32, 0.42, 0.68),       # brown tabby
    11: ('nat', 42, 0.28, 0.8),        # caramel (calico stand-in)
    12: ('zany', 320), 13: ('zany', 205), 14: ('zany', 265), 15: ('zany', 150), 16: ('zany', 55),
    17: ('zany', 355), 18: ('zany', 180), 19: ('zany', 250), 20: ('zany', 335), 22: ('zany', 100),
    23: ('zany', 320), 24: ('zany', 275), 25: ('zany', 175), 26: ('zany', 15), 27: ('zany', 355),
}


def apply_palette(arr, palette, exclude_mask=None):
    if palette is None:
        return arr.copy()
    kind = palette[0]
    if kind == 'nat':
        _, hue, sat, val_mult = palette
        return recolor_natural(arr, hue, sat, val_mult, exclude_mask=exclude_mask)
    _, hue = palette
    return hue_shift_fur(arr, hue, exclude_mask=exclude_mask)


def upscale(arr):
    im = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return im.resize((im.width * UPSCALE, im.height * UPSCALE), Image.NEAREST)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = Image.open(SRC)
    clean = strip_checker_background(src)  # int array RGBA, necklace still gold
    mask = necklace_mask(clean)
    fill = chest_fill_color(clean, mask)
    normal_base = inpaint_necklace(clean, mask, fill)  # necklace removed, fur untouched

    count = 0
    for type_id, palette in PALETTES.items():
        tid = f"{type_id:02d}"
        fur_normal = apply_palette(normal_base, palette, exclude_mask=None)
        upscale(fur_normal).save(os.path.join(OUT_DIR, f"type{tid}_normal.png"))
        count += 1
        # tiers: same fur-recolored cat, but start from the pre-inpaint
        # image so the necklace's own shading detail is preserved, then
        # recolor ITS fur too (everything outside the necklace mask) and
        # recolour the necklace region to the tier colour separately.
        fur_tier_base = apply_palette(clean, palette, exclude_mask=mask)
        for tier, (hue_t, sat_mult, val_mult) in TIER_HUE.items():
            tier_img = recolor_region(fur_tier_base, mask, hue_t, sat_mult, val_mult)
            upscale(tier_img).save(os.path.join(OUT_DIR, f"type{tid}_{tier}.png"))
            count += 1
    print(f"Wrote {count} sprites to {OUT_DIR}")


if __name__ == '__main__':
    main()
