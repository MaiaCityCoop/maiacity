/**
 * Intent 4d47a98c's c2: the Stories player with story 60f6da00-979d-89e4-b1e5-53667ba41fe4 ("Every city you know is
 * built on concrete…", with its linked trailer) at 1440×900 and 390×844, its lanes scrolled to the top and to the
 * bottom, the picture's and the timeline's heights in px printed. The dev server's API is answered from play.maia.city's
 * read-only routes with PLAY_MCP_TOKEN (the header sent to play only); nothing is written anywhere.
 *
 *   bun run dev &                                         # the dev server, http://localhost:5173
 *   bun scripts/story-room-shots.ts <main|branch> [out dir]
 */
import { chromium, type Page } from 'playwright';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const LABEL = process.argv[2] ?? 'branch';
const OUT = process.argv[3] ?? '../shots/4d47a98c-story-room';
const PLAY = 'https://play.maia.city';
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN is not set: the story is drawn from play');
const STORY = '60f6da00-979d-89e4-b1e5-53667ba41fe4';
const ME = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const SIZES = [
	{ width: 1440, height: 900 },
	{ width: 390, height: 844 }
];

/** a read over play's MCP: the token opens no /api/stories, so the stories are read as get_story and list_stories give them */
async function mcp(name: string, args: object) {
	const r = await fetch(`${PLAY}/api/mcp`, {
		method: 'POST',
		headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
	});
	return JSON.parse((await r.json()).result.content[0].text);
}
const story = await mcp('get_story', { story: STORY, links: true });
const list = [{ id: story.id, title: story.title, format: story.format, duration: story.duration }];

async function answered(page: Page) {
	await page.route('**/api/**', async (route) => {
		const url = new URL(route.request().url());
		const path = url.pathname.replace(/^\/api/, '');
		if (path === '/me') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME) });
		if (path === '/stories') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
		if (path === `/stories/${STORY}`) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(story) });
		if (route.request().method() !== 'GET') return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"read only"}' });
		const r = await fetch(`${PLAY}/api${path}${url.search}`, { headers: { authorization: `Bearer ${TOKEN}` } });
		const type = r.headers.get('content-type') ?? 'application/octet-stream';
		return route.fulfill({ status: r.status, contentType: type, body: Buffer.from(await r.arrayBuffer()) });
	});
}

const browser = await chromium.launch();
for (const size of SIZES) {
	const w = `${size.width}x${size.height}`;
	const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2, hasTouch: size.width < 600 });
	await answered(page);
	await page.goto(`${BASE}/stories/#${STORY}`, { waitUntil: 'networkidle' });
	await page.locator('.lanes .playhead').waitFor({ timeout: 60000 });
	await page.waitForTimeout(2500);
	const m = await page.evaluate(() => {
		const h = (s: string) => Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? 0);
		const sc = document.querySelector('.lanes-scroll') as HTMLElement | null;
		return { picture: h('.screen'), timeline: h('.timeline'), lanesContent: sc?.scrollHeight ?? h('.lanes'), lanesShown: sc?.clientHeight ?? h('.lanes'), pageScrolls: document.scrollingElement!.scrollHeight > innerHeight };
	});
	console.log(`${LABEL} ${w}: picture ${m.picture}px, timeline ${m.timeline}px (lanes ${m.lanesShown}px shown of ${m.lanesContent}px)`);
	// the timeline in sight (on a phone it is below the picture)
	await page.locator('.timeline').evaluate((el) => el.scrollIntoView({ block: 'center' }));
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${OUT}/${LABEL}-${w}.png` });
	if (LABEL !== 'main') {
		await page.locator('.lanes-scroll').evaluate((el) => (el.scrollTop = el.scrollHeight));
		await page.waitForTimeout(400);
		await page.screenshot({ path: `${OUT}/${LABEL}-${w}-lanes-bottom.png` });
	}
	await page.close();
}
await browser.close();
