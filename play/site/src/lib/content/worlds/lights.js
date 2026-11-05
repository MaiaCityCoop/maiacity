// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD'S LIGHTS — the lit look of every guest's named lights, drawn by the page over the dark lenses the asset was
 * modelled with (./contract.js): a car's head, tail, brake and indicator lights, an emergency vehicle's beacons, a
 * street lamp, a signal's lamps. A guest is one copy among hundreds, all instances of one drawing (../assets/render),
 * so its own materials are never touched: for each kind, each of its lights is one instanced drawing of that light's
 * own shape, bright and unlit by the scene, and a glow round it (one cloud of points for the whole world), and every
 * frame each copy whose state says that light is on is one more instance of it, where its node stands.
 *
 * The light's shape is read off the kind's finest build (loaded through the renderer, so from this device's cache or
 * the same boxes): its meshes named `light:*` and `lamp:*`, each in the guest's own frame. Head and tail lights,
 * street lamps: lit by the mood (lamps=1) unless the guest says otherwise; the rest only by their states.
 */
import * as THREE from 'three';
import { lightOf, litNow, statesOf } from './contract.js';

/** each light's lit colour (sRGB) and the glow's size round it (m) */
export const LOOK = {
	head: ['#fff4dc', 1.4],
	tail: ['#d0160c', 0.6],
	brake: ['#ff2414', 1.0],
	'indicator-l': ['#ffa21a', 0.7],
	'indicator-r': ['#ffa21a', 0.7],
	'beacon-blue': ['#2f5cff', 2.6],
	'beacon-red': ['#ff1d1d', 2.6],
	lamp: ['#ffb85c', 5.0],
	red: ['#ff2a18', 1.3],
	amber: ['#ffae00', 1.3],
	green: ['#22ff88', 1.3]
};

/** the most glows drawn at once */
const GLOWS = 16384;

const glowMaterial = () =>
	new THREE.ShaderMaterial({
		uniforms: { uScale: { value: 500 } },
		vertexShader: /* glsl */ `
			attribute float size;
			attribute vec3 tint;
			varying vec3 vTint;
			uniform float uScale;
			void main() {
				vTint = tint;
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				gl_Position = projectionMatrix * mv;
				gl_PointSize = clamp(size * uScale / max(0.1, -mv.z), 1.5, 256.0);
			}`,
		fragmentShader: /* glsl */ `
			varying vec3 vTint;
			void main() {
				float r = length(gl_PointCoord - 0.5) * 2.0;
				float a = pow(max(0.0, 1.0 - r), 2.2);
				gl_FragColor = vec4(vTint * a, a);
			}`,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});

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
	const glowGeo = new THREE.BufferGeometry();
	const gPos = new Float32Array(GLOWS * 3), gTint = new Float32Array(GLOWS * 3), gSize = new Float32Array(GLOWS);
	glowGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage));
	glowGeo.setAttribute('tint', new THREE.BufferAttribute(gTint, 3).setUsage(THREE.DynamicDrawUsage));
	glowGeo.setAttribute('size', new THREE.BufferAttribute(gSize, 1).setUsage(THREE.DynamicDrawUsage));
	const glowMat = glowMaterial();
	const glows = new THREE.Points(glowGeo, glowMat);
	glows.frustumCulled = false;
	glows.renderOrder = 10;
	group.add(glows);
	const stats = { kinds: 0, lit: 0, glows: 0 };
	const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _c = new THREE.Color();

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
				root.traverse((m) => {
					if (!m.isMesh) return;
					const L = lightOf(m.name);
					if (!L) return;
					// a signal's lamps, head by head: its i-th lamp of a colour is head i's
					const head = L.lamp ? (heads.set(L.lamp, (heads.get(L.lamp) ?? -1) + 1), heads.get(L.lamp)) : -1;
					const key = L.lamp ? `${L.lamp}:${head}` : L.light;
					const g = m.geometry.clone().applyMatrix4(_m.multiplyMatrices(inv, m.matrixWorld));
					if (!byKey.has(key)) byKey.set(key, { ...L, head, geos: [] });
					byKey.get(key).geos.push(g);
				});
				const parts = [];
				for (const p of byKey.values()) {
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
					parts.push({ light: p.light, state: p.state, lamp: p.lamp, head: p.head, mesh, centre, tint: new THREE.Color(colour), size });
				}
				kinds.set(kind.key, { parts });
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
			glowMat.uniforms.uScale.value = (o.renderer.domElement.height || 600) / (2 * Math.tan(THREE.MathUtils.degToRad(o.camera.fov / 2)));
			const counts = new Map();
			let ng = 0, lit = 0;
			for (let gi = 0; gi < guests.length; gi++) {
				const g = guests[gi];
				if (g.away) continue;
				let k = kinds.get(g.kind.key);
				if (k === undefined) read(g.kind);
				if (!k?.parts.length) continue;
				statesOf(g.node, states);
				const phase = ((gi * 0.618034) % 1) * 0.5;
				for (const p of k.parts) {
					if (!litNow(p, states, mood, t, phase)) continue;
					const n = counts.get(p.mesh) ?? 0;
					room(p.mesh, n + 1);
					p.mesh.instanceMatrix.array.set(g.node.matrixWorld.elements, n * 16);
					counts.set(p.mesh, n + 1);
					lit++;
					if (ng < GLOWS) {
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
					p.mesh.instanceMatrix.needsUpdate = true;
				}
			glowGeo.setDrawRange(0, ng);
			for (const a of Object.values(glowGeo.attributes)) a.needsUpdate = true;
			stats.lit = lit;
			stats.glows = ng;
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
