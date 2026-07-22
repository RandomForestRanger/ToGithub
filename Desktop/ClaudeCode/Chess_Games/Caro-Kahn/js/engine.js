/* Die Caro-Kann in Blokkie-wêreld — engine layer: script tree interpreter, Lichess book layer,
   Stockfish Blob-worker layer, eval waterfall (sfAnalyse), move-25 blunder logic.
   Depends on data.js. Follows the shared eval-pipeline conventions from the
   suite's root CLAUDE.md: cp/mate from sfAnalyse are side-to-move perspective;
   callers convert to White-absolute using the FEN's side-to-move field,
   captured synchronously — never inside a .then().
   Lichess token: window.LICHESS_TOKEN || '' (set via Netlify snippet injection
   or a local gitignored config.local.js — apps fall back gracefully without it). */

const KKEngine = (function () {
  const PLAY_SKILL_LEVEL = 6; // beatable but fair, ~1200-1400 target strength
  const PLAY_MOVETIME_MS = 500;
  const ANALYSIS_SKILL_LEVEL = 20;
  const ANALYSIS_DEPTH = 14;
  const BLUNDER_MULTIPV = 8;

  // ── Local Stockfish (Blob-Worker) ─────────────────────────────────────
  let sfWorker = null;
  let sfWorkerReady = false;
  let sfWorkerQueue = [];
  let sfJobId = 0;
  let sfInitPromise = null;

  function initLocalStockfish() {
    if (sfInitPromise) return sfInitPromise;
    sfInitPromise = fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
      .then(r => r.text())
      .then(code => {
        const blob = new Blob([code], { type: 'application/javascript' });
        sfWorker = new Worker(URL.createObjectURL(blob));
        sfWorker.onmessage = function (e) {
          const line = e.data;
          if (line === 'uciok' || line === 'readyok') sfWorkerReady = true;
          sfWorkerQueue.forEach(item => item && item(line));
        };
        sfWorker.onerror = function (err) {
          console.warn('Stockfish worker error:', err);
          sfWorker = null;
        };
        sfWorker.postMessage('uci');
      })
      .catch(err => console.warn('Stockfish fetch failed:', err));
    return sfInitPromise;
  }

  function localStockfishAnalyse(fen, depth, multipv) {
    return new Promise(resolve => {
      if (!sfWorker) { resolve(null); return; }
      sfWorker.postMessage('stop');
      const myJobId = ++sfJobId;
      let results = [];
      let done = false;
      const timeout = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(results.length ? results : null); } }, 8000);
      const callback = (line) => {
        if (done) return;
        if (myJobId !== sfJobId) { done = true; clearTimeout(timeout); cleanup(); resolve(null); return; }
        if (typeof line === 'string' && line.startsWith('info') && line.includes(' pv ')) {
          const depthM = line.match(/depth (\d+)/);
          const mpvM = line.match(/multipv (\d+)/);
          const scoreM = line.match(/score (cp|mate) (-?\d+)/);
          const pvM = line.match(/ pv (\S+)/);
          if (depthM && scoreM && pvM && parseInt(depthM[1]) >= depth - 2) {
            const mpv = mpvM ? parseInt(mpvM[1]) : 1;
            const entry = {
              multipv: mpv, move: pvM[1],
              cp: scoreM[1] === 'cp' ? parseInt(scoreM[2]) : undefined,
              mate: scoreM[1] === 'mate' ? parseInt(scoreM[2]) : undefined
            };
            const idx = results.findIndex(r => r.multipv === mpv);
            if (idx >= 0) results[idx] = entry; else results.push(entry);
          }
        }
        if (typeof line === 'string' && line.startsWith('bestmove')) {
          done = true; clearTimeout(timeout); cleanup();
          results.sort((a, b) => a.multipv - b.multipv);
          resolve(results.length ? results : null);
        }
      };
      const cleanup = () => { const i = sfWorkerQueue.indexOf(callback); if (i >= 0) sfWorkerQueue.splice(i, 1); };
      sfWorkerQueue.push(callback);
      sfWorker.postMessage('ucinewgame');
      sfWorker.postMessage('setoption name Skill Level value ' + ANALYSIS_SKILL_LEVEL);
      sfWorker.postMessage('setoption name MultiPV value ' + multipv);
      sfWorker.postMessage('position fen ' + fen);
      sfWorker.postMessage('go depth ' + depth);
    });
  }

  function localStockfishPlay(fen, skillLevel, movetimeMs) {
    return new Promise(resolve => {
      if (!sfWorker) { resolve(null); return; }
      sfWorker.postMessage('stop');
      const myJobId = ++sfJobId;
      let done = false;
      let lastInfo = null;
      const timeout = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(null); } }, movetimeMs + 4000);
      const callback = (line) => {
        if (done) return;
        if (myJobId !== sfJobId) { done = true; clearTimeout(timeout); cleanup(); resolve(null); return; }
        if (typeof line === 'string' && line.startsWith('info') && line.includes(' pv ')) {
          const scoreM = line.match(/score (cp|mate) (-?\d+)/);
          if (scoreM) lastInfo = { cp: scoreM[1] === 'cp' ? parseInt(scoreM[2]) : undefined, mate: scoreM[1] === 'mate' ? parseInt(scoreM[2]) : undefined };
        }
        if (typeof line === 'string' && line.startsWith('bestmove')) {
          done = true; clearTimeout(timeout); cleanup();
          const m = line.match(/bestmove (\S+)/);
          const move = m ? m[1] : null;
          resolve(move && move !== '(none)' ? Object.assign({ move }, lastInfo || {}) : null);
        }
      };
      const cleanup = () => { const i = sfWorkerQueue.indexOf(callback); if (i >= 0) sfWorkerQueue.splice(i, 1); };
      sfWorkerQueue.push(callback);
      sfWorker.postMessage('ucinewgame');
      sfWorker.postMessage('setoption name Skill Level value ' + skillLevel);
      sfWorker.postMessage('position fen ' + fen);
      sfWorker.postMessage('go movetime ' + movetimeMs);
    });
  }

  // ── Cloud Eval / Stockfish Online / waterfall ─────────────────────────
  async function cloudEval(fen, multipv) {
    try {
      const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multipv}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const headers = {};
      if (window.LICHESS_TOKEN) headers.Authorization = 'Bearer ' + window.LICHESS_TOKEN;
      const resp = await fetch(url, { signal: ctrl.signal, headers });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data || !data.pvs || !data.pvs.length) return null;
      // Lichess Cloud Eval reports cp/mate from White's ABSOLUTE perspective
      // always (confirmed against the Fool's Mate position: Black-to-move,
      // mate-in-1-for-Black comes back as mate:-1, i.e. "White gets mated").
      // sfAnalyse's contract (see file header) is SIDE-TO-MOVE perspective,
      // same as stockfishOnlineAnalyse below — flip here so cloudEval matches.
      const whiteToMove = fen.split(' ')[1] === 'w';
      return data.pvs.slice(0, multipv).map((pv, i) => ({
        multipv: i + 1,
        move: pv.moves ? pv.moves.split(' ')[0] : null,
        cp: pv.cp !== undefined ? (whiteToMove ? pv.cp : -pv.cp) : undefined,
        mate: pv.mate !== undefined ? (whiteToMove ? pv.mate : -pv.mate) : undefined
      })).filter(r => r.move);
    } catch (e) { return null; }
  }

  async function stockfishOnlineAnalyse(fen, depth) {
    try {
      const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${Math.min(depth, 15)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data.success) return null;
      let move = data.bestmove || '';
      if (move.startsWith('bestmove ')) move = move.split(' ')[1];
      if (!move || move === '(none)') return null;
      if (data.mate !== null && data.mate !== undefined) return [{ multipv: 1, move, mate: data.mate }];
      const whiteToMove = fen.split(' ')[1] === 'w';
      const cpFromWhite = Math.round((data.evaluation || 0) * 100);
      const cp = whiteToMove ? cpFromWhite : -cpFromWhite;
      return [{ multipv: 1, move, cp }];
    } catch (e) { return null; }
  }

  // Returns array of {multipv, move(uci), cp, mate} in SIDE-TO-MOVE perspective.
  async function sfAnalyse(fen, depth, multipv) {
    const ce = await cloudEval(fen, multipv);
    if (ce && ce.length) return ce;
    if (multipv === 1) {
      const so = await stockfishOnlineAnalyse(fen, depth);
      if (so && so.length) return so;
    }
    return localStockfishAnalyse(fen, depth, multipv);
  }

  function uciToSan(fen, uci) {
    try {
      const c = new Chess(fen);
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      return m ? m.san : uci;
    } catch (e) { return uci; }
  }

  // ── Book layer: Lichess Opening Explorer ──────────────────────────────
  const bookCache = new Map();

  async function queryExplorer(kind, uciHistory) {
    try {
      const base = kind === 'masters' ? 'https://explorer.lichess.ovh/masters' : 'https://explorer.lichess.ovh/lichess';
      const params = new URLSearchParams();
      if (uciHistory.length) params.set('play', uciHistory.join(','));
      if (kind === 'lichess') { params.set('speeds', 'blitz,rapid,classical'); params.set('ratings', '1600,1800,2000'); }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const headers = {};
      if (window.LICHESS_TOKEN) headers.Authorization = 'Bearer ' + window.LICHESS_TOKEN;
      const resp = await fetch(`${base}?${params.toString()}`, { signal: ctrl.signal, headers });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data.moves || !data.moves.length) return null;
      return data.moves.map(m => ({ san: m.san, uci: m.uci, games: (m.white || 0) + (m.draws || 0) + (m.black || 0) }));
    } catch (e) { return null; }
  }

  function weightedPickBookMove(moves) {
    const top = moves.slice(0, 5);
    const total = top.reduce((a, m) => a + m.games, 0);
    if (total <= 0) return top[0];
    let r = Math.random() * total;
    for (const m of top) { r -= m.games; if (r <= 0) return m; }
    return top[top.length - 1];
  }

  async function bookMove(uciHistory) {
    const cacheKey = uciHistory.join(',');
    if (bookCache.has(cacheKey)) return bookCache.get(cacheKey);
    let moves = await queryExplorer('masters', uciHistory);
    if (!moves || !moves.length) moves = await queryExplorer('lichess', uciHistory);
    const result = (moves && moves.length) ? weightedPickBookMove(moves) : null;
    if (bookCache.size > 50) bookCache.delete(bookCache.keys().next().value);
    bookCache.set(cacheKey, result);
    return result;
  }

  // ── Script layer: walks a data.js tree as moves are played ────────────
  function newScriptState(worldId) {
    return { node: WORLD_TREES[worldId], pendingBMap: null, pendingTrap: null };
  }

  function scriptIsFreePlay(state) { return !state.node; }

  // Consumes the current node's White move (fixed or random-branch), advances
  // the pending Black-move map/trap, and returns the SAN White should play.
  function scriptNextWhiteMove(state) {
    if (!state.node) return null;
    let san, bMap, trap;
    if (state.node.wRandom) {
      san = state.node.wRandom[Math.floor(Math.random() * state.node.wRandom.length)];
      const branch = state.node.branches[san];
      bMap = branch.b; trap = branch.trap || null;
    } else {
      san = state.node.w;
      bMap = state.node.b; trap = state.node.trap || null;
    }
    state.pendingBMap = bMap;
    state.pendingTrap = trap;
    return san;
  }

  // Checks a Black move against the pending accept-set/trap for this ply.
  // Returns { status: 'accepted'|'trap'|'rejected', acceptedMoves, trap? }
  function scriptCheckBlackMove(state, sanPlayed) {
    const bMap = state.pendingBMap;
    const trap = state.pendingTrap;
    const acceptedMoves = bMap ? Object.keys(bMap) : [];
    if (bMap && Object.prototype.hasOwnProperty.call(bMap, sanPlayed)) {
      state.node = bMap[sanPlayed];
      return { status: 'accepted', acceptedMoves };
    }
    if (trap && sanPlayed === trap.move) {
      return { status: 'trap', acceptedMoves, trap };
    }
    return { status: 'rejected', acceptedMoves };
  }

  // ── Move-25 planned blunder ────────────────────────────────────────────
  function scoreValue(entry) {
    if (entry.mate !== undefined) return entry.mate > 0 ? (100000 - entry.mate) : (-100000 - entry.mate);
    return entry.cp;
  }

  async function pickBlunderMove(fen) {
    const analysis = await sfAnalyse(fen, ANALYSIS_DEPTH, BLUNDER_MULTIPV);
    if (!analysis || analysis.length < 2) return null;
    const top = analysis[0];
    const topVal = scoreValue(top);
    const candidates = analysis.slice(1).map(c => ({ entry: c, drop: topVal - scoreValue(c) }));
    const safe = candidates.filter(c => c.drop >= SCORE.BLUNDER_MIN_CP_LOSS && !(c.entry.mate !== undefined && c.entry.mate === -1));
    let chosen;
    if (safe.length) {
      chosen = safe.reduce((best, c) => (c.drop > best.drop ? c : best), safe[0]);
    } else {
      const anyQualifying = candidates.filter(c => c.drop >= SCORE.BLUNDER_MIN_CP_LOSS);
      if (!anyQualifying.length) return null;
      chosen = anyQualifying.reduce((best, c) => (c.drop < best.drop ? c : best), anyQualifying[0]);
    }
    return { san: uciToSan(fen, chosen.entry.move), uci: chosen.entry.move };
  }

  // Eval for White's absolute perspective at a given FEN (used for the
  // blunder skip-guard and resignation trigger). Converts synchronously
  // using the FEN's own side-to-move field, never game.turn() post-await.
  async function evalForWhite(fen) {
    const analysis = await sfAnalyse(fen, ANALYSIS_DEPTH, 1);
    if (!analysis || !analysis.length) return 0;
    const whiteToMove = fen.split(' ')[1] === 'w';
    const r = analysis[0];
    if (r.mate !== undefined) {
      const mateForSideToMove = r.mate;
      const cpEquivalent = mateForSideToMove > 0 ? 100000 : -100000;
      return whiteToMove ? cpEquivalent : -cpEquivalent;
    }
    return whiteToMove ? r.cp : -r.cp;
  }

  async function stockfishPlayMove(fen) {
    if (!sfWorkerReady) await initLocalStockfish();
    // give the worker a moment to answer 'uciok' after fetch resolves
    let waited = 0;
    while (!sfWorkerReady && waited < 4000) { await new Promise(r => setTimeout(r, 100)); waited += 100; }
    const r = await localStockfishPlay(fen, PLAY_SKILL_LEVEL, PLAY_MOVETIME_MS);
    if (!r) return null;
    return { san: uciToSan(fen, r.move), uci: r.move };
  }

  // ── Top-level orchestration ────────────────────────────────────────────
  // session: { scriptState, uciHistory: string[], whiteMoveNumber: int }
  async function getWhiteMove(session, fen) {
    if (!scriptIsFreePlay(session.scriptState)) {
      const san = scriptNextWhiteMove(session.scriptState);
      if (san) return { san, source: 'script' };
    }

    if (session.whiteMoveNumber === SCORE.BLUNDER_MOVE_NUMBER) {
      const currentEval = await evalForWhite(fen);
      if (currentEval >= SCORE.SKIP_BLUNDER_IF_WHITE_EVAL_BELOW) {
        const blunder = await pickBlunderMove(fen);
        if (blunder) return { san: blunder.san, source: 'blunder' };
      }
    }

    const book = await bookMove(session.uciHistory);
    if (book) return { san: book.san, source: 'book' };

    const played = await stockfishPlayMove(fen);
    if (played) return { san: played.san, source: 'stockfish' };
    return null;
  }

  return {
    initLocalStockfish, sfAnalyse, uciToSan, bookMove,
    newScriptState, scriptIsFreePlay, scriptNextWhiteMove, scriptCheckBlackMove,
    evalForWhite, pickBlunderMove, getWhiteMove,
    ANALYSIS_DEPTH
  };
})();
