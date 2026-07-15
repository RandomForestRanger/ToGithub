import React from 'react';

const LAYER_LABELS = ['I', 'II', 'III'];
const LAYER_NAMES  = ['Plant die Vlag', 'Kies Ruiter Pad', 'Eis die Sentrum'];

export default function ScoreBar({
  profileName,
  totalScore,
  maxScore,
  whiteMovesPlayed,
  maxMoves,
  layerStatus,
  variationName,
  phase,
}) {
  const pct        = maxScore > 0 ? Math.min(100, (totalScore / maxScore) * 100) : 0;
  const isThinking = phase === 'scoring' || phase === 'black_thinking';

  return (
    <header className="topbar">
      {/* Left — player identity */}
      <div className="topbar__player">
        <span className="topbar__player-initial">{profileName?.[0] ?? '?'}</span>
        <span className="topbar__player-name">{profileName}</span>
      </div>

      {/* Centre — score + bar + move counter */}
      <div className="topbar__centre">
        <div className="topbar__score-line">
          <span className="topbar__score-num">{totalScore}</span>
          <span className="topbar__score-denom">/{maxScore}</span>
          {isThinking && <span className="topbar__thinking">⏳</span>}
        </div>
        <div className="topbar__track">
          <div className="topbar__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="topbar__moves-centre">
          Skuif <strong>{whiteMovesPlayed}</strong>
          <span className="topbar__moves-max"> / {maxMoves}</span>
        </div>
        {variationName && (
          <div className="topbar__variation">{variationName}</div>
        )}
      </div>

      {/* Right — layers only */}
      <div className="topbar__right">
        <div className="topbar__layers">
          {LAYER_LABELS.map((lbl, i) => (
            <span
              key={lbl}
              className={`topbar__layer-dot ${layerStatus > i ? 'topbar__layer-dot--done' : ''}`}
              title={LAYER_NAMES[i]}
            >
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
