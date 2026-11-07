*/
var Slivers = class {
	constructor() {
		/** @type {number[]} */
		this.pos = [];
		/** @type {number[]} */
		this.nor = [];
		/** @type {number[]} */
		this.col = [];
	}
	/**
	* @param {THREE.Vector3} at @param {THREE.Vector3} dir @param {number} length @param {number} width its half-width
	* @param {THREE.ColorRepresentation} colour @param {number} [droop] how far its tip bends down, in parts of its length
	* @param {boolean} [needle] a needle: one slim triangle, not a diamond
	* @param {THREE.Vector3} [across] which way its width lies (level, across its direction, if not given)
	*/
	add(at, dir, length, width, colour, droop = 0, needle = false, across) {
		const dl = Math.hypot(dir.x, dir.y, dir.z) || 1;
		const dx = dir.x / dl, dy = dir.y / dl, dz = dir.z / dl;
		let sx = -dz, sy = 0, sz = dx;
		if (across) sx = across.x, sy = across.y, sz = across.z;
		const sl = Math.hypot(sx, sy, sz);
		if (sl < 1e-6) sx = 1, sy = 0, sz = 0;
		else sx /= sl, sy /= sl, sz /= sl;
		const m = needle ? 0 : .4;
		const mx = at.x + dx * length * m, my = at.y + dy * length * m, mz = at.z + dz * length * m;
		const tip = [
			at.x + dx * length,
			at.y + dy * length - droop * length,
			at.z + dz * length
		];
		const l = [
			mx + sx * width,
			my + sy * width,
			mz + sz * width
		], r = [
			mx - sx * width,
			my - sy * width,
			mz - sz * width
		];
		const base = [
			at.x,
			at.y,
			at.z
		];
		const c = tint(colour);
		for (const [a, b, e] of needle ? [[
			l,
			tip,
			r
		]] : [[
			base,
			l,
			tip
		], [
			base,
			tip,
			r
		]]) {
			const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = e[0] - a[0], vy = e[1] - a[1], vz = e[2] - a[2];
			let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
			const nl = Math.hypot(nx, ny, nz) || 1;
			nx /= nl, ny /= nl, nz /= nl;
			this.pos.push(...a, ...b, ...e, ...a, ...e, ...b);
			for (let k = 0; k < 6; k++) {
				const f = k < 3 ? 1 : -1;
				this.nor.push(nx * f, ny * f, nz * f);
				this.col.push(c.r, c.g, c.b);
			}
		}
	}
	/** into the bag, as one piece of the body */
	into(bag) {
		if (!this.pos.length) return;
//#piece cd0c5b3e4e2a2fc878c692a1b3cf33daa4d975d7c6e78b18e646c5a883586663
		geo.setAttribute("normal", new three.Float32BufferAttribute(this.nor, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(new Array(n * 2).fill(0), 2));
		geo.setAttribute("color", new three.Float32BufferAttribute(this.col, 3));
		geo.setIndex([...Array(n).keys()]);
		bag.add("body", geo);
	}
};
