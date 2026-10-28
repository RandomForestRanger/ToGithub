import { UI } from '../content/kaptein';
import type { Answer } from '../game/checkpoint';
import type { Checkpoint } from '../game/controller';
import { CaptainFace } from './CaptainFace';

/** Why an answer is not (yet) true. */
function whyNot(a: Answer, cp: Checkpoint): string {
  const w = UI.checkWhyNot;
  if (a === 'tyd') return w.tyd(cp.devLead);
  if (a === 'lyne') return w.lyne(cp.mobLead);
  return w[a];
}

/** Why an answer is true, in words he can check on the board. */
function why(a: Answer, cp: Checkpoint): string {
  const w = UI.checkWhy;
  if (a === 'tyd') return w.tyd(cp.devLead);
  if (a === 'lyne') return w.lyne(cp.mobLead);
  return w[a];
}

/**
 * "Wat het jou pion gekoop?": the question, five answers, then what the board says.
 * His move waits until he has answered; "Verder" (or his next move) closes the card.
 */
export function CheckpointCard({ cp, speech, onAnswer, onClose }: {
  cp: Checkpoint; speech: string; onAnswer: (a: Answer) => void; onClose: () => void;
}) {
  const done = !!cp.answered;
  const others = done ? cp.truths.filter(t => t !== cp.answered) : [];
  return (
    <div className="checkpoint sea-chart" role="dialog" aria-label={UI.checkTitle}>
      <div className="route-head">
        <CaptainFace mood={done ? (cp.correct ? 'pleased' : 'worried') : 'steady'} size={56} />
        <p className="intro-line">{UI.checkTitle}</p>
      </div>
      {!done && <p className="check-hint">{UI.checkHint}</p>}
      <div className="opts">
        {cp.options.map(a => {
          const state = !done ? '' : cp.truths.includes(a) ? 'true' : a === cp.answered ? 'false' : 'idle';
          return (
            <button key={a} className={`opt ${state} ${a === cp.answered ? 'chosen' : ''}`} disabled={done}
              onClick={() => onAnswer(a)}>
              <span className="mark" aria-hidden>{state === 'true' ? '✓' : state === 'false' ? '✗' : ''}</span>
              {UI.checkOptions[a]}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="check-feedback">
          <p className="check-say">{speech}</p>
          {cp.correct && <p>{why(cp.answered!, cp)}</p>}
          {!cp.correct && <p className="check-not"><b>{UI.checkOptions[cp.answered!]}:</b> {whyNot(cp.answered!, cp)}</p>}
          {!cp.correct && cp.truths.map(t => <p key={t}><b>{UI.checkOptions[t]}:</b> {why(t, cp)}</p>)}
          {cp.correct && others.length > 0 && (
            <>
              <p className="check-also">{UI.checkAlso}</p>
              {others.map(t => <p key={t}><b>{UI.checkOptions[t]}:</b> {why(t, cp)}</p>)}
            </>
          )}
          <button className="btn primary" onClick={onClose}>{UI.checkContinue}</button>
        </div>
      )}
    </div>
  );
}
