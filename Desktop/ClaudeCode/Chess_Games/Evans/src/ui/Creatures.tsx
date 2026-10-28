// Sea life for the Kelpwoud. All of it swims BEHIND the kelp (Kelpwoud renders it before the fronds).
// Small fish and crabs live there all the time; the moray eel, dolphin and whale shark are visitors
// that pass now and then (and on cheat keys E, D and W).
import { useEffect, useMemo, useRef, useState } from 'react';
import { ribbon, rng } from './kelpShapes';

type Box = [number, number, number, number];
type Pt = [number, number];
const f1 = (n: number) => n.toFixed(1);

// ---------- small fish ----------

// Fish colours: each little family (school) shares one colour. [body, tail/fins shade]
const FISH_COLOURS: [string, string][] = [
  ['#f2c230', '#d89c14'], // yellow
  ['#f0862c', '#d9661c'], // orange
  ['#3f74d6', '#2a55a8'], // blue
  ['#86c9ef', '#5aa6d4'], // light blue
  ['#1fa89c', '#13807a'], // teal
  ['#a3b0b6', '#7d8b92'], // grey
];

/** Small fish in little families at different depths: farther ones are fainter. Like swims with like. */
export function SmallFish({ box, ground }: { box: Box; ground: number }) {
  const schools = useMemo(() => {
    const rand = rng('fish2');
    return [0.18, 0.31, 0.44, 0.57, 0.68, 0.8].map((fy, i) => {
      const far = i % 2 === 0;
      const [body, shade] = FISH_COLOURS[i % FISH_COLOURS.length];
      return {
        y: box[1] + (ground - box[1]) * fy + (rand() - 0.5) * 50,
        from: box[0] - 160, to: box[0] + box[2] + 160,
        size: far ? 0.55 : 0.75, far,
        dur: (far ? 80 : 60) + rand() * 25, delay: -rand() * 80,
        mates: [[[0, 0], [-22, 9], [-34, -6]], [[0, 0], [-20, -8]], [[0, 0]]][i % 3],
        body, shade,
      };
    });
  }, [box, ground]);
  return (
    <g className="sea-fish">
      {schools.map((s, i) => (
        <g key={i} className={`swim ${s.far ? 'far' : ''}`}
          style={{ ['--from' as string]: `${s.from}px`, ['--to' as string]: `${s.to}px`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}>
          {s.mates.map(([dx, dy], k) => (
            <g key={k} transform={`translate(${dx} ${s.y + dy}) scale(${s.size})`}>
              <g className="fish2" style={{ animationDelay: `${-k * 0.7}s` }}>
                <path d="M-11 0 L-19 -6 C-17 -2 -17 2 -19 6 Z" className="fish2-tail" style={{ fill: s.shade, animationDelay: `${-k * 0.23}s` }} />
                <path d="M-12 0 C-8 -7 4 -8 11 -2 C12.5 -1 12.5 1 11 2 C4 8 -8 7 -12 0 Z" className="fish2-body" style={{ fill: s.body }} />
                <path d="M-3 -6.2 C0 -10 4 -9.5 6 -6.4" className="fish2-fin" />
                <path d="M2 2.5 C0 5 -2 6 -4.5 6" className="fish2-fin" />
                <circle cx="7.4" cy="-1.3" r="1.3" className="fish2-eye" />
                <circle cx="7.9" cy="-1.7" r="0.45" className="fish2-glint" />
              </g>
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

// ---------- crabs ----------

// One visit lasts about a minute (emerge, scurry, pause, scurry back, burrow); the rest of the cycle the
// crab stays buried. Three crabs, a third of a cycle apart: one visit roughly every 3 minutes.
const CRAB_DUR = 540;            // s per cycle
const CRAB_FIRST = 30;           // s after the forest opens before the first crab appears
const V = { up: 3, walk1: 21.6, pause: 30.2, walk2: 50.4, burrow: 54.7, gone: 59 }; // visit timeline, s
const pc = (sec: number) => (sec / CRAB_DUR) * 100;

/** Walk + leg keyframes, generated so the legs only move while the crab walks (they rest in the pause). */
function crabGaitCss(): string {
  const walks: [number, number][] = [[pc(V.up), pc(V.walk1)], [pc(V.pause), pc(V.walk2)]];
  const stops: string[] = [];
  const step = pc(0.25); // one leg beat ~0.25 s
  const at = (p: number, a: number) => stops.push(`${p.toFixed(2)}% { transform: rotate(${a}deg); }`);
  at(0, 0);
  for (const [a, b] of walks) {
    at(a, 0);
    let flip = 1;
    for (let p = a + step; p < b; p += step) { at(p, 7 * flip); flip = -flip; }
    at(b, 0);
  }
  at(100, 0);
  const body = stops.join(' ');
  const mirrored = body.replace(/rotate\((-?[\d.]+)deg\)/g, (_, d) => `rotate(${-Number(d)}deg)`);
  const walk = `@keyframes crabWalk {
    0% { opacity: 0; transform: translate(var(--x0), 10px); }
    ${pc(V.up)}% { opacity: 1; transform: translate(var(--x0), 0); }
    ${pc(V.walk1)}% { transform: translate(var(--x1), 0); }
    ${pc(V.pause)}% { transform: translate(var(--x1), 0); }
    ${pc(V.walk2)}% { transform: translate(var(--x2), 0); }
    ${pc(V.burrow)}% { opacity: 1; transform: translate(var(--x2), 0); }
    ${pc(V.gone)}% { opacity: 0; transform: translate(var(--x2), 10px); }
    100% { opacity: 0; transform: translate(var(--x2), 10px); } }`;
  return `@keyframes crabLegsL { ${body} } @keyframes crabLegsR { ${mirrored} } ${walk}`;
}

function crabLegs(side: 1 | -1) {
  const legs: string[] = [];
  for (let i = 0; i < 4; i++) {
    const y0 = 1 + i * 2.8, reach = 23 - i * 1.5;
    legs.push(`M${side * 11} ${f1(y0)} L${side * (reach - 6)} ${f1(y0 - 5 + i * 2.5)} L${side * reach} ${f1(y0 + 8 + i * 1.2)}`);
  }
  return legs;
}

export function Crabs({ box, ground }: { box: Box; ground: number }) {
  const crabs = useMemo(() => {
    const rand = rng('crabs');
    return [0.18, 0.5, 0.82].map((fx, i) => {
      const x0 = box[0] + box[2] * fx + (rand() - 0.5) * 120;
      const dir = i % 2 ? -1 : 1;
      return { x0, x1: x0 + dir * (90 + rand() * 50), x2: x0 + dir * (30 + rand() * 30), y: ground + 20 + rand() * 22, size: 0.85 + rand() * 0.3, delay: -(CRAB_DUR - CRAB_FIRST - i * CRAB_DUR / 3) };
    });
  }, [box, ground]);
  const css = useMemo(crabGaitCss, []);
  const L = useMemo(() => crabLegs(-1), []), R = useMemo(() => crabLegs(1), []);
  return (
    <g className="crabs">
      <style>{css}</style>
      {crabs.map((c, i) => {
        const timing = { animationDuration: `${CRAB_DUR}s`, animationDelay: `${c.delay}s` };
        return (
          <g key={i} className="crab-walk" style={{ ['--x0' as string]: `${c.x0}px`, ['--x1' as string]: `${c.x1}px`, ['--x2' as string]: `${c.x2}px`, ...timing }}>
            <g transform={`translate(0 ${c.y}) scale(${c.size})`}>
              <ellipse cx="0" cy="12" rx="22" ry="3.5" className="crab-shadow" />
              <g className="crab-legs-l" style={timing}>{L.map((d, k) => <g key={k}><path d={d} className="crab-ink" /><path d={d} className="crab-leg" /></g>)}</g>
              <g className="crab-legs-r" style={timing}>{R.map((d, k) => <g key={k}><path d={d} className="crab-ink" /><path d={d} className="crab-leg" /></g>)}</g>
              {[-1, 1].map(s => (
                <g key={s} className={`crab-claw ${s < 0 ? 'l' : 'r'}`}>
                  <path d={`M${s * 9} -3 L${s * 17} -10`} className="crab-ink" />
                  <path d={`M${s * 9} -3 L${s * 17} -10`} className="crab-leg" />
                  <path d={`M${s * 15} -9 C${s * 23} -8 ${s * 27} -16 ${s * 23} -22 L${s * 20} -16 L${s * 16} -19 C${s * 14} -15 ${s * 13} -11 ${s * 15} -9 Z`} className="crab-pincer" />
                </g>
              ))}
              <path d="M-4 -5 L-5.5 -12 M4 -5 L5.5 -12" className="crab-stalk" />
              <circle cx="-5.5" cy="-12.5" r="1.9" className="crab-eye" /><circle cx="5.5" cy="-12.5" r="1.9" className="crab-eye" />
              <path d="M-15 2 C-15 -7 -7 -9 0 -9 C7 -9 15 -7 15 2 C15 8 8 10 0 10 C-8 10 -15 8 -15 2 Z" className="crab-shell" />
              <path d="M-10 -3 C-6 -6 6 -6 10 -3" className="crab-shine" />
              <circle cx="-6" cy="2" r="1.1" className="crab-speck" /><circle cx="5" cy="0" r="1.3" className="crab-speck" /><circle cx="1" cy="5" r="0.9" className="crab-speck" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

// ---------- visitors ----------

export type VisitorKind = 'eel' | 'dolphin' | 'shark';
interface Visitor { id: number; kind: VisitorKind; dir: 1 | -1; y: number; dur: number }

const EVERY_MS: Record<VisitorKind, number> = { eel: 2 * 60_000, dolphin: 4 * 60_000, shark: 7 * 60_000 };
const KEYS: Record<string, VisitorKind> = { e: 'eel', d: 'dolphin', w: 'shark' };

/** Timed visitors plus cheat keys (E eel, D dolphin, W whale shark). Nothing visits under reduced motion. */
export function useVisitors(box: Box, ground: number) {
  const [list, setList] = useState<Visitor[]>([]);
  const next = useRef(1);
  const spawn = (kind: VisitorKind) => {
    const r = Math.random(), depth = ground - box[1];
    const y = kind === 'eel' ? ground - 26 : kind === 'dolphin' ? box[1] + 110 + r * 70 : box[1] + depth * (0.36 + r * 0.14);
    const dur = kind === 'eel' ? 40 : kind === 'dolphin' ? 16 : 75;
    setList(l => [...l.filter(v => v.kind !== kind), { id: next.current++, kind, dir: Math.random() < 0.5 ? 1 : -1, y, dur }]);
  };
  const done = (id: number) => setList(l => l.filter(v => v.id !== id));
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timers = (Object.keys(EVERY_MS) as VisitorKind[]).map(k =>
      window.setInterval(() => { if (!document.hidden) spawn(k); }, EVERY_MS[k]));
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      const k = KEYS[e.key.toLowerCase()];
      if (k) spawn(k);
    };
    window.addEventListener('keydown', onKey);
    return () => { timers.forEach(clearInterval); window.removeEventListener('keydown', onKey); };
  }, [box, ground]); // eslint-disable-line react-hooks/exhaustive-deps
  return { list, done };
}

export function Visitors({ box, list, done, kinds }: { box: Box; list: Visitor[]; done: (id: number) => void; kinds: VisitorKind[] }) {
  return (
    <>
      {list.filter(v => kinds.includes(v.kind)).map(v => {
        const margin = v.kind === 'shark' ? 600 : 300;
        const a = box[0] - margin, b = box[0] + box[2] + margin;
        return (
          <g key={v.id} className={`cross visitor-${v.kind}`} onAnimationEnd={e => { if (e.target === e.currentTarget) done(v.id); }}
            style={{ ['--from' as string]: `${v.dir > 0 ? a : b}px`, ['--to' as string]: `${v.dir > 0 ? b : a}px`, animationDuration: `${v.dur}s` }}>
            <g transform={`translate(0 ${v.y}) scale(${v.dir} 1)`}>
              {v.kind === 'eel' ? <MorayEel /> : v.kind === 'dolphin' ? <Dolphin /> : <WhaleShark />}
            </g>
          </g>
        );
      })}
    </>
  );
}

// ---------- moray eel ----------

/** Undulating body frames (same path structure, so SMIL can morph between them). Head at +x. */
function eelFrames() {
  const L = 300, n = 44, frames = 6;
  const centre = (t: number, ph: number): Pt => [-L / 2 + L * t, (3 + 15 * (1 - t) ** 1.3) * Math.sin(2 * Math.PI * 1.5 * t - ph)];
  const w = (t: number) => {
    const body = 3 + 17 * Math.min(1, t / 0.3);
    return t > 0.88 ? body * Math.sqrt(Math.max(0.05, (1 - t) / 0.12)) * 0.9 + 4 : body;
  };
  const out = { body: [] as string[], fin: [] as string[], belly: [] as string[], eye: [] as Pt[], jaw: [] as string[] };
  for (let k = 0; k <= frames; k++) {
    const ph = (k / frames) * 2 * Math.PI;
    const at = (t: number) => centre(t, ph);
    out.body.push(ribbon(at, w, n).outline);
    // dorsal fin: a soft frill riding on the back
    out.fin.push(ribbon(t => { const p = at(0.08 + t * 0.78); return [p[0], p[1] - w(0.08 + t * 0.78) / 2 - 1.2]; }, t => 4.5 * Math.sin(Math.PI * t) + 0.4, 30).outline);
    const pts: string[] = [];
    for (let i = 0; i <= 20; i++) { const t = 0.2 + 0.66 * i / 20, p = at(t); pts.push(`${f1(p[0])} ${f1(p[1] + w(t) * 0.28)}`); }
    out.belly.push('M' + pts.join('L'));
    const e = at(0.94); out.eye.push([e[0], e[1] - 3.5]);
    const j0 = at(0.9), j1 = at(0.995);
    out.jaw.push(`M${f1(j0[0])} ${f1(j0[1] + 2)} Q${f1((j0[0] + j1[0]) / 2)} ${f1(j1[1] + 5)} ${f1(j1[0])} ${f1(j1[1] + 1)}`);
  }
  return out;
}

function MorayEel() {
  const F = useMemo(eelFrames, []);
  const anim = (vals: string[]) => <animate attributeName="d" values={vals.join(';')} dur="2.4s" repeatCount="indefinite" />;
  return (
    <g className="eel">
      <defs>
        <pattern id="eelSpots" patternUnits="userSpaceOnUse" width="13" height="11" patternTransform="rotate(25)">
          <circle cx="3" cy="3" r="2.1" fill="#3b4a1c" /><circle cx="9.5" cy="8" r="1.6" fill="#3b4a1c" />
        </pattern>
      </defs>
      <path d={F.fin[0]} className="eel-fin">{anim(F.fin)}</path>
      <path d={F.body[0]} className="eel-body">{anim(F.body)}</path>
      <path d={F.body[0]} fill="url(#eelSpots)" opacity=".55">{anim(F.body)}</path>
      <path d={F.belly[0]} className="eel-belly">{anim(F.belly)}</path>
      <path d={F.jaw[0]} className="eel-jaw">{anim(F.jaw)}</path>
      <circle r="2.4" cx={F.eye[0][0]} cy={F.eye[0][1]} className="eel-eye">
        <animate attributeName="cx" values={F.eye.map(p => f1(p[0])).join(';')} dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="cy" values={F.eye.map(p => f1(p[1])).join(';')} dur="2.4s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ---------- dolphin ----------

function Dolphin() {
  return (
    <g className="porpoise">
      <defs>
        <linearGradient id="dolphinG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f7896" /><stop offset=".6" stopColor="#6fa5bd" /><stop offset="1" stopColor="#b9dbe3" />
        </linearGradient>
      </defs>
      <g className="dolphin-flukes">
        <path d="M-60 1 L-75 -11 C-71 -4 -71 0 -67 2 C-71 4 -71 8 -75 15 Z" className="dolphin-part" />
      </g>
      <path d="M16 -15 C12 -26 6 -32 -1 -33 C4 -26 4 -20 0 -14 Z" className="dolphin-part" />
      <path d="M-62 2 C-50 -8 -20 -16 10 -15 C30 -14 44 -10 52 -5 C58 -4 66 -3 71 -1 C66 2 58 3 50 3 C40 10 10 14 -20 10 C-40 8 -54 6 -62 2 Z" className="dolphin-body" />
      <path d="M-40 7 C-10 12 25 8 46 3 C30 6 0 9 -40 7 Z" className="dolphin-belly" />
      <path d="M18 6 C14 14 8 18 2 20 C8 12 10 8 10 6 Z" className="dolphin-part" />
      <path d="M45 -4 C47 -1 50 0 53 0" className="dolphin-line" />
      <circle cx="47" cy="-6" r="1.7" className="dolphin-eye" />
    </g>
  );
}

// ---------- whale shark ----------
// (head at +x; dorsal fins sweep back toward the tail: fixed 28 Oct, they leaned forward)

function WhaleShark() {
  return (
    <g className="whaleshark">
      <defs>
        <pattern id="sharkSpots" patternUnits="userSpaceOnUse" width="22" height="18">
          <circle cx="5" cy="5" r="2.6" fill="#eef6ea" /><circle cx="16" cy="13" r="2.2" fill="#eef6ea" /><circle cx="15" cy="3" r="1.4" fill="#eef6ea" />
        </pattern>
        <clipPath id="sharkClip">
          <path d="M-150 0 C-120 -22 -40 -48 60 -46 C120 -44 160 -30 176 -12 C182 -6 182 6 176 12 C150 26 80 34 20 34 C-60 32 -120 18 -150 0 Z" />
        </clipPath>
      </defs>
      <g className="shark-tail">
        <path d="M-146 0 L-196 -72 C-186 -42 -178 -20 -170 -4 L-186 38 C-175 24 -163 11 -148 5 Z" className="shark-part" />
      </g>
      <path d="M53 -45 C41 -78 27 -88 14 -89 C21 -74 19 -58 10 -44 Z" className="shark-part" />
      <path d="M-82 -15 C-86 -28 -92 -32 -99 -33 C-96 -26 -96 -20 -100 -13 Z" className="shark-part" />
      <path d="M-150 0 C-120 -22 -40 -48 60 -46 C120 -44 160 -30 176 -12 C182 -6 182 6 176 12 C150 26 80 34 20 34 C-60 32 -120 18 -150 0 Z" className="shark-body" />
      <g clipPath="url(#sharkClip)">
        <rect x="-160" y="-60" width="350" height="64" fill="url(#sharkSpots)" opacity=".85" />
        {[-110, -70, -30, 10, 50, 90].map(x => <path key={x} d={`M${x} -50 C${x + 6} -20 ${x + 6} 0 ${x + 2} 10`} className="shark-ridge" />)}
        <path d="M-120 12 C-40 30 60 36 150 20 C170 15 180 10 184 4 L184 40 L-150 40 Z" className="shark-belly" />
      </g>
      <path d="M90 20 C76 44 56 58 38 64 C52 46 62 30 64 22 Z" className="shark-part" />
      {[124, 132, 140].map(x => <path key={x} d={`M${x} -18 C${x - 4} -8 ${x - 4} 4 ${x} 12`} className="shark-gill" />)}
      <path d="M181 3 C172 9 160 10 148 8" className="shark-mouth" />
      <circle cx="160" cy="-8" r="2.4" className="shark-eye" />
    </g>
  );
}
