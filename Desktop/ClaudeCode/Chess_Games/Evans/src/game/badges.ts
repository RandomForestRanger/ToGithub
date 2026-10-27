// Badges: one per chosen line, earned (once, for good) when that line turns gold.
// Six on each side of the Kelpwoud: the Accepted lines on the left, the rest on the right.
export interface BadgeDef { id: string; name: string }

export const BADGES_LEFT: BadgeDef[] = [
  { id: 'pierce-defense', name: 'Pierce' },
  { id: 'morphy-attack', name: 'Morphy' },
  { id: 'bronstein-defense', name: 'Bronstein' },
  { id: 'slow-variation', name: 'Slow Variation' },
  { id: 'anderssen-variation', name: 'Anderssen' },
  { id: 'stone-ware-variation', name: 'Stone-Ware' },
];

export const BADGES_RIGHT: BadgeDef[] = [
  { id: 'mcdonnell-defense', name: 'McDonnell' },
  { id: 'mayet-defense', name: 'Mayet' },
  { id: 'evans-gambit-declined-5-a4', name: 'Declined 5.a4' },
  { id: 'evans-gambit-declined-4-bb6', name: 'Declined 4...Bb6' },
  { id: 'hein-countergambit', name: 'Hein' },
  { id: 'fontaine-countergambit', name: 'Fontaine' },
];
