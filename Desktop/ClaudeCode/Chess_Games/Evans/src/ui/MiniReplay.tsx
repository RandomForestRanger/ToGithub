// The MISSED popup's little film: from 4.b4 through his game (quick), a pause on the move he needed
// (green arrow), then the line's route to its end (slower), then a 5-second freeze before onDone.
import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { Popup } from '../game/controller';
import { numbered, uciToMove } from '../game/chessUtil';

const START_MS = 600, HIS_MS = 450, ARROW_MS = 1600, ROUTE_MS = 1000, FREEZE_MS = 5000;

export function MiniReplay({ replay, onDone, size = 200 }: { replay: NonNullable<Popup['replay']>; onDone: () => void; size?: number }) {
  // positions after each move, and each move's numbered SAN
  const steps = useMemo(() => {
    const c = new Chess(replay.fen);
    const fens = [replay.fen], labels: string[] = [], squares: [string, string][] = [];
    replay.moves.forEach((u, i) => {
      const m = c.move(uciToMove(u));
      fens.push(c.fen());
      labels.push(numbered(replay.startPly + i, m.san));
      squares.push([m.from, m.to]);
    });
    return { fens, labels, squares };
  }, [replay]);

  const [i, setI] = useState(0); // number of moves shown
  const [arrow, setArrow] = useState(false);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const n = replay.moves.length;
    let ms: number;
    let next: () => void;
    if (i >= n) { ms = FREEZE_MS; next = onDone; }
    else if (i === replay.needed && !arrow) { ms = i === 0 ? START_MS : HIS_MS; next = () => setArrow(true); }
    else if (i === replay.needed) { ms = ARROW_MS; next = () => { setArrow(false); setI(i + 1); }; }
    else { ms = i === 0 ? START_MS : i < replay.needed ? HIS_MS : ROUTE_MS; next = () => setI(i + 1); }
    const t = setTimeout(next, ms);
    return () => clearTimeout(t);
  }, [i, arrow, replay, onDone]);

  const needSq = steps.squares[replay.needed];
  const last = i > 0 ? steps.squares[i - 1] : null;
  const styles: Record<string, React.CSSProperties> = {};
  if (last) for (const sq of last) styles[sq] = { background: i - 1 >= replay.needed ? 'rgba(46,204,113,.45)' : 'rgba(243,156,18,.35)' };
  const caption = arrow ? `${steps.labels[replay.needed]}!` : i > 0 ? steps.labels[i - 1] : '';

  return (
    <div className="mini">
      <Chessboard id="mini" position={steps.fens[i]} boardWidth={size} arePiecesDraggable={false}
        animationDuration={reduced ? 0 : 250}
        customArrows={arrow && needSq ? [[needSq[0] as Square, needSq[1] as Square, 'rgb(46,204,113)']] : []}
        customSquareStyles={styles}
        customDarkSquareStyle={{ backgroundColor: '#5b7d8f' }} customLightSquareStyle={{ backgroundColor: '#d9e4e8' }} />
      <div className={`mini-caption mono ${i - 1 >= replay.needed || arrow ? 'on-line' : ''}`}>{caption || ' '}</div>
    </div>
  );
}
