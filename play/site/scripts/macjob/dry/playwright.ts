/*
 * A MAC JOB'S PAGE, ON THE CPU — what a Mac job's script gets for `playwright` in its dry run (intent cb52fbd9; ../README.md):
 * the same calls, played against the census's world (../../census), built on the CPU in this process with no graphics
 * context, so a step that throws, a global the world lacks or a call that never settles shows here, in minutes, and not
 * after the Mac's queue. Nothing here draws: pictures and times are the Mac's.
 *
 * - `goto(url)` builds the route's world (`/sandbox-1/`, `/sandbox-3/`, `/worlds/`) from the tree serving that port (the
 *   dry run's `bunx vite dev` stub notes which: DRY_STATE/ports/<port>), once a process: a later goto keeps the world
 *   built (said so); any other route is an empty page. Frames are turned in the background from then on.
 * - `evaluate` and `waitForFunction` run in that world's `window`, a function made again from its source in the global
 *   scope (as Playwright sends it: it closes over nothing of the job's) and its argument and result cloned. A throw is
 *   reported with the world's stack and the job's line; one that never settles in DRY_EVAL_S (120 s) is a hang.
 * - `waitForTimeout` waits at most 50 ms and moves `Date.now` on by the rest, so a job's own `Date.now()` caps end at once.
 * - `screenshot` writes a 1×1 PNG at its path; `recordVideo` an empty file per page; mouse, keyboard and events are no-ops.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { makeDocument, refusal, refusedContexts } from '../../census/dom';
import { frame, setup } from '../../census/setup';
import { warp } from './clock';

const g = globalThis as any;
refusal.quiet = true;
const EVAL_S = Number(process.env.DRY_EVAL_S ?? 120);
const WAIT_S = Number(process.env.DRY_WAIT_S ?? 240);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const SITE = resolve(import.meta.dir, '../../..');

const say = (s: string) => console.error(`dry: ${s}`);

/** the one world of this process: its route, its tree, and whether it is up, building or failed */
const world: { route: string | null; root: string | null; state: 'none' | 'building' | 'up' | 'failed'; pump: Timer | null } = (g.__dryWorld ??= { route: null, root: null, state: 'none', pump: null });
const listeners: Set<(e: Error) => void> = (g.__dryListeners ??= new Set());

/** frames turned in the background, a display's 60 a second at most, each frame's throw a page error */
function pump() {
	if (world.pump) return;
	const tick = () => {
		const t0 = performance.now();
		if (world.state !== 'building') {
			try {
				frame();
			} catch (e) {
				pageError(e as Error);
			}
		}
		world.pump = setTimeout(tick, Math.max(0, 1000 / 60 - (performance.now() - t0)));
	};
	world.pump = setTimeout(tick, 0);
}
function pageError(e: Error) {
	say(`pageerror ${e?.stack ?? e}`);
	for (const l of listeners) l(e);
}

/** a blank page's window and document, as about:blank has them, until a world's page replaces them */
function blank() {
	g.window ??= g;
	g.document ??= makeDocument();
	// a browser with no GPU still has WebGL's constructors (a job's init script may patch their prototypes)
	g.WebGLRenderingContext ??= class WebGLRenderingContext {};
	g.WebGL2RenderingContext ??= class WebGL2RenderingContext {};
}

/** the tree serving a dev server's port (the vite stub's note), else this checkout's */
function treeOf(url: URL) {
	const note = process.env.DRY_STATE && join(process.env.DRY_STATE, 'ports', url.port);
	return note && existsSync(note) ? readFileSync(note, 'utf8').trim() : SITE;
}

const ROUTES: Record<string, 'sandbox-1' | 'sandbox-3' | 'worlds'> = { '/sandbox-1/': 'sandbox-1', '/sandbox-3/': 'sandbox-3', '/worlds/': 'worlds' };

/** the reason a call is a dry run's failure: a throw in the page, or a call that never settled */
export class DryHang extends Error {}

/** a call that settles within `s` seconds, else a hang told with the job's line it was called from */
function bounded<T>(p: Promise<T>, s: number, what: string, at: string): Promise<T> {
	let timer: Timer;
	const hang = new Promise<never>((_, no) => {
		timer = setTimeout(() => no(new DryHang(`DRY HANG: ${what} did not settle in ${s} s\n  called ${at}`)), s * 1000);
	});
	return Promise.race([p, hang]).finally(() => clearTimeout(timer));
}
/** the job's own line that made the call (the first frame outside this file) */
const caller = () => (new Error().stack ?? '').split('\n').slice(1).find((l) => !l.includes('/macjob/dry/')) ?? '(unknown)';

/** Playwright's serialisation of what crosses into and out of the page */
const clone = (v: unknown) => {
	if (v === undefined) return undefined;
	try {
		return structuredClone(v);
	} catch {
		try {
			return JSON.parse(JSON.stringify(v));
		} catch {
			return undefined;
		}
	}
};
/** a page function as Playwright sends it: its source run in the page's global scope, closing over nothing */
const remake = (fn: Function | string) => (typeof fn === 'string' ? null : (0, eval)(`(${fn.toString()})`));
const shown = (fn: Function | string) => String(fn).replace(/\s+/g, ' ').slice(0, 240);

/** Chromium's wording of a TypeError JavaScriptCore words its own way, so a job's expectations read alike */
function chromiumSays(e: Error) {
	const m = /^(undefined|null) is not an object \(evaluating '[^']*\.([\w$]+)'\)/.exec(e?.message ?? '');
	return m ? `Cannot read properties of ${m[1]} (reading '${m[2]}')` : null;
}

async function inPage(fn: Function | string, arg: unknown, at: string) {
	const f = remake(fn);
	try {
		const v = f ? await f(clone(arg)) : await (0, eval)(fn as string);
		return clone(v);
	} catch (e) {
		const err = e as Error;
		const v8 = chromiumSays(err);
		say(`DRY THROW in page.evaluate(${shown(fn)})\n  ${err?.stack ?? err}${v8 ? `\n  (as Chromium says it: ${v8})` : ''}\n  called ${at}`);
		throw e;
	}
}

class Page {
	inits: string[] = [];
	/** the world this page shows: none until a goto of a route the census builds */
	route: string | null = null;
	film: string | null;
	mouse = { click: async () => {}, move: async () => {}, down: async () => {}, up: async () => {}, wheel: async () => {} };
	keyboard = { down: async () => {}, up: async () => {}, press: async () => {}, type: async () => {} };
	constructor(o: { recordVideo?: { dir: string } } = {}) {
		blank();
		this.film = o.recordVideo ? join(o.recordVideo.dir, `${Math.random().toString(36).slice(2)}.webm`) : null;
		if (this.film) mkdirSync(dirname(this.film), { recursive: true }), writeFileSync(this.film, '');
	}
	on(ev: string, cb: (x: any) => void) {
		if (ev === 'pageerror') listeners.add(cb);
		return this;
	}
	off() {
		return this;
	}
	async addInitScript(s: Function | string | { content?: string; path?: string }, arg?: unknown) {
		const text = typeof s === 'function' ? `(${s.toString()})(${JSON.stringify(arg)})` : typeof s === 'string' ? s : s.content ?? readFileSync(s.path!, 'utf8');
		this.inits.push(text);
	}
	/** the init scripts, as a page runs them on load: a throw a page error, the page going on */
	init() {
		for (const t of this.inits) {
			try {
				(0, eval)(t);
			} catch (e) {
				pageError(e as Error);
			}
		}
	}
	async goto(href: string) {
		const url = new URL(href);
		const route = ROUTES[url.pathname];
		const root = treeOf(url);
		this.route = route ?? null;
		if (!route) {
			say(`goto ${url.pathname}: a route the census does not build on the CPU; the page stays empty`);
			this.init();
			return null;
		}
		if (world.route) {
			say(`goto ${url.pathname} (${root}): the world built before (${world.route}, ${world.root}) is kept: one world a process`);
			return null;
		}
		// the census reads play with the real token only, never the job's stand-in (../dry.ts)
		if (process.env.DRY_PLAY_TOKEN !== undefined) process.env.DRY_PLAY_TOKEN ? (process.env.PLAY_MCP_TOKEN = process.env.DRY_PLAY_TOKEN) : delete process.env.PLAY_MCP_TOKEN;
		setup({ root, inputs: join(SITE, 'scripts/census/inputs'), cache: process.env.CENSUS_CACHE });
		Object.assign(world, { route, root, state: 'building' });
		blank();
		this.init();
		say(`goto ${url.pathname}: building ${route} on the CPU from ${root}`);
		const t0 = performance.now();
		const { mount } = await import('../../census/run');
		pump();
		let last = '';
		mount(route, { log: (s) => s !== last && say((last = s)) }).then(
			() => {
				world.state = 'up';
				say(`${route} built in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
			},
			(e) => {
				world.state = 'failed';
				pageError(e);
			}
		);
		return null;
	}
	evaluate(fn: Function | string, arg?: unknown) {
		const at = caller();
		return bounded(inPage(fn, arg, at), EVAL_S, `page.evaluate(${shown(fn)})`, at);
	}
	async evaluateHandle(fn: Function | string, arg?: unknown) {
		const v = await this.evaluate(fn, arg);
		return { jsonValue: async () => v, dispose: async () => {} };
	}
	async waitForFunction(fn: Function | string, arg?: unknown, o: { timeout?: number; polling?: number } = {}) {
		const at = caller();
		// a page with no world never gets one: a short wait, then Playwright's timeout
		const s = this.route ? Math.min((o.timeout ?? 30_000) / 1000, WAIT_S) : 5;
		const f = remake(fn);
		const end = performance.now() + s * 1000;
		while (performance.now() < end) {
			let v: unknown;
			try {
				v = f ? await f(clone(arg)) : (0, eval)(fn as string);
			} catch {}
			if (v) return { jsonValue: async () => clone(v), dispose: async () => {} };
			await new Promise((r) => setTimeout(r, 100));
		}
		say(`waitForFunction(${shown(fn)}) timed out after ${s} s (the job's timeout ${o.timeout ?? 30_000} ms${this.route ? `, at most ${WAIT_S} s here` : ', no world on this page'})\n  called ${at}`);
		throw Object.assign(new Error(`page.waitForFunction: Timeout ${o.timeout ?? 30_000}ms exceeded.`), { name: 'TimeoutError' });
	}
	async waitForTimeout(ms: number) {
		const real = Math.min(ms, 50);
		await new Promise((r) => setTimeout(r, real));
		warp(ms - real);
	}
	async waitForLoadState() {}
	async screenshot(o: { path?: string } = {}) {
		if (o.path) mkdirSync(dirname(o.path), { recursive: true }), writeFileSync(o.path, PNG);
		return PNG;
	}
	async setViewportSize() {}
	async close() {}
	url() {
		return this.route ? `http://dry.local/${this.route}/` : 'about:blank';
	}
}
// `video()` as Playwright has it: the recording, its path once the page is closed
(Page.prototype as any).video = function (this: Page) {
	const p = this.film;
	return p && { path: async () => p, saveAs: async (to: string) => writeFileSync(to, ''), delete: async () => {} };
};

class Context {
	constructor(private o: any = {}) {}
	async newPage() {
		return new Page(this.o);
	}
	async addInitScript() {}
	async close() {}
	pages() {
		return [];
	}
}

/** the process's end once the browser closed (the world's box workers would keep it up), called off by a browser opened again */
let ending: ReturnType<typeof setTimeout> | undefined;
const browser = {
	async newContext(o?: any) {
		return new Context(o);
	},
	async newPage(o?: any) {
		return new Page(o);
	},
	async close() {
		if (world.pump) clearTimeout(world.pump);
		// the world's box workers would keep the process up where a closed browser lets a job's script end
		if (world.route) (ending = setTimeout(() => process.exit(), 5000)).unref();
		if (refusedContexts.length) say(`the job asked for a graphics context ${refusedContexts.length}× (${[...new Set(refusedContexts)].join(', ')}): refused, as nothing here draws`);
	},
	version: () => 'dry'
};

/** a persistent profile's browser (../../mac-page.mjs `openSite`): a context whose close is the browser's; the world one a process, its profile kept by no one */
class PersistentContext extends Context {
	async close() {
		await browser.close();
	}
}

export const chromium = {
	launch: async () => (clearTimeout(ending), browser),
	launchPersistentContext: async (_dir: string, o?: any) => (clearTimeout(ending), new PersistentContext(o)),
	name: () => 'chromium'
};
export const firefox = chromium, webkit = chromium;
export default { chromium, firefox, webkit };
