/**
 * The intent's detail, stage by stage, as screenshots (intent bb3b0773's c4): the dev server's board opened on a fixture
 * intent at each stage (src/lib/site/intents/fixtures.ts), play's API answered by the fixtures, at 390×844 and 1440×900.
 *
 *   bun run dev &                                  # the dev server, http://localhost:5173
 *   bun scripts/intent-shots.ts [out dir]          # 14 PNGs, <stage>-<width>.png
 */
import { chromium } from 'playwright';
import { BRIEF, FIXTURES } from '../src/lib/site/intents/fixtures';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/bb3b0773-detail';
const STAGES = ['idea', 'specify', 'build', 'proposal-code', 'proposal-work', 'ship', 'accepted'];
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];
const ME = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const all = Object.values(FIXTURES);

const browser = await chromium.launch();
for (const size of SIZES) {
	const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
	await page.addInitScript(() => localStorage.setItem('play:intents:folded', '{}'));
	await page.route('**/api/**', (route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
		const one = path.match(/^\/intents\/([0-9a-f-]{36})$/);
		const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
		if (path === '/me') return json(ME);
		if (path === '/intents') return json(all);
		if (one) {
			const i = all.find((x) => x.id === one[1]);
			return i ? json({ ...i, brief: ['accepted', 'archived', 'ship'].includes(i.stage) ? null : BRIEF, review: null }) : json({ error: 'not found' }, 404);
		}
		if (path.startsWith('/docs')) return json([]);
		return json({ error: 'not in the fixtures' }, 404);
	});
	for (const stage of STAGES) {
		const i = FIXTURES[stage];
		// the board opened, every column open, the intent's card tapped
		await page.goto(`${BASE}/intents/`);
		await page.locator('.card .open', { hasText: i.title }).click({ timeout: 60000 });
		await page.locator('.item-review').waitFor();
		await page.waitForTimeout(400);
		await page.screenshot({ path: `${OUT}/${stage}-${size.width}.png` });
	}
	await page.close();
}
await browser.close();
console.log(`${STAGES.length * SIZES.length} screenshots in ${OUT}`);
