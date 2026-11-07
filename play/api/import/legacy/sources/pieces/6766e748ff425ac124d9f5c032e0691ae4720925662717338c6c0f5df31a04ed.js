*/
var Grid = class {
	constructor(cell = .2) {
		this.cell = cell;
		/** @type {Grid | null} the thick wood, kept apart: a fruit keeps clear of it, a leaf grows out of it */
		this.wood = null;
		/** @type {Map<number, { c: THREE.Vector3, r: number }[]>} */
		this.cells = /* @__PURE__ */ new Map();
