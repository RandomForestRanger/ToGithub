// Die Spookskip (CLAUDE.md section 11a): the contrast case for "time runs out".
// Chapter 1: the same bait (4.b4 Bxb4), but 5.O-O and quiet moves after it; Black castles, develops,
// and keeps the pawn. Chapter 2, "'n ruk later": the pawn ending with those queenside pawns, where
// Black's extra pawn becomes a queen. Both chapters were played and checked by Stockfish
// (tools/ghost_ship.py -> data/ghost_ship.json). Captions are in UI.ghost (kaptein.ts).
import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import raw from '../../data/ghost_ship.json';
import { UI } from '../content/kaptein';
import { numbered, uciToMove } from '../game/chessUtil';
import { CaptainFace } from './CaptainFace';

interface Chapter { key: 'slow' | 'later'; fen: string; moves: string[]; san: string[] }
interface Frame { fen: string; last?: [string, string]; label: string; caption: string; ms: number }

const FAST = 350, SLOW = 1100, HOLD = 3200, ENDING = 480;

/** Every frame of the film, with its caption and how long it stays. */
export function ghostFrames(chapters: Chapter[]): Frame[] {
  const g = UI.ghost;
  const frames: Frame[] = [];
  const [slow, later] = chapters;
  let c = new Chess(slow.fen);
  frames.push({ fen: c.fen(), label: '', caption: g.intro, ms: HOLD + 1500 });
  const castle = slow.san.findIndex((s, i) => i % 2 === 1 && i > 8 && s.startsWith('O-O'));
  let caption = g.intro;
  slow.moves.forEach((u, i) => {
    const m = c.move(uciToMove(u));
    let ms = i < 8 ? FAST : SLOW;
    const next = i === 8 ? g.slowMove : i === castle ? g.castle : i === slow.moves.length - 1 ? g.ready : null;
    if (next) { caption = next; ms = HOLD; }
    frames.push({ fen: c.fen(), last: [m.from, m.to], label: numbered(i, m.san), caption, ms: i === slow.moves.length - 1 ? HOLD + 1500 : ms });
  });
  c = new Chess(later.fen);
  frames.push({ fen: c.fen(), label: '', caption: g.later, ms: HOLD + 2500 });
  later.moves.forEach((u, i) => {
    const m = c.move(uciToMove(u));
    const end = i === later.moves.length - 1;
    frames.push({ fen: c.fen(), last: [m.from, m.to], label: m.san, caption: end ? g.queen : g.walk, ms: end ? 0 : ENDING });
  });
  return frames;
}

export function GhostShip({ onClose }: { onClose: () => void }) {
  const frames = useMemo(() => ghostFrames((raw as { chapters: Chapter[] }).chapters), []);
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bump to replay
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const size = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 72 : 340);

  useEffect(() => {
    if (i >= frames.length - 1) return;
    const t = setTimeout(() => setI(i + 1), frames[i].ms);
    return () => clearTimeout(t);
  }, [i, frames, run]);

  const f = frames[i];
  const done = i >= frames.length - 1;
  const styles: Record<string, React.CSSProperties> = {};
  if (f.last) for (const sq of f.last) styles[sq] = { background: 'rgba(243,156,18,.35)' };
  return (
    <div className="why-backdrop ghost-backdrop" onClick={onClose}>
      <div className="card why-card ghost-card" role="dialog" aria-label={UI.ghost.title} onClick={e => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label={UI.close}>×</button>
        <h2 className="ghost-title">{UI.ghost.title}</h2>
        <div className="ghost-board">
          <Chessboard id="ghost" position={f.fen} boardWidth={size} arePiecesDraggable={false}
            animationDuration={reduced ? 0 : 300} customSquareStyles={styles}
            customDarkSquareStyle={{ backgroundColor: '#7d8f98' }} customLightSquareStyle={{ backgroundColor: '#dfe5e8' }} />
          <div className="mini-caption mono">{f.label || ' '}</div>
        </div>
        <div className="why-say ghost-say">
          <CaptainFace mood={done ? 'worried' : 'steady'} size={56} />
          <p>{f.caption}</p>
        </div>
        <div className="btn-row">
          {done && <button className="btn" onClick={() => { setI(0); setRun(r => r + 1); }}>{UI.ghost.again}</button>}
          <button className="btn primary" onClick={onClose}>{UI.close}</button>
        </div>
      </div>
    </div>
  );
}
