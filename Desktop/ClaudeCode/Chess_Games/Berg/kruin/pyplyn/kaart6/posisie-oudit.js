// Kaart 6, item 1: al 30 kanonieke posisies x 8 gedaantes = 240 posisies
// masjien-geverifieer teen die WERKLIKE Orakel-API (DTM korrek, wettig, geen
// onmiddellike pat-eienaardighede).
'use strict';

function toFEN(Core, pos, turn) {
  const { file, rank } = Core;
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[rank(pos.wK)][file(pos.wK)] = 'K';
  board[rank(pos.wB)][file(pos.wB)] = 'B';
  board[rank(pos.wN)][file(pos.wN)] = 'N';
  board[rank(pos.bK)][file(pos.bK)] = 'k';
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
  return rows.join('/') + ' ' + (turn === Core.TURN_BLACK ? 'b' : 'w') + ' - - 0 1';
}

function runPositionAudit(Core, Orakel, bank) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => {
    checks.push({ label, pass, detail });
    if (pass) ok++; else fail++;
  };

  for (const entry of bank.rungs) {
    // Ontleed die kanonieke FEN self (geen afhanklikheid van app.js se parser nie).
    const parts = entry.fen.trim().split(/\s+/)[0].split('/');
    let wK = -1, wB = -1, wN = -1, bK = -1;
    for (let rIdx = 0; rIdx < 8; rIdx++) {
      const rankNum = 7 - rIdx;
      let f = 0;
      for (const ch of parts[rIdx]) {
        if (ch >= '1' && ch <= '8') { f += parseInt(ch, 10); continue; }
        const sq = Core.sqOf(f, rankNum);
        if (ch === 'K') wK = sq;
        else if (ch === 'B') wB = sq;
        else if (ch === 'N') wN = sq;
        else if (ch === 'k') bK = sq;
        f++;
      }
    }

    for (let symIdx = 0; symIdx < 8; symIdx++) {
      const t = Core.symTransformPosition(wK, wB, wN, bK, symIdx);
      const label = `sport ${entry.rung} (${entry.zone}) gedaante ${symIdx}`;

      // 1. Wettigheid: konings nie aangrensend, alle vier stukke op aparte
      //    blokke, en swart (aan skuif volgende) nie reeds geskaak op wit-
      //    aan-skuif-oomblik nie -- presies wat isLegalPosition toets.
      const legal = Core.isLegalPosition(t.wK, t.wB, t.wN, t.bK, Core.TURN_WHITE);
      push(`${label}: wettige posisie`, legal, legal ? '' : JSON.stringify(t));
      if (!legal) continue;

      // 2. Geen onmiddellike pat-eienaardighede: wit het minstens een
      //    wettige skuif (nie reeds vasgekeer of mat self nie -- dit is wit
      //    aan skuif, dus kan wit nooit self mat/pat wees nie, maar 'n leë
      //    skuifgenerering sou 'n boukonstruksiefout wees).
      const wm = Core.whiteMoves(t.wK, t.wB, t.wN, t.bK);
      push(`${label}: wit het >=1 wettige skuif`, wm.length > 0, `${wm.length} skuiwe`);

      // 3. DTM stem ooreen met die sportnommer. DTM word in PLIES gestoor;
      //    'n wit-aan-skuif wenposisie het altyd 'n ONEWE ply-telling
      //    (2*sportnommer - 1), aangesien wit die laaste (matterende) skuif
      //    lewer.
      const fen = toFEN(Core, t, Core.TURN_WHITE);
      const dtmPlies = Orakel.dtm(fen);
      const verwagPlies = entry.rung * 2 - 1;
      const dtmOk = dtmPlies === verwagPlies;
      push(`${label}: DTM=${verwagPlies} plies (sport ${entry.rung})`, dtmOk,
        dtmOk ? '' : `orakel gee ${dtmPlies === Orakel.REMISE ? 'REMISE' : dtmPlies + ' plies'}`);

      // 4. Nie 'n remise nie (dubbel-kontrole, aparte van (3) vir 'n
      //    duideliker foutboodskap indien dit wel REMISE gee).
      push(`${label}: nie REMISE nie`, dtmPlies !== Orakel.REMISE);
    }
  }

  return { ok, fail, checks, total: ok + fail };
}

module.exports = { runPositionAudit, toFEN };
