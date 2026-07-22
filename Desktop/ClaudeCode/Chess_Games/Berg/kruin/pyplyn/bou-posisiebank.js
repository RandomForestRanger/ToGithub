// Kaart 2 se volledige pyplyn: neem die kandidate uit soek-posisies.js se
// kandidate.json, verifieer elkeen se DTM teen die orakel, merk slinkse lyne
// vir Rotse (15-22) en Sneeu (23-30) (ligte pas -- sien oorgawe-nota), en bak
// die finale POSITION_BANK uit.
const fs = require('fs');
const Core = require('./orakel-core.js');
const { buildOracle } = require('./build-oracle.js');

const {
  TURN_WHITE, TURN_BLACK, packIndex,
  whiteMoves, blackKingMoves, file, rank, sqOf,
  KING_FLAT, KING_CNT, ADJACENT,
} = Core;

const FILES = 'abcdefgh';
const sqAlg = (sq) => FILES[file(sq)] + (rank(sq) + 1);
const CORNERS = [sqOf(0, 0), sqOf(0, 7), sqOf(7, 0), sqOf(7, 7)];
function squareColor(sq) { return (file(sq) + rank(sq)) & 1; }
function chebyshev(a, b) { return Math.max(Math.abs(file(a) - file(b)), Math.abs(rank(a) - rank(b))); }

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

function moveSq(from, to) { return sqAlg(from) + sqAlg(to); }

function zoneOf(rungN) {
  if (rungN <= 6) return 'moeras';
  if (rungN <= 14) return 'woud';
  if (rungN <= 22) return 'rotse';
  return 'sneeu';
}
const THEME_TEXT = {
  moeras: 'hoekwerk: die hok toemaak in die regte hoek',
  woud: 'randwerk: die kantdans',
  rotse: 'W-mars: die ruiter se pad word geleer',
  sneeu: "volle eindspel vanaf 'n oop posisie",
};

function classifyTrap(mainWB, mainWN, from, to) {
  if (ADJACENT[to * 64 + mainWN] === 1) return 'ruiter-uitval';
  const bishopColor = squareColor(mainWB);
  const matching = CORNERS.filter((c) => squareColor(c) === bishopColor);
  const distBefore = Math.min(...matching.map((c) => chebyshev(from, c)));
  const distAfter = Math.min(...matching.map((c) => chebyshev(to, c)));
  if (distAfter > distBefore) return 'hoekvlug-truuk';
  return 'pat-duik';
}

function whiteOptimalReply(dtm, wK, wB, wN, bK) {
  const idx = packIndex(wK, wB, wN, bK, TURN_WHITE);
  const d = dtm[idx];
  for (const m of whiteMoves(wK, wB, wN, bK)) {
    const nwK = m.piece === 'K' ? m.to : wK;
    const nwB = m.piece === 'B' ? m.to : wB;
    const nwN = m.piece === 'N' ? m.to : wN;
    const succIdx = packIndex(nwK, nwB, nwN, bK, TURN_BLACK);
    if (dtm[succIdx] === d - 1) return { wK: nwK, wB: nwB, wN: nwN, toSq: m.to };
  }
  return null;
}

// Loop die hoof-lyn (wit + swart se ware optimale skuiwe) af tot MAKS_DIEPTE
// swart-besluitpunte, en soek by ELKEEN 'n sub-optimale-maar-nie-selfmoord-
// alternatief. Neem die vlakste een wat gevind word.
function findSwindle(dtm, wK, wB, wN, bK) {
  const MAKS_DIEPTE = 12;
  let curWK = wK, curWB = wB, curWN = wN, curBK = bK;

  for (let ply = 1; ply <= MAKS_DIEPTE; ply++) {
    const reply = whiteOptimalReply(dtm, curWK, curWB, curWN, curBK);
    if (!reply) break; // reeds mat of geen optimale skuif gevind nie
    const { wK: nwK, wB: nwB, wN: nwN } = reply;

    const candidates = blackKingMoves(nwK, nwB, nwN, curBK)
      .filter((m) => !m.capture)
      .map((m) => {
        const succIdx = packIndex(nwK, nwB, nwN, m.to, TURN_WHITE);
        return { to: m.to, dtmAfter: dtm[succIdx] };
      })
      .filter((c) => c.dtmAfter !== 255);
    if (candidates.length === 0) break; // mat gelewer

    const optimalD = Math.max(...candidates.map((c) => c.dtmAfter));
    const subOptimal = candidates
      .filter((c) => c.dtmAfter < optimalD && (optimalD - c.dtmAfter) <= 4)
      .sort((a, b) => b.dtmAfter - a.dtmAfter);

    if (subOptimal.length > 0) {
      const chosen = subOptimal[0];
      const trapType = classifyTrap(nwB, nwN, curBK, chosen.to);
      const replyAfter = whiteOptimalReply(dtm, nwK, nwB, nwN, chosen.to);
      return {
        atPly: ply * 2, // wit se ply (2*ply-1) gevolg deur swart se slinkse ply (2*ply)
        move: moveSq(curBK, chosen.to),
        trap: trapType,
        verkorting_plies: optimalD - chosen.dtmAfter,
        reply_hint: replyAfter ? sqAlg(replyAfter.toSq) : null,
      };
    }

    // geen strik hier nie -- volg die WARE optimale swart-skuif en gaan voort
    const optimalMove = candidates.find((c) => c.dtmAfter === optimalD);
    curWK = nwK; curWB = nwB; curWN = nwN; curBK = optimalMove.to;
  }
  return null;
}

function main() {
  const kandidate = JSON.parse(fs.readFileSync(__dirname + '/kandidate.json', 'utf8'));
  const { dtm } = buildOracle();

  const rungs = kandidate.map((k) => {
    const zone = zoneOf(k.rungN);
    const rootIdx = packIndex(k.wK, k.wB, k.wN, k.bK, TURN_WHITE);
    const dtmPlies = dtm[rootIdx];
    if (dtmPlies === 255) throw new Error(`sport ${k.rungN}: orakel gee REMISE, nie 'n wenposisie nie!`);
    const dtmMoves = Math.ceil(dtmPlies / 2);
    if (dtmMoves !== k.rungN) throw new Error(`sport ${k.rungN}: DTM=${dtmMoves} skuiwe stem nie ooreen met sportnommer nie!`);

    const swindles = [];
    if (zone === 'rotse' || zone === 'sneeu') {
      const sw = findSwindle(dtm, k.wK, k.wB, k.wN, k.bK);
      if (sw) swindles.push(sw);
    }

    return {
      rung: k.rungN,
      zone,
      fen: k.fen,
      dtm_moves: dtmMoves,
      theme: THEME_TEXT[zone],
      swindles,
      hint_square_logic: 'oracle',
    };
  });

  const bank = { version: '1.0.0', rungs };
  fs.writeFileSync(__dirname + '/../posisiebank.json', JSON.stringify(bank, null, 2));
  console.log(`POSITION_BANK geskryf: ${rungs.length} sporte, ${rungs.filter(r => r.swindles.length).length} met 'n gemerkte slinkse lyn.`);
  for (const r of rungs) {
    if (r.swindles.length) {
      console.log(`  sport ${r.rung}: ${r.swindles[0].trap} -- ${r.swindles[0].move} (verkort ${r.swindles[0].verkorting_plies} plies), weerlegging: ${r.swindles[0].reply_hint}`);
    } else if (r.zone === 'rotse' || r.zone === 'sneeu') {
      console.log(`  sport ${r.rung}: GEEN slinkse lyn gevind nie (aanvaarbaar -- nie elke posisie hoef een te hê nie)`);
    }
  }
}

main();
