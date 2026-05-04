import React, { useState, useEffect } from 'react';

// 256×256 pixel-art SVG portrait of Maestro Giacomo Bianchi.
// All coordinates are on an 8-pixel grid (32×32 logical pixels).
// Usage: <GiacomoFace expression="ecstatic" size={96} />
//
// 10 expressions:
//   ecstatic   — 4pt excellent  (star eyes, huge grin, sparkles)
//   pleased    — 3pt good       (happy squint, smile)
//   neutral    — 2pt mediocre   (flat stare, thin line mouth)
//   frustrated — 1pt bad        (angry brows, frown)
//   waiting    — player's turn  (raised brows, small open mouth)
//   celebrating— checkmate/bonus(closed crescents, huge laugh)
//   shocked    — trap triggered  (huge eyes, O mouth, !!)
//   warning    — trap incoming   (Spock brow, smirk)
//   proud      — badge unlock    (lidded eyes, knowing smile)
//   thinking   — evaluating      (eyes up-right, pursed mouth)
//
// 5 idle animations (trigger randomly ~every 2 minutes):
//   look_up    — eyes drift upward, brows raise
//   look_left  — sideways glance with a smirk
//   wine       — Maestro takes a contemplative sip of red wine
//   dog        — briefly transforms into a very friendly dog
//   sneeze     — dramatic sneeze sends mustache flying

const SK = '#F0C080';  // skin
const DS = '#D4956A';  // dark skin / ear inner
const HR = '#2C1810';  // hair & mustache
const EW = '#F5F5F5';  // eye white
const PU = '#1A1A1A';  // pupil
const MR = '#CC4444';  // mouth red
const TH = '#FFFDE8';  // teeth
const CK = '#E08070';  // cheek blush
const SH = '#FFFFFF';  // shirt
const TI = '#CC0000';  // tie
const GD = '#FFD700';  // gold
const WH = '#FFFFFF';  // white highlight
// Animation-only colours
const WG = '#DDDDDD';  // wine glass glass
const WN = '#6B0000';  // dark wine red
const DF = '#A0522D';  // dog fur (sienna)
const PK = '#FF9999';  // tongue pink
const BN = '#141414';  // dog nose

// r(x, y, w, h, fill, opacity?) — all in 8px grid units
function r(x, y, w, h, fill, opacity) {
  const props = { x: x * 8, y: y * 8, width: w * 8, height: h * 8, fill };
  if (opacity !== undefined) props.opacity = opacity;
  return props;
}

// ─── Fixed face elements (shared by all expressions) ─────────────────────

const FIXED = [
  // HAIR
  r(7, 1, 18, 1, HR), r(6, 2, 20, 1, HR), r(5, 3, 22, 1, HR),
  r(5, 4,  2, 4, HR), r(25, 4, 2, 4, HR),

  // FACE
  r(7, 4, 18, 25, SK),
  r(6, 7,  1, 19, SK), r(25, 7, 1, 19, SK),
  r(8, 29, 16, 1, SK), r(10, 30, 12, 1, SK),

  // EARS
  r(4, 12, 2, 5, SK),  r(26, 12, 2, 5, SK),
  r(5, 13, 1, 3, DS),  r(27, 13, 1, 3, DS),

  // CHEEKS
  r(7, 15, 4, 3, CK, 0.38), r(21, 15, 4, 3, CK, 0.38),

  // NOSE
  r(14, 16, 4, 1, DS),
  r(13, 17, 2, 1, DS), r(17, 17, 2, 1, DS),

  // MUSTACHE
  r(9, 20, 14, 1, HR),
  r(8, 21,  6, 1, HR), r(18, 21, 6, 1, HR),
  r(8, 22,  4, 1, HR), r(20, 22, 4, 1, HR),
  r(8, 23,  2, 1, HR), r(22, 23, 2, 1, HR),

  // COLLAR & TIE
  r(8, 30, 16, 2, SH),
  r(14, 29, 4, 2, TI), r(15, 31, 2, 1, TI),
];

// ─── Expression definitions ───────────────────────────────────────────────

const EXPRESSIONS = {

  ecstatic: {
    eyebrows: [
      r(8, 8, 5, 1, HR), r(19, 8, 5, 1, HR),
    ],
    eyes: [
      r(10, 10, 4, 1, GD), r(11, 9, 2, 3, GD), r(10, 10, 4, 1, GD),
      r(18, 10, 4, 1, GD), r(19, 9, 2, 3, GD), r(18, 10, 4, 1, GD),
    ],
    mouth: [
      r(9, 24, 14, 3, MR),
      r(10, 25, 12, 1, TH), r(11, 26, 10, 1, TH),
      r(9, 23, 1, 1, MR), r(22, 23, 1, 1, MR),
    ],
    extras: [
      r(2, 3, 1, 3, GD), r(1, 4, 3, 1, GD),
      r(29, 3, 1, 3, GD), r(28, 4, 3, 1, GD),
      r(3, 7, 1, 1, GD), r(28, 7, 1, 1, GD),
    ],
  },

  pleased: {
    eyebrows: [
      r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR),
    ],
    eyes: [
      r(8, 11, 6, 2, EW), r(8, 10, 6, 1, SK),
      r(10, 11, 2, 2, PU),
      r(11, 11, 1, 1, WH),
      r(18, 11, 6, 2, EW), r(18, 10, 6, 1, SK),
      r(20, 11, 2, 2, PU),
      r(21, 11, 1, 1, WH),
    ],
    mouth: [
      r(11, 24, 10, 1, MR),
      r(10, 25, 1, 1, MR), r(21, 25, 1, 1, MR),
    ],
    extras: [],
  },

  neutral: {
    eyebrows: [
      r(8, 10, 5, 1, HR), r(19, 10, 5, 1, HR),
    ],
    eyes: [
      r(8, 12, 6, 3, EW),
      r(10, 13, 2, 2, PU),
      r(11, 13, 1, 1, WH),
      r(18, 12, 6, 3, EW),
      r(20, 13, 2, 2, PU),
      r(21, 13, 1, 1, WH),
    ],
    mouth: [
      r(11, 25, 10, 1, MR),
    ],
    extras: [],
  },

  frustrated: {
    eyebrows: [
      r(8, 11, 2, 1, HR), r(10, 10, 2, 1, HR), r(12, 9, 1, 1, HR),
      r(19, 9, 1, 1, HR), r(20, 10, 2, 1, HR), r(22, 11, 2, 1, HR),
    ],
    eyes: [
      r(8, 12, 6, 2, EW),
      r(8, 11, 6, 1, HR),
      r(10, 12, 2, 2, PU),
      r(18, 12, 6, 2, EW),
      r(18, 11, 6, 1, HR),
      r(20, 12, 2, 2, PU),
    ],
    mouth: [
      r(10, 26, 12, 1, MR),
      r(10, 25, 1, 1, MR), r(21, 25, 1, 1, MR),
    ],
    extras: [
      r(6, 7, 1, 2, HR), r(25, 7, 1, 2, HR),
    ],
  },

  waiting: {
    eyebrows: [
      r(8, 8, 5, 1, HR), r(19, 8, 5, 1, HR),
    ],
    eyes: [
      r(8, 10, 6, 4, EW),
      r(10, 11, 2, 2, PU),
      r(11, 11, 1, 1, WH),
      r(18, 10, 6, 4, EW),
      r(20, 11, 2, 2, PU),
      r(21, 11, 1, 1, WH),
    ],
    mouth: [
      r(13, 24, 6, 2, MR),
      r(14, 24, 4, 2, PU, 0.7),
    ],
    extras: [],
  },

  celebrating: {
    eyebrows: [
      r(8, 8, 5, 1, HR), r(19, 8, 5, 1, HR),
    ],
    eyes: [
      r(8, 12, 6, 1, HR),
      r(9, 11, 4, 1, HR),
      r(18, 12, 6, 1, HR),
      r(19, 11, 4, 1, HR),
    ],
    mouth: [
      r(8, 23, 16, 4, MR),
      r(9, 24, 14, 2, TH),
      r(13, 26, 6, 1, PU, 0.5),
      r(8, 23, 1, 1, SK), r(23, 23, 1, 1, SK),
    ],
    extras: [
      r(2,  4, 1, 1, GD), r(4,  2, 1, 1, '#e74c3c'),
      r(27, 3, 1, 1, '#2ecc71'), r(29, 5, 1, 1, GD),
      r(1,  9, 1, 1, '#3498db'), r(30, 8, 1, 1, MR),
      r(3, 14, 1, 1, GD), r(28, 13, 1, 1, '#9b59b6'),
    ],
  },

  shocked: {
    eyebrows: [
      r(7, 7, 6, 1, HR), r(19, 7, 6, 1, HR),
    ],
    eyes: [
      r(7, 9, 8, 5, EW),
      r(9, 10, 3, 3, PU),
      r(10, 10, 1, 1, WH),
      r(17, 9, 8, 5, EW),
      r(19, 10, 3, 3, PU),
      r(20, 10, 1, 1, WH),
    ],
    mouth: [
      r(12, 24, 8, 3, MR),
      r(13, 24, 6, 3, PU, 0.65),
    ],
    extras: [
      r(2, 8,  1, 4, HR), r(2, 13, 1, 1, HR),
      r(29, 8, 1, 4, HR), r(29, 13, 1, 1, HR),
    ],
  },

  warning: {
    eyebrows: [
      r(8, 8, 5, 1, HR),
      r(19, 10, 5, 1, HR),
    ],
    eyes: [
      r(8, 10, 6, 3, EW),
      r(10, 11, 2, 2, PU),
      r(11, 11, 1, 1, WH),
      r(18, 11, 6, 2, EW),
      r(18, 10, 6, 1, SK),
      r(20, 11, 2, 2, PU),
    ],
    mouth: [
      r(11, 25, 9, 1, MR),
      r(20, 24, 2, 1, MR),
    ],
    extras: [],
  },

  proud: {
    eyebrows: [
      r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR),
    ],
    eyes: [
      r(8, 12, 6, 2, EW),
      r(8, 11, 6, 1, SK),
      r(10, 12, 2, 2, PU),
      r(11, 12, 1, 1, WH),
      r(18, 12, 6, 2, EW),
      r(18, 11, 6, 1, SK),
      r(20, 12, 2, 2, PU),
      r(21, 12, 1, 1, WH),
    ],
    mouth: [
      r(11, 24, 10, 1, MR),
      r(10, 25, 1, 1, MR), r(21, 25, 1, 1, MR),
      r(12, 25, 8, 1, MR, 0.4),
    ],
    extras: [],
  },

  thinking: {
    eyebrows: [
      r(8, 9,  5, 1, HR),
      r(19, 10, 5, 1, HR),
    ],
    eyes: [
      r(8, 11, 6, 3, EW),
      r(11, 11, 2, 2, PU),
      r(12, 11, 1, 1, WH),
      r(18, 11, 6, 3, EW),
      r(21, 11, 2, 2, PU),
      r(22, 11, 1, 1, WH),
    ],
    mouth: [
      r(12, 25, 8, 1, MR),
      r(12, 24, 1, 1, MR), r(19, 24, 1, 1, MR),
    ],
    extras: [
      r(26, 10, 1, 1, HR, 0.5),
      r(27, 8,  1, 1, HR, 0.5),
      r(29, 6,  2, 2, HR, 0.5),
    ],
  },
};

// ─── Idle animations ──────────────────────────────────────────────────────
// Each animation is an array of frames. Each frame has:
//   ms: duration in milliseconds
//   eyebrows, eyes, mouth, extras: same as EXPRESSIONS

const ANIMATIONS = {

  // 1. Looking up — eyes drift skyward, a moment of contemplation
  look_up: [
    {
      ms: 180,
      eyebrows: [r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR)],
      eyes: [
        r(8, 11, 6, 4, EW), r(10, 12, 2, 2, PU), r(11, 12, 1, 1, WH),
        r(18, 11, 6, 4, EW), r(20, 12, 2, 2, PU), r(21, 12, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [],
    },
    {
      ms: 800,
      eyebrows: [r(8, 7, 5, 1, HR), r(19, 7, 5, 1, HR)],
      eyes: [
        r(8, 10, 6, 5, EW),
        r(10, 10, 2, 2, PU), r(11, 10, 1, 1, WH),
        r(18, 10, 6, 5, EW),
        r(20, 10, 2, 2, PU), r(21, 10, 1, 1, WH),
      ],
      mouth: [r(13, 24, 6, 2, MR), r(14, 24, 4, 1, PU, 0.5)],
      extras: [
        // thought cloud dots
        r(27, 8, 1, 1, HR, 0.3), r(28, 6, 1, 1, HR, 0.3), r(30, 4, 2, 2, HR, 0.25),
      ],
    },
    {
      ms: 180,
      eyebrows: [r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR)],
      eyes: [
        r(8, 11, 6, 4, EW), r(10, 12, 2, 2, PU), r(11, 12, 1, 1, WH),
        r(18, 11, 6, 4, EW), r(20, 12, 2, 2, PU), r(21, 12, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [],
    },
  ],

  // 2. Looking left — suspicious sideways glance with a knowing smirk
  look_left: [
    {
      ms: 150,
      eyebrows: [r(8, 10, 5, 1, HR), r(19, 10, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 3, EW), r(9, 13, 2, 2, PU), r(10, 13, 1, 1, WH),
        r(18, 12, 6, 3, EW), r(19, 13, 2, 2, PU), r(20, 13, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [],
    },
    {
      ms: 900,
      eyebrows: [
        r(8, 9, 5, 1, HR),   // left brow slightly raised (eyeing something)
        r(19, 10, 5, 1, HR),
      ],
      eyes: [
        r(8, 12, 6, 3, EW), r(8, 13, 2, 2, PU), r(9, 13, 1, 1, WH),   // pupils hard left
        r(18, 12, 6, 3, EW), r(18, 13, 2, 2, PU), r(19, 13, 1, 1, WH),
      ],
      mouth: [
        // smirk toward the left side
        r(9, 25, 10, 1, MR),
        r(9, 24, 2, 1, MR),   // left corner up
      ],
      extras: [],
    },
    {
      ms: 150,
      eyebrows: [r(8, 10, 5, 1, HR), r(19, 10, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 3, EW), r(10, 13, 2, 2, PU), r(11, 13, 1, 1, WH),
        r(18, 12, 6, 3, EW), r(20, 13, 2, 2, PU), r(21, 13, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [],
    },
  ],

  // 3. Gulp of wine — Maestro reaches for an invisible glass, sips, savours
  wine: [
    {
      // Glass appears, Maestro's eyes brighten
      ms: 350,
      eyebrows: [r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR)],
      eyes: [
        r(8, 11, 6, 3, EW), r(10, 12, 2, 2, PU), r(11, 12, 1, 1, WH),
        r(18, 11, 6, 3, EW), r(20, 12, 2, 2, PU), r(21, 12, 1, 1, WH),
      ],
      mouth: [r(11, 24, 10, 1, MR), r(10, 25, 1, 1, MR), r(21, 25, 1, 1, MR)],
      extras: [
        // upright wine glass, right side
        r(23, 19, 1, 6, WG), r(28, 19, 1, 6, WG),  // bowl sides
        r(23, 25, 6, 1, WG),                          // bowl base
        r(24, 20, 4, 5, WN),                          // wine
        r(22, 18, 8, 1, WG),                          // rim
        r(25, 25, 2, 3, WG),                          // stem
        r(24, 28, 4, 1, WG),                          // foot
      ],
    },
    {
      // Tilted back, eyes close in bliss, big open mouth drinking
      ms: 600,
      eyebrows: [r(8, 8, 5, 1, HR), r(19, 8, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 1, HR), r(9, 11, 4, 1, HR),    // eyes closed (crescents)
        r(18, 12, 6, 1, HR), r(19, 11, 4, 1, HR),
      ],
      mouth: [
        r(9, 24, 14, 3, MR), r(10, 25, 12, 1, TH),
      ],
      extras: [
        // glass tilted, wine level lower (being drunk)
        r(22, 16, 1, 6, WG), r(27, 19, 1, 6, WG),
        r(22, 22, 6, 1, WG),
        r(23, 17, 4, 5, WN, 0.6),
        r(21, 15, 7, 1, WG),
        r(24, 22, 2, 3, WG),
        r(23, 25, 4, 1, WG),
      ],
    },
    {
      // Satisfied, lids heavy, glass lowered — bliss
      ms: 700,
      eyebrows: [r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 2, EW), r(8, 11, 6, 1, SK),
        r(10, 12, 2, 2, PU), r(11, 12, 1, 1, WH),
        r(18, 12, 6, 2, EW), r(18, 11, 6, 1, SK),
        r(20, 12, 2, 2, PU), r(21, 12, 1, 1, WH),
      ],
      mouth: [
        r(10, 24, 12, 1, MR), r(10, 25, 1, 1, MR), r(21, 25, 1, 1, MR),
      ],
      extras: [
        // glass back down, nearly empty
        r(23, 21, 1, 6, WG), r(28, 21, 1, 6, WG),
        r(23, 27, 6, 1, WG),
        r(24, 22, 4, 2, WN, 0.4),  // almost empty
        r(22, 20, 8, 1, WG),
        r(25, 27, 2, 3, WG),
        r(24, 30, 4, 1, WG),
        // satisfied rosy cheeks
        r(7, 15, 4, 3, CK, 0.55), r(21, 15, 4, 3, CK, 0.55),
        // lip smack
        r(15, 22, 2, 1, MR, 0.5),
      ],
    },
  ],

  // 4. Friendly dog — Giacomo briefly becomes a very good boy
  dog: [
    {
      // Ears start drooping
      ms: 250,
      eyebrows: [r(8, 10, 5, 1, HR), r(19, 10, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 3, EW), r(10, 13, 2, 2, PU), r(11, 13, 1, 1, WH),
        r(18, 12, 6, 3, EW), r(20, 13, 2, 2, PU), r(21, 13, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [
        r(2, 12, 3, 8, DF), r(27, 12, 3, 8, DF),  // partially drooped ears
      ],
    },
    {
      // FULL DOG MODE — floppy ears, puppy eyes, big nose, panting tongue
      ms: 1400,
      eyebrows: [
        r(7, 9, 6, 1, DF), r(19, 9, 6, 1, DF),   // fur brows
      ],
      eyes: [
        // Large round puppy eyes
        r(7, 11, 7, 4, EW),
        r(9, 12, 3, 3, PU),
        r(10, 12, 1, 1, WH),
        r(9, 11, 1, 1, WH, 0.7),   // extra cute shine
        r(18, 11, 7, 4, EW),
        r(20, 12, 3, 3, PU),
        r(21, 12, 1, 1, WH),
        r(20, 11, 1, 1, WH, 0.7),
      ],
      mouth: [
        r(9, 24, 14, 2, MR),
        r(10, 25, 12, 1, TH),
      ],
      extras: [
        // BIG floppy ears covering original ears
        r(1, 10, 5, 15, DF),   r(26, 10, 5, 15, DF),
        r(2, 11, 3, 13, '#C68642'), r(27, 11, 3, 13, '#C68642'),
        // Cover mustache and nose area with skin + dog muzzle
        r(8, 20, 16, 4, SK),
        r(8, 15, 16, 5, SK),                        // cover nose
        r(11, 16, 10, 5, '#F5DEB3'),                // wheat muzzle
        // Big dog nose
        r(12, 16, 8, 2, BN),
        r(13, 15, 6, 1, BN),
        r(12, 18, 2, 1, BN), r(18, 18, 2, 1, BN),
        r(15, 16, 1, 1, WH, 0.5),                  // nose shine
        // Panting tongue
        r(13, 25, 6, 2, PK),
        r(14, 27, 4, 2, PK),
        r(14, 28, 2, 1, '#EE6688'),                 // tongue tip
        // Whiskers
        r(5, 21, 3, 1, HR, 0.35), r(5, 22, 2, 1, HR, 0.25),
        r(24, 21, 3, 1, HR, 0.35), r(25, 22, 2, 1, HR, 0.25),
        // Brown spot over left eye
        r(7, 8, 7, 7, DF, 0.30),
      ],
    },
    {
      // Reverting — ears pulling back up
      ms: 250,
      eyebrows: [r(8, 10, 5, 1, HR), r(19, 10, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 3, EW), r(10, 13, 2, 2, PU), r(11, 13, 1, 1, WH),
        r(18, 12, 6, 3, EW), r(20, 13, 2, 2, PU), r(21, 13, 1, 1, WH),
      ],
      mouth: [r(11, 25, 10, 1, MR)],
      extras: [
        r(2, 12, 3, 6, DF), r(27, 12, 3, 6, DF),
        r(13, 15, 6, 2, DS, 0.3),  // nose shadow fading
      ],
    },
  ],

  // 5. The Sneeze — a colossal Italian achoo that sends the mustache flying
  sneeze: [
    {
      // Pre-sneeze: squinting, nose twitching, building up
      ms: 450,
      eyebrows: [
        r(8, 11, 2, 1, HR), r(10, 10, 2, 1, HR), r(12, 9, 1, 1, HR),
        r(19, 9, 1, 1, HR), r(20, 10, 2, 1, HR), r(22, 11, 2, 1, HR),
      ],
      eyes: [
        r(8, 12, 6, 2, EW), r(8, 11, 6, 1, HR),
        r(10, 12, 2, 2, PU),
        r(18, 12, 6, 2, EW), r(18, 11, 6, 1, HR),
        r(20, 12, 2, 2, PU),
      ],
      mouth: [r(12, 25, 8, 1, MR), r(12, 24, 1, 1, MR), r(19, 24, 1, 1, MR)],
      extras: [
        r(13, 15, 1, 1, DS), r(18, 15, 1, 1, DS),  // nose wrinkle
      ],
    },
    {
      // Head snapping back — eyes shut, mouth sealed
      ms: 200,
      eyebrows: [r(8, 7, 5, 1, HR), r(19, 7, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 1, HR), r(18, 12, 6, 1, HR),
      ],
      mouth: [r(13, 25, 6, 1, MR)],
      extras: [],
    },
    {
      // ACHOO! — mustache launched, mouth enormous, spray
      ms: 280,
      eyebrows: [r(8, 7, 5, 1, HR), r(19, 7, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 1, HR), r(18, 12, 6, 1, HR),
      ],
      mouth: [
        r(8, 23, 16, 4, MR),
        r(9, 24, 14, 2, TH),
        r(13, 26, 6, 1, PU, 0.4),
      ],
      extras: [
        // Cover original mustache, redraw it flying upward
        r(8, 20, 16, 4, SK),
        r(8, 15, 14, 1, HR),
        r(7, 16, 6, 1, HR), r(17, 16, 6, 1, HR),
        r(7, 17, 4, 1, HR), r(19, 17, 4, 1, HR),
        r(7, 18, 2, 1, HR), r(21, 18, 2, 1, HR),
        // Sneeze spray
        r(0, 23, 2, 1, '#BBDDFF', 0.7),
        r(1, 25, 1, 1, '#BBDDFF', 0.6),
        r(0, 27, 3, 1, '#BBDDFF', 0.55),
        r(2, 22, 1, 1, '#BBDDFF', 0.5),
      ],
    },
    {
      // Dazed recovery — slightly cross-eyed, mustache settling crooked
      ms: 600,
      eyebrows: [r(8, 9, 5, 1, HR), r(19, 9, 5, 1, HR)],
      eyes: [
        r(8, 12, 6, 3, EW), r(11, 13, 2, 2, PU), r(12, 13, 1, 1, WH),
        r(18, 12, 6, 3, EW), r(19, 13, 2, 2, PU), r(20, 13, 1, 1, WH),
      ],
      mouth: [r(10, 25, 12, 1, MR, 0.7)],
      extras: [
        // Mustache settles — still a row high, slightly askew
        r(8, 20, 16, 4, SK),
        r(9, 19, 14, 1, HR),
        r(8, 20,  6, 1, HR), r(18, 20, 6, 1, HR),
        r(8, 21,  4, 1, HR), r(20, 21, 4, 1, HR),
        r(8, 22,  2, 1, HR), r(22, 22, 2, 1, HR),
        // Dizzy sparkle
        r(26, 6, 1, 3, GD, 0.7), r(25, 7, 3, 1, GD, 0.7),
      ],
    },
  ],
};

const ANIMATION_KEYS = Object.keys(ANIMATIONS);

// ─── Component ────────────────────────────────────────────────────────────

export default function GiacomoFace({ expression = 'waiting', size = 128 }) {
  const [animFrame, setAnimFrame] = useState(null);

  useEffect(() => {
    let scheduleTimer;
    let frameTimer;

    const schedule = () => {
      // Fire once every 90–150 seconds on average (~2 minutes)
      const delay = 90000 + Math.random() * 60000;
      scheduleTimer = setTimeout(play, delay);
    };

    const play = () => {
      const key = ANIMATION_KEYS[Math.floor(Math.random() * ANIMATION_KEYS.length)];
      const frames = ANIMATIONS[key];
      let fi = 0;

      const advance = () => {
        if (fi >= frames.length) {
          setAnimFrame(null);
          schedule();
          return;
        }
        const frame = frames[fi++];
        setAnimFrame(frame);
        frameTimer = setTimeout(advance, frame.ms);
      };
      advance();
    };

    schedule();
    return () => {
      clearTimeout(scheduleTimer);
      clearTimeout(frameTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = animFrame ?? (EXPRESSIONS[expression] || EXPRESSIONS.waiting);
  const allRects = [
    ...FIXED,
    ...(frame.eyebrows || []),
    ...(frame.eyes || []),
    ...(frame.mouth || []),
    ...(frame.extras || []),
  ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'block' }}
      aria-label={`Giacomo: ${expression}`}
    >
      {allRects.map((props, i) => (
        <rect key={i} {...props} />
      ))}
    </svg>
  );
}
