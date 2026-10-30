// The round state machine (CLAUDE.md sections 3 to 7, 9, 10), wired to the engine.
// UI subscribes via onChange and reads fields directly.
import { Chess, type Square } from 'chess.js';
import {
  BLACK_ENGINE_DEPTH, BLACK_MULTIPV, ANALYSIS_DEPTH, ANALYSIS_MAX_MS, FINAL_EVAL_DEPTH,
  GOLD_EVAL, MATE_CP, MOVES_PER_ROUND, STEAM_SMOOTHING, THINK_MAX_MS, THINK_MIN_MS,
  PRESS_CHECK, PRESS_DEPTH, PRESS_MAX_MS, PRESS_ZONES,
  CRACK_KEEP_CP, CRACK_MIN_PRESS, CRACK_P, CRACK_REAL_CP, CHECK_PLIES,
  CHECK_CALM_EVAL, CHECK_DEFER_PLIES, CHECK_ONLY_MOVE_CP, FORCED_GAP_CP, RESCUE_EVAL_CP,
  TOERNOOI_WOBBLE_P, WOBBLE_MIN_CP, WOBBLE_MAX_CP, WOBBLE_MULTIPV, PERFECT_FROM_PLY, PERFECT_EVAL_CP,
  PERFECT_DEPTH, PERFECT_MAX_MS, TOERNOOI_BONUS, TOERNOOI_BONUS_MATE,
} from '../config';
import { canon, LINES, type CanonNode } from '../data';
import { engine } from '../engine/EngineService';
import { MOOD, say, type KKey, type Mood } from '../content/kaptein';
import { material, numbered, posKey, sanOf, uciToMove } from './chessUtil';
import { blackChartMove, conquerAt, newChartState, whiteChartMove, type ChartState } from './round';
import { pointsFromLoss } from './scoring';
import { chooseBlackMove, nullFen, pressureOf, pressZone, wobbleMove, type Zone } from './pressure';
import { ANSWERS, readPosition, type Answer } from './checkpoint';
import { imbalance, ledgerOf, nextBaitCap, total, zero, type Counts, type Ledger } from './ledger';
import type { LineState } from './targets';

export type Phase = 'entry' | 'chart' | 'engine' | 'over';
/** verkenning: the Kelpwoud rounds (chart, target, aids). toernooi: the four Evans moves, then open play, no aids. */
export type Mode = 'verkenning' | 'toernooi';
export type { Zone } from './pressure';

export interface MoveRec { san: string; ply: number; points?: number | null; phase: Phase; evalAfter?: number; loss?: number }
/** The eval series (steam minus debt = White's eval in pawns), for the round-end graph. */
export interface SteamPt { ply: number; steam: number; debt: number }
/** The pressure of each of his moves (the needle), with the pawns he had invested at that moment. */
export interface PressPt { ply: number; press: number; san: string; /** pieces of lokaas (route bait) at that moment */ bait: number; phase: Phase }
export interface Popup {
  kind: 'retarget' | 'missed'; text: string; note?: string; fen?: string; arrow?: [string, string];
  /** MISSED: replay from 4.b4 through his game to the miss, then the line's route to its end. */
  replay?: { fen: string; startPly: number; moves: string[]; needed: number };
}
/** A "Wat het jou pion gekoop?" question on the board (section 9a). */
export interface Checkpoint {
  ply: number; options: Answer[]; truths: Answer[]; devLead: number; mobLead: number;
  answered: Answer | null; correct?: boolean;
}
export interface RoundResult {
  /** move points plus bonus */
  score: number; gold: boolean; finalEval: number;
  /** toernooi: the bonus for the final position (included in score); 0 in verkenning */
  bonus: number;
  /** checkpoint answers this round */
  checks: { right: number; n: number };
  ending: 'mates' | 'mated' | 'draw' | 'moves';
  conquered: string[];
  missed: Record<string, string>;
  moments: { kind: 'missed' | 'crack' | 'quiet' | 'drop' | 'best'; line?: string; move: string; value?: number; caught?: boolean }[];
}

const label = (id: string) => LINES[id]?.label ?? id;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const think = () => delay(THINK_MIN_MS + Math.random() * (THINK_MAX_MS - THINK_MIN_MS));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export class RoundController {
  chess = new Chess();
  phase: Phase = 'entry';
  chart: ChartState;
  startTarget: string;
  moves: MoveRec[] = [];
  steam: SteamPt[] = [];
  shownSteam = 0;
  debt = 0;
  /** The plaque under the dial: lokaas (route bait), verloor, vangs (game/ledger.ts). */
  ledger: Ledger = ledgerOf(new Chess(), zero());
  private baitCap: Counts = zero();
  /** pieces of lokaas still in the water (the gambit is on while this is above 0) */
  get bait() { return total(this.ledger.bait); }
  /** The move the needle is measuring (numbered SAN), or null before 4.b4. */
  get pressCaption() { const p = this.press[this.press.length - 1]; return p ? numbered(p.ply, p.san) : null; }
  /** The needle: pressure of his last move, in pawns. */
  press: PressPt[] = [];
  shownPress = 0;
  /** Black's cracks under pressure that the Captain named, and whether he caught them. */
  cracks: { move: string; caught: boolean }[] = [];
  /** The open checkpoint question, if any: his move waits until he has answered it. */
  checkpoint: Checkpoint | null = null;
  checks: { ply: number; chosen: Answer; correct: boolean }[] = [];
  /** the ply a checkpoint fell due at, while it waits for a calm moment */
  private checkDue: number | null = null;
  speech = '';
  mood: Mood = 'steady';
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
  private pressCache = new Map<string, Promise<number>>();
  /** White to move: best minus second-best (centipawns) from the MultiPV 2 analysis; Infinity = only one move */
  private gaps = new Map<string, number>();
  private pendingCrack: { fenBefore: string; move: string; replyPly: number } | null = null;
  private lastZone: Zone | null = null;
  private lastZonePly = -99;
  private speechPly = -1;
  private speechPri = 0;

  /** toernooi: Black has played its best since White got well ahead after move 16 (no slips from then on) */
  perfect = false;

  constructor(target: string, private stateOf: (id: string) => LineState, readonly mode: Mode = 'verkenning') {
    this.startTarget = target;
    this.chart = newChartState(target);
    if (mode === 'toernooi') this.chart.onChart = false;
  }

  get toernooi() { return this.mode === 'toernooi'; }

  onChange(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(f => f()); }
  dispose() { this.alive = false; this.listeners.clear(); }

  get ply() { return this.chess.history().length; }
  get whiteMoveNo() { return Math.floor(this.ply / 2) + 1; }
  get score() { return this.moves.reduce((a, m) => a + (m.points ?? 0), 0); }
  get target() { return this.chart.target; }
  get steamVisible() { return this.ply >= canon.meta.entry.length; }

  private speak(key: KKey, vars: { line?: string; move?: string } = {}, pri = 1, prefix = '', suffix = '') {
    if (this.toernooi && pri < 9) return; // no Captain during a toernooi game, only at the end
    if (this.speechPly === this.ply && pri < this.speechPri) return;
    this.speechPly = this.ply; this.speechPri = pri;
    this.speech = prefix + say(key, vars) + suffix;
    this.mood = MOOD[key] ?? 'steady';
  }

  closePopup() { this.popup = null; this.emit(); }

  // ---------- "Wat het jou pion gekoop?" ----------

  /**
   * After Black's move: if a checkpoint is due and he still has lokaas in the water, ask, but only at a
   * calm moment. While he is fighting for his life (in check, clearly worse, or down to one move that
   * doesn't lose) the question waits, for at most CHECK_DEFER_PLIES, and is then skipped.
   */
  private async maybeCheckpoint() {
    const ply = this.ply;
    if (this.chess.turn() !== 'w' || this.toernooi) return;
    if ((CHECK_PLIES as readonly number[]).includes(ply)) this.checkDue = ply;
    if (this.checkDue === null) return;
    if (ply > this.checkDue + CHECK_DEFER_PLIES || this.bait === 0) { this.checkDue = null; return; }
    if (this.chess.inCheck()) return; // fighting: try again next move
    const fen = this.chess.fen();
    this.thinking = true; // hold his move until we know whether to ask
    let ev = 0, fighting = false;
    try {
      const [e, res] = await Promise.all([this.analyse(fen), engine.search(fen, PRESS_DEPTH, 2, PRESS_MAX_MS)]);
      ev = e;
      const [a, b] = res.lines;
      const mated = !!a && a.mate !== null && a.mate < 0;
      const onlyMove = !!a && !!b && a.cp - b.cp >= CHECK_ONLY_MOVE_CP;
      fighting = mated || onlyMove || ev <= CHECK_CALM_EVAL;
    } catch { /* ask on the board alone */ }
    if (!this.alive || this.ply !== ply || this.phase === 'over') return;
    this.thinking = false;
    if (!fighting) {
      this.checkDue = null;
      const r = readPosition(fen, ev);
      if (r) this.checkpoint = { ply, options: [...ANSWERS], ...r, answered: null };
    }
    this.emit();
  }

  answerCheckpoint(a: Answer) {
    const cp = this.checkpoint;
    if (!cp || cp.answered) return;
    cp.answered = a;
    cp.correct = cp.truths.includes(a);
    this.checks.push({ ply: cp.ply, chosen: a, correct: cp.correct });
    const key: KKey = !cp.correct ? 'CHECK_WRONG' : a === 'niks' ? 'CHECK_HONEST' : 'CHECK_RIGHT';
    this.speak(key, {}, 4, '', ' ' + say('QUESTION'));
    this.mood = MOOD[key] ?? 'steady';
    this.emit();
  }

  closeCheckpoint() {
    if (this.checkpoint?.answered) { this.checkpoint = null; this.emit(); }
  }

  // ---------- his move ----------

  /** Returns false if the move was refused (illegal, wrong entry move, or a checkpoint still to answer). */
  userMove(from: string, to: string): boolean {
    if (this.phase === 'over' || this.thinking || this.chess.turn() !== 'w') return false;
    if (this.checkpoint && !this.checkpoint.answered) return false;
    if (this.checkpoint) this.checkpoint = null; // answered: his move closes the card
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
      const rec = this.play(uci, 'entry');
      if (this.ply === canon.meta.entry.length) {
        this.phase = this.toernooi ? 'engine' : 'chart';
        this.speak('BAIT');
        this.pushSteam();
        this.trackPress(rec);
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
        this.afterChartArrival(true, this.choiceAt(beforeFen, before.eval, before));
      } else if (r.kind === 'retarget') {
        points = 4;
        this.afterChartArrival(false);
        this.mood = MOOD.RETARGET!;
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

    // Did Black just crack under pressure? This move is his answer to it.
    const crack = this.pendingCrack && this.pendingCrack.replyPly === plyIdx ? this.pendingCrack : null;
    this.pendingCrack = null;

    // engine scoring + steam for the position after his move
    const afterFen = this.chess.fen();
    void (async () => {
      const afterEval = await this.analyse(afterFen);
      if (!this.alive) return;
      rec.evalAfter = afterEval;
      if (scored && rec.points === null) {
        const be = await beforeEval;
        const loss = Math.max(0, be - afterEval);
        rec.loss = loss;
        rec.points = pointsFromLoss(loss);
        let named = false;
        if (crack) {
          // what the crack gave White (depth 14): only name it if it was a real mistake
          const cost = be - (await this.analyse(crack.fenBefore));
          if (cost >= CRACK_REAL_CP) {
            const caught = loss <= CRACK_KEEP_CP;
            this.cracks.push({ move: crack.move, caught });
            this.speak(caught ? 'CRACK_CAUGHT' : 'CRACK_ESCAPED', {}, 3);
            named = true;
          }
        }
        if (!named) {
          // a good move he had to play still scores, but is not cheered like a free choice
          const how = rec.points >= 3 ? this.choiceAt(beforeFen, be, canon.nodes[beforeKey]) : 'free';
          this.speak(how === 'free' ? `POINTS_${rec.points}` as KKey : how === 'rescue' ? 'RESCUE' : 'FORCED', {}, 1);
        }
      }
      this.emit();
    })();
    this.trackPress(rec);

    if (!this.endIfOver()) void this.blackTurn();
    return true;
  }

  private showMissed(line: string, fen: string, uci: string, moveTxt: string, prefix: string) {
    this.missed[line] = moveTxt;
    this.mood = MOOD.MISSED!;
    this.popup = {
      kind: 'missed',
      text: prefix + say('MISSED', { line: label(line), move: moveTxt }),
      fen, arrow: [uci.slice(0, 2), uci.slice(2, 4)],
      replay: this.missedReplay(line, fen, uci),
    };
  }

  /** The whole game from 1.e4 up to the miss (his move just played is excluded), then the canon route to the line's end. */
  private missedReplay(line: string, fen: string, needed: string): Popup['replay'] {
    const startPly = 0;
    const hist = this.chess.history({ verbose: true });
    const moves = hist.slice(0, -1).map(m => m.from + m.to + (m.promotion ?? ''));
    const c = new Chess(fen);
    const route = [needed];
    c.move(uciToMove(needed));
    for (let i = 0; i < 40; i++) {
      const n = canon.nodes[posKey(c)];
      if (!n || n.endOf.includes(line) || !n.toward[line]) break;
      route.push(n.toward[line]);
      c.move(uciToMove(n.toward[line]));
    }
    return { fen: new Chess().fen(), startPly, moves: [...moves, ...route], needed: moves.length };
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
      } else if (this.toernooi && this.ply === canon.meta.entry.length) {
        // Black's 4th move: accept, decline or countergambit, as often as masters do
        const root = canon.nodes[canon.meta.rootKey];
        const total = root.moves.reduce((a, m) => a + m.games + 1, 0);
        let r = Math.random() * total;
        const m = root.moves.find(x => (r -= x.games + 1) < 0) ?? root.moves[0];
        this.play(m.uci, 'engine');
      } else if (this.phase === 'chart') {
        const key = posKey(this.chess);
        const r = blackChartMove(this.chart, key, Math.random, this.stateOf);
        if (r.kind === 'chartEnd') {
          this.phase = 'engine';
          this.speak('CHART_END', {}, 2, '', ' ' + say('QUESTION'));
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
      void this.maybeCheckpoint();
      if (this.chess.turn() === 'w' && this.phase === 'chart') {
        const n = canon.nodes[posKey(this.chess)];
        if (n && n.chartEnd) {
          // 16: chart ends on his turn — he plays on, engine phase from Black's next move
          this.phase = 'engine';
          this.speak('CHART_END', {}, 1, '', ' ' + say('QUESTION'));
        }
      }
    }
    this.emit();
  }

  /** Section 5: engine Black, which cracks where the road is narrow (game/pressure.ts, chooseBlackMove). */
  private async engineBlack() {
    const fen = this.chess.fen();
    if (this.toernooi) {
      if (!this.perfect && this.ply >= PERFECT_FROM_PLY && (await this.analyse(fen)) >= PERFECT_EVAL_CP) this.perfect = true;
      if (!this.alive) return;
      if (this.perfect) {
        const best = await engine.search(fen, PERFECT_DEPTH, 1, PERFECT_MAX_MS);
        if (!this.alive) return;
        if (!best.lines.length) throw new Error('engine returned no move');
        this.play(best.lines[0].uci, 'engine');
        return;
      }
      if (Math.random() < TOERNOOI_WOBBLE_P) {
        const wide = await engine.search(fen, BLACK_ENGINE_DEPTH, WOBBLE_MULTIPV);
        if (!this.alive) return;
        const w = wobbleMove(wide.lines, WOBBLE_MIN_CP, WOBBLE_MAX_CP, Math.random);
        if (w) { this.play(w, 'engine'); return; }
      }
    }
    const [res, press] = await Promise.all([engine.search(fen, BLACK_ENGINE_DEPTH, BLACK_MULTIPV), this.pressFor(fen)]);
    if (!this.alive) return;
    if (!res.lines.length) throw new Error('engine returned no move');
    const choice = chooseBlackMove(res.lines, {
      press, inCheck: this.chess.inCheck(), lastTo: this.lastMove?.[1] ?? null, crackP: CRACK_P, minPress: CRACK_MIN_PRESS,
    }, Math.random);
    const rec = this.play(choice.uci, 'engine');
    if (choice.crack) this.pendingCrack = { fenBefore: fen, move: numbered(rec.ply, rec.san), replyPly: this.ply };
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
  private afterChartArrival(praise: boolean, how: 'free' | 'forced' | 'rescue' = 'free') {
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
      this.speak(how === 'free' ? 'LINE_MOVE' : how === 'rescue' ? 'RESCUE' : 'FORCED');
    }
  }
  private lastAnnouncedPly = -1;

  // ---------- shared ----------

  private play(uci: string, phase: Phase): MoveRec {
    const m = this.chess.move(uciToMove(uci));
    this.lastMove = [m.from, m.to];
    // the plaque: on the route every bit of material he is down is the gambit's own lokaas
    const onRoute = (this.phase === 'entry' || this.phase === 'chart') && this.chart.onChart;
    const baitBefore = this.bait;
    this.baitCap = nextBaitCap(this.baitCap, imbalance(this.chess).deficit, onRoute);
    this.ledger = ledgerOf(this.chess, this.baitCap);
    if (this.bait < baitBefore) this.speak('DEBT_PAID', {}, 1);
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
          .then(r => {
            if (white && r.lines.length) this.gaps.set(fen, r.lines.length > 1 ? r.lines[0].cp - r.lines[1].cp : Infinity);
            return (r.lines[0]?.cp ?? 0) * (white ? 1 : -1);
          });
      }
      this.analysis.set(k, p);
    }
    return p;
  }

  /**
   * Was his move here really a choice? 'forced' when only one move doesn't lose FORCED_GAP_CP (or only one
   * move is legal); 'rescue' when that is so and he was in trouble too. Uses the runtime MultiPV 2 analysis,
   * or the canon's top two on the chart.
   */
  private choiceAt(fen: string, bestEval: number, node?: CanonNode): 'free' | 'forced' | 'rescue' {
    let gap = this.gaps.get(fen);
    if (gap === undefined && node?.top2?.length) gap = node.top2.length > 1 ? node.top2[0].cp - node.top2[1].cp : Infinity;
    if (new Chess(fen).moves().length === 1) gap = Infinity;
    if (gap === undefined || gap < FORCED_GAP_CP) return 'free';
    return bestEval <= RESCUE_EVAL_CP ? 'rescue' : 'forced';
  }

  /**
   * Pressure of the move that led to this position (Black to move), in pawns: what Black would lose by
   * skipping his move. From the data when the position is in the canon, otherwise two searches at the
   * same depth (the real position and the null move). Cached by FEN.
   */
  pressFor(fen: string): Promise<number> {
    let p = this.pressCache.get(fen);
    if (p) return p;
    const c = new Chess(fen);
    const node = canon.nodes[posKey(c)];
    if (c.turn() !== 'b' || c.isGameOver()) p = Promise.resolve(0);
    else if (c.inCheck()) p = Promise.resolve(PRESS_CHECK);
    else if (node && node.press !== undefined) p = Promise.resolve(node.press ?? PRESS_CHECK);
    else {
      p = Promise.all([this.analyse(fen, PRESS_DEPTH, PRESS_MAX_MS), this.analyse(nullFen(fen), PRESS_DEPTH, PRESS_MAX_MS)])
        .then(([now, ifBlackPasses]) => pressureOf(now, ifBlackPasses));
    }
    this.pressCache.set(fen, p);
    return p;
  }

  /** The needle follows his moves: after each one, how big a question did it ask? */
  private trackPress(rec: MoveRec) {
    if (this.toernooi) return; // no needle in a toernooi
    const fen = this.chess.fen();
    const bait = this.bait;
    void this.pressFor(fen).then(p => {
      if (!this.alive) return;
      this.setPress({ ply: rec.ply, press: p, san: rec.san, bait, phase: rec.phase });
      this.emit();
    }).catch(() => {});
  }

  private setPress(pt: PressPt) {
    if (this.press.length && pt.ply < this.press[this.press.length - 1].ply) return; // stale
    this.press.push(pt);
    this.shownPress = pt.press;
    const z = pressZone(pt.press);
    // The route chooses his moves on the chart, so the Captain doesn't scold a quiet route move,
    // and "the steam is leaking" only makes sense while he has a pawn invested.
    const onChart = this.phase === 'chart' && this.chart.onChart;
    const leak = z === 'amber' || z === 'cold';
    const allowed = !leak || (!onChart && pt.bait > 0);
    if (allowed && this.lastZone && z !== this.lastZone && pt.ply - this.lastZonePly >= 6) {
      const key = ({ gold: 'STEAM_GOLD', green: 'STEAM_GREEN', amber: 'STEAM_AMBER', cold: 'STEAM_COLD' } as const)[z];
      this.speak(key, {}, onChart ? 0 : 2, '', z === 'cold' ? ' ' + say('QUESTION') : '');
      this.lastZonePly = pt.ply;
    }
    if (!this.lastZone) this.lastZonePly = pt.ply;
    this.lastZone = z;
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
    const shown = smooth && this.steam.length ? STEAM_SMOOTHING * s + (1 - STEAM_SMOOTHING) * this.shownSteam : s;
    this.shownSteam = shown;
    this.debt = debt;
    const i = this.steam.findIndex(p => p.ply === ply);
    const pt = { ply, steam: shown, debt };
    if (i >= 0) this.steam[i] = pt; else this.steam.push(pt);
    this.steam.sort((a, b) => a.ply - b.ply);
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
    const bonus = !this.toernooi ? 0 : ending === 'mates' ? TOERNOOI_BONUS_MATE : gold ? TOERNOOI_BONUS : 0;
    score += bonus;

    const moments: RoundResult['moments'] = [];
    const firstMiss = Object.entries(this.missed)[0];
    if (firstMiss) moments.push({ kind: 'missed', line: label(firstMiss[0]), move: firstMiss[1] });
    const crackM = this.cracks.find(c => c.caught) ?? this.cracks[0];
    if (crackM) moments.push({ kind: 'crack', move: crackM.move, caught: crackM.caught });
    // his quietest open-sea move while he had a pawn invested: the moment the steam escaped
    const quiet = this.press.filter(p => p.phase === 'engine' && p.bait > 0 && p.press < PRESS_ZONES.amber)
      .sort((a, b) => a.press - b.press)[0];
    if (quiet) moments.push({ kind: 'quiet', move: numbered(quiet.ply, quiet.san) });
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
      score, gold, finalEval, ending, bonus,
      checks: { right: this.checks.filter(c => c.correct).length, n: this.checks.length },
      conquered: [...this.chart.conquered],
      missed: this.missed, moments: moments.slice(0, 3),
    };
    this.thinking = false;
    this.speak(ending === 'mates' ? 'END_WHITE_MATES' : ending === 'mated' ? 'END_WHITE_MATED'
      : ending === 'draw' ? 'END_DRAW' : gold ? (this.toernooi ? 'END_TOERNOOI_WON' : 'END_GOLD')
      : this.toernooi ? 'END_TOERNOOI'
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
