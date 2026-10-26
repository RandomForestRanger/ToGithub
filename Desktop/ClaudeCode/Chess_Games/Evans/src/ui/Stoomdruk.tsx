import { COLD_EVAL, GAUGE_MAX, GAUGE_MIN, GOLD_EVAL } from '../config';
import { UI } from '../content/kaptein';
import { zoneOf } from '../game/controller';

// A fixed dial: scale, colours and marks never change during a game; only the needle moves.
// The needle shows the eval (steam minus the pawns invested), so the gold zone is exactly the gold rule.
const MIN = GAUGE_MIN, MAX = GAUGE_MAX;
const CX = 110, CY = 105, R = 85;
const ang = (v: number) => Math.PI * (1 - (Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN));
const pt = (v: number, r = R) => [CX + r * Math.cos(ang(v)), CY - r * Math.sin(ang(v))] as const;

function arc(a: number, b: number) {
  if (b <= a) return '';
  const [x1, y1] = pt(a); const [x2, y2] = pt(b);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
}

const mark = (v: number, color: string) => {
  const [x1, y1] = pt(v, R - 16); const [x2, y2] = pt(v, R + 12);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeLinecap="round" />;
};

const TICKS = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

export function Stoomdruk({ steam, debt, visible }: { steam: number; debt: number; visible: boolean }) {
  const e = steam - debt;
  const zone = zoneOf(steam, debt);
  const deg = 90 - (ang(e) * 180) / Math.PI; // rotate from pointing up
  return (
    <div className={`stoomdruk ${visible ? '' : 'dim'}`} aria-label={`Stoomdruk ${e.toFixed(1)}`}>
      <svg viewBox="0 0 220 130" width="100%">
        <path d={arc(MIN, COLD_EVAL)} className="z z-cold" />
        <path d={arc(COLD_EVAL, 0)} className="z z-amber" />
        <path d={arc(0, GOLD_EVAL)} className="z z-green" />
        <path d={arc(GOLD_EVAL, MAX)} className="z z-gold" />
        {TICKS.map(v => {
          const [x, y] = pt(v, R - 26);
          return <text key={v} x={x} y={y + 4} className="tick">{v > 0 ? `+${v}` : v}</text>;
        })}
        {mark(0, '#e74c3c')}
        {mark(GOLD_EVAL, '#ffd700')}
        <g className="needle" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} stroke="#e8e8e8" strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={8} fill="#b87333" stroke="#e8e8e8" strokeWidth={2} />
      </svg>
      <div className={`gauge-label zone-${zone}`}>
        {visible ? UI.zones[zone] : 'Stoomdruk'} <span className="mono">{visible ? `${e >= 0 ? '+' : ''}${e.toFixed(1)}` : ''}</span>
      </div>
    </div>
  );
}
