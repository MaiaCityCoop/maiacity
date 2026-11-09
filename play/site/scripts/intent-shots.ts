/**
 * The intent's detail, stage by stage, as screenshots (intent bb3b0773's c4): the dev server's board opened on a fixture
 * intent at each stage (src/lib/site/intents/fixtures.ts), play's API answered by the fixtures, at 390×844, 820×1180 (a tablet) and 1440×900.
 *
 *   bun run dev &                                  # the dev server, http://localhost:5173
 *   bun scripts/intent-shots.ts [out dir]          # <stage>-<width>.png, and each asset upgrade's review drawn
 *
 * The asset upgrades (fixtures.ts ASSETS) are drawn from play's own files, and so is the story played in its Changes
 * tab (fixtures.ts STORIES, intent 668e9ffd): the catalog and the files are read from play.maia.city with
 * PLAY_MCP_TOKEN (its read-only routes, the header sent to play only).
 */
import { chromium } from 'playwright';
import { HEX } from '../src/lib/kernel/hash.js';
import { ASSETS, BRIEF, FIXTURES, STORIES } from '../src/lib/site/intents/fixtures';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/bb3b0773-detail';
const ONLY = process.env.ONLY;
const STAGES = ['idea', 'specify', 'build', 'proposal-code', 'proposal-work', 'ship', 'accepted', ...Object.keys(ASSETS), ...Object.keys(STORIES)];
const PLAY = 'https://play.maia.city';
const TOKEN = process.env.PLAY_MCP_TOKEN;
const fromPlay = async (path: string) => {
	if (!TOKEN) throw new Error('PLAY_MCP_TOKEN is not set: the asset upgrades are drawn from play');
	return fetch(`${PLAY}/api${path}`, { headers: { authorization: `Bearer ${TOKEN}` } });
};
const catalogRows: any[] = await (await fromPlay('/catalog')).json();
const rowsOf = (hashes: readonly string[]) => hashes.map((h, n) => ({ ...catalogRows.find((r) => r.hash === h), first: n === 0 }));
const assetOf = (stage: string) => (stage in ASSETS ? ASSETS[stage as keyof typeof ASSETS] : undefined);
const storyOf = (stage: string) => (stage in STORIES ? STORIES[stage as keyof typeof STORIES] : undefined);
const reviewOf = (stage: string) => {
	const s = storyOf(stage);
	if (s) return { id: FIXTURES[stage].id, story: s.story, baseStory: null, diff: { title: null, settings: [], tracks: [] }, edits: [], changes: [] };
	const a = assetOf(stage);
	if (!a) return null;
	const w = FIXTURES[stage].work!;
	return { doc: { id: a.asset, kind: 'asset', what: 'asset', label: w.label, open: null }, seedNumber: a.base.number, moved: false, changes: [], edits: [], id: FIXTURES[stage].id, source: a.source, recipe: a.recipes[0], baseVersion: a.base, builds: rowsOf(a.recipes) };
};
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 820, height: 1180 },
	{ width: 1440, height: 900 }
];
const ME = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const all = Object.values(FIXTURES);

async function quiet(page: import('playwright').Page, stage: string, width: number) {
	await page.waitForTimeout(1500);
	const busy = page.getByText(/^(Building|Preparing|Drawing) .*…$/);
	for (let still = 0, t = Date.now(); still < 3 && Date.now() - t < 300000; ) {
		await page.waitForTimeout(1000);
		still = (await busy.count()) ? 0 : still + 1;
	}
	if (await busy.count()) console.log(`${stage} ${width}: still busy after 5 minutes: ${await busy.first().textContent()}`);
	await page.waitForTimeout(2000);
}

// CHANNEL=chrome uses the Chrome installed on the machine where Playwright's own browser isn't downloaded
const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
for (const size of SIZES.filter((x) => !process.env.WIDTH || x.width === +process.env.WIDTH)) {
	const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
	await page.addInitScript(() => localStorage.setItem('play:intents:folded', '{}'));
	await page.route('**/api/**', async (route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
		const one = path.match(/^\/intents\/([0-9a-f-]{36})$/);
		const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
		if (path === '/me') return json(ME);
		if (path === '/catalog') return json(catalogRows);
		if (new RegExp(`^/files/${HEX}$`).test(path)) {
			const r = await fromPlay(path);
			return route.fulfill({ status: r.status, contentType: r.headers.get('content-type') ?? 'application/octet-stream', body: Buffer.from(await r.arrayBuffer()) });
		}
		if (path === '/intents') return json(all);
		if (one) {
			const i = all.find((x) => x.id === one[1]);
			return i ? json({ ...i, brief: ['accepted', 'archived', 'ship'].includes(i.stage) ? null : BRIEF, review: reviewOf(Object.keys(FIXTURES).find((k) => FIXTURES[k].id === i.id)!) }) : json({ error: 'not found' }, 404);
		}
		if (path.startsWith('/docs')) return json([]);
		return json({ error: 'not in the fixtures' }, 404);
	});
	for (const stage of STAGES.filter((x) => !ONLY || x === ONLY)) {
		const i = FIXTURES[stage];
		await page.goto(`${BASE}/intents/`);
		await page.locator('.card .open', { hasText: i.title }).click({ timeout: 60000 });
		await page.locator('.item-review').waitFor();
		await page.waitForTimeout(400);
		// an asset upgrade opens on its Changes tab, the asset drawn inline: shot once it is drawn
		if (assetOf(stage)) await quiet(page, stage, size.width);
		// a story opens on its Changes tab, played in the Stories player: shot once its first frame is in
		if (storyOf(stage)) {
			await page.locator('.inline-story .player').waitFor({ timeout: 60000 });
			await page.waitForTimeout(3000);
		}
		await page.screenshot({ path: `${OUT}/${stage}-${size.width}.png` });
		// on a phone and a tablet the picture fills the tab: the controls and the timeline are below it, scrolled to
		if (storyOf(stage) && size.width < 900) {
			await page.locator('.inline-story + .btn').scrollIntoViewIfNeeded();
			await page.waitForTimeout(800);
			await page.screenshot({ path: `${OUT}/${stage}-timeline-${size.width}.png` });
		}
		if (!assetOf(stage)) continue;
		// its work opened from the Changes tab: the asset built in the asset box, as the board draws it
		await page.locator('.linked .open').click();
		await page.locator('.review:not(.item-review) canvas').first().waitFor({ timeout: 90000 });
		await quiet(page, stage, size.width);
		await page.waitForTimeout(3000);
		await page.screenshot({ path: `${OUT}/${stage}-review-${size.width}.png` });
	}
	await page.close();
}
await browser.close();
console.log(`${STAGES.length * SIZES.length} screenshots in ${OUT}`);
