import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import { LINES } from '../data';
import { UI } from '../content/kaptein';
import { bishopBeams, type RoundController } from '../game/controller';
import { Stoomdruk } from './Stoomdruk';

function useWidth(ref: React.RefObject<HTMLElement>, max: number) {
  const [w, setW] = useState(360);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.min(max, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, max]);
  return w;
}

export function GameScreen({ ctl, lights, onEnd }: { ctl: RoundController; lights: boolean; onEnd: () => void }) {
  const [, force] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const boardWrap = useRef<HTMLDivElement>(null);
  const width = useWidth(boardWrap, 560);
  const movesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => ctl.onChange(() => force(x => x + 1)), [ctl]);
  useEffect(() => { movesEnd.current?.scrollIntoView({ block: 'nearest' }); }, [ctl.moves.length]);
  useEffect(() => {
    if (!ctl.popup) return;
    const t = setTimeout(() => ctl.closePopup(), 7000);
    return () => clearTimeout(t);
  }, [ctl.popup, ctl]);

  const c = ctl.chess;
  const tryMove = (from: string, to: string) => {
    const ok = ctl.userMove(from, to);
    setSel(null);
    return ok;
  };
  const onSquareClick = (sq: Square) => {
    if (sel) {
      if (sq === sel) { setSel(null); return; }
      const legal = c.moves({ square: sel as Square, verbose: true }).some(m => m.to === sq);
      if (legal) { tryMove(sel, sq); return; }
    }
    const p = c.get(sq);
    setSel(p && p.color === 'w' && c.turn() === 'w' ? sq : null);
  };

  // square styles: last move, bishop lights, selection, legal dots
  const styles: Record<string, CSSProperties> = {};
  const add = (sq: string, s: CSSProperties) => { styles[sq] = { ...styles[sq], ...s }; };
  if (ctl.lastMove) ctl.lastMove.forEach(sq => add(sq, { background: 'rgba(243,156,18,0.35)' }));
  if (lights) {
    const b = bishopBeams(c);
    b.bak?.squares.forEach(sq => add(sq, { boxShadow: `inset 0 0 0 100px rgba(231,76,60,${b.bakSpark ? 0.22 : 0.1})` }));
    b.stuur?.squares.forEach(sq => add(sq, {
      boxShadow: `${styles[sq]?.boxShadow ? styles[sq].boxShadow + ', ' : ''}inset 0 0 0 100px rgba(46,204,113,${b.stuurSpark ? 0.22 : 0.1})`,
    }));
    if (b.bak) add(b.bak.from, { boxShadow: 'inset 0 0 18px 6px rgba(231,76,60,.85)' });
    if (b.stuur) add(b.stuur.from, { boxShadow: 'inset 0 0 18px 6px rgba(46,204,113,.85)' });
    if (b.stuurSpark) add('f7', { boxShadow: 'inset 0 0 22px 8px rgba(46,204,113,.9)' });
    if (b.bakSpark) ['e7', 'f8'].filter(s => b.bak!.squares.includes(s)).forEach(s => add(s, { boxShadow: 'inset 0 0 22px 8px rgba(231,76,60,.9)' }));
  }
  if (sel) {
    add(sel, { boxShadow: 'inset 0 0 0 4px #f1c40f' });
    c.moves({ square: sel as Square, verbose: true }).forEach(m =>
      add(m.to, { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.4) 22%, transparent 24%)' }));
  }

  const target = ctl.target ? LINES[ctl.target] : null;
  const moveNo = Math.min(20, Math.max(1, Math.ceil(ctl.ply / 2)));
  const pairs: { n: number; w?: (typeof ctl.moves)[number]; b?: (typeof ctl.moves)[number] }[] = [];
  ctl.moves.forEach(m => {
    const n = Math.floor(m.ply / 2) + 1;
    if (m.ply % 2 === 0) pairs.push({ n, w: m }); else if (pairs.length) pairs[pairs.length - 1].b = m;
  });

  return (
    <div className="game">
      <div className="board-col" ref={boardWrap}>
        <Chessboard
          id="main"
          position={c.fen()}
          boardWidth={width}
          onSquareClick={onSquareClick}
          onPieceDrop={(f, t) => tryMove(f, t)}
          isDraggablePiece={({ piece }) => piece.startsWith('w')}
          customSquareStyles={styles}
          customDarkSquareStyle={{ backgroundColor: '#5b7d8f' }}
          customLightSquareStyle={{ backgroundColor: '#d9e4e8' }}
          customBoardStyle={{ borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,.45)' }}
          animationDuration={200}
        />
      </div>
      <aside className="panel">
        <div className="target-banner">
          <span className="tag">{UI.target}</span>
          {target ? <><b>“{target.label}”</b> <span className="mono sub">{target.sub}</span></> : <i>—</i>}
        </div>
        <Stoomdruk steam={ctl.shownSteam} debt={ctl.debt} visible={ctl.steamVisible} />
        <div className="captain">
          <div className="captain-face" aria-hidden>⚓</div>
          <div className="bubble-speech">{ctl.thinking && !ctl.speech ? UI.thinking : ctl.speech || '…'}
            {ctl.thinking && <span className="dots"> · {UI.thinking}</span>}
          </div>
        </div>
        <div className="stat-row">
          <span>{UI.move(moveNo)}</span>
          <span>{UI.points(ctl.score)}</span>
        </div>
        <div className="movelist mono">
          {pairs.map(p => (
            <div key={p.n} className="mrow">
              <span className="mn">{p.n}.</span>
              <span className="mw">{p.w?.san}{p.w && p.w.points !== undefined && (
                <i className={`pchip p${p.w.points ?? 'x'}`}>{p.w.points ?? '…'}</i>)}</span>
              <span className="mb">{p.b?.san}</span>
            </div>
          ))}
          <div ref={movesEnd} />
        </div>
        {ctl.engineError && <div className="warn">{UI.engineDown}</div>}
        {ctl.result && <button className="btn primary" onClick={onEnd}>Verder</button>}
      </aside>

      {ctl.popup && (
        <div className={`popup popup-${ctl.popup.kind}`} onClick={() => ctl.closePopup()} role="status">
          <p>{ctl.popup.text}</p>
          {ctl.popup.note && <p className="note">{ctl.popup.note}</p>}
          {ctl.popup.fen && ctl.popup.arrow && (
            <div className="mini">
              <Chessboard id="mini" position={ctl.popup.fen} boardWidth={180} arePiecesDraggable={false}
                customArrows={[[ctl.popup.arrow[0] as Square, ctl.popup.arrow[1] as Square, 'rgb(46,204,113)']]}
                customDarkSquareStyle={{ backgroundColor: '#5b7d8f' }} customLightSquareStyle={{ backgroundColor: '#d9e4e8' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

