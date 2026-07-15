// White's move scoring — combines opening tree (instant) with engine fallback (async).
//
// Flow:
//   1. Look up position in opening tree → if found, return score instantly (source: 'tree')
//   2. If not in tree: run Lichess Explorer + Cloud Eval in parallel (4s timeout each)
//      → rank the played move, take the best rank across both sources
//   3. If both Lichess calls fail/miss: fall back to local Stockfish MultiPV
//   4. If everything fails: return score 2 (benefit of the doubt)
//
// Ranking → score:
//   rank 1 → 4 pts   (top move by popularity or engine)
//   rank 2 → 3 pts
//   rank 3 → 2 pts
//   rank 4+ → 1 pt
//
// scoreWhiteMove() always returns a Promise so callers can uniformly await it.
// In-tree results resolve immediately (microtask tick only).

import { Chess } from 'chess.js';
import { lookupPosition, scoreWhiteMove as treeScore } from './openingTree.js';
import { fetchExplorerMoves, fetchCloudEval } from '../engine/lichessApi.js';
import { getMultiPV } from '../engine/stockfishWorker.js';

// ── Hint square helpers (exported for useGame hint system) ─────────────

// SAN move → {from, to} on a given FEN (returns null on failure)
export function sanToSquares(fen, san) {
  try {
    const g = new Chess(fen);
    const mv = g.move(san);
    return mv ? { from: mv.from, to: mv.to } : null;
  } catch { return null; }
}

// UCI string ("e2e4") → {from, to}
export function uciToSquares(uci) {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

// Returns centipawn eval from White's absolute perspective (positive = White winning),
// or null if no eval is available.
// Eval is requested when it's White's turn (after Black just moved), so the
// side-to-move cp from both Lichess and Stockfish equals White's absolute cp directly.
export async function evalFen(fen) {
  try {
    const cloud = await fetchCloudEval(fen, 1);
    const pv = cloud?.pvs?.[0];
    if (pv?.cp  !== undefined) return pv.cp;
    if (pv?.mate !== undefined) return pv.mate > 0 ? 9999 : -9999;
  } catch { /* fall through */ }

  try {
    const results = await getMultiPV(fen, 8, 1); // shallow — speed matters here
    const pv = results[0];
    if (pv?.cp  !== undefined) return pv.cp;
    if (pv?.mate !== undefined) return pv.mate > 0 ? 9999 : -9999;
  } catch { /* fall through */ }

  return null;
}

// Returns the UCI of the engine's single best move for fen, or null.
// Tries Lichess Cloud Eval first (cached), falls back to local Stockfish.
export async function getEngineHintMove(fen) {
  try {
    const cloud = await fetchCloudEval(fen, 1);
    const uci = cloud?.pvs?.[0]?.moves?.split(' ')[0];
    if (uci) return uci;
  } catch { /* fall through */ }

  try {
    const sfMoves = await getMultiPV(fen, 12, 1);
    if (sfMoves?.[0]?.uci) return sfMoves[0].uci;
  } catch { /* fall through */ }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────

// Convert a SAN move on a given FEN to UCI (e.g. "Nf3" → "g1f3")
function sanToUci(fen, san) {
  try {
    const game = new Chess(fen);
    const move = game.move(san);
    if (!move) return null;
    return move.from + move.to + (move.promotion ?? '');
  } catch {
    return null;
  }
}

// Convert a UCI move string on a given FEN to SAN (e.g. "g1f3" → "Nf3")
function uciToSan(fen, uci) {
  if (!uci || uci.length < 4) return null;
  try {
    const game = new Chess(fen);
    const from = uci.slice(0, 2);
    const to   = uci.slice(2, 4);
    const promotion = uci[4] || undefined;
    const move = game.move({ from, to, promotion });
    return move ? move.san : null;
  } catch {
    return null;
  }
}

// 1-indexed rank of identifier in list using keyFn(item).
// Returns null if not found.
function rankIn(identifier, list, keyFn) {
  const idx = list.findIndex(item => keyFn(item) === identifier);
  return idx >= 0 ? idx + 1 : null;
}

function rankToScore(rank) {
  if (rank == null) return null;
  if (rank <= 1) return 4;
  if (rank <= 2) return 3;
  if (rank <= 3) return 2;
  return 1;
}

// ── Async engine scoring (out-of-tree positions) ───────────────────────
async function scoreViaEngines(fenBeforeMove, san) {
  const uci = sanToUci(fenBeforeMove, san);
  if (!uci) return { score: 1, source: 'fallback', bestMoveSan: null };

  let bestRank    = null;
  let bestMoveSan = null; // top-ranked move that should have been played

  // Run Explorer (popularity) and Cloud Eval (engine) in parallel
  const [explorerRes, cloudRes] = await Promise.allSettled([
    fetchExplorerMoves(fenBeforeMove),
    fetchCloudEval(fenBeforeMove, 4),
  ]);

  // Explorer: moves are sorted by popularity; compare by SAN
  if (explorerRes.status === 'fulfilled') {
    const moves = explorerRes.value?.moves ?? [];
    if (moves.length > 0 && moves[0].san !== san) bestMoveSan = moves[0].san;
    const rank = rankIn(san, moves, m => m.san);
    if (rank !== null) {
      bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
    }
  }

  // Cloud Eval: pvs[0] = best move; compare first token of pv string (UCI)
  if (cloudRes.status === 'fulfilled') {
    const pvs = cloudRes.value?.pvs ?? [];
    if (!bestMoveSan && pvs.length > 0) {
      const topUci = pvs[0].moves?.split(' ')[0];
      if (topUci && topUci !== uci) bestMoveSan = uciToSan(fenBeforeMove, topUci);
    }
    const rank = rankIn(uci, pvs, pv => pv.moves?.split(' ')[0]);
    if (rank !== null) {
      bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
    }
  }

  if (bestRank !== null) {
    const score = rankToScore(bestRank);
    return { score, source: 'lichess', bestMoveSan: score >= 4 ? null : bestMoveSan };
  }

  // Both Lichess calls missed — try local Stockfish MultiPV
  const sfMoves = await getMultiPV(fenBeforeMove, 12, 4);
  const sfRank  = rankIn(uci, sfMoves, m => m.uci);
  if (!bestMoveSan && sfMoves.length > 0 && sfMoves[0].uci !== uci) {
    bestMoveSan = uciToSan(fenBeforeMove, sfMoves[0].uci);
  }
  if (sfRank !== null) {
    const score = rankToScore(sfRank);
    return { score, source: 'stockfish', bestMoveSan: score >= 4 ? null : bestMoveSan };
  }

  return { score: 2, source: 'fallback', bestMoveSan };
}

// ── Public API ─────────────────────────────────────────────────────────
// historyBeforeMove : string[]  — game.history() BEFORE this move was played
// fenBeforeMove     : string    — FEN BEFORE this move (captured synchronously)
// san               : string    — SAN of White's move
//
// Returns Promise<ScoringResult>:
// {
//   score        : 1|2|3|4,
//   label        : string|null,
//   variationName: string|null,
//   explanation  : { vraag, opsies }|null,
//   layerComplete: 1|2|3|null,
//   source       : 'tree'|'lichess'|'stockfish'|'fallback',
// }
export async function scoreWhiteMove(historyBeforeMove, fenBeforeMove, san) {
  const node = lookupPosition(historyBeforeMove);

  if (node) {
    // Position is in the opening tree — instant, authoritative score
    const result = treeScore(historyBeforeMove, san);
    return { ...result, source: 'tree' };
  }

  // Position is outside the tree — async engine ranking
  const { score, source, bestMoveSan } = await scoreViaEngines(fenBeforeMove, san);
  return {
    score,
    label: null,
    variationName: null,
    explanation: null,
    layerComplete: null,
    bestMoveSan: bestMoveSan ?? null,
    source,
  };
}
