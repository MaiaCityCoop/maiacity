*/
function template(parts) {
	const g = (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(parts);
	for (const p of parts) p.dispose();
	return g;
}
/**
* All a tree's leaves, gathered straight into one geometry as they are stamped: the template set at `m` and coloured,
* thousands of times, without a geometry each. Thinned as the bag thins its sheets (DETAIL.thin): one leaf in so many
* kept, grown bigger from its stalk.
*/
var Foliage = class {
	constructor() {
		this.verts = 0;
		this.tris = 0;
		this.pos = /* @__PURE__ */ new Float32Array(12288);
		this.nor = /* @__PURE__ */ new Float32Array(12288);
		this.uv = /* @__PURE__ */ new Float32Array(8192);
		this.col = /* @__PURE__ */ new Float32Array(12288);
		this.idx = /* @__PURE__ */ new Uint32Array(12288);
		this.kept = 0;
