// Selftoets-battery vir Kaart 1 se orakel. Loop direk teen die orakel se
// interne DTM-skikking (vir spoed by uitputtende toetse) en teen die publieke
// API (vir die FEN/API-lae self).
(function () {
  'use strict';

  const Core = window.OrakelCore;
  const {
    TURN_WHITE, TURN_BLACK, INDEX_SPACE,
    packIndex, unpackIndex, isLegalPosition,
    blackKingMoves, whiteMoves,
    symTransformPosition, cageSquares: coreCageSquares, computeAttackedSquares,
    file, rank, sqOf,
    KING_FLAT, KING_CNT,
  } = Core;

  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const resultsBox = document.getElementById('results');
  const uitslaeEl = document.getElementById('toetsUitslae');
  const opsommingEl = document.getElementById('opsomming');

  let pass = 0, fail = 0;
  function reël(naam, ok, detail) {
    if (ok) pass++; else fail++;
    const div = document.createElement('div');
    div.className = 'reël ' + (ok ? 'geslaag' : 'faal');
    div.textContent = (ok ? 'GESLAAG — ' : 'FAAL — ') + naam + (detail ? ' :: ' + detail : '');
    uitslaeEl.appendChild(div);
  }
  function metriek(tekst) {
    const div = document.createElement('div');
    div.className = 'reël metrieke';
    div.textContent = tekst;
    uitslaeEl.appendChild(div);
  }

  const FILES = 'abcdefgh';
  const sqAlg = (sq) => FILES[file(sq)] + (rank(sq) + 1);

  function toFEN(wK, wB, wN, bK, turn) {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[rank(wK)][file(wK)] = 'K';
    board[rank(wB)][file(wB)] = 'B';
    board[rank(wN)][file(wN)] = 'N';
    board[rank(bK)][file(bK)] = 'k';
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
    return rows.join('/') + ' ' + (turn === TURN_BLACK ? 'b' : 'w') + ' - - 0 1';
  }

  statusText.textContent = 'Orakel word gebou/gelaai...';
  const tPageStart = performance.now();

  window.Orakel.ready({
    onProgress: (p) => { progressBar.value = p; },
  }).then((Orakel) => {
    progressBar.value = 1;
    const dtm = Orakel._debugDtmArray();
    const cacheHit = Orakel.cacheHit;
    const buildMs = Orakel.buildTimeMs;
    const cacheMs = Orakel.cacheLoadTimeMs;

    statusText.textContent = cacheHit
      ? `Tabelbasis uit IndexedDB-kas gelaai in ${cacheMs.toFixed(0)} ms.`
      : `Tabelbasis van nuuts af gebou in ${buildMs} ms (nou in kas gestoor).`;
    resultsBox.style.display = 'block';

    metriek(`Kasgeraak (cache hit): ${cacheHit}`);
    if (cacheHit) {
      metriek(`Kas-laaityd: ${cacheMs.toFixed(1)} ms (harde hek: <1000 ms)`);
      reël('Kas-laaityd < 1s (harde hek)', cacheMs < 1000, `${cacheMs.toFixed(1)} ms`);
    } else {
      metriek(`Bou-tyd: ${buildMs} ms (rigsnoer: ≤5000 ms, harde plafon: 15000 ms)`);
      reël('Bou-tyd ≤ 15s (harde plafon)', buildMs <= 15000, `${buildMs} ms`);
      if (buildMs > 5000) metriek(`Let wel: bou-tyd is bo die 5s-rigsnoer maar binne die 15s-harde-plafon (nie 'n hek nie).`);
    }

    // --- 1. Globale invariant: maks-DTM = presies 33 skuiwe ---
    const maxD = Orakel.maxD;
    const maxMoves = Math.ceil(maxD / 2);
    reël('Globale invariant: maks-DTM = presies 33 skuiwe', maxMoves === 33, `maks-DTM=${maxD} plies = ${maxMoves} skuiwe`);

    // --- 2. Lokale konsekwentheid: elke wenposisie het >=1 skuif na DTM-1 (uitputtend) ---
    (function localConsistency() {
      const t0 = performance.now();
      let checked = 0, failed = 0;
      for (let idx = 0; idx < INDEX_SPACE; idx++) {
        const d = dtm[idx];
        if (d === 254 || d === 255 || d === 0) continue;
        const p = unpackIndex(idx);
        checked++;
        let found = false;
        if (p.turn === TURN_BLACK) {
          for (const m of blackKingMoves(p.wK, p.wB, p.wN, p.bK)) {
            if (m.capture) continue;
            const succIdx = packIndex(p.wK, p.wB, p.wN, m.to, TURN_WHITE);
            if (dtm[succIdx] === d - 1) { found = true; break; }
          }
        } else {
          for (const m of whiteMoves(p.wK, p.wB, p.wN, p.bK)) {
            const nwK = m.piece === 'K' ? m.to : p.wK;
            const nwB = m.piece === 'B' ? m.to : p.wB;
            const nwN = m.piece === 'N' ? m.to : p.wN;
            const succIdx = packIndex(nwK, nwB, nwN, p.bK, TURN_BLACK);
            if (dtm[succIdx] === d - 1) { found = true; break; }
          }
        }
        if (!found) failed++;
      }
      const t1 = performance.now();
      reël('Lokale konsekwentheid (uitputtend oor alle wenposisies)', failed === 0, `${checked} getoets, ${failed} mislukkings, ${(t1 - t0).toFixed(0)} ms`);
    })();

    // --- 3. Agt-simmetrie-ooreenstemming ---
    (function symmetryTest() {
      let rounds = 0, mismatches = 0, tries = 0;
      const N = 2000;
      while (rounds < N && tries < N * 20) {
        tries++;
        const wK = (Math.random() * 64) | 0, wB = (Math.random() * 64) | 0;
        const wN = (Math.random() * 64) | 0, bK = (Math.random() * 64) | 0;
        const turn = (Math.random() * 2) | 0;
        if (!isLegalPosition(wK, wB, wN, bK, turn)) continue;
        rounds++;
        const baseVal = dtm[packIndex(wK, wB, wN, bK, turn)];
        for (let k = 1; k < 8; k++) {
          const t = symTransformPosition(wK, wB, wN, bK, k);
          const tVal = dtm[packIndex(t.wK, t.wB, t.wN, t.bK, turn)];
          if (tVal !== baseVal) mismatches++;
        }
      }
      reël('8-simmetrie-ooreenstemming (D4-gedaantes)', mismatches === 0, `${rounds} posisies × 7 gedaantes, ${mismatches} wanverskille`);
    })();

    // --- 4. cageSquares op 5 hand-gekontroleerde posisies ---
    (function cageTest() {
      const cases = [
        { wK: sqOf(4, 3), wB: sqOf(3, 2), wN: sqOf(5, 2) },
        { wK: sqOf(0, 0), wB: sqOf(2, 2), wN: sqOf(1, 2) },
        { wK: sqOf(7, 7), wB: sqOf(5, 5), wN: sqOf(6, 5) },
        { wK: sqOf(3, 0), wB: sqOf(0, 3), wN: sqOf(4, 4) },
        { wK: sqOf(4, 4), wB: sqOf(1, 1), wN: sqOf(2, 4) },
      ];
      let allOk = true;
      const knightDeltas = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
      const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const { wK, wB, wN } of cases) {
        const cage = coreCageSquares(wK, wB, wN);
        const expect = new Uint8Array(64);
        expect[wK] = 1; expect[wB] = 1; expect[wN] = 1;
        for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const f = file(wK) + df, r = rank(wK) + dr;
          if (f >= 0 && f < 8 && r >= 0 && r < 8) expect[sqOf(f, r)] = 1;
        }
        for (const [df, dr] of knightDeltas) {
          const f = file(wN) + df, r = rank(wN) + dr;
          if (f >= 0 && f < 8 && r >= 0 && r < 8) expect[sqOf(f, r)] = 1;
        }
        for (const [df, dr] of bishopDirs) {
          let f = file(wB) + df, r = rank(wB) + dr;
          while (f >= 0 && f < 8 && r >= 0 && r < 8) {
            const sq = sqOf(f, r);
            expect[sq] = 1;
            if (sq === wK || sq === wN) break;
            f += df; r += dr;
          }
        }
        for (let sq = 0; sq < 64; sq++) if (cage[sq] !== expect[sq]) allOk = false;
      }
      reël('cageSquares op 5 hand-gekontroleerde posisies', allOk);
    })();

    // --- 5. Hand-verifieerbare bekende posisies ---
    (function knownPositions() {
      let mateIn1 = null, mateIn2 = null, stalemateTrap = null, alreadyMate = null;
      for (let idx = 0; idx < INDEX_SPACE && !(mateIn1 && mateIn2 && stalemateTrap && alreadyMate); idx++) {
        const v = dtm[idx];
        const p = unpackIndex(idx);
        if (!mateIn1 && p.turn === TURN_WHITE && v === 1) mateIn1 = p;
        if (!mateIn2 && p.turn === TURN_WHITE && v === 3) mateIn2 = p;
        if (!alreadyMate && p.turn === TURN_BLACK && v === 0) alreadyMate = p;
        if (!stalemateTrap && p.turn === TURN_BLACK && v === 255 && isLegalPosition(p.wK, p.wB, p.wN, p.bK, p.turn)) {
          const attacked = computeAttackedSquares(p.wK, p.wB, p.wN);
          let hasMove = false, hasCapture = false;
          for (let i = 0; i < KING_CNT[p.bK]; i++) {
            const c = KING_FLAT[p.bK * 8 + i];
            if (c === p.wK) continue;
            if (attacked[c]) continue;
            hasMove = true;
            if (c === p.wB || c === p.wN) hasCapture = true;
          }
          if (!hasMove && !hasCapture && !attacked[p.bK]) stalemateTrap = p;
        }
      }

      function fenOrNone(p) { return p ? toFEN(p.wK, p.wB, p.wN, p.bK, p.turn) : '(nie gevind nie)'; }
      metriek('reeds-mat: ' + fenOrNone(alreadyMate));
      metriek('mat-in-1 (dtm=1 ply): ' + fenOrNone(mateIn1));
      metriek('mat-in-2 (dtm=3 plies): ' + fenOrNone(mateIn2));
      metriek('pat-strik: ' + fenOrNone(stalemateTrap));

      let ok1 = false;
      if (alreadyMate) {
        const { wK, wB, wN, bK } = alreadyMate;
        const attacked = computeAttackedSquares(wK, wB, wN);
        let hasMove = false;
        for (let i = 0; i < KING_CNT[bK]; i++) {
          const c = KING_FLAT[bK * 8 + i];
          if (c !== wK && !attacked[c]) hasMove = true;
        }
        ok1 = attacked[bK] === 1 && !hasMove;
      }
      reël('Handverifikasie: "reeds mat"-posisie is werklik skaakmat', ok1);

      let ok2 = false;
      if (stalemateTrap) {
        const { wK, wB, wN, bK } = stalemateTrap;
        const attacked = computeAttackedSquares(wK, wB, wN);
        let hasMove = false;
        for (let i = 0; i < KING_CNT[bK]; i++) {
          const c = KING_FLAT[bK * 8 + i];
          if (c !== wK && !attacked[c]) hasMove = true;
        }
        ok2 = attacked[bK] === 0 && !hasMove;
      }
      reël('Handverifikasie: pat-strik is werklik pat', ok2);
      reël('Mat-in-1-posisie gevind', !!mateIn1);
      reël('Mat-in-2-posisie gevind', !!mateIn2);
    })();

    // --- 6. chess.js-skeidsregter: kruiskontrole van skuifgenerering ---
    (function arbiterTest() {
      const N = 5000;
      let checked = 0, mismatches = 0;
      for (let i = 0; i < N; i++) {
        let wK, wB, wN, bK, turn;
        do {
          wK = (Math.random() * 64) | 0; wB = (Math.random() * 64) | 0;
          wN = (Math.random() * 64) | 0; bK = (Math.random() * 64) | 0;
          turn = (Math.random() * 2) | 0;
        } while (!isLegalPosition(wK, wB, wN, bK, turn));
        const fen = toFEN(wK, wB, wN, bK, turn);
        const chess = new Chess(fen);
        const theirs = new Set(chess.moves({ verbose: true }).map((m) => m.from + m.to));
        const mine = new Set();
        if (turn === TURN_BLACK) {
          for (const m of blackKingMoves(wK, wB, wN, bK)) mine.add(sqAlg(bK) + sqAlg(m.to));
        } else {
          for (const m of whiteMoves(wK, wB, wN, bK)) {
            const from = m.piece === 'K' ? wK : m.piece === 'N' ? wN : wB;
            mine.add(sqAlg(from) + sqAlg(m.to));
          }
        }
        checked++;
        let equal = mine.size === theirs.size;
        if (equal) for (const x of mine) if (!theirs.has(x)) { equal = false; break; }
        if (!equal) mismatches++;
      }
      reël('chess.js-skeidsregter kruiskontrole', mismatches === 0, `${checked} posisies, ${mismatches} wanverskille`);
    })();

    const totalMs = (performance.now() - tPageStart).toFixed(0);
    opsommingEl.textContent = `${pass} geslaag, ${fail} gefaal. (Bladsy-totale tyd: ${totalMs} ms)`;
    opsommingEl.style.color = fail === 0 ? '#2ecc71' : '#e74c3c';
  }).catch((err) => {
    statusText.textContent = 'FOUT: orakel kon nie laai/bou nie — ' + (err && err.message ? err.message : err);
    statusText.style.color = '#e74c3c';
  });
})();
