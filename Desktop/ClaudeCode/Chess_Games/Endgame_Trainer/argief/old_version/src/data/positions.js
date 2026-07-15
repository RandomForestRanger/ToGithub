// ─── Endgame Type Definitions ────────────────────────────────────────────────
// All 20 types are defined here so the badge map renders them from day one.
// Positions (FENs) are added per type as each sprint is completed.

export const ENDGAME_TYPES = [
  { id: 1,  name: 'Koning & Koningin teen Koning',     icon: '♛', englishRef: 'King & Queen vs King' },
  { id: 2,  name: 'Koning & Toring teen Koning',        icon: '♜', englishRef: 'King & Rook vs King' },
  { id: 3,  name: 'Koning & Twee Lopers teen Koning',   icon: '♝', englishRef: 'King & Two Bishops vs King' },
  { id: 4,  name: 'Koning, Loper & Ruiter teen Koning', icon: '🐴', englishRef: 'King & Bishop & Knight vs King' },
  { id: 5,  name: 'Koning & Twee Ruiters teen Koning',  icon: '🏇', englishRef: 'King & Two Knights vs King' },
  { id: 6,  name: 'Koning & Pion teen Koning',          icon: '♟', englishRef: 'King & Pawn vs King' },
  { id: 7,  name: 'Verbygeraakte Pion Wedren',          icon: '🏁', englishRef: 'Passed Pawn Races' },
  { id: 8,  name: 'Opposisie & Koningaktiwiteit',       icon: '👑', englishRef: 'Opposition & King Activity' },
  { id: 9,  name: 'Zugzwang',                           icon: '⚡', englishRef: 'Zugzwang' },
  { id: 10, name: 'Driehoeksbeweging',                  icon: '🔺', englishRef: 'Triangulation' },
  { id: 11, name: 'Piondeurbraak',                      icon: '💥', englishRef: 'Pawn Breakthrough' },
  { id: 12, name: 'Buitenste Verbygeraakte Pion',       icon: '🎯', englishRef: 'Outside Passed Pawn' },
  { id: 13, name: 'Lucena-posisie',                     icon: '🏛️', englishRef: 'Lucena Position' },
  { id: 14, name: 'Philidor-posisie',                   icon: '📐', englishRef: 'Philidor Position' },
  { id: 15, name: 'Toring Agter Verbygeraakte Pion',    icon: '🚂', englishRef: 'Rook Behind Passed Pawn' },
  { id: 16, name: 'Aktiewe vs Passiewe Toring',         icon: '⚔️', englishRef: 'Active vs Passive Rook' },
  { id: 17, name: 'Goeie Loper vs Slegte Loper',        icon: '🌓', englishRef: 'Good Bishop vs Bad Bishop' },
  { id: 18, name: 'Loper teen Ruiter',                  icon: '🐎', englishRef: 'Bishop vs Knight' },
  { id: 19, name: 'Verkeerde Kleur Loper',              icon: '🔲', englishRef: 'Wrong-Coloured Bishop' },
  { id: 20, name: 'Koningin teen Pion op 7de Ry',       icon: '🎖️', englishRef: 'Queen vs Pawn on 7th Rank' },
]

// ─── Position Database ────────────────────────────────────────────────────────
// Structure: POSITIONS[typeId] = { bronze: [...], silver: [...], gold: [...] }
// Each position: { fen, note }
//
// Tier move limits:  bronze = 12 full turns, silver = 24, gold = 36
// Difficulty guide:  bronze ≈ 8–10 ideal moves to mate
//                    silver ≈ 15–20 ideal moves to mate
//                    gold   ≈ 25–35 ideal moves to mate
//
// All Type-1 FENs verified by hand. White always to move.
// "Full turn" = one white move + one black response.

export const POSITIONS = {
  // ── Type 1: King & Queen vs King ──────────────────────────────────────────
  // Technique: use queen to cut off king, drive it to a corner, deliver mate
  // with king support. Main danger: accidentally stalemating Black.
  1: {
    bronze: [
      // B1: Kd1 Qf1 vs Ke5 — queen centrally placed, kings moderate distance
      { fen: '8/8/8/4k3/8/8/8/3K1Q2 w - - 0 1',
        note: 'Koningin en Koning vs Koning — beide konings sentraal' },
      // B2: Kc1 Qf1 vs Kc4 — kings on same file, queen active
      { fen: '8/8/8/8/2k5/8/8/2K2Q2 w - - 0 1',
        note: 'Konings op dieselfde kolom' },
      // B3: Kd1 Qg2 vs Kd3 — kings close, mate in ~6
      { fen: '8/8/8/8/8/3k4/6Q1/3K4 w - - 0 1',
        note: 'Konings baie naby mekaar' },
      // B4: Kf3 Qa1 vs Kg6 — queen far, needs to cut off
      { fen: '8/8/6k1/8/8/5K2/8/Q7 w - - 0 1',
        note: 'Koningin ver weg — moet afkap' },
      // B5: Kc3 Qf4 vs Ka6 — Black king near edge already
      { fen: '8/8/k7/8/5Q2/2K5/8/8 w - - 0 1',
        note: 'Swart koning naby die rand' },
    ],
    silver: [
      // S1: Ka2 Qg1 vs Ke5 — queen in corner, farther drive needed
      { fen: '8/8/8/4k3/8/8/K7/6Q1 w - - 0 1',
        note: 'Koningin in die hoek — langer roete' },
      // S2: Kb1 Qh8 vs Kd5 — queen far from queen, longer technique
      { fen: '7Q/8/8/3k4/8/8/8/1K6 w - - 0 1',
        note: 'Koningin ver van die aksie' },
      // S3: Ka1 Qh4 vs Kd6 — both pieces far from Black king
      { fen: '8/8/3k4/8/7Q/8/8/K7 w - - 0 1',
        note: 'Beide stukke ver van swart koning' },
    ],
    gold: [
      // G1: Ka1 Qh1 vs Kd4 — queen on back rank, longer technique
      { fen: '8/8/8/8/3k4/8/8/K6Q w - - 0 1',
        note: 'Koningin op agterste ry — vereis akkurate spel' },
      // G2: Ka1 Qa8 vs Ke4 — queen in opposite corner from king
      { fen: 'Q7/8/8/8/4k3/8/8/K7 w - - 0 1',
        note: 'Koningin in teenoorgestelde hoek' },
    ],
  },

  // Types 2–20: positions to be added in future sprints
  // Each type will follow the same { bronze, silver, gold } structure.
}

// ─── Tier configuration ───────────────────────────────────────────────────────
export const TIERS = {
  bronze: { label: 'Brons',  moveLimit: 12, hintsAlwaysOn: true,  hintMoveLimit: null },
  silver: { label: 'Silwer', moveLimit: 24, hintsAlwaysOn: false, hintMoveLimit: 10  },
  gold:   { label: 'Goud',   moveLimit: 36, hintsAlwaysOn: false, hintMoveLimit: 0   },
}

// Tier unlock order for each type
export const TIER_ORDER = ['bronze', 'silver', 'gold']
