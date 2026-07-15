import React, { useState } from 'react';
import GiacomoFace from './GiacomoFace.jsx';
import { BADGES } from '../data/badges.js';

export default function ProfileSelect({ profiles, onSelect }) {
  const [selected, setSelected] = useState(null);

  const total = BADGES.length;

  return (
    <div className="profile-select">
      {/* Header */}
      <div className="profile-select__header">
        <GiacomoFace expression="waiting" size={80} />
        <div className="profile-select__title">
          <h1>Maestro Giacomo<br />se Skaak Akademie</h1>
          <p className="profile-select__subtitle">
            Kies jou profiel om te begin, mio studente...
          </p>
        </div>
      </div>

      {/* Profile cards */}
      <div className="profile-select__cards">
        {profiles.map(p => {
          const isSelected = selected === p.naam;
          return (
            <button
              key={p.naam}
              className={`profile-card glass ${isSelected ? 'profile-card--selected' : ''}`}
              onClick={() => setSelected(p.naam)}
            >
              <div className="profile-card__name">{p.naam}</div>
              <div className="profile-card__stats">
                <div className="profile-stat">
                  <span className="profile-stat__icon">🏅</span>
                  <span className="profile-stat__value">{p.badges.length}</span>
                  <span className="profile-stat__total">/{total}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__icon">⭐</span>
                  <span className="profile-stat__value">{p.besteTelling}</span>
                  <span className="profile-stat__total">/200</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__icon">🎮</span>
                  <span className="profile-stat__value">{p.speleGespeel}</span>
                  <span className="profile-stat__label"> spele</span>
                </div>
              </div>
              {isSelected && (
                <div className="profile-card__check">✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Begin button */}
      <button
        className={`btn-begin ${!selected ? 'btn-begin--disabled' : ''}`}
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
      >
        Begin Speel! →
      </button>
    </div>
  );
}
