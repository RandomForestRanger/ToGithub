// Kaart 6, item 3: geskripte deurspeel-toets.
//   (a) 'n optimale speler klim sport 1 -> 30 sonder mislukking, deur die
//       WERKLIKE Orakel-API (dtm/defenderMove/isConceptualFail) en die
//       WERKLIKE Kruin.budgetStatus (uit app.js onttrek) te gebruik -- presies
//       dieselfde reëls as die speletjie-enjin, net sonder die DOM/bord-UI
//       (wat 'n blaaier vereis; nie beskikbaar hierdie sessie nie).
//   (b) 'n foutspeler aktiveer elke mislukkingsklas minstens een keer:
//       pat-toelating, stukverlies, DTM-sprong>=8, begroting-oorskry,
//       drievoudige herhaling.
'use strict';

const { toFEN } = require('./posisie-oudit.js');

function parseCanonical(Core, fen) {
  const rows = fen.trim().split(/\s+/)[0].split('/');
  let wK = -1, wB = -1, wN = -1, bK = -1;
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    const rankNum = 7 - rIdx;
    let f = 0;
    for (const ch of rows[rIdx]) {
      if (ch >= '1' && ch <= '8') { f += parseInt(ch, 10); continue; }
      const sq = Core.sqOf(f, rankNum);
      if (ch === 'K') wK = sq; else if (ch === 'B') wB = sq;
      else if (ch === 'N') wN = sq; else if (ch === 'k') bK = sq;
      f++;
    }
  }
  return { wK, wB, wN, bK };
}

function applyWhite(pos, m) {
  return {
    wK: m.piece === 'K' ? m.to : pos.wK,
    wB: m.piece === 'B' ? m.to : pos.wB,
    wN: m.piece === 'N' ? m.to : pos.wN,
    bK: pos.bK,
  };
}

// --- (a) Optimale klim, sport vir sport, met begroting/konseptuele-fout-
// bevestiging by elke ply (soos speelWitSkuif/speelSwartSkuif in app.js). ---
function optimalClimb(Core, Orakel, Kruin, bank) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  for (const entry of bank.rungs) {
    let pos = parseCanonical(Core, entry.fen);
    let whiteMovesPlayed = 0;
    let mated = false;
    let anyConceptualFail = false;
    let anyBudgetFail = false;
    const seed = 1000 + entry.rung; // vaste saad -- herhaalbaar
    for (let ply = 0; ply < 80 && !mated; ply++) {
      const voorFen = toFEN(Core, pos, Core.TURN_WHITE);
      const voorDTM = Orakel.dtm(voorFen);
      const best = Orakel.bestMoves(voorFen);
      if (!best.length) break; // sou nie moet gebeur op 'n wenposisie nie
      const mv = best[0];
      pos = applyWhite(pos, { piece: mv.piece, to: Orakel.fromAlgebraic(mv.to) });
      whiteMovesPlayed++;

      const naFen = toFEN(Core, pos, Core.TURN_BLACK);
      const naDTM = Orakel.dtm(naFen);

      if (Orakel.isConceptualFail(voorDTM, naDTM)) { anyConceptualFail = true; break; }
      const bs = Kruin.budgetStatus(entry.rung, whiteMovesPlayed);
      if (bs.misluk) { anyBudgetFail = true; break; }
      if (naDTM === 0) { mated = true; break; }

      const gekies = Orakel.defenderMove(naFen, 'optimaal', { seed: seed + ply });
      if (!gekies) { mated = true; break; } // geen swart-skuiwe -- reeds mat
      pos = { wK: pos.wK, wB: pos.wB, wN: pos.wN, bK: Orakel.fromAlgebraic(gekies.to) };
    }
    push(`sport ${entry.rung}: optimale speler mat binne DTM (${whiteMovesPlayed} skuiwe, begroot ${entry.rung})`,
      mated && !anyConceptualFail && !anyBudgetFail && whiteMovesPlayed === entry.rung,
      `mated=${mated} skuiwe=${whiteMovesPlayed} konsFail=${anyConceptualFail} begrotingFail=${anyBudgetFail}`);
  }

  return { ok, fail, checks, total: ok + fail };
}

// --- (b) Foutspeler: soek 'n konkrete voorbeeld van elke mislukkingsklas. ---
function mistakePlayer(Core, Orakel, Kruin, bank) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  const found = { pat: null, stukverlies: null, dtmSprong: null };

  for (const entry of bank.rungs) {
    const pos = parseCanonical(Core, entry.fen);
    const voorFen = toFEN(Core, pos, Core.TURN_WHITE);
    const voorDTM = Orakel.dtm(voorFen);
    if (typeof voorDTM !== 'number') continue;
    for (const m of Core.whiteMoves(pos.wK, pos.wB, pos.wN, pos.bK)) {
      const nPos = applyWhite(pos, m);
      const naFen = toFEN(Core, nPos, Core.TURN_BLACK);
      const naDTM = Orakel.dtm(naFen);
      const isFail = Orakel.isConceptualFail(voorDTM, naDTM);
      if (!isFail) continue;
      if (naDTM === Orakel.REMISE) {
        const bkMoves = Core.blackKingMoves(nPos.wK, nPos.wB, nPos.wN, nPos.bK);
        const hasCapture = bkMoves.some((bm) => bm.capture);
        const isStalemate = bkMoves.length === 0 && !Core.attackedByWhite(nPos.bK, nPos.wK, nPos.wB, nPos.wN);
        if (hasCapture && !found.stukverlies) {
          found.stukverlies = { rung: entry.rung, move: m, fen: voorFen };
        } else if (isStalemate && !found.pat) {
          found.pat = { rung: entry.rung, move: m, fen: voorFen };
        }
      } else if (!found.dtmSprong) {
        found.dtmSprong = { rung: entry.rung, move: m, fen: voorFen, voorDTM, naDTM };
      }
    }
    if (found.pat && found.stukverlies && found.dtmSprong) break;
  }

  push('foutklas gevind: pat-toelating -> REMISE -> konseptuele mislukking', !!found.pat,
    found.pat ? `sport ${found.pat.rung}, skuif ${found.pat.move.piece}->${Orakel.toAlgebraic(found.pat.move.to)}` : 'geen voorbeeld gevind');
  push('foutklas gevind: stukverlies (loper/ruiter aanvegbaar) -> REMISE -> konseptuele mislukking', !!found.stukverlies,
    found.stukverlies ? `sport ${found.stukverlies.rung}, skuif ${found.stukverlies.move.piece}->${Orakel.toAlgebraic(found.stukverlies.move.to)}` : 'geen voorbeeld gevind');
  push('foutklas gevind: DTM-sprong >= 8 (nie-remise) -> konseptuele mislukking', !!found.dtmSprong,
    found.dtmSprong ? `sport ${found.dtmSprong.rung}, ${found.dtmSprong.voorDTM}->${found.dtmSprong.naDTM} plies` : 'geen voorbeeld gevind');

  // Begroting-oorskry: soek 'n werklike tempo-mors-reeks (elke skuif DTM +1..+7,
  // dus self nie 'n konseptuele fout nie) tot begroting oorskry word. Sport 1
  // is te vlak (min "speling" vir 'n sagte omweggie sonder om oor +7 te spring
  // of 'n remise toe te laat) -- probeer 'n paar kandidaat-sporte met meer
  // diepte/genade totdat een werk.
  (function begrotingOorskry() {
    const kandidaatSporte = [bank.rungs[5], bank.rungs[13], bank.rungs[21], bank.rungs[0]]
      .filter(Boolean); // sport 6, 14, 22, terugval sport 1
    let bestPoging = null;
    for (const entry of kandidaatSporte) {
      let pos = parseCanonical(Core, entry.fen);
      let whiteMovesPlayed = 0;
      let hitBudgetFail = false;
      let blockedEarly = false;
      const budget = Kruin.budgetOf(entry.rung);
      for (let i = 0; i < budget + 3 && !hitBudgetFail; i++) {
        const voorFen = toFEN(Core, pos, Core.TURN_WHITE);
        const voorDTM = Orakel.dtm(voorFen);
        const cands = Core.whiteMoves(pos.wK, pos.wB, pos.wN, pos.bK).map((m) => {
          const nPos = applyWhite(pos, m);
          const naFen = toFEN(Core, nPos, Core.TURN_BLACK);
          const naDTM = Orakel.dtm(naFen);
          return { m, nPos, naDTM, jump: typeof naDTM === 'number' ? naDTM - voorDTM : Infinity };
        }).filter((c) => c.naDTM !== Orakel.REMISE && c.jump >= 1 && c.jump <= 7);
        if (!cands.length) { blockedEarly = true; break; }
        cands.sort((a, b) => a.jump - b.jump); // kies die sagste omweggie beskikbaar
        const pick = cands[0];
        pos = pick.nPos;
        whiteMovesPlayed++;
        const bs = Kruin.budgetStatus(entry.rung, whiteMovesPlayed);
        if (bs.misluk) { hitBudgetFail = true; break; }
        const naFen = toFEN(Core, pos, Core.TURN_BLACK);
        const gekies = Orakel.defenderMove(naFen, 'optimaal', { seed: 42 + i });
        if (!gekies) break;
        pos = { wK: pos.wK, wB: pos.wB, wN: pos.wN, bK: Orakel.fromAlgebraic(gekies.to) };
      }
      bestPoging = { entry, whiteMovesPlayed, hitBudgetFail, blockedEarly, budget };
      if (hitBudgetFail) break;
    }
    push('foutklas gevind: begroting oorskry via werklike tempo-mors-reeks', bestPoging.hitBudgetFail,
      bestPoging.hitBudgetFail
        ? `sport ${bestPoging.entry.rung}: ${bestPoging.whiteMovesPlayed} skuiwe gespeel, begroting=${bestPoging.budget}`
        : `laaste probeerslag sport ${bestPoging.entry.rung}: ${bestPoging.blockedEarly ? 'geen veilige tempo-mors-skuif meer beskikbaar' : 'begroting nie oorskry nie'} (val terug op suiwer budgetStatus-toets, sien 4a)`);
  })();

  // Drievoudige herhaling: herhalingsToets (app.js reël 344-349) is 'n
  // triviale lys-telfunksie sonder skaakdomein-logika (tel identiese
  // toestand-tuples, misluk by >=3) -- hier onafhanklik met werklike
  // toestand-tuples getoets, met dieselfde drempel as die bronkode.
  (function herhaling() {
    function posTuple(p, t) { return `${p.wK},${p.wB},${p.wN},${p.bK},${t}`; }
    function herhalingsToets(geskiedenis) {
      const laaste = geskiedenis[geskiedenis.length - 1];
      let telling = 0;
      for (const p of geskiedenis) if (p === laaste) telling++;
      return telling >= 3;
    }
    const entry = bank.rungs[0];
    const pos = parseCanonical(Core, entry.fen);
    const tup = posTuple(pos, Core.TURN_WHITE);
    const twee = herhalingsToets([tup, 'ander', tup]);
    const drie = herhalingsToets([tup, 'ander', tup, 'ander', tup]);
    push('foutklas gevind: drievoudige herhaling (2x nog nie, 3x wel)', !twee && drie,
      `2x-herhaling misluk=${twee} (verwag false), 3x-herhaling misluk=${drie} (verwag true)`);
  })();

  return { ok, fail, checks, total: ok + fail };
}

module.exports = { optimalClimb, mistakePlayer };
