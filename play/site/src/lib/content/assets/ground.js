// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A PLANT'S GROUND ON THE STAGE — its biome's floor out to the horizon, its roots out of sight in the earth; tilt the
 * camera below the ground line and the frame splits there, as a split-level shot does: plant above, soil and roots below.
 *
 *   the floor   the biome's surfaces as the worlds draw them ($content/biomes `groundMaterial`), fading into the
 *               backdrop or the sky's horizon ($content/sandbox-kit/sky.js); a ring of mulch round the stem; its cover streamed round the
 *               plant (`coverStream`). It faces up only: from below, the eye sees on into the garden
 *   the earth   below the ground line: a face just beyond the farthest root, square to the eye (eased), its edges never
 *               seen, the ground line its top; drawn only while the eye is below; between eye and face earth and cover
 *               are left out, a band of turf standing on the ground line; darker and of one colour the further off
 *   the soil    on those faces in world metres (one 3D field, TSL): the biome's horizons from ./soils.js at their real
 *               depths, their boundaries waved and run together, the peds of each, stones, roots, worm burrows,
 *               mottles, lime, charcoal and fungal threads; what is under two pixels fades to its colour, not worked out
 *   the roots   the plant's own, crisp in the earth's clear middle
 *
 * `groundOf(stage, { drawn })` → { group, biome(recipe, id), fit(root), show(on), update(camera, dt), below, rootsView(camera),
 * soil, dispose }.
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
	Break, Fn, If, Loop, abs, atan, cameraViewMatrix, clamp, color, cos, cross, dFdx, dFdy, distance, dot, exp, faceDirection, float, floor, fract, fwidth, int, length, max, min,
	mix, normalView, normalize, output, positionView, positionWorld, pow, reference, sign, sin, smoothstep, sqrt, step, struct, uniform, uniformArray, vec2, vec3, vec4
} from 'three/tsl';
import { groundMaterial } from '$lib/content/biomes/surfaces.js';
import { PER, surfaceRead, vn } from '$lib/content/render/nodes/ground.js';
import { coverStream } from '$lib/content/biomes/stream.js';
import { coverAway } from '$lib/content/render/nodes/index.js';
import { biomeOfCard } from '$lib/content/biomes/card.js';
import { MOST, PED, soilOf } from './soils.js';

/** how green a floor looks: the share of its ground that is living mat or moss, from its surfaces' weights */
const greenness = (recipe) => {
	const w = recipe?.surface ?? {};
	const all = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
	return all > 0 ? ((w.green ?? 0) + 0.8 * (w.moss ?? 0)) / all : 0;
};

/**
 * The library's biomes a plant can stand on: each one's newest accepted version, read off its card (one whose card is
 * no floor's is left out), the greenest first (Samuel 2026-11-04: every plant is shown on one green floor, the
 * first), then by name. Each is known by `key`, its asset's UUID (its id where the index gives none).
 * @param {{ index: { recipes: Record<string, any> }, cardOf: (hash: string) => any }} source
 * @returns {{ key: string, id: string, label: string, hash: string, recipe: any }[]}
 */
export function groundsIn(source) {
	const newest = new Map();
	for (const [hash, r] of Object.entries(source.index.recipes)) {
		if (r.group !== 'biomes' || r.id === 'cover' || r.proposed || r.variant) continue;
		const key = r.asset ?? r.id, was = newest.get(key);
		if (!was || r.v > was.v) newest.set(key, { ...r, hash, key });
	}
	const out = [];
	for (const r of newest.values()) {
		try {
			out.push({ key: r.key, id: r.id, label: String(r.label ?? r.id).replace(/ floor$/i, ''), hash: r.hash, recipe: biomeOfCard(source.cardOf(r.hash)) });
		} catch {
			/* a card that is no floor's: not offered */
		}
	}
	return out.sort((a, b) => greenness(b.recipe) - greenness(a.recipe) || a.label.localeCompare(b.label));
}

/** the floor when the library offers no biome: a living mat of short green, a little bare soil */
const BARE = { green: 10, soil: 0.3 };


/* the earth's noise: a hash, value noise in 3D, its fbm, a field of points (one a cell) */
const gH1 = Fn(([p0]) => {
	const p = fract(p0.mul(0.1031)).toVar();
	p.addAssign(dot(p, p.zyx.add(31.32)));
	return fract(p.x.add(p.y).mul(p.z));
});
const gH3 = Fn(([p0]) => {
	const p = fract(p0.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
	p.addAssign(dot(p, p.yxz.add(33.33)));
	return fract(p.xxy.add(p.yxx).mul(p.zyx));
});
const gN = Fn(([p]) => {
	const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(f0.mul(-2).add(3));
	const h = (x, y, z) => gH1(i.add(vec3(x, y, z)));
	return mix(mix(mix(h(0, 0, 0), h(1, 0, 0), f.x), mix(h(0, 1, 0), h(1, 1, 0), f.x), f.y), mix(mix(h(0, 0, 1), h(1, 0, 1), f.x), mix(h(0, 1, 1), h(1, 1, 1), f.x), f.y), f.z);
});
const gF = Fn(([p0]) => {
	const p = vec3(p0).toVar(), a = float(0).toVar(), w = float(0.5).toVar();
	Loop(4, () => {
		a.addAssign(w.mul(gN(p)));
		p.assign(p.mul(2.03).add(17.1));
		w.mulAssign(0.5);
	});
	return a.div(0.9375);
});
const Cell = struct({ v: 'vec3', to: 'vec3' });
// the nearest and second nearest of a field of points, the nearest's own number, and the way from it to p
const gV = Fn(([p]) => {
	const i = floor(p), f = fract(p);
	const f1 = float(8).toVar(), f2 = float(8).toVar(), id = float(0).toVar(), to = vec3(0).toVar();
	Loop({ start: -1, end: 1, condition: '<=', name: 'z' }, { start: -1, end: 1, condition: '<=', name: 'y' }, { start: -1, end: 1, condition: '<=', name: 'x' }, ({ x, y, z }) => {
		const gg = vec3(x, y, z).toFloat();
		const r = gg.add(gH3(i.add(gg))).sub(f).toVar(), dd = dot(r, r);
		If(dd.lessThan(f1), () => {
			f2.assign(f1), f1.assign(dd), id.assign(gH1(i.add(gg).add(7.7))), to.assign(r.negate());
		}).ElseIf(dd.lessThan(f2), () => {
			f2.assign(dd);
		});
	});
	return Cell(vec3(sqrt(f1), sqrt(f2), id), to);
});
// how much of a feature size across is seen at px metres a pixel: none under two pixels
const gSeen = (size, px) => clamp(float(size).div(max(px, 1e-6)).sub(2).div(4), 0, 1);

/** where the plant stands and the eye is, shared by every material of the ground (the cover's GLSL reads them too) */
const groundUniforms = () => ({
	uC: { value: new THREE.Vector3() },
	uEye: { value: new THREE.Vector3() },
	uRing: { value: 0.3 },
	/** while the eye is below the ground (1, else 0), the cover between it and the earth's face is left out */
	uHide: { value: 0 },
	/** the way from the plant towards the eye, level, and how far behind the plant the earth's face stands (m) */
	uF: { value: new THREE.Vector3(0, 0, 1) },
	uB: { value: 1 },
	/** how deep a band of turf beyond the face is left standing on the ground line while the eye is below (m) */
	uBand: { value: 1 }
});
const GROUND_HEAD = /* glsl */ `uniform vec3 uC; uniform vec3 uEye; uniform float uRing; uniform float uHide; uniform vec3 uF; uniform float uB; uniform float uBand;`;
/** a uniform of the ground's, read by TSL from its `{ value }` @param {{ value: any }} u @param {string} type */
const ref = (u, type) => reference('value', type, u);

const Soil = struct({ c: 'vec3', hgt: 'float', rough: 'float' });

/**
 * the soil's material for the earth's faces, seen from inside: a soil's horizons as uniforms, the field worked out per
 * pixel, darkening with its distance from the eye
 * @param {ReturnType<typeof groundUniforms>} g
 */
function soilMaterial(g) {
	const arr = (make, type) => uniformArray(Array.from({ length: MOST }, make), type);
	const u = {
		sN: uniform(1, 'int'),
		sTo: arr(() => 9, 'float'),
		sCol: arr(() => new THREE.Color(), 'color'),
		sCol2: arr(() => new THREE.Color(), 'color'),
		sPed: arr(() => new THREE.Vector4(), 'vec4'),
		sBits: arr(() => new THREE.Vector4(), 'vec4'),
		sMarks: arr(() => new THREE.Vector4(), 'vec4'),
		sMore: arr(() => new THREE.Vector4(), 'vec4'),
		sEdge: arr(() => new THREE.Vector3(), 'vec3'),
		sStone: uniform(new THREE.Color('#8a847c')),
		/** the earth seen far through itself: what it darkens to, over how many metres beyond its nearest point, and how deep the roots go */
		uHazeC: uniform(new THREE.Color()),
		uHazeL: uniform(1),
		uHazeNear: uniform(0),
		uDeep: uniform(1)
	};
	const { sN, sTo, sCol, sCol2, sPed, sBits, sMarks, sMore, sEdge, sStone } = u;
	const sRoot = color('#d9c29a'), sThread = color('#efe9dc'), sRust = color('#b0581e'), sGrey = color('#8d918c'), sLime = color('#ece6d8');
	const m = new MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
	m.userData.soil = u;
	const mixIn = (c, to, k) => c.assign(mix(c, to, k));
	// a horizon's matrix colour at p: its two colours in blotches
	const gMatrix = (h, p) => mix(sCol.element(h), sCol2.element(h), smoothstep(0.25, 0.75, gF(p.mul(8).add(h.toFloat().mul(3.1)))));
	// where boundary i lies under p.xz: its depth, waved, and its tongues reaching down
	const gBound = (i, p) => {
		const e = sEdge.element(i), q = vec3(p.xz.div(max(e.x.mul(7), 0.04)), i.toFloat().mul(3.7));
		const b = sTo.element(i).add(e.x.mul(gN(q).mul(0.7).add(gN(q.mul(2.7).add(1.3)).mul(0.3)).mul(2).sub(1)));
		return b.add(e.z.mul(pow(gN(vec3(p.xz.div(max(e.z.mul(0.8), 0.02)), i.toFloat().mul(5.1).add(2))), 4)).mul(2.2));
	};
	// the earth at p (m, the surface at y 0): its colour, its relief (m, how far the cut face stands out or sinks there:
	// the height a bump map reads) and how rough it is
	const gSoil = Fn(([p, px]) => {
		const hgt = float(0).toVar(), rough = float(0.95).toVar(), d = p.y.negate();
		// which horizon: below each boundary that lies above it, each run into the next over as wide as it says
		const h = int(0).toVar(), blend = float(0).toVar(), nb = int(0).toVar();
		Loop(MOST - 1, ({ i }) => {
			If(i.greaterThanEqual(sN.sub(1)), () => {
			Break();
		});
			const e = sEdge.element(i), w = max(e.y, 0.002), to = sTo.element(i);
			// far above this boundary: above every deeper one too; far below it: past it, no noise needed
			If(d.lessThan(to.sub(e.x).sub(w.mul(1.2))), () => {
			Break();
		});
			If(d.greaterThan(to.add(e.x).add(e.z.mul(2.2)).add(w.mul(1.2))), () => {
				h.assign(i.add(1));
			}).Else(() => {
				const b = gBound(i, p);
				// a gradual boundary interfingers: lumps of each in the other, as wide as the transition
				const fringe = gN(p.div(w.mul(1.2)).add(i.toFloat().mul(11))).mul(0.65).add(gN(p.div(w.mul(0.45)).add(i.toFloat().mul(5))).mul(0.35)).sub(0.5).mul(w).mul(1.6);
				If(d.greaterThan(b.add(fringe)), () => {
			h.assign(i.add(1));
		});
				const t = float(1).sub(abs(d.sub(b)).div(w));
				If(t.greaterThan(blend), () => {
					blend.assign(t), nb.assign(i);
				});
			});
		});
		const ped = sPed.element(h), bits = sBits.element(h), marks = sMarks.element(h), more = sMore.element(h);
		const c = gMatrix(h, p).toVar();
		// across a boundary the two colours run into each other
		If(blend.greaterThan(0), () => {
			const other = int(nb).toVar();
			If(h.equal(nb), () => {
				other.addAssign(1);
			});
			mixIn(c, gMatrix(other, p), clamp(blend, 0, 1).mul(0.45));
		});
		// darker earth along old root channels and in the humus washed down cracks, lighter where it dried
		c.mulAssign(gF(p.mul(26).add(4)).mul(0.28).add(0.86));
		c.mulAssign(gN(p.mul(160)).sub(0.5).mul(0.22).mul(gSeen(0.006, px)).add(1));
		// the cut face's own relief: clods a few centimetres across that the spade broke it into, and their crumbs
		const kind = int(ped.y.add(0.5)), S = ped.x, crumb = kind.equal(PED.crumb);
		const clod = gN(p.div(0.028).add(3)).mul(0.6).add(gN(p.div(0.011).add(8)).mul(0.4));
		hgt.addAssign(clod.sub(0.5).mul(crumb.select(0.009, 0.006)));
		c.mulAssign(clod.mul(0.2).add(0.9));
		const seen = gSeen(S, px);
		If(seen.greaterThan(0).and(kind.lessThanEqual(PED.prismatic)), () => {
			// its peds: crumbs round, blocks angular, plates flat, prisms upright; pores and cracks dark between them
			const q = p.div(S).toVar();
			If(kind.equal(PED.platy), () => {
			q.y.mulAssign(3);
		});
			If(kind.equal(PED.prismatic), () => {
			q.y.mulAssign(0.33);
		});
			const v = gV(q).get('v');
			const gap = crumb.select(min(1, smoothstep(0.34, 0.52, v.x).mul(0.8).add(smoothstep(0, 0.07, v.y.sub(v.x)).oneMinus().mul(0.45))), smoothstep(0, 0.05, v.y.sub(v.x)).oneMinus());
			c.mulAssign(v.z.sub(0.5).mul(ped.w).mul(seen).add(1));
			c.mulAssign(float(1).sub(gap.mul(ped.z).mul(seen)));
			hgt.addAssign(crumb.select(float(0.5).sub(v.x).mul(0.5), 0).mul(S).mul(seen).sub(gap.mul(S).mul(0.35).mul(seen)));
		}).ElseIf(kind.equal(PED.grain), () => {
			// loose grains of sand, each its own: a few dark, a few glinting
			const gs = gSeen(S, px), gr = gH1(floor(p.div(S)));
			c.mulAssign(gr.sub(0.5).mul(0.4).mul(gs).add(1));
			mixIn(c, c.mul(0.55), step(0.93, gr).mul(gs));
			mixIn(c, c.mul(1.3), step(gr, 0.05).mul(gs));
			hgt.addAssign(gr.sub(0.5).mul(S).mul(0.5).mul(gs));
			rough.assign(0.88);
		}).ElseIf(kind.equal(PED.litter), () => {
			// fallen leaves and needles lying flat, layered, each piece its own shade; dark gaps between
			const v = gV(p.mul(vec3(float(1).div(S), float(1).div(S.mul(0.12)), float(1).div(S)))).get('v');
			const ls = gSeen(S.mul(0.12), px);
			c.assign(mix(sCol.element(h), sCol2.element(h), v.z).mul(gH1(vec3(v.z.mul(91))).mul(0.5).add(0.72)));
			const gap = smoothstep(0, 0.12, v.y.sub(v.x)).oneMinus();
			c.mulAssign(float(1).sub(gap.mul(ped.z).mul(ls)));
			hgt.addAssign(float(0.5).sub(gap).mul(S).mul(0.15).mul(ls));
			rough.assign(0.85);
		}).ElseIf(kind.equal(PED.peat), () => {
			// matted humus: fine dark fibres, mostly lying
			const fs = gSeen(S, px), f = gN(p.mul(vec3(float(1).div(S), float(4).div(S), float(1).div(S))));
			c.mulAssign(f.mul(0.4).mul(fs).add(0.8).add(fs.oneMinus().mul(0.2)));
			hgt.addAssign(f.sub(0.5).mul(S).mul(0.4).mul(fs));
		});
		// stones: more and bigger towards the rock, rounded-angular, each its own shade, a dark rim where the earth parts from it
		Loop(2, ({ i: k }) => {
			If(bits.x.lessThanEqual(0), () => {
			Break();
		});
			const sz = k.equal(0).select(bits.y, bits.y.mul(0.32)), share = k.equal(0).select(bits.x, min(1, bits.x.mul(1.6)));
			If(gSeen(sz.mul(0.4), px).lessThanEqual(0), () => {
			Break();
		});
			const v = gV(p.div(sz).add(31).add(k.toFloat().mul(7))).get('v');
			const r = fract(v.z.mul(13.1)).mul(0.22).add(0.3).add(gN(p.div(sz).mul(3)).sub(0.5).mul(0.16));
			const isS = step(v.z, share.mul(1.4));
			const inside = isS.mul(smoothstep(r.sub(0.03), r, v.x).oneMinus()).mul(smoothstep(0.015, 0.05, v.y.sub(v.x)));
			const sc = sStone.mul(fract(v.z.mul(71.3)).mul(0.55).add(0.7)).mul(gN(p.div(sz).mul(12)).mul(0.3).add(0.8)).mul(gN(p.mul(900)).mul(gSeen(0.002, px)).mul(0.2).add(0.9));
			const rim = isS.mul(smoothstep(r.sub(0.02), r, v.x).sub(smoothstep(r, r.add(0.06), v.x)));
			c.mulAssign(float(1).sub(rim.mul(0.55)));
			mixIn(c, sc, inside);
			hgt.addAssign(inside.mul(sz).mul(r.sub(v.x).mul(0.25).add(0.12)).sub(rim.mul(sz).mul(0.06)));
			rough.assign(mix(rough, 0.68, inside));
		});
		// old animal burrows filled with the earth of another horizon (a black earth's krotovinas)
		If(more.x.greaterThan(0), () => {
			const v = gV(p.mul(vec3(1 / 0.26, 1 / 0.4, 1 / 0.26)).add(5)).get('v');
			const kr = step(v.z, more.x.mul(0.3)).mul(smoothstep(0.22, 0.27, v.x).oneMinus());
			const fill = h.greaterThan(0).select(sCol.element(h.sub(1)), sCol2.element(h.add(1)));
			mixIn(c, fill.mul(gN(p.mul(40)).mul(0.2).add(0.9)), kr);
		});
		// fine roots, a millimetre or so thick, running mostly downwards: each a short straight piece in the earth, so the
		// face shows them as the spade cut them, a dash where it runs along one, a pale dot where it cut across
		If(bits.z.greaterThan(0), () => {
			const cell = gV(p.div(0.012).add(23)).toVar(), v = cell.get('v'), toC = cell.get('to');
			const rh = gH3(vec3(v.z.mul(97), v.z.mul(13), 5));
			const dir = normalize(vec3(rh.x.sub(0.5), rh.y.negate().sub(1.1), rh.z.sub(0.5)));
			const t = clamp(dot(toC, dir), -0.9, 0.9), rd = length(toC.sub(dir.mul(t)));
			const rw = rh.z.mul(0.04).add(0.045), fat = max(1, px.div(rw.mul(0.024)));
			const root = step(v.z, bits.z.mul(0.42)).mul(smoothstep(rw.mul(0.6).mul(fat), rw.mul(fat), rd).oneMinus()).div(fat);
			mixIn(c, sRoot.mul(rh.y.mul(0.4).add(0.78)), root.mul(0.9));
			hgt.addAssign(root.mul(0.0007));
		});
		// fungal threads: a white web in the humus
		If(marks.w.greaterThan(0), () => {
			const ts = gSeen(0.0008, px), n = gN(p.mul(160).add(21));
			const web = smoothstep(0, 0.025, abs(n.sub(0.5))).oneMinus().mul(smoothstep(float(0.55).sub(marks.w.mul(0.35)), 0.9, gN(p.mul(14).add(3))));
			mixIn(c, sThread, web.mul(ts).mul(0.8));
			mixIn(c, sThread.mul(0.8), smoothstep(float(0.82).sub(marks.w.mul(0.1)), 0.95, gF(p.mul(30).add(8))).mul(marks.w).mul(0.25).mul(ts.oneMinus()));
		});
		// where water stands at times: rust mottles and grey streaks
		If(marks.x.greaterThan(0), () => {
			const rust = smoothstep(0.6, 0.68, gF(p.mul(22).add(9))).mul(marks.x), grey = smoothstep(0.64, 0.72, gF(p.mul(16).add(3))).mul(marks.x);
			mixIn(c, sRust.mul(gN(p.mul(90)).mul(0.3).add(0.85)), rust.mul(0.85));
			mixIn(c, sGrey, grey.mul(0.7));
		});
		// lime: soft white nodules and threads
		If(marks.y.greaterThan(0), () => {
			const v = gV(p.div(0.011).add(17)).get('v');
			const nod = step(v.z, marks.y.mul(0.3)).mul(smoothstep(0.24, 0.32, v.x).oneMinus()).mul(max(gSeen(0.006, px), 0.4));
			const thread = smoothstep(0, 0.02, abs(gN(p.mul(120).add(31)).sub(0.5))).oneMinus().mul(marks.y).mul(0.6).mul(gSeen(0.001, px));
			mixIn(c, sLime, max(nod, thread));
			hgt.addAssign(nod.mul(0.002));
		});
		// charcoal: black, glinting flecks
		If(marks.z.greaterThan(0), () => {
			const v = gV(p.div(0.006).add(41)).get('v');
			const ch = step(v.z, marks.z.mul(0.22)).mul(smoothstep(0, 0.08, v.y.sub(v.x).sub(0.12)).oneMinus()).mul(step(v.x, 0.42)).mul(max(gSeen(0.004, px), 0.3));
			mixIn(c, vec3(0.012, 0.011, 0.01), ch);
			rough.assign(mix(rough, 0.45, ch));
		});
		// worm burrows: cut across, round dark holes lined with darker earth (the walls they coat with their casts), from
		// the endogeic worms' in the topsoil, 2–5 mm, to the anecic worm's that run upright a metre and more, 6–9 mm; and
		// where a face runs along one, its channel
		const poreShare = crumb.select(0.3, kind.lessThanEqual(PED.prismatic).select(0.12, 0.04)).mul(ped.z);
		If(bits.w.greaterThan(0).or(poreShare.greaterThan(0)), () => {
			const v = gV(p.div(0.016).add(13)).get('v');
			// pores between the crumbs and the old channels of roots: dark, 1–4 mm
			const pr = fract(v.z.mul(53.1)).mul(0.1).add(0.06);
			const pore = step(v.z, poreShare).mul(smoothstep(pr.mul(0.7), pr, v.x).oneMinus()).mul(max(gSeen(0.002, px), 0.35));
			mixIn(c, c.mul(0.28), pore);
			hgt.subAssign(pore.mul(0.0025));
			const deepOk = step(d, fract(v.z.mul(7.3)).mul(1.4).add(0.25));
			const r = fract(v.z.mul(31.7)).mul(0.17).add(0.16).mul(mix(1, 0.6, step(0.35, d)));
			const isW = step(v.z.oneMinus(), bits.w.mul(0.05)).mul(deepOk).mul(max(gSeen(0.004, px), 0.25));
			const ring = smoothstep(r, r.mul(1.9), v.x).oneMinus().mul(isW), hole = smoothstep(r.mul(0.8), r, v.x).oneMinus().mul(isW);
			mixIn(c, c.mul(0.5), ring.mul(0.85));
			mixIn(c, vec3(0.016, 0.012, 0.008), hole);
			hgt.subAssign(hole.mul(0.004));
			const cell = floor(p.xz.div(0.09)), hh = gH3(vec3(cell, 3));
			If(hh.x.lessThan(bits.w.mul(0.42)), () => {
				const deep = hh.y.mul(1.3).add(0.3);
				const axis = cell.add(0.25).add(hh.yz.mul(0.5)).mul(0.09).add(vec2(sin(p.y.mul(17).add(hh.x.mul(40))), cos(p.y.mul(13).add(hh.y.mul(30)))).mul(0.011));
				const rr = hh.z.mul(0.0015).add(0.003), dist = length(p.xz.sub(axis));
				const on = step(d, deep).mul(max(gSeen(rr.mul(2), px), 0.3)), core = smoothstep(rr.mul(0.8), rr, dist).oneMinus().mul(on);
				mixIn(c, c.mul(0.5), smoothstep(rr, rr.mul(2), dist).oneMinus().mul(on).mul(0.85));
				mixIn(c, vec3(0.018, 0.013, 0.009), core);
				hgt.subAssign(core.mul(0.004));
			});
		});
		return Soil(c, hgt, rough);
	});
	const ur = { uF: ref(g.uF, 'vec3'), uEye: ref(g.uEye, 'vec3') };
	const out = Fn(() => {
		const w = positionWorld, px = length(fwidth(w));
		// the underside of the ground, seen from deep below: the topsoil over our heads, dim (no light comes from there)
		const ceil = abs(normalize(cross(dFdx(w), dFdy(w))).y).greaterThan(0.7);
		const sp = w.sub(vec3(0, ceil.select(u.uDeep.mul(0.12), 0), 0));
		const s = gSoil(sp, px).toVar();
		// less light the deeper it lies
		const col = s.get('c').mul(ceil.select(0.55, 1)).mul(clamp(w.y.negate().div(max(u.uDeep, 1e-3)), 0, 1).mul(-0.22).add(1));
		// the relief as the light sees it, measured across the pixel (as a bump map is); the underside lit as the face
		// is, so the corner where they meet does not show as a seam
		const dh = vec2(dFdx(s.get('hgt')), dFdy(s.get('hgt'))).mul(1.6), n = normalView;
		const sx = normalize(dFdx(positionView)), sy = normalize(dFdy(positionView)), r1 = cross(sy, n), r2 = cross(n, sx);
		const det = dot(sx, r1).mul(faceDirection);
		const bumped = normalize(abs(det).mul(n).sub(sign(det).mul(r1.mul(dh.x).add(r2.mul(dh.y)))));
		normalView.assign(ceil.select(normalize(cameraViewMatrix.mul(vec4(ur.uF, 0)).xyz), bumped));
		return Out2(col, s.get('rough'));
	})().toVar('soil');
	m.colorNode = out.get('col');
	m.roughnessNode = out.get('rough');
	// seen through the earth: the further off, the darker and the more of one colour
	const hz = float(1).sub(exp(max(distance(positionWorld, ur.uEye).sub(u.uHazeNear), 0).negate().div(u.uHazeL)));
	m.outputNode = vec4(mix(output.rgb, u.uHazeC, hz.mul(0.6)).mul(hz.mul(-0.45).add(1)), output.a);
	return m;
}
const Out2 = struct({ col: 'vec3', rough: 'float' });

/** a soil's horizons into its material's uniforms @param {MeshStandardNodeMaterial} m @param {import('./soils.js').Soil} soil */
function setSoil(m, soil) {
	const u = m.userData.soil, hs = soil.horizons.slice(0, MOST);
	u.sN.value = hs.length;
	hs.forEach((h, i) => {
		u.sTo.array[i] = h.to;
		u.sCol.array[i].set(h.col);
		u.sCol2.array[i].set(h.col2);
		u.sPed.array[i].set(h.ped.size, PED[h.ped.kind], h.ped.dark, h.ped.vary);
		u.sBits.array[i].set(h.stones?.share ?? 0, h.stones?.size ?? 0.04, h.roots ?? 0, h.worms ?? 0);
		u.sMarks.array[i].set(h.mottles ?? 0, h.lime ?? 0, h.charcoal ?? 0, h.hyphae ?? 0);
		u.sMore.array[i].set(h.krotovina ?? 0, 0, 0, 0);
		u.sEdge.array[i].set(h.wave ?? 0.02, h.sharp ?? 0.03, h.tongue ?? 0);
	});
	u.sStone.value.set(soil.stone);
	// far off, the earth darkens to its topsoil's colour (the first horizon that is no litter), dimmed as the light is down there
	const top = hs.find((h) => h.ped.kind !== 'litter' && h.ped.kind !== 'peat' && h.to > 0.04) ?? hs[0];
	u.uHazeC.value.set(top.col).multiplyScalar(0.5);
}

/**
 * the floor: a biome's surfaces (the worlds' ground), a ring of mulch round the stem, fading into the backdrop far off;
 * facing up only, so the eye below the ground sees on past it
 * @param {ReturnType<typeof groundUniforms>} g @param {THREE.Color} bg @param {THREE.Vector2} fade
 */
function floorMaterial(g, bg, fade, sky) {
	const m = groundMaterial(BARE);
	const xz = positionWorld.xz, bw = vec2(xz.x, xz.y.negate()), c = ref(g.uC, 'vec3'), ring = ref(g.uRing, 'float');
	// mulch round the stem: leaves and humus, its edge ragged
	const q = xz.sub(c.xz), r = length(q).add(vn(q.div(max(ring.mul(0.4), 0.01))).sub(0.5).mul(ring).mul(0.25));
	const mulch = smoothstep(ring.mul(0.55), ring, r).oneMinus().mul(0.92);
	const lit = surfaceRead(0, bw.div(PER.size.element(0)).mul(0.45)), hum = surfaceRead(1, bw.div(PER.size.element(1)).mul(0.6));
	const under = mix(m.colorNode, mix(hum, lit, smoothstep(0.3, 0.7, vn(bw.mul(6))).mul(0.5).add(0.35)).mul(1.05), mulch);
	// close up, the floor's own grain under its pictures, fading out with distance
	const px = length(fwidth(bw)), near = clamp(float(0.004).div(max(px, 1e-6)).sub(1).div(3), 0, 1), mid = clamp(float(0.015).div(max(px, 1e-6)).sub(1).div(3), 0, 1);
	m.colorNode = under.mul(vn(bw.mul(260)).sub(0.5).mul(0.35).mul(near).add(vn(bw.mul(70).add(3)).sub(0.5).mul(0.22).mul(mid)).add(1));
	// under the sky, the colour of the horizon right behind it as the eye sees it: the ground meets the sky
	const fv = uniform(fade);
	let far = uniform(bg);
	if (sky) {
		// the sky's horizon behind it as the eye sees it: its ring of 16 colours round the compass (sandbox-kit/sky.js)
		const ring = uniformArray(sky.horizon.uniforms.uSkyRing.value, 'vec3'), eye = ref(g.uEye, 'vec3');
		const f = fract(atan(xz.y.sub(eye.z), xz.x.sub(eye.x).add(1e-5)).div(6.2831853).add(1)).mul(16), k = int(f);
		far = mix(ring.element(k), ring.element(k.add(1).mod(16)), fract(f));
	}
	m.outputNode = vec4(mix(output.rgb, far, smoothstep(fv.x, fv.y, length(xz.sub(c.xz)))), output.a);
	return m;
}

/**
 * A plant's ground on the stage.
 * @param {import('./stage.js').Stage} stage
 * @param {{ cover?: boolean, drawn?: any }} [o] `cover`: its biome's cover streamed round the plant (not on a phone's
 *   budget); `drawn`: the renderer it is drawn by (./plantings.js `drawn`: play's builds of its kinds), none without
 */
export function groundOf(stage, { cover = !stage.low, drawn = null } = {}) {
	const g = groundUniforms();
	const fade = new THREE.Vector2(8, 30);
	const group = new THREE.Group();
	group.name = 'ground';
	group.visible = false;
	const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 128).rotateX(-Math.PI / 2), floorMaterial(g, stage.bg, fade, stage.sky));
	floor.receiveShadow = true;
	const soil = soilMaterial(g);
	// the earth behind the roots, seen from below the ground line: one face of it standing just beyond the farthest root,
	// square to the eye, wide and deep enough that its edges are never seen (they are lost in its haze), the ground line
	// its top; lit by the studio's lights but in no shadow (the crown's would fall on it as if no earth lay above)
	// and from deeper down, the underside of the ground from the plant back to the face, so a root near the surface is
	// seen against earth and not the sky (the ground line then runs through the stem's foot, from any depth). Both in
	// the earth's own frame: at the plant, turned to face the eye
	const under = new THREE.Group();
	under.name = 'underground';
	under.visible = false;
	const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0), soil);
	const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, 0, -0.5), soil);
	under.add(face, ceiling);
	group.add(floor, under);
	/** @type {null | ReturnType<typeof coverStream>} */
	let stream = null;
	let recipe = null, ringAt = 0, reachAt = 0, tall = false, soilNow = soilOf();
	setSoil(soil, soilNow);
	const at = new THREE.Vector3();
	/** the plant as fitted: how deep and how far out its roots reach, and how big it is */
	const fitted = { deep: 0, spread: 0, reach: 1 };
	/** how far behind the plant the earth's face stands, how big it is, the way it faces (eased), and whether the eye is below */
	let behind = 1, faceW = 40, faceH = 20, az = null, below = false;
	const mark = () =>
		group.traverse((o) => {
			o.userData.studio = true;
			// out of the occlusion pass, which draws both sides of everything and would take the earth's face for a wall
			if (o.parent === under) o.userData.noAO = true;
		});
	mark();
	stage.scene.add(group);

	/** the cover round the plant: everywhere but the mulch ring, and while the eye is below the ground only beyond the earth's face (its turf on the ground line) */
	const coverFor = () => {
		stream?.dispose();
		stream = null;
		// the cover is drawn to be seen from standing height: round a seedling, seen from a few centimetres, its clover
		// heads and twigs would stand like trees, so a small plant stands on its floor alone
		if (!cover || !drawn || !tall || !recipe?.cover?.length) return;
		const ring = ringAt, cx = g.uC.value.x, cz = g.uC.value.z;
		// out to where the floor starts fading into the backdrop, never beyond it (no plants standing in the haze)
		const reach = reachAt;
		// on a turntable the plant is the middle of what is seen: the cover stands full round it and thins outwards; and
		// while the eye is below the ground, only beyond the earth's face (`update`, the render kit's `coverAway`)
		drawn.round(new THREE.Vector3(cx, 0, cz));
		try {
			stream = coverStream({ drawn, recipe, open: (x, z) => Math.hypot(x - cx, z - cz) > ring, tile: Math.max(1.5, Math.min(4, reach / 3)), reach, near: reach * 0.45, thin: 0.2, perFrame: 4, seed: 77 });
		} catch (e) {
			// a biome whose card names no build for a kind: its floor alone
			console.warn(`no cover: ${e?.message ?? e}`);
		}
	};

	return {
		group,
		get soil() {
			return soilNow;
		},
		/** whether the eye is below the ground line (the earth drawn, the frame split there) */
		get below() {
			return below;
		},
		/** the biome it is the floor of (its recipe, as its card says it) and that biome's id, which names its soil */
		biome(next, id) {
			recipe = next;
			floor.material.userData.weigh(next?.surface ?? BARE);
			soilNow = soilOf(id);
			setSoil(soil, soilNow);
			coverFor();
		},
		/**
		 * sized to a plant: the earth as deep as its deepest root and a little more, wide round its roots; the floor out
		 * to the horizon, its mulch ring as wide as its crown is near the ground. The ground's surface at 0.
		 * @param {THREE.Object3D} root
		 */
		fit(root) {
			root.updateMatrixWorld(true);
			root.getWorldPosition(at);
			const box = new THREE.Box3().setFromObject(root);
			const bs = box.getSize(new THREE.Vector3());
			// how far its roots reach down and out: its vertices under the ground, a sample of them
			let deep = Math.max(0, -box.min.y), spread = 0;
			const p = new THREE.Vector3(), mi = new THREE.Matrix4(), wb = new THREE.Box3();
			root.traverse((m) => {
				if (!m.isMesh || !m.geometry?.attributes?.position || !m.visible) return;
				if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
				wb.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
				if (m.isInstancedMesh) wb.makeEmpty().setFromObject(m);
				if (wb.min.y >= 0) return;
				const pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
				const n = m.isInstancedMesh ? Math.min(m.count, 64) : 1;
				for (let k = 0; k < n; k++) {
					if (m.isInstancedMesh) m.getMatrixAt(k, mi).premultiply(m.matrixWorld);
					else mi.copy(m.matrixWorld);
					for (let i = 0; i < pos.count; i += step) {
						p.fromBufferAttribute(pos, i).applyMatrix4(mi);
						if (p.y < 0) spread = Math.max(spread, Math.hypot(p.x - at.x, p.z - at.z));
					}
				}
			});
			const reach = Math.max(bs.x, bs.y, bs.z, 0.01);
			Object.assign(fitted, { deep, spread, reach });
			const D = Math.max(deep, reach * 0.03), S = Math.max(spread, D * 0.5);
			// the face just beyond the farthest root behind the plant; as big as never to show its edges
			behind = S * 1.12 + reach * 0.01;
			faceW = Math.max(reach * 60, 30);
			faceH = Math.max(reach * 30, 15);
			face.scale.set(faceW, faceH, 1);
			face.position.set(0, 0, -behind);
			ceiling.scale.set(faceW, 1, behind);
			g.uB.value = behind;
			g.uBand.value = Math.max(S * 1.5, reach * 0.3, 0.6);
			soil.userData.soil.uDeep.value = D * 1.4 + reach * 0.01;
			soil.userData.soil.uHazeL.value = Math.max(D * 2.5, 0.04);
			g.uC.value.set(at.x, 0, at.z);
			floor.scale.setScalar(Math.max(60, reach * 40));
			floor.position.set(at.x, 0, at.z);
			// under the sky the floor runs on far, to a horizon; in the studio it fades into the backdrop near the plant
			if (stage.sky) fade.set(Math.max(reach * 2.5, 5), Math.max(reach * 22, 30));
			else fade.set(Math.max(reach * 2.2, 3), Math.max(reach * 9, 14));
			// a ring of mulch round the stem, as wide as its crown is near the ground, so a seedling is not lost in grass
			const ring = Math.min(1.6, Math.max(0.2, Math.max(bs.x, bs.z) * 0.55));
			g.uRing.value = ring;
			const coverReach = Math.max(4, Math.min(14, fade.x * 1.15));
			const big = Math.max(bs.x, bs.y, bs.z) > 0.35;
			if (Math.abs(ring - ringAt) > ringAt * 0.25 || Math.abs(coverReach - reachAt) > reachAt * 0.25 || big !== tall || (!stream && big)) {
				ringAt = ring;
				reachAt = coverReach;
				tall = big;
				coverFor();
			}
			mark();
			return { deep, spread };
		},
		/** shown, or not (a fruit on its own stands on the studio's floor) @param {boolean} on */
		show(on) {
			group.visible = on;
			// its cover is the renderer's, not in the group: shown and put away with it
			stream?.show(on);
			if (!on) below = under.visible = false;
		},
		/**
		 * Where the camera stands for the split-level view of the roots: on the ground line (a hair under it), so the line
		 * lies level through the whole frame as a split-level shot's waterline does, tilted down until the line is two
		 * fifths down the frame, the stem's foot on it and all of the roots under it; from the side it looks from now.
		 * @param {THREE.PerspectiveCamera} camera
		 */
		rootsView(camera) {
			const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), aspect = camera.aspect || 1;
			const D = Math.max(fitted.deep, fitted.reach * 0.03), S = Math.max(fitted.spread, D * 0.5);
			// tilted down so the horizon (the ground line) is 0.2 of the half-height over the middle; the deepest root 0.85
			// of it under the middle; the roots' spread in the width
			const tilt = Math.atan(0.2 * h);
			const d = Math.max((1.06 * D) / Math.tan(tilt + Math.atan(0.85 * h)), (1.15 * S) / (h * aspect));
			const y = -fitted.reach * 0.004;
			const e = camera.position, az = Math.atan2(e.x - at.x, e.z - at.z);
			return {
				pos: new THREE.Vector3(at.x + Math.sin(az) * d, y, at.z + Math.cos(az) * d),
				target: new THREE.Vector3(at.x, y - d * Math.tan(tilt), at.z),
				near: Math.min(d / 200, fitted.reach / 300)
			};
		},
		/** each frame: the eye for the cover and the earth's haze; below the ground, the earth drawn round the eye */
		update(camera, dt) {
			if (!group.visible) return;
			camera.getWorldPosition(g.uEye.value);
			const e = g.uEye.value;
			const was = below;
			below = e.y < fitted.reach * 0.002;
			under.visible = below;
			// from below, the floor is not drawn, so it is no surface for the occlusion pass either
			floor.userData.noAO = below;
			g.uHide.value = below ? 1 : 0;
			coverAway.on.value = below ? 1 : 0;
			if (below) {
				// the face turns to stay square to the eye, eased (it settles rather than following every twitch)
				const want = Math.atan2(e.x - at.x, e.z - at.z);
				if (az === null || !was) az = want;
				let dA = want - az;
				dA = Math.atan2(Math.sin(dA), Math.cos(dA));
				az += dA * (1 - Math.exp(-Math.min(dt, 0.1) * 6));
				const fx = Math.sin(az), fz = Math.cos(az);
				under.position.set(at.x, 0, at.z);
				under.rotation.set(0, az, 0);
				g.uF.value.set(fx, 0, fz);
				coverAway.c.value.set(at.x, at.z);
				coverAway.f.value.set(fx, fz);
				coverAway.b.value = g.uB.value;
				coverAway.band.value = g.uBand.value;
				// the haze counts from the face's nearest point to the eye: right behind the roots it is clear
				soil.userData.soil.uHazeNear.value = Math.max(0, (e.x - at.x) * fx + (e.z - at.z) * fz + behind);
			}
			// on a turntable the plant is the middle of what is seen: the cover stands full round it and thins outwards
			stream?.update(at.x, at.z);
		},
		dispose() {
			group.removeFromParent();
			stream?.dispose();
			stream = null;
			coverAway.on.value = 0;
			floor.geometry.dispose();
			floor.material.dispose();
			face.geometry.dispose();
			ceiling.geometry.dispose();
			soil.dispose();
		}
	};
}
