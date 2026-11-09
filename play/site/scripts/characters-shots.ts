/**
 * Intent 89f3ad37's c4: the Characters app as an admin and as a traveler, and Animals, at 390×844 and 1440×900, the
 * people drawn from play's own accepted files. The dev server's API is answered from play.maia.city's read-only routes
 * with PLAY_MCP_TOKEN (the header sent to play only), with one fixture: Stand-in and Elder woman shown in the group
 * `characters`, as they will be once their move (intent e03d7a44) is accepted. Nothing is written anywhere.
 *
 *   bun run dev &                                     # the dev server, http://localhost:5173
 *   bun scripts/characters-shots.ts [out dir]
 */
import { chromium, type Page } from 'playwright';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/89f3ad37-characters';
const PLAY = 'https://play.maia.city';
const TOKEN = process.env.PLAY_MCP_TOKEN;
if (!TOKEN) throw new Error('PLAY_MCP_TOKEN is not set: the people are drawn from play');
/** the people, by their UUIDs: Stand-in and Elder woman */
const PEOPLE = new Set(['8ff16823-d2eb-506c-9705-0feba7cf989e', '682d0d05-2196-5c4d-9fb5-5acd7ebfb17f']);
const ADMIN = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const TRAVELER = { id: '00000000-0000-4000-8000-000000000002', name: 'A traveler', level: 'traveler', may: {} };
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];

/** the fixture: wherever a row names one of the people, its group is characters */
function moved(x: any): any {
	if (Array.isArray(x)) return x.map(moved);
	if (!x || typeof x !== 'object') return x;
	const out: any = {};
	for (const [k, v] of Object.entries(x)) out[k] = moved(v);
	if (PEOPLE.has(out.id) || PEOPLE.has(out.asset)) {
		if (out.grp === 'actors') out.grp = 'characters';
		if (out.group === 'actors') out.group = 'characters';
	}
	return out;
}

async function answered(page: Page, me: object) {
	await page.route('**/api/**', async (route) => {
		const url = new URL(route.request().url());
		const path = url.pathname.replace(/^\/api/, '');
		if (path === '/me') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) });
		if (route.request().method() !== 'GET') return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"read only"}' });
		const r = await fetch(`${PLAY}/api${path}${url.search}`, { headers: { authorization: `Bearer ${TOKEN}` } });
		const type = r.headers.get('content-type') ?? 'application/octet-stream';
		if (type.includes('json')) return route.fulfill({ status: r.status, contentType: type, body: JSON.stringify(moved(await r.json())) });
		return route.fulfill({ status: r.status, contentType: type, body: Buffer.from(await r.arrayBuffer()) });
	});
}

/** drawn once its build is done: no "Building …", "Preparing …" or "Drawing …" note left for 3 s, polled */
async function quiet(page: Page, what: string) {
	await page.waitForTimeout(1500);
	const busy = page.getByText(/^(Building|Preparing|Drawing) .*…$/);
	for (let still = 0, t = Date.now(); still < 3 && Date.now() - t < 300000; ) {
		await page.waitForTimeout(1000);
		still = (await busy.count()) ? 0 : still + 1;
	}
	if (await busy.count()) console.log(`${what}: still busy after 5 minutes: ${await busy.first().textContent()}`);
	await page.waitForTimeout(2000);
}

const browser = await chromium.launch();
for (const size of SIZES) {
	const w = `${size.width}x${size.height}`;
	for (const [who, me] of [['admin', ADMIN], ['traveler', TRAVELER]] as const) {
		const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
		await answered(page, me);
		await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
		await page.getByText('Your apps').scrollIntoViewIfNeeded();
		await page.evaluate(() => [...document.querySelectorAll('p')].find((x) => x.textContent?.trim() === 'Your apps')?.scrollIntoView({ block: 'start' }));
		await page.waitForTimeout(800);
		await page.screenshot({ path: `${OUT}/${w}-${who}-dashboard.png` });
		// /characters/: the traveler is sent back home
		await page.goto(`${BASE}/characters/`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(1500);
		if (who === 'traveler') {
			console.log(`${w} traveler /characters/ → ${new URL(page.url()).pathname}`);
			await page.screenshot({ path: `${OUT}/${w}-traveler-characters.png` });
			await page.close();
			continue;
		}
		// each person picked and fully built
		for (const [id, name] of [['8ff16823-d2eb-506c-9705-0feba7cf989e', 'stand-in'], ['682d0d05-2196-5c4d-9fb5-5acd7ebfb17f', 'elder-woman']]) {
			await page.goto(`${BASE}/characters/#${id}`, { waitUntil: 'networkidle' });
			await page.locator('canvas').first().waitFor({ timeout: 120000 });
			await quiet(page, `${w} ${name}`);
			await page.screenshot({ path: `${OUT}/${w}-admin-characters-${name}.png` });
		}
		// the list of people, and of animals (on a phone, the list opened)
		for (const app of ['characters', 'animals']) {
			await page.goto(`${BASE}/${app}/`, { waitUntil: 'networkidle' });
			await page.locator('canvas').first().waitFor({ timeout: 120000 });
			await quiet(page, `${w} ${app}`);
			if (size.width < 600) {
				await page.mouse.click(36, 811);
				await page.waitForTimeout(800);
			}
			await page.screenshot({ path: `${OUT}/${w}-admin-${app}${size.width < 600 ? '-list' : ''}.png` });
		}
		await page.close();
	}
}
await browser.close();
