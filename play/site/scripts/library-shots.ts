/**
 * Intent 732d8a38's c5: the Library at 390×844 and 1440×900 as an admin, acting as themselves (their personal library,
 * the owner named on top, only their own files) and acting as Maia City (the coop's files, as before), on a scratch
 * play (./library-scratch.ts).
 *
 *   bun run dev &                                   # the dev server, http://localhost:5173 (/api → :3911)
 *   bun scripts/library-shots.ts [out dir]
 */
import { chromium } from 'playwright';
import { withLibrary } from './library-scratch';

const BASE = process.env.SITE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../shots/732d8a38-personal';
const SIZES = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];

await withLibrary({ name: 'play_library_shots', images: 12 }, async (session) => {
	const browser = await chromium.launch();
	for (const size of SIZES) {
		const w = `${size.width}x${size.height}`;
		for (const [as, file] of [['me', 'yourself'], ['maia-city', 'maia-city']] as const) {
			const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
			await ctx.addCookies([{ name: 'play_session', value: session, url: BASE }]);
			await ctx.addInitScript((a) => localStorage.setItem('play.acting', a), as);
			const p = await ctx.newPage();
			await p.goto(`${BASE}/library/`, { waitUntil: 'networkidle' });
			await p.locator('.owner b', { hasText: as === 'me' ? "Samuel's library" : "Maia City's library" }).waitFor({ timeout: 30000 });
			await p.waitForTimeout(1500);
			await p.screenshot({ path: `${OUT}/${w}-library-${file}.png` });
			console.log(`${w} acting as ${as}: ${await p.locator('.tile').count()} files`);
			await ctx.close();
		}
	}
	await browser.close();
});
