// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE FAR WOODS' SHADOW (intent 3a8b135a): past the sun's cascades (its shadow camera's far) no tree casts a shadow, and
 * a far wood stood on a bright, even floor. The far pictures' cards (../../assets/render/impostors.js) are laid each
 * frame they change into a top-down map round the eye, every crown a soft disc thrown along the sun by its height, and
 * the ground (./ground.js `groundNodes`) is darkened where the map is, from the cascades' end on: far woods dappled.
 */
import * as THREE from 'three';
import { cameraPosition, distance, positionWorld, smoothstep, step, texture, uniform, vec2 } from 'three/tsl';

/** the map's texels a side, the metres it covers a side, and how much light a full crown takes */
export const CANOPY = { texels: 256, side: 3000, dark: 0.45 };

const data = new Uint8Array(CANOPY.texels * CANOPY.texels);
const map = new THREE.DataTexture(data, CANOPY.texels, CANOPY.texels, THREE.RedFormat, THREE.UnsignedByteType);
map.magFilter = map.minFilter = THREE.LinearFilter;
map.needsUpdate = true;
/** the map's middle (x, z), its side, and where it begins to darken (the cascades' end; 1e9 none) */
const at = uniform(new THREE.Vector4(0, 0, CANOPY.side, 1e9));

/** how much of the sun the ground keeps at the world point it is drawn at (1 all of it) */
export const canopyShade = (() => {
	const q = positionWorld.xz.sub(at.xy).div(at.z).add(0.5);
	const inside = step(0, q.x).mul(step(q.x, 1)).mul(step(0, q.y)).mul(step(q.y, 1));
	const far = smoothstep(at.w, at.w.mul(1.15), distance(positionWorld.xz, cameraPosition.xz));
	return texture(map, vec2(q.x, q.y)).r.mul(inside).mul(far).mul(CANOPY.dark).oneMinus();
})();

const suns = new WeakMap();
/** the sun lighting the scene `o` is in (its cascades' far, its direction), found once */
function sunOf(o) {
	while (o.parent) o = o.parent;
	if (!suns.has(o)) {
		let sun = null;
		o.traverse((x) => (sun ??= (x.isSunLight || x.isDirectionalLight) && x.castShadow ? x : null));
		suns.set(o, sun);
	}
	return suns.get(o);
}

const dir = new THREE.Vector3();
/** when each renderer's cards were last laid */
const lasts = new WeakMap();
const scratch = new Uint8Array(data.length);

/**
 * The far pictures' cards (`group`, the pages of ./impostors.js, their `aAt` and `aCard`) laid into the map round the
 * eye at `eye`: when the eye has moved 30 m, the cards drawn changed in number or 2 s have gone. A renderer with no card
 * past the cascades (a dome's inside) leaves the map as the one that has laid it. At night, none.
 * @param {THREE.Object3D} group @param {THREE.Vector3} eye @param {number} [now]
 */
export function layCanopy(group, eye, now = performance.now()) {
	const sun = sunOf(group);
	const n = group.children.reduce((a, m) => a + (m.visible ? m.geometry.instanceCount : 0), 0);
	if (!sun?.visible) return (at.value.w = 1e9), false;
	const last = lasts.get(group);
	if (last && Math.hypot(eye.x - last.x, eye.z - last.z) < 30 && n === last.n && now - last.t < 2000) return false;
	lasts.set(group, { x: eye.x, z: eye.z, n, t: now });
	const T = CANOPY.texels, S = CANOPY.side, from = sun.shadow?.camera?.far ?? 1e9;
	let laid = 0;
	scratch.fill(0);
	dir.copy(sun.position);
	if (sun.target) dir.sub(sun.target.position);
	dir.normalize();
	const sx = -dir.x / Math.max(dir.y, 0.15), sz = -dir.z / Math.max(dir.y, 0.15);
	for (const m of group.children) {
		if (!m.visible) continue;
		const p = m.geometry.attributes.aAt?.array, c = m.geometry.attributes.aCard?.array;
		for (let i = 0; p && i < m.geometry.instanceCount; i++) {
			const size = c[i * 4], h = size / 2, x = p[i * 3] + sx * h, z = p[i * 3 + 2] + sz * h;
			// only past the cascades: nearer, the trees' own shadows fall
			if (Math.hypot(x - eye.x, z - eye.z) < from * 0.9) continue;
			laid++;
			const u = ((x - eye.x) / S + 0.5) * T, v = ((z - eye.z) / S + 0.5) * T, r = Math.max(0.5, (size * 0.35 * T) / S);
			for (let j = Math.max(1, Math.floor(v - r)); j <= Math.min(T - 2, Math.ceil(v + r)); j++)
				for (let k = Math.max(1, Math.floor(u - r)); k <= Math.min(T - 2, Math.ceil(u + r)); k++) {
					const f = 1 - Math.hypot(k + 0.5 - u, j + 0.5 - v) / (r + 0.5);
					if (f > 0) scratch[j * T + k] = Math.min(255, scratch[j * T + k] + f * 200);
				}
		}
	}
	if (!laid) return false;
	data.set(scratch);
	at.value.set(eye.x, eye.z, S, from);
	map.needsUpdate = true;
	return true;
}
