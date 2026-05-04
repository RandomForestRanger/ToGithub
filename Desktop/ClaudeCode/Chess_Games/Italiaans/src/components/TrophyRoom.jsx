import React, { useState } from 'react';
import { BADGES } from '../data/badges.js';
import GiacomoFace from './GiacomoFace.jsx';
import { downloadGameLog, getAllGames } from '../data/gameLogger.js';

const DIFFICULTY_ORDER = ['maklik', 'medium', 'moeilik', 'legendarIes'];
const DIFFICULTY_LABELS = {
  maklik:       'Maklik',
  medium:       'Medium',
  moeilik:      'Moeilik',
  legendarIes:  'Legendaries',
};

export default function TrophyRoom({ allProfiles = [], onBack }) {
  const [activeProfile, setActiveProfile] = useState(
    allProfiles.length > 0 ? allProfiles[0].naam : null
  );
  const [tooltip, setTooltip] = useState(null);

  const profile = allProfiles.find(p => p.naam === activeProfile) ?? null;
  const earned  = profile?.badges ?? [];

  const grouped = DIFFICULTY_ORDER.map(diff => ({
    diff,
    badges: BADGES.filter(b => b.moeilikheid === diff),
  }));

  const totalEarned = earned.length;

  return (
    <div className="trophy-room">
      {/* Header */}
      <div className="trophy-room__header glass">
        <GiacomoFace expression="proud" size={64} />
        <div className="trophy-room__header-text">
          <h1 className="trophy-room__title">Trofee Kamer</h1>
          <p className="trophy-room__sub">La Sala dei Trofei di Giacomo Bianchi</p>
        </div>
      </div>

      {/* Profile tabs */}
      {allProfiles.length > 0 && (
        <div className="trophy-room__tabs">
          {allProfiles.map(p => (
            <button
              key={p.naam}
              className={['trophy-room__tab', activeProfile === p.naam ? 'trophy-room__tab--active' : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveProfile(p.naam)}
            >
              {p.naam}
              <span className="trophy-room__tab-count">
                {(p.badges ?? []).length}/{BADGES.length} kentekens
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {profile && (
        <div className="trophy-room__stats glass">
          <div className="trophy-room__stat">
            <span className="trophy-room__stat-val">{totalEarned}/{BADGES.length}</span>
            <span className="trophy-room__stat-lbl">Kentekens</span>
          </div>
          <div className="trophy-room__stat">
            <span className="trophy-room__stat-val">{profile.besteTelling ?? 0}</span>
            <span className="trophy-room__stat-lbl">Beste Telling</span>
          </div>
          <div className="trophy-room__stat">
            <span className="trophy-room__stat-val">{profile.speleGespeel ?? 0}</span>
            <span className="trophy-room__stat-lbl">Spele Gespeel</span>
          </div>
          <div className="trophy-room__progress">
            <div
              className="trophy-room__progress-fill"
              style={{ width: `${Math.round((totalEarned / BADGES.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Badge groups */}
      {grouped.map(({ diff, badges }) => (
        <div key={diff} className="trophy-room__group glass">
          <div className="trophy-room__group-title">
            {DIFFICULTY_LABELS[diff]}
            <span className="trophy-room__group-count">
              {badges.filter(b => earned.includes(b.id)).length}/{badges.length}
            </span>
          </div>
          <div className="trophy-room__grid">
            {badges.map(badge => {
              const isEarned = earned.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={[
                    'trophy-badge',
                    isEarned ? 'trophy-badge--earned' : 'trophy-badge--locked',
                    `trophy-badge--${diff}`,
                  ].join(' ')}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ badge, isEarned, x: rect.right + 8, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="trophy-badge__emoji">{badge.emoji}</span>
                  <span className="trophy-badge__name">{badge.naam}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Tooltip */}
      {tooltip && (
        <div className="badge-tooltip glass" style={{ top: tooltip.y, left: tooltip.x }}>
          {tooltip.isEarned ? (
            <>
              <div className="badge-tooltip__naam">{tooltip.badge.naam}</div>
              <div className="badge-tooltip__italiaans">{tooltip.badge.italiaans}</div>
              <div className="badge-tooltip__beskrywing">{tooltip.badge.beskrywing}</div>
            </>
          ) : (
            <>
              <div className="badge-tooltip__naam badge-tooltip__naam--locked">🔒 Gesluit</div>
              <div className="badge-tooltip__wenWenrig">{tooltip.badge.wenWenrig}</div>
            </>
          )}
        </div>
      )}

      <div className="trophy-room__actions">
        <button className="btn-begin" onClick={onBack}>← Terug</button>
        <button
          className="trophy-room__export-btn"
          onClick={downloadGameLog}
          title="Laai alle gespelde spele af as 'n JSON-lêer"
        >
          ⬇ Laai spele af ({getAllGames().length})
        </button>
      </div>
    </div>
  );
}
