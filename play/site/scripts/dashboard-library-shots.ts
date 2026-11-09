/**
 * Intent 1b2ebc8d's c2: the dashboard at 390×844 and 1440×900 as an admin, acting as themselves (a Library tile among
 * their apps, "Your own files, private to you", and the page it opens: their personal library) and acting as Maia City
 * (the Library tile among the city's, as before), on the scratch play 732d8a38's ./library-shots.ts uses
 * (./library-scratch.ts).
 *
 *   bun run dev &                                   # the dev server, http://localhost:5173 (/api → :3911)
 *   bun scripts/dashboard-library-shots.ts [out dir]
 */
import { chromium } from 'playwright';
import { withLibrary } from './library-scratch';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/1b2ebc8d-library-tile';
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];

await withLibrary({ name: 'play_dashboard_shots', images: 6 }, async (session) => {
	const browser = await chromium.launch();
	for (const size of SIZES) {
		const w = `${size.width}x${size.height}`;
		for (const [as, file] of [['me', 'yourself'], ['maia-city', 'maia-city']] as const) {
			const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
			await ctx.addCookies([{ name: 'play_session', value: session, url: BASE }]);
			await ctx.addInitScript((a) => localStorage.setItem('play.acting', a), as);
			const p = await ctx.newPage();
			await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
			// the section the Library tile is in: your apps, or the city's
			const section = as === 'me' ? 'Your apps' : 'Maia City';
			await p.evaluate((t) => [...document.querySelectorAll('p.divider')].find((x) => x.textContent?.trim() === t)?.scrollIntoView({ block: 'start' }), section);
			await p.waitForTimeout(1000);
			await p.screenshot({ path: `${OUT}/${w}-dashboard-${file}.png` });
			const tiles = p.locator('a.tile[href="/library/"]');
			console.log(`${w} acting as ${as}: ${await tiles.count()} Library tile: ${(await tiles.first().textContent())?.trim()}`);
			await tiles.first().click();
			await p.locator('.owner b', { hasText: as === 'me' ? "Samuel's library" : "Maia City's library" }).waitFor({ timeout: 30000 });
			await p.waitForTimeout(1500);
			await p.screenshot({ path: `${OUT}/${w}-library-${file}.png` });
			await ctx.close();
		}
	}
	await browser.close();
});
