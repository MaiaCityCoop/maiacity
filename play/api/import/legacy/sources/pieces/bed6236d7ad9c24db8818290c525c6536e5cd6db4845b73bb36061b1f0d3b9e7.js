	}
	/** room for `v` more vertices and `t` more indices, doubling as it fills @param {number} v @param {number} t */
	room(v, t) {
		/** @template {Float32Array | Uint32Array} A @param {A} a @param {number} need @returns {A} */
		const grow = (a, need) => {
			if (need <= a.length) return a;
			const b = new a.constructor(Math.max(need, a.length * 2));
			b.set(a);
			return b;
		};
		const n = this.verts + v;
		this.pos = grow(this.pos, n * 3);
		this.nor = grow(this.nor, n * 3);
		this.col = grow(this.col, n * 3);
		this.uv = grow(this.uv, n * 2);
		this.idx = grow(this.idx, this.tris + t);
	}
