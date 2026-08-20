// Sneeuluiperd se Kruin — Kaart 2/3/5: die spel-enjin, hokkleuring/wenke, en
// (Kaart 5) die berg/Kapok/Jorka/klank volledig geïntegreer.
(function () {
  'use strict';

  const Core = window.OrakelCore;
  const Orakel = window.Orakel;
  const BergEngine = window.BergEngine;
  const Jorka = window.Jorka;
  const Klank = window.Klank;
  const { file, rank, sqOf, symTransformSquare } = Core;

  const STATE_KEY = 'sneeuluiperd_v1';
  const N_RUNGS = 30;

  const ZONE_MERCY = { moeras: 2, woud: 4, rotse: 6, sneeu: 10 };
  const ZONE_SWINDLE_KANS = { moeras: 0, woud: 0.10, rotse: 0.25, sneeu: 0.40 };
  const MILESTONE_RUNGS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  // Kaart 3: sone-vertraagde vervaag-in (§2.7).
  const ZONE_FADE_MS = { moeras: 3000, woud: 5000, rotse: 10000, sneeu: 15000 };

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
    // Kaart 3-uitbreiding op die §6-vorm (agterwaarts-versoenbaar met
    // Kaart-2-toestand wat reeds in localStorage kan wees).
    if (!raw.consecFails) raw.consecFails = {};
    if (!raw.pendingCleanAscents) raw.pendingCleanAscents = {};
    if (!raw._zoneSkoonVanaf) raw._zoneSkoonVanaf = {}; // sien merkZoneSkoonToets()
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

  // Kaart 3: wenkstelsel-telling. Faal -> tel op; slaag -> herstel na 0 sodra
  // die sport werklik agtergelaat word (nie tydens 'n hangende skoon-styging nie).
  function hintAktiefVirPoging(state, rungN) {
    return (state.consecFails[String(rungN)] || 0) >= 2; // dit sou die 3de (of verdere) poging wees
  }
  function verwerkKonsekMislukkings(state, rungN, geslaag) {
    const key = String(rungN);
    if (geslaag) delete state.consecFails[key];
    else state.consecFails[key] = (state.consecFails[key] || 0) + 1;
  }

  function registreerWenkGebruik(state, rungN) {
    const key = String(rungN);
    state.hints[key] = (state.hints[key] || 0) + 1;
  }

  // Kaart 3-vervolg (2026-08-14, gebruiker-versoek): een-skoon-styging-reël
  // (§2.4, herroep vanaf oorspronklik twee). 'n Sport MET 'n wenk geslaag
  // pouseer die klim op DIESELFDE sport vir presies een verdere poging;
  // slaag daardie volgende poging sonder 'n wenk, gaan die klim voort. 'n
  // Mislukking tussenin herstel nie die reeds-opgeboude skoon-telling na nul
  // nie (bevestig deur die gebruiker, Kaart 3).
  function vorderRung(state, rungN, geslaag, wenkAktief) {
    if (!geslaag) {
      state.currentRung = Math.max(1, state.currentRung - 1);
      return;
    }
    const key = String(rungN);
    if (state.pendingCleanAscents[key] > 0) {
      if (wenkAktief) return; // wenk weer gebruik -- geen vordering in die skoon-telling nie
      state.pendingCleanAscents[key]--;
      if (state.pendingCleanAscents[key] > 0) return; // nog nie klaar nie
      delete state.pendingCleanAscents[key];
      // val deur na normale bevordering hieronder
    } else if (wenkAktief) {
      state.pendingCleanAscents[key] = 1;
      return; // bly op dieselfde sport totdat die reël bevredig is
    }
    state.currentRung = Math.min(N_RUNGS, state.currentRung + 1);
    if (MILESTONE_RUNGS.includes(state.currentRung) && !state.residents.includes(state.currentRung)) {
      state.residents.push(state.currentRung);
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

  // Kaart 3: hokkleuring/vervaag-in, spoorafdruk, wenk, W-oorlegsel.
  let fadeTimerHandle = null, fadeArrived = false;
  let knightPath = [];               // getransformeerde ruiter-vierkante hierdie poging
  let hintSquareThisAttempt = null;  // { van, na } (getransformeerde blokke), of null
  let hintActiveThisAttempt = false; // was consecFails>=2 toe hierdie poging begin het
  let alleSkuiweWasSpoorafdrukke = true; // vir sone-skoon-styging-opsporing

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

  // Kaart 5: Oom Jorka se stem (§5.1).
  function setJorkaTeks(tekst) {
    document.getElementById('jorkaTeks').textContent = tekst;
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

  // === Kaart 3: hokkleuring + sone-vertraagde vervaag-in (§2.7) ===
  function clearCageOverlay() { $('#board .square-55d63').removeClass('hokkleur'); }

  function showCageOverlay() {
    const cage = Orakel.cageSquares(currentFEN());
    for (const alg of cage) $(`#board .square-${alg}`).addClass('hokkleur');
    fadeArrived = true;
    // Presies-getydde hoak vir Kaart 5 (Kapok blaf een keer wanneer die kleure aankom).
    document.dispatchEvent(new CustomEvent('kruin:kleure-aangekom', {
      detail: { rung: huidigeSport.rung, zone: huidigeSport.zone, whiteMovesPlayed },
    }));
  }

  function stopFadeTimer() {
    if (fadeTimerHandle !== null) { clearTimeout(fadeTimerHandle); fadeTimerHandle = null; }
  }

  // Begin (of herbegin) die vervaag-in-wagperiode. Word geroep elke keer
  // wanneer dit weer die speler (wit) se beurt word.
  function startFadeTimer() {
    stopFadeTimer();
    clearCageOverlay();
    fadeArrived = false;
    if (turn !== Core.TURN_WHITE || sportGeslaagOfMislukEnigste) return;
    const ms = ZONE_FADE_MS[huidigeSport.zone];
    fadeTimerHandle = setTimeout(() => { fadeTimerHandle = null; showCageOverlay(); }, ms);
  }

  // === Kaart 3: wenkstelsel (§2.4) ===
  function clearHintGlow() { $('#board .square-55d63').removeClass('wenk-gloei'); }

  function toonWenkGloeiIndienNodig() {
    clearHintGlow();
    if (!hintActiveThisAttempt || hintSquareThisAttempt === null) return;
    if (turn !== Core.TURN_WHITE || sportGeslaagOfMislukEnigste) return;
    // Albei blokke gloei: die vertrekblok (watter stuk moet trek -- dikwels
    // dubbelsinnig, aangesien meer as een stuk soms na dieselfde bestemming
    // kan trek) EN die bestemmingsblok.
    $(`#board .square-${sqAlg(hintSquareThisAttempt.van)}`).addClass('wenk-gloei');
    $(`#board .square-${sqAlg(hintSquareThisAttempt.na)}`).addClass('wenk-gloei');
    document.dispatchEvent(new CustomEvent('kruin:wenk-verskyn', {
      detail: {
        rung: huidigeSport.rung,
        van: sqAlg(hintSquareThisAttempt.van),
        na: sqAlg(hintSquareThisAttempt.na),
      },
    }));
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
    // Kaart 3: spoorafdruk verdien net vir skuiwe VOOR die kleure aankom (§2.7).
    const spoorafdrukVerdien = !fadeArrived;
    stopFadeTimer();
    clearCageOverlay();
    clearHintGlow();

    const nwK = m.piece === 'K' ? m.to : huidigePos.wK;
    const nwB = m.piece === 'B' ? m.to : huidigePos.wB;
    const nwN = m.piece === 'N' ? m.to : huidigePos.wN;
    huidigePos = { wK: nwK, wB: nwB, wN: nwN, bK: huidigePos.bK };
    turn = Core.TURN_BLACK;
    whiteMovesPlayed++;
    selected = null;
    verversBord();

    if (m.piece === 'N') knightPath.push(nwN);

    const naFen = currentFEN();
    const naDTM = Orakel.dtm(naFen);

    if (spoorafdrukVerdien) {
      state.pawPrints[huidigeSport.zone] = (state.pawPrints[huidigeSport.zone] || 0) + 1;
    } else {
      alleSkuiweWasSpoorafdrukke = false;
    }

    if (naDTM === 0) { verwerkUitkomste(true, 'slaag'); return; }
    if (Orakel.isConceptualFail(voorDTM, naDTM)) {
      verwerkUitkomste(false, naDTM === Orakel.REMISE ? 'konseptueleFout.remise' : 'konseptueleFout.dtmSprong');
      return;
    }
    const bs = budgetStatus(huidigeSport.rung, whiteMovesPlayed);
    if (bs.misluk) { verwerkUitkomste(false, 'misluk'); return; }

    // §2.3: tempo-verlies (DTM-styging 1-7) word net gemerk, nie gehek nie.
    if (typeof naDTM === 'number' && naDTM > voorDTM) setJorkaTeks(Jorka.kies('omweggie'));

    posisieGeskiedenis.push(posTuple(huidigePos, turn));
    if (herhalingsToets()) { verwerkUitkomste(false, 'konseptueleFout.herhaling'); return; }

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
    if (!gekies) { verwerkUitkomste(true, 'slaag'); return; }

    huidigePos = { wK: huidigePos.wK, wB: huidigePos.wB, wN: huidigePos.wN, bK: algToSq(gekies.to) };
    turn = Core.TURN_WHITE;
    verversBord();
    posisieGeskiedenis.push(posTuple(huidigePos, turn));
    if (herhalingsToets()) { verwerkUitkomste(false, 'konseptueleFout.herhaling'); return; }
    verversStatus();
    startFadeTimer();
    toonWenkGloeiIndienNodig();
  }

  function jorkaKiesVirKategorie(kategoriePad) {
    return Jorka.kies(...kategoriePad.split('.'));
  }

  // Kaart 5: routeer die uitkoms deur (a) Kapok se onmiddellike reaksie,
  // (b) Kaart 3 se verpligte W-oorlegsel+kontrolevraag (net Rotse, ná 'n
  // slaag), (c) sport-toestand-afhandeling, (d) die kamera (klim/daal) en
  // enige nuwe bewoner-onthulling.
  function verwerkUitkomste(geslaag, kategoriePad) {
    stopFadeTimer(); clearCageOverlay(); clearHintGlow();
    // Kaart 7-vervolg (2026-08-20, herroep): die rivier-agtergrondlus stop nou
    // op ENIGE uitkoms (sukses óf mislukking) -- oorspronklik het dit op 'n
    // mislukking bly speel, maar die gebruiker het opgemerk dit "volg jou 'n
    // paar sporte af" op dié manier. Dit begin skoon van voor af weer in
    // beginPoging() (ná die afgaan-blaf, sodra die nuwe/laer sport begin).
    // Die gesintetiseerde mat-klokkie is verwyder (2026-08-20) -- elke
    // suksespad speel klaar 'n regte opname (blaf of vlak-klaar-fanfare).
    Klank.stopRivierAmbient();
    if (geslaag) BergEngine.kapokTolVanVreugde();
    else BergEngine.kapokOreVlat();

    const gaanVoort = () => voltooiUitkomste(geslaag, kategoriePad);
    if (geslaag && huidigeSport.zone === 'rotse') {
      toonWOorlegselEnVraag(gaanVoort, true);
    } else {
      gaanVoort();
    }
  }

  function voltooiUitkomste(geslaag, kategoriePad) {
    const vanRung = huidigeSport.rung;
    // Kaart 7-vervolg: vasgevang VOOR finaliseerPoging (wat vorderRung roep,
    // wat state.pendingCleanAscents muteer) -- was hierdie sport reeds op
    // "wag vir 'n skoon herhaling ná 'n wenk" toe hierdie poging begin het?
    const wasPendingCleanAscent = (state.pendingCleanAscents[String(vanRung)] || 0) > 0;
    const residenteVoor = state.residents.length;
    const boodskap = jorkaKiesVirKategorie(kategoriePad);
    finaliseerPoging(geslaag, boodskap);
    const naRung = state.currentRung;

    let kameraP = Promise.resolve();
    if (naRung !== vanRung) {
      if (geslaag) {
        // Kaart 7-vervolg: die kwalifiserende skoon herhaling ná 'n wenk (die
        // rede vir die klim ditkeer) kry die tweede "vlak-klaar"-fanfare
        // i.p.v. Kapok se blaf (gebruiker-versoek: "dan speel ons nie Kapok
        // se blaf nie, maar die trompet-fanfare"). Andersins die gewone
        // opgaan-blaf, of 'n eie blaf as die klim 'n nuwe sone binnegaan.
        if (wasPendingCleanAscent && !hintActiveThisAttempt) {
          Klank.speelVlakKlaarTwee();
        } else {
          const naZone = (POSITION_BANK.rungs.find((r) => r.rung === naRung) || {}).zone;
          if (naZone && naZone !== huidigeSport.zone) Klank.speelNuweBioomBlaf();
          else Klank.speelOpgaanBlaf();
        }
      } else {
        Klank.speelAfgaanBlaf();
      }
      kameraP = geslaag ? BergEngine.klim(vanRung, naRung) : BergEngine.daal(vanRung, naRung);
    } else if (geslaag && hintActiveThisAttempt) {
      // Kaart 7-vervolg: 'n wenk-geslaagde poging vorder nie die sport nie
      // (vorderRung hou dit op dieselfde sport totdat 'n skoon herhaling
      // volg) -- geen klim-animasie, geen Kapok-blaf, net die eerste
      // "vlak-klaar"-fanfare om die (voorwaardelike) sukses te merk.
      Klank.speelVlakKlaarEen();
    } else if (geslaag) {
      // Kaart 7-vervolg (2026-08-20): oorblywende leemte -- geslaag, geen
      // klim (aan die plafon: sport 30, geen hoër sport om na te klim nie)
      // EN geen wenk betrokke nie, dus sou geen ander klank gespeel het
      // nie. Bring die (gesintetiseerde) mat-klokkie terug net vir hierdie
      // geval, op die gebruiker se versoek.
      Klank.speelMatKlok();
    }
    kameraP.then(() => {
      if (state.residents.length > residenteVoor) {
        const nuwe = state.residents[state.residents.length - 1];
        return BergEngine.bewonerOnthulling(nuwe).then(() => {
          setJorkaTeks(nuwe === 30 ? Jorka.kies('sneeuluiperd') : Jorka.kies('bewonerOnthulling'));
        });
      }
    }).then(() => {
      beginPoging();
    });

    // Kapok se kunsies (§5.4): speel lukraak een ontslote kunsie by matte.
    if (geslaag && state.kapokTricks.length) {
      const kunsie = state.kapokTricks[Math.floor(Math.random() * state.kapokTricks.length)];
      setTimeout(() => BergEngine.kapokKunsie(kunsie), 200);
    }
  }

  const EERSTE_SPORT_VAN_SONE = { moeras: 1, woud: 7, rotse: 15, sneeu: 23 };
  const LAASTE_SPORT_VAN_SONE = { moeras: 6, woud: 14, rotse: 22, sneeu: 30 };
  // Kaart 5 (§5.4): kunsie wat 'n skoon-sone-styging ontsluit.
  const ZONE_KUNSIE = { moeras: 'modder-skud', woud: 'stok-gaan-haal', rotse: 'klip-tot-klip-spring', sneeu: 'sneeu-engel' };

  // Kaart 7-vervolg (2026-08-20): sone-geur-eenmaligklanke op gekose sporte
  // (gebruiker-versoek: "kies self watter" -- hierdie is 'n eenvoudige,
  // maklik-verstelbare tabel, nie 'n vaste reël nie). Bergkraai (21) en die
  // Sneeuluiperd se sport-30-onthulling is doelbewus uitgesluit sodat 'n
  // lang omgewingsklank nie 'n bewoner-onthullingseremonie (~10s kamera-
  // pan) of, ergste geval, die finale sport-30-openbaring oorlaai nie.
  // Elke ander gekose sport is 'n nie-mylpaal-sport binne sy sone.
  // Kaart 7-vervolg (2026-08-21, gebruiker-versoek): die moeras-inskrywings
  // is van {2,5} na {4,5} geskuif -- die rivier-agtergrondlus (sien
  // RIVIER_LAASTE_SPORT hieronder) is nou net op sporte 1-3, dus kry die
  // "gewone" moeras-geurklank die orige helfte van die sone (4-6, met 6
  // uitgesluit aangesien dit 'n bewoner-mylpaal is -- Aksolotl).
  const RUNG_SONE_KLANK = {
    4: 'speelMoerasKlank', 5: 'speelMoerasKlank',
    7: 'speelWoudKlank', 10: 'speelWoudKlank', 13: 'speelWoudKlank',
    15: 'speelRotseKlank', 17: 'speelRotseKlank', 20: 'speelRotseKlank',
    23: 'speelSneeuEenKlank', 26: 'speelSneeuTweeKlank', 29: 'speelSneeuDrieKlank',
  };
  // Kaart 7-vervolg (2026-08-21, gebruiker-versoek): "die moeras-rivier
  // speel oral" -- reggestel. Die rivier-agtergrondlus is nou net op die
  // eerste drie moeras-sporte; elders (die orige moeras + elke ander sone)
  // speel dit glad nie. `stopRivierAmbient()` in verwerkUitkomste() bly
  // onvoorwaardelik (op enige uitkoms) -- 'n stil geen-effek as dit nie
  // eers gespeel het nie.
  const RIVIER_LAASTE_SPORT = 3;

  function finaliseerPoging(geslaag, boodskap) {
    sportGeslaagOfMislukEnigste = true;
    registreerPoging(state, huidigeSport.rung, geslaag);
    verwerkKonsekMislukkings(state, huidigeSport.rung, geslaag);
    if (geslaag && hintActiveThisAttempt) registreerWenkGebruik(state, huidigeSport.rung);
    merkZoneSkoonToets(state, huidigeSport, geslaag);
    vorderRung(state, huidigeSport.rung, geslaag, hintActiveThisAttempt);
    stoorToestand(state);
    setJorkaTeks(boodskap);
    setBoodskap(geslaag ? 'Sport ' + (state.currentRung) + ' is nou oop.' : 'Terug na sport ' + state.currentRung + '.', geslaag ? 'goed' : 'sleg');
    document.getElementById('wysWKnop').style.display = geslaag && huidigeSport.zone !== 'rotse' ? 'inline-block' : 'none';
  }

  // Kaart 3: 'n skoon sone-styging (§5.4/§6 cleanZoneAscents) beteken elke
  // slaag-skuif in ELKE sport van daardie sone, van die sone se eerste sport
  // af, was 'n spoorafdruk-skuif (voor die kleure aangekom het), sonder wenke.
  // 'n lopende "nog-skoon"-vlag per sone word by die sone se eerste sport
  // herstel (sien beginPoging), deur enige mislukking/wenk/nie-spoorafdruk-
  // slaag gebreek, en eers by die sone se laaste sport bevestig.
  function merkZoneSkoonToets(state, sportInskrywing, geslaag) {
    const zone = sportInskrywing.zone;
    const skoonHierdiePoging = geslaag && alleSkuiweWasSpoorafdrukke && !hintActiveThisAttempt && whiteMovesPlayed > 0;
    if (!skoonHierdiePoging) state._zoneSkoonVanaf[zone] = false;
    if (geslaag && sportInskrywing.rung === LAASTE_SPORT_VAN_SONE[zone] && state._zoneSkoonVanaf[zone] !== false) {
      if (!state.cleanZoneAscents.includes(zone)) state.cleanZoneAscents.push(zone);
      const kunsie = ZONE_KUNSIE[zone];
      if (kunsie && !state.kapokTricks.includes(kunsie)) state.kapokTricks.push(kunsie);
    }
  }

  function beginPoging() {
    const rungN = state.currentRung;
    const bank = POSITION_BANK.rungs.find((r) => r.rung === rungN);
    if (!bank) throw new Error(`geen posisiebank-inskrywing vir sport ${rungN} nie`);
    huidigeSport = bank;

    // Kaart 7-vervolg: "speel terwyl die speler speel" -- begin (of hou aan
    // speel, sien Klank.speelRivierAmbient() se eie "reeds-speel"-wagter) die
    // rivier-agtergrondlus, maar net op die eerste drie moeras-sporte (sien
    // RIVIER_LAASTE_SPORT). Word op enige uitkoms gestop (verwerkUitkomste).
    if (rungN <= RIVIER_LAASTE_SPORT) Klank.speelRivierAmbient();
    if (RUNG_SONE_KLANK[rungN]) Klank[RUNG_SONE_KLANK[rungN]]();
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

    // Kaart 3: sone-skoon-vlag herstel by die sone se eerste sport.
    if (rungN === EERSTE_SPORT_VAN_SONE[bank.zone]) state._zoneSkoonVanaf[bank.zone] = true;
    knightPath = [huidigePos.wN];
    alleSkuiweWasSpoorafdrukke = true;
    hintActiveThisAttempt = hintAktiefVirPoging(state, rungN);
    hintSquareThisAttempt = hintActiveThisAttempt ? berekenWenkVierkant(bank, symIdx) : null;

    document.getElementById('wysWKnop').style.display = 'none';
    document.getElementById('wOorlegsel').style.display = 'none';
    setBoodskap('', '');
    // Kaart 5: welkom-per-sone net wanneer die sone se eerste sport betree word.
    if (rungN === EERSTE_SPORT_VAN_SONE[bank.zone]) setJorkaTeks(Jorka.kies('welkom', bank.zone));
    verversBord();
    verversStatus();
    startFadeTimer();
    toonWenkGloeiIndienNodig();
  }

  // Kaart 3: hint_square_logic="oracle" (§3.3) -- die orakel-optimale eerste
  // skuif uit die sport se WORTEL-posisie. Vir al 30 sporte word hierdie
  // verstek gebruik (geen handoorheersings nog nie). Gee beide die vertrek-
  // (watter stuk moet trek) en bestemmingsblok terug -- meer as een stuk kan
  // dikwels na dieselfde blok trek, so die bestemming alleen is dikwels
  // dubbelsinnig oor WATTER stuk moet trek.
  function berekenWenkVierkant(bank, symIdx0) {
    const canonical = parseFEN(bank.fen);
    const pos0 = transformPos(canonical, symIdx0);
    const voorDTM = Orakel.dtm(orakelFen(pos0, Core.TURN_WHITE));
    for (const m of Core.whiteMoves(pos0.wK, pos0.wB, pos0.wN, pos0.bK)) {
      const nwK = m.piece === 'K' ? m.to : pos0.wK;
      const nwB = m.piece === 'B' ? m.to : pos0.wB;
      const nwN = m.piece === 'N' ? m.to : pos0.wN;
      const succFen = orakelFen({ wK: nwK, wB: nwB, wN: nwN, bK: pos0.bK }, Core.TURN_BLACK);
      if (Orakel.dtm(succFen) === voorDTM - 1) {
        const van = m.piece === 'K' ? pos0.wK : m.piece === 'B' ? pos0.wB : pos0.wN;
        return { van, na: m.to };
      }
    }
    return null;
  }

  // === Kaart 3: W-oorlegsel + kontrolevraag (§2.8) ===
  // Let wel: §1.4 verwys na §4.4 vir hoe die ruiter se W-pad geleer word, maar
  // §4 in die spesifikasie gaan net tot §4.2 -- §4.3/§4.4 bestaan nie. Hierdie
  // is dus 'n redelike eie ontwerp (soos met die gebruiker bespreek): die
  // "ideale W" word direk uit die orakel afgelei (die ruiter se vierkante
  // langs 'n volledig optimale hoof-lyn vanaf die sport se WORTEL-posisie),
  // eerder as 'n aparte, hardgekodeerde meetkundige patroon.
  function berekenIdealePad(bankFen, symIdx0) {
    const canonical = parseFEN(bankFen);
    let pos = transformPos(canonical, symIdx0);
    let t = Core.TURN_WHITE;
    const pad = [pos.wN];
    for (let stap = 0; stap < 80; stap++) { // ruim bo die 66-ply globale maks (Kaart 1)
      const d = Orakel.dtm(orakelFen(pos, t));
      if (d === 0 || d === Orakel.REMISE) break;
      if (t === Core.TURN_WHITE) {
        let beste = null;
        for (const m of Core.whiteMoves(pos.wK, pos.wB, pos.wN, pos.bK)) {
          const nwK = m.piece === 'K' ? m.to : pos.wK;
          const nwB = m.piece === 'B' ? m.to : pos.wB;
          const nwN = m.piece === 'N' ? m.to : pos.wN;
          const succFen = orakelFen({ wK: nwK, wB: nwB, wN: nwN, bK: pos.bK }, Core.TURN_BLACK);
          if (Orakel.dtm(succFen) === d - 1) { beste = { nwK, nwB, nwN, piece: m.piece }; break; }
        }
        if (!beste) break;
        pos = { wK: beste.nwK, wB: beste.nwB, wN: beste.nwN, bK: pos.bK };
        if (beste.piece === 'N') pad.push(pos.wN);
        t = Core.TURN_BLACK;
      } else {
        const gekies = Orakel.defenderMove(orakelFen(pos, t), 'optimaal', {});
        if (!gekies) break;
        pos = { wK: pos.wK, wB: pos.wB, wN: pos.wN, bK: algToSq(gekies.to) };
        t = Core.TURN_WHITE;
      }
    }
    return pad;
  }

  function toonWOorlegselEnVraag(voltooiCallback, verpligtend) {
    const idealePad = berekenIdealePad(huidigeSport.fen, symIdx);
    const werkliktePad = knightPath;
    const paaieVerskil = JSON.stringify(werkliktePad) !== JSON.stringify(idealePad);

    const container = document.getElementById('wOorlegsel');
    container.style.display = 'block';
    container.innerHTML = '';

    const werklikEl = document.createElement('div');
    werklikEl.className = 'pad-reël';
    werklikEl.textContent = 'Werklike pad hierdie poging: N ' + werkliktePad.map(sqAlg).join(' -> ');
    container.appendChild(werklikEl);

    const idealeEl = document.createElement('div');
    idealeEl.className = 'pad-reël';
    idealeEl.textContent = 'Ideale W-patroon (orakel-optimaal): N ' + idealePad.map(sqAlg).join(' -> ');
    container.appendChild(idealeEl);

    if (paaieVerskil) {
      const noot = document.createElement('div');
      noot.className = 'pad-reël';
      noot.textContent = '(die werklike pad het van die ideale W afgewyk -- steeds geldig, net nie die vinnigste roete nie)';
      container.appendChild(noot);
    }

    // Kontrolevraag: watter gaatjie het die EERSTE ruiterskuif in die ideale
    // pad toegemaak? (net sinvol as die ruiter regtig geskuif het)
    if (idealePad.length > 1) {
      const korrek = idealePad[1];
      const kandidate = Core.KNIGHT_FLAT
        .slice(idealePad[0] * 8, idealePad[0] * 8 + Core.KNIGHT_CNT[idealePad[0]])
        .filter((sq) => sq !== korrek);
      const afleiers = kandidate.slice(0, 2);
      const opsies = [korrek, ...afleiers].sort(() => Math.random() - 0.5);

      const vraagEl = document.createElement('div');
      vraagEl.className = 'kontrolevraag';
      vraagEl.textContent = 'Watter gaatjie het daardie skuif toegemaak?';
      container.appendChild(vraagEl);

      const opsiesEl = document.createElement('div');
      for (const opt of opsies) {
        const knop = document.createElement('button');
        knop.className = 'opsie-knoppie';
        knop.textContent = sqAlg(opt);
        knop.addEventListener('click', () => {
          $(opsiesEl).find('button').prop('disabled', true);
          knop.classList.add(opt === korrek ? 'korrek' : 'verkeerd');
          setJorkaTeks(Jorka.kies('kontrolevraagTerugvoer', opt === korrek ? 'korrek' : 'verkeerd'));
          if (opt !== korrek) {
            const verduideliking = document.createElement('div');
            verduideliking.className = 'pad-reël';
            verduideliking.textContent = `(${sqAlg(korrek)} was die blok wat toegemaak is)`;
            container.appendChild(verduideliking);
          }
        });
        opsiesEl.appendChild(knop);
      }
      container.appendChild(opsiesEl);
    }

    const gaanVoortKnop = document.createElement('button');
    gaanVoortKnop.textContent = 'Gaan voort';
    gaanVoortKnop.addEventListener('click', () => {
      container.style.display = 'none';
      if (verpligtend) voltooiCallback();
    });
    container.appendChild(gaanVoortKnop);

    if (!verpligtend) return; // "Wys my die W" is op-aanvraag; geen outo-voltooiing nie
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
    setBoodskap('', '');

    // Kaart 5 (§5.1 hoak): Kapok blaf een keer wanneer die hokkleure aankom;
    // die wenk-verskyn-gebeurtenis kry Oom Jorka se wenk-aanbieding-teks.
    document.addEventListener('kruin:kleure-aangekom', () => {
      BergEngine.kapokBlaf();
      Klank.speelWenkBlaf();
    });
    document.addEventListener('kruin:wenk-verskyn', () => {
      setJorkaTeks(Jorka.kies('wenkAanbieding'));
    });

    const stilKnop = document.getElementById('stilKnop');
    stilKnop.checked = Klank.isStil();
    stilKnop.addEventListener('change', () => Klank.stelStil(stilKnop.checked));

    // Kaart 7-vervolg: BergEngine.init() is nou async (dit haal eers
    // berg/kuns-bates.svg -- Kapok/Yorka/Sneeuluiperd/bewoner-kuns -- voordat
    // dit merkers/bewoners/Kapok bou). Alles wat op merkerPos/bewoner-
    // elemente staatmaak (openingsAfkoms ingesluit) wag dus hierop.
    BergEngine.init(document.getElementById('bergSvg'), { beginRung: state.currentRung }).then(() => {
      // §5.2: die Web Worker bereken die orakel TERWYL die openingsafkoms speel.
      // As die orakel eerste klaar is, verander niks nie; as nie, "vang die
      // klimmer sy asem" by die landing totdat dit gereed is.
      Klank.speelAfkomsKlank();
      const afkomsP = BergEngine.openingsAfkoms(state.currentRung, state.residents);
      const orakelP = Orakel.ready({ workerUrl: '../orakel/orakel-worker.js' });
      let orakelGereed = false;
      orakelP.then(() => { orakelGereed = true; });
      afkomsP.then(() => {
        if (!orakelGereed) setBoodskap('Kapok vang sy asem...', '');
      });

      Promise.all([afkomsP, orakelP]).then(() => {
        setBoodskap('', '');
        const foute = verifieerPosisiebankTeenOrakel();
        if (foute.length) {
          setBoodskap('FOUT: posisiebank stem nie ooreen met die orakel nie -- ' + foute.join('; '), 'sleg');
          document.getElementById('weerBeginKnop').disabled = true;
          return;
        }
        beginPoging();
        document.getElementById('weerBeginKnop').addEventListener('click', beginPoging);
        document.getElementById('wysWKnop').addEventListener('click', () => {
          toonWOorlegselEnVraag(null, false);
        });
      }).catch((err) => {
        setBoodskap('FOUT: orakel kon nie laai nie -- ' + (err && err.message ? err.message : err), 'sleg');
      });
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
    knightPath = [huidigePos.wN];
    alleSkuiweWasSpoorafdrukke = true;
    hintActiveThisAttempt = opts.hintActiveThisAttempt || false;
    hintSquareThisAttempt = opts.hintSquareThisAttempt !== undefined ? opts.hintSquareThisAttempt : null;
    verversBord();
    verversStatus();
    startFadeTimer();
    toonWenkGloeiIndienNodig();
  };

  // Kaart 3-toetshake.
  Kruin.ZONE_FADE_MS = ZONE_FADE_MS;
  Kruin._kaart3Debug = () => ({
    fadeArrived, knightPath: knightPath.slice(),
    hintActiveThisAttempt, hintSquareThisAttempt,
    alleSkuiweWasSpoorafdrukke,
  });
  Kruin._forseerKleureAangekom = showCageOverlay; // vir vinnige toetse sonder om regte sekondes te wag
  Kruin._verwerkUitkomste = verwerkUitkomste;
  Kruin._berekenIdealePad = berekenIdealePad;
  Kruin._berekenWenkVierkant = berekenWenkVierkant;

  // Kaart 5-toetshake.
  Kruin._init = init;
  Kruin._setJorkaTeks = setJorkaTeks;
  Kruin._jorkaTeksHuidig = () => document.getElementById('jorkaTeks').textContent;

  // Kaart 6-toetshaak: §6-toestandmigrasie (DOM-vry, toets laaiToestand direk).
  Kruin._laaiToestand = laaiToestand;
  Kruin._STATE_KEY = STATE_KEY;
})();
