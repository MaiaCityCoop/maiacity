// The dry run's fixture: a job that does what a good one does, with no world (no goto).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.addInitScript({ content: 'window.__ready = 1' });
const t = Date.now();
while (Date.now() < t + 60_000) await page.waitForTimeout(2000);
await page.evaluate(() => window.__world.film.advance(1));
await page.screenshot({ path: `${process.env.DRY_STATE}/shot.png` });
await browser.close();
