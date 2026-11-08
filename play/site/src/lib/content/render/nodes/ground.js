/*
 * THE GROUND, IN TSL — every biome's floor drawn from scanned real surfaces (../../biomes/sets.js: CC0 scans, their
 * colour with its height, their normal, their AO and roughness, each map one array texture of a layer a surface:
 * ../arrays.js). Per pixel:
 *
 *   which    each surface's patches from the shared noise (../../biomes/noise.js, the same sums as `surfacesAt`), the
 *            top three kept
 *   tiling   near (40 m) variance-preserving hex tiling (Heitz–Neyret, Mikkelsen: three reads, turned and shifted, run
 *            together by their heights), in the middle IQ's two reads, far the scan's mean colour: nothing repeats
 *   blend    the three by height (Mishkinis): leaves and pebbles lie over the soil rather than fading through it
 *   macro    brighter and darker at about 5, 20 and 80 m (±13 %)
 *   detail   its normal fading out by 35 m, its roughness and AO its own
 *   map      a world's ground map (R: shade under the real crowns, G: wet, along paths and in hollows): darker,
 *            smoother where wet, settling first in the low places of the scan
 *
 * `groundNodes(weights, o)` → a MeshStandardNodeMaterial; `../../biomes/surfaces.js` `groundMaterial` is it.
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
	Fn, If, Loop, abs, cameraPosition, cameraViewMatrix, clamp, cos, cross, dFdx, dFdy, distance, dot, float, floor, fract, int, max, mix,
	normalView, normalWorldGeometry, normalize, positionWorld, pow, sin, smoothstep, step, struct, texture, uniform, uniformArray, vec2, vec3, vec4
} from 'three/tsl';
import { budget } from '../budget.js';
import { arrayOf } from '../arrays.js';
import { SETS } from '../../biomes/sets.js';

const N = SETS.length;
/** each surface's patch size, its scan's tile (m), rows and track, set by ../../biomes/surfaces.js (its `SURFACE`) */
export const PER = { patch: uniformArray(new Array(N).fill(5), 'float'), size: uniformArray(SETS.map((s) => s.size), 'float'), rows: uniformArray(new Array(N).fill(0), 'float'), track: uniformArray(Array.from({ length: N }, () => new THREE.Color(0.5, 0.5, 0.5)), 'color') };
const mean = uniformArray(SETS.map((s) => new THREE.Color(...s.mean)), 'color');
/** which layer of the arrays each surface is (a surface is put in once a material needs it) */
const layer = uniformArray(new Array(N).fill(0), 'float');
const maps = /** @type {const} */ (['albedo', 'normal', 'ar']);
const tex = Object.fromEntries(maps.map((k) => [k, texture(arrayOf([], { srgb: k === 'albedo' }))]));
/** @type {number[]} the surfaces in the arrays, in layer order */
const inArrays = [];
/** @type {Set<THREE.Material>} */
const drawn = new Set();

/** the arrays hold these surfaces too (by index), read again with them once they are new */
function need(/** @type {number[]} */ list) {
	const fresh = list.filter((i) => !inArrays.includes(i));
	if (!fresh.length) return;
	inArrays.push(...fresh);
	const px = budget().small ? 1024 : 2048;
	const order = [...inArrays];
	let left = maps.length;
	for (const k of maps)
		arrayOf(order.map((i) => SETS[i].maps[k][k === 'albedo' ? px : 1024]), {
			srgb: k === 'albedo',
			onReady: (t) => {
				tex[k].value = t;
				if (--left) return;
				order.forEach((s, l) => (layer.array[s] = l));
				for (const m of drawn) m.needsUpdate = true;
			}
		});
}

/* the biomes' value noise, as ../../biomes/noise.js has it */
const h21 = Fn(([p]) => {
	const q = fract(p.mul(vec2(123.34, 456.21))).toVar();
	q.addAssign(dot(q, q.add(45.32)));
	return fract(q.x.mul(q.y));
});
export const vn = Fn(([p]) => {
	const i = floor(p), f = fract(p), u = f.mul(f).mul(f.mul(-2).add(3));
	return mix(mix(h21(i), h21(i.add(vec2(1, 0))), u.x), mix(h21(i.add(vec2(0, 1))), h21(i.add(vec2(1, 1))), u.x), u.y);
});
export const fbm = Fn(([p]) => vn(p).mul(0.55).add(vn(p.mul(2.03).add(7.1)).mul(0.3)).add(vn(p.mul(4.1).add(3.3)).mul(0.15)));
const Out = struct({ col: 'vec3', ar: 'vec2' });
const hash2 = (/** @type {any} */ v) => fract(sin(vec2(dot(v, vec2(127.1, 311.7)), dot(v, vec2(269.5, 183.3)))).mul(43758.5453));
/** turned by c, s (row vector times [[c, −s], [s, c]], as Mikkelsen's) */
const turn = (/** @type {any} */ v, /** @type {any} */ c, /** @type {any} */ s) => vec2(v.x.mul(c).add(v.y.mul(s)), v.y.mul(c).sub(v.x.mul(s)));

/**
 * One surface's three maps at st (its own tiles), hex-tiled near, two reads in the middle, its mean far.
 * @returns {{ alb: any, nrm: any, ar: any }} colour and height, the normal (tangent space), AO and roughness
 */
function surfaceAt(/** @type {any} */ s, /** @type {any} */ st, /** @type {any} */ spin, /** @type {any} */ d) {
	const l = int(layer.element(s));
	const alb = vec4(mean.element(s), 0.5).toVar(), nrm = vec3(0, 0, 1).toVar(), ar = vec2(1, 0.95).toVar();
	const gx = dFdx(st), gy = dFdy(st);
	const read = (/** @type {string} */ k, /** @type {any} */ uv, /** @type {any} */ dx, /** @type {any} */ dy) => tex[k].sample(uv).grad(dx, dy).depth(l);
	If(d.lessThan(40), () => {
		// the triangle of hexagon centres st lies in, each a read turned and shifted its own way
		const q = st.mul(2 * Math.sqrt(3)), sk = vec2(q.x.sub(q.y.mul(0.57735027)), q.y.mul(1.15470054));
		const base = floor(sk), t = fract(sk), tz = float(1).sub(t.x).sub(t.y);
		const S = step(0, tz.negate()), s2 = S.mul(2).sub(1);
		const w = [tz.negate().mul(s2), S.sub(t.y.mul(s2)), S.sub(t.x.mul(s2))];
		const v = [base.add(vec2(S, S)), base.add(vec2(S, S.oneMinus())), base.add(vec2(S.oneMinus(), S))];
		const taps = v.map((vi) => {
			const h = hash2(vi), a = h.x.mul(6.2832).mul(spin), c = cos(a), sn = sin(a);
			const cen = vec2(vi.x.add(vi.y.mul(0.5)), vi.y.div(1.15470054)).div(2 * Math.sqrt(3));
			const uv = turn(st.sub(cen), c, sn).add(cen).add(h);
			const dx = turn(gx, c, sn), dy = turn(gy, c, sn);
			const n = read('normal', uv, dx, dy).xyz.mul(2).sub(1);
			// the normal turned back into the ground's frame
			return { a: read('albedo', uv, dx, dy), n: vec3(n.x.mul(c).sub(n.y.mul(sn)), n.x.mul(sn).add(n.y.mul(c)), n.z), r: read('ar', uv, dx, dy).xy };
		});
		// run together by their heights: the higher of them shows
		const W = taps.map((tp, i) => mix(1, tp.a.w, 0.6).mul(pow(/** @type {any} */ (w[i]), 7)));
		const sum = W[0].add(W[1]).add(W[2]);
		alb.assign(taps[0].a.mul(W[0]).add(taps[1].a.mul(W[1])).add(taps[2].a.mul(W[2])).div(sum));
		nrm.assign(taps[0].n.mul(W[0]).add(taps[1].n.mul(W[1])).add(taps[2].n.mul(W[2])).div(sum));
		ar.assign(taps[0].r.mul(W[0]).add(taps[1].r.mul(W[1])).add(taps[2].r.mul(W[2])).div(sum));
	}).ElseIf(d.lessThan(250), () => {
		// IQ's technique 3: two reads shifted by a slow noise, run into each other
		const k = vn(st.mul(0.37)).mul(8), i = floor(k), f = fract(k);
		const oa = sin(vec2(3, 7).mul(i)), ob = sin(vec2(3, 7).mul(i.add(1)));
		const a = read('albedo', st.add(oa), gx, gy), b = read('albedo', st.add(ob), gx, gy);
		const m = smoothstep(0.2, 0.8, f.sub(dot(a.xyz.sub(b.xyz), vec3(0.1))));
		alb.assign(mix(mix(a, b, m), vec4(mean.element(s), 0.5), smoothstep(120, 250, d)));
		ar.assign(mix(read('ar', st.add(oa), gx, gy).xy, read('ar', st.add(ob), gx, gy).xy, m));
	});
	return { alb, nrm, ar };
}

/**
 * The ground's material.
 * @param {Partial<Record<string, number>>} weights how much of the floor each surface takes (any scale)
 * @param {{ names: string[], rows?: number, tramlines?: { every: number, gauge: number, tyre: number } | null }} o
 */
export function groundNodes(weights, o) {
	const W = uniformArray(o.names.map((s) => weights[s] ?? 0), 'float');
	const dir = uniform(new THREE.Vector2(1, 0));
	const t = o.tramlines;
	const tram = uniform(new THREE.Vector4(t?.every ?? 24, t?.gauge ?? 1.8, t?.tyre ?? 0.48, t ? 1 : 0));
	/** the world's ground map (R shade, G wet) and the rectangle of the world it covers (x, z, width, depth) */
	const map = texture(new THREE.DataTexture(new Uint8Array(4), 1, 1)), rect = uniform(new THREE.Vector4(0, 0, 1, 1));
	const m = new MeshStandardNodeMaterial({ metalness: 0 });
	const has = () => o.names.map((s, i) => ((W.array[i] ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
	need(has());
	drawn.add(m);
	m.addEventListener('dispose', () => drawn.delete(m));
	m.userData.weigh = (/** @type {Record<string, number>} */ w) => {
		o.names.forEach((s, i) => (W.array[i] = w[s] ?? 0));
		need(has());
	};
	m.userData.rows = (/** @type {number} */ a) => dir.value.set(Math.cos(a), Math.sin(a));
	m.userData.rows(o.rows ?? 0);
	m.userData.map = (/** @type {THREE.Texture} */ tx, /** @type {number[]} */ r) => ((map.value = tx), rect.value.set(r[0] ?? 0, r[1] ?? 0, r[2] ?? 1, r[3] ?? 1));

	const xz = positionWorld.xz, bw = vec2(xz.x, xz.y.negate());
	const d = distance(cameraPosition, positionWorld);
	const along = dot(xz, dir), across = dot(xz, vec2(dir.y.negate(), dir.x));
	const g = map.sample(xz.sub(rect.xy).div(rect.zw));

	const shade = Fn(() => {
		// the top three surfaces here, by their patches' weights
		const w1 = float(0).toVar(), w2 = float(0).toVar(), w3 = float(0).toVar(), i1 = int(0).toVar(), i2 = int(0).toVar(), i3 = int(0).toVar();
		Loop(N, ({ i }) => {
			If(W.element(i).greaterThan(0), () => {
				const s = W.element(i).mul(pow(fbm(bw.div(PER.patch.element(i)).add(float(i).mul(17.3))).add(0.35), 6)).toVar();
				If(s.greaterThan(w1), () => {
					w3.assign(w2), i3.assign(i2), w2.assign(w1), i2.assign(i1), w1.assign(s), i1.assign(i);
				}).ElseIf(s.greaterThan(w2), () => {
					w3.assign(w2), i3.assign(i2), w2.assign(s), i2.assign(i);
				}).ElseIf(s.greaterThan(w3), () => {
					w3.assign(s), i3.assign(i);
				});
			});
		});
		// the patches' edges dithered a little, as a real floor's are
		const top = [[i1, w1], [i2, w2], [i3, w3]].map(([s, w]) => {
			const rows = PER.rows.element(s), inRows = rows.greaterThan(0);
			const st = inRows.select(vec2(across, along), bw).div(PER.size.element(s));
			const p = surfaceAt(s, st, inRows.select(0, 1), d);
			// rows: ridges across them, and a field's tramlines pressed in
			If(inRows, () => {
				const ridge = cos(across.div(rows).mul(6.2832)).mul(0.5).add(0.5);
				p.alb.assign(vec4(p.alb.xyz.mul(ridge.mul(0.3).add(0.82)), mix(p.alb.w, ridge, 0.5)));
				If(tram.w.greaterThan(0.5), () => {
					const dd = abs(across.sub(tram.x.mul(floor(across.div(tram.x).add(0.5)))));
					const k = float(1).sub(clamp(abs(dd.sub(tram.y.mul(0.5))).div(tram.z.mul(0.5)).sub(0.75).div(0.5), 0, 1));
					p.alb.assign(vec4(mix(p.alb.xyz, PER.track.element(s).mul(vn(vec2(across.mul(9), along.mul(4.5))).mul(0.16).add(0.92)), k.mul(0.85)), p.alb.w));
				});
			});
			return { ...p, w };
		});
		// by height (Mishkinis): each surface's height plus its share, the highest within 0.2 shows
		const all = w1.add(w2).add(w3).max(1e-5);
		const hb = top.map((p) => p.alb.w.add(/** @type {any} */ (p.w).div(all).mul(1.4)));
		const ma = max(max(hb[0], hb[1]), hb[2]).sub(0.2);
		const b = hb.map((h, i) => max(h.sub(ma), 0).mul(step(1e-6, /** @type {any} */ (top[i].w))));
		const bs = b[0].add(b[1]).add(b[2]).max(1e-5);
		const sum3 = (/** @type {'alb' | 'nrm' | 'ar'} */ k) => top[0][k].mul(b[0]).add(top[1][k].mul(b[1])).add(top[2][k].mul(b[2])).div(bs);
		const alb = sum3('alb'), ar = sum3('ar').toVar(), nt = sum3('nrm');
		// macro: brighter and darker over 5, 20 and 80 m
		const macro = vn(bw.div(5)).mul(0.3).add(vn(bw.div(20).add(3.1)).mul(0.35)).add(vn(bw.div(80).add(7.7)).mul(0.35)).sub(0.5).mul(0.26).add(1);
		// shade under the crowns; wet where the map says, the low places of the scan first
		const wet = clamp(g.y.mul(1.4).sub(alb.w.mul(0.6)), 0, 1);
		const col = alb.xyz.mul(macro).mul(g.x.mul(-0.3).add(1)).mul(wet.mul(-0.4).add(1));
		ar.assign(vec2(ar.x, mix(ar.y, 0.22, wet)));
		// the detail normal, fading out by 35 m, in the frame of the ground's own (relief) normal
		const fade = smoothstep(35, 15, d), ng = normalWorldGeometry;
		const tg = normalize(vec3(1, 0, 0).sub(ng.mul(ng.x))), bt = cross(ng, tg);
		const nw = normalize(tg.mul(nt.x.mul(fade)).add(bt.mul(nt.y.mul(fade))).add(ng.mul(nt.z)));
		// set here, where it is worked out, rather than as the material's normalNode, which would work all of this out twice
		normalView.assign(cameraViewMatrix.mul(vec4(nw, 0)).xyz.normalize());
		return Out(col, ar);
	});
	// worked out once a pixel, read by each of the material's parts
	const out = shade().toVar('ground');
	m.colorNode = out.get('col');
	m.roughnessNode = out.get('ar').y;
	m.aoNode = out.get('ar').x;
	m.userData.xz = xz;
	return m;
}
