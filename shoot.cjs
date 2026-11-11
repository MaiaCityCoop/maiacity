// node shoot.cjs shots.json outdir [size]: each shot {name, file, id, v, variant?, values, camera}
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [shotsF, out, size = '600'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: +size, height: +size } });
  p.on('pageerror', (e) => console.error('pageerror', e.message)); await p.goto('http://localhost:7788/?size=' + size); await p.waitForFunction('window.ready');
  for (const s of JSON.parse(fs.readFileSync(shotsF, 'utf8'))) { const t = Date.now(); const r = await p.evaluate((s) => window.bench(s), s); await p.locator('canvas').screenshot({ path: `${out}/${s.name}.png` }); console.log(s.name, JSON.stringify(r), ((Date.now() - t) / 1000).toFixed(1) + 's'); }
  await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
