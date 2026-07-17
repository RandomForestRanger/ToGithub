// KLR v K orakel-kern: posisie-pakking, aanval-tabelle, skuifgenerering.
// Vierkante 0-63 (a1=0 .. h8=63), file = sq&7, rank = sq>>3.
// Suiwer heelgetal-aritmetika -- geen chess.js in hierdie lêer nie (prestasie).

(function (root) {
  'use strict';

  const BOARD_SIZE = 8;
  const NSQ = 64;

  function file(sq) { return sq & 7; }
  function rank(sq) { return sq >> 3; }
  function onBoard(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
  function sqOf(f, r) { return r * 8 + f; }

  const KNIGHT_DELTAS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING_DELTAS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // Plat tipeerde-skikkings vir vinnige, voorspelbare toegang.
  const KNIGHT_FLAT = new Int8Array(NSQ * 8).fill(-1);
  const KNIGHT_CNT = new Uint8Array(NSQ);
  const KING_FLAT = new Int8Array(NSQ * 8).fill(-1);
  const KING_CNT = new Uint8Array(NSQ);
  // Loper: 4 rigtings, elk maks 7 vierkante ver, -1 gevul.
  const BISHOP_RAY_FLAT = new Int8Array(NSQ * 4 * 7).fill(-1);
  const BISHOP_RAY_LEN = new Uint8Array(NSQ * 4);

  // O(1) pare-verhoudingstabelle: is a aangrensend aan b? bereik ruiter a die vierkant b?
  const ADJACENT = new Uint8Array(NSQ * NSQ);
  const KNIGHT_REACH = new Uint8Array(NSQ * NSQ);

  for (let sq = 0; sq < NSQ; sq++) {
    const f0 = file(sq), r0 = rank(sq);
    let cnt = 0;
    for (const [df, dr] of KNIGHT_DELTAS) {
      const f = f0 + df, r = r0 + dr;
      if (onBoard(f, r)) KNIGHT_FLAT[sq * 8 + cnt++] = sqOf(f, r);
    }
    KNIGHT_CNT[sq] = cnt;
    for (let i = 0; i < cnt; i++) KNIGHT_REACH[sq * 64 + KNIGHT_FLAT[sq * 8 + i]] = 1;

    cnt = 0;
    for (const [df, dr] of KING_DELTAS) {
      const f = f0 + df, r = r0 + dr;
      if (onBoard(f, r)) KING_FLAT[sq * 8 + cnt++] = sqOf(f, r);
    }
    KING_CNT[sq] = cnt;
    for (let i = 0; i < cnt; i++) ADJACENT[sq * 64 + KING_FLAT[sq * 8 + i]] = 1;

    for (let d = 0; d < 4; d++) {
      const [df, dr] = BISHOP_DIRS[d];
      let f = f0 + df, r = r0 + dr, len = 0;
      while (onBoard(f, r)) {
        BISHOP_RAY_FLAT[(sq * 4 + d) * 7 + len] = sqOf(f, r);
        len++;
        f += df; r += dr;
      }
      BISHOP_RAY_LEN[sq * 4 + d] = len;
    }
  }

  // --- Indeksering: (wK,wB,wN,bK,turn) -> [0, 33554432) ---
  const TURN_WHITE = 0, TURN_BLACK = 1;
  const INDEX_SPACE = 64 * 64 * 64 * 64 * 2;

  function packIndex(wK, wB, wN, bK, turn) {
    return ((((wK * 64 + wB) * 64 + wN) * 64 + bK) * 2 + turn);
  }
  function unpackIndex(idx) {
    const turn = idx & 1; idx = (idx - turn) / 2;
    const bK = idx & 63; idx = (idx - bK) / 64;
    const wN = idx & 63; idx = (idx - wN) / 64;
    const wB = idx & 63; idx = (idx - wB) / 64;
    const wK = idx & 63;
    return { wK, wB, wN, bK, turn };
  }

  // --- Aanval-toets: is `sq` deur wit (wK,wB,wN) aangeval? ---
  // sK word NOOIT as versperring behandel nie (hy is die stuk wat beweeg / getoets word).
  function attackedByWhite(sq, wK, wB, wN) {
    const kb = wK * 8;
    for (let i = 0; i < KING_CNT[wK]; i++) if (KING_FLAT[kb + i] === sq) return true;
    const nb = wN * 8;
    for (let i = 0; i < KNIGHT_CNT[wN]; i++) if (KNIGHT_FLAT[nb + i] === sq) return true;
    for (let d = 0; d < 4; d++) {
      const base = (wB * 4 + d) * 7;
      const len = BISHOP_RAY_LEN[wB * 4 + d];
      for (let i = 0; i < len; i++) {
        const r = BISHOP_RAY_FLAT[base + i];
        if (r === sq) return true;
        if (r === wK || r === wN) break;
      }
    }
    return false;
  }

  function isLegalPosition(wK, wB, wN, bK, turn) {
    if (wK === wB || wK === wN || wK === bK || wB === wN || wB === bK || wN === bK) return false;
    // Konings mag nooit aangrensend wees nie.
    const kb = wK * 8;
    for (let i = 0; i < KING_CNT[wK]; i++) if (KING_FLAT[kb + i] === bK) return false;
    if (turn === TURN_WHITE) {
      // Dit is wit se beurt: swart mag nie reeds geskaak wees nie
      // (dan sou dit eintlik swart se beurt gewees het om te reageer).
      if (attackedByWhite(bK, wK, wB, wN)) return false;
    }
    // turn === TURN_BLACK: wit kan nooit geskaak wees nie (swart het net 'n koning,
    // en konings-aangrensendheid is reeds hierbo uitgesluit) -- geen verdere toets nodig.
    return true;
  }

  // Swart-koning-skuiwe (bK aan skuif). Gee lys {to, capture}.
  function blackKingMoves(wK, wB, wN, bK) {
    const out = [];
    const kb = bK * 8;
    for (let i = 0; i < KING_CNT[bK]; i++) {
      const c = KING_FLAT[kb + i];
      if (c === wK) continue;
      if (attackedByWhite(c, wK, wB, wN)) continue;
      let capture = null;
      if (c === wB) capture = 'B'; else if (c === wN) capture = 'N';
      out.push({ to: c, capture });
    }
    return out;
  }

  // Wit se skuiwe (K, L, R elk). Gee lys {piece, to}.
  function whiteMoves(wK, wB, wN, bK) {
    const out = [];
    const kb = wK * 8;
    for (let i = 0; i < KING_CNT[wK]; i++) {
      const c = KING_FLAT[kb + i];
      if (c === wB || c === wN || c === bK) continue;
      let adjToBK = false;
      const bkb = bK * 8;
      for (let j = 0; j < KING_CNT[bK]; j++) if (KING_FLAT[bkb + j] === c) { adjToBK = true; break; }
      if (adjToBK) continue;
      out.push({ piece: 'K', to: c });
    }
    const nb = wN * 8;
    for (let i = 0; i < KNIGHT_CNT[wN]; i++) {
      const c = KNIGHT_FLAT[nb + i];
      if (c === wK || c === wB || c === bK) continue;
      out.push({ piece: 'N', to: c });
    }
    for (let d = 0; d < 4; d++) {
      const base = (wB * 4 + d) * 7;
      const len = BISHOP_RAY_LEN[wB * 4 + d];
      for (let i = 0; i < len; i++) {
        const r = BISHOP_RAY_FLAT[base + i];
        if (r === bK) break;
        if (r === wK || r === wN) break;
        out.push({ piece: 'B', to: r });
      }
    }
    return out;
  }

  function isInCheckBlack(wK, wB, wN, bK) {
    return attackedByWhite(bK, wK, wB, wN);
  }

  // Vierkante wat wit (wK,wB,wN) aanval -- volledige 64-lang skikking (vir hokkleuring/selftoetse).
  function computeAttackedSquares(wK, wB, wN) {
    const out = new Uint8Array(64);
    const kb = wK * 8;
    for (let i = 0; i < KING_CNT[wK]; i++) out[KING_FLAT[kb + i]] = 1;
    const nb = wN * 8;
    for (let i = 0; i < KNIGHT_CNT[wN]; i++) out[KNIGHT_FLAT[nb + i]] = 1;
    for (let d = 0; d < 4; d++) {
      const base = (wB * 4 + d) * 7, len = BISHOP_RAY_LEN[wB * 4 + d];
      for (let i = 0; i < len; i++) {
        const r = BISHOP_RAY_FLAT[base + i];
        out[r] = 1;
        if (r === wK || r === wN) break;
      }
    }
    return out;
  }

  // Blokke onbetreebaar vir die verdedigende koning: die aanval-unie plus die
  // drie wit-stukke se eie vierkante (beset).
  function cageSquares(wK, wB, wN) {
    const cage = computeAttackedSquares(wK, wB, wN);
    cage[wK] = 1; cage[wB] = 1; cage[wN] = 1;
    return cage;
  }

  // --- D4-simmetrie: die agt gedaantes (rotasies + refleksies) van 'n vierkant ---
  function symTransformSquare(sq, k) {
    const f = file(sq), r = rank(sq);
    switch (k) {
      case 0: return sqOf(f, r);             // identiteit
      case 1: return sqOf(r, 7 - f);         // rot 90
      case 2: return sqOf(7 - f, 7 - r);     // rot 180
      case 3: return sqOf(7 - r, f);         // rot 270
      case 4: return sqOf(7 - f, r);         // spieël (lêer)
      case 5: return sqOf(f, 7 - r);         // spieël (ry)
      case 6: return sqOf(r, f);             // diagonaal (transponeer)
      case 7: return sqOf(7 - r, 7 - f);     // anti-diagonaal
      default: throw new Error('ongeldige simmetrie-indeks');
    }
  }
  function symTransformPosition(wK, wB, wN, bK, k) {
    return {
      wK: symTransformSquare(wK, k),
      wB: symTransformSquare(wB, k),
      wN: symTransformSquare(wN, k),
      bK: symTransformSquare(bK, k),
    };
  }

  const OrakelCore = {
    NSQ, INDEX_SPACE, TURN_WHITE, TURN_BLACK,
    file, rank, sqOf, onBoard,
    packIndex, unpackIndex,
    attackedByWhite, isLegalPosition,
    blackKingMoves, whiteMoves, isInCheckBlack,
    computeAttackedSquares, cageSquares,
    symTransformSquare, symTransformPosition,
    KING_FLAT, KING_CNT, KNIGHT_FLAT, KNIGHT_CNT, BISHOP_RAY_FLAT, BISHOP_RAY_LEN,
    ADJACENT, KNIGHT_REACH,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = OrakelCore;
  else root.OrakelCore = OrakelCore;
})(typeof self !== 'undefined' ? self : this);
