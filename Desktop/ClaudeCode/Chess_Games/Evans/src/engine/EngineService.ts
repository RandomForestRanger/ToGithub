// One Stockfish worker behind a FIFO queue (CLAUDE.md section 5).
// Scores returned here are from the SIDE TO MOVE's point of view; callers convert.
import { MATE_CP } from '../config';

export interface PvLine { uci: string; cp: number; mate: number | null }
export interface SearchResult { depth: number; lines: PvLine[] }
interface Job {
  fen: string; depth: number; multipv: number; maxMs?: number;
  resolve: (r: SearchResult) => void; reject: (e: unknown) => void;
}

class EngineService {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Job[] = [];
  private current: Job | null = null;
  private lines: PvLine[] = [];
  private depth = 0;
  private timer: number | undefined;

  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      try {
        const w = new Worker('/stockfish/stockfish-19-lite-single.js');
        const fail = window.setTimeout(() => reject(new Error('engine timeout')), 15000);
        w.onerror = e => { window.clearTimeout(fail); reject(e); };
        w.onmessage = e => {
          const msg = String(e.data);
          if (msg === 'uciok') w.postMessage('isready');
          else if (msg === 'readyok' && !this.worker) {
            window.clearTimeout(fail);
            this.worker = w;
            resolve();
          } else this.onLine(msg);
        };
        w.postMessage('uci');
      } catch (e) { reject(e); }
    });
    this.ready.catch(() => { this.ready = null; });
    return this.ready;
  }

  /** Queue a search. Resolves with the deepest complete info per PV. */
  search(fen: string, depth: number, multipv = 1, maxMs?: number): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, depth, multipv, maxMs, resolve, reject });
      this.pump();
    });
  }

  private pump() {
    if (this.current || !this.worker || !this.queue.length) return;
    const job = this.current = this.queue.shift()!;
    this.lines = [];
    this.depth = 0;
    const w = this.worker;
    w.postMessage(`setoption name MultiPV value ${job.multipv}`);
    w.postMessage(`position fen ${job.fen}`);
    w.postMessage(`go depth ${job.depth}`);
    if (job.maxMs) this.timer = window.setTimeout(() => w.postMessage('stop'), job.maxMs);
  }

  private onLine(msg: string) {
    const job = this.current;
    if (!job) return;
    if (msg.startsWith('info') && msg.includes(' pv ')) {
      const t = msg.split(' ');
      const get = (k: string) => t[t.indexOf(k) + 1];
      const d = Number(get('depth'));
      const idx = t.includes('multipv') ? Number(get('multipv')) - 1 : 0;
      if (t.includes('upperbound') || t.includes('lowerbound')) return;
      const si = t.indexOf('score');
      let cp = 0, mate: number | null = null;
      if (t[si + 1] === 'cp') cp = Number(t[si + 2]);
      else { mate = Number(t[si + 2]); cp = mate > 0 ? MATE_CP : -MATE_CP; }
      const uci = t[t.indexOf('pv') + 1];
      if (idx === 0 && d > this.depth) {
        this.depth = d;
      }
      this.lines[idx] = { uci, cp, mate };
    } else if (msg.startsWith('bestmove')) {
      window.clearTimeout(this.timer);
      const lines = this.lines.filter(Boolean);
      if (!lines.length) {
        const bm = msg.split(' ')[1];
        if (bm && bm !== '(none)') lines.push({ uci: bm, cp: 0, mate: null });
      }
      this.current = null;
      job.resolve({ depth: this.depth, lines });
      this.pump();
    }
  }
}

export const engine = new EngineService();
