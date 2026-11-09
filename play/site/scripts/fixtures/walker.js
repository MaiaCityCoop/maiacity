/*
 * WALKER — the render bench's own rigged build, for its smoke checks (`--motion`, `--crowd`, `--film`) where play's
 * pieces can't be fetched (no token): a stick figure of boxes, 1.7 m, on a skeleton named as people's are (hips,
 * legs, feet, toes), its clips a walk (a gait: the pose by how far it has come) and an idle. Not an asset of play's.
 */
const THREE = require('three');

const BONES = [
	['hips', null, [0, 0.95, 0]],
	['spine', 'hips', [0, 1.25, 0]],
	['head', 'spine', [0, 1.55, 0]],
	['leftUpLeg', 'hips', [0.1, 0.92, 0]],
	['leftLeg', 'leftUpLeg', [0.1, 0.5, 0]],
	['leftFoot', 'leftLeg', [0.1, 0.08, 0]],
	['leftToes', 'leftFoot', [0.1, 0.02, 0.14]],
	['rightUpLeg', 'hips', [-0.1, 0.92, 0]],
	['rightLeg', 'rightUpLeg', [-0.1, 0.5, 0]],
	['rightFoot', 'rightLeg', [-0.1, 0.08, 0]],
	['rightToes', 'rightFoot', [-0.1, 0.02, 0.14]]
];
// each box: the bone it hangs on, its centre and its size (m)
const BOXES = [
	['hips', [0, 1.0, 0], [0.32, 0.16, 0.18]],
	['spine', [0, 1.3, 0], [0.36, 0.42, 0.2]],
	['head', [0, 1.62, 0], [0.18, 0.22, 0.2]],
	['leftUpLeg', [0.1, 0.72, 0], [0.12, 0.4, 0.12]],
	['leftLeg', [0.1, 0.3, 0], [0.1, 0.42, 0.1]],
	['leftFoot', [0.1, 0.04, 0.05], [0.1, 0.08, 0.24]],
	['rightUpLeg', [-0.1, 0.72, 0], [0.12, 0.4, 0.12]],
	['rightLeg', [-0.1, 0.3, 0], [0.1, 0.42, 0.1]],
	['rightFoot', [-0.1, 0.04, 0.05], [0.1, 0.08, 0.24]]
];
const STRIDE = 1.4; // m a whole step cycle covers

function walker() {
	const index = Object.fromEntries(BONES.map(([n], i) => [n, i]));
	const bones = BONES.map(([name]) => Object.assign(new THREE.Bone(), { name }));
	BONES.forEach(([, parent, at], i) => {
		const p = parent ? BONES[index[parent]][2] : [0, 0, 0];
		bones[i].position.set(at[0] - p[0], at[1] - p[1], at[2] - p[2]);
		if (parent) bones[index[parent]].add(bones[i]);
	});
	const parts = BOXES.map(([bone, c, s]) => {
		const g = new THREE.BoxGeometry(...s).translate(...c);
		const n = g.attributes.position.count;
		g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, k) => (k % 4 ? 0 : index[bone])), 4));
		g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, k) => (k % 4 ? 0 : 1)), 4));
		return g;
	});
	const geometry = mergeAll(parts);
	const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#c9b79c', roughness: 0.8 }));
	mesh.name = 'walker';
	mesh.add(bones[0]);
	mesh.bind(new THREE.Skeleton(bones));
	const leg = (s) => [Math.sin(s) * 0.45, 0, 0];
	const knee = (s) => [Math.max(0, -Math.cos(s)) * 0.6, 0, 0];
	const clips = {
		// a gait: the pose by how far it has come (m.dist), so the feet keep to the ground at any speed
		walk: (t, m) => {
			const s = ((m?.dist ?? t * 1.4) / STRIDE) * 2 * Math.PI;
			return {
				leftUpLeg: leg(s), leftLeg: knee(s), rightUpLeg: leg(s + Math.PI), rightLeg: knee(s + Math.PI),
				hips: [0, Math.sin(s) * 0.08, 0], root: [0, Math.abs(Math.cos(s)) * 0.02, 0]
			};
		},
		idle: (t) => ({ spine: [Math.sin(t * 1.3) * 0.02, 0, 0], head: [0, Math.sin(t * 0.5) * 0.1, 0] })
	};
	return { rig: { object: mesh, names: BONES.map(([n]) => n) }, clips, gears: { walk: 1.4 }, first: 'idle' };
}

function mergeAll(list) {
	const out = new THREE.BufferGeometry();
	for (const k of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
		const A = list.map((g) => g.attributes[k]);
		const arr = new A[0].array.constructor(A.reduce((s, a) => s + a.array.length, 0));
		let o = 0;
		for (const a of A) arr.set(a.array, o), (o += a.array.length);
		out.setAttribute(k, new THREE.BufferAttribute(arr, A[0].itemSize));
	}
	let base = 0;
	const idx = [];
	for (const g of list) {
		for (const i of g.index.array) idx.push(i + base);
		base += g.attributes.position.count;
	}
	out.setIndex(idx);
	return out;
}

module.exports.recipe = function (id, v) {
	return { meta: { group: 'actors', id, version: v, label: 'Walker (the bench\'s fixture)', params: [] }, build: walker };
};
