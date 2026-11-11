/**
 * BUTLER JAMES'S LANDING PAGE, CHECKED (intent 42a96129): its checks, its scene's budget and its screenshots, on the
 * site's build (`build/`, made here when it is missing or older than `src/`), served by play's own handler
 * (play/api/src/site.ts). `/api/me` is answered by a fixture (./lib/shots.ts); nothing is read from or written to play.
 *
 *   bun scripts/butler-james-landing.ts check gate     only an admin sees it, and play's nav pill does not frame it
 *   bun scripts/butler-james-landing.ts check page     sections, calls to action, calculator, FAQ, phone and desktop
 *   bun scripts/butler-james-landing.ts check hero     the show's world: live, labelled, by the scroll, turned, lit, resting, still
 *   bun scripts/butler-james-landing.ts check own      nothing asked of another origin; the brand's faces from the build
 *   bun scripts/butler-james-landing.ts budget         the scene's triangles, draws and first frame, held
 *   bun scripts/butler-james-landing.ts shots [dir]    1440×900 and 390×844: the whole page and each chapter of the show
 *
 * Exits 0 only when every claim of the mode holds; each is printed with ✓ or ✗.
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { siteHandler } from '../../api/src/site.ts';
import { ADMIN, DESKTOP, PHONE, TRAVELER } from './lib/shots';

const ROUTE = '/butler-james/landing/';
const SECTIONS = ['hero', 'need', 'build', 'walk', 'offer', 'guarantee', 'speed', 'steps', 'gallery', 'faq', 'closing'];
/** the show's chapters, each a screen tall, from the page's top */
const CHAPTERS = ['hero', 'need', 'build', 'walk'] as const;
/** the scene's budget (the intent's check c8; play/SPEC.md §8) */
const BUDGET = { tris: 30000, draws: 60, firstMs: 5000 };
const [mode, arg] = process.argv.slice(2);
const site = join(import.meta.dir, '..');

// ---- the build, fresh
const newest = (dir: string): number =>
	readdirSync(dir, { withFileTypes: true }).reduce((t, e) => Math.max(t, e.isDirectory() ? newest(join(dir, e.name)) : statSync(join(dir, e.name)).mtimeMs), 0);
const built = join(site, 'build/200.html');
if (!existsSync(built) || statSync(built).mtimeMs < newest(join(site, 'src'))) {
	console.log('building the site …');
	const b = Bun.spawnSync(['bun', 'run', 'build'], { cwd: site, stdout: 'pipe', stderr: 'pipe' });
	if (b.exitCode !== 0) {
		console.error(b.stdout.toString().slice(-3000), b.stderr.toString().slice(-3000));
		throw new Error('the site did not build');
	}
}
const handler = siteHandler(join(site, 'build'));
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: (req) => handler(req) });
const ORIGIN = `http://127.0.0.1:${server.port}`;

// ---- what holds and what does not
let failed = 0;
function claim(ok: boolean, what: string, got?: unknown) {
	if (!ok) failed++;
	console.log(`${ok ? '✓' : '✗'} ${what}${ok || got === undefined ? '' : ` (got ${typeof got === 'string' ? got : JSON.stringify(got)})`}`);
}

type Who = typeof ADMIN | typeof TRAVELER | null;
/** a page of the site with `who` signed in; every other call to play's API is refused */
async function open(browser: Browser, who: Who, opts: Parameters<Browser['newContext']>[0] = {}, init?: string) {
	const ctx = await browser.newContext({ viewport: DESKTOP, ...opts });
	if (init) await ctx.addInitScript({ content: init });
	const page = await ctx.newPage();
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await page.route('**/api/**', (route) => {
		const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
		if (path === '/me') return who ? route.fulfill({ json: who }) : route.fulfill({ status: 401, json: { error: 'signed out' } });
		return route.fulfill({ status: 404, json: { error: 'not in this check' } });
	});
	return { ctx, page, errors };
}
const goto = (page: Page, path = ROUTE) => page.goto(ORIGIN + path, { waitUntil: 'load' });
const shown = (page: Page) => page.locator('[data-butler-james]').waitFor({ timeout: 30000 });
const frames = (page: Page) => page.evaluate(() => Number(document.querySelector<HTMLCanvasElement>('.bj-stage canvas')?.dataset.frames ?? 0));
const live = (page: Page) => page.locator('.bj-stage canvas.live').waitFor({ timeout: 30000 });
/** the show at one of its chapters, the world arrived there */
async function chapter(page: Page, name: (typeof CHAPTERS)[number], settle = 1900) {
	await page.evaluate((i) => {
		const el = document.querySelector('.app-scroll')!;
		el.scrollTop = i * el.clientHeight;
	}, CHAPTERS.indexOf(name));
	await page.waitForTimeout(settle);
}
const scrollTo = (page: Page, top: number | 'end') =>
	page.evaluate((t) => {
		const el = document.querySelector('.app-scroll')!;
		el.scrollTop = t === 'end' ? el.scrollHeight : t;
	}, top);

/** what the banner's stage shows: how many colours, and a number that changes when the picture does */
async function picture(page: Page) {
	const png = (await page.locator('.bj-stage').screenshot()).toString('base64');
	return page.evaluate(async (b64) => {
		const img = new Image();
		img.src = `data:image/png;base64,${b64}`;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = 160;
		c.height = 120;
		const g = c.getContext('2d')!;
		g.drawImage(img, 0, 0, c.width, c.height);
		const d = g.getImageData(0, 0, c.width, c.height).data;
		const colours = new Set<number>();
		let sum = 0;
		for (let i = 0; i < d.length; i += 4) {
			colours.add((d[i] >> 3 << 10) | (d[i + 1] >> 3 << 5) | (d[i + 2] >> 3));
			sum = (sum * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 2147483647;
		}
		return { colours: colours.size, sum };
	}, png);
}

// ---------------------------------------------------------------------------------------------------------------------
async function gate(browser: Browser) {
	for (const [name, who] of [['a traveler', TRAVELER], ['a signed-out visitor', null]] as const) {
		const { ctx, page } = await open(browser, who);
		await goto(page);
		await page.getByText('Coming soon').first().waitFor({ timeout: 30000 }).catch(() => {});
		const seen = await page.evaluate(() => ({ page: !!document.querySelector('[data-butler-james]'), text: document.body.innerText }));
		claim(!seen.page && !/Butler James|Festpreis|Platzhalter/.test(seen.text), `${name} sees none of the page`, seen.text.slice(0, 80));
		claim(/Coming soon/.test(seen.text), `${name} sees "Coming soon"`, seen.text.slice(0, 80));
		await ctx.close();
	}
	const { ctx, page } = await open(browser, ADMIN);
	await goto(page);
	await shown(page).catch(() => {});
	claim((await page.locator('[data-butler-james]').count()) === 1, 'an admin sees the page');
	claim((await page.locator('.app-dock').count()) === 0, "play's nav pill does not frame it");
	await goto(page, '/profile/');
	await page.locator('.app-dock').waitFor({ timeout: 30000 }).catch(() => {});
	claim((await page.locator('.app-dock').count()) === 1, "play's other pages keep the nav pill");
	await ctx.close();
}

async function pageWorks(browser: Browser) {
	for (const size of [DESKTOP, PHONE]) {
		const phone = size.width < 600;
		const at = `${size.width}×${size.height}`;
		const { ctx, page, errors } = await open(browser, ADMIN, { viewport: size, hasTouch: phone, isMobile: phone });
		await goto(page);
		await shown(page);
		const order = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-section]')].map((s) => s.dataset.section));
		claim(JSON.stringify(order) === JSON.stringify(SECTIONS), `${at}: the sections in order: ${SECTIONS.join(', ')}`, order);
		claim((await page.locator('[data-butler-james]').getAttribute('lang')) === 'de', `${at}: the page is marked German`);

		// the calls to action: at least four, each leading to the closing section
		const ctas = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[data-cta]')].map((a) => a.getAttribute('href')));
		claim(ctas.length >= 4 && ctas.every((h) => h === '#kontakt'), `${at}: at least four calls to action, each to the closing section`, ctas);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.locator('[data-section="hero"] a[data-cta]').click();
		await page.waitForTimeout(400);
		const closing = await page.evaluate(() => {
			const r = document.querySelector('[data-section="closing"]')!.getBoundingClientRect();
			return r.top < innerHeight && r.bottom > 0;
		});
		claim(closing, `${at}: a call to action brings the closing section into view`);
		await page.emulateMedia({ reducedMotion: null });

		// the calculator: 2 apartments, 1 house, 1 trailer
		await page.locator('[data-calc]').scrollIntoViewIfNeeded();
		const more = (key: string) => page.locator(`[data-calc] .bj-calc-row:has([data-count="${key}"]) button`).last();
		await more('apartments').click();
		await more('houses').click();
		await more('trailers').click();
		const total = (await page.locator('[data-total]').textContent())?.trim();
		claim(total === '2.675 €', `${at}: 2 apartments, 1 house and 1 trailer are 2.675 €`, total);
		await page.locator('[data-count="houses"]').fill('3');
		const typed = (await page.locator('[data-total]').textContent())?.trim();
		claim(typed === '4.469 €', `${at}: a typed count is taken (3 houses: 4.469 €)`, typed);

		// the FAQ: every item opens on a click, and closes by the keyboard
		const items = page.locator('.bj-faq-item button');
		const n = await items.count();
		let opened = 0, closed = 0;
		for (let i = 0; i < n; i++) {
			const b = items.nth(i);
			await b.scrollIntoViewIfNeeded();
			await b.click();
			const region = page.locator(`#${await b.getAttribute('aria-controls')}`);
			if ((await b.getAttribute('aria-expanded')) === 'true' && (await region.isVisible()) && (await region.innerText()).trim().length > 10) opened++;
			await b.focus();
			await page.keyboard.press('Enter');
			if ((await b.getAttribute('aria-expanded')) === 'false' && !(await region.isVisible())) closed++;
		}
		claim(n === 5 && opened === n, `${at}: each of the five questions opens with its answer`, { n, opened });
		claim(closed === n, `${at}: each closes again by the keyboard`, { n, closed });

		// nothing scrolls sideways; on a phone the call to action stays at the foot
		const wide = await page.evaluate(() => {
			const s = document.querySelector('.app-scroll')!;
			return { scroll: s.scrollWidth, client: s.clientWidth, doc: document.documentElement.scrollWidth, win: innerWidth };
		});
		claim(wide.scroll <= wide.client && wide.doc <= wide.win, `${at}: nothing scrolls sideways`, wide);
		// and nothing is cut off at the side (the page clips what would overflow, so each box is asked)
		const cut = await page.evaluate(() =>
			[...document.querySelectorAll<HTMLElement>('.bj *')]
				// (the running band runs past the sides on purpose, and a drawing's own shapes are its picture's)
				.filter((el) => !el.closest('[hidden], .bj-band') && !(el as unknown as SVGElement).ownerSVGElement && el.getClientRects().length)
				.map((el) => ({ el, r: el.getBoundingClientRect() }))
				.filter(({ r }) => r.width > 0 && (r.right > innerWidth + 1 || r.left < -1))
				.map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className} ${Math.round(r.left)}–${Math.round(r.right)}`)
				.slice(0, 5)
		);
		claim(cut.length === 0, `${at}: nothing is cut off at the side`, cut);
		if (phone) {
			let stays = 0;
			for (const part of [0.2, 0.5, 0.8]) {
				await page.evaluate((p) => {
					const s = document.querySelector('.app-scroll')!;
					s.scrollTop = (s.scrollHeight - s.clientHeight) * p;
				}, part);
				await page.waitForTimeout(150);
				const r = await page.locator('[data-sticky] a[data-cta]').boundingBox();
				if (r && r.y >= 0 && r.y + r.height <= size.height && r.height >= 44) stays++;
			}
			claim(stays === 3, `${at}: the call to action stays at the foot of the screen`, stays);
		}
		claim(errors.length === 0, `${at}: no error on the page`, errors);
		await ctx.close();
	}
}

async function hero(browser: Browser) {
	const ROOMS = ['Wohnen', 'Küche', 'Schlafen', 'Bad', 'Flur'];
	// ---- live, labelled, asked for only after the page's load; told by the scroll; resting out of view
	{
		const { ctx, page, errors } = await open(browser, ADMIN);
		let loaded = false;
		page.on('load', () => (loaded = true));
		const scripts: { url: string; afterLoad: boolean }[] = [];
		page.on('request', (r) => {
			if (r.resourceType() === 'script') scripts.push({ url: r.url(), afterLoad: loaded });
		});
		await goto(page);
		await live(page);
		await page.waitForTimeout(600);
		const three: typeof scripts = [];
		for (const s of scripts) if ((await (await fetch(s.url)).text()).includes('WebGPURenderer')) three.push(s);
		claim(three.length > 0 && three.every((s) => s.afterLoad), "three.js is asked for only after the page's load, not by its entry", three.map((s) => `${s.url.split('/').pop()} ${s.afterLoad ? 'after' : 'before'}`));
		const top = await picture(page);
		claim(top.colours > 40, 'the show draws a picture of many colours', top.colours);
		claim(((await page.locator('[data-scene-label]').textContent()) ?? '').trim() === 'Platzhalter-Demo', 'it is labelled "Platzhalter-Demo"');
		const f0 = await frames(page);
		await page.waitForTimeout(500);
		const f1 = await frames(page);
		claim(f1 > f0, 'at the top it turns by itself', { f0, f1 });
		await chapter(page, 'need');
		const need = await picture(page);
		await chapter(page, 'walk');
		const walk = await picture(page);
		claim(need.sum !== top.sum, 'scrolled to "all we need" the picture is another: the floor plan');
		claim(walk.sum !== top.sum && walk.sum !== need.sum, 'scrolled to the walk it is another again: inside');
		const rest0 = await frames(page);
		await page.waitForTimeout(1000);
		claim((await frames(page)) === rest0, 'arrived, it draws no frame for a second', { rest0, now: await frames(page) });
		await scrollTo(page, 'end');
		await page.waitForTimeout(400);
		const f2 = await frames(page);
		await page.waitForTimeout(1000);
		const f3 = await frames(page);
		claim(f3 === f2, 'past the show no frame is drawn for a second', { f2, f3 });
		await scrollTo(page, 0);
		await page.waitForTimeout(800);
		claim((await frames(page)) > f3, 'back in view it moves again');
		claim(errors.length === 0, 'no error on the page', errors);
		await ctx.close();
	}
	// ---- no motion of its own for those who ask for less; turned by the mouse, a room lit, day and evening
	{
		const { ctx, page } = await open(browser, ADMIN, { reducedMotion: 'reduce' });
		await goto(page);
		await live(page);
		await page.waitForTimeout(1500);
		claim((await frames(page)) === 1, 'with reduced motion exactly one frame is drawn while nothing is touched', await frames(page));
		const before = await picture(page);
		const box = (await page.locator('.bj-stage canvas').boundingBox())!;
		const x = box.x + box.width * 0.7, y = box.y + box.height * 0.5;
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 200, y, { steps: 8 });
		await page.mouse.up();
		await page.waitForTimeout(300);
		const turned = await picture(page);
		claim(turned.sum !== before.sum, 'a drag with the mouse turns it');
		const rest = await frames(page);
		await page.waitForTimeout(800);
		claim((await frames(page)) === rest, 'and then it stands still again');
		await page.mouse.click(x, y);
		await page.waitForTimeout(400);
		const name = ((await page.locator('[data-room-label]').textContent().catch(() => '')) ?? '').trim();
		const lit = await picture(page);
		claim(ROOMS.includes(name) && lit.sum !== turned.sum, 'a click on a room lights it and shows its name', name);
		await page.locator('[data-evening]').click();
		await page.waitForTimeout(400);
		const evening = await picture(page);
		claim(evening.sum !== lit.sum, 'the evening switch changes the light');
		await chapter(page, 'need', 500);
		await page.locator('[data-card="bath"]').click();
		await page.waitForTimeout(400);
		claim(((await page.locator('[data-room-label]').textContent().catch(() => '')) ?? '').trim() === 'Bad', "a photo's card lights its room: Bad");
		await ctx.close();
	}
	// ---- turned by one finger, and a room lit by a tap
	{
		const { ctx, page } = await open(browser, ADMIN, { viewport: PHONE, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
		await goto(page);
		await live(page);
		await page.waitForTimeout(800);
		const before = await picture(page);
		const box = (await page.locator('.bj-stage canvas').boundingBox())!;
		const cdp = await ctx.newCDPSession(page);
		const x = box.x + box.width / 2, y = box.y + box.height * 0.3;
		const touch = (type: string, px?: number) => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: px === undefined ? [] : [{ x: px, y }] });
		await touch('touchStart', x);
		for (let i = 1; i <= 8; i++) await touch('touchMove', x + i * 12);
		await touch('touchEnd');
		await page.waitForTimeout(300);
		const turned = await picture(page);
		claim(turned.sum !== before.sum, 'a drag with one finger turns it');
		await page.touchscreen.tap(x, y);
		await page.waitForTimeout(400);
		const name = ((await page.locator('[data-room-label]').textContent().catch(() => '')) ?? '').trim();
		claim(ROOMS.includes(name) && (await picture(page)).sum !== turned.sum, 'a tap on a room lights it and shows its name', name);
		await ctx.close();
	}
	// ---- where the browser gives no 3D: the still, and no error
	{
		const none = `Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined }); const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return /webgl/.test(kind) ? null : g.call(this, kind, ...rest); };`;
		const { ctx, page, errors } = await open(browser, ADMIN, {}, none);
		await goto(page);
		await shown(page);
		await page.waitForTimeout(3000);
		claim((await page.locator('.bj-stage canvas.live').count()) === 0 && (await page.locator('.bj-still').isVisible()), 'without WebGPU and WebGL the still picture is shown');
		claim((await picture(page)).colours > 5, 'the still is a picture of the floor plan');
		claim(errors.length === 0, 'and no error is thrown', errors);
		await ctx.close();
	}
}

async function own(browser: Browser) {
	const { ctx, page } = await open(browser, ADMIN);
	const asked: string[] = [];
	const faces = new Map<string, number>();
	page.on('request', (r) => asked.push(r.url()));
	page.on('response', (r) => {
		if (/\.woff2(\?|$)/.test(r.url())) faces.set(r.url().split('/').pop()!, r.status());
	});
	await goto(page);
	await live(page);
	for (const part of [0.25, 0.5, 0.75, 1]) {
		await page.evaluate((p) => {
			const s = document.querySelector('.app-scroll')!;
			s.scrollTop = (s.scrollHeight - s.clientHeight) * p;
		}, part);
		await page.waitForTimeout(300);
	}
	await page.evaluate(() => document.fonts.ready);
	const away = asked.filter((u) => !u.startsWith(ORIGIN + '/') && !/^(data|blob):/.test(u));
	claim(asked.length > 5 && away.length === 0, `every one of the page's ${asked.length} requests is to its own origin`, away);
	for (const face of ['bricolage', 'manrope']) {
		const got = [...faces].find(([name]) => name.startsWith(face));
		claim(got?.[1] === 200, `the brand's face ${face} comes from the build`, [...faces]);
	}
	const used = await page.evaluate(() => {
		const f = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontFamily;
		return { h1: f('.bj h1'), text: f('.bj') };
	});
	claim(/Bricolage/.test(used.h1) && /Manrope/.test(used.text), 'headlines in Bricolage Grotesque, text in Manrope', used);
	await ctx.close();
}

async function budget(browser: Browser) {
	const { ctx, page } = await open(browser, ADMIN);
	await goto(page);
	await live(page);
	// every chapter visited: the canvas keeps the most of any frame
	for (const name of CHAPTERS) await chapter(page, name, 1500);
	const m = await page.evaluate(() => {
		const d = document.querySelector<HTMLCanvasElement>('.bj-stage canvas')!.dataset;
		return { tris: Number(d.tris), draws: Number(d.draws), firstMs: Number(d.firstMs) };
	});
	console.log(`triangles ${m.tris} (at most ${BUDGET.tris}) · draws ${m.draws} (at most ${BUDGET.draws}) · first frame ${m.firstMs} ms (at most ${BUDGET.firstMs})`);
	claim(m.tris > 0 && m.tris <= BUDGET.tris, `at most ${BUDGET.tris} triangles in any frame of the four chapters`, m.tris);
	claim(m.draws > 0 && m.draws <= BUDGET.draws, `at most ${BUDGET.draws} draws in any frame`, m.draws);
	claim(m.firstMs >= 0 && m.firstMs <= BUDGET.firstMs, `the first frame within ${BUDGET.firstMs} ms of the scene starting to load`, m.firstMs);
	await ctx.close();
}

async function shots(browser: Browser, dir: string) {
	mkdirSync(dir, { recursive: true });
	for (const size of [DESKTOP, PHONE]) {
		const phone = size.width < 600;
		const w = `${size.width}x${size.height}`;
		// the page as it rests: no motion of its own, so every picture is the same on every run
		const { ctx, page } = await open(browser, ADMIN, { viewport: size, deviceScaleFactor: 2, hasTouch: phone, isMobile: phone, reducedMotion: 'reduce' });
		await goto(page);
		await live(page);
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(800);
		// each chapter of the show
		for (const name of CHAPTERS) {
			await chapter(page, name, 700);
			await page.screenshot({ path: `${dir}/${w}-${name}.png` });
		}
		// the whole page, one question open so the accordion is seen
		// (taken screen by screen and joined: one picture taller than 8,192 px is more than the box's renderer draws, so
		// what stays in place while scrolling is let go; the call to action that stays at the foot is in the chapters'
		// pictures, and left out here)
		await page.locator('.bj-faq-item button').nth(1).click();
		await page.addStyleTag({ content: '[data-sticky], .bj-read { display: none !important; } .bj-offer-side { position: static !important; }' });
		await scrollTo(page, 0);
		const tall = await page.evaluate(() => document.querySelector('.app-scroll')!.scrollHeight);
		const parts: string[] = [];
		for (let top = 0; top < tall; top += size.height) {
			// the last screen ends with the page: only its lower part is new
			const at = Math.min(top, tall - size.height);
			await scrollTo(page, at);
			await page.waitForTimeout(450);
			parts.push((await page.screenshot({ scale: 'css', clip: { x: 0, y: top - at, width: size.width, height: size.height - (top - at) } })).toString('base64'));
		}
		const joined = await page.evaluate(async ({ parts, width, tall }) => {
			const c = document.createElement('canvas');
			c.width = width;
			c.height = tall;
			const g = c.getContext('2d')!;
			let y = 0;
			for (const b64 of parts) {
				const img = new Image();
				img.src = `data:image/png;base64,${b64}`;
				await img.decode();
				g.drawImage(img, 0, y);
				y += img.height;
			}
			return c.toDataURL('image/png').split(',')[1];
		}, { parts, width: size.width, tall });
		await Bun.write(`${dir}/${w}.png`, Buffer.from(joined, 'base64'));
		console.log(`${dir}/${w}.png, ${CHAPTERS.map((n) => `${w}-${n}.png`).join(', ')}`);
		await ctx.close();
	}
}

// the box has no GPU: Chromium draws WebGL in software (SwiftShader)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
	if (mode === 'check' && arg === 'gate') await gate(browser);
	else if (mode === 'check' && arg === 'page') await pageWorks(browser);
	else if (mode === 'check' && arg === 'hero') await hero(browser);
	else if (mode === 'check' && arg === 'own') await own(browser);
	else if (mode === 'budget') await budget(browser);
	else if (mode === 'shots') await shots(browser, arg ?? '../shots/42a96129-butler-james-landing');
	else {
		console.error('butler-james-landing.ts check gate|page|hero|own · budget · shots [dir]');
		failed++;
	}
} finally {
	await browser.close();
	server.stop(true);
}
if (failed) console.log(`${failed} failed`);
process.exit(failed ? 1 : 0);
