import { LINES } from '../data';
import { say, UI } from '../content/kaptein';
import type { RoundController } from '../game/controller';
import { SteamGraph } from './SteamGraph';
import { useMemo } from 'react';

export function RoundIntro({ target, onGo }: { target: string; onGo: () => void }) {
  const l = LINES[target];
  const flavour = useMemo(() => say('ROUND_FLAVOUR'), []);
  return (
    <div className="screen center">
      <div className="sea-chart">
        <p className="intro-line">{say('ROUND_START', { line: l.label })}</p>
        <p className="mono sub big">{l.sub}</p>
        {l.reef && <p className="reef-note">{UI.reefNote}</p>}
        <p className="flavour">{flavour}</p>
        <button className="btn primary" onClick={onGo}>{UI.throwBait}</button>
      </div>
    </div>
  );
}

export function RoundEnd({ ctl, onAgain, onHome }: { ctl: RoundController; onAgain: () => void; onHome: () => void }) {
  const r = ctl.result!;
  const chips = r.conquered.filter(id => id !== 'evans-gambit');
  return (
    <div className="screen center">
      <div className="card end-card">
        <div className="score-big">{r.score}<small>/64</small></div>
        <p className="end-say">{ctl.speech}</p>
        <p className="mono">Eindtelling: {r.finalEval >= 0 ? '+' : ''}{Math.abs(r.finalEval) >= 100 ? 'mat' : r.finalEval.toFixed(2)}</p>
        <h3>{UI.coloured}</h3>
        <div className="chips">
          {chips.length ? chips.map(id => (
            <span key={id} className={`chip chip-${r.gold ? 'gold' : 'green'}`}>{LINES[id].label}</span>
          )) : <i>{UI.noneColoured}</i>}
        </div>
        <h3>{UI.steamGraph}</h3>
        <SteamGraph pts={ctl.steam} />
        {r.moments.length > 0 && <>
          <h3>{UI.keyMoments}</h3>
          <ul className="moments">
            {r.moments.map((m, i) => (
              <li key={i}>{m.kind === 'missed' ? UI.momentMissed(m.line!, m.move)
                : m.kind === 'drop' ? UI.momentDrop(m.move, m.value!) : UI.momentBest(m.move)}</li>
            ))}
          </ul>
        </>}
        <div className="btn-row">
          <button className="btn primary" onClick={onAgain}>{UI.again}</button>
          <button className="btn" onClick={onHome}>{UI.backToForest}</button>
        </div>
      </div>
    </div>
  );
}
