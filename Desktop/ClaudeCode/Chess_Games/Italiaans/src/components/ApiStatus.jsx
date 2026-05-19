// Temporary diagnostic overlay — shows live status of each API/resource.
// Remove this component (and its import in GameScreen.jsx) before final deployment.
//
// Probes fire once on mount using the starting position so they don't interfere
// with in-game traffic, and reuse the shared cache in lichessApi.js.

import React, { useState, useEffect } from 'react';
import { fetchExplorerMoves, fetchCloudEval } from '../engine/lichessApi.js';
import { init as initStockfish } from '../engine/stockfishWorker.js';
import { OPENING_TREE } from '../data/openingTree.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const INDICATORS = [
  { key: 'tree',      label: 'Tree' },
  { key: 'explorer',  label: 'Explorer' },
  { key: 'cloudeval', label: 'Cloud Eval' },
  { key: 'stockfish', label: 'Stockfish' },
];

const COLOUR = { loading: '#666', ok: '#2ecc71', error: '#e74c3c' };

export default function ApiStatus() {
  const [s, setS] = useState({
    tree: 'loading', explorer: 'loading', cloudeval: 'loading', stockfish: 'loading',
  });

  useEffect(() => {
    // Opening tree — synchronous; just check it has entries
    setS(prev => ({
      ...prev,
      tree: Object.keys(OPENING_TREE).length > 5 ? 'ok' : 'error',
    }));

    // Lichess Opening Explorer
    fetchExplorerMoves(START_FEN)
      .then(data => setS(prev => ({
        ...prev, explorer: data?.moves?.length > 0 ? 'ok' : 'error',
      })))
      .catch(() => setS(prev => ({ ...prev, explorer: 'error' })));

    // Lichess Cloud Eval
    fetchCloudEval(START_FEN, 1)
      .then(data => setS(prev => ({
        ...prev, cloudeval: data?.pvs?.length > 0 ? 'ok' : 'error',
      })))
      .catch(() => setS(prev => ({ ...prev, cloudeval: 'error' })));

    // Stockfish WASM worker
    initStockfish()
      .then(() => setS(prev => ({ ...prev, stockfish: 'ok' })))
      .catch(() => setS(prev => ({ ...prev, stockfish: 'error' })));
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 8,
      left: 8,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {INDICATORS.map(({ key, label }) => (
        <div key={key} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.6rem',
          lineHeight: 1,
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: COLOUR[s[key]],
            flexShrink: 0,
            boxShadow: s[key] === 'ok' ? `0 0 4px ${COLOUR.ok}` : 'none',
          }} />
          <span style={{ color: '#999', letterSpacing: '0.03em' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
