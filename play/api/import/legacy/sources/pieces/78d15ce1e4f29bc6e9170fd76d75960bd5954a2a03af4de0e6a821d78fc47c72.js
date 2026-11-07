		]
	}, (put) => {
		const yb = -Lh - 2;
		put(box(0, -Lh - 1, 58, 170, 2, 46, 1), BLACK$1);
		/** a hole: its lining ring a little wider, its dark inside over it @param {number} x @param {number} z @param {number} r @param {string} ring */
		const hole = (x, z, r, ring) => {
			put(cyl([
				x,
				yb,
				z
			], [
				x,
				yb - .4,
				z
			], r + 2, 16), ring);
			put(cyl([
				x,
				yb - .4,
				z
			], [
				x,
				yb - .6,
				z
			], r, 16), HOLE);
		};
