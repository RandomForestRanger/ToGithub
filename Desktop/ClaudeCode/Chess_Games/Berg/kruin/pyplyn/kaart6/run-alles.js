// Kaart 6: hoof-oudit-loper. Voer al vier verifikasie-items uit teen die
// WERKLIKE produksiekode (geen herskrywing van speletjie-/orakel-logika nie)
// en druk 'n volledige verslag. Loop: node run-alles.js
'use strict';

const fs = require('fs');
const path = require('path');
const H = require('./harness.js');
const { runPositionAudit } = require('./posisie-oudit.js');
const { runSwindleAudit } = require('./slinks-oudit.js');
const { optimalClimb, mistakePlayer } = require('./deurspeel-toets.js');
const {
  runBudgetOffByOne, runSymmetryColorCheck, runIndexedDbInvalidation, runLocalStorageMigration,
} = require('./regressie-toets.js');

function fmtMs(ms) { return `${(ms / 1000).toFixed(1)}s`; }

async function main() {
  const t0 = Date.now();
  const report = { generatedAt: new Date().toISOString(), sections: [] };
  let overallOk = 0, overallFail = 0;

  function record(name, result, extraNote) {
    overallOk += result.ok; overallFail += result.fail;
    report.sections.push({ name, ok: result.ok, fail: result.fail, total: result.total, note: extraNote || '' });
    console.log(`\n=== ${name} ===`);
    if (extraNote) console.log(extraNote);
    for (const c of result.checks) {
      if (!c.pass) console.log(`  FAAL: ${c.label}${c.detail ? ' :: ' + c.detail : ''}`);
    }
    console.log(`  ${result.ok}/${result.total} geslaag.`);
    return result;
  }

  // --- 0. Bootstrap: bou die orakel via TWEE onafhanklike implementasies
  // (Node build-oracle.js vs onttrekte blaaier orakel-worker.js) en
  // bevestig hulle lewer BYTE-IDENTIESE DTM-tabelle. ---
  console.log('Bou orakel (Node build-oracle.js)...');
  const tBuildNode0 = Date.now();
  const { buildOracle: buildOracleNode } = require(path.join(H.ROOT, 'kruin/pyplyn/build-oracle.js'));
  const nodeResult = buildOracleNode();
  const tBuildNode = Date.now() - tBuildNode0;
  console.log(`  ${fmtMs(tBuildNode)}`);

  console.log('Bou orakel (onttrekte blaaier orakel-worker.js)...');
  const tBuildWorker0 = Date.now();
  const buildOracleFromWorker = H.extractWorkerBuildOracle();
  const workerResult = buildOracleFromWorker();
  const tBuildWorker = Date.now() - tBuildWorker0;
  console.log(`  ${fmtMs(tBuildWorker)} (let wel: stadiger onder vm.runInContext se sandboks-koste as suiwer Node -- 'n omgewingskwessie, nie 'n looptyd-regressie in die blaaier self nie)`);

  const dtmEqual = Buffer.compare(Buffer.from(nodeResult.dtm.buffer), Buffer.from(workerResult.dtm.buffer)) === 0;
  record('0. Dubbel-implementasie-konsekwentheid (build-oracle.js vs orakel-worker.js)', {
    ok: dtmEqual ? 2 : 0,
    fail: dtmEqual ? 0 : 2,
    total: 2,
    checks: [
      { label: 'DTM-tabelle byte-identies (33 554 432 selle)', pass: dtmEqual },
      { label: 'maxD stem ooreen', pass: nodeResult.maxD === workerResult.maxD, detail: `${nodeResult.maxD} vs ${workerResult.maxD}` },
    ],
  }, `Node: ${fmtMs(tBuildNode)}, blaaier(vm): ${fmtMs(tBuildWorker)}`);

  const dtm = nodeResult.dtm; // ge-verifieer identies -- gebruik die vinniger Node-tabel vir die res
  const Core = H.OrakelCore;

  console.log('\nBootstrap produksie-Orakel-API (orakel.js) via nagemaakte Worker...');
  const Orakel = await H.bootstrapOrakel(() => workerResult);
  console.log('  klaar.');

  const bank = H.loadPositionBank();
  const { Kruin } = H.bootstrapAppPureHelpers();

  // --- 1. Posisie-oudit ---
  record('1. Posisie-oudit (30 sporte x 8 gedaantes = 240 posisies)', runPositionAudit(Core, Orakel, bank));

  // --- 2. Slinkse-lyne-oudit ---
  const swindleHelpers = H.extractSwindleHelpers();
  record('2. Slinkse-lyne-oudit (16 gemerkte lyne)', runSwindleAudit(Core, dtm, bank, swindleHelpers));

  // --- 3. Geskripte deurspeel-toets ---
  record('3a. Deurspeel-toets: optimale speler klim 1 -> 30', optimalClimb(Core, Orakel, Kruin, bank));
  record('3b. Deurspeel-toets: foutspeler aktiveer elke mislukkingsklas', mistakePlayer(Core, Orakel, Kruin, bank));

  // --- 4. Regressie-lys ---
  record('4a. Regressie: begroting-af-per-een-foute', runBudgetOffByOne(Kruin));
  record('4b. Regressie: simmetrie-blokkleur', runSymmetryColorCheck(Core));
  record('4c. Regressie: IndexedDB-kas-ongeldigmaking', await runIndexedDbInvalidation(H));
  record('4d. Regressie: localStorage-migrasie', runLocalStorageMigration(H));

  const totalMs = Date.now() - t0;
  report.overallOk = overallOk;
  report.overallFail = overallFail;
  report.overallTotal = overallOk + overallFail;
  report.totalMs = totalMs;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`GESAMENTLIK: ${overallOk}/${overallOk + overallFail} toetse geslaag. (${fmtMs(totalMs)})`);
  console.log(`${'='.repeat(60)}`);

  fs.writeFileSync(path.join(__dirname, 'oudit-verslag.json'), JSON.stringify(report, null, 2));
  console.log(`\nVolledige verslag geskryf na ${path.join(__dirname, 'oudit-verslag.json')}`);

  process.exit(overallFail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
