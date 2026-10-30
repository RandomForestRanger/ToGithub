// Toernooi mode: the four Evans moves, then open play; no aids; Black plays perfect once White is well ahead.
import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { seeded } from './targets';

vi.mock('../config', async orig => ({ ...(await orig<typeof import('../config')>()), THINK_MIN_MS: 0, THINK_MAX_MS: 0 }));

// Fake Stockfish: the first legal moves in chess.js order. Every position is +4 for White,
// so Black should switch to perfect play after White's 16th move. Searches are logged by depth.
const searches: { ply: number; depth: number; multipv: number; maxMs?: number }[] = [];
vi.mock('../engine/EngineService', () => ({
  engine: {
    init: async () => {},
    search: async (fen: string, depth: number, multipv = 1, maxMs?: number) => {
      const c = new Chess(fen);
      const n = fen.split(' ');
      searches.push({ ply: (Number(n[5]) - 1) * 2 + (n[1] === 'b' ? 1 : 0), depth, multipv, maxMs });
      const cp = c.turn() === 'w' ? 400 : -400;
      return {
        depth: 20,
        lines: c.moves({ verbose: true }).slice(0, multipv).map(m => ({ uci: m.from + m.to + (m.promotion ?? ''), cp, mate: null })),
      };
    },
  },
}));

const { RoundController } = await import('./controller');
const { canon } = await import('../data');
const { applyToernooi, applyRound, emptyStore } = await import('./storage');
const { wobbleMove } = await import('./pressure');
const { PERFECT_DEPTH, PERFECT_MAX_MS, TOERNOOI_BONUS } = await import('../config');

const tick = () => new Promise(r => setTimeout(r, 0));

async function playToernooi(seed: number) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  const ctl = new RoundController('', () => 'grey', 'toernooi');
  const speeches: string[] = [];
  ctl.onChange(() => { if (ctl.speech && !speeches.includes(ctl.speech)) speeches.push(ctl.speech); });
  const rng = seeded(seed + 1000);
  for (let guard = 0; guard < 2000 && !ctl.result; guard++) {
    expect(ctl.checkpoint).toBeNull();
    if (ctl.phase !== 'over' && !ctl.thinking && ctl.chess.turn() === 'w') {
      if (ctl.phase === 'entry') {
        // only the Evans moves are accepted
        if (ctl.ply === 0) expect(ctl.userMove('d2', 'd4')).toBe(false);
        const m = new Chess(ctl.chess.fen()).move(canon.meta.entry[ctl.ply]);
        expect(ctl.userMove(m.from, m.to)).toBe(true);
      } else {
        const legal = ctl.chess.moves({ verbose: true });
        const quiet = legal.filter(m => !m.captured && m.piece !== 'k');
        const m = (quiet.length ? quiet : legal)[Math.floor(rng() * (quiet.length || legal.length))];
        expect(ctl.userMove(m.from, m.to)).toBe(true);
      }
    }
    await tick();
  }
  vi.restoreAllMocks();
  return { ctl, speeches };
}

describe('toernooi', () => {
  it('four Evans moves, then open play to move 20; no Captain or needle on the way; perfect Black after move 16; bonus', async () => {
    searches.length = 0;
    const { ctl, speeches } = await playToernooi(7);
    expect(ctl.result).not.toBeNull();
    expect(ctl.ply).toBe(40);
    // Black's 4th move is one of the master replies, then no chart
    expect(canon.nodes[canon.meta.rootKey].moves.map(m => m.san)).toContain(ctl.moves[7].san);
    expect(ctl.moves.slice(7).every(m => m.phase === 'engine')).toBe(true);
    expect(ctl.chart.conquered.size).toBeLessThanOrEqual(1); // only the root, never a named line
    // silent until the end
    expect(speeches.length).toBe(1);
    expect(ctl.press.length).toBe(0);
    // scoring: 16 scored moves, plus the bonus at +4
    const scored = ctl.moves.filter(m => m.ply % 2 === 0 && typeof m.points === 'number');
    expect(scored.length).toBe(16);
    expect(ctl.result!.bonus).toBe(TOERNOOI_BONUS);
    expect(ctl.result!.score).toBe(scored.reduce((a, m) => a + m.points!, 0) + TOERNOOI_BONUS);
    // perfect play: deep single-line searches only from Black's 16th move on
    expect(ctl.perfect).toBe(true);
    const deep = searches.filter(s => s.depth === PERFECT_DEPTH && s.maxMs === PERFECT_MAX_MS);
    expect(deep.length).toBeGreaterThan(0);
    expect(Math.min(...deep.map(s => s.ply))).toBeGreaterThanOrEqual(31);
  }, 30000);

  it('wobble: a real slip, never a disaster', () => {
    const lines = [{ uci: 'a', cp: 0 }, { uci: 'b', cp: -30 }, { uci: 'c', cp: -90 }, { uci: 'd', cp: -140 }, { uci: 'e', cp: -900 }];
    const picks = new Set(Array.from({ length: 50 }, (_, i) => wobbleMove(lines, 50, 150, seeded(i))));
    expect([...picks].sort()).toEqual(['c', 'd']);
    expect(wobbleMove([{ uci: 'a', cp: 0 }, { uci: 'e', cp: -900 }], 50, 150, Math.random)).toBeNull();
  });

  it('records: toernooi and verkenning are kept apart', () => {
    const s = emptyStore();
    applyRound(s, { date: '2026-10-30T10:00:00Z', target: 'stone-ware-variation', conquered: [], gold: false, score: 40, finalEval: 0 }, [], {});
    expect(applyToernooi(s, { date: '2026-10-30T11:00:00Z', score: 70, bonus: 10, finalEval: 1.5, ending: 'moves' })).toBe(true);
    expect(applyToernooi(s, { date: '2026-10-30T12:00:00Z', score: 60, bonus: 0, finalEval: 0.2, ending: 'moves' })).toBe(false);
    expect(s.best).toEqual({ verkenning: 40, toernooi: 70 });
    expect(s.rounds.length).toBe(1);
    expect(Object.keys(s.lines).length).toBe(0);
  });
});
