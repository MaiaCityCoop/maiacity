/*
 * THE CENSUS, ONE WORLD — a world built on the CPU (./setup.ts) and counted from named cameras (intent bba45d6e). For
 * each view: the walker placed there (as the Mac's runs place it, selector-shots.mjs), frames turned until the asset
 * renderers build nothing more (as its `settle`), then a measured run of frames, every draw of each counted by the
 * counting renderer (./counting.js). It gives back, per view:
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
export type ViewName = keyof typeof VIEWS;
/** the hour every census is taken at: noon, lamps out (the Mac's runs) */
export const HOUR = 12;
/** the field of view the worlds draw with (render/world.js), for a copy's size on screen */
const FOV = 68;

/**
 * A copy as its renderer drew it last: its level (a shape level, its `picture`, or `unseen`: culled or too small) and
 * the triangles that cost. A picture costs 2, but a kind that takes no picture (`standIn`) draws its coarsest shape in
 * its place. A `ghost` is a copy the page put away (drawn.js AWAY: a matrix of scale 0 at the origin) that the renderer
 * still draws there, three's decompose giving a scale of 1 for it: the page's history, not the view.
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
/** the frames' pace: a display's 60 a second, as the Mac's runs drew them (work the world slices over its frames, a
 *  dome built in the background, goes at the speed it would on screen); the time left in a frame is the page's */
const FRAME_MS = 1000 / 60;
let lastFrame = 0;
async function paced() {
	const left = lastFrame + FRAME_MS - performance.now();
	await sleep(Math.max(0, left));
	lastFrame = performance.now();
}
const g = globalThis as any;

/** turns frames for `ms` (a frame every ~16 ms, the page's work between them), or until `until` */
async function run(ms: number, until?: () => boolean) {
	const end = performance.now() + ms;
	while (performance.now() < end) {
		frame();
		await paced();
		if (until?.()) return true;
	}
	return false;
}

/** frames turned until each frame draws the same triangles for `hold` ms on end (at most `ms`) */
async function steady(ms: number, hold: number) {
	const end = performance.now() + ms;
	let was = -1, since = performance.now();
	while (performance.now() < end) {
		const f = frameTally();
		const now = performance.now();
		if (f.tris !== was) (was = f.tris), (since = now);
		else if (now - since >= hold) return true;
		await paced();
	}
	return false;
}

const building = (of = ['out', 'in', 'library']) => {
	const s = g.__assets?.stats?.();
	return s ? of.reduce((a, k) => a + (s[k]?.building ?? 0), 0) : null;
};
/** the library's copies the same for a second on end: the floor's cover round the eye all put down (a tile a frame) */
let coverSeen = { n: -1, at: 0 };
const coverStill = () => {
	const n = g.__assets?.stats?.().library?.copies ?? 0, now = performance.now();
	if (n !== coverSeen.n) coverSeen = { n, at: now };
	return now - coverSeen.at >= 1000;
};

/** builds Sandbox 1 (the route's own mount: play/site/src/routes/sandbox-1/+page.svelte) and gives its handle */
async function mountSandbox1(log: (s: string) => void) {
	g.__interiorHour = HOUR;
	const { catalogReady } = await import(lib('recipes'));
	const { SANDBOX } = await import(lib('content/assets/sandboxes.js'));
	await catalogReady(SANDBOX.one);
	const { mountVillage } = await import(lib('content/sandbox-2/interior/village'));
	const S5 = await (await import(lib('content/sandbox-2/interior/sandbox5.js'))).sandbox5();
	const el = g.document.createElement('div');
	g.document.body.appendChild(el);
	let up = false;
	const mounted = mountVillage(el, (l: string) => log(`  ${l}`), S5).finally(() => (up = true));
	while (!up) {
		frame();
		await paced();
	}
	return mounted;
}

/** what the counting renderer drew in one frame */
function frameTally() {
	const r = CountingRenderer.made[0];
	r.tally.reset();
	frame();
	const t = r.tally;
	return { tris: t.tris + t.shadowTris + t.targetTris, calls: t.calls + t.shadowCalls + t.targetCalls, t: { ...t } };
}

export async function censusOf(o: { world: 'sandbox-1'; views: ViewName[]; settleMs?: number; measureFrames?: number; log?: (s: string) => void }): Promise<ViewCensus[]> {
	const log = o.log ?? ((s: string) => console.error(s));
	const t0 = performance.now();
	await mountSandbox1(log);
	if (CountingRenderer.made.length !== 1) throw new Error(`census: ${CountingRenderer.made.length} renderers were made, not one`);
	// where it opens, as the Mac's page: the forest and the library built and the floor's cover streamed in round the eye
	// (each copy it ever put down stays held by the renderer, put away: `Copy`'s ghosts), but not the domes'
	// insides, which the Mac's page had not finished there (their kinds, the `in` renderer's, still building)
	const up = await run(o.settleMs ?? 180_000, () => building(['out', 'library']) === 0 && coverStill());
	log(`census: Sandbox 1 built in ${((performance.now() - t0) / 1000).toFixed(1)} s${up ? '' : ' (still building)'} (${fetched.live.size} routes live, ${fetched.pinned.size} pinned, ${fetched.files} files)`);
	const out: ViewCensus[] = [];
	for (const name of o.views) {
		const v = VIEWS[name];
		const ts = performance.now();
		g.__walker.place(v.x, v.z, v.yaw, v.pitch);
		// as the Mac: a moment, then until nothing builds (at most settleMs), then three seconds more
		await run(1500);
		const settled = await run(o.settleMs ?? 180_000, () => building() === 0);
		// then until what a frame draws holds still: the same triangles for three seconds running (a dome let go, a
		// tile of the floor's cover built, all done), at most a minute
		const stable = await steady(60_000, 3000);
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
		const s = g.__assets.stats();
		const of = (r: any) => r && { tris: r.tris, calls: r.calls, copies: r.copies, pictures: r.pictures, levels: r.levels, building: r.building };
		const copies = copiesAt(v);
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
			for (let i = 0; i < k.n; i++) {
				if (!k.alive[i]) continue;
				const x = k.M[i * 16 + 12], z = k.M[i * 16 + 14], d = Math.hypot(x - v.x, z - v.z), L = k.was[i];
				const standIn = L >= k.levels.length && !k.slot;
				const tris = L < 0 ? 0 : standIn ? (k.levels[k.levels.length - 1].level?.tris ?? null) : L >= k.levels.length ? 2 : (k.levels[L].level?.tris ?? null);
				const o = i * 16, ghost = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14].every((j) => k.M[o + j] === 0);
				copies.push({ renderer, kind: k.label ?? k.key, d: +d.toFixed(1), size: +((k.radius * k.S[i]) / (Math.max(d, 1e-3) * tan)).toFixed(4), level: L < 0 ? 'unseen' : L >= k.levels.length ? 'picture' : L, tris, ...(standIn ? { standIn: true as const } : {}), ...(ghost ? { ghost: true as const } : {}) });
			}
		}
	}
	return copies;
}

export { setup };
