// Kaart 6, item 2: elke gemerkte slinkse lyn (16 posisies) se weerlegging
// bevestig. Twee onafhanklike toetse per lyn:
//   (a) 'n VARS herloop van die produksie-soekfunksie (findSwindle, direk uit
//       bou-posisiebank.js onttrek, ongewysig) teen 'n vars orakel-bou, gediff
//       teen wat werklik in kruin/posisiebank.js verskeep word -- vang enige
//       skuif ("drift") tussen die pyplyn-uitset en die verskeepte lêer.
//   (b) direkte struktuur-bevestiging van die VERSKEEPTE data self: wettig,
//       DTM-verkorting <= 4, en 'n bevestigde weerlegging (reply_hint is
//       werklik die orakel-optimale antwoord ná die slinkse skuif).
'use strict';

function runSwindleAudit(Core, dtm, bank, helpers) {
  const { findSwindle, whiteOptimalReply } = helpers;
  const { TURN_WHITE, packIndex, blackKingMoves, file, rank, sqOf } = Core;
  const FILES = 'abcdefgh';
  const sqAlg = (sq) => FILES[file(sq)] + (rank(sq) + 1);
  const algToSq = (s) => sqOf(FILES.indexOf(s[0]), parseInt(s[1], 10) - 1);

  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => {
    checks.push({ label, pass, detail });
    if (pass) ok++; else fail++;
  };

  function parseCanonical(fen) {
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

  const withSwindles = bank.rungs.filter((r) => r.swindles && r.swindles.length);
  push('16 sporte met presies een gemerkte slinkse lyn', withSwindles.length === 16,
    `${withSwindles.length} gevind`);

  for (const entry of withSwindles) {
    const sw = entry.swindles[0];
    const { wK, wB, wN, bK } = parseCanonical(entry.fen);
    const label = `sport ${entry.rung} (${sw.trap})`;

    // (a) Vars herloop van die produksie-soekfunksie, gediff teen verskeep.
    const fresh = findSwindle(dtm, wK, wB, wN, bK);
    const driftOk = !!fresh && fresh.atPly === sw.atPly && fresh.move === sw.move
      && fresh.reply_hint === sw.reply_hint;
    push(`${label}: vars pyplyn-herloop stem ooreen met verskeepte data (geen drif)`, driftOk,
      driftOk ? '' : `vars=${JSON.stringify(fresh)} verskeep=${JSON.stringify(sw)}`);

    // (b) Herbou die presiese hoof-lyn (wit + swart optimaal) tot net voor
    //     die slinkse ply, presies soos findSwindle self doen, om die
    //     verskeepte data ONAFHANKLIK te herbevestig.
    let curWK = wK, curWB = wB, curWN = wN, curBK = bK;
    const targetPly = sw.atPly / 2; // aantal wit-swart-paar-iterasies
    let reconstructOk = true, reconstructDetail = '';
    for (let ply = 1; ply < targetPly && reconstructOk; ply++) {
      const reply = whiteOptimalReply(dtm, curWK, curWB, curWN, curBK);
      if (!reply) { reconstructOk = false; reconstructDetail = 'geen optimale wit-antwoord'; break; }
      const candidates = blackKingMoves(reply.wK, reply.wB, reply.wN, curBK)
        .filter((m) => !m.capture)
        .map((m) => ({ to: m.to, dtmAfter: dtm[packIndex(reply.wK, reply.wB, reply.wN, m.to, TURN_WHITE)] }))
        .filter((c) => c.dtmAfter !== 255);
      if (!candidates.length) { reconstructOk = false; reconstructDetail = 'geen swart-kandidate'; break; }
      const optimalD = Math.max(...candidates.map((c) => c.dtmAfter));
      const optimalMove = candidates.find((c) => c.dtmAfter === optimalD);
      curWK = reply.wK; curWB = reply.wB; curWN = reply.wN; curBK = optimalMove.to;
    }
    push(`${label}: hooflyn tot voor slinkse ply herbou sonder wegraak`, reconstructOk, reconstructDetail);
    if (!reconstructOk) continue;

    const replyAtSwindlePly = whiteOptimalReply(dtm, curWK, curWB, curWN, curBK);
    if (!replyAtSwindlePly) { push(`${label}: wit het 'n optimale skuif by die slinkse ply`, false); continue; }
    const { wK: nwK, wB: nwB, wN: nwN } = replyAtSwindlePly;

    // Wettigheid: die swindle-skuif se "van" is werklik die swart koning se
    // huidige vierkant, en "na" is 'n wettige, nie-slaan-skuif.
    const vanAlg = sw.move.slice(0, 2), naAlg = sw.move.slice(2, 4);
    const vanSq = algToSq(vanAlg), naSq = algToSq(naAlg);
    const vanOk = vanSq === curBK;
    push(`${label}: slinkse skuif se "van" is die swart koning se werklike vierkant`, vanOk,
      `verwag ${sqAlg(curBK)}, kry ${vanAlg}`);

    const legalCandidates = blackKingMoves(nwK, nwB, nwN, curBK)
      .filter((m) => !m.capture)
      .map((m) => ({ to: m.to, dtmAfter: dtm[packIndex(nwK, nwB, nwN, m.to, TURN_WHITE)] }))
      .filter((c) => c.dtmAfter !== 255);
    const chosen = legalCandidates.find((c) => c.to === naSq);
    push(`${label}: slinkse skuif is wettig (nie-slaan, nie pat-in-plek nie)`, !!chosen,
      chosen ? '' : `${naAlg} nie onder wettige nie-vas-swart-skuiwe nie`);
    if (!chosen) continue;

    // DTM-verkorting <= 4 en > 0 (strik, nie selfmoord nie; en werklik 'n
    // afwyking van optimaal, nie toevallig self die optimale skuif nie).
    const optimalD = Math.max(...legalCandidates.map((c) => c.dtmAfter));
    const verkorting = optimalD - chosen.dtmAfter;
    const verkortingOk = verkorting > 0 && verkorting <= 4;
    push(`${label}: DTM-verkorting binne (0,4] plies`, verkortingOk, `verkorting=${verkorting} plies`);

    // Weerlegging: reply_hint is werklik die orakel-optimale antwoord ná die
    // slinkse skuif (d.w.s. die strik is opgelos deur reply_hint te speel).
    const refutation = whiteOptimalReply(dtm, nwK, nwB, nwN, chosen.to);
    const refutationOk = !!refutation && sqAlg(refutation.toSq) === sw.reply_hint;
    push(`${label}: reply_hint is die bevestigde weerlegging`, refutationOk,
      refutation ? `orakel-optimaal=${sqAlg(refutation.toSq)}, verskeep=${sw.reply_hint}` : 'geen optimale antwoord gevind');
  }

  return { ok, fail, checks, total: ok + fail };
}

module.exports = { runSwindleAudit };
