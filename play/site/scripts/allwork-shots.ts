/**
 * An intent holding all its work (intent 7c8986c5's c4): the dev server's board opened on the fixture intent at Proposal
 * with two assets and a pull request (src/lib/site/intents/fixtures.ts 'proposal-all'), its Changes tab listing both
 * assets and the pull request, its decision Accept and ship; play's API answered by the fixtures, nothing read from play.
 *
 *   bun run dev &                                   # the dev server, http://localhost:5173
 *   bun scripts/allwork-shots.ts [out dir]          # proposal-all-<width>.png at 390×844 and 1440×900
 */
import { chromium } from 'playwright';
import { ALL_WORK_DOCS, BRIEF, FIXTURES } from '../src/lib/site/intents/fixtures';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/7c8986c5-all-work';
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];
const ME = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const all = Object.values(FIXTURES);
const i = FIXTURES['proposal-all'];

const browser = await chromium.launch();
for (const size of SIZES) {
	const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
	await page.addInitScript(() => localStorage.setItem('play:intents:folded', '{}'));
	await page.route('**/api/**', async (route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
		const one = path.match(/^\/intents\/([0-9a-f-]{36})$/);
		const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
		if (path === '/me') return json(ME);
		if (path === '/catalog') return json([]);
		if (path === '/intents') return json(all);
		if (one) {
			const x = all.find((y) => y.id === one[1]);
			if (!x) return json({ error: 'not found' }, 404);
			const review = x.id === i.id ? { ...ALL_WORK_DOCS[0], id: x.id, docs: ALL_WORK_DOCS } : null;
			return json({ ...x, brief: ['accepted', 'archived', 'ship'].includes(x.stage) ? null : BRIEF, review });
		}
		if (path.startsWith('/docs')) return json([]);
		return json({ error: 'not in the fixtures' }, 404);
	});
	await page.goto(`${BASE}/intents/`);
	await page.locator('.card .open', { hasText: i.title }).click({ timeout: 60000 });
	await page.locator('.item-review').waitFor();
	await page.getByText('Elder woman').first().waitFor({ timeout: 30000 });
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${OUT}/proposal-all-${size.width}.png` });
	await page.close();
}
await browser.close();
console.log(`${SIZES.length} screenshots in ${OUT}`);
