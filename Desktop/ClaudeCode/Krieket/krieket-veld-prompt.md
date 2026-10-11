# Claude Code Prompt: Afrikaanse Krieketveld Diagram (Dubbel)

## Doel / Purpose
Build a single self-contained `krieket-veld.html` file — no external dependencies, no CDN links — that displays **two** cricket field diagrams stacked vertically on the same page, for use as a **school educational resource**. Everything must work when opened directly in a browser offline.

---

## Output File
- **Filename:** `krieket-veld.html`
- **Language:** Afrikaans labels, English in brackets
- **Audience:** School learners (clean, clear, readable)

---

## Page Layout

- White page background
- Page title at top: **"Krieketveldbeplanning"**
- Subtitle: **"Veldwerkposisies — Regshandig & Linkshandig"**
- Below the subtitle, a thin dark green horizontal rule
- Attribution note in italic grey: *"Gebaseer op die FAK Krieketterme-publikasie (2021)"*
- Below the header: the **two SVG diagrams stacked vertically** (right-handed first), each with its own sub-heading
- Below both diagrams: **one shared numbered legend table** covering all 16 positions
- Footer at the very bottom of the page

### Two-Diagram Layout
Use a `display: flex; flex-direction: column; align-items: center; gap: 32px;` container. Order: right-handed diagram first, left-handed second.

Each diagram is wrapped in a `<div>` with:
- Sub-heading above the SVG:
  - First diagram: **"Regshandige Kolwer / Right-Handed Batsman"**
  - Second diagram: **"Linkshandige Kolwer / Left-Handed Batsman"**
- Sub-heading style: font-size 15px, bold, dark green, centred, margin-bottom 4px
- A small note below each sub-heading in italic grey, font-size 12px:
  - First: *"Bouler onderkant ↑ | Wegkant = links | Bykant = regs"*
  - Second: *"Bouler onderkant ↑ | Wegkant = regs | Bykant = links"*

---

## Visual Design (applies to both SVGs)

### The Cricket Oval (SVG)
- Each SVG: `viewBox="0 0 600 620"`, `width="100%"`, `max-width="520px"`
- **Outer oval:** very light green fill (`#dff5d8`), stroke `#1a4a1a`, stroke-width 3. Draw using an SVG `<ellipse>` centred at `300, 310`, `rx=270`, `ry=290`
- **30-yard restriction ring:** dashed dark green circle, `cx=300 cy=310 r=150`, stroke `#2d6a2d`, stroke-width 1.5, stroke-dasharray="6,4", fill none
- **Pitch:** rectangle centred at `300, 310`, width=12px, height=90px, fill `#c8a96e`, rx=1
- **Stumps (both ends):**
  - Top stumps (batsman's end): three thin vertical lines at x=295, 300, 305; from y=255 to y=265. A horizontal bail line across the top at y=255
  - Bottom stumps (bowler's end): same x positions; from y=355 to y=365. A horizontal bail line across the top at y=355
  - Colour: `#5a3a1a` (dark brown)
- **Crease lines:** thin dark green (`#2d6a2d`) horizontal lines (width=24px) across the pitch:
  - Top crease: y=267, centred at x=300
  - Bottom crease: y=353, centred at x=300
- **Batsman indicator:** small white circle (r=6, fill white, stroke `#1a4a1a`) at `300, 278` — on the pitch, just in front of the top crease (never behind the stumps). Label **"Kolwer"** in `#1a4a1a`, font-size 10px, to the right of the marker (x=312, y=282, start-anchored)
- **Bowler indicator:** small grey circle (r=5, fill `#888888`) at `300, 390`, with label **"Bouler ↑"** in `#1a4a1a`, font-size 10px, centred below

### Colour Scheme
- Field: `#dff5d8` (light, so it prints well), outline `#1a4a1a`
- Pitch: `#c8a96e`
- Position markers: white filled circle (r=10), dark green stroke (stroke-width=2), position number in black bold font-size 10px
- Position labels: black, Arial/sans-serif, with a field-coloured halo so lines never cut through text: `paint-order: stroke; stroke: #dff5d8; stroke-width: 3px; stroke-linejoin: round;` (apply via a `.lbl` class on label `<text>` elements, also on the Kolwer/Bouler labels)
- 30-yard ring: dark green dashed

---

## Fielding Positions

### Important Orientation Rule
- **Batsman is at the TOP** of both diagrams, wicket-keeper behind (above) them
- **Bowler is at the BOTTOM** of both diagrams — i.e. the familiar TV view from behind the bowler
- For a **right-handed** batsman: **off side = LEFT**, **leg side = RIGHT**
- ⚠️ This pairing only holds with the batsman at the top. With the bowler at the top (view from behind the batsman) a right-hander's off side would be on the RIGHT — an earlier version of this prompt got this wrong
- For a **left-handed** batsman: **off side = RIGHT**, **leg side = LEFT**
- The left-handed positions are the **exact mirror image** of the right-handed positions (mirror axis: x=300)

---

### Diagram 1: Regshandige Kolwer (Right-Handed Batsman)
SVG viewBox `0 0 600 620`, oval centred at `300, 310`

| # | Afrikaans | English | x | y | Label |
|---|-----------|---------|---|---|-------|
| 1 | Paaltjiewagter | Wicket-keeper | 300 | 190 | above |
| 2 | Eerste Glip | First Slip | 242 | 202 | upper-left |
| 3 | Tweede Glip | Second Slip | 212 | 220 | left |
| 4 | Gang(etjie) | Gully | 185 | 248 | left |
| 5 | Punt | Point | 160 | 282 | right |
| 6 | Dekpunt | Cover Point | 158 | 368 | right |
| 7 | Halfweg | Mid-Off | 240 | 450 | below |
| 8 | Halfby | Mid-On | 360 | 450 | below |
| 9 | Regby | Square Leg | 440 | 282 | left |
| 10 | Kortby | Short Leg | 350 | 230 | above |
| 11 | Derdeman | Third Man | 225 | 110 | below |
| 12 | Skerpby | Fine Leg | 385 | 105 | below |
| 13 | Diep Regby | Deep Square Leg | 512 | 290 | below |
| 14 | Diepby | Long-On | 385 | 530 | above |
| 15 | Diepweg | Long-Off | 210 | 530 | above |
| 16 | Diep Dekpunt | Deep Cover | 92 | 392 | lower-right |

---

### Diagram 2: Linkshandige Kolwer (Left-Handed Batsman)
Mirror of Diagram 1 — all x-coordinates reflected around x=300 (new_x = 600 − old_x):

| # | Afrikaans | English | x | y | Label |
|---|-----------|---------|---|---|-------|
| 1 | Paaltjiewagter | Wicket-keeper | 300 | 190 | above |
| 2 | Eerste Glip | First Slip | 358 | 202 | upper-right |
| 3 | Tweede Glip | Second Slip | 388 | 220 | right |
| 4 | Gang(etjie) | Gully | 415 | 248 | right |
| 5 | Punt | Point | 440 | 282 | left |
| 6 | Dekpunt | Cover Point | 442 | 368 | left |
| 7 | Halfweg | Mid-Off | 360 | 450 | below |
| 8 | Halfby | Mid-On | 240 | 450 | below |
| 9 | Regby | Square Leg | 160 | 282 | right |
| 10 | Kortby | Short Leg | 250 | 230 | above |
| 11 | Derdeman | Third Man | 375 | 110 | below |
| 12 | Skerpby | Fine Leg | 215 | 105 | below |
| 13 | Diep Regby | Deep Square Leg | 88 | 290 | below |
| 14 | Diepby | Long-On | 215 | 530 | above |
| 15 | Diepweg | Long-Off | 390 | 530 | above |
| 16 | Diep Dekpunt | Deep Cover | 508 | 392 | lower-left |

---

### Position Marker Rendering (both diagrams)
For each position:
1. Draw a filled white circle `r=10` at the given coordinates, `stroke="#1a4a1a"` `stroke-width=2`
2. Centred inside: position number, `fill="#1a4a1a"`, bold, `font-size=10px`
3. Label text adjacent to the marker, placed as given in the **Label** column (the left-handed column is the mirror). Offsets from the marker centre (cx, cy):
   - above: middle-anchored at cx, lines at cy−24 / cy−13
   - below: middle-anchored at cx, lines at cy+22 / cy+33
   - left / right: end-/start-anchored at cx∓14 / cx+14, lines at cy−4 / cy+7
   - upper-left / upper-right: as left/right, lines at cy−16 / cy−5
   - lower-left / lower-right: as left/right, lines at cy+10 / cy+21
   - Labels must not overlap any marker or other label
4. Label line 1: Afrikaans name, black, font-size 10px, bold
5. Label line 2: *(English)*, black, font-size 9px, italic
6. Both lines: class `lbl` (field-coloured halo, see Colour Scheme)

---

## Shared Legend Table

Below the two diagrams, render **one** shared HTML table:

- Heading: **"Sleutel / Key — Alle 16 Veldwerkposisies"**, dark green, bold, font-size 16px, centred
- Note above the table in italic grey, font-size 12px (use a closing apostrophe ’ / `&rsquo;` in “’n”): *"Posisies wissel na die teenoorgestelde kant vir ’n linkshandige kolwer. / Positions mirror to the opposite side for a left-handed batsman."*
- Three columns: **Nr** | **Afrikaans** | **Engels (English)**
- Alternating row shading: white / `#eaf4ea`
- Table border: `1px solid #2d6a2d`
- Font: Arial, 13px
- Header row: `#1a4a1a` background, white text
- Max-width 600px, centred on page, margin-top 32px

---

## Page Header

```
KRIEKETVELDBEPLANNING
Veldwerkposisies — Regshandig & Linkshandig
```

- Title: font-size 28px, bold, `#1a4a1a`, centred
- Subtitle: font-size 15px, normal, `#1a4a1a`, centred
- HR: `border: 1px solid #2d6a2d`, width 60%, centred, margin 12px auto
- Attribution: *"Gebaseer op die FAK Krieketterme-publikasie (2021)"*, italic, `#888`, font-size 12px, centred, margin-bottom 24px

---

## Footer

- Text: *"Veldposisies gebaseer op die FAK Krieketterme-publikasie. Alle terme is goedgekeurde Afrikaanse krieketterminologie."*
- Font-size: 11px, `#888`, centred
- Margin-top: 32px, padding-bottom: 16px

---

## Technical Requirements

- **Single file:** All CSS inline — no `<link>` tags, no `<script src>` tags
- **No JavaScript** — fully static
- **Valid HTML5** with `<!DOCTYPE html>` and `<meta charset="UTF-8">`
- **Responsive:** SVGs scale via `viewBox` + `width="100%" max-width="520px"`; diagrams are always stacked vertically
- **Print-friendly:** `@media print` rule:
  - Hides the footer
  - `@page { size: A4 portrait; margin: 10mm; }`
  - Diagrams stay stacked; SVG `max-width: 360px`
  - Legend table does not break across pages (`page-break-inside: avoid`)

---

## Summary Checklist for Claude Code

- [ ] Single `krieket-veld.html` file, no external dependencies
- [ ] Two SVG oval fields, green & white colour scheme
- [ ] Each SVG: pitch, stumps, crease lines, bowler & batsman indicators, 30-yard dashed ring
- [ ] Batsman at TOP, bowler at BOTTOM in both diagrams
- [ ] Diagram 1: right-handed batsman — off side LEFT, leg side RIGHT
- [ ] Diagram 2: left-handed batsman — off side RIGHT, leg side LEFT (exact mirror)
- [ ] All 16 position markers on each diagram: number + Afrikaans name + English in brackets
- [ ] Sub-headings and side-indicators (Wegkant/Bykant) above each diagram
- [ ] One shared numbered legend table below both diagrams
- [ ] Mirror-note above the legend table
- [ ] FAK attribution in header
- [ ] Inline CSS only, no external dependencies
- [ ] Diagrams stacked vertically, right-handed first
- [ ] No label overlaps; dashed ring never strikes through text
- [ ] `@media print` styles for A4 portrait
