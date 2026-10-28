// A good move he had to play still scores 4, but the Captain says FORCED / RESCUE instead of POINTS_4.
import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { seeded } from './targets';

vi.mock('../config', async orig => ({ ...(await orig<typeof import('../config')>()), THINK_MIN_MS: 0, THINK_MAX_MS: 0, CRACK_P: 0 }));

let whiteBest = 0; // the fake engine's verdict for White-to-move positions
vi.mock('../engine/EngineService', () => ({
  engine: {
    init: async () => {},
    search: async (fen: string, _depth: number, multipv = 1) => {
      const c = new Chess(fen);
      const legal = c.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
      if (c.turn() === 'w') {
        // White to move: one good move, every other one loses 3 pawns
        return { depth: 14, lines: legal.slice(0, Math.max(1, multipv)).map((uci, i) => ({ uci, cp: i === 0 ? whiteBest : whiteBest - 300, mate: null })) };
      }
      // Black to move: level (so his best move loses nothing)
      return { depth: 14, lines: legal.slice(0, multipv).map(uci => ({ uci, cp: -whiteBest, mate: null })) };
    },
  },
}));

const { RoundController } = await import('./controller');
const { canon } = await import('../data');
const tick = () => new Promise(r => setTimeout(r, 0));

async function play(best: number) {
  whiteBest = best;
  vi.spyOn(Math, 'random').mockImplementation(seeded(5));
  const ctl = new RoundController('fontaine-countergambit', () => 'grey'); // open sea from move 5
  const said: string[] = [];
  ctl.onChange(() => { if (said[said.length - 1] !== ctl.speech) said.push(ctl.speech); });
  for (let guard = 0; guard < 3000 && !ctl.result; guard++) {
    if (ctl.checkpoint && !ctl.checkpoint.answered) { ctl.answerCheckpoint(ctl.checkpoint.options[0]); ctl.closeCheckpoint(); }
    else if (ctl.phase !== 'over' && !ctl.thinking && ctl.chess.turn() === 'w') {
      const legal = ctl.chess.moves({ verbose: true });
      const m = ctl.phase === 'entry' ? new Chess(ctl.chess.fen()).move(canon.meta.entry[ctl.ply]) : legal[0]; // always "the" good move
      ctl.userMove(m.from, m.to);
    }
    await tick();
  }
  vi.restoreAllMocks();
  return { ctl, said };
}

describe('no cheering for forced moves', () => {
  it('only one good move: full marks, but "geen keuse" instead of praise', async () => {
    const { ctl, said } = await play(0);
    const scored = ctl.moves.filter(m => m.ply % 2 === 0 && typeof m.points === 'number');
    expect(scored.every(m => m.points === 4)).toBe(true);
    expect(said.some(s => s.includes('keuse'))).toBe(true);
    expect(said.some(s => s.startsWith('Ardderchog! Mooi man') || s === 'Netjies.')).toBe(false);
  }, 30000);

  it('only one good move while in trouble: the relief line', async () => {
    const { said } = await play(-250);
    expect(said.some(s => s.startsWith('Dankie tog'))).toBe(true);
  }, 30000);
});
