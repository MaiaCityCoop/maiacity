/* ================================================================================================================
 * 8. RECIPE
 * ================================================================================================================ */

const DOME = {
	id: 'forest-dome',
	label: 'Forest dome · 80 m',
	note:
		'An 80 m geodesic dome whose south three quarters are a food forest under glass and whose north quarter holds the rooms: four storeys stepping back from the shell as indoor terraces over the forest, under a closed bioceramic shell with triangular windows. Meandering gravel paths, a brook from a spring at the terraces’ foot to a pond by the south door, the plants of the library in seven layers; outside, a one-storey limestone arcade round the glass. Walk in by the south door.'
};

/** the whole dome, built: each part into its bags, merged by material and chunk, the plants marked, the lamps lit */
function buildDome() {
	const dome = newDome();
	const t = {};
	const step = (name, fn) => {
		if (typeof fn !== 'function') return;
		const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
		fn(dome);
		if (t0) t[name] = Math.round(performance.now() - t0);
	};
	step('shell', typeof shellPart === 'undefined' ? null : shellPart);
	step('outside', typeof outsidePart === 'undefined' ? null : outsidePart);
	step('building', typeof buildingPart === 'undefined' ? null : buildingPart);
	step('furnishing', typeof furnishPart === 'undefined' ? null : furnishPart);
	step('ground', typeof groundPart === 'undefined' ? null : groundPart);
	const root = dome.root;
	root.name = DOME.id;
	// glass and water cast no shadow: the sun comes through them
	const noShadow = (m) => !['glass', 'water'].includes(m);
	for (const bag of Object.values(dome.bags)) root.add(bag.build({ castShadow: noShadow }));
	// the forest's floor named for its biome: the page lays the biome's surfaces and cover on these meshes
	root.traverse((o) => {
		if (o.isMesh && /^ground:soil(#c)?:/.test(o.name)) o.name = `biome:${BIOME.hash}`;
	});
	const plants = new THREE.Group();
	plants.name = 'plants';
	for (const p of dome.plants) plants.add(p.node);
	root.add(plants);
	const things = new THREE.Group();
	things.name = 'things';
	for (const t of dome.things) things.add(t.node);
	root.add(things);
	const lamps = new THREE.Group();
	lamps.name = 'lamps';
	for (const l of dome.lamps) lamps.add(l);
	root.add(lamps);
	// walked in from the south door, looking north up the path to the terraces
	const [sx, sz] = polar(R + 9, Math.PI);
	// (the walker's yaw 0 looks along −z: π looks north)
	root.userData.walk = { x: sx, z: sz, yaw: Math.PI, lamps: dome.walkLamps.slice(0, 8) };
	root.userData.note = DOME.note;
	root.userData.timings = t;
	return root;
}

module.exports.recipe = function (id, v, variant) {
	if (id !== DOME.id || variant) throw new Error(`no asset buildings/${id}@${v}${variant ? `:${variant}` : ''} in this file`);
	return {
		meta: { group: 'buildings', id: DOME.id, version: v, label: DOME.label, note: DOME.note },
		build: () => buildDome()
	};
};
