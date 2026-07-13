#!/usr/bin/env node
// check_bronze.js — verifies each bronze FEN has a forced mate in ≤12 moves
// Usage: node check_bronze.js

const { execSync, spawn } = require('child_process');
const path = require('path');

// ── Load positions ──────────────────────────────────────────────────────────
const positionsPath = path.join(__dirname, 'positions.js');
const src = require('fs').readFileSync(positionsPath, 'utf8');

// Evaluate the positions.js file to get the POSITIONS object
const fn = new Function(src + '\nreturn POSITIONS;');
const POSITIONS = fn();

const TYPE_NAMES = {
  1:  'Koning & Koningin teen Koning',
  2:  'Koning & Toring teen Koning',
  3:  'Koning & Twee Lopers teen Koning',
  4:  'Koning, Loper & Ruiter teen Koning',
  5:  'Koning & Twee Ruiters teen Koning',
  6:  'Koning & Pion teen Koning',
  7:  'Verbygeraakte Pion Wedren',
  8:  'Opposisie & Koningaktiwiteit',
  9:  'Zugzwang',
  10: 'Driehoeksbeweging',
  11: 'Piondeurbraak',
  12: 'Buitenste Verbygeraakte Pion',
  13: 'Lucena-posisie',
  14: 'Philidor-posisie',
  15: 'Toring Agter Verbygeraakte Pion',
  16: 'Aktiewe vs Passiewe Toring',
  17: 'Goeie Loper vs Slegte Loper',
  18: 'Loper teen Ruiter',
  19: 'Verkeerde Kleur Loper',
  20: 'Koningin teen Pion op 7de Ry',
};

// ── Stockfish UCI helper ────────────────────────────────────────────────────
function askStockfish(fen, mateIn) {
  return new Promise((resolve) => {
    const sf = spawn('stockfish');
    let output = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        sf.kill();
        resolve({ found: false, mate: null, timedOut: true });
      }
    }, 8000);

    sf.stdout.on('data', (data) => {
      output += data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        // Look for bestmove — analysis complete
        if (line.startsWith('bestmove')) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            sf.kill();
            // Scan all output for the deepest mate score
            const mateMatch = output.match(/score mate (\d+)/g);
            if (mateMatch) {
              const depths = mateMatch.map(m => parseInt(m.replace('score mate ', '')));
              const best = Math.min(...depths);
              resolve({ found: true, mate: best, timedOut: false });
            } else {
              resolve({ found: false, mate: null, timedOut: false });
            }
          }
        }
      }
    });

    sf.stdin.write('uci\n');
    sf.stdin.write('isready\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go mate ${mateIn}\n`);
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const MATE_LIMIT = 12;
  const results = [];

  console.log(`\nChecking bronze positions for forced mate in ≤${MATE_LIMIT} moves...\n`);
  console.log('─'.repeat(70));

  for (const [typeIdStr, tiers] of Object.entries(POSITIONS)) {
    const typeId = parseInt(typeIdStr);
    const name = TYPE_NAMES[typeId] || `Type ${typeId}`;
    const bronzeList = tiers.bronze || [];

    if (bronzeList.length === 0) {
      console.log(`Type ${typeId}: no bronze positions`);
      continue;
    }

    process.stdout.write(`Type ${String(typeId).padStart(2)} — ${name}\n`);

    for (let i = 0; i < bronzeList.length; i++) {
      const { fen, note } = bronzeList[i];
      process.stdout.write(`  B${i + 1}: ${fen.padEnd(50)} → `);

      const result = await askStockfish(fen, MATE_LIMIT);

      if (result.timedOut) {
        console.log('⏱  TIMEOUT (no forced mate found in 8s)');
        results.push({ typeId, name, tier: 'bronze', idx: i + 1, fen, status: 'timeout' });
      } else if (result.found) {
        const ok = result.mate <= MATE_LIMIT;
        console.log(`${ok ? '✅' : '⚠️ '} mate in ${result.mate}${ok ? '' : ' (OVER LIMIT)'}`);
        results.push({ typeId, name, tier: 'bronze', idx: i + 1, fen, status: ok ? 'ok' : 'over', mate: result.mate });
      } else {
        console.log('❌  No forced mate found');
        results.push({ typeId, name, tier: 'bronze', idx: i + 1, fen, status: 'none' });
      }
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═'.repeat(70));
  console.log('SUMMARY\n');

  const ok      = results.filter(r => r.status === 'ok');
  const over    = results.filter(r => r.status === 'over');
  const none    = results.filter(r => r.status === 'none');
  const timeout = results.filter(r => r.status === 'timeout');

  console.log(`✅  Confirmed mate ≤12:  ${ok.length}`);
  console.log(`⚠️   Mate found but >12:  ${over.length}`);
  console.log(`❌  No forced mate found: ${none.length}`);
  console.log(`⏱   Timed out:            ${timeout.length}`);
  console.log(`    Total checked:         ${results.length}`);

  if (over.length || none.length || timeout.length) {
    console.log('\nPositions to review:');
    [...over, ...none, ...timeout].forEach(r => {
      const tag = r.status === 'over' ? `mate in ${r.mate}` : r.status;
      console.log(`  Type ${r.typeId} B${r.idx}: ${r.fen}  [${tag}]`);
    });
  } else {
    console.log('\nAll bronze positions pass. 🎉');
  }
}

main().catch(console.error);
