// c4 of intent 4a199916: Sandbox 5 in avenBOX's Chromium (software GL), its forest grown, every "did not grow" counted
const { chromium } = require('playwright');
const [out, base] = [process.argv[2], process.argv[3] || 'https://play.maia.city'];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  // play's token to play only
  await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.host === 'play.maia.city') r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } }); else r.continue(); });
  const p = await ctx.newPage();
  const grew = [];
  p.on('console', (m) => { const t = m.text(); if (/did not grow/.test(t)) grew.push(t); });
  p.on('pageerror', (e) => console.log('page error:', e.message));
  await p.goto(`${base}/sandbox-5/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const t0 = Date.now();
  // until it has stopped planting and growing (the loading line gone), at most 15 minutes
  for (;;) {
    const body = await p.innerText('body');
    if (!/Planting|Growing|Building|Loading/i.test(body) && await p.evaluate(() => !!window.__walker)) break;
    if (Date.now() - t0 > 900000) { console.log('still loading after 15 min'); break; }
    await p.waitForTimeout(5000);
  }
  console.log(`ready in ${Math.round((Date.now() - t0) / 1000)} s`);
  await p.waitForTimeout(10000);
  await p.screenshot({ path: `${out}-open.png`, timeout: 300000 });
  for (const [name, x, z, yaw, pitch] of [['in-north', 0, 18, 0, -0.08], ['in-south', 0, -18, Math.PI, -0.08], ['in-east', 18, 0, Math.PI / 2, -0.08], ['in-west', -18, 0, -Math.PI / 2, -0.08]]) {
    await p.evaluate(([x, z, yaw, pitch]) => window.__walker.place(x, z, yaw, pitch), [x, z, yaw, pitch]);
    await p.waitForTimeout(20000);
    await p.screenshot({ path: `${out}-${name}.png`, timeout: 300000 });
  }
  console.log(`did not grow: ${grew.length}`);
  for (const g of grew.slice(0, 50)) console.log('  ' + g);
  await b.close();
})();
