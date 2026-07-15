import React, { useState } from 'react';
import GiacomoFace from './GiacomoFace.jsx';

const INTRO_LINES = [
  "Buona sera! Ek is Maestro Giacomo Bianchi — skaakonderwyser, Ferrari-liefhebber, en Italianer van hart!",
  "Vandag leer jy die Italiaanse Opening — een van die oudste en mooiste openings in die skaakgeskiedenis!",
  "Dit begin so: 1.e4 e5 2.Nf3 Nc6 3.Bc4 — Wit se biskop mik direk op die swak f7-veld!",
  "Die Italianer is slim: jy ontwikkel jou stukke vinnig, beheer die sentrum, en berei voor vir aanval!",
  "Jy sal die Giuoco Piano leer — 'die stille spel' — maar moenie mislei word nie, dit pak 'n swaai!",
  "Die Evans Gambiet is 'n klassieke skok — offer 'n pion en kry 'n verpletterende aanval!",
  "Die Twee Ruiter Verdediging is wild en onvoorspelbaar — perfek vir dappere spelers soos jy!",
  "Jy sal ook leer hoe om teen die Sisiliaans, Frans en Caro-Kann te speel — want nie almal speel 1...e5 nie!",
  "Elke goeie skuif verdien punte — probeer om 4 uit 4 te kry op elke beurt!",
  "Die bord wag, die stukke is gereed... en Giacomo is hier om te help. Andiamo — kom ons begin!",
];

export default function GiacomoIntro({ playerName, onDone }) {
  const [step, setStep] = useState(0);

  const isLast = step === INTRO_LINES.length - 1;

  function handleNext() {
    if (!isLast) {
      setStep(s => s + 1);
    } else {
      onDone();
    }
  }

  return (
    <div className="intro-overlay">
      <div className="intro-card glass">
        <div className="intro-header">
          <GiacomoFace expression="ecstatic" size={88} />
          <div className="intro-title">
            <span className="intro-title__label">Welkom by die Akademie,</span>
            <span className="intro-title__name">{playerName}!</span>
          </div>
        </div>

        <div className="intro-bubble glass">
          <p className="intro-text">{INTRO_LINES[step]}</p>
        </div>

        <div className="intro-progress">
          {INTRO_LINES.map((_, i) => (
            <span key={i} className={`intro-dot ${i <= step ? 'intro-dot--done' : ''}`} />
          ))}
        </div>

        <button className="intro-btn" onClick={handleNext}>
          {isLast ? '🎯 Kom ons speel!' : 'Volgende →'}
        </button>
      </div>
    </div>
  );
}
