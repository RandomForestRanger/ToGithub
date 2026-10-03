// Pure chart-phase rules (CLAUDE.md sections 4.1 to 4.5). No UI, no engine.
// Mirrors the reference logic in tools/check_canon.py.
import { canon } from '../data';
import { isTopTwo } from './scoring';
import { chooseTarget, pickWeightedMove, type LineState, type Rng } from './targets';

export interface ChartState {
  target: string | null;
  onChart: boolean;
  conquered: Set<string>;
  targetsThisRound: Set<string>;
}

export function newChartState(target: string): ChartState {
  const root = canon.nodes[canon.meta.rootKey];
  return {
    target,
    onChart: true,
    conquered: new Set(root.endOf),
    targetsThisRound: new Set([target]),
  };
}

/** 4.1: add every line ending at this position. Returns the ids that are new. */
export function conquerAt(st: ChartState, key: string): string[] {
  const n = canon.nodes[key];
  if (!n) return [];
  const fresh = n.endOf.filter(id => !st.conquered.has(id));
  fresh.forEach(id => st.conquered.add(id));
  return fresh;
}

function setTarget(st: ChartState, id: string | null) {
  st.target = id;
  if (id) st.targetsThisRound.add(id);
}

export type BlackChartResult =
  | { kind: 'chartEnd' }
  | { kind: 'move'; uci: string; to: string; chainTo?: string };

/** 4.2: Black's move while on the chart. Mutates st (target, onChart). */
export function blackChartMove(st: ChartState, key: string, rng: Rng, stateOf: (id: string) => LineState): BlackChartResult {
  const n = canon.nodes[key];
  if (!n || n.chartEnd) {
    st.onChart = false;
    return { kind: 'chartEnd' };
  }
  let uci: string;
  let chainTo: string | undefined;
  if (st.target && n.toward[st.target]) {
    uci = n.toward[st.target];
  } else {
    const open = n.reach.filter(id => !st.conquered.has(id) && n.toward[id]);
    if (open.length) {
      const t = chooseTarget(rng, open, stateOf);
      setTarget(st, t);
      chainTo = t;
      uci = n.toward[t];
    } else {
      uci = pickWeightedMove(rng, n.moves).uci;
    }
  }
  const to = n.moves.find(m => m.uci === uci)!.to;
  return { kind: 'move', uci, to, chainTo };
}

export type WhiteChartResult =
  | { kind: 'canon'; points: 4 }
  | { kind: 'retarget'; points: 4; shown: string; oldTarget: string; needed?: string }
  | { kind: 'lost'; points: 4; oldTarget: string; needed?: string }
  | { kind: 'leave'; points: 4 | null; top2: boolean; missed?: { line: string; needed: string } };

/**
 * 4.3 / 4.4: his move while on the chart. Call conquerAt(after) first if the move is canon.
 * `points: null` means "score with the engine" (section 6).
 */
export function whiteChartMove(st: ChartState, beforeKey: string, uci: string, rng: Rng,
                               stateOf: (id: string) => LineState): WhiteChartResult {
  const before = canon.nodes[beforeKey];
  const needed = st.target ? before.toward[st.target] : undefined;
  const cm = before.moves.find(m => m.uci === uci);
  const targetOpen = st.target !== null && !st.conquered.has(st.target);

  if (cm) {
    const after = canon.nodes[cm.to];
    conquerAt(st, cm.to);
    const stillOpen = st.target !== null && !st.conquered.has(st.target);
    if (!stillOpen || after.reach.includes(st.target!)) return { kind: 'canon', points: 4 };
    // 4.4 re-targeting
    const oldTarget = st.target!;
    const landed = after.endOf;
    const open = after.reach.filter(id => !st.conquered.has(id) && !landed.includes(id));
    if (landed.length || open.length) {
      const shown = landed.length ? landed[0] : chooseTarget(rng, open, stateOf);
      setTarget(st, open.length ? (landed.length ? chooseTarget(rng, open, stateOf) : shown) : shown);
      return { kind: 'retarget', points: 4, shown, oldTarget, needed };
    }
    setTarget(st, null);
    return { kind: 'lost', points: 4, oldTarget, needed };
  }

  st.onChart = false;
  const top2 = isTopTwo(before, uci);
  const missed = targetOpen && needed ? { line: st.target!, needed } : undefined;
  return { kind: 'leave', points: top2 ? 4 : null, top2, missed };
}
