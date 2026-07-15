// Black's move selection — ~1700 Elo simulated opponent.
//
// Priority:
//   Moves 1–15 : Lichess Explorer weighted-random (top 4 by frequency)
//   Move 16+   : Stockfish depth 15 best move
//   Fallback   : legal move from a hardcoded reasonable list
//
// Trap system: 15% chance per game; trap is scheduled at game start via
// rollTrap() and injected as trapMove when the trigger position is reached.

import { Chess } from 'chess.js';
import { fetchExplorerMoves } from './lichessApi.js';
import { getBestMove, getMultiPV } from './stockfishWorker.js';

const BOOK_DEPTH = 15; // use Explorer for Black's first 15 moves

// ── Helpers ────────────────────────────────────────────────────────────

function weightedRandom(items) {
  // items: [{ san, weight }]
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return items[0]?.san ?? null;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.san;
  }
  return items[items.length - 1]?.san ?? null;
}

function uciToSan(fen, uci) {
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2);
    const to   = uci.slice(2, 4);
    const promotion = uci[4] || undefined;
    return game.move({ from, to, promotion })?.san ?? null;
  } catch {
    return null;
  }
}

function randomLegalMove(fen) {
  const game = new Chess(fen);
  const legal = game.moves();
  // Prefer these moves as fallback (reasonable development moves)
  const preferred = ['e5', 'd5', 'c5', 'e6', 'c6', 'Nf6', 'Nc6', 'd6', 'g6'];
  const candidate = preferred.find(m => legal.includes(m));
  return candidate ?? legal[Math.floor(Math.random() * legal.length)];
}

// ── Explorer selection ─────────────────────────────────────────────────

async function selectFromExplorer(fen) {
  try {
    const data = await fetchExplorerMoves(fen);
    if (!data?.moves?.length) return null;

    // Take top 4 most popular moves
    const top = data.moves.slice(0, 4).filter(m => m.white + m.draws + m.black > 0);
    if (!top.length) return null;

    const weighted = top.map(m => ({
      san:    m.san,
      weight: m.white + m.draws + m.black,
    }));

    return weightedRandom(weighted);
  } catch {
    return null;
  }
}

// ── Stockfish selection ────────────────────────────────────────────────

async function selectFromStockfish(fen, depth = 15) {
  try {
    const result = await getBestMove(fen, depth);
    if (!result?.uci) return null;
    return uciToSan(fen, result.uci);
  } catch {
    return null;
  }
}

// ── Suboptimal selection (3rd-best move) ──────────────────────────────
// Used for the scheduled "human error" moment between moves 15–20.
// Tries Explorer 3rd-most-popular first, falls back to Stockfish MultiPV[2].

async function selectSuboptimal(fen) {
  // Try Explorer — take 3rd move by popularity
  try {
    const data = await fetchExplorerMoves(fen);
    if (data?.moves?.length >= 3) return data.moves[2].san;
    if (data?.moves?.length >= 2) return data.moves[1].san;
  } catch { /* fall through */ }

  // Try Stockfish MultiPV 3 — take 3rd result
  try {
    const results = await getMultiPV(fen, 15, 3);
    if (results.length >= 3 && results[2]?.uci) return uciToSan(fen, results[2].uci);
    if (results.length >= 2 && results[1]?.uci) return uciToSan(fen, results[1].uci);
    if (results.length >= 1 && results[0]?.uci) return uciToSan(fen, results[0].uci);
  } catch { /* fall through */ }

  return randomLegalMove(fen);
}

// ── Public: select Black's move ────────────────────────────────────────
// moveNumber:     Black's move number (1 = Black's first reply)
// trapMove:       SAN override for trap system (null = no trap this turn)
// forceRandom:    play a random legal move (scheduled imperfection, moves 20–25)
// forceSuboptimal: play the 3rd-best move (scheduled imperfection, moves 15–20)
export async function selectBlackMove(fen, moveNumber, trapMove = null, { forceRandom = false, forceSuboptimal = false, depth = 15 } = {}) {
  // Trap always takes priority
  if (trapMove) {
    const game = new Chess(fen);
    if (game.moves().includes(trapMove)) return trapMove;
  }

  // Scheduled random blunder
  if (forceRandom) return randomLegalMove(fen);

  // Scheduled suboptimal (3rd-best) moment
  if (forceSuboptimal) {
    const sub = await selectSuboptimal(fen);
    if (sub) return sub;
  }

  if (moveNumber <= BOOK_DEPTH) {
    const explorerMove = await selectFromExplorer(fen);
    if (explorerMove) return explorerMove;
  }

  const sfMove = await selectFromStockfish(fen, depth);
  if (sfMove) return sfMove;

  return randomLegalMove(fen);
}

// ── Trap system ────────────────────────────────────────────────────────
// Call once at game start. Returns a trap config or null.
// trapConfig is passed to useGame.js which checks whether the current
// position matches the trigger and injects the trapMove at the right moment.

const TRAPS = {
  fried_liver: {
    naam:         'Fried Liver Aanval',
    // Trigger: position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5
    triggerHistory: ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nxd5'],
    blackTrapMove:  'Nxf7',
    giacomoWarn:   "Pasop! Swart mik op jou konings-ruiter se beskermde f7-punt!",
  },
  blackburne_shilling: {
    naam:         'Blackburne-Shilling Val',
    // Trigger: position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 — Black will play Nd4
    triggerHistory: ['e4','e5','Nf3','Nc6','Bc4'],
    blackTrapMove:  'Nd4',
    giacomoWarn:   "Swart probeer 'n val! Dink voordat jy die ruiter slaan!",
  },
  traxler: {
    naam:         'Traxler Teen-Aanval',
    // Trigger: position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 — Black plays Bc5
    triggerHistory: ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5'],
    blackTrapMove:  'Bc5',
    giacomoWarn:   "Die Traxler! Swart kontra-aanval! Speel versigtig!",
  },
};

export function rollTrap() {
  if (Math.random() >= 0.15) return null; // 85% chance of no trap
  const keys = Object.keys(TRAPS);
  const key  = keys[Math.floor(Math.random() * keys.length)];
  return { key, ...TRAPS[key] };
}

// Check if trap should fire this turn.
// historyAfterBlack: game.history() including latest Black move.
// Returns the forced Black move SAN if it matches, else null.
export function checkTrapTrigger(trap, historyBeforeBlackMove) {
  if (!trap) return null;
  const trigger = trap.triggerHistory;
  if (historyBeforeBlackMove.length !== trigger.length) return null;
  const matches = trigger.every((san, i) => historyBeforeBlackMove[i] === san);
  return matches ? trap.blackTrapMove : null;
}
