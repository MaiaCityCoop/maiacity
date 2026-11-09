/*
 * GRASS BY THE MILLION — the grass chosen blade by blade on the graphics card (intent e85a5860), on WebGPU only: each
 * frame one compute pass runs over every candidate blade of the cells round the eye (../../biomes/grass-gpu.js
 * `cellsAround`: hashed, nothing stored a blade), keeps those `choose` keeps (nested thinning, the view with a
 * tolerance, edge on, a level by jittered distance) and appends each to its level's indirect draw with an atomic
 * count; the three levels are three indexed indirect draws, nearest first. Before it, a pass clears the counts and
 * a pass steps the trample map (grass-gpu.js `Trample`'s twin), which the blades read to lie flat where trodden.
 *
 * `grassFieldOn(renderer, o)`: on WebGPU's own backend this field, else intent 7's instanced tiles
 * (../../biomes/grass.js `grassField`, the WebGL 2 fallback): the same `{ object, update, count, dispose }`.
 *
 * Compiled as every node material is, by the core (render/core.js): nothing here compiles a material.
 */
import * as THREE from 'three';
import { IndirectStorageBufferAttribute, StorageBufferAttribute } from 'three/webgpu';
import * as TSL from 'three/tsl';
import {
	Fn, If, float, int, uint, uvec2, vec2, select, smoothstep, pow, sqrt, abs, min, max, clamp, cos, sin, storage, uniform, uniformArray, instanceIndex,
	textureLoad, ivec2, atomicAdd, atomicSub, atomicStore
} from 'three/tsl';
import { GRASS, PUSHERS, fieldMask, grassField, levelGeometry, perCell } from '../../biomes/grass.js';
import {
	ARGS, OFFSETS, TRAMPLE, RECOVERED, capacities, cellsAround, cellOf, choose, gpuDevice, indirectArgs, maxCells, tallest, JITTER
} from '../../biomes/grass-gpu.js';
import { grassMaterial, grassUniforms, bladeT, clumpsT, drawU } from './grass.js';
import { windNodes, worldSeconds } from '../wind.js';

/** a number or a node, as a node @param {any} a */
const N = (a) => (typeof a === 'number' ? float(a) : typeof a === 'boolean' ? TSL.bool(a) : a);
/** grass-gpu.js's kit on TSL's nodes: the same `choose`, built into the compute shader */
export const TK = {
	f: (/** @type {number} */ v) => float(v),
	add: (/** @type {any} */ a, /** @type {any} */ b) => N(a).add(b),
	sub: (/** @type {any} */ a, /** @type {any} */ b) => N(a).sub(b),
	mul: (/** @type {any} */ a, /** @type {any} */ b) => N(a).mul(b),
	div: (/** @type {any} */ a, /** @type {any} */ b) => N(a).div(b),
	min: (/** @type {any} */ a, /** @type {any} */ b) => min(N(a), N(b)),
	max: (/** @type {any} */ a, /** @type {any} */ b) => max(N(a), N(b)),
	clamp: (/** @type {any} */ v, /** @type {any} */ a, /** @type {any} */ b) => clamp(N(v), N(a), N(b)),
	pow: (/** @type {any} */ a, /** @type {any} */ b) => pow(N(a), N(b)),
	sqrt: (/** @type {any} */ a) => sqrt(N(a)),
	abs: (/** @type {any} */ a) => abs(N(a)),
	cos: (/** @type {any} */ a) => cos(N(a)),
	sin: (/** @type {any} */ a) => sin(N(a)),
	smooth: (/** @type {any} */ a, /** @type {any} */ b, /** @type {any} */ v) => smoothstep(N(a), N(b), N(v)),
	lt: (/** @type {any} */ a, /** @type {any} */ b) => N(a).lessThan(N(b)),
	le: (/** @type {any} */ a, /** @type {any} */ b) => N(a).lessThanEqual(N(b)),
	gt: (/** @type {any} */ a, /** @type {any} */ b) => N(a).greaterThan(N(b)),
	ge: (/** @type {any} */ a, /** @type {any} */ b) => N(a).greaterThanEqual(N(b)),
	and: (/** @type {any} */ a, /** @type {any} */ b) => N(a).and(N(b)),
	sel: (/** @type {any} */ c, /** @type {any} */ a, /** @type {any} */ b) => select(N(c), N(a), N(b))
};

/** whether a renderer is WebGPU on its own backend (compute and indirect draws), not its WebGL 2 fallback @param {any} r */
export const computes = (r) => !!(r?.isWebGPURenderer && r.backend?.isWebGPUBackend);

/**
 * The grass for a renderer: chosen on the graphics card where it computes, else intent 7's tiles.
 * @param {any} renderer @param {Parameters<typeof grassField>[0]} o
 */
export function grassFieldOn(renderer, o) {
	return computes(renderer) ? grassCompute(renderer, o) : grassField(o);
}

/**
 * The grass chosen on the graphics card: three indirect draws, the compute that fills them, the trample map.
 * @param {any} renderer a WebGPURenderer on WebGPU @param {Parameters<typeof grassField>[0]} o
 */
export function grassCompute(renderer, o) {
	const device = o.device ?? 'desktop', dev = gpuDevice(device), P = { ...GRASS, ...(o.params ?? {}) };
	const wind = o.wind === null ? null : (o.wind ?? windNodes(TSL));
	const n = perCell(dev.density), hmax = tallest(P);
	const mask = fieldMask(dev, o.at);
	const U = grassUniforms(mask.texture);
	U.maskWidth.value = mask.size * mask.texel;
	U.perCell.value = n;
	const caps = capacities(dev, dev.density), bases = [0, caps[0], caps[0] + caps[1]], total = caps[0] + caps[1] + caps[2];
	const most = maxCells(dev);

	/* the buffers: the indirect draws' arguments, the blades chosen (cell, number), the cells, the trample map */
	const blades = /** @type {const} */ ([0, 1, 2]).map((level) => levelGeometry(level));
	const args = new IndirectStorageBufferAttribute(indirectArgs(blades.map((g) => /** @type {any} */ (g.index).count)), ARGS);
	const chosen = new StorageBufferAttribute(new Uint32Array(total * 2), 2);
	const cells = new StorageBufferAttribute(new Uint32Array(most), 1);
	const T = TRAMPLE, trodden = new StorageBufferAttribute(new Float32Array(T.size * T.size), 1);
	const argsAt = storage(args, 'uint', ARGS * 3).toAtomic();
	const chosenAt = storage(chosen, 'uvec2', total);
	const chosenRead = storage(chosen, 'uvec2', total).toReadOnly();
	const cellsAt = storage(cells, 'uint', most).toReadOnly();
	const troddenAt = storage(trodden, 'float', T.size * T.size);
	const troddenRead = storage(trodden, 'float', T.size * T.size).toReadOnly();

	/* what the compute reads each frame */
	const C = {
		count: uniform(0, 'uint'),
		eye: uniform(new THREE.Vector3()),
		planes: uniformArray(Array.from({ length: 6 }, () => new THREE.Vector4()), 'vec4'),
		/** the trample map's window now and before (its first texel), and its decay this frame */
		origin: uniform(new THREE.Vector4()),
		decay: uniform(1),
		pushers: uniformArray(Array.from({ length: PUSHERS }, () => new THREE.Vector4()), 'vec4')
	};

	/* the counts back to nothing */
	const reset = Fn(() => {
		for (let l = 0; l < 3; l++) atomicStore(argsAt.element(l * ARGS + 1), uint(0));
	})().compute(1);

	/* the trample map stepped: grass-gpu.js `Trample.step` */
	const Ts = T.size, tex = T.width / T.size;
	const wrapI = (/** @type {any} */ a) => a.mod(int(Ts)).add(int(Ts)).mod(int(Ts));
	const trample = Fn(() => {
		const i = int(instanceIndex), ix = i.mod(int(Ts)), iz = i.div(int(Ts));
		const g0 = int(C.origin.x), h0 = int(C.origin.y), og0 = int(C.origin.z), oh0 = int(C.origin.w);
		const gx = g0.add(wrapI(ix.sub(g0))), gz = h0.add(wrapI(iz.sub(h0)));
		const stale = gx.notEqual(og0.add(wrapI(ix.sub(og0)))).or(gz.notEqual(oh0.add(wrapI(iz.sub(oh0)))));
		const v = select(stale, float(0), troddenAt.element(i).mul(C.decay)).toVar();
		const px = float(gx).add(0.5).mul(tex), pz = float(gz).add(0.5).mul(tex);
		for (let p = 0; p < PUSHERS; p++) {
			const q = C.pushers.element(p);
			const d = sqrt(px.sub(q.x).mul(px.sub(q.x)).add(pz.sub(q.y).mul(pz.sub(q.y))));
			const on = q.z.greaterThan(0).and(q.w.greaterThan(0));
			v.assign(select(on, max(v, float(1).sub(smoothstep(q.z.mul(0.4), q.z, d)).mul(q.w)), v));
		}
		troddenAt.element(i).assign(v);
	})().compute(Ts * Ts);

	/* the blades chosen: every candidate of every cell, one thread each */
	const E = {
		seed: (/** @type {any} */ cx, /** @type {any} */ cz, /** @type {any} */ j) => bladeT(vec2(cx, cz), j, n).seed,
		draw: (/** @type {any} */ s, /** @type {number} */ k) => drawU(s, k),
		uint: (/** @type {any} */ j) => float(j),
		clump: (/** @type {any} */ x, /** @type {any} */ z) => {
			const { A, dA } = clumpsT(vec2(x, z), float(P.clump));
			return { ax: A.x, az: A.y, out: min(dA.div(P.clump * 0.6), 1) };
		},
		mask: (/** @type {any} */ x, /** @type {any} */ z) => {
			const M = mask.size, t = mask.texel;
			const at = (/** @type {any} */ gx, /** @type {any} */ gz) => textureLoad(U.mask, ivec2(gx.mod(M).add(M).mod(M), gz.mod(M).add(M).mod(M)));
			const gx = int(TSL.floor(x.div(t).sub(0.5))), gz = int(TSL.floor(z.div(t).sub(0.5)));
			const grass = max(max(at(gx, gz).x, at(gx.add(1), gz).x), max(at(gx, gz.add(1)).x, at(gx.add(1), gz.add(1)).x));
			return { grass, y: at(int(TSL.floor(x.div(t))), int(TSL.floor(z.div(t)))).z };
		},
		eye: /** @type {[any, any, any]} */ ([C.eye.x, C.eye.y, C.eye.z]),
		planes: [0, 1, 2, 3, 4, 5].map((k) => {
			const p = C.planes.element(k);
			return /** @type {[any, any, any, any]} */ ([p.x, p.y, p.z, p.w]);
		})
	};
	const chooseNode = Fn(() => {
		const i = uint(instanceIndex);
		If(i.lessThan(C.count), () => {
			const packed = cellsAt.element(i.div(uint(n)));
			const j = i.mod(uint(n));
			const cx = float(int(packed.bitAnd(uint(0xffff))).sub(32768)), cz = float(int(packed.shiftRight(uint(16))).sub(32768));
			const level = choose(TK, E, cx, cz, j, { dev, n, hmax, clump: P.clump }).toVar();
			for (let l = 0; l < 3; l++)
				If(level.equal(float(l)), () => {
					const slot = atomicAdd(argsAt.element(l * ARGS + 1), uint(1)).toVar();
					If(slot.lessThan(uint(/** @type {number} */ (caps[l]))), () => {
						chosenAt.element(uint(/** @type {number} */ (bases[l])).add(slot)).assign(uvec2(packed, j));
					}).Else(() => {
						// over the level's room: counted back, so its draw ends at its room exactly
						atomicSub(argsAt.element(l * ARGS + 1), uint(1));
					});
				});
		});
	})().compute(most * n);

	/* the trodden ground at a foot: the map's texel, 0 outside its window */
	const troddenAtFoot = (/** @type {any} */ foot) => {
		const gx = int(TSL.floor(foot.x.div(tex))), gz = int(TSL.floor(foot.y.div(tex)));
		const g0 = int(C.origin.x), h0 = int(C.origin.y);
		const inWin = gx.greaterThanEqual(g0).and(gx.lessThan(g0.add(Ts))).and(gz.greaterThanEqual(h0)).and(gz.lessThan(h0.add(Ts)));
		return select(inWin, troddenRead.element(wrapI(gz).mul(Ts).add(wrapI(gx))), float(0));
	};

	/* the three draws, nearest first; each blade's cell and number from the chosen */
	const object = new THREE.Group();
	object.name = 'grass';
	const meshes = /** @type {const} */ ([0, 1, 2]).map((level) => {
		const material = grassMaterial({
			level, uniforms: U, params: P, device: dev, wind: wind ?? undefined, morphEnd: JITTER, trodden: troddenAtFoot,
			blade: (/** @type {any} */ i) => {
				const b = chosenRead.element(uint(/** @type {number} */ (bases[level])).add(i));
				return { cell: vec2(float(int(b.x.bitAnd(uint(0xffff))).sub(32768)), float(int(b.x.shiftRight(uint(16))).sub(32768))), j: b.y };
			}
		});
		const g = /** @type {THREE.BufferGeometry} */ (blades[level]);
		g.setIndirect(args, OFFSETS[level]);
		const mesh = new THREE.Mesh(g, material);
		// the field is round the eye wherever it looks, its blades culled one by one by the compute
		mesh.frustumCulled = false;
		mesh.castShadow = false;
		mesh.receiveShadow = o.shadows ?? true;
		mesh.matrixAutoUpdate = false;
		mesh.renderOrder = level;
		mesh.userData.level = level;
		object.add(mesh);
		return mesh;
	});

	const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
	/** @type {Map<number, ReturnType<typeof cellOf>>} the mask over each cell, kept until the mask changes */
	const held = new Map();
	let maskVersion = -1, last = NaN, live = 0;
	/** @type {number[]} */
	let counts = [0, 0, 0];
	/** @type {[number, number] | null} */
	let origin = null;
	return {
		object,
		uniforms: U,
		mask,
		mode: /** @type {const} */ ('indirect'),
		/** this frame's: the mask round the eye, the cells it sees, the trample map stepped, the blades chosen */
		update(/** @type {THREE.PerspectiveCamera} */ camera, /** @type {number} */ time, /** @type {{ sun?: { dir: THREE.Vector3, color: THREE.Color, strength: number }, pushers?: [number, number, number, number][], height?: number, budget?: number }} */ w = {}) {
			const x = camera.position.x, z = camera.position.z;
			U.time.value = time;
			wind?.tick?.(worldSeconds());
			U.pxAt1m.value = (w.height ?? 900) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
			if (w.sun) {
				U.sunDir.value.copy(w.sun.dir).normalize();
				U.sunColor.value.copy(w.sun.color).multiplyScalar(Math.min(2, w.sun.strength));
			}
			const pushers = w.pushers ?? [];
			for (let p = 0; p < PUSHERS; p++) {
				U.pushers.array[p].set(...(pushers[p] ?? [0, 0, 0, 0]));
				C.pushers.array[p].set(...(pushers[p] ?? [0, 0, 0, 0]));
			}
			mask.update(x, z, w.budget);
			if (mask.texture.version !== maskVersion) (held.clear(), (maskVersion = mask.texture.version));

			/* the cells the view sees */
			camera.updateMatrixWorld();
			pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
			frustum.setFromProjectionMatrix(pv, camera.coordinateSystem);
			const list = cellsAround(x, z, dev, frustum, (cx, cz) => {
				const k = cx * 65536 + cz;
				let c = held.get(k);
				if (!c) held.set(k, (c = cellOf(mask, cx, cz)));
				return c;
			}, hmax);
			/** @type {Uint32Array} */ (cells.array).set(list.slice(0, most));
			cells.needsUpdate = true;
			live = Math.min(list.length, most);
			C.count.value = live * n;
			C.eye.value.copy(camera.position);
			frustum.planes.forEach((p, k) => C.planes.array[k].set(p.normal.x, p.normal.y, p.normal.z, p.constant));

			/* the trample map: its window to the eye, its decay over the frame */
			const g0 = Math.floor(x / tex) - Ts / 2, h0 = Math.floor(z / tex) - Ts / 2;
			const [og0, oh0] = origin ?? [g0, h0];
			C.origin.value.set(g0, h0, og0, oh0);
			origin = [g0, h0];
			const dt = Number.isNaN(last) ? 0 : Math.min(0.1, Math.max(0, time - last));
			last = time;
			C.decay.value = Math.exp((-dt * Math.log(1 / RECOVERED)) / T.recover);

			renderer.compute(reset);
			renderer.compute(trample);
			if (live) renderer.compute(chooseNode, live * n);
		},
		/** how many blades it drew at each level, as last read back (`readBack`) */
		count: () => counts.slice(),
		/** the blades each level drew, read back from the graphics card (for a check: it waits for the GPU) */
		async readBack() {
			const a = new Uint32Array(await renderer.getArrayBufferAsync(args));
			counts = [0, 1, 2].map((l) => /** @type {number} */ (a[l * ARGS + 1]));
			meshes.forEach((m, l) => (m.geometry.userData.indirectInstances = counts[l]));
			return counts.slice();
		},
		/** the blades chosen, read back: each level's cells (packed) and numbers (for c2 on the Mac: the CPU's choice against it) */
		async readChosen() {
			const [a, b] = await Promise.all([renderer.getArrayBufferAsync(args), renderer.getArrayBufferAsync(chosen)]);
			const n3 = new Uint32Array(a), c = new Uint32Array(b);
			return [0, 1, 2].map((l) => Array.from({ length: Math.min(/** @type {number} */ (n3[l * ARGS + 1]), /** @type {number} */ (caps[l])) }, (_, k) => [c[(/** @type {number} */ (bases[l]) + k) * 2], c[(/** @type {number} */ (bases[l]) + k) * 2 + 1]]));
		},
		/** what the compute read this frame, for the CPU's twin (grass-gpu.js `chooseOnCpu`) */
		view: () => ({ mask, eye: /** @type {[number, number, number]} */ (C.eye.value.toArray()), planes: C.planes.array.slice(0, 6).map((v) => /** @type {[number, number, number, number]} */ (v.toArray())), dev, n, hmax, clump: P.clump, cells: Array.from(/** @type {Uint32Array} */ (cells.array).subarray(0, live)) }),
		/** how many cells the compute runs over now, and its threads */
		cells: () => ({ cells: live, threads: live * n }),
		/** the blades each level can hold */
		capacities: caps,
		dispose() {
			for (const m of meshes) (m.removeFromParent(), m.geometry.dispose(), /** @type {THREE.Material} */ (m.material).dispose());
			mask.texture.dispose();
		}
	};
}

