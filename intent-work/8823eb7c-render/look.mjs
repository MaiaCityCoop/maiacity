// c9 of intent 8823eb7c: each of the four opened in the asset viewer (/machines/#<uuid>, its newest version), waited on
// until the viewer shows it or says why not (window.__vaultAsset: hero, error), its console errors kept, a screenshot
// taken. Prints LOOK PASSED when all four are shown with no error. Run by run.sh: node look.mjs --site <url> --out <folder>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// playwright as play/site has it (run.sh installs it there)
const { chromium } = createRequire(new URL('../../play/site/package.json', import.meta.url))('playwright');

const arg = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d);
const site = arg('--site', 'http://localhost:5191'), out = arg('--out', '.');
const FOUR = {
	'5bf0a85d-2f01-5a78-acc5-84fd63d05731': 'pickup',
	'33e29d24-08b9-40f7-b098-1ce81d37ef23': 'fiat500',
	'edbd06d9-5a01-4e57-9fbc-d0d017bf8631': 'citybus',
	'53d1af5a-bbcf-4eba-9fe0-3a147baedd34': 'deliveryvan'
};
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const report = { renderer: null, assets: [] };
let errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
for (const [id, name] of Object.entries(FOUR)) {
	errors = [];
	await page.goto(`${site}/machines/#${id}`, { waitUntil: 'domcontentloaded' });
	const t0 = Date.now();
	let state = null;
	while (Date.now() - t0 < 120_000) {
		state = await page.evaluate(() => { const v = window.__vaultAsset; return v ? { shown: !!v.hero && !v.building, error: v.error || '' } : null; }).catch(() => null);
		if (state && (state.shown || state.error)) break;
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(3000);
	report.renderer ??= await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c?.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : null; });
	await page.screenshot({ path: join(out, `${name}.png`) });
	const ok = !!state?.shown && !state.error && !errors.some((e) => /uniform|WeakMap|texture|no asset/i.test(e));
	report.assets.push({ id, name, ok, error: state?.error ?? 'never shown', console: errors.slice(0, 8) });
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${id})${ok ? '' : `: ${state?.error || 'never shown'} ${errors[0] ?? ''}`}`);
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log('renderer:', report.renderer);
// the verdict is the report's and this line's; the job itself ends 0 so its folder is always complete
console.log(report.assets.every((a) => a.ok) ? 'LOOK PASSED' : 'LOOK FAILED');
