/*
 * TEST SIGNAL — a stand-in traffic signal for the world tests (play/SPEC.md §4.11), never proposed: a 3.2 m pole and
 * one head of three 0.2 m lamps facing +z, each named `lamp:red`, `lamp:amber`, `lamp:green`, dark until the page lights it.
 */
const THREE = require('three');

const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5 });

function build() {
	const root = new THREE.Group();
	const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 12), mat('#4a4d4f'));
	pole.name = 'pole';
	pole.position.y = 1.6;
	root.add(pole);
	const head = new THREE.Group();
	head.name = 'head';
	head.position.set(0, 3.5, 0);
	const housing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.25), mat('#222'));
	housing.name = 'housing';
	head.add(housing);
	[['lamp:red', '#3a0d0d', 0.3], ['lamp:amber', '#3a2a0a', 0], ['lamp:green', '#0b2e15', -0.3]].forEach(([name, c, y]) => {
		const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20).rotateX(Math.PI / 2), mat(c));
		lamp.name = name;
		lamp.position.set(0, y, 0.135);
		head.add(lamp);
	});
	root.add(head);
	return root;
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'test-signal' || variant) throw new Error(`no asset things/${id}@${v} in this file`);
	return { meta: { group: 'things', id: 'test-signal', version: v, label: 'Test signal', note: 'A stand-in traffic signal for the world tests.', params: [] }, build };
};
