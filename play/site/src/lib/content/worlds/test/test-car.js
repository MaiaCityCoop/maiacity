/*
 * TEST CAR — a stand-in for the world tests and the dev harness (play/SPEC.md §4.11), never proposed: a plain box car
 * at a small car's real size (4.2 × 1.75 × 1.45 m), front toward +z, root on y 0, its lights named as the world
 * contract names them and modelled in their OFF look. `kind` 1 is an ambulance: taller, white, with its beacons.
 */
const THREE = require('three');

const PARAMS = [{ id: 'kind', label: 'Kind', type: 'integer', min: 0, max: 1, value: 0, names: ['Car', 'Ambulance'] }];

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });

function box(name, w, h, d, m, x, y, z) {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
	mesh.name = name;
	mesh.position.set(x, y, z);
	return mesh;
}

function build(kind) {
	const amb = kind === 1;
	const L = amb ? 5.6 : 4.2, W = amb ? 2.0 : 1.75, H = amb ? 2.5 : 1.45;
	const root = new THREE.Group();
	const paint = mat(amb ? '#e8e8e2' : '#6d7a86', { roughness: 0.4, metalness: 0.3 });
	const glass = mat('#1d242b', { roughness: 0.1 });
	const tyre = mat('#1a1a1a', { roughness: 0.9 });
	root.add(box('body', W, 0.7, L, paint, 0, 0.3 + 0.35, 0));
	root.add(box('cabin', W - 0.1, H - 1.05, amb ? L - 1.2 : 2.2, amb ? paint : glass, 0, 1.0 + (H - 1.05) / 2, amb ? -0.5 : -0.2));
	for (const [x, z] of [[-W / 2, L / 2 - 0.8], [W / 2, L / 2 - 0.8], [-W / 2, -L / 2 + 0.8], [W / 2, -L / 2 + 0.8]]) {
		const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16).rotateZ(Math.PI / 2), tyre);
		w.name = 'wheel';
		w.position.set(x, 0.32, z);
		root.add(w);
	}
	// the lights, dark lenses: the page draws them lit
	const lens = (c) => mat(c, { roughness: 0.2 });
	for (const s of [-1, 1]) {
		root.add(box('light:head', 0.3, 0.12, 0.04, lens('#c9c9c0'), s * (W / 2 - 0.25), 0.8, L / 2 + 0.01));
		root.add(box('light:tail', 0.25, 0.12, 0.04, lens('#5a1414'), s * (W / 2 - 0.2), 0.85, -L / 2 - 0.01));
		root.add(box('light:brake', 0.25, 0.06, 0.04, lens('#5a1414'), s * (W / 2 - 0.2), 0.97, -L / 2 - 0.01));
		root.add(box(s < 0 ? 'light:indicator-l' : 'light:indicator-r', 0.1, 0.1, 0.04, lens('#5a3a10'), s * (W / 2 - 0.05), 0.8, L / 2 + 0.01));
		root.add(box(s < 0 ? 'light:indicator-l' : 'light:indicator-r', 0.1, 0.1, 0.04, lens('#5a3a10'), s * (W / 2 - 0.05), 0.85, -L / 2 - 0.01));
	}
	if (amb) {
		root.add(box('light:beacon-blue', 0.5, 0.15, 0.2, lens('#14205a'), -0.45, H + 0.08, L / 2 - 1.4));
		root.add(box('light:beacon-red', 0.5, 0.15, 0.2, lens('#5a1414'), 0.45, H + 0.08, L / 2 - 1.4));
	}
	return root;
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'test-car' || variant) throw new Error(`no asset things/${id}@${v} in this file`);
	return { meta: { group: 'things', id: 'test-car', version: v, label: 'Test car', note: 'A stand-in car for the world tests.', params: PARAMS }, build };
};
