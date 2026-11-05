/* ================================================================================================================
 * 7. FURNISHING — where each thing of the library stands, room by room and on the terraces
 * ================================================================================================================ */

/**
 * Every room of ROOMS furnished by its kind, in its own frame (roomMatrix: +x along the façade, +z out to the garden,
 * the room from z = −d0 to z = −d1, y from its floor), with the things of THINGS (play's own furniture, by hash) and,
 * in pots and troughs, the library's plants. A thing's front is its +z (a bed's foot, a chair's seat), a wall piece's
 * back is its z = 0, a pendant hangs from its origin. The doors are kept clear: to the terrace at the façade's west end
 * of each suite (x from −w/2 + 0.6 to −w/2 + 2), to the bath and the studio at the east end of the walls behind.
 */
/** the floor a level's rooms stand on, over its slab's top (the ground level's is raised to the plaza's) */
const fu_floorAt = (k) => (k === 0 ? 0.12 : 0);
/** the soil's height in a pot and in a trough (their things' own measures) */
const FU_POT_SOIL = 0.4;
const FU_TROUGH_SOIL = 0.5;
/** what was left out because the library lacks it (a thing not made): counted, the rest furnished */
const fu_missing = new Set();

function furnishPart(dome) {
	const has = (t) => typeof THINGS !== 'undefined' && !!THINGS[t];
	/** a thing in room `rm` at its local [x, z] (y over its floor), turned `turn` (0: its front out to the garden) */
	const put = (rm, thing, x, z, turn = 0, y = 0) => {
		if (!has(thing)) return void fu_missing.add(thing);
		const m = roomMatrix(rm.level, rm.x).multiply(at(x, fu_floorAt(rm.level) + y, z, turn));
		dome.place(thing, m);
	};
	/** a library plant in room `rm` at local [x, y, z] (y over its floor): its world place */
	const plantIn = (rm, kind, x, y, z, o) => {
		const p = new THREE.Vector3(x, fu_floorAt(rm.level) + y, z).applyMatrix4(roomMatrix(rm.level, rm.x));
		dome.plant(kind, p.x, p.y, p.z, o);
	};
	/** a pot with a plant in it */
	const potted = (rm, x, z, kind, stage, seed) => {
		put(rm, 'pot-terracotta', x, z, 0);
		if (has('pot-terracotta')) plantIn(rm, kind, x, FU_POT_SOIL, z, { stage, seed, turn: x * 3 + z });
	};
	/** a lamp's light in room `rm` at local [x, y, z] */
	const light = (rm, x, y, z, o) => {
		const p = new THREE.Vector3(x, fu_floorAt(rm.level) + y, z).applyMatrix4(roomMatrix(rm.level, rm.x));
		dome.lamp(p.x, p.y, p.z, o);
	};

	for (const rm of ROOMS) {
		const r = chance('furnish', rm.id);
		const W = rm.w / 2, d0 = rm.d0, d1 = rm.d1, h = rm.h - (rm.level === 0 ? 0.12 : 0);
		// a room mirrored (its own things swapped east and west) where its doors allow: none here, the doors fix the sides
		if (rm.kind === 'suite') {
			// the bed against the wall behind, its foot to the garden, clear of the bath's door at the east end
			const bx = -0.35, bz = -d1 + 0.15 + 1.1;
			// the rug at the bed's foot, not under it (a jute rug is 12 mm thick: what stands on it is lifted by that)
			put(rm, 'rug-jute-round', bx, bz + 1.95, 0);
			put(rm, 'bed-platform', bx, bz, 0);
			for (const s of [-1, 1]) {
				put(rm, 'nightstand-round', bx + s * 1.27, -d1 + 0.4, 0);
				put(rm, 'lamp-mushroom', bx + s * 1.27, -d1 + 0.4, r() * TAU, 0.5);
			}
			// by the glass: a desk to work at, or a chair to read in
			if (r() < 0.5) {
				put(rm, 'desk-curved', W - 1.25, -1.35, Math.PI);
				put(rm, 'chair-desk', W - 1.25, -2.05, Math.PI + (r() - 0.5) * 0.3);
			} else {
				put(rm, 'armchair-round', W - 1.0, -1.4, -0.5);
				put(rm, 'table-side-travertine', W - 1.95, -1.1, 0);
				put(rm, 'lantern-floor', W - 0.45, -2.3, r() * TAU);
			}
			put(rm, 'curtain-linen', W - 0.85, -0.12, Math.PI);
			put(rm, 'lantern-pendant', 0.4, -2.6, r() * TAU, h);
			// the pot by the wall, clear of the stair hall's side door where there is one (d 2.55–3.45, its leaf into here)
			if (r() < 0.7) potted(rm, -W + 0.45, -5.0, r() < 0.5 ? 'banana' : 'coffee', r() < 0.5 ? 3 : 4, 'p' + Math.floor(r() * 3));
			// on its terrace, past a lane along the glass: a daybed by the rail, or two chairs and a table
			if (rm.level > 0) {
				if (r() < 0.5) {
					put(rm, 'daybed-terrace', 0.3, 2.55, Math.PI / 2);
					put(rm, 'table-side-travertine', 1.75, 2.4, 0);
				} else {
					put(rm, 'armchair-round', -0.6, 2.4, 0.25);
					put(rm, 'armchair-round', 0.9, 2.4, -0.25);
					put(rm, 'table-side-travertine', 0.15, 2.85, 0);
				}
				put(rm, 'lantern-floor', W - 0.5, 2.9, 0);
			}
		} else if (rm.kind === 'bath') {
			// along the wall to the suite (z = −d0): the vanity; on the wall behind: the shower and the toilet; the tub free
			// between; the doors at the east end kept clear
			put(rm, 'vanity-curved', -W + 1.55, -d0 - 0.075, Math.PI);
			put(rm, 'shower-walk-in', -W + 0.75, -d1 + 0.075, 0);
			put(rm, 'toilet-wall', -W + 2.35, -d1 + 0.075, 0);
			put(rm, 'bath-tub-freestanding', -0.2, -(d0 + d1) / 2 + 0.05, 0);
		} else if (rm.kind === 'studio') {
			// under the sloping shell: a desk facing the shell's windows, a bookcase on the wall to the bath, a reading chair
			const mid = -(d0 + d1) / 2;
			put(rm, 'bookcase-oak', -W + 0.85, -d0 - 0.25, Math.PI);
			put(rm, 'desk-curved', -0.2, mid - 0.2, 0);
			put(rm, 'chair-desk', -0.2, mid + 0.55, Math.PI);
			put(rm, 'armchair-round', W - 1.1, -d0 - 1.3, Math.PI - 0.5);
			put(rm, 'pouf-linen', W - 1.5, -d0 - 2.5, 0);
		} else if (rm.kind === 'lounge') {
			const back = -Math.min(d1, 8.5);
			put(rm, 'rug-jute-round', 0, -3.4, 0);
			put(rm, 'sofa-curved', 0, -4.6, 0);
			put(rm, 'table-coffee-travertine', 0, -3.0, 0.2, 0.012);
			for (const s of [-1, 1]) {
				put(rm, 'armchair-round', s * 2.5, -2.3, -s * 0.9);
				put(rm, 'lantern-floor', s * 3.3, -5.6, 0);
			}
			if (d1 > 7.5) put(rm, 'bookcase-oak', -1.4, back + 0.2, 0), put(rm, 'bookcase-oak', 1.4, back + 0.2, 0);
			put(rm, 'lantern-pendant-large', 0, -3.4, 0, h);
			potted(rm, 3.3, -0.8, 'banana', 4, 'l' + rm.level);
			potted(rm, -3.3, -0.8, 'coffee', 5, 'l' + rm.level);
			if (rm.level === 1) light(rm, 0, h - 1.2, -3.4);
		} else if (rm.kind === 'hall') {
			// the dining hall: round tables by the glass, the kitchen behind (a counter along the back wall, the island)
			for (const tx of [-5.6, 0, 5.6])
				for (const tz of [-2.6, -5.7]) {
					put(rm, 'table-dining-round', tx, tz, r() * TAU);
					for (let c = 0; c < 4; c++) {
						const a = (c / 4) * TAU + 0.4 + r() * 0.2;
						put(rm, 'chair-spindle', tx + Math.sin(a) * 0.92, tz + Math.cos(a) * 0.92, a + Math.PI);
					}
				}
			for (const tx of [-5.6, 0, 5.6]) put(rm, 'lantern-pendant-large', tx, -4.15, 0, h);
			put(rm, 'kitchen-counter', -2.6, -d1 + 0.08, 0);
			put(rm, 'kitchen-counter', 2.6, -d1 + 0.08, 0);
			// its fronts to the cook between it and the back counter, its seating overhang to the dining room
			put(rm, 'kitchen-island-curved', 0, -9.0, Math.PI);
			for (const sx of [-0.9, 0, 0.9]) put(rm, 'stool-oak', sx, -8.05, Math.PI);
			potted(rm, -8.3, -0.9, 'banana', 4, 'h1');
			potted(rm, 8.3, -0.9, 'banana', 4, 'h2');
			light(rm, 0, h - 0.8, -4.2);
			light(rm, 0, h - 0.8, -9.0);
		} else if (rm.kind === 'library') {
			// along the back wall, leaving the door to the service room behind clear (local x −0.45 … 0.45 at d 12)
			for (let i = 0; i < 7; i++) {
				const bx = -W + 0.75 + i * 1.25;
				if (Math.abs(bx) < 1.15 || bx > W - 0.6) continue;
				put(rm, 'bookcase-oak', bx, -d1 + 0.2, 0);
			}
			put(rm, 'rug-jute-round', 0.6, -5.4, 0);
			put(rm, 'table-library-long', 0.6, -5.4, 0, 0.012);
			for (const s of [-1, 1]) for (const cx of [-0.7, 0.5, 1.7]) put(rm, 'chair-spindle', cx, -5.4 + s * 0.85, s < 0 ? 0 : Math.PI);
			put(rm, 'armchair-round', -W + 1.4, -1.5, 0.6);
			put(rm, 'armchair-round', W - 1.4, -1.5, -0.6);
			put(rm, 'table-side-travertine', -W + 2.5, -1.2, 0);
			put(rm, 'lantern-floor', W - 0.6, -2.6, 0);
			for (const tx of [-1.6, 2.8]) put(rm, 'lantern-pendant', tx, -5.4, 0, h);
			light(rm, 0.6, h - 1.2, -5.4);
		} else if (rm.kind === 'workshop') {
			put(rm, 'workbench-oak', -W + 1.3, -d1 + 0.08, 0);
			put(rm, 'workbench-oak', -W + 3.4, -d1 + 0.08, 0);
			put(rm, 'table-library-long', 0.8, -5.2, Math.PI / 2);
			for (const sz of [-6.2, -4.2]) put(rm, 'stool-oak', -0.3, sz, Math.PI / 2), put(rm, 'stool-oak', 1.9, sz, -Math.PI / 2);
			potted(rm, W - 0.6, -1.0, 'pepper', 9, 'w');
			light(rm, 0, h - 1.2, -6);
		} else if (rm.kind === 'stair') {
			// keep the spiral's circle clear; a bench and a trough of plants by the terrace's opening where there is room
			const sx = STAIRS[rm.x < 0 ? 0 : 1];
			const sd = sx.z - facadeZ(rm.level, rm.x);
			if (sd > sx.r + 2.4) {
				put(rm, 'bench-oak-curved', 0, -1.0, 0);
				if (rm.level > 0) put(rm, 'planter-trough', 0, 1.8, 0);
			}
			if (rm.level > 0 && has('planter-trough') && sd > sx.r + 2.4)
				for (const px of [-0.5, 0.5]) plantIn(rm, px < 0 ? 'nasturtium' : 'basil', px, FU_TROUGH_SOIL, 1.8, { stage: 9, seed: 's' + rm.level });
		}
	}
	return { missing: [...fu_missing] };
}
