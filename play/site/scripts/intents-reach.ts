/**
 * An intent's decision is always in reach (intent 96206162, its c2): the site's dev server started here, play's API
 * answered by the fixtures (src/lib/site/intents/fixtures.ts), the board opened on an intent at Specify and one at
 * Proposal, at a phone held wide and upright and a desktop. Its decision, Reject and the tabs must be inside the screen,
 * on top where they stand (elementFromPoint), with something opaque behind them inside the sheet, over no text of the
 * detail; the decision clickable, and the open tab's last line scrollable into sight. Exits 1 on any failure.
 *
 *   cd play/site && bun scripts/intents-reach.ts [shots dir]
 */
import { chromium, type Page } from 'playwright';
import { BRIEF, FIXTURES } from '../src/lib/site/intents/fixtures';

const SHOTS = process.argv[2];
const SIZES = [
	{ width: 844, height: 390 },
	{ width: 932, height: 430 },
	{ width: 932, height: 360 }, // Safari's bars shown
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 }
];
const STAGES = ['specify', 'proposal-code'];
const ME = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
const all = Object.values(FIXTURES);

// the dev server on a free port, ready once it answers
const free = Bun.serve({ port: 0, fetch: () => new Response() });
const PORT = free.port;
free.stop(true);
const dev = Bun.spawn(['bunx', 'vite', 'dev', '--port', String(PORT), '--strictPort'], { cwd: import.meta.dir + '/..', stdout: 'ignore', stderr: 'ignore' });
const BASE = `http://localhost:${PORT}`;
for (let t = Date.now(); ; ) {
	if (await fetch(BASE).then((r) => r.ok, () => false)) break;
	if (Date.now() - t > 120000) { dev.kill(); throw new Error('the dev server did not answer in 2 minutes'); }
	await Bun.sleep(500);
}

async function api(page: Page) {
	await page.route('**/api/**', (route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
		const one = path.match(/^\/intents\/([0-9a-f-]{36})$/);
		const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
		if (path === '/me') return json(ME);
		if (path === '/intents') return json({ intents: all, next: null, counts: {} });
		if (one) {
			const i = all.find((x) => x.id === one[1]);
			return i ? json({ ...i, brief: BRIEF, review: null }) : json({ error: 'not found' }, 404);
		}
		if (path === '/catalog' || path.startsWith('/docs')) return json([]);
		return json({ error: 'not in the fixtures' }, 404);
	});
}

/** what is wrong with this element where it stands: outside the screen, covered, see-through, or over the detail's text */
const wrongWith = (el: Element, textToo: boolean) => {
	const r = el.getBoundingClientRect();
	const out: string[] = [];
	if (r.width < 1 || r.height < 1) return ['not drawn'];
	if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) out.push(`outside the screen (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.right)}×${Math.round(r.bottom)} in ${innerWidth}×${innerHeight})`);
	// covered: every probe point inside it must hit it or what it holds
	const probes = [[0.5, 0.5], [0.12, 0.25], [0.88, 0.25], [0.12, 0.75], [0.88, 0.75]];
	for (const [x, y] of probes) {
		const px = r.left + r.width * x, py = r.top + r.height * y;
		if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) continue;
		const hit = document.elementFromPoint(px, py);
		if (!hit || !(hit === el || el.contains(hit))) { out.push(`covered at ${Math.round(px)},${Math.round(py)} by ${hit?.tagName.toLowerCase()}.${(hit as HTMLElement | null)?.className ?? ''}`); break; }
	}
	// opaque: something fully opaque behind it, at the latest the sheet; with no text of the detail under it (below),
	// nothing of the detail shows through
	const sheet = el.closest('.item-review');
	const alpha = (c: string) => { const v = c.match(/rgba?\(([^)]+)\)/)?.[1].split(/[ ,/]+/).filter(Boolean) ?? []; return v.length === 0 ? 0 : v.length > 3 ? parseFloat(v[3]) : 1; };
	let opaque = false;
	for (let n: Element | null = el; n && !opaque; n = n === sheet ? null : n.parentElement) opaque = alpha(getComputedStyle(n).backgroundColor) >= 1;
	if (!opaque) out.push('see-through: nothing opaque behind it inside the sheet');
	// over no text of the detail: no text of the top or the open tab's panel drawn under its box
	// (the tabs' band sticks over the text scrolled under it, opaque: only the decision's foot never may)
	const content = sheet && textToo ? [...sheet.querySelectorAll('.top, .panel, .review-head')] : [];
	for (const c of content) {
		const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
		for (let t = walker.nextNode(); t; t = walker.nextNode()) {
			if (!t.textContent?.trim()) continue;
			const range = document.createRange();
			range.selectNodeContents(t);
			for (const b of range.getClientRects()) {
				const hidden = (() => { // text scrolled out of its scroller is clipped, not under the button
					for (let p = t.parentElement; p && p !== sheet; p = p.parentElement) {
						const s = getComputedStyle(p);
						if (/(auto|scroll|hidden)/.test(s.overflowY)) { const pr = p.getBoundingClientRect(); if (b.bottom <= pr.top || b.top >= pr.bottom) return true; }
					}
					return false;
				})();
				if (hidden) continue;
				if (b.right > r.left && b.left < r.right && b.bottom > r.top + 1 && b.top < r.bottom - 1) { out.push(`over the detail's text "${t.textContent.trim().slice(0, 40)}"`); break; }
			}
			if (out.some((o) => o.startsWith('over'))) break;
		}
	}
	return out;
};

// a fresh runner has Playwright's package but not its browser: fetched once, with what it needs (as bench-smoke.sh)
const browser = await chromium.launch().catch(async () => {
	const got = Bun.spawnSync(['bunx', 'playwright', 'install', '--with-deps', 'chromium-headless-shell'], { cwd: import.meta.dir + '/..', stdout: 'inherit', stderr: 'inherit' });
	if (!got.success) { dev.kill(); throw new Error('Playwright could not install its browser'); }
	return chromium.launch();
});
const failures: string[] = [];
let checked = 0;
for (const size of SIZES) {
	const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1, hasTouch: size.width < 1000, isMobile: size.width < 1000 });
	await page.addInitScript(() => localStorage.setItem('play:intents:folded', '{}'));
	await api(page);
	for (const stage of STAGES) {
		const i = FIXTURES[stage];
		const where = `${stage} ${size.width}×${size.height}`;
		await page.goto(`${BASE}/intents/`);
		await page.locator('.card .open', { hasText: i.title }).click({ timeout: 90000 });
		await page.locator('.item-review').waitFor();
		await page.waitForTimeout(400);
		if (SHOTS) await page.screenshot({ path: `${SHOTS}/${stage}-${size.width}x${size.height}.png` });
		const label = stage === 'specify' ? 'Approve spec' : 'Accept and ship';
		const targets = [
			{ name: label, loc: page.locator('.item-review .decide .btn.primary') },
			{ name: 'Reject', loc: page.locator('.item-review .decide .btn.reject') },
			{ name: 'the tabs', loc: page.locator('.item-review .band') }
		];
		if ((await targets[0].loc.textContent())?.trim() !== label) failures.push(`${where}: its decision reads "${await targets[0].loc.textContent()}", not "${label}"`);
		for (const t of targets) {
			checked++;
			if (!(await t.loc.count())) { failures.push(`${where}: ${t.name} is not there`); continue; }
			for (const w of await t.loc.evaluate(wrongWith, t.name !== 'the tabs')) failures.push(`${where}: ${t.name} ${w}`);
		}
		// a click reaches the decision (trial: Playwright's actionability, nothing sent)
		try { await targets[0].loc.click({ trial: true, timeout: 3000 }); } catch (e) { failures.push(`${where}: ${label} can't be clicked: ${String(e).split('\n')[0]}`); }
		// and the detail's own text still scrolls into sight above it: its last line of the open tab reachable
		const lastVisible = await page.locator('.item-review .panel').evaluate((p) => {
			p.scrollTop = p.scrollHeight;
			const sc = (p.closest('.item-body') as HTMLElement | null);
			if (sc) sc.scrollTop = sc.scrollHeight;
			const last = [...p.querySelectorAll('*')].filter((e) => e.getClientRects().length && e.textContent?.trim()).pop() as HTMLElement | undefined;
			if (!last) return true;
			const r = last.getBoundingClientRect();
			const hit = document.elementFromPoint(r.left + Math.min(8, r.width / 2), r.top + Math.min(6, r.height / 2));
			return !!hit && (last === hit || last.contains(hit) || hit.contains(last));
		});
		checked++;
		if (!lastVisible) failures.push(`${where}: the open tab's last line can't be scrolled into sight`);
	}
	await page.close();
}
await browser.close();
dev.kill();
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `${failures.length} failed of ${checked} checks` : `✓ ${checked} checks: the decision, Reject and the tabs in reach at ${SIZES.map((s) => `${s.width}×${s.height}`).join(', ')}`);
process.exit(failures.length ? 1 : 0);
