import { LINES } from '../data';
import { say, UI } from '../content/kaptein';
import type { LineState } from '../game/targets';
import type { RoundController } from '../game/controller';
import { SteamGraph } from './SteamGraph';
import { CaptainFace } from './CaptainFace';
import { routeOf } from './Kelpwoud';
import { useMemo } from 'react';

/** The round's objective, shown over the Kelpwoud while the route to the target lights up. */
export function RoundIntro({ target, state, onGo }: { target: string; state: LineState; onGo: () => void }) {
  const l = LINES[target];
  const flavour = useMemo(() => say('ROUND_FLAVOUR'), []);
  const stages = routeOf(target).slice(1).map(id => LINES[id]); // without the root (4.b4)
  const marks = new Set(stages.map(s => s.sub));
  return (
    <div className="sea-chart route-card" role="dialog">
      <div className="route-head">
        <CaptainFace mood="steady" size={64} />
        <p className="intro-line">{say('ROUND_START', { line: l.label })}</p>
      </div>
      {l.reef && <p className="reef-note">{UI.reefNote}</p>}
      <h3>{UI.route}</h3>
      <ol className="stages">
        {stages.map(s => <li key={s.id}><b>{s.label}</b> <span className="mono">{s.sub}</span></li>)}
      </ol>
      <h3>{UI.routeMoves}</h3>
      {state === 'grey' ? (
        // a grey line: the moves are his to find (the stages above still name each defining move)
        <p className="route-hidden">{UI.routeHidden}</p>
      ) : (
        <p className="route-moves mono">
          {l.movesNumbered.slice(6).map((m, i) => <span key={i} className={marks.has(m) ? 'stage-move' : ''}>{m} </span>)}
        </p>
      )}
      <p className="flavour">{flavour}</p>
      <button className="btn primary" onClick={onGo}>{UI.ready}</button>
    </div>
  );
}

export function RoundEnd({ ctl, record, best, onAgain, onHome }: {
  ctl: RoundController; record: boolean; best: number | null; onAgain: () => void; onHome: () => void;
}) {
  const r = ctl.result!;
  const chips = r.conquered.filter(id => id !== 'evans-gambit');
  const t = ctl.toernooi;
  return (
    <div className="screen center">
      <div className="card end-card">
        {t && <h2 className="end-mode">{UI.toernooi}</h2>}
        <div className="score-big">{r.score}{!t && <small>/64</small>}</div>
        {t && <p className="mono score-split">{UI.toernooiScore(r.score - r.bonus, r.bonus)}</p>}
        <p className={record ? 'record new' : 'record'}>{record ? UI.newRecord : best !== null ? UI.record(best) : ''}</p>
        <div className="end-captain"><CaptainFace mood={ctl.mood} size={96} /><p className="end-say">{ctl.speech}</p></div>
        {r.checks.n > 0 && <p className="check-tally">{UI.checkTally(r.checks.right, r.checks.n)}</p>}
        <p className="mono">Eindtelling: {r.finalEval >= 0 ? '+' : ''}{Math.abs(r.finalEval) >= 100 ? 'mat' : r.finalEval.toFixed(2)}</p>
        {!t && <>
          <h3>{UI.coloured}</h3>
          <div className="chips">
            {chips.length ? chips.map(id => (
              <span key={id} className={`chip chip-${r.gold ? 'gold' : 'green'}`}>{LINES[id].label}</span>
            )) : <i>{UI.noneColoured}</i>}
          </div>
        </>}
        <h3>{t ? UI.evalGraph : UI.steamGraph}</h3>
        <SteamGraph pts={ctl.steam} press={ctl.press} />
        {r.moments.length > 0 && <>
          <h3>{UI.keyMoments}</h3>
          <ul className="moments">
            {r.moments.map((m, i) => (
              <li key={i}>{m.kind === 'missed' ? UI.momentMissed(m.line!, m.move)
                : m.kind === 'crack' ? UI.momentCrack(m.move, !!m.caught)
                : m.kind === 'quiet' ? UI.momentQuiet(m.move)
                : m.kind === 'drop' ? UI.momentDrop(m.move, m.value!) : UI.momentBest(m.move)}</li>
            ))}
          </ul>
        </>}
        <div className="btn-row">
          <button className="btn primary" onClick={onAgain}>{t ? UI.againToernooi : UI.again}</button>
          <button className="btn" onClick={onHome}>{UI.backToForest}</button>
        </div>
      </div>
    </div>
  );
}
