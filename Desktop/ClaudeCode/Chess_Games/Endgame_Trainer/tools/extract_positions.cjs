#!/usr/bin/env node
// Loads positions.js (a bare script — const ENDGAME_TYPES/TIERS/POSITIONS,
// no export, normally pulled in via <script src="positions.js"> in
// index.html) and prints those three consts as JSON on stdout so the
// Python verification harness can consume them without re-implementing a
// JS parser.
//
// Approach: append `module.exports = {...}` to the file's own source and
// `require()` the result. Node wraps every required file in a function,
// so the file's top-level `const` declarations become scoped to that
// wrapper — the appended line can see them directly, no eval() tricks,
// no risk of misparsing the 900-line data literal with regex.

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const positionsPath = path.resolve(
  process.argv[2] || path.join(__dirname, '..', 'positions.js')
);

const source = fs.readFileSync(positionsPath, 'utf8');
const patched =
  source + '\nmodule.exports = { ENDGAME_TYPES, TIERS, POSITIONS };\n';

const tmpFile = path.join(
  os.tmpdir(),
  `positions_extract_${process.pid}_${Date.now()}.js`
);
fs.writeFileSync(tmpFile, patched);

try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const data = require(tmpFile);
  if (!data.POSITIONS || !data.TIERS || !data.ENDGAME_TYPES) {
    throw new Error(
      'positions.js did not define ENDGAME_TYPES, TIERS and POSITIONS as expected'
    );
  }
  process.stdout.write(JSON.stringify(data));
} finally {
  fs.unlinkSync(tmpFile);
}
