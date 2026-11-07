	/** how deep a ball at c of radius r would sink into what is here (0 when it touches nothing) @param {THREE.Vector3} c @param {number} r */
	depth(c, r) {
		const s = this.cell;
		const x = Math.floor(c.x / s), y = Math.floor(c.y / s), z = Math.floor(c.z / s);
		let worst = 0;
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
			const list = this.cells.get(this.key(x + i, y + j, z + k));
			if (list) for (const b of list) worst = Math.max(worst, r + b.r - c.distanceTo(b.c));
		}
		return worst;
	}
	/** a rod along a path, as a chain of balls @param {THREE.Vector3[]} pts @param {number} r */
	rod(pts, r) {
		for (let i = 0; i + 1 < pts.length; i++) {
			const n = Math.max(1, Math.ceil(pts[i].distanceTo(pts[i + 1]) / r));
			for (let k = 0; k < n; k++) this.add(pts[i].clone().lerp(pts[i + 1], k / n), r);
		}
	}
	/**
	* Where a fruit hangs, as Space.settle has it: from `at`, along a direction near `dir`, its stalk perhaps a little
	* longer, so that its balls (`shape(at, dir)`) touch nothing, or as little as can be. Its balls are added.
	* @param {THREE.Vector3} at @param {THREE.Vector3} dir
	* @param {(at: THREE.Vector3, dir: THREE.Vector3) => { c: THREE.Vector3, r: number }[]} shape @param {number} reach
	*/
	settle(at, dir, shape, reach) {
		const d0 = dir.clone().normalize();
		let best = {
			at: at.clone(),
			dir: d0,
			cost: Infinity
		};
		const side = new three.Vector3();
		for (const ext of [
			0,
			.5,
			1
		]) {
			for (const swing of [
				0,
//#piece bcea25bb5328cfa8f00298575d205f67128038078a84ddca7b43d9f5aa0c9c2f
					let cost = swing * .004 + ext * .003;
					for (const b of shape(p, d)) cost += (this.depth(b.c, b.r) + (this.wood?.depth(b.c, b.r) ?? 0)) * 10 + Math.max(0, b.r - b.c.y) * 10;
//#piece 9e80f6245600779f87e4194b544ce573595911a35e07d093b3cf645d8e5e12e9
		for (const b of shape(best.at, best.dir)) this.add(b.c, b.r);
		return best;
	}
};
/** a place along a path, u 0 … 1 */
//#piece 10be253320949b7a42ae06618a28f35677c89220b3cd3505cc0edff4e2bebc92
		at: pts[k].clone().lerp(pts[k + 1], f - k),
		dir: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/** a direction square to `dir`, turned round it by `turn` */
function across(dir, turn) {
	return new three.Vector3().crossVectors(dir, Math.abs(dir.y) > .95 ? v3(1, 0, 0) : UP).normalize().applyAxisAngle(dir, turn);
}
/**
* @param {Grove} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function grove(spec) {
	return (g, seed) => {
		const bag = new Bag();
		const grid = new Grid();
		const vigour = about(chance(seed, "plant"), 1, .08);
		const at = v3(0, -spec.seed.depth, 0);
		const s = sprout(bag, {
			seed,
			at,
//#piece 3ee2ae00e49bcb52901b64ab8e91c2d78ff1d2601f113feef775ba4d93a95065
		});
		const R = spec.roots;
		root(bag, {
			seed,
			key: ["tap"],
			from: at.clone(),
			dir: v3(.02, -1, .01),
			length: R.tap,
			grown: table(g, [
				[0, 0],
				[.3, .004],
				[1, .03],
				[2, .07],
				[3, .2],
				[4, .45],
				[5, .75],
				[6, .9],
				[8, 1]
			]),
			radius: .002 + R.radius * span(g, 2, 8),
			down: .03,
			wander: .1,
			laterals: 8,
			lateral: .3,
			depth: 2,
			age: span(g, 1.5, 6),
			young: "#f3e6cc",
			old: "#6e5032"
		});
		for (let i = 0; i < R.count; i++) {
			const rr = chance(seed, "feeder", i);
			const born = 2.6 + i * (4 / R.count);
			const bear = i * 2.39996 + rr() * .4;
			const from = at.clone().add(v3(0, -.04 - rr() * .12, 0));
			const dir = v3(Math.cos(bear), -.15, Math.sin(bear));
			const grown = (g - born) / 2.8;
			root(bag, {
				seed,
				key: ["feeder", i],
				from,
				dir,
				length: between(rr, .6, 1) * R.spread * vigour,
				grown,
				radius: .003 + R.radius * .4 * span(g, 3, 8),
				down: .01,
				wander: .14,
				laterals: 4,
				lateral: .25,
				depth: 2,
				age: (g - born - .6) / 2.5,
				young: "#efdcb8",
				old: "#6e5032"
			});
			if (R.nodules && DETAIL.roots && grown > .15) {
				const n = 3 + Math.floor(rr() * 3);
				const p = from.clone().addScaledVector(dir.clone().normalize(), .03 + rr() * .03);
				for (let k = 0; k < n; k++) {
					const d = v3(rr() - .5, rr() - .7, rr() - .5).normalize();
					bag.add("body", bead(p.clone().addScaledVector(d, .006), v3(.003, .006, .003).multiplyScalar(clamp(grown * 2)), "#c08a4a", 3, new three.Quaternion().setFromUnitVectors(UP, d)));
				}
			}
		}
		const shoots = spec.flush ? flushCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.flush
		}) : spec.leader ? leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		}) : [];
		const gens = spec.flush ? spec.flush.gens : 2;
		grid.wood = new Grid();
		for (const sh of shoots) if (sh.gen <= 2 && sh.radius > .01) grid.wood.rod(sh.pts, sh.radius + .01);
		if (spec.thorns) for (const sh of shoots) {
			if (sh.gen < gens - 1 || sh.length < .05) continue;
			const tr = chance(seed, "thorns", ...sh.key);
			const n = Math.floor(sh.length * spec.thorns);
			for (let k = 0; k < n; k++) {
				const p = along(sh.pts, between(tr, .15, .9));
				const d = across(p.dir, tr() * Math.PI * 2).addScaledVector(p.dir, .8).normalize();
				const len = between(tr, .012, .025) * clamp((g - sh.born) / .8);
				bag.add("body", tube([p.at, p.at.clone().addScaledVector(d, len)], (u) => .0016 * (1 - u), () => col("#6a5a4a"), 3));
			}
		}
		const B = spec.bloom;
		/** @type {Set<import('./crown.js').Shoot>} */
		const bearing = /* @__PURE__ */ new Set();
		for (const sh of shoots) {
			if (sh.gen < B.gen) continue;
			const sr = chance(seed, "site", ...sh.key);
			const opens = B.opens + sr() * .2;
			const phase = g - opens;
			if (phase < -.4) continue;
			/** @param {THREE.Vector3} p @param {THREE.Vector3} d @param {(string | number)[]} key */
			const draw = (p, d, key) => spec.site({
				bag,
				seed,
				key,
				at: p,
				dir: d,
				g,
				phase,
				grid,
				vigour,
				shoot: sh
			});
			const old = !!spec.leader || sh.born < opens - .15;
			if (B.sites === "tips") {
				if (sh.end && old && sr() < B.chance) {
					bearing.add(sh);
					draw(sh.tip.clone(), sh.dir.clone(), sh.key);
				}
			} else if (B.sites === "wood") {
				if (old && sr() < B.chance) {
					bearing.add(sh);
					draw(sh.tip.clone(), sh.dir.clone(), sh.key);
				}
			} else if (old) {
				const from = spec.leader && sh.gen === 1 ? .5 : .2;
				const n = Math.floor(sh.length * (1 - from) * B.chance + sr());
				for (let k = 0; k < n; k++) {
					const p = along(sh.pts, from + (1 - from) * ((k + .3 + sr() * .4) / n) * .95);
					const turn = sr() * Math.PI * 2;
					for (let m = 0; m < (B.pairs ? 2 : 1); m++) {
						const side = across(p.dir, turn + m * Math.PI);
						if (!B.pairs && side.y > .3) side.y *= -1;
						draw(p.at.clone().addScaledVector(side, sh.radius * .9), side.addScaledVector(p.dir, .5).normalize(), [
							...sh.key,
							k,
							m
						]);
					}
				}
			}
		}
		for (const sh of shoots) foliage(bag, spec, seed, g, sh, grid, bearing.has(sh));
		return bag.build();
	};
}
/**
* The leaves of a shoot: at nodes along its outer part, one to a node in a spiral or two opposite (each pair square to
* the last), a tuft at its tip; each turned on its stalk away from any fruit it would run into.
* @param {Bag} bag @param {Grove} spec @param {string} seed @param {number} g @param {import('./crown.js').Shoot} sh
* @param {Grid} grid @param {boolean} bears whether it flowers and fruits at its tip, or along its old wood (its leaves
*   then only beyond it)
*/
function foliage(bag, spec, seed, g, sh, grid, bears) {
	const L = spec.leaf;
	const leader = !!spec.leader;
	if (!(leader || sh.end || sh.gen >= L.from || g - sh.born < 1.1)) return;
	const on = L.on ? table(g, L.on) : 1;
	if (on < .04) return;
	const lr = chance(seed, "leaves", ...sh.key);
	const age = clamp((g - sh.born) / .8);
	const youth = Math.max(1 - age, 1 - on);
	const shade = mix(L.colour, L.dark, lr());
	const colour = mix(shade, L.young, youth);
	const vein = colour.clone().lerp(new three.Color("#e0e4b0"), .3);
	const paint = (u, v) => Math.abs(v) < .1 ? vein : colour;
	const grownBy = lerp(.35, 1, age) * lerp(.5, 1, clamp(g - 2)) * lerp(.3, 1, on);
	/** one leaf (or compound leaf) at p, reaching out along `out` @param {THREE.Vector3} p @param {THREE.Vector3} out */
	const leaf = (p, out) => {
		const len = (L.pinnate ? L.pinnate.length : L.length) * between(lr, .78, 1.08) * grownBy * vigourOf(lr);
		const wid = (L.pinnate ? L.pinnate.width / L.pinnate.length : L.width / L.length) * len;
		const hang = lerp(.9, -L.droop, Math.min(age, on)) + about(lr, 0, .3);
		/** its direction, turned `turn` round the vertical */
		const aimed = (turn) => {
			const level = out.clone().setY(0);
			if (level.lengthSq() < 1e-6) level.set(1, 0, 0);
			level.normalize().applyAxisAngle(UP, turn);
			return level.multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
		};
		let dir = aimed(0);
		let ok = false;
		for (const turn of [
			0,
			.7,
			-.7,
			1.4,
			-1.4,
			2.2,
			-2.2
		]) {
			const d = aimed(turn);
			if (grid.depth(p.clone().addScaledVector(d, len * .5), wid * .5) + grid.depth(p.clone().addScaledVector(d, len * .92), wid * .35) < wid * .1) {
				dir = d;
				ok = true;
				break;
			}
		}
		if (!ok) return;
		const base = p.clone().addScaledVector(dir, .006);
		if (L.pinnate) return pinnateLeaf(bag, L, lr, base, dir, len, paint, Math.min(age, on));
		bag.add("sheet", sheet({
			length: len,
			width: wid,
			shape: L.shape,
			lift: (u, v) => (L.curl ?? .06) * v * v - .07 * u * u,
			paint,
			along: L.along ?? 5,
			across: L.across ?? 2
		}), aim(base, dir, (lr() - .5) * .6));
	};
	const start = leader && sh.gen === 1 ? .45 : leader && sh.gen === 0 ? g < 3.6 ? .1 : 1 - Math.min(.35, 1.2 / Math.max(.1, sh.length)) : bears ? L.start ?? .12 : .12;
	const step = (L.pinnate ? L.pinnate.length : L.length) * L.spacing;
	const n = Math.min(L.max ?? 18, Math.max(1, Math.floor(sh.length * (1 - start) / step)));
	for (let k = 0; k < n; k++) {
		const { at, dir } = along(sh.pts, start + (1 - start) * (k + .5) / n);
		if (L.opposite) {
			const turn = k % 2 * (Math.PI / 2) + about(lr, 0, .15);
			for (const m of [0, Math.PI]) leaf(at, across(dir, turn + m).addScaledVector(dir, .45));
		} else leaf(at, across(dir, k * 2.39996 + about(lr, 0, .3)).addScaledVector(dir, .45));
	}
