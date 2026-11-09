/*
 * THE CENSUS, ONE WORLD — a world built on the CPU (./setup.ts) and counted from named cameras (intent bba45d6e). For
 * each view: the walker placed there (as the Mac's runs place it, selector-shots.mjs), frames turned until its
 * streaming settles (`quiet`), then a measured run of frames, every draw counted (./counting.js). Per view:
 *
 * - `frames`: each measured frame's triangles and draws; `tris` the median frame's triangles, as the Mac takes it;
 * - `totals`: the median frame's draws by pass (main, shadow, into targets), meshes and instanced batches, and what
 *   frustum culling removed (objects and their triangles);
 * - `renderers`: each asset renderer's own count (out, in, library: `__assets.stats()`, the Mac's `assets`);
 * - `copies`: every copy each asset renderer holds, its distance, size on screen, level and triangles (the census of
 *   `__assets.kinds()`, the same as the Mac's `--census`).
 */
import { setup, frame, lib, fetched } from './setup';
import { CountingRenderer } from './counting.js';
import { refusedContexts } from './dom';

/** Sandbox 1's views, as the Mac's runs (selector-shots.mjs): x, z (m; the cell's middle the master dome), yaw, pitch */
export const VIEWS = {
	near: { x: 0, z: 95, yaw: 0, pitch: -0.05 },
	mid: { x: 0, z: 235, yaw: 0, pitch: -0.05 },
	far: { x: 0, z: 370, yaw: 0, pitch: -0.12 }
} as const;
export type ViewName = keyof typeof VIEWS | 'open';
export type World = 'sandbox-1' | 'sandbox-3' | 'worlds';
/** the views each world is counted from: Sandbox 1's named cameras; the others as they open */
export const VIEWS_OF: Record<World, ViewName[]> = { 'sandbox-1': ['near', 'mid', 'far'], 'sandbox-3': ['open'], worlds: ['open'] };
/** the hour every census is taken at: noon, lamps out (the Mac's runs); the world's clock held (s): fish, birds still */
export const HOUR = 12, MOMENT = 60;
/** the field of view the worlds draw with (render/world.js), for a copy's size on screen */
const FOV = 68;

/**
 * A copy as its renderer drew it last: its level (a shape level, its `picture`, or `unseen`: culled or too small) and
 * the triangles that cost. A picture costs 2, but a kind that takes no picture (`standIn`) draws its coarsest shape in
 * its place. A `ghost` is a copy the page put away that the renderer still drew in the last frame: put away by the
 * renderer's own record (`give`, its kind's `free`; intent 0229ed3e), or at a matrix of scale 0 at the origin (as
 * drawn.js's AWAY once was, three's decompose giving it a scale of 1): the page's history, not the view.
 */
export type Copy = { renderer: string; kind: string; d: number; size: number; level: number | 'picture' | 'unseen'; tris: number | null; standIn?: true; ghost?: true };
export type Totals = {
	tris: number;
	calls: number;
	mainTris: number;
	mainCalls: number;
	meshes: number;
	instanced: number;
	instances: number;
	shadowCalls: number;
	shadowTris: number;
	targetCalls: number;
	targetTris: number;
	culledObjects: number;
	culledTris: number;
};
export type ViewCensus = {
	world: string;
	view: string;
	settled: boolean;
	settleMs: number;
	frames: { tris: number; calls: number; shadowTris: number }[];
	totals: Totals;
	renderers: Record<string, { tris: number; calls: number; copies: number; pictures: number; levels: number[]; building: number } | null>;
	copies: Copy[];
	/** triangles in shapes per renderer: every copy drawn at a level (not a picture), as the Mac's census adds them */
	shapeTris: Record<string, number>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** the frames' pace: a display's 60 a second, as the Mac's runs drew them; the time left in a frame is the page's */
const FRAME_MS = 1000 / 60;
let lastFrame = 0;
async function paced() {
	const left = lastFrame + FRAME_MS - performance.now();
	await sleep(Math.max(0, left));
	lastFrame = performance.now();
}
const g = globalThis as any;

/** turns frames for `ms` (paced), or until `until` */
async function run(ms: number, until?: () => boolean) {
	const end = performance.now() + ms;
	while (performance.now() < end) {
		frame();
		await paced();
		if (until?.()) return true;
	}
	return false;
}

/**
 * Frames turned until what each frame draws holds still for `hold` ms on end (at most `ms`): the same triangles, or,
 * in a world that moves (people walking in and out of the view), within `band` of each other
 */
async function steady(ms: number, hold: number, band = 0) {
	const end = performance.now() + ms;
	let lo = Infinity, hi = -Infinity, since = performance.now();
	while (performance.now() < end) {
		const f = frameTally();
		const now = performance.now();
		lo = Math.min(lo, f.tris);
		hi = Math.max(hi, f.tris);
		if (hi - lo > band * hi) (lo = hi = f.tris), (since = now);
		else if (now - since >= hold) return true;
		await paced();
	}
	return false;
}

/**
 * The world's streaming settled, as the Mac's QUIET (intent 373050d1): nothing built or kept in an asset renderer, no
 * dome's inside building (`__domeStream`), and their copies, pictures and domes the same for 60 frames on end
 */
let was = '', still = 0;
function quiet() {
	const s = g.__assets?.stats?.() ?? {}, rs = ['out', 'in', 'library'].map((k) => s[k]).filter(Boolean);
	const domes = (g.__domeStream?.states?.() ?? []).map((e: { state: string }) => e.state);
	const busy = rs.some((r) => r.building || r.keeping) || domes.includes('building');
	const key = JSON.stringify([busy, rs.map((r) => [r.copies, r.taken]), domes]);
	if (key !== was) (was = key), (still = 0);
	return !busy && ++still > 60;
}

/** builds Sandbox 1 (the route's own mount: play/site/src/routes/sandbox-1/+page.svelte) and gives its handle */
export async function mountSandbox1(log: (s: string) => void) {
	(g.__interiorHour = HOUR), (g.__worldTime = MOMENT);
	const { catalogReady } = await import(lib('recipes'));
	const { SANDBOX } = await import(lib('content/assets/sandboxes.js'));
	await catalogReady(SANDBOX.one);
	const { mountVillage } = await import(lib('content/sandbox-2/interior/village'));
	const S5 = await (await import(lib('content/sandbox-2/interior/sandbox5.js'))).sandbox5();
	const el = g.document.createElement('div');
	g.document.body.appendChild(el);
	return turnUntil(mountVillage(el, (l: string) => log(`  ${l}`), S5));
}

/** builds Sandbox 3, the old city, as its route opens it (play/site/src/routes/sandbox-3/+page.svelte) */
async function mountSandbox3() {
	const { catalogReady } = await import(lib('recipes'));
	const { SANDBOX } = await import(lib('content/assets/sandboxes.js'));
	await catalogReady(SANDBOX.three);
	const { createWorld } = await import(lib('content/maiacity-v2/world.js'));
	const canvas = g.document.createElement('canvas');
	g.document.body.appendChild(canvas);
	const world = createWorld(canvas, { onRoam: () => {} });
	world.set({ at: 'home', cube: 'home', tent: 'up', shelter: 'hidden', battery: 'store', me: 'A', other: null, present: ['A'], rides: false, hour: undefined, cruise: '', spot: null, marked: false, by: '', pick: '', name: '', homed: { A: true, B: true, C: true } });
	world.touring(false);
	world.reveal(2);
	world.trees([]);
	world.focus('tribe');
	world.freeWalk(true);
	await turnUntil(world.ready);
	return world;
}

/** the worlds view (play/site/src/routes/worlds/+page.svelte): a world asset, the newest version of the one named
 *  (`asset`, its UUID), else of the first world play lists, shown as the page shows it */
async function mountWorlds(log: (s: string) => void, asset?: string) {
	const { catalogReady } = await import(lib('recipes'));
	await catalogReady();
	const get = async (route: string) => (await fetch(`/api${route}`)).json();
	const id = asset ?? (await get('/assets')).filter((a: { grp: string }) => a.grp === 'worlds')[0]?.id;
	if (!id) throw new Error('census: play lists no world');
	const chain = await get(`/assets/${id}`);
	const v = chain.versions[0];
	const hash = v.recipe ?? v.variants.find((x: { name: string }) => x.name === v.defaultVariant)?.recipe ?? v.variants[0]?.recipe;
	const { INDEX, source } = await import(lib('content/assets/catalog.js'));
	const { createWorldView } = await import(lib('content/worlds/view.js'));
	const el = g.document.createElement('div');
	g.document.body.appendChild(el);
	const view = createWorldView(el, { source, engine: INDEX.engine, sound: false });
	await turnUntil(view.show(hash));
	log(`census: the worlds view shows ${chain.label} (${id}, ${hash.slice(0, 12)}…)`);
	return view;
}

/** builds a world as its route opens it, frames turned while it builds: the census's and the Mac jobs' dry run's (../macjob) */
export async function mount(world: World, o: { asset?: string; log?: (s: string) => void } = {}) {
	const log = o.log ?? ((s: string) => console.error(s));
	return world === 'sandbox-1' ? mountSandbox1(log) : world === 'sandbox-3' ? mountSandbox3() : mountWorlds(log, o.asset);
}

/** frames turned while a promise is open */
async function turnUntil<T>(p: Promise<T>) {
	let done = false;
	const q = p.finally(() => (done = true));
	while (!done) {
		frame();
		await paced();
	}
	return q;
}

/** what the counting renderer drew in one frame */
function frameTally() {
	const r = CountingRenderer.made[0];
	r.tally.reset();
	frame();
	const t = r.tally;
	return { tris: t.tris + t.shadowTris + t.targetTris, calls: t.calls + t.shadowCalls + t.targetCalls, t: { ...t } };
}

export async function censusOf(o: { world: World; views?: ViewName[]; asset?: string; settleMs?: number; measureFrames?: number; log?: (s: string) => void }): Promise<ViewCensus[]> {
	const log = o.log ?? ((s: string) => console.error(s));
	// walked near to far whatever order they are asked in: what one view leaves is the next one's
	const views = VIEWS_OF[o.world].filter((v) => !o.views || o.views.includes(v));
	if (o.views?.some((v) => !views.includes(v))) throw new Error(`census: ${o.world} has the views ${VIEWS_OF[o.world].join(', ')}`);
	const t0 = performance.now();
	await mount(o.world, { asset: o.asset, log });
	// Sandbox 1 where it opens, all streamed in round the eye, the domes' insides built ahead too (each copy it ever put
	// down stays held by its renderer, put away: `Copy`'s ghosts)
	const up = o.world !== 'sandbox-1' || (await run(o.settleMs ?? 180_000, quiet));
	if (CountingRenderer.made.length !== 1) throw new Error(`census: ${CountingRenderer.made.length} renderers were made, not one`);
	log(`census: ${o.world} built in ${((performance.now() - t0) / 1000).toFixed(1)} s${up ? '' : ' (still building)'} (${fetched.live.size} routes live, ${fetched.pinned.size} pinned, ${fetched.files} files)`);
	const out: ViewCensus[] = [];
	for (const name of views) {
		const v = name === 'open' ? null : VIEWS[name];
		const ts = performance.now();
		if (v) g.__walker.place(v.x, v.z, v.yaw, v.pitch);
		// as the Mac: a moment, then until its streaming has settled (at most settleMs)
		await run(1500);
		const settled = await run(o.settleMs ?? 180_000, quiet);
		// then until each frame draws the same triangles for three seconds running, at most a minute
		const stable = await steady(60_000, 3000, v ? 0 : 0.1);
		const frames: { tris: number; calls: number; shadowTris: number; t: any }[] = [];
		for (let i = 0; i < (o.measureFrames ?? 90); i++) {
			const f = frameTally();
			frames.push({ tris: f.tris, calls: f.calls, shadowTris: f.t.shadowTris, t: f.t });
			await paced();
		}
		// the median frame by triangles drawn, as the Mac's runs take it
		const sorted = [...frames].sort((a, b) => a.tris - b.tris);
		const med = sorted[sorted.length >> 1];
		const t = med.t;
		const totals: Totals = { tris: med.tris, calls: med.calls, mainTris: t.tris, mainCalls: t.calls, meshes: t.meshes, instanced: t.instanced, instances: t.instances, shadowCalls: t.shadowCalls, shadowTris: t.shadowTris, targetCalls: t.targetCalls, targetTris: t.targetTris, culledObjects: t.culledObjects, culledTris: t.culledTris };
		// what draws the most, by where it hangs in the scene (CENSUS_DEBUG=1)
		if (process.env.CENSUS_DEBUG) {
			const by = new Map<string, number>();
			for (const [obj, n] of t.draws) {
				const path: string[] = [];
				for (let o = obj; o; o = o.parent) path.unshift(o.name || o.type);
				const key = path.slice(0, 4).join(' / ');
				by.set(key, (by.get(key) ?? 0) + n);
			}
			for (const [k, n] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 25)) log(`  ${Math.round(n).toLocaleString('en').padStart(10)}  ${k}`);
		}
		const s = g.__assets?.stats?.() ?? {};
		const of = (r: any) => r && { tris: r.tris, calls: r.calls, copies: r.copies, pictures: r.pictures, levels: r.levels, building: r.building };
		const copies = v ? copiesAt(v) : [];
		const shapeTris: Record<string, number> = {};
		for (const c of copies) if (typeof c.level === 'number') shapeTris[c.renderer] = (shapeTris[c.renderer] ?? 0) + (c.tris ?? 0);
		out.push({ world: o.world, view: name, settled: settled && stable, settleMs: Math.round(performance.now() - ts), frames: frames.map(({ tris, calls, shadowTris }) => ({ tris, calls, shadowTris })), totals, renderers: { out: of(s.out), in: of(s.in), library: of(s.library) }, copies, shapeTris });
		log(`census: ${o.world} ${name}: ${Math.round(med.tris).toLocaleString('en')} triangles a frame (${Math.round(t.tris).toLocaleString('en')} main, ${Math.round(t.shadowTris).toLocaleString('en')} shadow), ${med.calls} draws${settled ? '' : ', still building'}`);
	}
	if (refusedContexts.length) throw new Error(`census: a WebGL context was asked for (${refusedContexts.join(', ')})`);
	return out;
}

/** every copy the asset renderers hold at view v, as their selector drew it last (`k.was`): the Mac's census */
function copiesAt(v: { x: number; z: number }): Copy[] {
	const all = g.__assets.kinds?.();
	if (!all) throw new Error('census: this tree has no __assets.kinds()');
	const tan = Math.tan((FOV * Math.PI) / 360);
	const copies: Copy[] = [];
	for (const [renderer, list] of Object.entries(all as Record<string, any[] | undefined>)) {
		if (!list) continue;
		for (const k of list) {
			if (!k.ok) continue;
			const away = new Set((k.free ?? []).map((c: any) => c.i));
			for (let i = 0; i < k.n; i++) {
				// put away and still drawn (its selector's level kept): a ghost the renderer's record shows
				if (!k.alive[i] && !(away.has(i) && k.was[i] >= 0)) continue;
				const x = k.M[i * 16 + 12], z = k.M[i * 16 + 14], d = Math.hypot(x - v.x, z - v.z), L = k.was[i];
				const standIn = L >= k.levels.length && !k.slot;
				const tris = L < 0 ? 0 : standIn ? (k.levels[k.levels.length - 1].level?.tris ?? null) : L >= k.levels.length ? 2 : (k.levels[L].level?.tris ?? null);
				const o = i * 16, ghost = !k.alive[i] || [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14].every((j) => k.M[o + j] === 0);
				copies.push({ renderer, kind: k.label ?? k.key, d: +d.toFixed(1), size: +((k.radius * k.S[i]) / (Math.max(d, 1e-3) * tan)).toFixed(4), level: L < 0 ? 'unseen' : L >= k.levels.length ? 'picture' : L, tris, ...(standIn ? { standIn: true as const } : {}), ...(ghost ? { ghost: true as const } : {}) });
			}
		}
	}
	return copies;
}

export { setup };
