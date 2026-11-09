/*
 * THE CENSUS'S WORLD — what a world's code needs round it to build on the CPU in Bun (intent bba45d6e), set up once a
 * process (`setup`) before the world's modules are imported:
 *
 * - A Bun plugin that loads the site's modules from `root` (this checkout's play/site, or another commit's in a git
 *   worktree: `--at`): `$lib/…` from its src/lib, `$app/…` as a built site has them, `.svelte` files as nothing (a
 *   world builds no component), and `three` as three.js with its WebGLRenderer swapped for the counting renderer
 *   (./counting.js), for every module but that renderer itself.
 * - The page round it (./dom.ts): window, document, the 1440×900 viewport, a Mac's navigator (as the Mac's runs: 8
 *   cores, not a small device), images that load at once, a clock turned by hand (`frame`), and the asset box run in
 *   Bun workers (./box.ts) with the frozen engine the page would fetch.
 * - `fetch`: play's read-only routes (`/api/…`) from play.maia.city with the admin token in PLAY_MCP_TOKEN (the header
 *   goes to play and nowhere else); a file by its hash kept on disk once fetched (`/api/files/<hash>`: what it names
 *   never changes); every other route read from `inputs`, the world's inputs pinned as they were (./run5/), where it is
 *   pinned there; the site's static files from its `static/` (the frozen engines from this checkout's: they never change).
 * - OPFS (`navigator.storage`) on disk: the asset cache keeps its builds between runs, as a browser does, so a second
 *   census reads them instead of building them again.
 */
import { plugin } from 'bun';
import { compileModule } from 'svelte/compiler';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { hashOf } from '../../src/lib/content/assets/box/headless.js';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { El, VIEWPORT, contexts, makeDocument } from './dom';
import { SEEDED_RANDOM, frameWindow } from './box';
import { opfs } from './opfs';

const HERE = dirname(new URL(import.meta.url).pathname);
/** this checkout's play/site */
export const SITE = resolve(HERE, '../..');
const THREE_REAL = join(SITE, 'node_modules/three/build/three.module.js');
const THREE_WEBGPU_REAL = join(SITE, 'node_modules/three/build/three.webgpu.js');
const PLAY = 'https://play.maia.city';

export type Setup = {
	/** the play/site whose code is run (default: this checkout's) */
	root?: string;
	/** where the world's pinned inputs are (responses of play's routes by URL); none: read live */
	inputs?: string;
	/** write every route read live into `inputs` (to pin them) */
	record?: boolean;
	/** where files by hash and the asset cache are kept between runs */
	cache?: string;
	/** log every route fetched */
	verbose?: boolean;
	/** the switch's backend the page is asked for (`?renderer=`, intent c1bee1f8): webgl, webgpu or webgl2; none: the
	 *  page's default. A tree without the switch draws with WebGLRenderer whatever is asked */
	renderer?: string;
	/** the smoke (intent c1bee1f8): three's own WebGPURenderer, on its WebGL 2 backend over a context that only answers,
	 *  instead of the counting one, so a world runs WebGPU's own code (../census.ts --smoke) */
	real?: boolean;
};

let done: Required<Pick<Setup, 'root' | 'cache'>> & Setup;

/** the census's own clock: callbacks asked for the next frame, run by `frame` */
let rafs = new Map<number, FrameRequestCallback>();
let rafId = 0;

/** one frame: every callback asked for it, at `now` (ms) */
export function frame(now = performance.now()) {
	const due = rafs;
	rafs = new Map();
	for (const cb of due.values()) cb(now);
}

/** the smoke's WebGL 2 contexts (setup's `real`): each one's shaders, and every draw sent to any */
export const smoked = { shaders: [] as string[][], draws: 0 };

/** what was fetched, for the census's report: each route once */
export const fetched = { live: new Set<string>(), pinned: new Set<string>(), files: 0 };

export function setup(o: Setup = {}) {
	if (done) return done;
	done = { ...o, root: resolve(o.root ?? SITE), cache: resolve(o.cache ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-census')) };
	const root = done.root;
	mkdirSync(done.cache, { recursive: true });

	// Bun's resolver reads a .ts file's specifiers before any onResolve sees them (tsconfig's paths), so the census
	// rewrites them as it loads each module of the site, and three's addons' `three`
	const stub = (n: string) => join(HERE, 'stubs', n);
	const spec = (s: string, from: string) => {
		if (s === 'three') return /\/census\/(counting|three)\.js$/.test(from) ? THREE_REAL : join(HERE, 'three.js');
		// three's WebGPU build, its renderer the counting one (intent c1bee1f8); ./webgpu.js itself reads the real one
		if (s === 'three/webgpu') return o.real || /\/census\/webgpu\.js$/.test(from) ? THREE_WEBGPU_REAL : join(HERE, 'webgpu.js');
		if (s.startsWith('$lib/') || s === '$lib') return resolveFile(join(root, 'src/lib', s.slice(5)));
		if (s.startsWith('$app/')) return stub(`app-${s.slice(5)}.js`);
		if (s.endsWith('.svelte')) return stub('svelte.js');
		return s;
	};
	const STATS_ONLY = '__assets = { stats: () => ({ out: plantsOut?.assets.stats(), in: plantsIn?.assets.stats(), library: library.assets.stats() }) }';
	const STATS_AND_KINDS = '__assets = { stats: () => ({ out: plantsOut?.assets.stats(), in: plantsIn?.assets.stats(), library: library.assets.stats() }), kinds: () => ({ out: plantsOut?.assets.kinds(), in: plantsIn?.assets.kinds(), library: library.assets.kinds() }) }';
	// and its look at the world's dome stream (`states()`: which domes' insides are built or building), so the census
	// waits for them as for the asset renderers (./run.ts `quiet`; intent 373050d1)
	const DOME_STREAM = /const domeStream = createStream\(\{[\s\S]*?\n\t\}\)/;
	const SPEC = /((?:\bfrom|\bimport)\s*\(?\s*)(['"])([^'"\n]+)\2/g;
	plugin({
		name: 'census',
		setup(b) {
			const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
			const filter = new RegExp(`^(${esc(join(root, 'src/'))}|${esc(join(SITE, 'node_modules/three/examples/jsm/'))}|${esc(HERE + '/')}(?!stubs/)).*\\.(ts|js|mjs)$`);
			b.onLoad({ filter }, (a) => {
				let text = readFileSync(a.path, 'utf8');
				// a module with runes (`.svelte.js`, `.svelte.ts`) compiled as the site's build compiles it
				if (/\.svelte\.(js|ts)$/.test(a.path)) {
					if (a.path.endsWith('.ts')) text = new Bun.Transpiler({ loader: 'ts' }).transformSync(text);
					text = compileModule(text, { filename: a.path, generate: 'client', dev: false }).js.code;
				}
				// the census's one look into the page, where a tree lacks it: each kind the asset renderers hold, as 6295a650's
				// census hook adds it (intent-work/6295a650-render out/run5/base-census-hook.diff)
				if (a.path.endsWith('/sandbox-2/interior/village.ts')) text = text.replace(STATS_ONLY, STATS_AND_KINDS).replace(DOME_STREAM, '$&;(window as any).__domeStream = domeStream');
				text = text.replace(SPEC, (all, pre, q, s) => {
					const to = spec(s, a.path);
					return to === s ? all : `${pre}${q}${to}${q}`;
				});
				return { contents: text, loader: a.path.endsWith('.ts') && !a.path.endsWith('.svelte.ts') ? 'ts' : 'js' };
			});
			b.onLoad({ filter: /\.svelte$/ }, () => ({ loader: 'js', contents: 'export default function Nothing() {}' }));
		}
	});

	// ── the page ──
	const g = globalThis as any;
	(0, eval)(SEEDED_RANDOM);
	const document = makeDocument();
	const make = document.createElement;
	document.createElement = (t: string) => {
		const e = make(t);
		if (t.toLowerCase() === 'iframe') e.contentWindow = frameWindow(e);
		if (t.toLowerCase() === 'img') imageOf(e);
		return e;
	};
	document.createElementNS = (_ns: string, t: string) => document.createElement(t);
	g.document = document;
	g.window = g;
	g.self = g;
	g.parent = g;
	g.top = g;
	g.innerWidth = VIEWPORT.width;
	g.innerHeight = VIEWPORT.height;
	g.outerWidth = VIEWPORT.width;
	g.outerHeight = VIEWPORT.height;
	g.devicePixelRatio = 1;
	g.screen = { width: VIEWPORT.width, height: VIEWPORT.height, availWidth: VIEWPORT.width, availHeight: VIEWPORT.height, orientation: { type: 'landscape-primary', angle: 0, addEventListener() {} } };
	g.location = new URL('http://census.local/sandbox-1/');
	if (o.renderer) g.location.searchParams.set('renderer', o.renderer);
	if (o.real) {
		g.location.searchParams.set('renderer', 'webgl2');
		const fake = join(SITE, 'src/lib/content/render/nodes/fakegl.js');
		// each context counted: the shaders it compiled and the draws it was sent (the smoke's proof that it drew)
		contexts.webgl2 = () => {
			const { gl, shaders } = require(fake).fakeGL();
			smoked.shaders.push(shaders);
			return new Proxy(gl, {
				get(t, k) {
					const v = t[k];
					if (typeof k === 'string' && k.startsWith('draw') && typeof v === 'function') return (...a: unknown[]) => (smoked.draws++, v(...a));
					return v;
				}
			});
		};
	}
	g.history = { pushState() {}, replaceState() {}, back() {}, state: null };
	g.matchMedia = (q: string) => ({ matches: /prefers-color-scheme: light|pointer: fine|hover: hover/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
	g.requestAnimationFrame = (cb: FrameRequestCallback) => (rafs.set(++rafId, cb), rafId);
	g.cancelAnimationFrame = (id: number) => void rafs.delete(id);
	g.requestIdleCallback = (cb: (d: { timeRemaining: () => number; didTimeout: boolean }) => void) => setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: false }), 0) as unknown as number;
	g.cancelIdleCallback = (id: number) => clearTimeout(id);
	g.getComputedStyle = () => new Proxy({}, { get: (_t, k) => (k === 'getPropertyValue' ? () => '' : '') });
	class Observer {
		constructor(_cb: unknown) {}
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
	}
	g.ResizeObserver = g.IntersectionObserver = g.MutationObserver = g.PerformanceObserver = Observer;
	g.HTMLElement = g.Element = g.Node = g.HTMLCanvasElement = g.HTMLImageElement = g.HTMLVideoElement = g.HTMLIFrameElement = g.SVGElement = El;
	g.Image = class extends El {
		constructor() {
			super('img');
			imageOf(this);
		}
	};
	// a picture the box made comes as a plain object of its size (./box.ts): the page takes it as the bitmap it would be
	g.ImageBitmap = class ImageBitmap {
		static [Symbol.hasInstance](o: unknown) {
			return !!o && typeof o === 'object' && typeof (o as { width?: unknown }).width === 'number' && typeof (o as { height?: unknown }).height === 'number';
		}
	};
	g.createImageBitmap = async (src: { width?: number; height?: number }) => Object.assign(new g.ImageBitmap(), { width: src?.width || 1, height: src?.height || 1, close() {} });
	g.OffscreenCanvas = class extends El {
		constructor(w: number, h: number) {
			super('canvas');
			this.width = w;
			this.height = h;
		}
	};
	g.ImageData = class ImageData {
		data: Uint8ClampedArray;
		constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
			if (typeof a === 'number') (this.data = new Uint8ClampedArray(a * b * 4)), Object.assign(this, { width: a, height: b });
			else (this.data = a), Object.assign(this, { width: b, height: c ?? a.length / 4 / b });
		}
	};
	g.Path2D = class Path2D {
		addPath() {}
		moveTo() {}
		lineTo() {}
		arc() {}
		closePath() {}
		rect() {}
		bezierCurveTo() {}
		quadraticCurveTo() {}
		ellipse() {}
	};
	g.AudioContext = g.webkitAudioContext = undefined;
	g.speechSynthesis = undefined;
	g.localStorage = g.sessionStorage = storage();
	g.indexedDB = undefined;
	g.alert = g.confirm = g.prompt = () => undefined;
	g.scrollTo = () => {};
	Object.defineProperty(g, 'navigator', {
		configurable: true,
		value: {
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36 maiaCITY-census',
			platform: 'MacIntel',
			language: 'en-US',
			languages: ['en-US'],
			hardwareConcurrency: 8,
			deviceMemory: 8,
			maxTouchPoints: 0,
			onLine: true,
			storage: opfs(join(done.cache, 'opfs')),
			gpu: undefined,
			xr: undefined,
			clipboard: { writeText: async () => {} },
			mediaDevices: undefined,
			getGamepads: () => [],
			sendBeacon: () => true,
			vibrate: () => false
		}
	});
	// the cache's own worker is a browser's (OPFS's synchronous files): the page writes the cache itself (assets/cache.js)
	const BunWorker = g.Worker;
	g.Worker = function (url: string | URL, opts?: WorkerOptions) {
		if (String(url).includes('cache.worker')) throw new Error('census: no cache worker (the page writes the cache)');
		return new BunWorker(url, opts);
	} as unknown as typeof Worker;

	// ── fetch ──
	const realFetch = g.fetch.bind(g);
	const filesDir = join(done.cache, 'files');
	mkdirSync(filesDir, { recursive: true });
	const token = process.env.PLAY_MCP_TOKEN;
	g.fetch = async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, g.location);
		const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
		if (url.host !== 'census.local') throw new Error(`census: no fetch beyond play (${url.host})`);
		if (url.pathname.startsWith('/api/')) {
			if (method !== 'GET' && method !== 'HEAD') return new Response('census: read-only', { status: 405 });
			const route = url.pathname + url.search;
			const file = /^\/api\/files\/([0-9a-f]{64})$/.exec(url.pathname)?.[1];
			if (file) {
				// a file is what its hash names: pinned with the inputs, else kept on disk, else read from play once
				const pinned = done.inputs && join(done.inputs, 'files', `${file}.gz`);
				let bytes: Uint8Array | null = pinned && existsSync(pinned) ? gunzipSync(readFileSync(pinned)) : null;
				const at = join(filesDir, file);
				if (!bytes && existsSync(at)) bytes = readFileSync(at);
				if (!bytes) {
					const r = await realFetch(PLAY + route, { headers: auth(token, route) });
					if (!r.ok) return r;
					bytes = new Uint8Array(await r.arrayBuffer());
					writeFileSync(at, bytes);
				}
				if (hashOf(bytes) !== file) throw new Error(`census: the file ${file.slice(0, 12)}… is not what its hash names`);
				if (done.record && pinned && !existsSync(pinned)) mkdirSync(join(done.inputs!, 'files'), { recursive: true }), writeFileSync(pinned, gzipSync(bytes, { level: 9 }));
				fetched.files++;
				return new Response(bytes, { status: 200, headers: { 'content-type': 'application/octet-stream' } });
			}
			const pinnedAt = done.inputs && join(done.inputs, `${createHash('sha256').update(route).digest('hex').slice(0, 20)}.json.gz`);
			if (pinnedAt && existsSync(pinnedAt)) {
				const p = JSON.parse(gunzipSync(readFileSync(pinnedAt)).toString('utf8'));
				fetched.pinned.add(route);
				return new Response(p.body, { status: p.status, headers: { 'content-type': p.type } });
			}
			const r = await realFetch(PLAY + route, { headers: auth(token, route) });
			fetched.live.add(route);
			if (done.verbose) console.error('census: live', r.status, route);
			const body = await r.text();
			if (done.record && pinnedAt && r.ok) writeFileSync(pinnedAt, gzipSync(JSON.stringify({ route, status: r.status, type: r.headers.get('content-type') ?? 'application/json', blake3: hashOf(body), body }), { level: 9 }));
			return new Response(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' } });
		}
		// the site's static files: the frozen engines from this checkout's (they never change), the rest from root's
		const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
		const at = [join(root, 'static', rel), join(SITE, 'static', rel)].find((p) => existsSync(p));
		if (!at) return new Response('not found', { status: 404 });
		return new Response(readFileSync(at), { status: 200, headers: { 'content-type': rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
	};
	return done;
}

const auth = (token: string | undefined, route: string): Record<string, string> => {
	if (!token) throw new Error(`census: ${route} is not pinned (census/inputs/; --record pins it) and PLAY_MCP_TOKEN, the admin token play is read with live, is not set`);
	return { authorization: `Bearer ${token}`, accept: '*/*' };
};

/** a module path as Bun would find it from an extensionless or folder import */
function resolveFile(p: string) {
	if (existsSync(p) && !p.endsWith('/') && !isDir(p)) return p;
	for (const ext of ['.ts', '.js', '.svelte.ts', '.svelte.js', '/index.ts', '/index.js']) if (existsSync(p + ext)) return p + ext;
	return p;
}
const isDir = (p: string) => {
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
};

/** an image that loads as soon as it is given a source: 1×1, nothing drawn */
function imageOf(e: El) {
	let src = '';
	Object.defineProperty(e, 'src', {
		get: () => src,
		set: (v: string) => {
			src = v;
			Object.assign(e, { naturalWidth: 1, naturalHeight: 1, width: 1, height: 1, complete: true });
			setTimeout(() => e.dispatchEvent(new Event('load')), 0);
		}
	});
	Object.assign(e, { decode: () => Promise.resolve(), complete: false, naturalWidth: 0, naturalHeight: 0, crossOrigin: null });
}

function storage() {
	const m = new Map<string, string>();
	return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; } };
}

/** a module of the site run (root's src/lib), by its path under $lib, for the census's own imports */
export const lib = (p: string) => resolveFile(join(done.root, 'src/lib', p));
