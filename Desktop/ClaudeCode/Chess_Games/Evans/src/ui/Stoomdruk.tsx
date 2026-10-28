import { UI } from '../content/kaptein';
import { pressToDial, pressZone } from '../game/pressure';
import { iconsOf, type Icon, type Ledger } from '../game/ledger';
import drukmeter from '../assets/drukmeter.webp';

// The painted drukmeter (art/drukmeter.png, cut out to src/assets/drukmeter.webp) with a live needle on top.
// Only the needle moves. It shows the PRESSURE of his last move: how big a question it asked Black
// (LAE DRUK on the left, HOË DRUK on the right), with that move named just under the dial ("Druk van 9.Qb3").
// The plaque under the dial shows the other side of the deal: lokaas, verloor, vangs.
// Geometry measured on the asset (750 x 494): dial centre, radius, and the angle of each painted tick
// (degrees from straight up) for -2, -1, =, 1, 2.
const W = 750, H = 494, CX = 371.1, CY = 260.1, R = 153.8;
const TICKS: [number, number][] = [[-2, -50.6], [-1, -24], [0, 1], [1, 25.6], [2, 52.2]];
const LIMIT = 2.3; // beyond the end ticks the needle stops just past them

/** Needle angle for a dial value, interpolating between the painted ticks (straight line past the ends). */
export function needleAngle(e: number): number {
  const v = Math.max(-LIMIT, Math.min(LIMIT, e));
  for (let i = 0; i < TICKS.length - 1; i++) {
    const [v0, a0] = TICKS[i], [v1, a1] = TICKS[i + 1];
    if (v <= v1 || i === TICKS.length - 2) {
      if (v < v0 && i === 0) return a0 + (v - v0) * (a1 - a0);
      return a0 + ((v - v0) / (v1 - v0)) * (a1 - a0);
    }
  }
  return 0;
}

/** Rye is wide: long zone names shrink so they stay inside the dial face (whatever wording is in kaptein.ts). */
const labelSize = (t: string) => `${Math.min(31, (31 * 12) / Math.max(1, t.length))}px`;

const MAX_ICONS = 6;

// Small piece silhouettes (inline SVG, so they never depend on a font having the chess glyphs).
const SHAPES: Record<Icon, JSX.Element> = {
  p: <><circle cx={0} cy={-27} r={7} /><path d="M -6 -19 L 6 -19 L 4 -11 L 9 -3 L 11 0 L -11 0 L -9 -3 L -4 -11 Z" /></>,
  n: <><path d="M -10 0 L 10 0 L 9 -5 L 5 -6 C 6 -12 9 -17 7 -24 C 5 -30 -1 -33 -4 -33 L -5 -30 C -9 -28 -11 -23 -11 -19 C -11 -16 -9 -15 -7 -16 L -3 -18 C -5 -14 -8 -11 -8 -6 L -9 -5 Z" /><circle cx={-3} cy={-26} r={1.4} className="eye" /></>,
  b: <><path d="M -10 0 L 10 0 L 8 -5 L -8 -5 Z" /><path d="M -6 -6 C -10 -15 -5 -24 0 -29 C 5 -24 10 -15 6 -6 Z" /><circle cx={0} cy={-32} r={2.6} /><path d="M 1.5 -23 L -2.5 -17" className="slit" /></>,
  r: <path d="M -10 0 L 10 0 L 9 -5 L 7 -7 L 6 -24 L 9 -26 L 9 -33 L 5 -33 L 5 -29 L 2 -29 L 2 -33 L -2 -33 L -2 -29 L -5 -29 L -5 -33 L -9 -33 L -9 -26 L -6 -24 L -7 -7 L -9 -5 Z" />,
  q: <><path d="M -10 0 L 10 0 L 8 -6 L 11 -26 L 5 -14 L 3 -29 L 0 -15 L -3 -29 L -5 -14 L -11 -26 L -8 -6 Z" />{[[11, -27], [3, -30], [-3, -30], [-11, -27]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={2.2} />)}</>,
};

function PieceIcon({ t, kind }: { t: Icon; kind: 'bait' | 'lost' | 'won' }) {
  return <svg viewBox="-13 -36 26 37" className={`ledger-piece ${kind}`} aria-hidden>{SHAPES[t]}</svg>;
}

function Segment({ kind, label, icons }: { kind: 'bait' | 'lost' | 'won'; label: string; icons: Icon[] }) {
  if (!icons.length) return null;
  return (
    <span className={`ledger-seg ${kind}`}>
      <span className="ledger-label">{label}</span>
      <span className="ledger-pawns">
        {icons.slice(0, MAX_ICONS).map((t, i) => <PieceIcon key={i} t={t} kind={kind} />)}
        {icons.length > MAX_ICONS && <span className="ledger-more">+{icons.length - MAX_ICONS}</span>}
      </span>
    </span>
  );
}

/**
 * The other side of the deal, on a plaque under the dial (game/ledger.ts):
 * Lokaas = what the gambit gave on the route; Verloor = anything else lost; Vangs = anything caught.
 */
function LedgerPlaque({ ledger }: { ledger: Ledger }) {
  const bait = iconsOf(ledger.bait, ledger.icons.bait);
  const lost = iconsOf(ledger.lost, ledger.icons.lost);
  const won = iconsOf(ledger.won, ledger.icons.won);
  if (!bait.length && !lost.length && !won.length) {
    return <div className="ledger even"><span className="ledger-label">{UI.ledgerEven}</span></div>;
  }
  return (
    <div className="ledger">
      <Segment kind="bait" label={UI.ledgerBait} icons={bait} />
      <Segment kind="lost" label={UI.ledgerLost} icons={lost} />
      <Segment kind="won" label={UI.ledgerCatch} icons={won} />
    </div>
  );
}

const NAMES: Record<Icon, string> = { p: 'pion', n: 'perd', b: 'loper', r: 'toring', q: 'dame' };
const describe = (icons: Icon[]) => icons.map(t => NAMES[t]).join(', ');

export function Stoomdruk({ press, ledger, visible, caption }: {
  press: number; ledger: Ledger; visible: boolean;
  /** the move the needle is measuring, numbered (e.g. "9.Qb3") */
  caption: string | null;
}) {
  const zone = pressZone(press);
  const deg = needleAngle(visible ? pressToDial(press) : 0);
  const len = R - 10;
  const label = visible ? UI.zones[zone] : 'Stoomdruk';
  const parts = [
    [UI.ledgerBait, iconsOf(ledger.bait, ledger.icons.bait)], [UI.ledgerLost, iconsOf(ledger.lost, ledger.icons.lost)],
    [UI.ledgerCatch, iconsOf(ledger.won, ledger.icons.won)],
  ].filter(([, i]) => (i as Icon[]).length).map(([l, i]) => `${l}: ${describe(i as Icon[])}`);
  const aria = visible
    ? `Stoomdruk: ${label}${caption ? ` (${UI.pressOf(caption)})` : ''}. ${parts.length ? parts.join('. ') : UI.ledgerEven}`
    : 'Stoomdruk';
  return (
    <div className={`stoomdruk ${visible ? '' : 'dim'}`} aria-label={aria}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
        <defs>
          <radialGradient id="capBrass" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#fff1b8" /><stop offset=".45" stopColor="#d9a23a" /><stop offset="1" stopColor="#8a5a14" />
          </radialGradient>
        </defs>
        <image href={drukmeter} width={W} height={H} />
        <text x={CX} y={CY + 62} className={`dial-zone zone-${zone}`} style={{ fontSize: labelSize(label) }}>{label}</text>
        <g className="needle" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <path d={`M${CX - 7} ${CY} L${CX} ${CY - len} L${CX + 7} ${CY} Z`} className="needle-blade" />
          <path d={`M${CX - 2} ${CY - len * 0.15} L${CX} ${CY - len + 6} L${CX + 2} ${CY - len * 0.15} Z`} className="needle-shine" />
          <path d={`M${CX - 9} ${CY} L${CX} ${CY + 34} L${CX + 9} ${CY} Z`} className="needle-tail" />
        </g>
        <circle cx={CX} cy={CY} r={17} fill="url(#capBrass)" className="needle-cap" />
        <circle cx={CX - 5} cy={CY - 5} r={4} className="needle-cap-glint" />
      </svg>
      {visible && caption && <div className="dial-caption">{UI.pressOf(caption)}</div>}
      {visible && <LedgerPlaque ledger={ledger} />}
    </div>
  );
}
