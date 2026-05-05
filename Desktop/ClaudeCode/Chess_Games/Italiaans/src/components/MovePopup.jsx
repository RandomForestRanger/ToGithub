import React, { useEffect, useRef } from 'react';
import GiacomoFace from './GiacomoFace.jsx';
import { scoreToExpression } from '../data/giacomoLines.js';

export default function MovePopup({ data, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    // Use the duration set by useGame (longer when a layer is announced)
    timerRef.current = setTimeout(() => {
      onDismiss?.();
    }, data.duration ?? 7500);
    return () => clearTimeout(timerRef.current);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { score, commentaar, variationName, expression, layerAnnouncement, midgamePanel, italyFact, focusMode } = data;
  const expr = expression ?? scoreToExpression(score, score === 'mate');
  const safeScore = Math.max(1, Math.min(4, score ?? 1));

  const scoreColour =
    safeScore === 4 ? 'var(--success)'
    : safeScore === 3 ? '#7ed6a5'
    : safeScore === 2 ? 'var(--accent)'
    : 'var(--danger)';

  if (focusMode) {
    return (
      <div
        className="move-popup move-popup--focus glass"
        onClick={() => { clearTimeout(timerRef.current); onDismiss?.(); }}
      >
        <span className="move-popup__pts" style={{ color: scoreColour }}>{safeScore}</span>
        <span className="move-popup__pts-max">/ 4</span>
        <span className="move-popup__stars">{'⭐'.repeat(safeScore)}</span>
      </div>
    );
  }

  return (
    <div className="move-popup glass" onClick={() => { clearTimeout(timerRef.current); onDismiss?.(); }}>
      {variationName && (
        <div className="move-popup__variation">{variationName}</div>
      )}

      <div className="move-popup__face">
        <GiacomoFace expression={expr} size={80} />
      </div>

      <div className="move-popup__body">
        <div className="move-popup__score-row">
          <span className="move-popup__pts" style={{ color: scoreColour }}>
            {safeScore}
          </span>
          <span className="move-popup__pts-max">/ 4 punte</span>
          <span className="move-popup__stars">{'⭐'.repeat(safeScore)}</span>
        </div>
        {commentaar && <div className="move-popup__comment">{commentaar}</div>}
      </div>

      {layerAnnouncement && (
        <div className="move-popup__layer">
          <div className="move-popup__layer-titel">{layerAnnouncement.titel}</div>
          <ul className="move-popup__layer-punte">
            {layerAnnouncement.punte.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {midgamePanel && (
        <div className="move-popup__layer move-popup__layer--midgame">
          <div className="move-popup__layer-titel">{midgamePanel.titel}</div>
          <ul className="move-popup__layer-punte">
            {midgamePanel.punte.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {italyFact && (
        <div className="move-popup__italy-fact">
          <div className="move-popup__italy-header">
            🇮🇹 <span className="move-popup__italy-kategorie">{italyFact.kategorie}</span>
          </div>
          <div className="move-popup__italy-feit">{italyFact.feit}</div>
        </div>
      )}

      <div className="move-popup__dismiss-hint">Klik om toe te maak</div>
    </div>
  );
}
