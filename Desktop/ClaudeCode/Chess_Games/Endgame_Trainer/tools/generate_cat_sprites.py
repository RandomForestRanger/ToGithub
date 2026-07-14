#!/usr/bin/env python3
"""Opdrag 11 — badge-mascot cats. Generates 25 types x 4 tiers (normal/bronze/
silver/gold) of a parameterized pixel-art sitting cat as transparent PNGs into
assets/cats/. One shared sprite template (grid + mirrored half-body), 25
distinct fur palettes swapped in. Not run automatically; a one-off asset
generator like tools/generate_type*.py.

Usage: python3 tools/generate_cat_sprites.py
"""
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cats')

PX = 12
CANVAS_W = 32
CANVAS_H = 24
X_OFF = 7
MIRROR_SPAN = 18

# 10 chars per row = half-body index 0..9 (0 = outer edge, 9 = center seam).
# left_col = X_OFF + i, right_col = X_OFF + MIRROR_SPAN - i (i=9 -> shared centre column).
HALF_ROWS = [
    "...e......",  # r0  ear tip
    "..eee.....",  # r1
    ".eepe.....",  # r2
    ".eepee....",  # r3
    "eeepeeef..",  # r4  ear base -> head
    ".ffffffff.",  # r5  head top
    "ffffffffff",  # r6  head widest
    "ffffffooof",  # r7  eyes (white)
    "ffffffokof",  # r8  eye pupils (centred)
    "ffffwwwwww",  # r9  muzzle starts
    "fffwwwwwwn",  # r10 nose (shared centre column)
    "fffwwwwwwk",  # r11 chin + mouth dot
    "fwwwwwwwww",  # r12 head/body seam, chest white
    "ffswwwwwww",  # r13 body, side shade stripe
    "ffswwwwwww",  # r14
    "fsswwwwwww",  # r15
    "fsswwwwwww",  # r16
    "fswwwwwwww",  # r17
    "fswwwwwwww",  # r18
    ".wwwwwwwww",  # r19 lower belly
    ".fwwwwww..",  # r20 paws / body rounding in
    "..ffwwff..",  # r21 feet
]

TAIL = [
    (13, 25, 27, 'f'), (14, 26, 28, 'f'), (15, 26, 28, 'f'), (16, 25, 27, 'f'),
    (12, 27, 29, 'f'), (11, 28, 30, 'f'), (10, 28, 30, 'f'), (9, 27, 29, 'f'),
    (8, 26, 28, 's'), (7, 25, 27, 's'),
]

WHISKERS = [
    (9, 3, 'k'), (9, 4, 'k'), (11, 1, 'k'), (11, 2, 'k'),
    (9, 27, 'k'), (9, 28, 'k'), (11, 29, 'k'), (11, 30, 'k'),
]

MEDAL_RING = [
    "..mmm..",
    ".mMMMm.",
    "mMMhMMm",
    "mMhhhMm",
    "mMMhMMm",
    ".mMMMm.",
    "..mmm..",
]
RIBBON = [(11, 13, 'r'), (11, 18, 'r'), (12, 13, 'r'), (12, 18, 'r')]

TIER_COLORS = {
    'normal': None,
    'bronze': ('#cd7f32', '#7a4a1e', '#e8a866'),
    'silver': ('#c8c8c8', '#7d7d7d', '#f0f0f0'),
    'gold':   ('#ffd700', '#a37c00', '#fff2a6'),
}

# type_id -> (name, palette). Order matches CLAUDE.md's ENDGAME_TYPES table
# (numeric id order, which already skips retired 10/21). First 10 = natural
# cat colours; the rest get zanier fur once the curriculum earns it.
CAT_PALETTES = {
    1:  ("Kolskop",     dict(e='#242427', p='#d99aa3', f='#3a3a3f', s='#1c1c1e', w='#e8e6e1', n='#d99aa3')),   # charcoal black
    2:  ("Sneeu",       dict(e='#dedad2', p='#e8b4b8', f='#f5f4f0', s='#b8b4ab', w='#ffffff', n='#e8a0a8')),   # snow white
    3:  ("Vaal",        dict(e='#5b5b63', p='#e8b4b8', f='#8a8a92', s='#4d4d54', w='#f4f2ee', n='#e08a9c')),   # silver-grey tabby
    4:  ("Sjoklad",     dict(e='#4a3123', p='#d9a68c', f='#6b4a35', s='#3c2718', w='#efe3d3', n='#c98060')),   # chocolate brown
    5:  ("Rooikop",     dict(e='#b56a28', p='#f0c896', f='#e08a3c', s='#c47530', w='#fff3e0', n='#e8946a')),   # ginger tabby
    6:  ("Vanielje",    dict(e='#c9a96e', p='#f0dcb8', f='#e8cfa0', s='#b8935a', w='#fff8ec', n='#e0a898')),   # cream/tan
    7:  ("Frak",        dict(e='#2b2b2e', p='#d9a6ac', f='#2b2b2e', s='#1a1a1c', w='#ffffff', n='#d9a6ac')),   # tuxedo black+white
    8:  ("Storm",       dict(e='#57626e', p='#dce4ea', f='#7d8b99', s='#48525c', w='#f5f7f8', n='#c9b8ba')),   # blue-grey bicolor
    9:  ("Kaneel",      dict(e='#6e4f34', p='#e0c2a0', f='#9c7350', s='#5a3f29', w='#f2e6d3', n='#c9967a')),   # brown tabby
    11: ("Lapkat",      dict(e='#d98c3f', p='#f0c896', f='#f2efe8', s='#2b2b2e', w='#ffffff', n='#e8b4b8')),   # calico patches
    12: ("Waterlelie",  dict(e='#d97fa8', p='#ffe0ee', f='#f2a6c6', s='#c2618c', w='#fff0f6', n='#e85f8f')),   # cotton candy pink
    13: ("Lugblou",     dict(e='#4a9ec2', p='#dff5ff', f='#7ec8e3', s='#3a82a3', w='#eaf8ff', n='#3a82a3')),   # sky blue
    14: ("Lafendel",    dict(e='#8a6fc2', p='#ece0ff', f='#b19cd9', s='#6f52a8', w='#f3ecff', n='#6f52a8')),   # lavender
    15: ("Muntjie",     dict(e='#5cbd9a', p='#e0fff2', f='#8fe0c0', s='#469b7c', w='#eafff6', n='#469b7c')),   # mint green
    16: ("Sonnetjie",   dict(e='#d9b82e', p='#fff6d0', f='#f7d94c', s='#bfa021', w='#fff9e0', n='#e08a3c')),   # sunshine yellow
    17: ("Koraal",      dict(e='#d94a3a', p='#ffd9d0', f='#f26b5b', s='#b83a2c', w='#fff0ec', n='#b83a2c')),   # coral red
    18: ("Tirkis",      dict(e='#2a9ba3', p='#dcfffb', f='#3fc1c9', s='#1f7d84', w='#e6ffff', n='#1f7d84')),   # turquoise
    19: ("Nagblou",     dict(e='#34327a', p='#d6d6ff', f='#4b4a9e', s='#262463', w='#e6e6ff', n='#8a88d0')),   # deep indigo
    20: ("Rosgoud",     dict(e='#c98f78', p='#ffe8dc', f='#e8b4a0', s='#b07660', w='#fff2ec', n='#b07660')),   # rose gold
    22: ("Lemmetjie",   dict(e='#84b52e', p='#f0ffd0', f='#a6d94a', s='#6c9621', w='#f5ffe0', n='#6c9621')),   # lime green
    23: ("Fuksia",      dict(e='#b32e7d', p='#ffd6ee', f='#d94ea0', s='#932566', w='#ffe6f5', n='#932566')),   # magenta
    24: ("Sterrestof",  dict(e='#3f3277', p='#dcd6ff', f='#5b4a9e', s='#2e255e', w='#e0defd', n='#8a7fd0')),   # cosmic purple
    25: ("Lagoen",      dict(e='#2c8580', p='#d6fffa', f='#3fa9a3', s='#216863', w='#e6fffb', n='#216863')),   # aqua teal
    26: ("Sonsonder",   dict(e='#d9603a', p='#ffe0d0', f='#f2825a', s='#b84a2a', w='#fff0e6', n='#b84a2a')),   # sunset orange-pink
    27: ("Robyn",       dict(e='#9c2620', p='#ffd6d0', f='#c9382e', s='#7a1c17', w='#ffe6e3', n='#7a1c17')),   # ember red
}
COMMON = dict(o='#ffffff', k='#1a1a1a')


def build_base_grid():
    grid = [[None] * CANVAS_W for _ in range(CANVAS_H)]
    for r, row in enumerate(HALF_ROWS):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            grid[r][X_OFF + i] = ch
            grid[r][X_OFF + MIRROR_SPAN - i] = ch
    for row, c0, c1, ch in TAIL:
        for c in range(c0, c1 + 1):
            grid[row][c] = ch
    for row, col, ch in WHISKERS:
        grid[row][col] = ch
    return grid


def add_medal(grid, tier_colors):
    main, dark, hi = tier_colors
    medal_palette = {'m': dark, 'M': main, 'h': hi, 'r': dark}
    for rr, row in enumerate(MEDAL_RING):
        for cc, ch in enumerate(row):
            if ch == '.':
                continue
            grid[13 + rr][11 + cc] = ('MEDAL', ch)
    for row, col, ch in RIBBON:
        grid[row][col] = ('MEDAL', ch)
    return medal_palette


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def render(grid, palette, medal_palette, out_path):
    img = Image.new('RGBA', (CANVAS_W * PX, (CANVAS_H + 3) * PX), (0, 0, 0, 0))
    shadow_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow_layer)
    d.ellipse(
        [(X_OFF - 2) * PX, (CANVAS_H - 1) * PX, (X_OFF + MIRROR_SPAN + 2) * PX, (CANVAS_H + 2) * PX],
        fill=(0, 0, 0, 70),
    )
    img = Image.alpha_composite(img, shadow_layer)
    px = img.load()
    for r, row in enumerate(grid):
        for c, cell in enumerate(row):
            if cell is None:
                continue
            if isinstance(cell, tuple):
                hexcol = medal_palette[cell[1]]
            else:
                hexcol = palette[cell]
            rgb = hexrgb(hexcol) + (255,)
            for yy in range(PX):
                for xx in range(PX):
                    px[c * PX + xx, r * PX + yy] = rgb
    img.save(out_path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    count = 0
    for type_id, (name, coat) in CAT_PALETTES.items():
        palette = dict(coat)
        palette.update(COMMON)
        for tier, colors in TIER_COLORS.items():
            grid = build_base_grid()
            medal_palette = {}
            if colors:
                medal_palette = add_medal(grid, colors)
            out_path = os.path.join(OUT_DIR, f"type{type_id:02d}_{tier}.png")
            render(grid, palette, medal_palette, out_path)
            count += 1
    print(f"Wrote {count} sprites to {OUT_DIR}")


if __name__ == '__main__':
    main()
