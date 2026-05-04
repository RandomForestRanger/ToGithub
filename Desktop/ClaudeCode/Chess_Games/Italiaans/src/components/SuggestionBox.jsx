import React from 'react';

export default function SuggestionBox({ bestMove }) {
  if (!bestMove) return null;
  return (
    <div className="suggestion-box glass">
      <div className="suggestion-box__label">Beste skuif</div>
      <div className="suggestion-box__move">{bestMove}</div>
    </div>
  );
}
