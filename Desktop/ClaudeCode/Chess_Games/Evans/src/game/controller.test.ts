// Acceptance check 8 (CLAUDE.md section 17): a full round through RoundController with a mocked engine.
import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { seeded } from './targets';

vi.mock('../config', async orig => ({ ...(await orig<typeof import('../config')>()), THINK_MIN_MS: 0, THINK_MAX_MS: 0 }));

// Fake Stockfish: the first legal moves in chess.js order, all scored 0.
vi.mock('../engine/EngineService', () => ({
  engine: {
    init: async () => {},
    search: async (fen: string, _depth: number, multipv = 1) => ({
      depth: 20,
      lines: new Chess(fen).moves({ verbose: true }).slice(0, multipv)
        .map(m => ({ uci: m.from + m.to + (m.promotion ?? ''), cp: 0, mate: null })),
    }),
  },
}));

const { RoundController } = await import('./controller');
const { canon } = await import('../data');
const { posKey } = await import('./chessUtil');

const tick = () => new Promise(r => setTimeout(r, 0));

async function playRound(target: string, seed: number) {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  const ctl = new RoundController(target, () => 'grey');
  const rng = seeded(seed + 1000);
  for (let guard = 0; guard < 2000 && !ctl.result; guard++) {
    if (ctl.checkpoint && !ctl.checkpoint.answered) {
      // "Wat het jou pion gekoop?" holds his move until he answers
      ctl.answerCheckpoint(ctl.checkpoint.options[0]);
      ctl.closeCheckpoint();
    } else if (ctl.phase !== 'over' && !ctl.thinking && ctl.chess.turn() === 'w') {
      let san: string;
      if (ctl.phase === 'entry') san = canon.meta.entry[ctl.ply];
      else {
        // follow the chart's best move while there is one, otherwise a non-capturing quiet move
        const node = canon.nodes[posKey(ctl.chess)];
        const legal = ctl.chess.moves({ verbose: true });
        const quiet = legal.filter(m => !m.captured && m.piece !== 'k');
        san = node?.best ?? (quiet.length ? quiet : legal)[Math.floor(rng() * (quiet.length || legal.length))].san;
      }
      const m = new Chess(ctl.chess.fen()).move(san);
      expect(ctl.userMove(m.from, m.to)).toBe(true);
    }
    await tick();
  }
  vi.restoreAllMocks();
  return ctl;
}

describe('round controller', () => {
  it('8. a round ends after Black\'s 20th move with exactly 16 scored White moves', async () => {
    for (const [target, seed] of [['stone-ware-variation', 1], ['pierce-defense', 2], ['fontaine-countergambit', 3]] as const) {
      const ctl = await playRound(target, seed);
      expect(ctl.result, target).not.toBeNull();
      expect(ctl.result!.ending, target).toBe('moves'); // the quiet White above never mates or gets mated by move 20
      expect(ctl.ply).toBe(40);
      const scored = ctl.moves.filter(m => m.ply % 2 === 0 && typeof m.points === 'number');
      expect(scored.length, target).toBe(16);
      expect(scored.every(m => m.points! >= 1 && m.points! <= 4)).toBe(true);
      expect(ctl.moves.filter(m => m.ply % 2 === 0 && m.ply < 8).every(m => m.points === undefined)).toBe(true);
      expect(ctl.result!.score).toBe(scored.reduce((a, m) => a + m.points!, 0));
    }
  }, 30000);
});
