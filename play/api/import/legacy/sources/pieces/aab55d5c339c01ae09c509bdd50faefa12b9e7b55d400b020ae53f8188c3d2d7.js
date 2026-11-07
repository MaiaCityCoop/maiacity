/** a seeded random number, the same every time @param {number} seed */
function rng(seed) {
//#piece ec0831d17396699709084b348f5513bfa4a3a1b804b6abacb804c08a778fabdc
	};
}

//#endregion
//#region src/lib/biomes/cover.js
/** the cover's one material: its colours in its vertices, both faces of a blade or a leaf */
let coverMat = null;
const material = () => coverMat ??= new three.MeshStandardMaterial({
	vertexColors: true,
	roughness: .88,
	side: three.DoubleSide
});
/** a geometry's vertices all coloured so @param {THREE.BufferGeometry} g @param {THREE.Color | ((p: THREE.Vector3) => THREE.Color)} c */
function paint(g, c) {
	const geo = g.index ? g.toNonIndexed() : g;
	for (const k of Object.keys(geo.attributes)) if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
	if (!geo.attributes.normal) geo.computeVertexNormals();
	const pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3), v = new three.Vector3();
	for (let i = 0; i < n; i++) {
		const cc = typeof c === "function" ? c(v.fromBufferAttribute(pos, i)) : c;
		col[i * 3] = cc.r;
		col[i * 3 + 1] = cc.g;
		col[i * 3 + 2] = cc.b;
