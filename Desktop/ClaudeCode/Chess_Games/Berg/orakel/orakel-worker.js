// Web Worker: bou die KLR v K-tabelbasis per retrograde analise.
// Boodskappe UIT: {tipe:'vordering', persent} tydens bou; {tipe:'klaar', dtmBuffer, maksD, buildMs, tellings}
// Boodskappe IN: {tipe:'bou'}

importScripts('orakel-core.js');
/* global OrakelCore */

const {
  TURN_WHITE, TURN_BLACK, INDEX_SPACE,
  packIndex, unpackIndex,
  KING_FLAT, KING_CNT, KNIGHT_FLAT, KNIGHT_CNT, BISHOP_RAY_FLAT, BISHOP_RAY_LEN,
  ADJACENT, KNIGHT_REACH,
} = OrakelCore;

const UNKNOWN = 254, INVALID_OR_DRAW = 255;

function bishopSeesOneBlocker(from, to, blocker) {
  for (let d = 0; d < 4; d++) {
    const base = (from * 4 + d) * 7, len = BISHOP_RAY_LEN[from * 4 + d];
    for (let i = 0; i < len; i++) {
      const sq = BISHOP_RAY_FLAT[base + i];
      if (sq === to) return true;
      if (sq === blocker) break;
    }
  }
  return false;
}
function bishopSeesTwoBlockers(from, to, b1, b2) {
  for (let d = 0; d < 4; d++) {
    const base = (from * 4 + d) * 7, len = BISHOP_RAY_LEN[from * 4 + d];
    for (let i = 0; i < len; i++) {
      const sq = BISHOP_RAY_FLAT[base + i];
      if (sq === to) return true;
      if (sq === b1 || sq === b2) break;
    }
  }
  return false;
}
function segmentBetween(from, to) {
  for (let d = 0; d < 4; d++) {
    const base = (from * 4 + d) * 7, len = BISHOP_RAY_LEN[from * 4 + d];
    const seg = [];
    for (let i = 0; i < len; i++) {
      const sq = BISHOP_RAY_FLAT[base + i];
      if (sq === to) return seg;
      seg.push(sq);
    }
  }
  return [];
}

function buildOracle(onProgress) {
  const t0 = Date.now();
  const dtm = new Uint8Array(INDEX_SPACE).fill(UNKNOWN);
  const succCount = new Uint8Array(INDEX_SPACE);
  const queue = new Int32Array(INDEX_SPACE);
  let tail = 0;

  let idx = 0;
  let legalWhiteCnt = 0, legalBlackCnt = 0, mateCnt = 0, drawBlackCnt = 0;
  const attackedSq = new Uint8Array(64);

  for (let wK = 0; wK < 64; wK++) {
    if (onProgress && (wK & 7) === 0) onProgress(0.05 + 0.35 * (wK / 64));
    for (let wB = 0; wB < 64; wB++) {
      if (wB === wK) { idx += 64 * 64 * 2; continue; }
      for (let wN = 0; wN < 64; wN++) {
        if (wN === wK || wN === wB) { idx += 64 * 2; continue; }

        attackedSq.fill(0);
        {
          const kb = wK * 8, kn = KING_CNT[wK];
          for (let i = 0; i < kn; i++) attackedSq[KING_FLAT[kb + i]] = 1;
          const nb = wN * 8, nn = KNIGHT_CNT[wN];
          for (let i = 0; i < nn; i++) attackedSq[KNIGHT_FLAT[nb + i]] = 1;
          for (let d = 0; d < 4; d++) {
            const base = (wB * 4 + d) * 7, len = BISHOP_RAY_LEN[wB * 4 + d];
            for (let i = 0; i < len; i++) {
              const r = BISHOP_RAY_FLAT[base + i];
              attackedSq[r] = 1;
              if (r === wK || r === wN) break;
            }
          }
        }

        for (let bK = 0; bK < 64; bK++) {
          const distinct = bK !== wK && bK !== wB && bK !== wN;
          const kingsAdjacent = ADJACENT[wK * 64 + bK] === 1;
          if (!distinct || kingsAdjacent || attackedSq[bK] === 1) {
            dtm[idx] = INVALID_OR_DRAW;
          } else {
            legalWhiteCnt++;
          }
          idx++;
          if (!distinct || kingsAdjacent) {
            dtm[idx] = INVALID_OR_DRAW;
          } else {
            legalBlackCnt++;
            let count = 0, hasCapture = false;
            const bkb = bK * 8, bkn = KING_CNT[bK];
            for (let i = 0; i < bkn; i++) {
              const c = KING_FLAT[bkb + i];
              if (c === wK) continue;
              if (attackedSq[c] === 1) continue;
              count++;
              if (c === wB || c === wN) hasCapture = true;
            }
            if (hasCapture) {
              dtm[idx] = INVALID_OR_DRAW;
              drawBlackCnt++;
            } else if (count === 0) {
              if (attackedSq[bK] === 1) {
                dtm[idx] = 0;
                queue[tail++] = idx;
                mateCnt++;
              } else {
                dtm[idx] = INVALID_OR_DRAW;
                drawBlackCnt++;
              }
            } else {
              succCount[idx] = count;
            }
          }
          idx++;
        }
      }
    }
  }
  const t1 = Date.now();
  if (onProgress) onProgress(0.4);

  let head = 0, processed = 0, maxD = 0;
  const progressEvery = Math.max(1, (tail || 1) * 4);
  while (head < tail) {
    const cur = queue[head++];
    processed++;
    if (onProgress && (processed % 500000) === 0) {
      onProgress(0.4 + 0.55 * Math.min(1, processed / progressEvery));
    }
    const d = dtm[cur];
    if (d > maxD) maxD = d;
    const t = cur & 1;
    let rest = cur >>> 1;
    const bK = rest & 63; rest >>>= 6;
    const wN = rest & 63; rest >>>= 6;
    const wB = rest & 63; rest >>>= 6;
    const wK = rest & 63;

    if (t === TURN_BLACK) {
      {
        const knightFixed = KNIGHT_REACH[wN * 64 + bK] === 1;
        const bishopIgnoringC = bishopSeesOneBlocker(wB, bK, wN);
        const seg = bishopIgnoringC ? segmentBetween(wB, bK) : null;
        const kb = wK * 8, n = KING_CNT[wK];
        for (let i = 0; i < n; i++) {
          const c = KING_FLAT[kb + i];
          if (c === wB || c === wN || c === bK) continue;
          if (ADJACENT[c * 64 + bK] === 1) continue;
          if (knightFixed) continue;
          if (bishopIgnoringC && !seg.includes(c)) continue;
          const pIdx = packIndex(c, wB, wN, bK, TURN_WHITE);
          if (dtm[pIdx] === UNKNOWN) { dtm[pIdx] = d + 1; queue[tail++] = pIdx; }
        }
      }
      {
        const kingFixed = ADJACENT[wK * 64 + bK] === 1;
        if (!kingFixed) {
          const bishopIgnoringC = bishopSeesOneBlocker(wB, bK, wK);
          const seg = bishopIgnoringC ? segmentBetween(wB, bK) : null;
          const nb = wN * 8, n = KNIGHT_CNT[wN];
          for (let i = 0; i < n; i++) {
            const c = KNIGHT_FLAT[nb + i];
            if (c === wK || c === wB || c === bK) continue;
            if (KNIGHT_REACH[c * 64 + bK] === 1) continue;
            if (bishopIgnoringC && !seg.includes(c)) continue;
            const pIdx = packIndex(wK, wB, c, bK, TURN_WHITE);
            if (dtm[pIdx] === UNKNOWN) { dtm[pIdx] = d + 1; queue[tail++] = pIdx; }
          }
        }
      }
      {
        const kingFixed = ADJACENT[wK * 64 + bK] === 1;
        const knightFixed = KNIGHT_REACH[wN * 64 + bK] === 1;
        if (!kingFixed && !knightFixed) {
          for (let dir = 0; dir < 4; dir++) {
            const base = (wB * 4 + dir) * 7, len = BISHOP_RAY_LEN[wB * 4 + dir];
            for (let i = 0; i < len; i++) {
              const r = BISHOP_RAY_FLAT[base + i];
              if (r === wK || r === wN || r === bK) break;
              if (!bishopSeesTwoBlockers(r, bK, wK, wN)) {
                const pIdx = packIndex(wK, r, wN, bK, TURN_WHITE);
                if (dtm[pIdx] === UNKNOWN) { dtm[pIdx] = d + 1; queue[tail++] = pIdx; }
              }
            }
          }
        }
      }
    } else {
      const kb = bK * 8, n = KING_CNT[bK];
      for (let i = 0; i < n; i++) {
        const c = KING_FLAT[kb + i];
        if (c === wK || c === wB || c === wN) continue;
        if (ADJACENT[wK * 64 + c] === 1) continue;
        const rIdx = packIndex(wK, wB, wN, c, TURN_BLACK);
        if (dtm[rIdx] === UNKNOWN) {
          succCount[rIdx]--;
          if (succCount[rIdx] === 0) { dtm[rIdx] = d + 1; queue[tail++] = rIdx; }
        }
      }
    }
  }
  const t2 = Date.now();

  let sweepCount = 0;
  for (let i = 0; i < INDEX_SPACE; i++) {
    if (dtm[i] === UNKNOWN) { dtm[i] = INVALID_OR_DRAW; sweepCount++; }
  }
  const t3 = Date.now();
  if (onProgress) onProgress(1);

  return {
    dtm,
    maxD,
    timings: { passAMs: t1 - t0, passBMs: t2 - t1, sweepMs: t3 - t2, totalMs: t3 - t0 },
    tellings: { legalWhiteCnt, legalBlackCnt, mateCnt, drawBlackCnt, sweepCount, processed },
  };
}

self.onmessage = function (ev) {
  const msg = ev.data;
  if (!msg || msg.tipe !== 'bou') return;
  const { dtm, maxD, timings, tellings } = buildOracle((p) => {
    self.postMessage({ tipe: 'vordering', persent: p });
  });
  self.postMessage(
    { tipe: 'klaar', dtmBuffer: dtm.buffer, maxD, timings, tellings },
    [dtm.buffer]
  );
};
