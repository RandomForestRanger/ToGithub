import React from 'react';
import { BADGES } from '../data/badges.js';

export default function BadgePanel({ earnedBadges = [], sessionBadges = [], onBadgeHover }) {

  function handleMouseEnter(badge, isEarned) {
    if (!onBadgeHover) return;
    const text = isEarned
      ? `${badge.naam} — ${badge.beskrywing}`
      : `🔒 Hoe om te verdien: ${badge.wenWenrig}`;
    onBadgeHover(text);
  }

  function handleMouseLeave() {
    if (onBadgeHover) onBadgeHover(null);
  }

  return (
    <aside className="badge-panel glass">
      <div className="badge-panel__title">Kentekens</div>

      <div className="badge-list-vert">
        {BADGES.map(badge => {
          const isEarned = earnedBadges.includes(badge.id);
          const isNew    = sessionBadges.includes(badge.id);

          return (
            <div
              key={badge.id}
              className={[
                'badge-row',
                isEarned ? 'badge-row--earned' : 'badge-row--locked',
                isNew    ? 'badge-row--new'    : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => handleMouseEnter(badge, isEarned)}
              onMouseLeave={handleMouseLeave}
            >
              <span className="badge-row__emoji">{badge.emoji}</span>
              <div className="badge-row__info">
                <span className="badge-row__name">
                  {badge.naam}
                </span>
                <span className="badge-row__desc">
                  {isEarned ? badge.moeilikheid : '🔒'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
