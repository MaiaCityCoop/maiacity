	/** @param {number} x @param {number} y @param {number} z */
	key(x, y, z) {
		return ((x + 400) * 1e3 + (y + 400)) * 1e3 + (z + 400);
	}
	/** @param {THREE.Vector3} c @param {number} r */
	add(c, r) {
		const s = this.cell;
		const k = this.key(Math.floor(c.x / s), Math.floor(c.y / s), Math.floor(c.z / s));
		let list = this.cells.get(k);
		if (!list) this.cells.set(k, list = []);
		list.push({
			c: c.clone(),
			r
		});
	}
