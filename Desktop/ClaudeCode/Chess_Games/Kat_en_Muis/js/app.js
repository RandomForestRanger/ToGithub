// Kat en Muis: Mat in 10
// The player is the cat (attacker). Stockfish plays the mouse (longest defence).

import { Chessground } from '../vendor/chessground/chessground.min.js';
import { Chess } from '../vendor/chessjs/chess.js';
import { Enjin, bestForMover } from './enjin.js';
import { logo, winScene, loseScene } from './kuns.js';
import { randomTheme, applyTheme, withReveal } from './kleur.js';

const MATE_N = 10;               // every bank position is a mate in 10
const MATE_SHORT = 5;            // Mat in 5: the bank line with its first 5 moves played for you
const INTRO_STEP_MS = 1400;      // pace of those first moves
const FREEZE_MS = 10000;
const SEARCH_MS = 1500;          // first budget check
const SEARCH_MS_RETRY = 3000;    // second look before ending a round early
const STILL_CRUSHING_CP = 300;   // no mate found but attacker still this far ahead: keep playing
const BANK_REPLY_DELAY = 450;
const REPLAY_STEP_MS = 2200;     // slow enough for a child to follow each move
const GAME_PREFIX = 'katEnMuis';                    // suite key pattern: {prefix}_{player}_{data}
const PLAYERS = ['Thomas', 'Jacobus', 'Besoeker'];

const MAANDE = ['Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie', 'Julie',
  'Augustus', 'September', 'Oktober', 'November', 'Desember'];
const FIG = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const ROLE = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
const STARS_BY_EXTRA = { 1: 3, 3: 2, 5: 1 };

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------ storage

// Private window or blocked storage: the game still works, it just forgets.
function readKey(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function writeKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// "Ander" was renamed "Besoeker" on 1 Nov 2026; carry its saved data over once.
for (const kind of ['vordering', 'vordering5', 'kleur']) {
  const old = readKey(`${GAME_PREFIX}_Ander_${kind}`, null);
  if (old !== null && readKey(`${GAME_PREFIX}_Besoeker_${kind}`, null) === null) writeKey(`${GAME_PREFIX}_Besoeker_${kind}`, old);
}
if (readKey(`${GAME_PREFIX}_speler`, null) === 'Ander') writeKey(`${GAME_PREFIX}_speler`, 'Besoeker');

let player = readKey(`${GAME_PREFIX}_speler`, null);
if (!PLAYERS.includes(player)) player = null;
let mode = readKey(`${GAME_PREFIX}_modus`, null);   // 5 or 10
if (mode !== MATE_SHORT && mode !== MATE_N) mode = null;
let saved = null;

// Mat in 10 and Mat in 5 keep separate progress (stars, current position).
const progressKey = (p, m) => `${GAME_PREFIX}_${p}_${m === MATE_SHORT ? 'vordering5' : 'vordering'}`;

function loadPlayer(p) {
  const s = readKey(progressKey(p, mode), {});
  s.results ||= {};
  s.extra ||= 3;
  s.index ||= 0;
  s.games ||= 0;
  return s;
}
function saveStore() {
  writeKey(progressKey(player, mode), saved);
}

// Each player keeps their own colours; before anyone is chosen, the last player's.
const themeKey = (p) => `${GAME_PREFIX}_${p || 'gas'}_kleur`;
let theme = readKey(themeKey(player), null);

// ------------------------------------------------------------ helpers

const colorName = (c) => (c === 'w' ? 'white' : 'black');
const figurine = (san) => san.replace(/[KQRBN]/g, (ch) => FIG[ch] + '︎');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseUci(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function destsOf(chess) {
  const dests = new Map();
  for (const m of chess.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    const list = dests.get(m.from);
    if (!list.includes(m.to)) list.push(m.to);
  }
  return dests;
}

function checkColor(chess) {
  return chess.inCheck() ? colorName(chess.turn()) : false;
}

// ------------------------------------------------------------ state

let bank = [];
let engine = null;
let cg = null;
let round = null;
let roundToken = 0;
let replay = null;

// ------------------------------------------------------------ board

function makeBoard() {
  cg = Chessground($('board'), {
    coordinates: true,
    animation: { enabled: true, duration: 220 },
    highlight: { lastMove: true, check: true },
    movable: { free: false, color: undefined, showDests: true, events: { after: onUserMove } },
    premovable: { enabled: false },
    draggable: { enabled: true, showGhost: true },
    drawable: { enabled: true, visible: true },
  });
  window.addEventListener('resize', () => document.body.dispatchEvent(new Event('chessground.resize')));
}

function showPosition(chess, lastMove) {
  cg.set({
    fen: chess.fen(),
    turnColor: colorName(chess.turn()),
    lastMove,
    check: checkColor(chess),
    movable: { color: undefined, dests: new Map() },
  });
}

function letPlayerMove() {
  cg.set({
    turnColor: colorName(round.chess.turn()),
    movable: { color: colorName(round.attacker), dests: destsOf(round.chess) },
  });
  $('board-frame').classList.remove('locked');
}

function lockBoard() {
  cg.set({ movable: { color: undefined, dests: new Map() } });
  $('board-frame').classList.add('locked');
}

// Lichess-style promotion picker: four pieces in a column on the promotion file.
function pickPromotion(dest) {
  const promo = $('promo');
  const file = dest.charCodeAt(0) - 97;
  const col = round.attacker === 'w' ? file : 7 - file;
  const color = colorName(round.attacker);
  promo.innerHTML = ['q', 'n', 'r', 'b']
    .map((r, i) => `<div class="promo-sq" data-role="${r}" style="left:${col * 12.5}%;top:${i * 12.5}%">
      <div class="disc"></div><piece class="${ROLE[r]} ${color}"></piece></div>`)
    .join('');
  promo.hidden = false;
  return new Promise((resolve) => {
    promo.onclick = (e) => {
      const sq = e.target.closest('.promo-sq');
      promo.hidden = true;
      promo.onclick = null;
      resolve(sq ? sq.dataset.role : null);
    };
  });
}

// ------------------------------------------------------------ round lifecycle

// Mat in 5 starts from the bank position after the first 5 moves of each side.
// Those moves are best play, so what is left is an exact mate in 5, and the
// bank's perfect alternatives still apply (their ply numbers shift by 10).
function roundLine(pos) {
  if (mode !== MATE_SHORT) {
    return { mateN: MATE_N, startFen: pos.fen, pv: pos.pv, alts: pos.perfectAlternatives || {}, intro: [] };
  }
  const skip = 2 * (MATE_N - MATE_SHORT);
  const c = new Chess(pos.fen);
  for (const uci of pos.pv.slice(0, skip)) c.move(parseUci(uci));
  const alts = {};
  for (const [k, v] of Object.entries(pos.perfectAlternatives || {})) {
    if (Number(k) >= skip) alts[String(Number(k) - skip)] = v;
  }
  return { mateN: MATE_SHORT, startFen: c.fen(), pv: pos.pv.slice(skip), alts, intro: pos.pv.slice(0, skip) };
}

function startRound(index, again = false) {
  stopReplay();
  roundToken++;
  const pos = bank[index];
  saved.index = index;
  saveStore();
  const line = roundLine(pos);
  const chess = new Chess(line.startFen);
  round = {
    token: roundToken,
    index,
    pos,
    ...line,            // mateN, startFen, pv, alts, intro
    chess,
    attacker: pos.attacker,
    extra: saved.extra,
    budget: line.mateN + saved.extra,
    phase: 'freeze',
    moves: [],          // { uci, san, by: 'att'|'def', status, lost, attNo }
    onLine: true,       // every move so far equals the bank's main line
    expected: line.mateN, // attacker moves still needed with best play (null if unknown)
    attMoves: 0,
    helped: false,      // a move was taken back: a win then earns no stars
    outcome: null,
  };
  if (engine) engine.newGame();

  $('oops').hidden = true;
  $('wys-pad').hidden = true;
  cg.set({ orientation: colorName(pos.attacker), drawable: { shapes: [] } });
  lockBoard();

  // side panel
  const side = pos.attacker === 'w' ? 'Wit' : 'Swart';
  $('prompt').textContent = `${side} speel en mat in ${line.mateN}`;
  $('side-dot').className = `side-dot ${pos.attacker}`;
  $('ek-het-dit').hidden = true;
  $('handicap-box').classList.remove('locked');
  renderChips();
  $('counter-box').hidden = true;
  $('thinking').hidden = true;
  $('result-box').hidden = true;
  $('tabs').hidden = true;
  $('replay').hidden = true;
  renderSource(pos);
  renderNav();

  if (!line.intro.length) {
    showPosition(chess, undefined);
    $('hint').textContent = 'Kyk eers mooi...';
    renderMoveList([], pos.fen, -1, false, 'Die skuiwe verskyn hier sodra jy begin.');
    startFreeze();
  } else if (again) {
    // a retry skips the opening show: straight to the position after it
    showPosition(chess, lastMoveOf(round));
    $('hint').textContent = 'Kyk eers mooi...';
    renderIntroMoves(line.intro.length - 1);
    startFreeze();
  } else {
    playIntro();
  }
}

// Mat in 5: the cat's first 5 moves (and the mouse's replies) play out slowly.
async function playIntro() {
  const r = round;
  r.phase = 'intro';
  const c = new Chess(r.pos.fen);
  cg.set({ fen: c.fen(), lastMove: undefined, check: checkColor(c), turnColor: colorName(c.turn()) });
  $('hint').textContent = 'Kyk hoe die kat begin...';
  renderIntroMoves(-1);
  for (let i = 0; i < r.intro.length; i++) {
    await sleep(i === 0 ? INTRO_STEP_MS * 1.5 : INTRO_STEP_MS);
    if (round !== r || r.token !== roundToken) return;
    const mv = c.move(parseUci(r.intro[i]));
    cg.set({ fen: c.fen(), lastMove: [mv.from, mv.to], check: checkColor(c), turnColor: colorName(c.turn()) });
    renderIntroMoves(i);
  }
  await sleep(INTRO_STEP_MS);
  if (round !== r || r.token !== roundToken) return;
  $('hint').textContent = 'Nou is dit jou beurt. Kyk eers mooi...';
  startFreeze();
}

function renderIntroMoves(current) {
  const r = round;
  const c = new Chess(r.pos.fen);
  const items = r.intro.map((uci, i) => ({ san: c.move(parseUci(uci)).san, ply: i, tag: null }));
  renderMoveList(items.slice(0, current + 1), r.pos.fen, current, false, 'Die kat se eerste 5 skuiwe.');
}

// freeze: the board is locked for at least 10 seconds while the ring drains
function startFreeze() {
  round.phase = 'freeze';
  const ring = $('ring');
  ring.classList.remove('running', 'done');
  ring.style.setProperty('--freeze-ms', `${FREEZE_MS}ms`);
  void ring.getBoundingClientRect();
  ring.classList.add('running');
  const token = round.token;
  setTimeout(() => {
    if (!round || round.token !== token || round.phase !== 'freeze') return;
    round.phase = 'ready';
    ring.classList.remove('running');
    ring.classList.add('done');
    $('hint').textContent = 'Neem jou tyd.';
    $('ek-het-dit').hidden = false;
  }, FREEZE_MS);
}

function beginPlay() {
  if (!round || round.phase !== 'ready') return;
  round.phase = 'play';
  round.extra = saved.extra;
  round.budget = round.mateN + saved.extra;
  $('ek-het-dit').hidden = true;
  $('hint').textContent = '';
  $('handicap-box').classList.add('locked');
  $('counter-box').hidden = false;
  renderCounter();
  renderNav();
  renderMoveList([], round.startFen, -1, false, '');
  letPlayerMove();
}

async function onUserMove(orig, dest) {
  if (!round || round.phase !== 'play') return;
  const piece = round.chess.get(orig);
  let promotion;
  if (piece && piece.type === 'p' && (dest[1] === '8' || dest[1] === '1')) {
    promotion = await pickPromotion(dest);
    if (!promotion) {
      showPosition(round.chess, lastMoveOf(round));
      letPlayerMove();
      return;
    }
  }
  playAttacker({ from: orig, to: dest, promotion });
}

function lastMoveOf(r) {
  const uci = r.moves.length ? r.moves[r.moves.length - 1].uci : r.intro[r.intro.length - 1];
  return uci ? [uci.slice(0, 2), uci.slice(2, 4)] : undefined;
}

async function playAttacker(m) {
  const r = round;
  const ply = r.chess.history().length;
  let mv;
  try {
    mv = r.chess.move(m);
  } catch {
    showPosition(r.chess, lastMoveOf(r));
    letPlayerMove();
    return;
  }
  const uci = mv.from + mv.to + (mv.promotion || '');
  r.attMoves++;
  let status = 'off';
  if (r.onLine && r.pv[ply] === uci) status = 'line';
  else if (r.onLine && (r.alts[String(ply)] || []).includes(uci)) status = 'alt';
  const prev = { onLine: r.onLine, expected: r.expected }; // restored on a take-back
  if (status !== 'line') r.onLine = false;
  const rec = { uci, san: mv.san, by: 'att', status, lost: status === 'off' ? null : 0, attNo: r.attMoves, prev };
  r.moves.push(rec);

  r.phase = 'busy';
  showPosition(r.chess, [mv.from, mv.to]);
  lockBoard();
  renderCounter();
  renderLiveMoves();

  if (r.chess.isCheckmate()) return finish({ result: 'win', n: r.attMoves });
  if (r.chess.isGameOver()) return oops('pat');
  if (r.attMoves >= r.budget) return finish({ result: 'lose', kind: 'budget' });

  // ---- defender reply
  const token = r.token;
  let reply;

  if (status === 'line') {
    r.expected = r.mateN - r.attMoves;
    await sleep(BANK_REPLY_DELAY);
    if (round !== r || r.token !== token) return;
    reply = r.pv[ply + 1];
  } else {
    $('thinking').hidden = false;
    const fen = r.chess.fen();
    const remaining = r.budget - r.attMoves;
    let res = await engine.search(fen, { movetime: SEARCH_MS, multipv: 3 });
    if (round !== r || r.token !== token) return;
    let best = bestForMover(res);
    let k = best && best.mate !== null && best.mate < 0 ? -best.mate : null;

    if (status === 'alt') {
      k = r.mateN - r.attMoves; // known exactly from the bank
    } else if (k === null || k > remaining) {
      // second look with more time before telling a child they have failed
      res = await engine.search(fen, { movetime: SEARCH_MS_RETRY, multipv: 3 });
      if (round !== r || r.token !== token) return;
      const best2 = bestForMover(res);
      if (best2) best = best2;
      k = best && best.mate !== null && best.mate < 0 ? -best.mate : null;
    }
    $('thinking').hidden = true;

    // lost pace on this attacker move (only when the distance is known)
    if (status === 'off') {
      if (k !== null && r.expected !== null) rec.lost = Math.max(0, k - (r.expected - 1));
      r.expected = k;
    } else {
      r.expected = k;
    }

    reply = best?.pv?.[0] || res.bestmove;
    const fits = k !== null && k <= remaining;
    const attackerCp = best && best.cp !== null ? -best.cp : null;
    const stillCrushing = k === null && attackerCp !== null && attackerCp >= STILL_CRUSHING_CP;
    if (status === 'off' && !fits && !stillCrushing) {
      // the mouse has found a hole: show its escape, then pause on the mistake
      if (reply && reply !== '(none)') playDefender(reply);
      return oops('escaped');
    }
  }

  if (!reply || reply === '(none)') return finish({ result: 'lose', kind: 'escaped' });
  playDefender(reply);
  if (r.chess.isGameOver()) return finish({ result: 'lose', kind: 'escaped' });
  r.phase = 'play';
  renderCounter();
  letPlayerMove();
}

function playDefender(uci) {
  const r = round;
  const mv = r.chess.move(parseUci(uci));
  r.moves.push({ uci, san: mv.san, by: 'def' });
  showPosition(r.chess, [mv.from, mv.to]);
  renderLiveMoves();
}

// The cat's last move let the mouse slip away. Stop right there, so the child
// sees which move it was (red arrow), and offer a take-back or the shortest path.
function oops(kind) {
  const r = round;
  r.phase = 'oops';
  lockBoard();
  $('thinking').hidden = true;
  renderCounter();
  const bad = r.moves.filter((m) => m.by === 'att').pop();
  cg.setShapes([{ orig: bad.uci.slice(0, 2), dest: bad.uci.slice(2, 4), brush: 'red' }]);
  $('oops-text').textContent = kind === 'pat'
    ? 'Ai, dis pat! Nou kan die muis nie meer gevang word nie.'
    : 'Ai, met hierdie skuif gaan die muis wegglip!';
  $('oops').hidden = false;
  renderNav();
}

function takeBack() {
  const r = round;
  if (!r || r.phase !== 'oops') return;
  $('oops').hidden = true;
  cg.setShapes([]);
  // undo the mouse's escape (if it moved) and then the cat's move
  while (r.moves.length) {
    const m = r.moves.pop();
    r.chess.undo();
    if (m.by === 'att') {
      r.onLine = m.prev.onLine;
      r.expected = m.prev.expected;
      break;
    }
  }
  r.attMoves--;
  r.helped = true;
  r.phase = 'play';
  showPosition(r.chess, lastMoveOf(r));
  renderCounter();
  renderLiveMoves();
  renderNav();
  letPlayerMove();
}

function giveUp() {
  if (!round || round.phase !== 'oops') return;
  $('oops').hidden = true;
  cg.setShapes([]);
  finish({ result: 'lose', kind: 'escaped' });
  playFromStart(); // the child already asked for it
}

function finish(outcome) {
  const r = round;
  r.phase = 'done';
  r.outcome = outcome;
  lockBoard();
  $('thinking').hidden = true;
  renderCounter();
  renderNav();

  const box = $('result-box');
  box.hidden = false;
  box.classList.toggle('win', outcome.result === 'win');
  let text;
  let stars = 0;
  if (outcome.result === 'win') {
    $('scene').innerHTML = winScene();
    if (r.helped) {
      text = "Gevang, met 'n terugskuif! Probeer later weer vir sterre.";
    } else {
      text = outcome.n === r.mateN
        ? `Gevang! Mat in presies ${r.mateN}.`
        : `Gevang! Mat in ${outcome.n}. Kyk hoe dit in ${r.mateN} kon gebeur.`;
      stars = STARS_BY_EXTRA[r.extra] || 1;
    }
  } else {
    $('scene').innerHTML = loseScene();
    text = outcome.kind === 'budget' ? 'Die muis het weggekom.' : "Die muis het 'n gat gevind.";
  }
  $('result-text').textContent = text;
  const perfect = outcome.result === 'win' && outcome.n === r.mateN && !r.helped;
  $('stars').innerHTML = stars
    ? '★'.repeat(stars) + `<span class="off">${'★'.repeat(3 - stars)}</span>` +
      (perfect ? `<small>Presies ${r.mateN}!</small>` : '')
    : '';

  const key = r.pos.id;
  const prev = saved.results[key] || { stars: 0, perfect: false, tries: 0 };
  saved.results[key] = {
    stars: Math.max(prev.stars, stars),
    perfect: prev.perfect || perfect,
    tries: prev.tries + 1,
  };
  saved.games++;
  saveStore();
  renderNav();

  // every round ends with the shortest line, replayed once the child asks for it
  startReplay('pad', true);
}

// ------------------------------------------------------------ reveal

function framesFor(fen, ucis) {
  const c = new Chess(fen);
  const frames = [];
  for (const uci of ucis) {
    const mv = c.move(parseUci(uci));
    frames.push({ fen: c.fen(), lastMove: [mv.from, mv.to], check: checkColor(c), san: mv.san, uci });
  }
  return frames;
}

// wait: leave the round's final position on the board and show a play button
// over it; nothing moves until the child clicks.
function startReplay(view, wait) {
  stopReplay();
  const r = round;
  const ucis = view === 'pad' ? r.pv : r.moves.map((m) => m.uci);
  replay = { view, frames: framesFor(r.startFen, ucis), idx: -1, timer: null };
  $('tabs').hidden = false;
  $('replay').hidden = false;
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.view === view);
  if (wait) {
    renderReplayMoves();
    $('wys-pad').hidden = false;
  } else {
    gotoFrame(-1);
  }
}

function playFromStart() {
  if (!replay) return;
  gotoFrame(-1);
  togglePlay();
}

function stopReplay() {
  if (replay?.timer) {
    clearTimeout(replay.timer);
    clearInterval(replay.timer);
  }
  if (replay) replay.timer = null;
  document.querySelector('.replay .play')?.classList.remove('on');
}

function gotoFrame(i) {
  if (!replay) return;
  $('wys-pad').hidden = true;
  const n = replay.frames.length;
  replay.idx = Math.max(-1, Math.min(n - 1, i));
  const f = replay.idx >= 0 ? replay.frames[replay.idx] : null;
  const start = new Chess(round.startFen);
  cg.set({
    fen: f ? f.fen : round.startFen,
    lastMove: f ? f.lastMove : undefined,
    check: f ? f.check : checkColor(start),
    turnColor: colorName(new Chess(f ? f.fen : round.startFen).turn()),
    movable: { color: undefined, dests: new Map() },
  });
  renderReplayMoves();
}

function togglePlay() {
  if (!replay) return;
  const btn = document.querySelector('.replay .play');
  if (replay.timer) {
    stopReplay();
    return;
  }
  if (replay.idx >= replay.frames.length - 1 || !$('wys-pad').hidden) gotoFrame(-1);
  btn.classList.add('on');
  replay.timer = setInterval(() => {
    if (replay.idx >= replay.frames.length - 1) return stopReplay();
    gotoFrame(replay.idx + 1);
  }, REPLAY_STEP_MS);
}

function renderReplayMoves() {
  const r = round;
  const items = replay.frames.map((f, i) => ({ san: f.san, ply: i, tag: null }));
  let note = '';
  if (replay.view === 'pad') {
    // mark the cat's moves the player matched while still on the shortest path
    for (let i = 0; i < items.length; i++) {
      const played = r.moves[i];
      if (!played || played.uci !== r.pv[i]) break;
      if (i % 2 === 0) items[i].tag = { cls: 'same', text: '✓', title: 'Jy het dit ook gespeel' };
    }
    const alts = r.alts;
    note = "Die kat se skuiwe en die muis se beste verdediging.";
    if (Object.values(alts).some((a) => a.length > 1)) note += ' Soms is daar meer as een perfekte skuif.';
  } else {
    r.moves.forEach((m, i) => {
      if (m.by !== 'att') return;
      if (m.status === 'alt') items[i].tag = { cls: 'alt', text: '≈', title: 'Ook perfek' };
      else if (m.lost > 0) {
        items[i].tag = {
          cls: 'slow',
          text: `+${m.lost}`,
          title: m.lost === 1 ? 'Hier het jy een skuif verloor' : `Hier het jy ${m.lost} skuiwe verloor`,
        };
      }
    });
    const slowCount = r.moves.filter((m) => m.lost > 0).length;
    note = slowCount
      ? 'Die oranje merkies wys waar die muis ekstra tyd gekry het.'
      : 'Jou spel, skuif vir skuif.';
  }
  renderMoveList(items, r.startFen, replay.idx, true, note);
}

function renderLiveMoves() {
  const r = round;
  const items = r.moves.map((m, i) => ({ san: m.san, ply: i, tag: null }));
  renderMoveList(items, r.startFen, items.length - 1, false, '');
}

// Lichess-style move table. Handles lines that start with Black to move.
function renderMoveList(items, startFen, current, clickable, note) {
  const el = $('moves');
  el.classList.toggle('clickable', clickable);
  const parts = startFen.split(' ');
  let num = parseInt(parts[5] || '1', 10);
  const blackFirst = parts[1] === 'b';
  let html = '';
  const cell = (it) => {
    if (!it) return '<div class="mv empty"></div>';
    const cls = it.ply === current ? 'mv current' : 'mv';
    const tag = it.tag ? `<span class="tag ${it.tag.cls}" title="${it.tag.title}">${it.tag.text}</span>` : '';
    return `<div class="${cls}" data-ply="${it.ply}">${figurine(it.san)}${tag}</div>`;
  };
  let i = 0;
  if (blackFirst && items.length) {
    html += `<div class="num">${num}</div><div class="mv empty">…</div>${cell(items[0])}`;
    i = 1;
    num++;
  }
  for (; i < items.length; i += 2) {
    html += `<div class="num">${num}</div>${cell(items[i])}${cell(items[i + 1])}`;
    num++;
  }
  if (note) html += `<div class="note">${note}</div>`;
  el.innerHTML = html;
  const cur = el.querySelector('.mv.current');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

// ------------------------------------------------------------ side panel bits

function renderChips() {
  for (const chip of document.querySelectorAll('.chip')) {
    chip.setAttribute('aria-checked', String(Number(chip.dataset.extra) === saved.extra));
  }
}

function renderCounter() {
  const r = round;
  const over = r.phase === 'done' || r.phase === 'oops';
  const shown = over ? r.attMoves : Math.min(r.attMoves + 1, r.budget);
  $('counter').textContent = `Skuif ${shown} van ${r.budget}`;
  let html = '';
  for (let i = 0; i < r.budget; i++) {
    const cls = ['pip'];
    if (i >= r.mateN) cls.push('extra');
    if (i < r.attMoves) cls.push('used');
    if (!over && i === r.attMoves) cls.push('now');
    html += `<span class="${cls.join(' ')}"></span>`;
  }
  $('pips').innerHTML = html;
}

function renderSource(pos) {
  const s = pos.source || {};
  if (s.type === 'dev') {
    $('source').innerHTML = '<span class="dev">Toetsposisie (nie uit ’n regte speletjie nie)</span>';
    return;
  }
  let html = '';
  if (s.month) {
    const [y, m] = s.month.split('-');
    html = `Uit 'n Lichess-speletjie, <b>${MAANDE[parseInt(m, 10) - 1] || ''} ${y}</b>`;
  }
  if (s.ratingBand) html += `<br>Gradering ${s.ratingBand.replace('-', '–')}`;
  $('source').innerHTML = html;
}

function renderNav() {
  const busy = round && (round.phase === 'play' || round.phase === 'busy' || round.phase === 'oops');
  $('vorige').disabled = busy || !round || round.index === 0;
  $('volgende-pos').disabled = busy || !round || round.index >= bank.length - 1;
  if (!round) return;
  const res = saved.results[round.pos.id];
  const mark = res?.stars ? ` ${'★'.repeat(res.stars)}` : '';
  $('pos-label').innerHTML = `<span class="long">Posisie </span>${round.index + 1} van ${bank.length}${mark}`;
}

// ------------------------------------------------------------ wiring

function wire() {
  $('logo').innerHTML = logo;
  $('tuis-kuns').innerHTML = winScene();

  // start screen: pick a player and a game, then Begin!
  $('speler-kaarte').innerHTML = PLAYERS.map((p, i) => `
    <button class="card speler" data-speler="${p}" role="radio" style="--h:${[28, 205, 140][i]}">
      <span class="avatar">${p === 'Besoeker' ? '?' : p[0]}</span><b>${p}</b>
    </button>`).join('');
  $('speler-kaarte').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    player = card.dataset.speler;
    writeKey(`${GAME_PREFIX}_speler`, player);
    theme = readKey(themeKey(player), null);
    applyTheme(theme);
    renderStart();
  });
  for (const card of document.querySelectorAll('.card.mode')) {
    card.addEventListener('click', () => {
      mode = Number(card.dataset.mode);
      writeKey(`${GAME_PREFIX}_modus`, mode);
      renderStart();
    });
  }
  $('begin').addEventListener('click', showGame);
  $('tuis-btn').addEventListener('click', showStart);
  $('logo').closest('a').addEventListener('click', (e) => {
    e.preventDefault();
    showStart();
  });

  // "Gee my 'n nuwe kleur": always available, remembered per player
  $('kleur').addEventListener('click', (e) => {
    theme = randomTheme(theme);
    writeKey(themeKey(player), theme);
    withReveal(e.currentTarget, () => applyTheme(theme));
  });

  $('ek-het-dit').addEventListener('click', beginPlay);
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      if (round && (round.phase === 'intro' || round.phase === 'freeze' || round.phase === 'ready' || round.phase === 'done')) {
        saved.extra = Number(chip.dataset.extra);
        saveStore();
        renderChips();
      }
    });
  }
  $('terug').addEventListener('click', takeBack);
  $('wys-my').addEventListener('click', giveUp);
  $('wys-pad').addEventListener('click', playFromStart);
  $('weer').addEventListener('click', () => startRound(round.index, true));
  $('volgende').addEventListener('click', () => startRound((round.index + 1) % bank.length));
  $('vorige').addEventListener('click', () => startRound(round.index - 1));
  $('volgende-pos').addEventListener('click', () => startRound(round.index + 1));
  for (const t of document.querySelectorAll('.tab')) {
    t.addEventListener('click', () => round?.phase === 'done' && startReplay(t.dataset.view, false));
  }
  $('replay').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !replay) return;
    const step = b.dataset.step;
    if (step === 'play') return togglePlay();
    stopReplay();
    if (step === 'first') gotoFrame(-1);
    if (step === 'prev') gotoFrame(replay.idx - 1);
    if (step === 'next') gotoFrame(replay.idx + 1);
    if (step === 'last') gotoFrame(replay.frames.length - 1);
  });
  $('moves').addEventListener('click', (e) => {
    const mv = e.target.closest('.mv[data-ply]');
    if (!mv || !replay || round?.phase !== 'done') return;
    stopReplay();
    gotoFrame(Number(mv.dataset.ply));
  });
  document.addEventListener('keydown', (e) => {
    if (!replay || round?.phase !== 'done') return;
    if (e.key === 'ArrowLeft') { stopReplay(); gotoFrame(replay.idx - 1); }
    if (e.key === 'ArrowRight') { stopReplay(); gotoFrame(replay.idx + 1); }
    if (e.key === 'ArrowUp' || e.key === 'Home') { stopReplay(); gotoFrame(-1); }
    if (e.key === 'ArrowDown' || e.key === 'End') { stopReplay(); gotoFrame(replay.frames.length - 1); }
  });
}

// ------------------------------------------------------------ screens

function renderStart() {
  for (const c of document.querySelectorAll('.card.speler')) {
    c.setAttribute('aria-checked', String(c.dataset.speler === player));
  }
  for (const c of document.querySelectorAll('.card.mode')) {
    c.setAttribute('aria-checked', String(Number(c.dataset.mode) === mode));
  }
  $('begin').disabled = !player || !mode || !bank.length;
  $('begin').textContent = player && mode ? `Begin, ${player}!` : 'Begin!';
}

function showStart() {
  stopReplay();
  roundToken++;       // anything still running for the old round now stops
  round = null;
  replay = null;
  $('spel').hidden = true;
  $('tuis').hidden = false;
  $('pos-nav').hidden = true;
  $('tuis-btn').hidden = true;
  $('speler-tag').hidden = true;
  $('modus-label').textContent = 'Vang die muis';
  renderStart();
}

function showGame() {
  if (!player || !mode || !bank.length) return;
  saved = loadPlayer(player);
  $('tuis').hidden = true;
  $('spel').hidden = false;
  $('pos-nav').hidden = false;
  $('tuis-btn').hidden = false;
  $('speler-tag').hidden = false;
  $('speler-tag').textContent = player;
  $('modus-label').textContent = `Mat in ${mode}`;
  cg.redrawAll(); // the board was built while hidden
  startRound(Math.min(saved.index, bank.length - 1));
}

async function main() {
  wire();
  applyTheme(theme);
  renderStart();
  makeBoard();
  try {
    engine = new Enjin();
  } catch (err) {
    console.error(err);
    $('hint').textContent = 'Die enjin kon nie laai nie.';
  }
  try {
    const res = await fetch('data/posisies.json');
    const data = await res.json();
    bank = data.positions || [];
  } catch (err) {
    console.error(err);
  }
  if (!bank.length) {
    $('begin').textContent = 'Geen posisies gevind nie';
    return;
  }
  renderStart();
}

// Read-only hook for automated play-testing.
window.katEnMuis = {
  get fen() { return round ? round.chess.fen() : null; },
  get phase() { return round ? round.phase : null; },
  get mode() { return mode; },
};

main();
