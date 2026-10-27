import { UI } from '../content/kaptein';
import { zoneOf } from '../game/controller';
import drukmeter from '../assets/drukmeter.webp';

// The painted drukmeter (art/drukmeter.png, cut out to src/assets/drukmeter.webp) with a live needle on top.
// Only the needle moves. It shows the eval (steam minus the pawns invested), in pawns.
// Geometry measured on the asset (750 x 494): dial centre, radius, and the angle of each painted tick
// (degrees from straight up) for -2, -1, =, 1, 2.
const W = 750, H = 494, CX = 371.1, CY = 260.1, R = 153.8;
const TICKS: [number, number][] = [[-2, -50.6], [-1, -24], [0, 1], [1, 25.6], [2, 52.2]];
const LIMIT = 2.3; // beyond the end ticks the needle stops just past them

/** Needle angle for an eval, interpolating between the painted ticks (straight line past the ends). */
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

export function Stoomdruk({ steam, debt, visible }: { steam: number; debt: number; visible: boolean }) {
  const e = steam - debt;
  const zone = zoneOf(steam, debt);
  const deg = visible ? needleAngle(e) : needleAngle(0);
  const len = R - 10;
  const label = visible ? UI.zones[zone] : 'Stoomdruk';
  return (
    <div className={`stoomdruk ${visible ? '' : 'dim'}`} aria-label={`Stoomdruk ${e.toFixed(1)}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
        <defs>
          <radialGradient id="capBrass" cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor="#fff1b8" /><stop offset=".45" stopColor="#d9a23a" /><stop offset="1" stopColor="#8a5a14" />
          </radialGradient>
        </defs>
        <image href={drukmeter} width={W} height={H} />
        <text x={CX} y={CY + 62} className={`dial-zone zone-${zone}`} style={{ fontSize: labelSize(label) }}>{label}</text>
        {visible && <text x={CX} y={CY + 100} className="dial-value">{`${e >= 0 ? '+' : ''}${e.toFixed(1)}`}</text>}
        <g className="needle" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <path d={`M${CX - 7} ${CY} L${CX} ${CY - len} L${CX + 7} ${CY} Z`} className="needle-blade" />
          <path d={`M${CX - 2} ${CY - len * 0.15} L${CX} ${CY - len + 6} L${CX + 2} ${CY - len * 0.15} Z`} className="needle-shine" />
          <path d={`M${CX - 9} ${CY} L${CX} ${CY + 34} L${CX + 9} ${CY} Z`} className="needle-tail" />
        </g>
        <circle cx={CX} cy={CY} r={17} fill="url(#capBrass)" className="needle-cap" />
        <circle cx={CX - 5} cy={CY - 5} r={4} className="needle-cap-glint" />
      </svg>
    </div>
  );
}
