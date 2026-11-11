// WHAT EVERY SCREENSHOT AND PAGE CHECK SHARES (intent 42a96129's reduce): the site it opens, the two screens it is
// looked at on, and who is signed in. Six scripts each carried their own copy before.

/** the site: the dev server unless SITE names another */
export const SITE = process.env.SITE ?? 'http://localhost:5173';
/** the screens a page is looked at on: a phone and a desktop (and a tablet where a script asks for it) */
export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 820, height: 1180 };
export const DESKTOP = { width: 1440, height: 900 };
/** who is signed in, as `/api/me` answers: an admin, and a member who is none */
export const ADMIN = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
export const TRAVELER = { id: '00000000-0000-4000-8000-000000000002', name: 'A traveler', level: 'traveler', may: {} };

/**
 * Chromium for a page check, fetched where the box has none (GitHub's box job installs no browser; a cloud session's
 * box brings one): Playwright's own, and failing that the machine's Chrome.
 */
export async function chromiumHere(options: import('playwright').LaunchOptions = {}) {
	const { chromium } = await import('playwright');
	try {
		return await chromium.launch(options);
	} catch (e) {
		if (!/Executable doesn't exist/.test(String(e))) throw e;
	}
	console.log("no Chromium here: fetching Playwright's …");
	const fetched = Bun.spawnSync(['bunx', 'playwright', 'install', 'chromium'], { cwd: `${import.meta.dir}/../..`, stdout: 'pipe', stderr: 'pipe' });
	if (fetched.exitCode !== 0) console.log(fetched.stderr.toString().slice(-600));
	try {
		return await chromium.launch(options);
	} catch (e) {
		console.log(`Playwright's Chromium did not start (${String(e).split('\n')[0]}): the machine's Chrome instead`);
		return chromium.launch({ ...options, channel: 'chrome' });
	}
}
