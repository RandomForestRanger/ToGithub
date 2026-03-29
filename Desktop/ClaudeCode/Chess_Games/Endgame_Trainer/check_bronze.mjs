// check_bronze.mjs — verifies each bronze FEN has a forced mate in ≤12 moves
// Usage: node check_bronze.mjs

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load positions ───────────────────────────────────────────────────────────
import { createRequire } from 'module';
import vm from 'vm';
const src = readFileSync(join(__dirname, 'positions.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src, ctx);
const POSITIONS = ctx.POSITIONS;

const TYPE_NAMES = {
  1:  'K+Q vs K',
  2:  'K+R vs K',
  3:  'K+BB vs K',
  4:  'K+BN vs K',
  5:  'K+NN vs K',
  6:  'K+P vs K',
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
    }, 10000);

    sf.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('\nbestmove ') && !settled) {
        settled = true;
        clearTimeout(timeout);
        sf.kill();
        // Find all "score mate N" occurrences and take the smallest
        const re = /score mate (\d+)/g;
        let m, best = Infinity;
        while ((m = re.exec(output)) !== null) {
          const n = parseInt(m[1]);
          if (n > 0 && n < best) best = n;
        }
        if (best < Infinity) {
          resolve({ found: true, mate: best, timedOut: false });
        } else {
          resolve({ found: false, mate: null, timedOut: false });
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
  console.log('─'.repeat(72));

  for (const [typeIdStr, tiers] of Object.entries(POSITIONS)) {
    const typeId = parseInt(typeIdStr);
    const name = TYPE_NAMES[typeId] || `Type ${typeId}`;
    const bronzeList = tiers.bronze || [];

    if (bronzeList.length === 0) {
      console.log(`Type ${typeId}: no bronze positions\n`);
      continue;
    }

    console.log(`Type ${String(typeId).padStart(2)} — ${name}`);

    for (let i = 0; i < bronzeList.length; i++) {
      const { fen } = bronzeList[i];
      process.stdout.write(`  B${i + 1}: ${fen.padEnd(48)} → `);

      const result = await askStockfish(fen, MATE_LIMIT);

      if (result.timedOut) {
        console.log('⏱  TIMEOUT (no forced mate in 10s)');
        results.push({ typeId, name, idx: i + 1, fen, status: 'timeout' });
      } else if (result.found) {
        const ok = result.mate <= MATE_LIMIT;
        console.log(`${ok ? '✅' : '⚠️ '} mate in ${result.mate}${ok ? '' : '  ← OVER LIMIT'}`);
        results.push({ typeId, name, idx: i + 1, fen, status: ok ? 'ok' : 'over', mate: result.mate });
      } else {
        console.log('❌  no forced mate found');
        results.push({ typeId, name, idx: i + 1, fen, status: 'none' });
      }
    }
    console.log();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('═'.repeat(72));
  console.log('SUMMARY\n');

  const ok      = results.filter(r => r.status === 'ok');
  const over    = results.filter(r => r.status === 'over');
  const none    = results.filter(r => r.status === 'none');
  const timeout = results.filter(r => r.status === 'timeout');

  console.log(`✅  Confirmed mate ≤12:   ${ok.length}`);
  console.log(`⚠️   Mate found but >12:   ${over.length}`);
  console.log(`❌  No forced mate found:  ${none.length}`);
  console.log(`⏱   Timed out:             ${timeout.length}`);
  console.log(`    Total checked:          ${results.length}`);

  if (over.length || none.length || timeout.length) {
    console.log('\nPositions to review:');
    [...over, ...none, ...timeout].forEach(r => {
      const tag = r.status === 'over' ? `mate in ${r.mate}` : r.status;
      console.log(`  Type ${String(r.typeId).padStart(2)} B${r.idx} [${tag}]`);
      console.log(`         ${r.fen}`);
    });
  } else {
    console.log('\nAll bronze positions pass! 🎉');
  }
}

main().catch(console.error);
