// Acceptance checks from CLAUDE.md section 17 (chart-phase parts), fixed seeds.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { canon, LINES } from '../data';
import { posKey } from './chessUtil';
import { blackChartMove, conquerAt, newChartState, whiteChartMove, type ChartState } from './round';
import { seeded } from './targets';

const grey = () => 'grey' as const;

function fromRoot() {
  const c = new Chess();
  for (const s of canon.meta.entry) c.move(s);
  return c;
}

/** Plays his White moves (SAN); Black answers with chart logic. Stops when he leaves the chart. */
function play(target: string, whites: string[], seed = 1) {
  const rng = seeded(seed);
  const c = fromRoot();
  const st: ChartState = newChartState(target);
  const log: any[] = [];
  const black = () => {
    const r = blackChartMove(st, posKey(c), rng, grey);
    if (r.kind === 'chartEnd') { log.push(r); return false; }
    const m = c.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] });
    log.push({ black: m.san, chainTo: r.chainTo });
    conquerAt(st, posKey(c));
    return true;
  };
  if (!black()) return { c, st, log };
  for (const w of whites) {
    const before = posKey(c);
    const m = c.move(w);
    const r = whiteChartMove(st, before, m.lan, rng, grey);
    log.push({ white: m.san, r });
    if (r.kind === 'leave') break;
    if (!black()) break;
  }
  return { c, st, log };
}

describe('chart phase', () => {
  it('1. Stone-Ware: 4...Bxb4 5.c3 Bd6 conquers it', () => {
    const { c, st } = play('stone-ware-variation', ['c3']);
    expect(c.history().slice(7)).toEqual(['Bxb4', 'c3', 'Bd6']);
    expect(st.conquered.has('stone-ware-variation')).toBe(true);
  });

  it('2. Pierce Defense, 6.O-O re-targets to Slow Variation', () => {
    const { log, st } = play('pierce-defense', ['c3', 'O-O']);
    const w = log.find(x => x.white === 'O-O');
    expect(w.r.kind).toBe('retarget');
    expect(w.r.shown).toBe('slow-variation');
    expect(st.conquered.has('slow-variation')).toBe(true);
    expect(st.target).not.toBe('pierce-defense');
  });

  it('3. Pierce Defense, 6.d3 is MISSED with 6.d4', () => {
    const { log, st } = play('pierce-defense', ['c3', 'd3']);
    const w = log.find(x => x.white === 'd3');
    expect(w.r.kind).toBe('leave');
    expect(w.r.top2).toBe(false);
    expect(w.r.missed.needed).toBe('d2d4');
    expect(st.onChart).toBe(false);
  });

  it('4. Lasker Defense by transposition 6.d4 d6 7.O-O Bb6', () => {
    const c = fromRoot();
    const st = newChartState('lasker-defense');
    for (const s of ['Bxb4', 'c3', 'Ba5', 'd4', 'd6', 'O-O', 'Bb6']) {
      c.move(s);
      conquerAt(st, posKey(c));
    }
    expect(st.conquered.has('lasker-defense')).toBe(true);
  });

  it('5. Fontaine Countergambit: chart ends at move 5', () => {
    const { log, c } = play('fontaine-countergambit', ['Bxb5']);
    expect(c.history()[7]).toBe('b5');
    const n = canon.nodes[posKey(c)];
    expect(n === undefined || n.chartEnd || log.some(x => x.r?.kind === 'leave' || x.kind === 'chartEnd')).toBe(true);
  });

  it('7. data: every reach has a legal toward', () => {
    for (const [k, n] of Object.entries(canon.nodes)) {
      const c = new Chess(n.fen);
      expect(posKey(c)).toBe(k);
      for (const id of n.reach) {
        if (n.endOf.includes(id)) continue;
        const u = n.toward[id];
        expect(u, `${id} at ${k}`).toBeTruthy();
        expect(c.moves({ verbose: true }).some(m => m.lan === u)).toBe(true);
      }
    }
    expect(Object.keys(LINES).length).toBe(51);
  });

  it('simulates many noisy chart phases without lookup errors', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const ids = Object.keys(LINES).filter(id => LINES[id].plies > 7);
      const st = newChartState(ids[Math.floor(rng() * ids.length)]);
      const c = fromRoot();
      for (let ply = 0; ply < 40; ply++) {
        const key = posKey(c);
        if (c.turn() === 'b') {
          const r = blackChartMove(st, key, rng, grey);
          if (r.kind === 'chartEnd') break;
          c.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] });
          conquerAt(st, posKey(c));
        } else {
          const n = canon.nodes[key];
          if (!n || n.chartEnd) break;
          const legal = c.moves({ verbose: true });
          const x = rng();
          const u = x < 0.75 ? (st.target && n.toward[st.target]) || n.moves[0].uci
            : x < 0.9 ? n.moves[Math.floor(rng() * n.moves.length)].uci
            : legal[Math.floor(rng() * legal.length)].lan;
          const r = whiteChartMove(st, key, u, rng, grey);
          c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          if (r.kind === 'leave') break;
        }
      }
    }
  });
});
