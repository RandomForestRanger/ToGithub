// Kat en Muis: "Gee my 'n nuwe kleur". A random colour scheme for the page and
// the board, with a textured background that drifts slowly behind everything.

// Board square pairs (light, dark). Each keeps enough contrast for the pieces.
const BOARDS = [
  ['#f0d9b5', '#b58863'], // Lichess brown
  ['#dee3e6', '#8ca2ad'], // blue
  ['#ffffdd', '#86a666'], // green
  ['#e8e0f2', '#9a88b4'], // purple
  ['#f6e3d6', '#c98b6f'], // coral
  ['#e2f1ef', '#6fa39c'], // teal
  ['#f3e7c4', '#b79a5c'], // sand
  ['#f9e1ea', '#cf8aa5'], // pink
  ['#e6ecf5', '#7b8fb8'], // slate
];

// Background textures. `c` is a faint ink colour that suits the scheme.
const paw = (c) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
    <g fill='${c}'><ellipse cx='20' cy='24' rx='6' ry='5'/><circle cx='13' cy='16' r='2.4'/>
    <circle cx='18' cy='12' r='2.4'/><circle cx='24' cy='12' r='2.4'/><circle cx='28' cy='17' r='2.4'/>
    <g transform='translate(30 30) rotate(25)'><ellipse cx='12' cy='14' rx='5' ry='4'/>
    <circle cx='6' cy='7' r='2'/><circle cx='10' cy='4' r='2'/><circle cx='15' cy='4' r='2'/><circle cx='18' cy='8' r='2'/></g></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 64px 64px`;
};
const stars = (c) => {
  const s = (x, y, r) => `<path transform='translate(${x} ${y}) scale(${r})' d='M0 -5 L1.5 -1.5 5 -1.5 2.2 .8 3.2 4.5 0 2.3 -3.2 4.5 -2.2 .8 -5 -1.5 -1.5 -1.5Z'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><g fill='${c}'>
    ${s(15, 18, 1)}${s(60, 30, 0.6)}${s(38, 66, 0.8)}${s(78, 76, 0.5)}${s(8, 70, 0.45)}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 90px 90px`;
};
const grain = () => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .55 0'/></filter>
    <rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 160px 160px`;
};

const TEXTURES = [
  (c) => `radial-gradient(${c} 1.6px, transparent 1.8px) 0 0 / 20px 20px`,                     // kolletjies
  (c) => `repeating-linear-gradient(45deg, ${c} 0 2px, transparent 2px 16px)`,                   // strepe
  (c) => `linear-gradient(${c} 1px, transparent 1px) 0 0 / 28px 28px,
          linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 28px 28px`,                    // ruitjies
  (c) => `radial-gradient(circle at 50% 100%, transparent 9px, ${c} 10px 12px, transparent 13px) 0 0 / 26px 13px`, // golwe
  (c) => `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0) 0 0 / 44px 44px`, // blokkies
  paw,                                                                                             // pootjies
  stars,                                                                                           // sterretjies
  () => grain(),                                                                                   // korrel
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

export function randomTheme(previous) {
  let hue;
  do hue = Math.round(rnd(0, 360));
  while (previous && Math.abs(((hue - previous.hue + 540) % 360) - 180) < 50); // a clearly new colour
  const dark = Math.random() < 0.65;
  const sat = Math.round(rnd(28, 60));
  const hue2 = (hue + Math.round(rnd(30, 70))) % 360;
  const hsl = (h, s, l, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;
  const vars = dark
    ? {
        '--bg': hsl(hue, sat, 9),
        '--bg-2': hsl(hue2, sat, 17),
        '--bg-top': hsl(hue, sat, 6),
        '--panel': hsl(hue, sat * 0.45, 15),
        '--panel-2': hsl(hue, sat * 0.45, 20),
        '--line': hsl(hue, sat * 0.35, 27),
        '--pip': hsl(hue, sat * 0.3, 32),
        '--text': '#c9c9c9',
        '--text-strong': '#f0f0f0',
        '--muted': hsl(hue, 12, 64),
        '--tex-ink': hsl(hue2, 70, 75, 0.14),
      }
    : {
        '--bg': hsl(hue, sat, 88),
        '--bg-2': hsl(hue2, sat, 78),
        '--bg-top': hsl(hue, sat, 82),
        '--panel': hsl(hue, 45, 98),
        '--panel-2': hsl(hue, 35, 94),
        '--line': hsl(hue, 22, 84),
        '--pip': hsl(hue, 18, 80),
        '--text': '#444',
        '--text-strong': '#1b1b1b',
        '--muted': hsl(hue, 8, 42),
        '--tex-ink': hsl(hue2, 45, 30, 0.12),
      };
  const texture = Math.floor(Math.random() * TEXTURES.length);
  const board = pick(BOARDS.filter((b) => !previous || b[0] !== previous.board[0]));
  return { hue, dark, vars, texture, board };
}

export function applyTheme(t) {
  const root = document.documentElement;
  if (!t) {
    // back to the default Lichess look
    for (const k of [...root.style]) if (k.startsWith('--')) root.style.removeProperty(k);
    delete root.dataset.theme;
    return;
  }
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  root.style.setProperty('--texture', TEXTURES[t.texture % TEXTURES.length](t.vars['--tex-ink']));
  root.style.setProperty('--board-light', t.board[0]);
  root.style.setProperty('--board-dark', t.board[1]);
  root.dataset.theme = t.dark ? 'dark' : 'light';
  root.style.colorScheme = t.dark ? 'dark' : 'light';
}

// The new colours spread out in a circle from the button that was pressed.
export function withReveal(button, change) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || still || !button) {
    change();
    return;
  }
  const r = button.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(change);
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.6, 0, .3, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}
