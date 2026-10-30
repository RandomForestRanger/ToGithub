// Browser smoke test for toernooi mode: one game in headless Chrome against the real Stockfish worker.
// Usage: VITE_SMOKE=1 npx vite build && npx vite preview --port 4173 &  then  node tools/smoke_toernooi.mjs [http://localhost:4173]
import { chromium } from 'playwright-core';

const URL = process.argv[2] || 'http://localhost:4173';
const OUT = process.env.SMOKE_OUT || '.';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: Number(process.env.SMOKE_W || 1200), height: Number(process.env.SMOKE_H || 860) } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL);
await page.waitForSelector('.forest');
await page.screenshot({ path: `${OUT}/toernooi-home.png` });
await page.click('.kelp-bottom .toernooi-btn');
await page.waitForSelector('[data-boardid="main"] [data-square="e2"]', { timeout: 20000 });

const click = sq => page.click(`[data-boardid="main"] [data-square="${sq}"]`, { force: true });
const whiteToMove = () => page.evaluate(() => { const c = window.__ctl; return !!c && !c.result && !c.thinking && c.phase !== 'over' && c.chess.turn() === 'w'; });
const waitWhite = async () => { for (let i = 0; i < 600; i++) { if (await whiteToMove()) return true; if (await page.evaluate(() => !!window.__ctl?.result)) return false; await page.waitForTimeout(100); } return false; };

// a wrong first move snaps back
await waitWhite();
await click('d2'); await click('d4');
await page.waitForTimeout(300);
if (await page.evaluate(() => window.__ctl.ply) !== 0) errors.push('1.d4 was accepted in toernooi');
for (const [f, t] of [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['b2', 'b4']]) {
  await waitWhite(); await click(f); await click(t);
}
let shot = false;
while (await waitWhite()) {
  if (!shot && await page.evaluate(() => window.__ctl.ply) >= 16) { await page.screenshot({ path: `${OUT}/toernooi-game.png` }); shot = true; }
  // a plausible move: the engine's best half the time, otherwise a random legal move
  const [f, t] = await page.evaluate(async () => {
    const c = window.__ctl, e = window.__engine;
    const ms = c.chess.moves({ verbose: true });
    if (Math.random() < 0.5) { const r = await e.search(c.chess.fen(), 8, 1); if (r.lines[0]) return [r.lines[0].uci.slice(0, 2), r.lines[0].uci.slice(2, 4)]; }
    const m = ms[Math.floor(Math.random() * ms.length)]; return [m.from, m.to];
  });
  await click(f); await click(t);
}
await page.waitForSelector('.end-card', { timeout: 30000 });
await page.screenshot({ path: `${OUT}/toernooi-end.png`, fullPage: true });
const info = await page.evaluate(() => { const c = window.__ctl; return { ply: c.ply, result: c.result, perfect: c.perfect, black4: c.moves[7]?.san, moves: c.chess.history().join(' ') }; });
console.log(JSON.stringify(info, null, 1));
await page.click('.end-card .btn:not(.primary)'); // Terug na die Kelpwoud
await page.waitForSelector('.forest');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/toernooi-home-after.png` });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
