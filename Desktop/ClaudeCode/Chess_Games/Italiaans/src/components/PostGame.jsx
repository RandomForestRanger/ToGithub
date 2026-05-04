import React from 'react';
import GiacomoFace from './GiacomoFace.jsx';
import { BADGES } from '../data/badges.js';

const REASON_LABELS = {
  checkmate:   'Mat toegedien! 🏆',
  mated:       'Jy is gemateer',
  stalemate:   'Patstelling — remise',
  draw:        'Gelykspel',
  moves_complete: '50 skuiwe voltooi',
};

export default function PostGame({ result, profile, onPlayAgain, onTrophy }) {
  if (!result) return null;

  const { totalScore, moveLog = [], sessionBadges = [], reason, mateDelivered } = result;
  const MAX_SCORE = 200;
  const pct = Math.round((totalScore / MAX_SCORE) * 100);

  // 3 key moments: highest scoring move, lowest scoring move, and best consecutive streak
  const keyMoments = buildKeyMoments(moveLog);

  const scoreColour =
    pct >= 80 ? 'var(--success)'
    : pct >= 50 ? 'var(--accent)'
    : 'var(--danger)';

  const expression =
    mateDelivered        ? 'celebrating'
    : pct >= 80          ? 'ecstatic'
    : pct >= 60          ? 'pleased'
    : pct >= 40          ? 'neutral'
    : 'frustrated';

  const giacomoSign =
    mateDelivered        ? 'MAGNIFICO! Mat! Giacomo dans van trots!'
    : pct >= 80          ? 'Bravissimo! (Uitstekend!) Giacomo is trots op jou!'
    : pct >= 60          ? 'Buono! (Goed!) Goeie poging — oefen meer!'
    : pct >= 40          ? 'Non male... (Nie sleg nie...) Maar ons kan beter doen.'
    : 'O ertappel... Maar jy het geleer. Terug na akademie!';

  // Newly unlocked vs previously held
  const allEarned = profile?.badges ?? [];
  const prevEarned = allEarned.filter(id => !sessionBadges.includes(id));

  return (
    <div className="postgame">
      {/* Header */}
      <div className="postgame__header glass">
        <GiacomoFace expression={expression} size={80} />
        <div className="postgame__header-text">
          <div className="postgame__reason">{REASON_LABELS[reason] ?? 'Spel Verby'}</div>
          <div className="postgame__giacomo-sign">{giacomoSign}</div>
        </div>
      </div>

      {/* Score block */}
      <div className="postgame__score-block glass">
        <div className="postgame__score-label">Finale Telling</div>
        <div className="postgame__score-value" style={{ color: scoreColour }}>
          {totalScore}
          <span className="postgame__score-max">/{MAX_SCORE}</span>
        </div>
        <div className="postgame__score-pct" style={{ color: scoreColour }}>{pct}%</div>

        <div className="postgame__score-bar">
          <div
            className="postgame__score-fill"
            style={{ width: `${pct}%`, background: scoreColour }}
          />
        </div>

        {profile && (
          <div className="postgame__best">
            {totalScore > (profile.besteTelling ?? 0)
              ? <span className="postgame__new-record">✨ Nuwe rekord!</span>
              : <span className="postgame__prev-best">Beste: {profile.besteTelling}</span>
            }
          </div>
        )}
      </div>

      {/* Key moments */}
      {keyMoments.length > 0 && (
        <div className="postgame__moments glass">
          <div className="postgame__section-title">Sleutel Oomblikke</div>
          {keyMoments.map((m, i) => (
            <div key={i} className="postgame__moment">
              <span className="postgame__moment-num">Skuif {m.moveNumber}</span>
              <span className="postgame__moment-san">{m.san}</span>
              <span className="postgame__moment-stars">{'⭐'.repeat(m.score)}</span>
              <span className="postgame__moment-label">{m._explanation}</span>
            </div>
          ))}
        </div>
      )}

      {/* Badges earned this session */}
      {sessionBadges.length > 0 && (
        <div className="postgame__badges glass">
          <div className="postgame__section-title">Kentekens Verdien 🏅</div>
          <div className="postgame__badge-list">
            {sessionBadges.map(id => {
              const b = BADGES.find(x => x.id === id);
              if (!b) return null;
              return (
                <div key={id} className="postgame__badge-item postgame__badge-item--new" title={b.beskrywing}>
                  <span className="postgame__badge-emoji">{b.emoji}</span>
                  <span className="postgame__badge-name">{b.naam}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All previously held badges (compact) */}
      {prevEarned.length > 0 && (
        <div className="postgame__badges glass">
          <div className="postgame__section-title">Jou Kenteken Kas</div>
          <div className="postgame__badge-pills">
            {prevEarned.map(id => {
              const b = BADGES.find(x => x.id === id);
              return b ? (
                <span key={id} className="postgame__badge-pill" title={b.naam}>{b.emoji}</span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="postgame__actions">
        <button className="btn-begin" onClick={onPlayAgain}>Speel Weer</button>
        <button className="postgame__trophy-btn" onClick={onTrophy}>🏆 Trofee Kamer</button>
      </div>
    </div>
  );
}

function buildKeyMoments(moveLog) {
  if (!moveLog.length) return [];

  // "Plan" moment: last move that scored 4, excluding move 1.
  // Falls back to the highest-scoring move (also excluding move 1).
  const eligible = moveLog.filter(m => m.moveNumber > 1);
  const lastPerfect = [...eligible].reverse().find(m => m.score === 4);
  const bestFallback = [...eligible].sort((a, b) => b.score - a.score)[0];
  const planMove = lastPerfect ?? bestFallback;

  // "Blunder" moment: lowest-scoring move, excluding move 1 and the plan move.
  const worstPool = eligible.filter(m => m.moveNumber !== planMove?.moveNumber);
  const worst = worstPool.length
    ? worstPool.reduce((a, b) => a.score <= b.score ? a : b)
    : null;

  // Trap moment: label contains "val", not already shown.
  const trapMoment = moveLog.find(m =>
    m.label && m.label.toLowerCase().includes('val') &&
    m.moveNumber !== planMove?.moveNumber &&
    m.moveNumber !== worst?.moveNumber
  );

  const planLabel = lastPerfect
    ? `Tot hier het jy mooi by die plan gebly — skuif ${lastPerfect.moveNumber}.`
    : 'Jou beste skuif van die spel.';

  const moments = [];
  if (planMove) moments.push({ ...planMove, _type: 'best', _explanation: planLabel });
  if (worst)    moments.push({ ...worst,    _type: 'worst', _explanation: 'Hier het jy geflater.' });
  if (trapMoment) moments.push({ ...trapMoment, _type: 'trap', _explanation: "Hierso het jy die opponent se val raakgesien." });

  return moments.slice(0, 3).sort((a, b) => a.moveNumber - b.moveNumber);
}
