import { GOLD_EVAL } from '../config';
import { UI } from '../content/kaptein';
import { zoneOf } from '../game/controller';

const MIN = -2, MAX = 8;
const CX = 110, CY = 105, R = 85;
const ang = (v: number) => Math.PI * (1 - (Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN));
const pt = (v: number, r = R) => [CX + r * Math.cos(ang(v)), CY - r * Math.sin(ang(v))] as const;

function arc(a: number, b: number) {
  if (b <= a) return '';
  const [x1, y1] = pt(a); const [x2, y2] = pt(b);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
}

export function Stoomdruk({ steam, debt, visible }: { steam: number; debt: number; visible: boolean }) {
  const gold = debt + GOLD_EVAL;
  const zone = zoneOf(steam, debt);
  const deg = 90 - (ang(steam) * 180) / Math.PI; // rotate from pointing up
  const mark = (v: number, color: string) => {
    const [x1, y1] = pt(v, R - 16); const [x2, y2] = pt(v, R + 12);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeLinecap="round" className="gauge-mark" />;
  };
  return (
    <div className={`stoomdruk ${visible ? '' : 'dim'}`} aria-label={`Stoomdruk ${steam.toFixed(1)}`}>
      <svg viewBox="0 0 220 130" width="100%">
        <path d={arc(MIN, 0)} className="z z-cold" />
        <path d={arc(0, Math.min(debt, MAX))} className="z z-amber" />
        <path d={arc(Math.max(debt, MIN), Math.min(gold, MAX))} className="z z-green" />
        <path d={arc(Math.min(gold, MAX), MAX)} className="z z-gold" />
        {[-2, 0, 2, 4, 6, 8].map(v => {
          const [x, y] = pt(v, R - 26);
          return <text key={v} x={x} y={y + 4} className="tick">{v}</text>;
        })}
        {mark(debt, '#e74c3c')}
        {mark(gold, '#ffd700')}
        <g className="needle" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} stroke="#e8e8e8" strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={8} fill="#b87333" stroke="#e8e8e8" strokeWidth={2} />
      </svg>
      <div className={`gauge-label zone-${zone}`}>
        {visible ? UI.zones[zone] : 'Stoomdruk'} <span className="mono">{visible ? `${steam >= 0 ? '+' : ''}${steam.toFixed(1)}` : ''}</span>
      </div>
    </div>
  );
}
