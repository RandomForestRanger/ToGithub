// Kaart 6, item 4: regressie-lys afgehandel.
//   1. begroting-af-per-een-foute (budgetStatus off-by-one)
//   2. simmetrie-blokkleur (D4-gedaantes en die loper se blokkleur)
//   3. IndexedDB-kas-ongeldigmaking (weergawe-wanverskil -> herbou)
//   4. localStorage-migrasie (ou Kaart-2-toestand kry Kaart-3-velde bygevoeg)
'use strict';

function runBudgetOffByOne(Kruin) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  const at = Kruin.budgetStatus(30, 40);
  const over = Kruin.budgetStatus(30, 41);
  push('sport 30: begroting=40 (30 + genade 10)', Kruin.budgetOf(30) === 40, `budgetOf(30)=${Kruin.budgetOf(30)}`);
  push('sport 30: 40 skuiwe -- NIE misluk nie (presies op begroting)', at.misluk === false, JSON.stringify(at));
  push('sport 30: 41 skuiwe -- misluk (een oor begroting)', over.misluk === true, JSON.stringify(over));

  // Ook die ander drie sones se genade-grense.
  const cases = [
    { rung: 6, mercy: 2, zone: 'moeras' },   // begroting 8
    { rung: 14, mercy: 4, zone: 'woud' },    // begroting 18
    { rung: 22, mercy: 6, zone: 'rotse' },   // begroting 28
  ];
  for (const c of cases) {
    const budget = c.rung + c.mercy;
    const bAt = Kruin.budgetStatus(c.rung, budget);
    const bOver = Kruin.budgetStatus(c.rung, budget + 1);
    push(`sport ${c.rung} (${c.zone}): begroting=${budget}`, Kruin.budgetOf(c.rung) === budget, `budgetOf=${Kruin.budgetOf(c.rung)}`);
    push(`sport ${c.rung}: presies op begroting -- nie misluk nie`, bAt.misluk === false, JSON.stringify(bAt));
    push(`sport ${c.rung}: een oor begroting -- misluk`, bOver.misluk === true, JSON.stringify(bOver));
  }

  return { ok, fail, checks, total: ok + fail };
}

function runSymmetryColorCheck(Core) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  function squareColor(sq) { return (Core.file(sq) + Core.rank(sq)) & 1; }

  // Vir elke gedaante-indeks: toets OOR AL 64 vierkante of die kleur-pariteit
  // konsekwent bly (altyd dieselfde) of konsekwent omruil (altyd omgeruil) --
  // nooit gemeng nie. 'n Gemengde uitkoms sou 'n regte fout wees (die 8
  // gedaantes moet elk 'n suiwer rotasie of refleksie van die skaakbord wees).
  const flips = [];
  for (let k = 0; k < 8; k++) {
    let sameCount = 0, flipCount = 0;
    for (let sq = 0; sq < 64; sq++) {
      const t = Core.symTransformSquare(sq, k);
      if (squareColor(t) === squareColor(sq)) sameCount++; else flipCount++;
    }
    const pure = sameCount === 64 || flipCount === 64;
    push(`gedaante ${k}: kleur-pariteit konsekwent (nie gemeng nie) oor 64 vierkante`, pure,
      `gelyk=${sameCount} omgeruil=${flipCount}`);
    flips.push(flipCount === 64);
  }

  // §2.6 se eksplisiete bewering: "die refleksies ruil die loper se
  // blokkleur om -- die donkerhoek-tronk word 'n lighoek-tronk." Wiskundig
  // (D4 op 'n 8x8-bord met (lêer+ry)&1 as kleur) is die presiese verdeling
  // NIE "rotasies bly, refleksies ruil" nie -- dit is identiteit(0),
  // rot180(2), transponering(6) en anti-transponering(7) wat kleur BEHOU
  // (want (f,r)->(r,f) en sy komplement laat f+r se pariteit onveranderd),
  // terwyl rot90(1), rot270(3), en die twee as-spieëls(4,5) dit OMRUIL.
  // Die pedagogies-belangrike eis is bloot dat die verdeling suiwer 4-4 is
  // (bevestig hierbo per gedaante) sodat BEIDE hoekkleure oor die agt
  // gedaantes van ENIGE posisie werklik voorkom -- getoets hier direk.
  const flipCount = flips.filter((f) => f).length;
  push('presies 4 van die 8 gedaantes ruil die loperkleur om (4-4-verdeling)',
    flipCount === 4, `${flipCount} van 8 ruil om`);

  // Direkte funksionele toets: pas al 8 gedaantes toe op 'n regte kanonieke
  // loper-vierkant en bevestig BEIDE kleure werklik voorkom (nie net
  // teoreties nie).
  const testWB = Core.sqOf(2, 3); // c4, 'n donker vierkant
  const coloursSeen = new Set();
  for (let k = 0; k < 8; k++) coloursSeen.add(squareColor(Core.symTransformSquare(testWB, k)));
  push('beide loperkleure kom werklik voor oor die 8 gedaantes van een kanonieke posisie',
    coloursSeen.size === 2, `kleure gesien: ${[...coloursSeen].join(',')}`);

  return { ok, fail, checks, total: ok + fail };
}

async function runIndexedDbInvalidation(H) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  const buildFn = H.extractWorkerBuildOracle();
  let buildCallCount = 0;
  const countedBuildFn = () => { buildCallCount++; return buildFn(); };

  const sharedIdb = H.makeFakeIndexedDB();

  const o1 = await H.bootstrapOrakel(countedBuildFn, sharedIdb);
  push('1ste ready(): kas-mis, bou van nuuts af', o1.cacheHit === false, `cacheHit=${o1.cacheHit}, boukalle=${buildCallCount}`);

  const o2 = await H.bootstrapOrakel(countedBuildFn, sharedIdb);
  push('2de ready() (warm kas): kas-geraak, GEEN herbou nie', o2.cacheHit === true && buildCallCount === 1,
    `cacheHit=${o2.cacheHit}, boukalle=${buildCallCount}`);
  push('kas-gelaaide maxD stem ooreen met vars-geboude maxD', o2.maxD === o1.maxD, `${o2.maxD} vs ${o1.maxD}`);

  // Bederf die kas se weergawe-etiket -- simuleer 'n ORAKEL_VERSION-opgradering.
  const stored = sharedIdb._store.get('klr-v-k');
  stored.version = '0.0.0-oud';
  sharedIdb._store.set('klr-v-k', stored);

  const o3 = await H.bootstrapOrakel(countedBuildFn, sharedIdb);
  push('3de ready() (weergawe-wanverskil): kas ongeldig gemaak, HERBOU', o3.cacheHit === false && buildCallCount === 2,
    `cacheHit=${o3.cacheHit}, boukalle=${buildCallCount}`);

  return { ok, fail, checks, total: ok + fail };
}

function runLocalStorageMigration(H) {
  const checks = [];
  let ok = 0, fail = 0;
  const push = (label, pass, detail) => { checks.push({ label, pass, detail }); if (pass) ok++; else fail++; };

  const { Kruin, localStorage } = H.bootstrapAppPureHelpers();

  // 'n Kaart-2-vintage toestand: het GEEN van die Kaart-3-velde nie.
  const oud = {
    version: '1.0.0',
    currentRung: 17,
    residents: [3, 6, 9, 12, 15],
    pawPrints: { moeras: 5, woud: 8, rotse: 2, sneeu: 0 },
    cleanZoneAscents: ['moeras'],
    kapokTricks: ['modder-skud'],
    hints: { '10': 1 },
    attempts: { '17': { tries: 3, passes: 1 } },
    lastVisit: '2026-01-01T00:00:00Z',
  };
  localStorage.setItem(Kruin._STATE_KEY, JSON.stringify(oud));

  const gelaai = Kruin._laaiToestand();
  push('migrasie: consecFails bygevoeg', typeof gelaai.consecFails === 'object' && gelaai.consecFails !== null, JSON.stringify(gelaai.consecFails));
  push('migrasie: pendingCleanAscents bygevoeg', typeof gelaai.pendingCleanAscents === 'object' && gelaai.pendingCleanAscents !== null, JSON.stringify(gelaai.pendingCleanAscents));
  push('migrasie: _zoneSkoonVanaf bygevoeg', typeof gelaai._zoneSkoonVanaf === 'object' && gelaai._zoneSkoonVanaf !== null, JSON.stringify(gelaai._zoneSkoonVanaf));
  push('migrasie: ou velde onveranderd bewaar (currentRung)', gelaai.currentRung === 17, `currentRung=${gelaai.currentRung}`);
  push('migrasie: ou velde onveranderd bewaar (residents)', JSON.stringify(gelaai.residents) === JSON.stringify(oud.residents), JSON.stringify(gelaai.residents));
  push('migrasie: ou velde onveranderd bewaar (attempts)', JSON.stringify(gelaai.attempts) === JSON.stringify(oud.attempts), JSON.stringify(gelaai.attempts));

  // 'n Vars (geen-localStorage) laai kry die volle §6-verstekvorm.
  localStorage.removeItem(Kruin._STATE_KEY);
  const vars = Kruin._laaiToestand();
  push('vars laai (geen kas): currentRung=1', vars.currentRung === 1, `currentRung=${vars.currentRung}`);
  push('vars laai: al die Kaart-3-velde teenwoordig van die staanspoor af', !!vars.consecFails && !!vars.pendingCleanAscents && !!vars._zoneSkoonVanaf);

  return { ok, fail, checks, total: ok + fail };
}

module.exports = { runBudgetOffByOne, runSymmetryColorCheck, runIndexedDbInvalidation, runLocalStorageMigration };
