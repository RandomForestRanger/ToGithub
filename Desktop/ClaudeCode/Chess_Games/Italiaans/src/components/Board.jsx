import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import GiacomoFace from './GiacomoFace.jsx';

// Board square highlight colours
const HIGHLIGHTS = {
  selected:    { boxShadow: 'inset 0 0 0 4px #f1c40f' },
  lastMove:    { background: 'rgba(100,160,255,0.22)' },
  legalEmpty:  { background: 'radial-gradient(circle, rgba(0,0,0,0.32) 28%, transparent 28%)' },
  legalCapture:{ boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.45)' },
  hint:        { boxShadow: 'inset 0 0 0 4px #3498db' },
};

// Build customSquareStyles from game state
function buildSquareStyles(selectedSquare, legalSquares, lastMove, game) {
  const styles = {};

  // Last-move squares (faint blue)
  if (lastMove?.from) styles[lastMove.from] = { ...HIGHLIGHTS.lastMove };
  if (lastMove?.to)   styles[lastMove.to]   = { ...HIGHLIGHTS.lastMove };

  // Legal move targets
  legalSquares.forEach(sq => {
    const hasPiece = game?.get(sq);
    const base     = styles[sq] || {};
    if (hasPiece) {
      styles[sq] = { ...base, ...HIGHLIGHTS.legalCapture };
    } else {
      // Dot overlay: keep any existing background, add gradient on top
      styles[sq] = {
        ...base,
        background: HIGHLIGHTS.legalEmpty.background,
      };
    }
  });

  // Selected square (yellow ring — applied last so it shows on top)
  if (selectedSquare) {
    styles[selectedSquare] = {
      ...(styles[selectedSquare] || {}),
      ...HIGHLIGHTS.selected,
    };
  }

  return styles;
}

export default function Board({
  position,
  selectedSquare,
  legalSquares,
  lastMove,
  game,            // chess.js instance (for piece lookup on legal squares)
  onSquareClick,
  giacomoExpression,  // 'waiting'|'thinking'|'ecstatic'|...
  giacomoComment,     // string shown below face
  phase,              // current game phase
  disabled,           // bool — disables interaction
  hintArrows = [],    // [[from, to, color], ...] for customArrows
  showHintBtn = false,
  hintLoading = false,
  onUseHint,
}) {
  const containerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(480);

  // Responsive board sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) setBoardWidth(Math.min(480, w));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const squareStyles = buildSquareStyles(selectedSquare, legalSquares, lastMove, game);

  const isInteractive = !disabled && phase === 'player_turn';

  // Board colour overrides — react-chessboard accepts CSSProperties
  // We let the theme CSS variables drive these via inline style strings
  const boardStyle = {
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  return (
    <div className="board-area">
      {/* Chessboard */}
      <div
        ref={containerRef}
        className="board-container"
        style={{ opacity: disabled ? 0.85 : 1 }}
      >
        <Chessboard
          position={position}
          boardWidth={boardWidth}
          boardOrientation="white"
          arePiecesDraggable={false}
          animationDuration={300}
          onSquareClick={(sq) => isInteractive && onSquareClick(sq)}
          customSquareStyles={squareStyles}
          customBoardStyle={boardStyle}
          customArrows={hintArrows}
          customArrowColor="rgba(0,170,100,0.85)"
        />
      </div>

      {/* Hint button — between board and Giacomo bubble */}
      {showHintBtn && (
        <button
          className={`hint-btn${hintLoading ? ' hint-btn--loading' : ''}`}
          onClick={onUseHint}
          title="Wys die Italianer en masjien se aanbeveling (kos 1 punt)"
        >
          💡 {hintLoading ? 'Laai wenk...' : 'Wenk  (−1 pt)'}
        </button>
      )}

      {/* Giacomo avatar + comment */}
      <div className="board-giacomo">
        <GiacomoFace expression={giacomoExpression || 'waiting'} size={72} />
        <div className="board-giacomo__bubble glass">
          {giacomoComment || 'Jou skuif, mio studente...'}
        </div>
      </div>
    </div>
  );
}
