/*
 * THE GRASS'S MATERIAL, IN TSL — a blade of ../../biomes/grass.js worked out on the graphics card from its tile and its
 * number alone: its cell and its number in it, its hash (the same PCG sums as grass.js's), where it stands, its rank,
 * its height with its clump and the mask, its lean, its shape at its level geomorphing to the next, the wind's bend
 * and the pushers', its width never under `minPx` pixels; then its light (rounded normals turned to the ground's with
 * distance, wrapped, light through the tips against the sun, the roots darker where it is dense) and its colour (the
 * colour field, the clumps, its own shade, dry blades).
 *
 * Every sum here has its twin in grass.js, which the tests check: change one, change both.
 *
 * `grassMaterial({ level, uniforms, params, device })` → a MeshStandardNodeMaterial for a level's tiles (the tile's
 * first cell from its world matrix, its cells across from the level); `grassUniforms()` the uniforms its tiles share,
 * set every frame by the field.
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
	Fn, attribute, uniform, uniformArray, instanceIndex, uint, int, float, vec2, vec3, vec4, mix, smoothstep, clamp, max, min, pow, sin, cos,
	normalize, cross, dot, length, distance, fract, floor, texture, cameraPosition, modelWorldMatrix, positionGeometry, transformNormalToView,
	faceDirection, select, sqrt, varyingProperty
} from 'three/tsl';
import { CELL, PUSHERS, TILE_CELLS } from '../../biomes/grass.js';

/** the uniforms a field's tiles share */
export function grassUniforms(/** @type {THREE.Texture} */ mask) {
	return {
		/** the grass mask (grass.js `GrassMask`): its texture and how wide it is (m) */
		mask,
		maskWidth: uniform(153.6),
		/** blades a cell */
		perCell: uniform(2240),
		time: uniform(0),
		/** the wind: its way (unit, on the ground), its strength (m of a tip's bend at the gust's top), how gusty */
		windDir: uniform(new THREE.Vector2(1, 0.3).normalize()),
		windStrength: uniform(0.06),
		gust: uniform(0.6),
		/** the pushers: x, z, radius, strength (0 none) */
		pushers: uniformArray(Array.from({ length: PUSHERS }, () => new THREE.Vector4(0, 0, 0, 0)), 'vec4'),
		/** the sun: the way to it, its colour times its intensity */
		sunDir: uniform(new THREE.Vector3(0.3, 0.8, 0.5).normalize()),
		sunColor: uniform(new THREE.Color(1, 0.97, 0.9)),
		/** a metre's size in pixels at a metre: the screen's height over 2 tan(fov / 2) */
		pxAt1m: uniform(800)
	};
}

/* ── the hash: grass.js's `pcg`, `seedOf`, `draw` ── */

const pcgU = Fn(([v]) => {
	const state = uint(v).mul(uint(747796405)).add(uint(2891336453));
	const word = state.shiftRight(state.shiftRight(uint(28)).add(uint(4))).bitXor(state).mul(uint(277803737));
	return word.shiftRight(uint(22)).bitXor(word);
}).setLayout({ name: 'grassPcg', type: 'uint', inputs: [{ name: 'v', type: 'uint' }] });
const drawU = (/** @type {any} */ seed, /** @type {number} */ k) => float(pcgU(seed.add(uint(Math.imul(k, 0x9e3779b9) >>> 0)))).mul(1 / 4294967296);

/* ── the biomes' value noise (noise.js `vn`) ── */
const h21 = Fn(([p]) => {
	const q = fract(p.mul(vec2(123.34, 456.21))).toVar();
	q.addAssign(dot(q, q.add(45.32)));
	return fract(q.x.mul(q.y));
}).setLayout({ name: 'grassH21', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });
const vnT = Fn(([p]) => {
	const i = floor(p), f = fract(p);
	const u = f.mul(f).mul(float(3).sub(f.mul(2)));
	return mix(mix(h21(i), h21(i.add(vec2(1, 0))), u.x), mix(h21(i.add(vec2(0, 1))), h21(i.add(vec2(1, 1))), u.x), u.y);
}).setLayout({ name: 'grassVn', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });
/** grass.js `fieldAt` */
const fieldT = (/** @type {any} */ p) => {
	const fbm = (/** @type {any} */ q) => vnT(q).mul(0.55).add(vnT(q.mul(2.03).add(7.1)).mul(0.3)).add(vnT(q.mul(4.1).add(3.3)).mul(0.15));
	return vnT(p.mul(1.1).add(vec2(17.3, -4.1))).mul(0.45)
		.add(fbm(p.div(5).add(vec2(3.1, -1.7))).mul(0.3))
		.add(vnT(p.div(20).add(vec2(3.1, 0))).mul(0.15))
		.add(vnT(p.div(80).add(vec2(7.7, 0))).mul(0.1));
};

/** grass.js `clumpCentre`: x, z, height, shade */
const clumpCentreT = (/** @type {any} */ g, /** @type {any} */ size) => {
	const s = pcgU(pcgU(int(g.x).toUint()).bitXor(int(g.y).toUint().mul(uint(0x27d4eb2d))));
	return vec4(g.x.add(0.15).add(drawU(s, 0).mul(0.7)).mul(size), g.y.add(0.15).add(drawU(s, 1).mul(0.7)).mul(size), drawU(s, 2), drawU(s, 3));
};

/**
 * @param {{
 *   level: 0 | 1 | 2,
 *   uniforms: ReturnType<typeof grassUniforms>,
 *   params: import('../../biomes/grass.js').GrassParams,
 *   device: { bands: number[], near: number, minPx: number }
 * }} o
 */
export function grassMaterial(o) {
	const { level, uniforms: U, params: P, device: D } = o;
	const k = /** @type {number} */ (TILE_CELLS[level]);
	const [b0, b1, b2] = /** @type {[number, number, number]} */ (D.bands);
	const band = /** @type {number} */ (D.bands[level]);

	/* what the vertex stage hands the fragments */
	const vN = varyingProperty('vec3', 'vGrassN'), vV = varyingProperty('vec3', 'vGrassV');
	const vT = varyingProperty('float', 'vGrassT'), vField = varyingProperty('float', 'vGrassField'), vTone = varyingProperty('float', 'vGrassShade');
	const vDry = varyingProperty('float', 'vGrassDry'), vDense = varyingProperty('float', 'vGrassDense'), vD = varyingProperty('float', 'vGrassD');

	const vertex = Fn(() => {
		/* which blade: the tile's first cell from where the tile stands, the instance's cell and number */
		const origin = modelWorldMatrix.element(3).xz;
		const tile = floor(origin.div(CELL).add(0.5));
		const i = uint(instanceIndex);
		const c = i.mod(uint(k * k)), j = i.div(uint(k * k));
		const cell = tile.add(vec2(float(c.mod(uint(k))), float(c.div(uint(k)))));
		const seed = pcgU(pcgU(pcgU(int(cell.x).toUint()).add(int(cell.y).toUint())).add(j));
		const foot = cell.add(vec2(drawU(seed, 0), drawU(seed, 1))).mul(CELL);
		const rank = float(j).add(drawU(seed, 2)).div(U.perCell);
		const ownH = drawU(seed, 3).mul(2).sub(1), ownLean = drawU(seed, 4), facing = drawU(seed, 5).mul(Math.PI * 2);
		const ownW = drawU(seed, 6).mul(0.6).add(0.7), shade = drawU(seed, 7), dry = drawU(seed, 8), end = drawU(seed, 9).mul(0.1).add(0.9);
		const here = drawU(seed, 10);

		/* the mask: how much grass, how much of it tall, the ground's height */
		const m = texture(U.mask, fract(foot.div(U.maskWidth))).level(0);
		const grows = here.lessThan(m.x).select(float(1), float(0));
		const groundY = m.z;

		/* the distance, and how far it grows there: grass.js `keep`, `growAt` */
		const d = distance(vec3(foot.x, groundY, foot.y), cameraPosition);
		const dd = d.toVar();
		const keepD = select(dd.lessThanEqual(D.near), float(1), select(dd.greaterThanEqual(b2), float(0), pow(float(D.near).div(dd), 1.25)));
		const reach = end.mul(b2);
		const grow = clamp(keepD.sub(rank).div(0.08).add(1), 0, 1).mul(float(1).sub(smoothstep(reach.sub(6), reach, dd))).mul(grows);

		/* clumps: grass.js `clumpAt`, the two nearest of four */
		const size = float(P.clump);
		const fp = foot.div(size), g0 = floor(fp.sub(0.5));
		const A = vec4(0, 0, 0, 0).toVar(), Bc = vec4(0, 0, 0, 0).toVar(), dA = float(1e9).toVar(), dB = float(1e9).toVar();
		for (let dx = 0; dx <= 1; dx++)
			for (let dz = 0; dz <= 1; dz++) {
				const cc = clumpCentreT(g0.add(vec2(dx, dz)), size);
				const dc = distance(foot, cc.xy);
				const nearer = dc.lessThan(dA);
				Bc.assign(select(nearer, A, select(dc.lessThan(dB), cc, Bc)));
				dB.assign(select(nearer, dA, select(dc.lessThan(dB), dc, dB)));
				A.assign(select(nearer, cc, A));
				dA.assign(select(nearer, dc, dA));
			}
		const w = smoothstep(0.5, 0.75, dB.div(max(dA.add(dB), 1e-6))).mul(0.5).add(0.5);
		const cH = mix(Bc.z, A.z, w), cShade = mix(Bc.w, A.w, w);
		const out = min(dA.div(size.mul(0.6)), 1);
		const away = foot.sub(A.xy);

		/* the blade: grass.js `bladeHeight`, its lean out of its clump, its width wider as fewer stand, never under minPx */
		const height = mix(float(P.height), float(P.tall), m.y).mul(ownH.mul(P.heightSpread).add(1)).mul(cH.mul(0.4).add(0.8)).mul(out.mul(-0.25).add(1)).mul(grow);
		const own = vec2(cos(facing), sin(facing));
		const leanWay = normalize(own.mul(float(1).sub(out.mul(0.6))).add(normalize(away.add(1e-4)).mul(out.mul(0.9))));
		const lean = ownLean.mul(P.lean);
		const thin = float(1).div(sqrt(max(keepD, 0.12)));
		const width = max(float(P.width).mul(ownW).mul(thin), dd.mul(D.minPx).div(U.pxAt1m));

		/* the wind (intent 6's one wind will replace it): gusts rolling along its way, each blade's own flutter */
		const along = dot(foot, U.windDir);
		const gustT = vnT(vec2(along.mul(0.12).sub(U.time.mul(0.9)), dot(foot, vec2(U.windDir.y.negate(), U.windDir.x)).mul(0.08)));
		const gustNow = gustT.mul(U.gust).add(float(1).sub(U.gust).mul(0.5));
		const flutter = sin(U.time.mul(3.1).add(drawU(seed, 11).mul(6.283)).add(along.mul(0.7))).mul(0.15);
		const windBend = U.windDir.mul(gustNow.add(flutter).mul(U.windStrength).mul(height.div(0.3)));

		/* the pushers: tips pushed away and down */
		const push = vec3(0, 0, 0).toVar();
		for (let p = 0; p < PUSHERS; p++) {
			const q = U.pushers.element(p);
			const v = foot.sub(q.xy), dist = length(v);
			const f = float(1).sub(smoothstep(q.z.mul(0.4), q.z, dist)).mul(q.w);
			push.addAssign(vec3(normalize(v.add(1e-4)).mul(f.mul(height).mul(0.8)), f.mul(0.6)));
		}
		const bendW = windBend.add(push.xy);
		const flat = min(push.z, 0.85);

		/* its shape: grass.js `shapeAt` in its own frame (x across, z the way it leans), turned to `leanWay` */
		const fwd = vec3(leanWay.x, 0, leanWay.y), across = vec3(leanWay.y, 0, leanWay.x.negate());
		// the bend in its own frame: along its lean, and across
		const bz = dot(bendW, leanWay), bx = dot(bendW, vec2(leanWay.y, leanWay.x.negate()));
		const leanNow = lean.add(flat.mul(1.2));
		const H = height.mul(float(1).sub(flat.mul(0.5)));
		const shape = (/** @type {any} */ t, /** @type {any} */ s) => {
			const tipY = H.mul(cos(leanNow)), tipZ = H.mul(sin(leanNow)).add(bz), tipX = bx;
			const u = float(1).sub(t);
			const y = u.mul(t).mul(2).mul(H.mul(0.66)).add(t.mul(t).mul(tipY));
			const x = t.mul(t).mul(tipX), z = t.mul(t).mul(tipZ);
			const wv = width.mul(pow(float(1).sub(t), 0.75)).mul(0.5).mul(s);
			return vec3(x.add(wv), y, z);
		};
		const t = positionGeometry.y, s = positionGeometry.x;
		const gA = attribute('gA', 'vec4'), gF = attribute('gF', 'float');
		const morph = level === 2 ? float(0) : smoothstep(band * 0.7, band, dd);
		const pOwn = shape(t, s), pTo = mix(shape(gA.x, gA.y), shape(gA.z, gA.w), gF);
		const local = mix(pOwn, pTo, morph);
		const world = vec3(foot.x, groundY, foot.y).add(across.mul(local.x)).add(vec3(0, local.y, 0)).add(fwd.mul(local.z));

		/* its normal: the blade's face, rounded across it, turned to the ground's with distance */
		const dt = float(0.02);
		const tangent = normalize(shape(min(t.add(dt), 1), float(0)).sub(shape(max(t.sub(dt), 0), float(0))));
		const tW = normalize(across.mul(tangent.x).add(vec3(0, tangent.y, 0)).add(fwd.mul(tangent.z)));
		const face = normalize(cross(across, tW));
		const rounded = normalize(face.add(across.mul(s.mul(0.45))));
		const toGround = smoothstep(0, b2, dd);
		const normalW = normalize(mix(rounded, vec3(0, 1, 0), toGround));

		vN.assign(normalW);
		vV.assign(normalize(cameraPosition.sub(world)));
		vT.assign(t);
		vField.assign(fieldT(foot));
		vTone.assign(cShade.mul(0.5).add(shade.mul(0.5)));
		vDry.assign(dry.lessThan(P.dryShare).select(float(1), float(0)));
		vDense.assign(m.x);
		vD.assign(dd);
		return world.sub(vec3(origin.x, 0, origin.y));
	});

	const mat = new MeshStandardNodeMaterial({ side: THREE.DoubleSide });
	mat.name = `grass L${level}`;
	mat.positionNode = vertex();
	mat.normalNode = transformNormalToView(vN).mul(faceDirection);

	/* its colour: base to tip, the field, the clump, its own shade, dry blades; the roots darker where it is dense */
	const base = vec3(...new THREE.Color(P.base).toArray()), tipC = vec3(...new THREE.Color(P.tip).toArray()), dryC = vec3(...new THREE.Color(P.dry).toArray());
	const green = mix(base, tipC, pow(vT, 1.2));
	const col = mix(green, mix(green, dryC, smoothstep(0.2, 0.9, vT)), vDry)
		.mul(vField.sub(0.5).mul(0.5).add(1))
		.mul(vTone.sub(0.5).mul(0.3).add(1))
		.mul(mix(float(1).sub(vDense.mul(0.55)), float(1), smoothstep(0, 0.6, vT)));
	mat.colorNode = vec4(col, 1);
	mat.roughnessNode = mix(float(0.55), float(0.95), smoothstep(5, 40, vD));
	mat.metalnessNode = float(0);
	/* light through the tips, seen against the sun; a little wrap where the sun is low on it */
	const through = pow(clamp(dot(vV.negate(), U.sunDir), 0, 1), 3).mul(smoothstep(0.3, 1, vT)).mul(0.55);
	const wrap = clamp(dot(vN, U.sunDir).add(0.5).div(1.5), 0, 1).sub(clamp(dot(vN, U.sunDir), 0, 1)).mul(0.25);
	mat.emissiveNode = col.mul(U.sunColor).mul(through.add(wrap));
	return mat;
}
