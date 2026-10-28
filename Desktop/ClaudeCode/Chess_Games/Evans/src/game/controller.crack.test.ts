// Pressure-sensitive Black through the whole RoundController, with a fake engine that makes
// every Black decision "narrow" (one good move, the rest lose) and every White move a big question.
import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { seeded } from './targets';

vi.mock('../config', async orig => ({ ...(await orig<typeof import('../config')>()), THINK_MIN_MS: 0, THINK_MAX_MS: 0, CRACK_P: 0.5 }));

vi.mock('../engine/EngineService', () => ({
  engine: {
    init: async () => {},
    search: async (fen: string, _depth: number, multipv = 1) => {
      const c = new Chess(fen);
      const legal = c.moves({ verbose: true });
      const uci = (m: (typeof legal)[number]) => m.from + m.to + (m.promotion ?? '');
      if (multipv === 3) {
        // Black's move search: only the first legal move is safe
        return { depth: 6, lines: legal.slice(0, 3).map((m, i) => ({ uci: uci(m), cp: i === 0 ? 100 : -200 - 50 * i, mate: null })) };
      }
      // analysis, side to move's view: White to move stands +3, Black to move stands level
      const cp = c.turn() === 'w' ? 300 : 0;
      return { depth: 14, lines: legal.slice(0, multipv).map(m => ({ uci: uci(m), cp, mate: null })) };
    },
  },
}));

const { RoundController } = await import('./controller');
const { canon } = await import('../data');
const { posKey } = await import('./chessUtil');
const tick = () => new Promise(r => setTimeout(r, 0));

describe('pressure-sensitive Black in a round', () => {
  it('cracks under pressure in open sea, and the Captain names it after his answer', async () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(11));
    const ctl = new RoundController('fontaine-countergambit', () => 'grey'); // engine phase from move 5
    const said: string[] = [];
    ctl.onChange(() => { if (said[said.length - 1] !== ctl.speech) said.push(ctl.speech); });
    for (let guard = 0; guard < 3000 && !ctl.result; guard++) {
      if (ctl.phase !== 'over' && !ctl.thinking && !ctl.checkpoint && ctl.chess.turn() === 'w') {
        const node = canon.nodes[posKey(ctl.chess)];
        const legal = ctl.chess.moves({ verbose: true });
        const san = ctl.phase === 'entry' ? canon.meta.entry[ctl.ply] : node?.best ?? legal[0].san;
        const m = new Chess(ctl.chess.fen()).move(san);
        ctl.userMove(m.from, m.to);
      } else if (ctl.checkpoint && !ctl.checkpoint.answered) {
        ctl.answerCheckpoint(ctl.checkpoint.options[0]);
        ctl.closeCheckpoint();
      }
      await tick();
    }
    vi.restoreAllMocks();
    expect(ctl.result).not.toBeNull();
    expect(ctl.cracks.length).toBeGreaterThan(0);
    // with this fake engine his reply always "loses" the +3, so every named crack is one that got away
    expect(ctl.cracks.every(c => !c.caught)).toBe(true);
    expect(said.some(s => s.includes('gegly'))).toBe(true);
    expect(ctl.result!.moments.some(m => m.kind === 'crack')).toBe(true);
  }, 30000);
});
