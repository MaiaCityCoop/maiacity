// The c3 walk of intent e5ddf0b2: every machine picked in turn in one page of play (avenBOX Chromium, SwiftShader WebGL),
// PLAY_MCP_TOKEN sent to play.maia.city only; BUILD=<play/site/build> serves that build in place of play's pages (/api stays live).
//   node play/shots/e5ddf0b2/walk.cjs <out dir> [https://play.maia.city] [machines]
// click through every machine in one page, as a person does; screenshot each, note the viewer's text
const { chromium } = require('playwright');
const [, , out, base = 'https://play.maia.city', group = 'machines'] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === 'play.maia.city' && process.env.BUILD && !u.pathname.startsWith('/api/')) {
      const fs = require('fs'), path = require('path');
      let f = path.join(process.env.BUILD, decodeURIComponent(u.pathname));
      for (const c of [f, path.join(f, 'index.html'), f + '.html', path.join(process.env.BUILD, '200.html')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) { f = c; break; }
      const type = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : f.endsWith('.json') ? 'application/json' : f.endsWith('.wasm') ? 'application/wasm' : undefined;
      return r.fulfill({ status: 200, body: fs.readFileSync(f), headers: type ? { 'content-type': type } : {} });
    }
    if (u.hostname === 'play.maia.city') return r.continue({ headers: { ...r.request().headers(), authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
    return r.continue();
  });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (!/bluetooth|TSL: Return|401|renamed/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
  p.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack}`.slice(0, 1500)));
  await p.goto(`${base}/${group}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  const items = await p.locator('nav a, nav button').allInnerTexts().catch(() => []);
  const links = p.locator('a[href^="#"]');
  const n = await links.count();
  for (let i = 0; i < Math.min(n, +(process.env.LIMIT || 99)); i++) {
    const l = links.nth(i);
    const name = (await l.innerText()).replace(/\s+/g, ' ').trim();
    await l.click();
    await p.waitForTimeout(+(process.env.WAIT || 12000));
    const msg = await p.locator('.empty, .error, .soft').allInnerTexts();
    const canvas = await p.locator('canvas').count();
    console.log(i, name, '|', msg.join(' / '), '| canvases', canvas);
    await p.screenshot({ path: `${out}/${String(i).padStart(2, '0')}.png` });
    if (logs.length) console.log('   ', logs.splice(0).join('\n    '));
  }
  await b.close();
})();
