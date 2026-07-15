import React, { useState, useEffect } from 'react';

const ICONS = ['🍕','🍝','🇮🇹','🏔️','🌊','🍅','🫒','☕','🎭','🏛️','🍦','🏎️','🧀','🌿','🎵','🌺'];

export default function GameTitle() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % ICONS.length), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="game-title">
      <span className="game-title__icon" key={idx}>{ICONS[idx]}</span>
      <span className="game-title__text">Bemeester die Italiaanse Opening</span>
      <span className="game-title__icon" key={idx + 100}>{ICONS[(idx + 3) % ICONS.length]}</span>
    </div>
  );
}
