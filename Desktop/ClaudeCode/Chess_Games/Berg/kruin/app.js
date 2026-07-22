// Sneeuluiperd se Kruin — Kaart 2: die spel-enjin.
// Geen berg-SVG/kamera/Kapok/Jorka nie (Kaart 4/5) -- kaal bord-UI + sportlogika.
(function () {
  'use strict';

  const Core = window.OrakelCore;
  const Orakel = window.Orakel;
  const { file, rank, sqOf, symTransformSquare } = Core;

  const STATE_KEY = 'sneeuluiperd_v1';
  const N_RUNGS = 30;

  const ZONE_MERCY = { moeras: 2, woud: 4, rotse: 6, sneeu: 10 };
  const ZONE_SWINDLE_KANS = { moeras: 0, woud: 0.10, rotse: 0.25, sneeu: 0.40 };
  const MILESTONE_RUNGS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  function zoneOf(rungN) {
    if (rungN <= 6) return 'moeras';
    if (rungN <= 14) return 'woud';
    if (rungN <= 22) return 'rotse';
    return 'sneeu';
  }
  function budgetOf(rungN) { return rungN + ZONE_MERCY[zoneOf(rungN)]; }

  // --- Suiwer, direk toetsbare begrotingslogika (Kaart 2-aanvaardingstoets) ---
  function budgetStatus(rungN, whiteMovesPlayed) {
    const budget = budgetOf(rungN);
    return { budget, oor: budget - whiteMovesPlayed, misluk: whiteMovesPlayed > budget };
  }

  // --- Toestand (§6), volle vorm geskep met plekhouers vir Kaart 3/5 ---
  function laaiToestand() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw) {
      raw = {
        version: '1.0.0',
        currentRung: 1,
        residents: [],
        pawPrints: { moeras: 0, woud: 0, rotse: 0, sneeu: 0 },
        cleanZoneAscents: [],
        kapokTricks: [],
        hints: {},
        attempts: {},
        lastVisit: new Date().toISOString(),
      };
    }
    raw.lastVisit = new Date().toISOString();
    return raw;
  }
  function stoorToestand(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

  function registreerPoging(state, rungN, geslaag) {
    const key = String(rungN);
    if (!state.attempts[key]) state.attempts[key] = { tries: 0, passes: 0 };
    state.attempts[key].tries++;
    if (geslaag) state.attempts[key].passes++;
  }
  function vorderRung(state, geslaag) {
    if (geslaag) {
      state.currentRung = Math.min(N_RUNGS, state.currentRung + 1);
      if (MILESTONE_RUNGS.includes(state.currentRung) && !state.residents.includes(state.currentRung)) {
        state.residents.push(state.currentRung);
      }
    } else {
      state.currentRung = Math.max(1, state.currentRung - 1);
    }
  }

  // --- FEN-hulpfunksies (self-geskrewe, soos in orakel.js) ---
  function parseFEN(fen) {
    const rows = fen.trim().split(/\s+/)[0].split('/');
    let wK = -1, wB = -1, wN = -1, bK = -1;
    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const rankNum = 7 - rIdx;
      let f = 0;
      for (const ch of rows[rIdx]) {
        if (ch >= '1' && ch <= '8') { f += parseInt(ch, 10); continue; }
        const sq = sqOf(f, rankNum);
        if (ch === 'K') wK = sq; else if (ch === 'B') wB = sq;
        else if (ch === 'N') wN = sq; else if (ch === 'k') bK = sq;
        f++;
      }
    }
    return { wK, wB, wN, bK };
  }
  const FILES = 'abcdefgh';
  const sqAlg = (sq) => FILES[file(sq)] + (rank(sq) + 1);

  function transformPos(pos, symIdx) {
    return {
      wK: symTransformSquare(pos.wK, symIdx),
      wB: symTransformSquare(pos.wB, symIdx),
      wN: symTransformSquare(pos.wN, symIdx),
      bK: symTransformSquare(pos.bK, symIdx),
    };
  }

  // === Speletjie-enjin ===
  const Kruin = {};
  let state, board, huidigeSport, huidigePos, symIdx, turn, whiteMovesPlayed;
  let posisieGeskiedenis, selected, gedaanteInfo, sportGeslaagOfMislukEnigste;
  let swindleTransformed; // getransformeerde slinkse-lyn-inligting vir hierdie poging

  function posTuple(p, t) { return `${p.wK},${p.wB},${p.wN},${p.bK},${t}`; }

  function currentFEN() {
    return orakelFen(huidigePos, turn);
  }
  function orakelFen(pos, t) {
    // gebruik Orakel se eie parser/serialiseerder indirek via 'n klein plaaslike bou
    const board8 = Array.from({ length: 8 }, () => Array(8).fill(null));
    board8[rank(pos.wK)][file(pos.wK)] = 'K';
    board8[rank(pos.wB)][file(pos.wB)] = 'B';
    board8[rank(pos.wN)][file(pos.wN)] = 'N';
    board8[rank(pos.bK)][file(pos.bK)] = 'k';
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = board8[r][f];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        row += p;
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return rows.join('/') + ' ' + (t === Core.TURN_BLACK ? 'b' : 'w') + ' - - 0 1';
  }

  function setBoodskap(tekst, klas) {
    const el = document.getElementById('boodskap');
    el.textContent = tekst;
    el.style.color = klas === 'goed' ? '#2ecc71' : klas === 'sleg' ? '#e74c3c' : '#f39c12';
  }

  function verversStatus() {
    document.getElementById('sportWaarde').textContent = huidigeSport.rung;
    document.getElementById('soneWaarde').textContent = huidigeSport.zone;
    const bs = budgetStatus(huidigeSport.rung, whiteMovesPlayed);
    const bEl = document.getElementById('begrotingWaarde');
    bEl.textContent = `${bs.oor} (van ${bs.budget})`;
    bEl.className = 'waarde ' + (bs.oor > bs.budget * 0.3 ? 'goed' : bs.oor > 0 ? 'ok' : 'sleg');
    document.getElementById('gedaanteWaarde').textContent = symIdx;
  }

  function verversBord() {
    board.position(currentFEN(), false);
    clearHighlights();
  }

  function clearHighlights() {
    $('#board .square-55d63').removeClass('highlight-selected highlight-legal-move');
  }

  function getSquareFromElement(el) {
    const classes = el.className.split(' ');
    const sq = classes.find((c) => /^square-[a-h][1-8]$/.test(c));
    return sq ? sq.replace('square-', '') : null;
  }
  function algToSq(alg) { return sqOf(FILES.indexOf(alg[0]), parseInt(alg[1], 10) - 1); }

  function legalWhiteDestinationsFrom(fromSq) {
    const moves = Core.whiteMoves(huidigePos.wK, huidigePos.wB, huidigePos.wN, huidigePos.bK);
    return moves.filter((m) => {
      const from = m.piece === 'K' ? huidigePos.wK : m.piece === 'B' ? huidigePos.wB : huidigePos.wN;
      return from === fromSq;
    });
  }

  function onSquareClick(ev) {
    if (turn !== Core.TURN_WHITE || sportGeslaagOfMislukEnigste) return;
    const alg = getSquareFromElement(ev.currentTarget);
    if (!alg) return;
    const sq = algToSq(alg);

    if (selected === null) {
      if (sq === huidigePos.wK || sq === huidigePos.wB || sq === huidigePos.wN) {
        const dests = legalWhiteDestinationsFrom(sq);
        if (dests.length === 0) return;
        selected = sq;
        $(ev.currentTarget).addClass('highlight-selected');
        for (const m of dests) {
          $(`#board .square-${sqAlg(m.to)}`).addClass('highlight-legal-move');
        }
      }
      return;
    }
    if (sq === selected) { selected = null; clearHighlights(); return; }
    const dests = legalWhiteDestinationsFrom(selected);
    const chosen = dests.find((m) => m.to === sq);
    if (!chosen) {
      // moontlik 'n ander eie stuk kies i.p.v. 'n skuif
      selected = null; clearHighlights();
      if (sq === huidigePos.wK || sq === huidigePos.wB || sq === huidigePos.wN) onSquareClick(ev);
      return;
    }
    speelWitSkuif(chosen);
  }

  function speelWitSkuif(m) {
    const voorFen = currentFEN();
    const voorDTM = Orakel.dtm(voorFen);

    const nwK = m.piece === 'K' ? m.to : huidigePos.wK;
    const nwB = m.piece === 'B' ? m.to : huidigePos.wB;
    const nwN = m.piece === 'N' ? m.to : huidigePos.wN;
    huidigePos = { wK: nwK, wB: nwB, wN: nwN, bK: huidigePos.bK };
    turn = Core.TURN_BLACK;
    whiteMovesPlayed++;
    selected = null;
    verversBord();

    const naFen = currentFEN();
    const naDTM = Orakel.dtm(naFen);

    if (naDTM === 0) { eindigPoging(true, 'Skaakmat! Die sport is geklim.'); return; }
    if (Orakel.isConceptualFail(voorDTM, naDTM)) {
      eindigPoging(false, 'Konseptuele fout: ' + (naDTM === Orakel.REMISE ? 'die posisie is remise (pat of stukverlies).' : 'DTM het te veel gespring.'));
      return;
    }
    const bs = budgetStatus(huidigeSport.rung, whiteMovesPlayed);
    if (bs.misluk) { eindigPoging(false, `Begroting oorskry by skuif ${whiteMovesPlayed}.`); return; }

    posisieGeskiedenis.push(posTuple(huidigePos, turn));
    if (herhalingsToets()) { eindigPoging(false, 'Drievoudige herhaling.'); return; }

    verversStatus();
    setTimeout(speelSwartSkuif, 250);
  }

  function herhalingsToets() {
    const laaste = posisieGeskiedenis[posisieGeskiedenis.length - 1];
    let telling = 0;
    for (const p of posisieGeskiedenis) if (p === laaste) telling++;
    return telling >= 3;
  }

  function speelSwartSkuif() {
    if (sportGeslaagOfMislukEnigste) return;
    const fen = currentFEN();
    let beleid = 'optimaal';
    if (swindleTransformed && whiteMovesPlayed * 2 === swindleTransformed.atPly
        && huidigePos.bK === swindleTransformed.van
        && Math.random() < ZONE_SWINDLE_KANS[huidigeSport.zone]) {
      beleid = { tipe: 'slinks', skuif: sqAlg(swindleTransformed.na) };
    }
    let gekies;
    try {
      gekies = Orakel.defenderMove(fen, beleid, {});
    } catch (e) {
      gekies = Orakel.defenderMove(fen, 'optimaal', {});
    }
    if (!gekies) { eindigPoging(true, 'Skaakmat! Die sport is geklim.'); return; }

    huidigePos = { wK: huidigePos.wK, wB: huidigePos.wB, wN: huidigePos.wN, bK: algToSq(gekies.to) };
    turn = Core.TURN_WHITE;
    verversBord();
    posisieGeskiedenis.push(posTuple(huidigePos, turn));
    if (herhalingsToets()) { eindigPoging(false, 'Drievoudige herhaling.'); return; }
    verversStatus();
  }

  function eindigPoging(geslaag, boodskap) {
    sportGeslaagOfMislukEnigste = true;
    registreerPoging(state, huidigeSport.rung, geslaag);
    vorderRung(state, geslaag);
    stoorToestand(state);
    setBoodskap(boodskap + (geslaag ? ' Sport ' + (state.currentRung) + ' is nou oop.' : ' Terug na sport ' + state.currentRung + '.'), geslaag ? 'goed' : 'sleg');
  }

  function beginPoging() {
    const rungN = state.currentRung;
    const bank = POSITION_BANK.rungs.find((r) => r.rung === rungN);
    if (!bank) throw new Error(`geen posisiebank-inskrywing vir sport ${rungN} nie`);
    huidigeSport = bank;
    symIdx = Math.floor(Math.random() * 8);
    const canonical = parseFEN(bank.fen);
    huidigePos = transformPos(canonical, symIdx);
    turn = Core.TURN_WHITE;
    whiteMovesPlayed = 0;
    selected = null;
    sportGeslaagOfMislukEnigste = false;
    posisieGeskiedenis = [posTuple(huidigePos, turn)];

    swindleTransformed = null;
    if (bank.swindles && bank.swindles.length) {
      const sw = bank.swindles[0];
      const van = algToSq(sw.move.slice(0, 2));
      const na = algToSq(sw.move.slice(2, 4));
      swindleTransformed = {
        atPly: sw.atPly,
        van: symTransformSquare(van, symIdx),
        na: symTransformSquare(na, symIdx),
      };
    }

    setBoodskap('', '');
    verversBord();
    verversStatus();
  }

  function verifieerPosisiebankTeenOrakel() {
    const foute = [];
    for (const r of POSITION_BANK.rungs) {
      const v = Orakel.dtm(r.fen);
      const moves = v === Orakel.REMISE ? null : Math.ceil(v / 2);
      if (moves !== r.dtm_moves) {
        foute.push(`sport ${r.rung}: orakel gee ${v === Orakel.REMISE ? 'REMISE' : moves + ' skuiwe'}, verwag ${r.dtm_moves}`);
      }
    }
    return foute;
  }

  function initBord() {
    board = Chessboard('board', {
      draggable: false,
      position: 'start',
      pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    });
    $('#board').on('click', '.square-55d63', onSquareClick);
  }

  function init() {
    state = laaiToestand();
    initBord();
    setBoodskap('Orakel word gebou/gelaai...', '');

    Orakel.ready({ workerUrl: '../orakel/orakel-worker.js' }).then(() => {
      const foute = verifieerPosisiebankTeenOrakel();
      if (foute.length) {
        setBoodskap('FOUT: posisiebank stem nie ooreen met die orakel nie -- ' + foute.join('; '), 'sleg');
        document.getElementById('weerBeginKnop').disabled = true;
        return;
      }
      beginPoging();
      document.getElementById('weerBeginKnop').addEventListener('click', beginPoging);
    }).catch((err) => {
      setBoodskap('FOUT: orakel kon nie laai nie -- ' + (err && err.message ? err.message : err), 'sleg');
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  // Blootgestel vir toetsdoeleindes (Kaart 2-aanvaardingstoetse).
  window.Kruin = Kruin;
  Kruin.budgetStatus = budgetStatus;
  Kruin.budgetOf = budgetOf;
  Kruin.zoneOf = zoneOf;
  Kruin.parseFEN = parseFEN;
  Kruin.transformPos = transformPos;
  Kruin._state = () => state;
  Kruin._debug = () => ({ huidigeSport, huidigePos, symIdx, turn, whiteMovesPlayed, sportGeslaagOfMislukEnigste });
  Kruin._speelWitSkuif = speelWitSkuif;
  Kruin._legalWhiteDestinationsFrom = legalWhiteDestinationsFrom;
  Kruin._beginPoging = beginPoging;
  Kruin._verifieerPosisiebankTeenOrakel = verifieerPosisiebankTeenOrakel;
  // Slegs vir toetsdoeleindes: forseer 'n spesifieke posisie/toestand sonder
  // om 'n hele sport-inisialisering te herhaal.
  Kruin._forceerToets = function (opts) {
    huidigeSport = opts.huidigeSport || huidigeSport;
    huidigePos = opts.huidigePos || huidigePos;
    turn = opts.turn !== undefined ? opts.turn : turn;
    whiteMovesPlayed = opts.whiteMovesPlayed !== undefined ? opts.whiteMovesPlayed : whiteMovesPlayed;
    sportGeslaagOfMislukEnigste = false;
    posisieGeskiedenis = [posTuple(huidigePos, turn)];
    swindleTransformed = null;
    verversBord();
    verversStatus();
  };
})();
