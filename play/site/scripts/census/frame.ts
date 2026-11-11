/*
 * THE FRAME'S CALLS (intent 416c555c, ../census.ts --frame) — what one frame of a world asks of WebGPU, counted on the
 * CPU: the world built by its own code on three's own WebGPURenderer, its WebGPU backend over a device that only
 * answers (./fakegpu.js), so each frame runs all its main-thread work and every call it makes is counted. Where the
 * census (./run.ts) counts the draws three would send, this counts what a browser's main thread pays for call by call
 * (Safari's WebGPU is bound by it): the draws of every pass, the buffers written and their bytes, the bind groups,
 * pipelines and vertex buffers set.
 *
 * It counts a visitor's frame, not a film's: the hour is pinned (noon) but the world's clock runs (a held clock,
 * `__worldTime`, is a film's: the sky then draws its shadows every frame), on a clock of its own that turns one 60th of
 * a second a frame (`performance.now`), so no count depends on how fast this machine is.
 *
 * Per view, two measures of `frames` frames each, their calls averaged a frame:
 * - `still`: the eye at rest, the world settled (what is written or drawn again though nothing moved);
 * - `walk`: the eye stepping forward and turning each frame as a walk does (STEP), where the world has a walker.
 */
import { frame, gpu } from './setup';
import { VIEWS, VIEWS_OF, mount, type ViewName, type World } from './run';
import { quietness } from '../quiet.js';

/** a walk's step a frame: 1.5 m/s forward and 20° a second round, at 60 frames a second */
export const STEP = { forward: 1.5 / 60, yaw: (20 * Math.PI) / 180 / 60 };

export type FrameCount = {
	/** every call made on the device, its queue, its encoders and its passes */
	calls: number;
	/** draws of every render pass (draw, drawIndexed and their indirect kinds) */
	draws: number;
	/** queue.writeBuffer calls, and the bytes they carried */
	writes: number;
	bytes: number;
	/** render passes begun, and those that drew more than a screen's quad (the scene's and the shadows') */
	passes: number;
	scenePasses: number;
	/** bind groups, pipelines and vertex buffers set */
	binds: number;
	pipelines: number;
	vertexBuffers: number;
	/** the main thread's own time a frame on this machine, ms: told, never a bound (it is the box's clock) */
	ms: number;
	/** each call by name, a frame */
	by: Record<string, number>;
};
export type FrameView = { world: string; view: string; settled: boolean; still: FrameCount; walk: FrameCount | null };

const g = globalThis as any;
/** the machine's clock, for the one time told (`ms`) */
const real = performance.now.bind(performance);
/** the page's clock: a 60th of a second a frame */
let clock = 0;
const turn = () => {
	clock += 1000 / 60;
	frame(clock);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** frames turned until the world's streaming has been settled (../quiet.js) for 60 on end, at most `ms` of the page's clock: whether it was */
async function quiet(ms: number) {
	const end = clock + ms;
	for (let still = 0; clock < end; ) {
		turn();
		// the asset box's workers answer between frames
		await sleep(1);
		const q = quietness(g);
		if (q === 0 || q === null) {
			if (++still > 60) return true;
		} else still = 0;
	}
	return false;
}

/** `n` frames, `each` run before each: what they asked of the device, a frame */
async function count(n: number, each?: (i: number) => void): Promise<FrameCount> {
	const d = gpu.fake;
	d.reset();
	const t0 = real();
	for (let i = 0; i < n; i++) {
		each?.(i);
		turn();
		await sleep(0);
	}
	const ms = (real() - t0) / n;
	const by: Record<string, number> = {};
	let calls = 0, draws = 0;
	for (const [k, v] of d.calls as Map<string, number>) {
		by[k] = +(v / n).toFixed(2);
		calls += v;
		if (/^pass\.draw/.test(k)) draws += v;
	}
	const per = (k: string) => (d.calls.get(k) ?? 0) / n;
	const passes = d.passes as { draws: number }[];
	return { calls: calls / n, draws: draws / n, writes: per('queue.writeBuffer'), bytes: d.bytes / n, passes: passes.length / n, scenePasses: passes.filter((p) => p.draws > 1).length / n, binds: per('pass.setBindGroup'), pipelines: per('pass.setPipeline'), vertexBuffers: per('pass.setVertexBuffer'), ms, by };
}

export async function frameOf(o: { world: World; views?: ViewName[]; asset?: string; settleMs?: number; frames?: number; log?: (s: string) => void }): Promise<FrameView[]> {
	const log = o.log ?? ((s: string) => console.error(s));
	if (!gpu.fake) throw new Error('census: the frame is counted on the device that only answers (setup\'s `gpu`)');
	const views = VIEWS_OF[o.world].filter((v) => !o.views || o.views.includes(v));
	if (o.views?.some((v) => !views.includes(v))) throw new Error(`census: ${o.world} has the views ${VIEWS_OF[o.world].join(', ')}`);
	// what the world's code throws, and what three reports of a shader it could not build (it logs, never throws): a
	// frame that failed is no count
	const errors: string[] = [];
	const onError = (e: unknown) => void errors.push(e instanceof Error ? `${e.message}\n${(e.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(e));
	process.on('uncaughtException', onError);
	process.on('unhandledRejection', onError);
	const said = { error: console.error, warn: console.warn };
	for (const k of ['error', 'warn'] as const)
		console[k] = (...a: unknown[]) => {
			const text = a.map(String).join(' ');
			if (/^THREE\.TSL: \w*Error\b/.test(text)) errors.push(text.slice(0, 400));
			said[k](...a);
		};
	const t0 = real();
	// FRAME_PASSES=1: each thing added to a tree remembers the line of the world's code that added it
	if (process.env.FRAME_PASSES) {
		const { Object3D } = await import('three');
		const add = Object3D.prototype.add;
		Object3D.prototype.add = function (this: any, ...things: any[]) {
			const from = (new Error().stack ?? '').split('\n').find((l) => /src\/lib\/content\//.test(l) && !/node_modules/.test(l));
			const at = from ? from.replace(/^.*src\/lib\/content\//, '').replace(/\)?$/, '').replace(/:\d+$/, '') : '';
			for (const t of things) if (t && at && !t.__from) t.__from = at;
			return add.apply(this, things);
		};
	}
	await mount(o.world, { asset: o.asset, log });
	// from here a visitor's frames on the page's own clock: the world's clock let go (the hour stays pinned)
	g.__worldTime = undefined;
	clock = real();
	performance.now = () => clock;
	const settle = o.settleMs ?? 180_000, n = o.frames ?? 30;
	const up = await quiet(settle);
	log(`census: ${o.world} built in ${((real() - t0) / 1000).toFixed(1)} s on WebGPURenderer (a device that only answers)${up ? '' : ' (still building)'}`);
	const out: FrameView[] = [];
	for (const name of views) {
		const v = name === 'open' ? null : VIEWS[name];
		if (v) g.__walker.place(v.x, v.z, v.yaw, v.pitch);
		const settled = await quiet(settle);
		const still = await count(n);
		// FRAME_PASSES=1: what is drawn, by the names up its tree, in one more frame
		if (process.env.FRAME_PASSES) {
			const { Object3D } = await import('three');
			const tally = new Map<string, number>();
			const baked = new Map<number, { n: number; bakedN: number; mats: Set<string>; sig: Set<string>; verts: number; small: number }>();
			const was = Object3D.prototype.onBeforeRender;
			Object3D.prototype.onBeforeRender = function (this: any) {
				let from = '';
				for (let o = this; o && !from; o = o.parent) from = o.__from ?? '';
				const key = `${from || '?'} [${Array.isArray(this.material) ? `${this.material.length} materials (${new Set(this.material).size} different, ${new Set(this.material.map((m: any) => [m.type, m.roughness, m.metalness, m.transparent, m.side, m.map?.uuid, m.emissive?.getHex?.(), m.vertexColors, m.opacity].join())).size} but for colour) x${this.count} ${this.geometry?.index ? this.geometry.index.count / 3 : 0} tris` : this.material?.name || this.material?.type}${this.isInstancedMesh ? ' instanced' : ''}${this.isSkinnedMesh ? ' skinned' : ''}${this.castShadow ? ' casts' : ''}]`;
				tally.set(key, (tally.get(key) ?? 0) + 1);
				if (this.geometry?.userData?.baked || /interior\.ts/.test(from)) {
					let top = this;
					while (top.parent && top.parent.parent) top = top.parent;
					const b = (baked.get(top.id) ?? baked.set(top.id, { n: 0, bakedN: 0, mats: new Set(), sig: new Set(), verts: 0, small: 0 }).get(top.id))!;
					b.n++;
					if (this.geometry?.userData?.baked) b.bakedN++;
					const m = this.material;
					b.mats.add(`${m?.uuid}${this.castShadow}`);
					b.sig.add([m?.type, m?.color?.getHex?.(), m?.map?.uuid, m?.roughness, m?.metalness, m?.emissive?.getHex?.(), m?.emissiveIntensity, m?.transparent, m?.opacity, m?.side, m?.flatShading, m?.vertexColors, m?.normalMap?.uuid, this.castShadow].join());
					const v = this.geometry?.attributes?.position?.count ?? 0;
					b.verts += v;
					if (v < 20000) b.small++;
				}
			};
			turn();
			Object3D.prototype.onBeforeRender = was;
			for (const [id, b] of baked) log(`census: ${name} interior ${id}: ${b.n} draws (${b.bakedN} baked, ${b.small} under 20k vertices), ${b.mats.size} materials, ${b.sig.size} that look different, ${b.verts} vertices`);
			log(`census: ${name} drawn, by tree:\n${[...tally].sort((x, y) => y[1] - x[1]).slice(0, 110).map(([k, v]) => `  ${v}  ${k}`).join('\n')}`);
		}
		if (process.env.FRAME_PASSES) log(`census: ${name} buffers written in ${n} frames at rest, by buffer:\n${[...(gpu.fake.writesBy as Map<string, number>)].sort((x, y) => y[1] - x[1]).slice(0, 70).map(([k, v]) => `  ${v}  ${k}`).join('\n')}`);
		if (process.env.FRAME_PASSES) log(`census: ${name} what differed between a buffer's writes (float index: times; -1 nothing):\n${[...(gpu.fake.differs as Map<string, Map<number | string, number>>)].filter(([k]) => /_object_|UniformBuffer/.test(k)).sort((x, y) => [...y[1].values()].reduce((p, q) => p + q, 0) - [...x[1].values()].reduce((p, q) => p + q, 0)).slice(0, 14).map(([k, d]) => `  ${k}: ${[...d].sort((p, q) => q[1] - p[1]).slice(0, 12).map(([i, c]) => `${i}:${c}`).join(' ')}`).join('\n')}`);
		// FRAME_PASSES=1: the last frame's passes, each its target and draws, and what the asset renderers say they draw
		if (process.env.FRAME_PASSES) {
			const per = Math.round(still.passes);
			log(`census: ${name} passes: ${(gpu.fake.passes as { width: number; height: number; colors: number; draws: number }[]).slice(-per).map((p) => `${p.width}x${p.height}/${p.colors}:${p.draws}`).join(' ')}`);
			const st = g.__assets?.stats?.();
			if (st) for (const [where, x] of Object.entries(st) as [string, any][]) if (x) log(`census: ${name} assets ${where}: ${x.kinds} kinds, ${x.copies} copies, ${x.culled} not looked at or out of view, ${x.calls} draws, ${x.tris} triangles, levels ${x.levels}, pictures ${x.pictures}`);
		}
		// a walk from the view: forward along its yaw and turning, a step a frame; then back where it stood
		let walk: FrameCount | null = null;
		if (v && g.__walker) {
			const at = (i: number) => g.__walker.place(v.x + Math.sin(v.yaw) * STEP.forward * i, v.z - Math.cos(v.yaw) * STEP.forward * i, v.yaw + STEP.yaw * i, v.pitch);
			for (let i = 1; i <= 10; i++) (at(i), turn(), await sleep(0));
			walk = await count(n, (i) => at(11 + i));
			g.__walker.place(v.x, v.z, v.yaw, v.pitch);
		}
		out.push({ world: o.world, view: name, settled: up && settled, still, walk });
		log(`census: ${o.world} ${name}: ${Math.round(still.calls).toLocaleString('en')} calls a frame at rest${walk ? `, ${Math.round(walk.calls).toLocaleString('en')} walking` : ''}${settled ? '' : ', still building'}`);
	}
	process.off('uncaughtException', onError);
	process.off('unhandledRejection', onError);
	Object.assign(console, said);
	if (errors.length) throw new Error(`census: the frame threw ${errors.length} error${errors.length > 1 ? 's' : ''}, the first: ${errors[0]}`);
	return out;
}
