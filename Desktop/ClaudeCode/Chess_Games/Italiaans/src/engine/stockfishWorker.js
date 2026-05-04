// Stockfish.js 10 — CDN blob-worker pattern.
//
// Public API:
//   init()                        → Promise<void>   (auto-called on first use)
//   getBestMove(fen, depth)       → Promise<Move|null>
//   getMultiPV(fen, depth, count) → Promise<Move[]>  (ranked best→worst)
//
// Move: { uci: string, cp: number|null, mate: number|null }
//
// Job-ID queue: each new request replaces any in-flight job so stale
// responses from a cancelled analysis are silently discarded.

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
const ANALYSIS_TIMEOUT_MS = 8000;

let _worker = null;
let _ready = false;
let _readyResolve = null;
let _initPromise = null;

// One pending job at a time (chess alternates turns, no concurrency needed)
let _job = null; // { id, resolve, reject, pvResults: {} }
let _jobId = 0;

// ── Message handler ────────────────────────────────────────────────────
function _onMessage(event) {
  const line = typeof event.data === 'string' ? event.data : '';

  if (line === 'readyok') {
    _ready = true;
    _readyResolve?.();
    _readyResolve = null;
    return;
  }

  if (!_job) return;

  // Accumulate MultiPV info lines.
  // Each 'info' line at any depth overwrites the previous result for that pv index.
  // The last complete set (just before 'bestmove') is the final ranking.
  if (line.startsWith('info') && line.includes(' pv ')) {
    const multipvM = line.match(/\bmultipv (\d+)\b/);
    const pvM      = line.match(/\bpv (\S+)/);
    const cpM      = line.match(/\bscore cp (-?\d+)\b/);
    const mateM    = line.match(/\bscore mate (-?\d+)\b/);

    if (pvM) {
      const idx  = multipvM ? parseInt(multipvM[1]) - 1 : 0; // 0-based
      const uci  = pvM[1];
      const cp   = cpM   ? parseInt(cpM[1])   : null;
      const mate = mateM ? parseInt(mateM[1]) : null;
      _job.pvResults[idx] = { uci, cp, mate };
    }
    return;
  }

  if (line.startsWith('bestmove')) {
    const job = _job;
    _job = null;

    // Build ordered array from pvResults map
    const results = Object.keys(job.pvResults)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => job.pvResults[k]);

    // If MultiPV gave nothing, fall back to the bestmove token itself
    if (results.length === 0) {
      const bmM = line.match(/^bestmove (\S+)/);
      if (bmM) results.push({ uci: bmM[1], cp: null, mate: null });
    }

    job.resolve(results);
  }
}

// ── Init ───────────────────────────────────────────────────────────────
export function init() {
  if (_ready) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve, reject) => {
    _readyResolve = resolve;
    fetch(CDN)
      .then(r => r.text())
      .then(code => {
        const blob = new Blob([code], { type: 'application/javascript' });
        _worker = new Worker(URL.createObjectURL(blob));
        _worker.onmessage = _onMessage;
        _worker.onerror = reject;
        _worker.postMessage('uci');
        _worker.postMessage('isready');
      })
      .catch(reject);
  });

  return _initPromise;
}

// ── Core analysis ──────────────────────────────────────────────────────
async function _analyse(fen, depth, multiPvCount) {
  await init();

  return new Promise((resolve, reject) => {
    const id = ++_jobId;

    // Cancel any in-flight job (safety: shouldn't happen in normal game flow)
    if (_job) {
      _job.resolve([]); // resolve with empty rather than reject to avoid unhandled promise
      _job = null;
      _worker.postMessage('stop');
    }

    let resolved = false;

    const timeout = setTimeout(() => {
      if (_job?.id === id) {
        _worker.postMessage('stop');
        // Resolve with whatever partial results we have
        const partial = Object.keys(_job.pvResults)
          .sort((a, b) => Number(a) - Number(b))
          .map(k => _job.pvResults[k]);
        _job = null;
        resolved = true;
        resolve(partial);
      }
    }, ANALYSIS_TIMEOUT_MS);

    _job = {
      id,
      pvResults: {},
      resolve: (results) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        resolve(results);
      },
      reject,
    };

    _worker.postMessage(`setoption name MultiPV value ${multiPvCount}`);
    _worker.postMessage(`position fen ${fen}`);
    _worker.postMessage(`go depth ${depth}`);
  });
}

// ── Public API ─────────────────────────────────────────────────────────

// Single best move — for Black's move selection (depth 15)
export async function getBestMove(fen, depth = 15) {
  try {
    const results = await _analyse(fen, depth, 1);
    return results[0] ?? null;
  } catch {
    return null;
  }
}

// Top N moves ranked best→worst — for White's move scoring (depth 12)
export async function getMultiPV(fen, depth = 12, count = 4) {
  try {
    return await _analyse(fen, depth, count);
  } catch {
    return [];
  }
}
