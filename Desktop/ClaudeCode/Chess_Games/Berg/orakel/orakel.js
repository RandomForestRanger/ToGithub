// Orakel-API (hoofdraad): laai/bou die KLR v K-tabelbasis en bied die enigste
// waarheidsbron vir Kaart 2+ : dtm, bestMoves, defenderMove, defenderCandidates,
// cageSquares, isConceptualFail. Posisies word as FEN-stringe aanvaar/teruggegee.
//
// Moet in dieselfde bladsy as orakel-core.js gelaai word (vir simmetrie/hokkleuring-
// hulpfunksies wat ook op die hoofdraad gebruik word).

(function (root) {
  'use strict';

  const Core = root.OrakelCore;
  if (!Core) throw new Error('orakel-core.js moet voor orakel.js gelaai word');

  const {
    TURN_WHITE, TURN_BLACK,
    packIndex, sqOf, file, rank,
    blackKingMoves, whiteMoves, cageSquares: coreCageSquares,
  } = Core;

  const ORAKEL_VERSION = '1.0.0';
  const DB_NAME = 'sneeuluiperd_tb_v1';
  const STORE_NAME = 'tabelbasis';
  const RECORD_KEY = 'klr-v-k';
  const REMISE = 'REMISE';

  const FILES = 'abcdefgh';
  function toAlgebraic(sq) { return FILES[file(sq)] + (rank(sq) + 1); }
  function fromAlgebraic(s) {
    const f = FILES.indexOf(s[0]);
    const r = parseInt(s[1], 10) - 1;
    return sqOf(f, r);
  }

  // --- Klein eie FEN-parser/serialiseerder (net K,B,N,k -- geen rokade/en-passant nie) ---
  function parseFEN(fen) {
    const parts = fen.trim().split(/\s+/);
    const placement = parts[0];
    const turnCh = parts[1] || 'w';
    const rows = placement.split('/');
    if (rows.length !== 8) throw new Error('ongeldige FEN: 8 rye verwag');
    let wK = -1, wB = -1, wN = -1, bK = -1;
    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const rankNum = 7 - rIdx; // FEN ry 0 = rank 8
      let f = 0;
      for (const ch of rows[rIdx]) {
        if (ch >= '1' && ch <= '8') { f += parseInt(ch, 10); continue; }
        const sq = sqOf(f, rankNum);
        if (ch === 'K') wK = sq;
        else if (ch === 'B') wB = sq;
        else if (ch === 'N') wN = sq;
        else if (ch === 'k') bK = sq;
        else throw new Error(`onverwagte stuk in FEN vir KLR v K: ${ch}`);
        f++;
      }
      if (f !== 8) throw new Error('ongeldige FEN-ry-lengte');
    }
    if (wK < 0 || wB < 0 || wN < 0 || bK < 0) throw new Error('FEN moet presies K,B,N,k bevat');
    const turn = turnCh === 'b' ? TURN_BLACK : TURN_WHITE;
    return { wK, wB, wN, bK, turn };
  }

  function toFEN(pos) {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[rank(pos.wK)][file(pos.wK)] = 'K';
    board[rank(pos.wB)][file(pos.wB)] = 'B';
    board[rank(pos.wN)][file(pos.wN)] = 'N';
    board[rank(pos.bK)][file(pos.bK)] = 'k';
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        row += p;
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const turnCh = pos.turn === TURN_BLACK ? 'b' : 'w';
    return `${rows.join('/')} ${turnCh} - - 0 1`;
  }

  // --- IndexedDB-kas ---
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGet(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  function idbPut(db, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Gesaaide PRNG (mulberry32) vir gelykbreek-keuses ---
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createOrakel() {
    let dtmArr = null;
    let buildTimeMs = null, cacheLoadTimeMs = null, cacheHit = null;
    let maxD = null, tellings = null;

    function idxOf(pos) { return packIndex(pos.wK, pos.wB, pos.wN, pos.bK, pos.turn); }

    function dtm(fen) {
      const pos = parseFEN(fen);
      const v = dtmArr[idxOf(pos)];
      return v === 255 ? REMISE : v;
    }

    function bestMoves(fen) {
      const pos = parseFEN(fen);
      const v = dtmArr[idxOf(pos)];
      const out = [];
      if (pos.turn === TURN_WHITE) {
        for (const m of whiteMoves(pos.wK, pos.wB, pos.wN, pos.bK)) {
          const nwK = m.piece === 'K' ? m.to : pos.wK;
          const nwB = m.piece === 'B' ? m.to : pos.wB;
          const nwN = m.piece === 'N' ? m.to : pos.wN;
          const succIdx = packIndex(nwK, nwB, nwN, pos.bK, TURN_BLACK);
          const succV = dtmArr[succIdx];
          const wantsDraw = v === 255;
          if (wantsDraw ? succV === 255 : succV === v - 1) {
            out.push({ piece: m.piece, to: toAlgebraic(m.to), dtmAfter: succV === 255 ? REMISE : succV });
          }
        }
      } else {
        for (const m of blackKingMoves(pos.wK, pos.wB, pos.wN, pos.bK)) {
          if (m.capture) {
            if (v === 255) out.push({ piece: 'K', to: toAlgebraic(m.to), capture: m.capture, dtmAfter: REMISE });
            continue;
          }
          const succIdx = packIndex(pos.wK, pos.wB, pos.wN, m.to, TURN_WHITE);
          const succV = dtmArr[succIdx];
          const wantsDraw = v === 255;
          if (wantsDraw ? succV === 255 : succV === v - 1) {
            out.push({ piece: 'K', to: toAlgebraic(m.to), dtmAfter: succV === 255 ? REMISE : succV });
          }
        }
      }
      return out;
    }

    function defenderCandidates(fen) {
      const pos = parseFEN(fen);
      if (pos.turn !== TURN_BLACK) throw new Error('defenderCandidates is net vir swart-aan-skuif-posisies');
      const moves = blackKingMoves(pos.wK, pos.wB, pos.wN, pos.bK);
      const out = moves.map((m) => {
        if (m.capture) return { to: toAlgebraic(m.to), capture: m.capture, dtmAfter: REMISE };
        const succIdx = packIndex(pos.wK, pos.wB, pos.wN, m.to, TURN_WHITE);
        const succV = dtmArr[succIdx];
        return { to: toAlgebraic(m.to), capture: null, dtmAfter: succV === 255 ? REMISE : succV };
      });
      out.sort((a, b) => {
        const av = a.dtmAfter === REMISE ? Infinity : a.dtmAfter;
        const bv = b.dtmAfter === REMISE ? Infinity : b.dtmAfter;
        return bv - av; // swart verkies hoogste DTM (of remise) eerste
      });
      return out;
    }

    function defenderMove(fen, beleid, opts) {
      opts = opts || {};
      const candidates = defenderCandidates(fen);
      if (candidates.length === 0) return null; // geen wettige skuiwe (mat of pat)

      if (beleid === 'optimaal') {
        const bestVal = candidates[0].dtmAfter;
        const tier = candidates.filter((c) => c.dtmAfter === bestVal);
        const rng = typeof opts.seed === 'number' ? mulberry32(opts.seed) : Math.random;
        const pick = tier[Math.floor(rng() * tier.length)];
        return pick;
      }
      if (beleid && beleid.tipe === 'slinks') {
        // Dun verdeler na Kaart 2/3 se gemerkte slinkse lyne. Kaart 1 verskaf
        // net die meganisme (validering + uitvoering); WATTER skuif slinks is,
        // word eers in die posisiebank-pyplyn (§3.2-3.3) besluit.
        const found = candidates.find((c) => c.to === beleid.skuif);
        if (!found) throw new Error(`slinks-skuif "${beleid.skuif}" is nie wettig in hierdie posisie nie`);
        return found;
      }
      throw new Error(`onbekende beleid: ${JSON.stringify(beleid)}`);
    }

    function cageSquares(fen) {
      const pos = parseFEN(fen);
      const cage = coreCageSquares(pos.wK, pos.wB, pos.wN);
      const out = [];
      for (let sq = 0; sq < 64; sq++) if (cage[sq]) out.push(toAlgebraic(sq));
      return out;
    }

    // Herhaling (§2.3 voorwaarde 3) is NIE hier nie -- dit vereis skuifgeskiedenis
    // en is Kaart 2 se speletjie-enjin se verantwoordelikheid.
    function isConceptualFail(voorDTM, naDTM) {
      if (naDTM === REMISE) return true;
      if (typeof voorDTM !== 'number' || typeof naDTM !== 'number') return false;
      return (naDTM - voorDTM) >= 8;
    }

    function loadFromCache() {
      return idbOpen().then((db) => idbGet(db).then((rec) => {
        if (!rec || rec.version !== ORAKEL_VERSION) return null;
        return rec;
      }));
    }

    function saveToCache(record) {
      return idbOpen().then((db) => idbPut(db, record)).catch(() => {
        // stille mislukking is aanvaarbaar -- kas is 'n optimalisering, nie 'n vereiste nie
      });
    }

    function buildViaWorker(onProgress) {
      return new Promise((resolve, reject) => {
        const worker = new Worker('orakel-worker.js');
        worker.onmessage = (ev) => {
          const msg = ev.data;
          if (msg.tipe === 'vordering') { if (onProgress) onProgress(msg.persent); return; }
          if (msg.tipe === 'klaar') {
            worker.terminate();
            resolve(msg);
          }
        };
        worker.onerror = (err) => { worker.terminate(); reject(err); };
        worker.postMessage({ tipe: 'bou' });
      });
    }

    function ready(opts) {
      opts = opts || {};
      const t0 = performance.now();
      return loadFromCache().then((cached) => {
        if (cached) {
          dtmArr = new Uint8Array(cached.dtmBuffer);
          maxD = cached.maxD;
          tellings = cached.tellings;
          buildTimeMs = cached.timings ? cached.timings.totalMs : null;
          cacheLoadTimeMs = performance.now() - t0;
          cacheHit = true;
          return self_;
        }
        cacheHit = false;
        return buildViaWorker(opts.onProgress).then((msg) => {
          dtmArr = new Uint8Array(msg.dtmBuffer);
          maxD = msg.maxD;
          tellings = msg.tellings;
          buildTimeMs = msg.timings.totalMs;
          // stoor 'n kopie in die kas (die oorspronklike buffer is reeds na dtmArr toe)
          const copy = new Uint8Array(dtmArr);
          return saveToCache({
            version: ORAKEL_VERSION,
            dtmBuffer: copy.buffer,
            maxD, timings: msg.timings, tellings,
          }).then(() => self_);
        });
      });
    }

    const self_ = {
      ready,
      dtm, bestMoves, defenderMove, defenderCandidates, cageSquares, isConceptualFail,
      parseFEN, toFEN, toAlgebraic, fromAlgebraic,
      REMISE,
      get buildTimeMs() { return buildTimeMs; },
      get cacheLoadTimeMs() { return cacheLoadTimeMs; },
      get cacheHit() { return cacheHit; },
      get maxD() { return maxD; },
      get tellings() { return tellings; },
      get version() { return ORAKEL_VERSION; },
      _debugDtmArray() { return dtmArr; }, // net vir die selftoets-battery
    };
    return self_;
  }

  root.Orakel = createOrakel();
})(typeof self !== 'undefined' ? self : this);
