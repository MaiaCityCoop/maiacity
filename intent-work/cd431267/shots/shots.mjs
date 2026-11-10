// node shots.mjs <tag> : the rabbit's, the tomato's and the LifeTrac's viewers at 390×844 and 1440×900
import { chromium } from '/home/user/maiacity/play/site/node_modules/playwright/index.mjs';
const tag = process.argv[2];
const BASE = 'http://localhost:5173';
const ASSETS = [['rabbit', '/animals/#aa8a56ec-8d79-5208-b130-3e164e2afa22'], ['tomato', '/plants/#714b2deb-c718-55e6-b2bb-f279d9bf13ed'], ['lifetrac', '/machines/#4548aeef-53b4-5d1d-abd6-cca7a0231761']];
const SIZES = [{ width: 390, height: 844, phone: true }, { width: 1440, height: 900 }];
const only = process.argv[3];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const s of SIZES) for (const [name, path] of ASSETS) {
  if (only && only !== name) continue;
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 2, isMobile: !!s.phone, hasTouch: !!s.phone });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(name, 'pageerror', e.message));
  await p.goto(BASE + path, { waitUntil: 'load', timeout: 120000 });
  await p.locator('.turntable canvas').first().waitFor({ timeout: 120000 }).catch(() => console.log(name, 'no canvas'));
  await p.waitForFunction(() => !document.querySelector('.canvas-note'), null, { timeout: 180000 }).catch(() => console.log(name, 'still building'));
  await p.waitForTimeout(4000);
  const out = `shots/${tag}-${s.width}x${s.height}-${name}.png`;
  await p.screenshot({ path: out, timeout: 300000 });
  console.log(out);
  await ctx.close();
}
await browser.close();
