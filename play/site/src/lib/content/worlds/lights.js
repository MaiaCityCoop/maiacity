// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD'S LIGHTS — the lit look of every guest's named lights, drawn by the page over the dark lenses the asset was
 * modelled with (./contract.js): a car's head, tail, brake and indicator lights, an emergency vehicle's beacons, a
 * street lamp, a signal's lamps. A guest is one copy among hundreds, all instances of one drawing (../assets/render),
 * so its own materials are never touched: for each kind, each of its lights is one instanced drawing of that light's
 * own shape, bright and unlit by the scene, and a glow round it (one instanced drawing of sprites for the whole world), and every
 * frame each copy whose state says that light is on is one more instance of it, where its node stands.
 *
 * The light's shape is read off the kind's finest build (loaded through the renderer, so from this device's cache or
 * the same boxes): its meshes named `light:*` and `lamp:*`, each in the guest's own frame. Head and tail lights,
 * street lamps: lit by the mood (lamps=1) unless the guest says otherwise; the rest only by their states.
 */
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { attribute, cameraProjectionMatrix, clamp, float, length, max, modelViewMatrix, positionLocal, pow, uniform, uv, vec4 } from 'three/tsl';
import { WINDOW_SETS, lightOf, litNow, statesOf } from './contract.js';

/** each light's lit colour (sRGB) and the glow's size round it (m) */
export const LOOK = {
	head: ['#fff4dc', 1.4],
	tail: ['#d0160c', 0.6],
	brake: ['#ff2414', 1.0],
	'indicator-l': ['#ffa21a', 0.7],
	'indicator-r': ['#ffa21a', 0.7],
	'beacon-blue': ['#2f5cff', 2.6],
	'beacon-red': ['#ff1d1d', 2.6],
	'beacon-amber': ['#ffa010', 2.4],
	reverse: ['#f4f6ff', 0.8],
	window: ['#ffcf8a', 0],
	sign: ['#f4f7ff', 0],
	lamp: ['#ffb85c', 5.0],
	red: ['#ff2a18', 1.3],
	amber: ['#ffae00', 1.3],
	green: ['#22ff88', 1.3]
};

/** the most glows drawn at once */
const GLOWS = 16384;
/** how near (m) a guest's light is drawn as its lit face too (beyond it, its glow alone: one drawing for every light of
 *  the world); a building's windows are faces at any distance (a lit tower is its windows) */
export const FACES_NEAR = 150;

/**
 * The glows, in TSL: each an instanced sprite (a quad turned to the eye) at `glowAt`, `size` metres across seen as so
 * many pixels at its distance (1.5 to 256), its tint fading from its middle to its rim; added onto the picture, written
 * as it is (../render/tsl.js `raw`), as the cloud of points it was drew it. `pxScale`: the screen's pixels per metre
 * at a metre's distance.
 */
const glowMaterial = (pxScale) => {
	const m = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
	m.userData.raw = true;
	const mv = modelViewMatrix.mul(vec4(attribute('glowAt', 'vec3'), 1));
	const far = max(0.1, mv.z.negate());
	const px = clamp(attribute('size', 'float').mul(pxScale).div(far), 1.5, 256);
	m.vertexNode = cameraProjectionMatrix.mul(vec4(mv.xy.add(positionLocal.xy.mul(px).mul(far).div(pxScale)), mv.z, 1));
	const a = pow(max(0, float(1).sub(length(uv().sub(0.5)).mul(2))), 2.2);
	m.colorNode = attribute('tint', 'vec3').mul(a);
	m.opacityNode = a;
	return m;
};

/**
 * The lights of a world's guests, in `scene`. `update(guests, mood, t)` each frame (guests as ../assets/plantings.js
 * `guests()` lists them), `dispose()`.
 * @param {{ scene: THREE.Object3D, assets: () => any, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }} o
 */
export function createLights(o) {
	const group = new THREE.Group();
	group.name = 'world lights';
	o.scene.add(group);
	/** each kind's lights once read: { parts: [{ light|lamp, head, mesh, centre, glow }] } (null while it loads) */
	const kinds = new Map();
	const states = { on: new Map(), heads: new Map() };
	const glowGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
	const gPos = new Float32Array(GLOWS * 3), gTint = new Float32Array(GLOWS * 3), gSize = new Float32Array(GLOWS);
	glowGeo.setAttribute('glowAt', new THREE.InstancedBufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage));
	glowGeo.setAttribute('tint', new THREE.InstancedBufferAttribute(gTint, 3).setUsage(THREE.DynamicDrawUsage));
	glowGeo.setAttribute('size', new THREE.InstancedBufferAttribute(gSize, 1).setUsage(THREE.DynamicDrawUsage));
	glowGeo.instanceCount = 0;
	const pxScale = uniform(500);
	const glowMat = glowMaterial(pxScale);
	const glows = new THREE.Mesh(glowGeo, glowMat);
	glows.frustumCulled = false;
	glows.renderOrder = 10;
	group.add(glows);
	/** kinds read, lights lit, glows drawn, and the lit-face drawings made this frame */
	const stats = { kinds: 0, lit: 0, glows: 0, faces: 0 };
	const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _c = new THREE.Color();
	const frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _s = new THREE.Sphere(new THREE.Vector3(), 25);

	/** a kind's lights read off its finest build */
	function read(kind) {
		kinds.set(kind.key, null);
		const a = o.assets();
		if (!a) return void kinds.delete(kind.key);
		a.load(kind.names[0])
			.then((got) => {
				const root = got.obj;
				root.updateMatrixWorld(true);
				const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
				const byKey = new Map();
				const heads = new Map();
				let windows = 0;
				// each node named for a light (a mesh, or a group: every mesh under it is that light), the outermost only
				const named = (o) => {
					const L = lightOf(o.name);
					if (!L) return void o.children.forEach(named);
					// a signal's lamps, head by head: its i-th lamp of a colour is head i's; a building's windows in sets
					const head = L.lamp ? (heads.set(L.lamp, (heads.get(L.lamp) ?? -1) + 1), heads.get(L.lamp)) : -1;
					const set = L.light === 'window' ? windows++ % WINDOW_SETS : -1;
					const key = L.lamp ? `${L.lamp}:${head}` : set >= 0 ? `window:${set}` : L.light;
					if (!byKey.has(key)) byKey.set(key, { ...L, head, set, geos: [] });
					o.traverse((m) => {
						if (m.isMesh && m.geometry?.attributes?.position) byKey.get(key).geos.push(m.geometry.clone().applyMatrix4(_m.multiplyMatrices(inv, m.matrixWorld)));
					});
				};
				named(root);
				const parts = [];
				for (const p of byKey.values()) {
					if (!p.geos.length) continue;
					const geo = merge(p.geos);
					geo.computeBoundingBox();
					const centre = geo.boundingBox.getCenter(new THREE.Vector3());
					const [colour, size] = LOOK[p.lamp ?? p.light];
					const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(1.6), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fog: false });
					const mesh = new THREE.InstancedMesh(geo, mat, 16);
					mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
					mesh.count = 0;
					mesh.frustumCulled = false;
					mesh.name = `lit ${p.lamp ?? p.light} · ${kind.label}`;
					group.add(mesh);
					parts.push({ light: p.light, state: p.state, lamp: p.lamp, head: p.head, set: p.set, mesh, centre, tint: new THREE.Color(colour), size });
				}
				// how big it is round its root (a car's few metres, a tower's tens): the ball its lights are seen in
				const ball = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
				kinds.set(kind.key, { parts, radius: Math.max(5, ball.center.length() + ball.radius) });
				stats.kinds++;
			})
			.catch(() => kinds.set(kind.key, { parts: [] }));
	}

	/** room in a drawing for n instances */
	function room(mesh, n) {
		if (mesh.instanceMatrix.count >= n) return;
		const cap = Math.max(n, mesh.instanceMatrix.count * 2);
		const im = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16).setUsage(THREE.DynamicDrawUsage);
		mesh.instanceMatrix = im;
	}

	return {
		group,
		stats,
		/** every lit light where its guest stands now */
		update(guests, mood, t) {
			pxScale.value = (o.renderer.domElement.height || 600) / (2 * Math.tan(THREE.MathUtils.degToRad(o.camera.fov / 2)));
			const counts = new Map();
			let ng = 0, lit = 0;
			const cam = o.camera.position;
			frustum.setFromProjectionMatrix(_pv.multiplyMatrices(o.camera.projectionMatrix, o.camera.matrixWorldInverse));
			for (let gi = 0; gi < guests.length; gi++) {
				const g = guests[gi];
				if (g.away) continue;
				let k = kinds.get(g.kind.key);
				if (k === undefined) read(g.kind);
				if (!k?.parts.length) continue;
				const e = g.node.matrixWorld.elements;
				_s.center.set(e[12], e[13], e[14]);
				// out of view: neither its faces nor its glows are seen (a building's windows: its sphere is its own size)
				if (!frustum.intersectsSphere(_s.set(_s.center, k.radius))) continue;
				const near = _s.center.distanceTo(cam) < FACES_NEAR + k.radius;
				statesOf(g.node, states);
				const phase = ((gi * 0.618034) % 1) * 0.5;
				for (const p of k.parts) {
					if (!litNow(p, states, mood, t, phase)) continue;
					lit++;
					if (near || p.light === 'window') {
						const n = counts.get(p.mesh) ?? 0;
						room(p.mesh, n + 1);
						p.mesh.instanceMatrix.array.set(e, n * 16);
						counts.set(p.mesh, n + 1);
					}
					if (p.size > 0 && ng < GLOWS) {
						_v.copy(p.centre).applyMatrix4(g.node.matrixWorld);
						gPos[ng * 3] = _v.x;
						gPos[ng * 3 + 1] = _v.y;
						gPos[ng * 3 + 2] = _v.z;
						_c.copy(p.tint).multiplyScalar(0.55);
						gTint[ng * 3] = _c.r;
						gTint[ng * 3 + 1] = _c.g;
						gTint[ng * 3 + 2] = _c.b;
						gSize[ng] = p.size;
						ng++;
					}
				}
			}
			for (const k of kinds.values())
				for (const p of k?.parts ?? []) {
					p.mesh.count = counts.get(p.mesh) ?? 0;
					// a light no copy has lit is no drawing at all
					p.mesh.visible = p.mesh.count > 0;
					if (p.mesh.visible) p.mesh.instanceMatrix.needsUpdate = true;
				}
			glowGeo.instanceCount = ng;
			glows.visible = ng > 0;
			for (const k of ['glowAt', 'tint', 'size']) {
				const a = glowGeo.attributes[k];
				a.clearUpdateRanges();
				a.addUpdateRange(0, ng * a.itemSize);
				a.needsUpdate = true;
			}
			stats.lit = lit;
			stats.glows = ng;
			stats.faces = [...counts.keys()].length;
		},
		dispose() {
			group.removeFromParent();
			for (const k of kinds.values())
				for (const p of k?.parts ?? []) {
					p.mesh.geometry.dispose();
					p.mesh.material.dispose();
					p.mesh.dispose();
				}
			glowGeo.dispose();
			glowMat.dispose();
			kinds.clear();
		}
	};
}

/** geometries of one light, joined into one (their positions only: a light is drawn flat and bright) */
function merge(geos) {
	const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
	const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
	const pos = new Float32Array(n * 3);
	let at = 0;
	for (const g of parts) {
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++, at += 3) (pos[at] = p.getX(i)), (pos[at + 1] = p.getY(i)), (pos[at + 2] = p.getZ(i));
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	return out;
}
