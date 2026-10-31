// Kat en Muis: small inline SVG art (header logo, win and lose scenes).
// Kept deliberately simple; the board itself stays plain.

const CAT = '#d9843b';
const CAT_DARK = '#a95d22';
const MOUSE = '#a7adb3';
const MOUSE_DARK = '#7d8389';
const PINK = '#f2a3b3';
const INK = '#2b2622';

function catHead(x, y, s, mood = 'happy') {
  const eyes =
    mood === 'surprised'
      ? `<circle cx="-9" cy="-2" r="4.2" fill="#fff"/><circle cx="9" cy="-2" r="4.2" fill="#fff"/>
         <circle cx="-9" cy="-2" r="2" fill="${INK}"/><circle cx="9" cy="-2" r="2" fill="${INK}"/>`
      : `<path d="M-13 -2 q4 -5 8 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
         <path d="M5 -2 q4 -5 8 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const mouth =
    mood === 'surprised'
      ? `<ellipse cx="0" cy="10" rx="2.6" ry="3.2" fill="${INK}"/>`
      : `<path d="M-5 8 q2.5 3.5 5 0 q2.5 3.5 5 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-22 -6 L-20 -28 L-6 -17 Z" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M22 -6 L20 -28 L6 -17 Z" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-17 -10 L-17 -21 L-10 -15 Z" fill="${PINK}"/>
    <path d="M17 -10 L17 -21 L10 -15 Z" fill="${PINK}"/>
    <ellipse cx="0" cy="0" rx="23" ry="20" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5"/>
    <path d="M-6 -19 l2 6 M0 -20 l0 6 M6 -19 l-2 6" stroke="${CAT_DARK}" stroke-width="2" stroke-linecap="round"/>
    ${eyes}
    <path d="M-2.5 4 h5 l-2.5 3 z" fill="${PINK}"/>
    ${mouth}
    <path d="M-10 6 h-13 M-10 9 l-12 3 M10 6 h13 M10 9 l12 3" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".7"/>
  </g>`;
}

function mouse(x, y, s, flip = false, mood = 'sheepish') {
  const face =
    mood === 'cheeky'
      ? `<circle cx="9" cy="-4" r="1.6" fill="${INK}"/><path d="M5 2 q3 2 6 0" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      : `<path d="M7 -5 q2 -2 4 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <path d="M-16 4 q-14 2 -18 -8 q-3 -7 4 -10" stroke="${MOUSE_DARK}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="-2" cy="2" rx="16" ry="11" fill="${MOUSE}" stroke="${MOUSE_DARK}" stroke-width="1.3"/>
    <circle cx="4" cy="-9" r="7" fill="${MOUSE}" stroke="${MOUSE_DARK}" stroke-width="1.3"/>
    <circle cx="4" cy="-9" r="4" fill="${PINK}"/>
    <path d="M10 -6 q8 2 10 8 q-6 3 -12 1 z" fill="${MOUSE}" stroke="${MOUSE_DARK}" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="20" cy="2" r="1.8" fill="${INK}"/>
    ${face}
  </g>`;
}

export const logo = `<svg viewBox="-30 -32 64 58" aria-hidden="true" class="logo">${catHead(-2, 0, 1)}${mouse(18, 18, 0.42, false, 'cheeky')}</svg>`;

export function winScene() {
  return `<svg viewBox="0 0 240 120" class="scene" role="img" aria-label="Die kat het die muis gevang">
    <ellipse cx="120" cy="108" rx="100" ry="8" fill="currentColor" opacity=".08"/>
    <g transform="translate(78 68)">
      <ellipse cx="0" cy="18" rx="30" ry="24" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5"/>
      <path d="M26 30 q24 4 22 -22" stroke="${CAT_DARK}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M26 30 q24 4 22 -22" stroke="${CAT}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
    ${catHead(78, 46, 1.15, 'happy')}
    <ellipse cx="112" cy="104" rx="10" ry="6" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5"/>
    ${mouse(148, 96, 1, true, 'sheepish')}
    <g fill="#e8c547">
      <path d="M170 40 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z"/>
      <path d="M196 62 l2 4.5 4.5 .6 -3.3 3.2 .8 4.5 -4 -2 -4 2 .8 -4.5 -3.3 -3.2 4.5 -.6z"/>
      <path d="M150 24 l1.6 3.6 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5z"/>
    </g>
  </svg>`;
}

export function loseScene() {
  return `<svg viewBox="0 0 240 120" class="scene" role="img" aria-label="Die muis het weggekom">
    <rect x="150" y="10" width="86" height="100" rx="4" fill="#8c6b4f"/>
    <g stroke="#6f533c" stroke-width="2">
      <path d="M150 35 h86 M150 60 h86 M150 85 h86"/>
      <path d="M190 10 v25 M170 35 v25 M210 35 v25 M190 60 v25 M170 85 v25 M215 85 v25"/>
    </g>
    <path d="M168 110 v-18 a16 16 0 0 1 32 0 v18 z" fill="#1d1a17"/>
    ${mouse(186, 100, .62, false, 'cheeky')}
    <ellipse cx="90" cy="108" rx="70" ry="7" fill="currentColor" opacity=".08"/>
    <g transform="translate(70 70)">
      <ellipse cx="0" cy="16" rx="28" ry="22" fill="${CAT}" stroke="${CAT_DARK}" stroke-width="1.5"/>
      <path d="M-24 26 q-26 2 -24 -24" stroke="${CAT_DARK}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M-24 26 q-26 2 -24 -24" stroke="${CAT}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
    ${catHead(76, 46, 1.1, 'surprised')}
    <text x="112" y="30" font-size="22" font-weight="700" fill="${CAT_DARK}">?</text>
  </svg>`;
}
