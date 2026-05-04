import React, { useState } from 'react';

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExplanationModal({ data, onDismiss }) {
  const [chosen, setChosen] = useState(null);
  const [opsies] = useState(() => shuffled(data?.opsies ?? []));

  if (!data) return null;

  function handleChoice(opt) {
    if (chosen !== null) return; // prevent double-click
    setChosen(opt.teks);
    // Brief visual feedback before dismissing
    setTimeout(() => {
      onDismiss(opt.korrek);
      setChosen(null);
    }, 300);
  }

  return (
    <div className="explanation-overlay">
      <div className="explanation-modal glass">
        <div className="explanation-modal__question">{data.vraag}</div>
        <div className="explanation-modal__options">
          {opsies.map((opt, i) => (
            <button
              key={i}
              className={[
                'explanation-modal__btn',
                chosen === opt.teks ? (opt.korrek ? 'explanation-modal__btn--correct' : 'explanation-modal__btn--wrong') : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleChoice(opt)}
              disabled={chosen !== null}
            >
              <span className="explanation-modal__letter">{String.fromCharCode(65 + i)}</span>
              {opt.teks}
            </button>
          ))}
        </div>
        <div className="explanation-modal__hint">Kies 'n rede — geen kansellering nie</div>
      </div>
    </div>
  );
}
