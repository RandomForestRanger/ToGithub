// Browser smoke test: plays full rounds in headless Chrome against the real Stockfish worker.
// Usage: npx vite preview --port 4173 &  then  node tools/smoke.mjs [rounds] [http://localhost:4173]
import { chromium } from 'playwright-core';

const ROUNDS = Number(process.argv[2] || 2);
const URL = process.argv[3] || 'http://localhost:4173';
const OUT = process.env.SMOKE_OUT || '.';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL);
await page.waitForSelector('.forest');
await page.screenshot({ path: `${OUT}/smoke-home.png` });

const click = sq => page.click(`[data-boardid="main"] [data-square="${sq}"]`, { force: true });

let shotPopup = false;
for (let r = 0; r < ROUNDS; r++) {
  await page.click('button:has-text("Begin rondte")');
  await page.waitForSelector('.sea-chart', { timeout: 20000 });
  if (r === 0) await page.screenshot({ path: `${OUT}/smoke-intro.png` });
  await page.click('button:has-text("Gooi die lokaas")');
  try { await page.waitForSelector('[data-boardid="main"] [data-square="e2"]', { timeout: 10000 }); }
  catch (e) {
    await page.screenshot({ path: `${OUT}/smoke-fail.png` });
    console.log('screen html:', (await page.content()).slice(0, 600), errors);
    throw e;
  }

  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => {
      const c = window.__ctl;
      return c ? { over: !!c.result || c.phase === 'over', turn: c.chess.turn(), thinking: c.thinking } : null;
    });
    if (!st || st.over) break;
    if (st.turn !== 'w' || st.thinking) { await page.waitForTimeout(150); continue; }
    // pick a move: canon toward the target on the chart (sometimes a random canon or legal move),
    // otherwise Stockfish depth 10 (STRONG=1) or a random legal move
    const mv = await page.evaluate(async strong => {
      const c = window.__ctl;
      const legal = c.chess.moves({ verbose: true });
      const entry = ['e4', 'Nf3', 'Bc4', 'b4'];
      if (c.phase === 'entry') { const m = legal.find(m => m.san === entry[c.ply / 2]); return [m.from, m.to]; }
      const x = Math.random();
      if (strong && x < 0.85) {
        const r = await window.__engine.search(c.chess.fen(), 10, 1);
        const u = r.lines[0].uci; return [u.slice(0, 2), u.slice(2, 4)];
      }
      const m = legal[Math.floor(Math.random() * legal.length)];
      return [m.from, m.to];
    }, !!process.env.STRONG);
    if (!shotPopup && await page.$('.popup')) { shotPopup = true; await page.screenshot({ path: `${OUT}/smoke-popup.png` }); }
    await click(mv[0]);
    await click(mv[1]);
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => window.__ctl && window.__ctl.result, null, { timeout: 60000 });
  const res = await page.evaluate(() => {
    const c = window.__ctl;
    return { target: c.startTarget, plies: c.ply, result: c.result,
             scored: c.moves.filter(m => m.ply % 2 === 0 && m.points !== undefined).length, steamPts: c.steam.length };
  });
  console.log(`round ${r + 1}:`, JSON.stringify(res));
  await page.screenshot({ path: `${OUT}/smoke-game-${r + 1}.png` });
  await page.waitForSelector('.end-card', { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/smoke-end-${r + 1}.png` });
  await page.click('button:has-text("Terug na die Kelpwoud")');
  await page.waitForSelector('.forest');
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: `${OUT}/smoke-home-after.png` });
const store = await page.evaluate(() => localStorage.getItem('stoomdruk.v1'));
console.log('store lines:', Object.keys(JSON.parse(store || '{}').lines || {}).length);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
