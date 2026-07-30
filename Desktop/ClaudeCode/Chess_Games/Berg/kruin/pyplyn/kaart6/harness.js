// Kaart 6: Node-looptyd-harnas. Laai die WERKLIKE produksiekode (orakel-core.js,
// orakel-worker.js, orakel.js, app.js, posisiebank.js) sonder enige herskrywing
// van logika, en sonder 'n blaaier -- via `vm` vir die lêers wat op blaaier-
// globale (self/window/indexedDB/Worker) staatmaak. Geen kode word hier
// gedupliseer nie; slegs die minimum omgewing-stobbe om die bestaande lêers te
// laat loop soos hulle reeds in kruin.html loop.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..', '..'); // Berg/

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// --- OrakelCore: reeds CommonJS-versoenbaar, geen vm nodig nie ---
const OrakelCore = require(path.join(ROOT, 'orakel/orakel-core.js'));

// --- orakel-worker.js: onttrek die werklike buildOracle()-funksie (die enigste
// blaaier-spesifieke reël is `importScripts(...)`, wat ons verwyder aangesien
// ons OrakelCore self as globale reeds voorsien). ---
function extractWorkerBuildOracle() {
  let src = readSrc('orakel/orakel-worker.js');
  src = src.replace(/^importScripts\([^)]*\);?\s*$/m, '');
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.OrakelCore = OrakelCore;
  vm.createContext(sandbox);
  // Laaste uitdrukking = die funksie self (funksie-verklarings word wel
  // eiendomme van die vm-konteks, maar ons gebruik die uitdrukking-truuk vir
  // eenvormigheid en sodat dit ook sou werk as dit 'n const/let was).
  return vm.runInContext(src + '\nbuildOracle', sandbox);
}

// --- Minimale in-geheue nagemaakte IndexedDB (net genoeg vir orakel.js se
// idbOpen/idbGet/idbPut-patroon) en 'n nagemaakte Worker wat die WERKLIKE
// (onttrekte) buildOracle() sinchroon laat loop. ---
function makeFakeIndexedDB() {
  const store = new Map();
  const fakeDb = {
    createObjectStore() {},
    transaction() {
      return {
        objectStore() {
          return {
            get(key) {
              const req = {};
              queueMicrotask(() => {
                req.result = store.get(key);
                if (req.onsuccess) req.onsuccess();
              });
              return req;
            },
            put(value, key) { store.set(key, value); },
          };
        },
        set oncomplete(fn) { if (fn) queueMicrotask(fn); },
        set onerror(fn) { /* nooit hier gebruik nie -- put() faal nooit in die nabootsing nie */ },
      };
    },
  };
  return {
    _store: store,
    open() {
      const req = {};
      queueMicrotask(() => {
        req.result = fakeDb;
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
}

function makeFakeWorkerClass(buildOracleFn) {
  return class FakeWorker {
    constructor() {}
    postMessage(msg) {
      if (msg && msg.tipe === 'bou') {
        const result = buildOracleFn();
        const payload = {
          tipe: 'klaar',
          dtmBuffer: result.dtm.buffer,
          maxD: result.maxD,
          timings: result.timings,
          tellings: result.tellings,
        };
        queueMicrotask(() => {
          if (this.onmessage) this.onmessage({ data: payload });
        });
      }
    }
    terminate() {}
  };
}

// --- orakel.js: laai die WERKLIKE lêer in 'n vm-konteks met stobbe vir
// indexedDB/Worker/performance, en roep sy eie regte ready() aan -- dieselfde
// kode-pad as die blaaier volg (kas-mis -> bou via "worker" -> kas-stoor). ---
function bootstrapOrakel(buildOracleFn, sharedIdb) {
  const src = readSrc('orakel/orakel.js');
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.OrakelCore = OrakelCore;
  sandbox.indexedDB = sharedIdb || makeFakeIndexedDB();
  sandbox.Worker = makeFakeWorkerClass(buildOracleFn);
  sandbox.performance = { now: () => Date.now() };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.Orakel.ready({ workerUrl: 'onbenut-in-nabootsing' }).then(() => sandbox.Orakel);
}

// --- bou-posisiebank.js: onttrek die WERKLIKE slinkse-lyn-soek-funksies
// (findSwindle, whiteOptimalReply, classifyTrap) sonder om main() (wat
// kandidate.json lees en posisiebank.json skryf) uit te voer nie. ---
function extractSwindleHelpers() {
  let src = readSrc('kruin/pyplyn/bou-posisiebank.js');
  src = src
    .replace(/^const fs = require\([^)]*\);?\s*$/m, '')
    .replace(/^const Core = require\([^)]*\);?\s*$/m, '')
    .replace(/^const \{ buildOracle \} = require\([^)]*\);?\s*$/m, '')
    .replace(/\nmain\(\);\s*$/, '\n');
  const sandbox = { Core: OrakelCore };
  vm.createContext(sandbox);
  return vm.runInContext(
    src + '\n({ findSwindle, whiteOptimalReply, classifyTrap, moveSq, sqAlg })',
    sandbox
  );
}

// --- app.js: laai die WERKLIKE lêer met minimale stobbe. Ons roep NOOIT
// init()/DOMContentLoaded aan nie (dit sou 'n volle DOM/jQuery/chessboard.js/
// BergEngine/Jorka/Klank vereis) -- ons gebruik slegs die DOM-vrye hake wat
// app.js reeds self blootstel op Kruin (budgetStatus, zoneOf, parseFEN,
// transformPos) plus een bykomende toetshaak vir laaiToestand (§6-migrasie),
// bygevoeg in dieselfde styl as die bestaande Kruin._xxx-hake.
function bootstrapAppPureHelpers() {
  const src = readSrc('kruin/app.js');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.OrakelCore = OrakelCore;
  sandbox.Orakel = {};
  sandbox.BergEngine = {};
  sandbox.Jorka = {};
  sandbox.Klank = {};
  sandbox.document = { addEventListener() {} };
  sandbox.localStorage = makeFakeLocalStorage();
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { Kruin: sandbox.Kruin, localStorage: sandbox.localStorage };
}

function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    _store: store,
  };
}

// --- posisiebank.js: `const POSITION_BANK = {...}` -- top-vlak const heg nie
// aan die vm-konteks-objek nie, so ons vang dit via die laaste-uitdrukking-
// truuk (die skrip se voltooiingswaarde). ---
function loadPositionBank() {
  const src = readSrc('kruin/posisiebank.js');
  return vm.runInNewContext(src + '\nPOSITION_BANK', {});
}

module.exports = {
  OrakelCore,
  extractWorkerBuildOracle,
  bootstrapOrakel,
  bootstrapAppPureHelpers,
  extractSwindleHelpers,
  makeFakeIndexedDB,
  loadPositionBank,
  ROOT,
  readSrc,
};
