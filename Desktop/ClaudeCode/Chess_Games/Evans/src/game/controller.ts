// The round state machine (CLAUDE.md sections 3 to 7, 9, 10), wired to the engine.
// UI subscribes via onChange and reads fields directly.
import { Chess, type Square } from 'chess.js';
import {
  BLACK_ENGINE_DEPTH, BLACK_MULTIPV, BLACK_WINDOW_CP, ANALYSIS_DEPTH, ANALYSIS_MAX_MS, FINAL_EVAL_DEPTH,
  GOLD_EVAL, MATE_CP, MOVES_PER_ROUND, STEAM_SMOOTHING, THINK_MAX_MS, THINK_MIN_MS,
} from '../config';
import { canon, LINES } from '../data';
import { engine } from '../engine/EngineService';
import { say, type KKey } from '../content/kaptein';
import { material, numbered, posKey, sanOf, uciToMove } from './chessUtil';
import { blackChartMove, conquerAt, newChartState, whiteChartMove, type ChartState } from './round';
import { pointsFromLoss } from './scoring';
import type { LineState } from './targets';

export type Phase = 'entry' | 'chart' | 'engine' | 'over';
export type Zone = 'gold' | 'green' | 'amber' | 'cold';

export interface MoveRec { san: string; ply: number; points?: number | null; phase: Phase; evalAfter?: number; loss?: number }
export interface SteamPt { ply: number; steam: number; debt: number }
export interface Popup {
  kind: 'retarget' | 'missed'; text: string; note?: string; fen?: string; arrow?: [string, string];
}
export interface RoundResult {
  score: number; gold: boolean; finalEval: number;
  ending: 'mates' | 'mated' | 'draw' | 'moves';
  conquered: string[];
  missed: Record<string, string>;
  moments: { kind: 'missed' | 'drop' | 'best'; line?: string; move: string; value?: number }[];
}

const label = (id: string) => LINES[id]?.label ?? id;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const think = () => delay(THINK_MIN_MS + Math.random() * (THINK_MAX_MS - THINK_MIN_MS));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function zoneOf(steam: number, debt: number): Zone {
  if (steam >= debt + GOLD_EVAL) return 'gold';
  if (steam > debt) return 'green';
  if (steam >= 0) return 'amber';
  return 'cold';
}

export class RoundController {
  chess = new Chess();
  phase: Phase = 'entry';
  chart: ChartState;
  startTarget: string;
  moves: MoveRec[] = [];
  steam: SteamPt[] = [];
  shownSteam = 0;
  debt = 0;
  speech = '';
  popup: Popup | null = null;
  thinking = false;
  lastMove: [string, string] | null = null;
  missed: Record<string, string> = {};
  result: RoundResult | null = null;
  bishopSaid = { stuur: false, bak: false };
  engineError = false;

  private listeners = new Set<() => void>();
  private alive = true;
  private analysis = new Map<string, Promise<number>>();
  private lastZone: Zone | null = null;
  private lastZonePly = -99;
  private speechPly = -1;
  private speechPri = 0;

  constructor(target: string, private stateOf: (id: string) => LineState) {
    this.startTarget = target;
    this.chart = newChartState(target);
  }

  onChange(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(f => f()); }
  dispose() { this.alive = false; this.listeners.clear(); }

  get ply() { return this.chess.history().length; }
  get whiteMoveNo() { return Math.floor(this.ply / 2) + 1; }
  get score() { return this.moves.reduce((a, m) => a + (m.points ?? 0), 0); }
  get target() { return this.chart.target; }
  get steamVisible() { return this.ply >= canon.meta.entry.length; }

  private speak(key: KKey, vars: { line?: string; move?: string } = {}, pri = 1, prefix = '') {
    if (this.speechPly === this.ply && pri < this.speechPri) return;
    this.speechPly = this.ply; this.speechPri = pri;
    this.speech = prefix + say(key, vars);
  }

  closePopup() { this.popup = null; this.emit(); }

  // ---------- his move ----------

  /** Returns false if the move was refused (illegal or wrong entry move). */
  userMove(from: string, to: string): boolean {
    if (this.phase === 'over' || this.thinking || this.chess.turn() !== 'w') return false;
    const legal = this.chess.moves({ verbose: true }).find(m => m.from === from && m.to === to);
    if (!legal) return false;
    const uci = from + to + (legal.promotion ? 'q' : '');

    if (this.phase === 'entry') {
      const expected = canon.meta.entry[this.ply];
      if (legal.san !== expected) {
        this.speak('ENTRY_WRONG', { move: numbered(this.ply, expected) }, 3);
        this.emit();
        return false;
      }
      this.play(uci, 'entry');
      if (this.ply === canon.meta.entry.length) {
        this.phase = 'chart';
        this.speak('BAIT');
        this.pushSteam();
      }
      this.emit();
      void this.blackTurn();
      return true;
    }

    const beforeKey = posKey(this.chess);
    const beforeFen = this.chess.fen();
    const plyIdx = this.ply;
    const scored = this.whiteMoveNo >= 5 && this.whiteMoveNo <= MOVES_PER_ROUND;
    const beforeEval: Promise<number> = this.phase === 'chart' && canon.nodes[beforeKey]
      ? Promise.resolve(canon.nodes[beforeKey].eval)
      : this.analyse(beforeFen);

    let points: number | null = null;
    if (this.phase === 'chart') {
      const before = canon.nodes[beforeKey];
      const r = whiteChartMove(this.chart, beforeKey, uci, Math.random, this.stateOf);
      const rec = this.play(uci, 'chart');
      const neededTxt = (u?: string) => (u ? numbered(plyIdx, sanOf(before.fen, u)) : '');
      if (r.kind === 'canon') {
        points = 4;
        this.afterChartArrival(true);
      } else if (r.kind === 'retarget') {
        points = 4;
        this.afterChartArrival(false);
        this.popup = {
          kind: 'retarget',
          text: say('RETARGET', { line: label(r.shown) }),
          note: r.needed ? say('RETARGET_NOTE', { line: label(r.oldTarget), move: neededTxt(r.needed) }) : undefined,
        };
      } else if (r.kind === 'lost') {
        points = 4;
        this.afterChartArrival(false);
        if (r.needed) this.showMissed(r.oldTarget, before.fen, r.needed, neededTxt(r.needed), '');
      } else {
        points = r.points;
        this.phase = 'engine';
        if (r.missed) {
          this.showMissed(r.missed.line, before.fen, r.missed.needed, neededTxt(r.missed.needed),
            r.top2 ? say('TOP_TWO') : '');
        } else {
          this.speak('OFF_CHART', {}, 2);
        }
      }
      if (scored) rec.points = points;
    } else {
      const rec = this.play(uci, 'engine');
      if (scored) rec.points = null;
    }
    const rec = this.moves[this.moves.length - 1];
    if (!scored) rec.points = undefined;

    this.checkBishops();
    this.emit();

    // engine scoring + steam for the position after his move
    const afterFen = this.chess.fen();
    void (async () => {
      const afterEval = await this.analyse(afterFen);
      if (!this.alive) return;
      rec.evalAfter = afterEval;
      if (scored && rec.points === null) {
        const loss = Math.max(0, (await beforeEval) - afterEval);
        rec.loss = loss;
        rec.points = pointsFromLoss(loss);
        this.speak(`POINTS_${rec.points}` as KKey, {}, 1);
      }
      this.emit();
    })();

    if (!this.endIfOver()) void this.blackTurn();
    return true;
  }

  private showMissed(line: string, fen: string, uci: string, moveTxt: string, prefix: string) {
    this.missed[line] = moveTxt;
    this.popup = {
      kind: 'missed',
      text: prefix + say('MISSED', { line: label(line), move: moveTxt }),
      fen, arrow: [uci.slice(0, 2), uci.slice(2, 4)],
    };
  }

  // ---------- Black ----------

  private async blackTurn() {
    if (this.phase === 'over') return;
    this.thinking = true;
    this.emit();
    try {
      await think();
      if (!this.alive) return;
      if (this.phase === 'entry') {
        this.play(sanToUci(this.chess, canon.meta.entry[this.ply]), 'entry');
      } else if (this.phase === 'chart') {
        const key = posKey(this.chess);
        const r = blackChartMove(this.chart, key, Math.random, this.stateOf);
        if (r.kind === 'chartEnd') {
          this.phase = 'engine';
          this.speak('CHART_END', {}, 2);
          await this.engineBlack();
        } else {
          const rec = this.play(r.uci, 'chart');
          if (r.chainTo) this.speak('CHAIN', { line: label(r.chainTo) }, 2);
          this.blackFlavour(rec.san);
          this.afterChartArrival(false);
        }
      } else {
        await this.engineBlack();
      }
    } catch (e) {
      console.error(e);
      this.engineError = true;
    }
    if (!this.alive) return;
    this.thinking = false;
    if (!this.endIfOver()) {
      // pre-analyse his position (gauge + scoring of his next move)
      void this.analyse(this.chess.fen());
      if (this.chess.turn() === 'w' && this.phase === 'chart') {
        const n = canon.nodes[posKey(this.chess)];
        if (n && n.chartEnd) {
          // 16: chart ends on his turn — he plays on, engine phase from Black's next move
          this.phase = 'engine';
          this.speak('CHART_END', {}, 1);
        }
      }
    }
    this.emit();
  }

  private async engineBlack() {
    const fen = this.chess.fen();
    const res = await engine.search(fen, BLACK_ENGINE_DEPTH, BLACK_MULTIPV);
    if (!this.alive) return;
    const lines = res.lines;
    const best = Math.max(...lines.map(l => l.cp));
    const ok = lines.filter(l => l.cp >= best - BLACK_WINDOW_CP);
    const pick = ok[Math.floor(Math.random() * ok.length)] ?? lines[0];
    this.play(pick.uci, 'engine');
  }

  private blackFlavour(san: string) {
    const p = this.ply - 1;
    if (p === 7) {
      if (san === 'Bxb4') this.speak('BLACK_ACCEPTS');
      else if (san === 'Bb6') this.speak('BLACK_DECLINES');
      else if (san === 'b5' || san === 'd5') this.speak('COUNTERGAMBIT');
    } else if (p === 13 && san === 'dxc3') this.speak('GREEDY');
  }

  /** After arriving on a chart node: conquest messages (4.1). */
  private afterChartArrival(praise: boolean) {
    const fresh = this.chart.onChart ? conquerAt(this.chart, posKey(this.chess)) : [];
    // conquerAt may already have run inside whiteChartMove; re-check what ends here
    const here = canon.nodes[posKey(this.chess)]?.endOf ?? [];
    const announce = [...new Set([...fresh, ...here])].filter(id => id !== 'evans-gambit');
    if (announce.length && this.lastAnnouncedPly !== this.ply) {
      this.lastAnnouncedPly = this.ply;
      const id = announce.includes(this.startTarget) ? this.startTarget
        : announce.find(i => this.chart.targetsThisRound.has(i)) ?? announce[0];
      if (id === 'lasker-defense') this.speak('SPITS_HOOK', {}, 2);
      else this.speak('LINE_CONQUERED', { line: label(id) }, 2);
    } else if (praise && Math.random() < 0.35) {
      this.speak('LINE_MOVE');
    }
  }
  private lastAnnouncedPly = -1;

  // ---------- shared ----------

  private play(uci: string, phase: Phase): MoveRec {
    const m = this.chess.move(uciToMove(uci));
    this.lastMove = [m.from, m.to];
    const rec: MoveRec = { san: m.san, ply: this.ply - 1, phase };
    this.moves.push(rec);
    if (this.steamVisible) this.pushSteam();
    return rec;
  }

  /** Analysis at depth 14 (MultiPV 2 when White moves), capped; eval from White's view. Cached by FEN. */
  analyse(fen: string, depth = ANALYSIS_DEPTH, maxMs: number | undefined = ANALYSIS_MAX_MS): Promise<number> {
    const k = `${fen}|${depth}`;
    let p = this.analysis.get(k);
    if (!p) {
      const c = new Chess(fen);
      if (c.isCheckmate()) p = Promise.resolve(c.turn() === 'w' ? -MATE_CP : MATE_CP);
      else if (c.isDraw() || c.isStalemate()) p = Promise.resolve(0);
      else {
        const white = c.turn() === 'w';
        p = engine.search(fen, depth, white ? 2 : 1, maxMs)
          .then(r => (r.lines[0]?.cp ?? 0) * (white ? 1 : -1));
      }
      this.analysis.set(k, p);
    }
    return p;
  }

  private pushSteam() {
    const key = posKey(this.chess);
    const node = canon.nodes[key];
    const ply = this.ply;
    if ((this.phase === 'chart' || this.phase === 'entry') && node) {
      this.setSteam(ply, node.steam, node.debt, false);
      return;
    }
    const debt = Math.max(0, -material(this.chess));
    const fen = this.chess.fen();
    void this.analyse(fen).then(ev => {
      if (!this.alive) return;
      const s = clamp(ev / 100, -15, 15) + debt;
      this.setSteam(ply, s, debt, true);
      this.emit();
    });
  }

  private setSteam(ply: number, s: number, debt: number, smooth: boolean) {
    const prevDebt = this.debt;
    const shown = smooth && this.steam.length ? STEAM_SMOOTHING * s + (1 - STEAM_SMOOTHING) * this.shownSteam : s;
    this.shownSteam = shown;
    this.debt = debt;
    const i = this.steam.findIndex(p => p.ply === ply);
    const pt = { ply, steam: shown, debt };
    if (i >= 0) this.steam[i] = pt; else this.steam.push(pt);
    this.steam.sort((a, b) => a.ply - b.ply);
    if (debt < prevDebt && this.steam.length > 1) { this.speak('DEBT_PAID', {}, 1); return; }
    const z = zoneOf(shown, debt);
    if (this.lastZone && z !== this.lastZone && ply - this.lastZonePly >= 6) {
      this.speak(({ gold: 'STEAM_GOLD', green: 'STEAM_GREEN', amber: 'STEAM_AMBER', cold: 'STEAM_COLD' } as const)[z], {}, 0);
      this.lastZonePly = ply;
    }
    if (!this.lastZone) this.lastZonePly = ply;
    this.lastZone = z;
  }

  private checkBishops() {
    const b = bishopBeams(this.chess);
    if (b.stuurSpark && !this.bishopSaid.stuur) { this.bishopSaid.stuur = true; this.speak('BISHOP_STUURBOORD', {}, 1); }
    if (b.bakSpark && !this.bishopSaid.bak) { this.bishopSaid.bak = true; this.speak('BISHOP_BAKBOORD', {}, 1); }
  }

  // ---------- end ----------

  private endIfOver(): boolean {
    if (this.phase === 'over') return true;
    const c = this.chess;
    const over = c.isGameOver() || this.ply >= MOVES_PER_ROUND * 2;
    if (!over) return false;
    this.phase = 'over';
    this.thinking = true;
    this.emit();
    void this.finish();
    return true;
  }

  private async finish() {
    const c = this.chess;
    let ending: RoundResult['ending'] = 'moves';
    let finalEval = 0;
    if (c.isCheckmate()) ending = c.turn() === 'b' ? 'mates' : 'mated';
    else if (c.isGameOver()) ending = 'draw';
    if (ending === 'moves') {
      try { finalEval = (await this.analyse(c.fen(), FINAL_EVAL_DEPTH, 8000)) / 100; } catch { finalEval = 0; }
      // wait for any pending scoring
      await delay(50);
    } else if (ending === 'mates') finalEval = MATE_CP / 100;
    else if (ending === 'mated') finalEval = -MATE_CP / 100;
    // let pending engine scores settle
    for (let i = 0; i < 40 && this.moves.some(m => m.points === null); i++) await delay(100);
    if (!this.alive) return;

    let score = this.moves.reduce((a, m) => a + (m.points ?? 0), 0);
    const lastWhiteNo = Math.floor((this.ply - 1) / 2) + 1;
    if (ending === 'mates') score += 4 * Math.max(0, MOVES_PER_ROUND - Math.max(4, lastWhiteNo));
    const gold = ending === 'mates' || (ending === 'moves' && finalEval >= GOLD_EVAL);

    const moments: RoundResult['moments'] = [];
    const firstMiss = Object.entries(this.missed)[0];
    if (firstMiss) moments.push({ kind: 'missed', line: label(firstMiss[0]), move: firstMiss[1] });
    let drop = 0, dropPly = -1;
    for (let i = 1; i < this.steam.length; i++) {
      const d = this.steam[i - 1].steam - this.steam[i].steam;
      if (d > drop) { drop = d; dropPly = this.steam[i].ply; }
    }
    if (drop >= 0.5 && dropPly > 0) {
      const m = this.moves[dropPly - 1];
      if (m) moments.push({ kind: 'drop', move: numbered(m.ply, m.san), value: drop });
    }
    const best = this.moves.filter(m => m.phase === 'engine' && m.ply % 2 === 0 && m.points === 4 && m.evalAfter !== undefined)
      .sort((a, b) => (b.evalAfter! - a.evalAfter!))[0];
    if (best) moments.push({ kind: 'best', move: numbered(best.ply, best.san) });

    this.result = {
      score, gold, finalEval, ending,
      conquered: [...this.chart.conquered],
      missed: this.missed, moments,
    };
    this.thinking = false;
    this.speak(ending === 'mates' ? 'END_WHITE_MATES' : ending === 'mated' ? 'END_WHITE_MATED'
      : ending === 'draw' ? 'END_DRAW' : gold ? 'END_GOLD'
      : this.chart.conquered.has(this.startTarget) ? 'END_GREEN' : 'END_MISSED', {}, 9);
    this.emit();
  }
}

function sanToUci(c: Chess, san: string): string {
  const m = new Chess(c.fen()).move(san);
  return m.from + m.to + (m.promotion ?? '');
}

// ---------- Bakboord & Stuurboord (section 10) ----------

const FILES = 'abcdefgh';
export interface Beams {
  bak: { from: string; squares: string[] } | null;   // dark-squared, red
  stuur: { from: string; squares: string[] } | null; // light-squared, green
  bakSpark: boolean; stuurSpark: boolean;
}

export function bishopBeams(c: Chess): Beams {
  const out: Beams = { bak: null, stuur: null, bakSpark: false, stuurSpark: false };
  for (const row of c.board()) for (const p of row) {
    if (!p || p.type !== 'b' || p.color !== 'w') continue;
    const f = FILES.indexOf(p.square[0]); const r = Number(p.square[1]);
    const dark = (f + r) % 2 === 1; // a1 (f0,r1) is dark
    const squares: string[] = [];
    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let x = f + df, y = r + dr;
      while (x >= 0 && x < 8 && y >= 1 && y <= 8) {
        const sq = FILES[x] + y;
        squares.push(sq);
        if (c.get(sq as Square)) break;
        x += df; y += dr;
      }
    }
    if (dark) out.bak = { from: p.square, squares };
    else out.stuur = { from: p.square, squares };
  }
  const bk = c.get('e8' as Square);
  const uncastled = !!bk && bk.type === 'k' && bk.color === 'b';
  out.stuurSpark = !!out.stuur?.squares.includes('f7');
  out.bakSpark = uncastled && !!out.bak && (out.bak.squares.includes('f8') || out.bak.squares.includes('e7'));
  return out;
}
