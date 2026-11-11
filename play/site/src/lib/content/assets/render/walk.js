/*
 * WHICH COPIES A FRAME LOOKS AT (intent 0356b0ea) — a kind's copies kept by where they stand, in square cells of the
 * ground, so a frame that moved the eye looks at a cell before it looks at its copies: a cell no copy of which could
 * be drawn (out of view, too small to see from here, or cover that does not grow this far) is passed over whole, where
 * the renderer looked at every copy of every kind at every step of a walk.
 *
 * Nothing is drawn differently for it. A cell is passed over only when (1) no copy of it was drawn the frame before
 * (`shown`: a copy going out of view is still looked at once, so the renderer forgets its level as it always did) and
 * (2) the bound that holds every copy of it fails the very tests each copy would have failed one by one (`seen`). The
 * bound only ever errs towards looking: it grows with the copies put in and shrinks only when the cell empties.
 *
 *   const cells = createCells();
 *   cells.put(i, x, y, z, scale, reach)     // copy i stands there (again: it moved); `reach` how far its cover grows
 *   cells.drop(i)                           // put away
 *   cells.visit((cell) => seen(cell, …), (i) => drawn)   // each copy of each cell that may show; the copies looked at
 */

/** a cell's side, metres: a few trees across, so a walk's view cuts the forest into cells in and cells out */
export const CELL = 24;

/**
 * @typedef {{ x: number, z: number, y0: number, y1: number, half: number, scale: number, reach: number, ids: number[], shown: number }} Cell
 * its middle on the ground, the heights its copies stand between, half its diagonal on the ground, its largest copy's
 * scale, how far the cover in it grows at most (Infinity once a copy of it is no cover), its copies, and how many of
 * them were drawn when it was last looked at
 */

export function createCells(size = CELL) {
	/** @type {Map<number, Cell>} */
	const cells = new Map();
	/** @type {(Cell | undefined)[]} each copy's cell, and where it is among that cell's copies */
	const of = [];
	/** @type {number[]} */
	const at = [];
	const half = size * Math.SQRT1_2;
	let standing = 0;
	// a cell's number from its column and row: 2^20 columns either way
	const key = (x, z) => (Math.floor(x / size) + 1048576) * 2097152 + (Math.floor(z / size) + 1048576);

	function drop(i) {
		const c = of[i];
		if (!c) return;
		const last = c.ids.pop();
		if (last !== i) {
			c.ids[at[i]] = /** @type {number} */ (last);
			at[/** @type {number} */ (last)] = at[i];
		}
		of[i] = undefined;
		standing--;
		// one fewer may be shown: looked at once more at most, never passed over wrongly
		if (!c.ids.length) cells.delete(key(c.x, c.z));
	}

	/** copy i stands at x, y, z at `scale`; `reach`: how far from the eye its cover grows, Infinity for a whole copy */
	function put(i, x, y, z, scale, reach = Infinity) {
		const k = key(x, z);
		let c = cells.get(k);
		if (of[i] && of[i] !== c) drop(i);
		if (!c) {
			c = { x: (Math.floor(x / size) + 0.5) * size, z: (Math.floor(z / size) + 0.5) * size, y0: y, y1: y, half, scale: 0, reach: 0, ids: [], shown: 0 };
			cells.set(k, c);
		}
		if (of[i] !== c) {
			of[i] = c;
			at[i] = c.ids.push(i) - 1;
			standing++;
		}
		if (y < c.y0) c.y0 = y;
		if (y > c.y1) c.y1 = y;
		if (scale > c.scale) c.scale = scale;
		if (reach > c.reach) c.reach = reach;
		// it may be drawn where it now stands: its cell is looked at
		c.shown++;
	}

	/**
	 * Each copy of each cell that `sees` it or had a copy drawn last time: `each(i)` says whether it is drawn now.
	 * @param {(c: Cell) => boolean} sees @param {(i: number) => boolean} each
	 * @returns {number} the copies looked at
	 */
	function visit(sees, each) {
		let looked = 0;
		for (const c of cells.values()) {
			if (!c.shown && !sees(c)) continue;
			let shown = 0;
			const ids = c.ids;
			for (let j = 0; j < ids.length; j++) if (each(ids[j])) shown++;
			looked += ids.length;
			c.shown = shown;
		}
		return looked;
	}

	return {
		put,
		drop,
		visit,
		/** the copies standing, and the cells they stand in */
		get copies() {
			return standing;
		},
		get cells() {
			return cells.size;
		}
	};
}

/**
 * Whether any copy of a cell could be drawn: the ball that holds every copy's own ball meets the view, its cover
 * grows this far, and its largest copy at its nearest is large enough on screen. Each a bound of the test the renderer
 * makes copy by copy (index.js `update`), so false means every copy of it would have failed that test.
 *
 * @param {Cell} c
 * @param {{ intersectsSphere: (s: any) => boolean }} frustum the view
 * @param {{ x: number, y: number, z: number }} eye
 * @param {number} tanHalf the tangent of half the view's angle (over its zoom)
 * @param {{ radius: number, offset: number }} kind its ball at scale 1: its radius (doubled where its copies are moved
 *   by their controls) and how far its centre is from a copy's own origin
 * @param {{ x: number, z: number }} around what the cover grows round
 * @param {number} smallest the size on screen under which a copy is not drawn
 * @param {(radius: number, distance: number, tanHalf: number) => number} sizeOn
 * @param {{ center: { set: (x: number, y: number, z: number) => any }, radius: number }} ball a sphere to work in
 */
export function seen(c, frustum, eye, tanHalf, kind, around, smallest, sizeOn, ball) {
	// cover past where it grows: none of it stands (coverGrow is 0 from `reach` on)
	if (c.reach < Infinity && Math.hypot(c.x - around.x, c.z - around.z) - c.half > c.reach) return false;
	const y = (c.y0 + c.y1) / 2;
	// every copy's origin is within `h` of the cell's middle, its ball's centre within `off` more
	const h = Math.hypot(c.half, (c.y1 - c.y0) / 2) + 1e-3, off = kind.offset * c.scale, r = kind.radius * c.scale;
	ball.center.set(c.x, y, c.z);
	ball.radius = h + off + r;
	if (!frustum.intersectsSphere(ball)) return false;
	const nearest = Math.hypot(c.x - eye.x, y - eye.y, c.z - eye.z) - h - off;
	return !(sizeOn(r, nearest, tanHalf) < smallest);
}
