// Geometry for the sea-bamboo (Ecklonia maxima) forest: tapered stipes, gas-bladder bulbs,
// strap fronds streaming with the current, the holdfast and the seabed. Pure functions, all
// deterministic (seeded by line id) so the forest looks the same on every visit.

type Pt = [number, number];

export function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);
const poly = (pts: Pt[]) => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
const line = (pts: Pt[]) => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L');

/** Ribbon around a sampled centreline, width w(t) at t in [0,1]. Returns outline and centreline. */
function ribbon(at: (t: number) => Pt, w: (t: number) => number, n = 22) {
  const c: Pt[] = [];
  for (let i = 0; i <= n; i++) c.push(at(i / n));
  const L: Pt[] = [], R: Pt[] = [];
  c.forEach((p, i) => {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const half = w(i / n) / 2;
    L.push([p[0] - dy * half, p[1] + dx * half]);
    R.push([p[0] + dy * half, p[1] - dx * half]);
  });
  return { outline: poly([...L, ...R.reverse()]), centre: c };
}

// ---------- stipe ----------

export interface Stipe { outline: string; centre: string; highlight: string; barnacles: Pt[] }

/** Cubic from (px,py) up to (x,y), arriving vertically. Width tapers from w0 to w1. */
export function stipe(px: number, py: number, x: number, y: number, w0: number, w1: number, reef: boolean, seed: string): Stipe {
  const mid = py - (py - y) * 0.55;
  const P: Pt[] = [[px, py], [px, mid], [x, mid + 10], [x, y]];
  const at = (t: number): Pt => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [k.reduce((s, v, i) => s + v * P[i][0], 0), k.reduce((s, v, i) => s + v * P[i][1], 0)];
  };
  const r = ribbon(at, t => w0 + (w1 - w0) * t, 26);
  // highlight: a thin line along the left flank so the stipe reads as round
  const hl = r.centre.map((p, i) => [p[0] - (w0 + (w1 - w0) * (i / 26)) * 0.22, p[1]] as Pt);
  const barnacles: Pt[] = [];
  if (reef) {
    const rand = rng(seed + 'b');
    const len = Math.hypot(x - px, y - py);
    const count = Math.max(3, Math.round(len / 16));
    for (let i = 0; i < count; i++) {
      const t = 0.08 + 0.84 * (i + rand() * 0.6) / count;
      const p = at(t), side = i % 2 ? 1 : -1, w = w0 + (w1 - w0) * t;
      barnacles.push([p[0] + side * w * 0.45, p[1]]);
    }
  }
  return { outline: r.outline, centre: line(r.centre), highlight: line(hl.slice(2, -2)), barnacles };
}

// ---------- bulb (pneumatocyst) ----------

export interface BulbDims { len: number; rad: number; neck: number }

export const bulbDims = (root: boolean, famous: boolean): BulbDims =>
  root ? { len: 48, rad: 12, neck: 4.5 } : famous ? { len: 36, rad: 9, neck: 3 } : { len: 28, rad: 7, neck: 2.2 };

/**
 * Sea-bamboo bladder: the stipe (half-width `neck` at (x,y)) swells slowly into a long, hollow bulb,
 * widest high up, then a short crown where the fronds sprout.
 */
export function bulb(x: number, y: number, d: BulbDims) {
  const { len: L, rad: R, neck: N } = d;
  const p = (u: number, v: number) => `${f(x + u)} ${f(y + v)}`;
  const top = L * 0.86; // bladder top; the crown sits above it
  const body =
    `M${p(-N, 0)} C${p(-N * 1.1, -top * 0.35)} ${p(-R, -top * 0.5)} ${p(-R, -top * 0.78)} ` +
    `C${p(-R, -top * 0.96)} ${p(-R * 0.5, -top)} ${p(0, -top)} ` +
    `C${p(R * 0.5, -top)} ${p(R, -top * 0.96)} ${p(R, -top * 0.78)} ` +
    `C${p(R, -top * 0.5)} ${p(N * 1.1, -top * 0.35)} ${p(N, 0)} Z`;
  const crownShape =
    `M${p(-R * 0.55, -top + 1)} C${p(-R * 0.5, -L * 0.98)} ${p(-R * 0.2, -L)} ${p(0, -L)} ` +
    `C${p(R * 0.2, -L)} ${p(R * 0.5, -L * 0.98)} ${p(R * 0.55, -top + 1)} Z`;
  return {
    body, crownShape,
    shine: { cx: x - R * 0.4, cy: y - top * 0.74, rx: R * 0.24, ry: top * 0.16 },
    crown: [x, y - L * 0.97] as Pt,
  };
}

// ---------- fronds ----------

export interface Blade { outline: string; rib: string }

/**
 * Strap-like blades from the crown, bending with a current that flows to the right.
 * Leaf lines (no children) stream long fronds; inner lines get a short tuft that leaves room for
 * the child stipes rising from the same crown.
 */
export function fronds(cx: number, cy: number, leaf: boolean, famous: boolean, seed: string): Blade[] {
  const rand = rng(seed);
  const count = leaf ? (famous ? 6 : 5) : 3;
  const spread = leaf ? 1.05 : 1.5; // radians either side of vertical
  const out: Blade[] = [];
  for (let i = 0; i < count; i++) {
    const s = i / (count - 1) * 2 - 1;
    const phi = s * spread + 0.18 + (rand() - 0.5) * 0.25; // angle from vertical, + = right
    const len = leaf ? (famous ? 120 : 95) * (0.75 + rand() * 0.5) * (1 - Math.abs(s) * 0.25) : 26 + rand() * 16;
    const W = leaf ? 9 + rand() * 4 : 6 + rand() * 2;
    const bend = 0.45 + rand() * 0.35;
    const dir = (a: number): Pt => [Math.sin(a), -Math.cos(a)];
    const d1 = dir(phi), d2 = dir(phi + bend);
    const C: Pt = [cx + d1[0] * len * 0.55, cy + d1[1] * len * 0.55];
    const T: Pt = [C[0] + d2[0] * len * 0.5, C[1] + d2[1] * len * 0.5];
    const at = (t: number): Pt => {
      const u = 1 - t;
      return [u * u * cx + 2 * u * t * C[0] + t * t * T[0], u * u * cy + 2 * u * t * C[1] + t * t * T[1]];
    };
    const wave = rand() * 6;
    const r = ribbon(at, t => W * Math.sin(Math.PI * Math.pow(t, 0.6)) * (1 - 0.25 * t) * (1 + 0.14 * Math.sin(t * 22 + wave)) + 0.6, 24);
    out.push({ outline: r.outline, rib: line(r.centre.slice(1, -3)) });
  }
  return out;
}

// ---------- holdfast ----------

/** Branching haptera gripping the sand around (x, y). */
export function holdfast(x: number, y: number): string[] {
  const rand = rng('holdfast');
  const roots: string[] = [];
  for (let i = 0; i < 13; i++) {
    const s = i / 12 * 2 - 1;
    const ex = x + s * (34 + rand() * 18), ey = y + 4 + rand() * 12;
    const mx = x + s * (12 + rand() * 10), my = y - 14 - rand() * 8;
    roots.push(`M${f(x + s * 4)} ${f(y - 22)} Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`);
    if (rand() < 0.5) {
      const bx = (x + s * 4 + ex) / 2 + s * 6, by = (y - 22 + ey) / 2 + 4;
      roots.push(`M${f(bx)} ${f(by)} q${f(s * 10)} ${f(4)} ${f(s * 16 + (rand() - 0.5) * 8)} ${f(12 + rand() * 6)}`);
    }
  }
  return roots;
}

// ---------- seabed ----------

export function seabed(x0: number, x1: number, y: number) {
  const rand = rng('seabed');
  const steps = 14, w = (x1 - x0) / steps;
  let d = `M${f(x0)} ${f(y + 900)} L${f(x0)} ${f(y + 10)}`;
  for (let i = 0; i < steps; i++) {
    const xa = x0 + i * w;
    d += ` Q${f(xa + w / 2)} ${f(y - 8 - rand() * 18)} ${f(xa + w)} ${f(y + 4 + rand() * 12)}`;
  }
  d += ` L${f(x1)} ${f(y + 900)} Z`;
  const pebbles = Array.from({ length: 70 }, () => ({
    cx: x0 + rand() * (x1 - x0), cy: y + 16 + rand() * 60, rx: 2 + rand() * 6, ry: 1.5 + rand() * 3, tone: rand(),
  }));
  const ripples = Array.from({ length: 26 }, () => {
    const cx = x0 + rand() * (x1 - x0), cy = y + 22 + rand() * 50, rw = 20 + rand() * 40;
    return `M${f(cx - rw)} ${f(cy)} q${f(rw / 2)} -5 ${f(rw)} 0 t${f(rw)} 0`;
  });
  return { d, pebbles, ripples };
}

export function snow(box: [number, number, number, number], n = 90) {
  const rand = rng('snow');
  return Array.from({ length: n }, () => ({ x: box[0] + rand() * box[2], y: box[1] + rand() * box[3], r: 0.8 + rand() * 1.8, o: 0.1 + rand() * 0.25 }));
}
