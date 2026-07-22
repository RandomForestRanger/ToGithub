// Kaart 2 se bou-tyd-pyplyn (§3.2): soek kandidaatposisies per sport-DTM en tema,
// druk die boonste kandidate per sport vir hersiening.
const Core = require('./orakel-core.js');
const { buildOracle } = require('./build-oracle.js');

const {
  TURN_WHITE, unpackIndex, packIndex, file, rank, sqOf,
} = Core;

const FILES = 'abcdefgh';
const sqAlg = (sq) => FILES[file(sq)] + (rank(sq) + 1);

function toFEN(wK, wB, wN, bK) {
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
  return rows.join('/') + ' w - - 0 1';
}

const CORNERS = [sqOf(0, 0), sqOf(0, 7), sqOf(7, 0), sqOf(7, 7)];
function squareColor(sq) { return (file(sq) + rank(sq)) & 1; }
function chebyshev(a, b) { return Math.max(Math.abs(file(a) - file(b)), Math.abs(rank(a) - rank(b))); }
function distToEdge(sq) { return Math.min(file(sq), 7 - file(sq), rank(sq), 7 - rank(sq)); }

function zoneOf(rungN) {
  if (rungN <= 6) return 'moeras';
  if (rungN <= 14) return 'woud';
  if (rungN <= 22) return 'rotse';
  return 'sneeu';
}

function themeScore(zone, wK, wB, wN, bK) {
  const bishopColor = squareColor(wB);
  const matchingCorners = CORNERS.filter((c) => squareColor(c) === bishopColor);
  const oppositeCorners = CORNERS.filter((c) => squareColor(c) !== bishopColor);
  const distMatching = Math.min(...matchingCorners.map((c) => chebyshev(bK, c)));
  const distOpposite = Math.min(...oppositeCorners.map((c) => chebyshev(bK, c)));
  const bkOnEdge = distToEdge(bK) === 0 ? 1 : 0;
  const compactness = chebyshev(wK, wB) + chebyshev(wK, wN); // laer = wit stukke bymekaar

  let score = 0;
  if (zone === 'moeras') {
    // hoekwerk: bK naby die REGTE hoek
    score = -distMatching * 10 - compactness;
  } else if (zone === 'woud') {
    // randwerk: bK op die rand, nie te naby die hoek nie, nie te ver van optimale nie
    score = (bkOnEdge ? 10 : 0) - Math.abs(distMatching - 3) * 4 - compactness;
  } else if (zone === 'rotse') {
    // W-mars: bK naby die VERKEERDE hoek
    score = -distOpposite * 10 - compactness;
  } else {
    // sneeu: oop -- bK ver van alle hoeke/rande
    score = distToEdge(bK) * 10 - compactness;
  }
  return score;
}

function main() {
  const { dtm } = buildOracle();
  const N_RUNGS = 30;
  const results = [];

  for (let rungN = 1; rungN <= N_RUNGS; rungN++) {
    const targetPlies = 2 * rungN - 1;
    const zone = zoneOf(rungN);
    let best = null, bestScore = -Infinity;
    let seen = 0;

    // steekproef oor die hele indeksruimte (elke k-de posisie) vir spoed;
    // met ~10.8M wit-wettige posisies per DTM-waarde behoorlik versprei is
    // 'n steekproef ruim genoeg om goeie kandidate te vind.
    const STEP = 7; // ko-priem met 2 (turn-bit), gee goeie verspreiding
    for (let idx = 0; idx < dtm.length; idx += STEP) {
      if (dtm[idx] !== targetPlies) continue;
      const p = unpackIndex(idx);
      if (p.turn !== TURN_WHITE) continue;
      seen++;
      const s = themeScore(zone, p.wK, p.wB, p.wN, p.bK);
      if (s > bestScore) { bestScore = s; best = p; }
    }

    results.push({ rungN, zone, targetPlies, best, bestScore, seen });
    const fen = best ? toFEN(best.wK, best.wB, best.wN, best.bK) : '(GEEN GEVIND NIE)';
    console.log(`sport ${rungN} (${zone}, dtm=${rungN} skuiwe=${targetPlies}plies) score=${bestScore.toFixed(1)} steekproef=${seen}  FEN: ${fen}`);
  }

  require('fs').writeFileSync(
    __dirname + '/kandidate.json',
    JSON.stringify(results.map(r => ({
      rungN: r.rungN, zone: r.zone,
      wK: r.best.wK, wB: r.best.wB, wN: r.best.wN, bK: r.best.bK,
      fen: toFEN(r.best.wK, r.best.wB, r.best.wN, r.best.bK),
    })), null, 2)
  );
  console.log('\nKandidate geskryf na kandidate.json');
}

main();
