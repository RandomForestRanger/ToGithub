// Kat en Muis: Stockfish (WASM, lite, single-threaded) in a Web Worker.
// One search at a time; a new search waits for the previous one to finish.

export class Enjin {
  constructor(path = 'vendor/stockfish/stockfish-19-lite-single.js') {
    this.worker = new Worker(path);
    this.listeners = new Set();
    this.queue = Promise.resolve();
    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      for (const fn of this.listeners) fn(line);
    };
    this.ready = this._handshake();
  }

  _send(cmd) {
    this.worker.postMessage(cmd);
  }

  _waitFor(predicate) {
    return new Promise((resolve) => {
      const fn = (line) => {
        if (predicate(line)) {
          this.listeners.delete(fn);
          resolve(line);
        }
      };
      this.listeners.add(fn);
    });
  }

  async _handshake() {
    const ok = this._waitFor((l) => l === 'uciok');
    this._send('uci');
    await ok;
    this._send('setoption name Hash value 32');
    await this.isReady();
  }

  isReady() {
    const p = this._waitFor((l) => l === 'readyok');
    this._send('isready');
    return p;
  }

  newGame() {
    this.queue = this.queue.then(async () => {
      await this.ready;
      this._send('ucinewgame');
      await this.isReady();
    });
    return this.queue;
  }

  // Returns { lines: [{multipv, depth, mate, cp, pv:[uci]}], bestmove }
  // Scores are from the side to move's point of view (UCI convention).
  search(fen, { movetime = 1500, multipv = 3 } = {}) {
    const run = async () => {
      await this.ready;
      this._send(`setoption name MultiPV value ${multipv}`);
      await this.isReady();
      const lines = new Map();
      const collector = (line) => {
        if (!line.startsWith('info ') || !line.includes(' pv ') || !line.includes(' score ')) return;
        if (line.includes(' lowerbound') || line.includes(' upperbound')) return;
        const t = line.split(' ');
        const get = (k) => {
          const i = t.indexOf(k);
          return i >= 0 ? t[i + 1] : undefined;
        };
        const mpv = parseInt(get('multipv') || '1', 10);
        const depth = parseInt(get('depth') || '0', 10);
        const si = t.indexOf('score');
        const kind = t[si + 1];
        const val = parseInt(t[si + 2], 10);
        const pv = t.slice(t.indexOf('pv') + 1);
        const prev = lines.get(mpv);
        if (prev && prev.depth > depth) return;
        lines.set(mpv, {
          multipv: mpv,
          depth,
          mate: kind === 'mate' ? val : null,
          cp: kind === 'cp' ? val : null,
          pv,
        });
      };
      this.listeners.add(collector);
      const done = this._waitFor((l) => l.startsWith('bestmove'));
      this._send(`position fen ${fen}`);
      this._send(`go movetime ${movetime}`);
      const best = await done;
      this.listeners.delete(collector);
      return {
        lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
        bestmove: best.split(' ')[1],
      };
    };
    const p = this.queue.then(run);
    this.queue = p.catch(() => {});
    return p;
  }

  stop() {
    this._send('stop');
  }
}

// How good a line is for the side to move: longer resistance when being mated,
// quicker mate when mating, otherwise centipawns.
export function lineValue(l) {
  if (l.mate !== null) {
    if (l.mate > 0) return 1e6 - l.mate;
    if (l.mate < 0) return -1e6 - l.mate; // mate -3 -> -999997, mate -9 -> -999991 (better)
    return -1e6; // mate 0: already mated
  }
  return l.cp ?? 0;
}

export function bestForMover(result) {
  if (!result.lines.length) return null;
  return [...result.lines].sort((a, b) => lineValue(b) - lineValue(a))[0];
}
