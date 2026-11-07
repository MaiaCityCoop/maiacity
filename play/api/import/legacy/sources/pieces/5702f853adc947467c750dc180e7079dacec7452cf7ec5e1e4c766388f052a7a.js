	/** @param {THREE.Vector3} c @param {number} r */
	add(c, r) {
		const k = this.key(c.x, c.y, c.z);
		const list = this.cells.get(k);
		if (list) list.push({
			c: c.clone(),
			r
		});
		else this.cells.set(k, [{
			c: c.clone(),
			r
		}]);
	}
	/** how deep a ball at p of radius r sinks into what is here (0 when it touches nothing) @param {THREE.Vector3} p @param {number} r */
	depth(p, r) {
		let worst = 0;
//#piece 70cbd507509956fc5beba70ba4b52fe59c6092dc6a7fd5ddef0aee93190d7331
			if (list) for (const b of list) worst = Math.max(worst, b.r + r - b.c.distanceTo(p));
		}
		return worst;
	}
	/** whether a ball at p of radius r touches anything here @param {THREE.Vector3} p @param {number} r */
	hit(p, r) {
		if (!this.cells.size) return false;
//#piece 70cbd507509956fc5beba70ba4b52fe59c6092dc6a7fd5ddef0aee93190d7331
			if (list) {
				for (const b of list) if (b.c.distanceTo(p) < b.r + r) return true;
			}
		}
		return false;
	}
};
/** @typedef {import('./crown.js').Shoot} Shoot */
/**
* @typedef {{ bag: Bag, g: number, seed: string, shoots: Shoot[], vigour: number, clear: Clear, gens: number }} Ctx —
*   what a tree's flowers and nuts are grown with: its shoots (`gens` the last flush of a flushing crown), and where
*   things already are
*/
/**
* @typedef {{
*   stalk: number, length: number, width: number, shape: (u: number) => number, back?: number, cup?: number, bow?: number,
*   along: number, pinnate?: number, wide?: number, cross?: boolean
* }} Blade — a leaf's make: a simple blade, or `pinnate` pairs of leaflets along a rachis `length` long (`wide` how
*   broad each leaflet is for its length); `cross`, a second blade across the first (a bundle of needles)
*/
/**
* @typedef {{
//#piece ed78259f76b5d7c3548b2efae734caef2ca38da02cbdba0dc9039a9d1e239e7e
*   roots: { tap: number, spread: number, count: number, radius: number }, nodules?: boolean,
*   flush?: import('./crown.js').Flush, leader?: import('./crown.js').Leader,
*   coppice?: { stems: [number, number], from: number, every: number, lean: number, stool: number, leader: import('./crown.js').Leader },
*   leaf: { blade: Blade, colour: string, young: string, autumn: string, droop: number, gap: number, per: number, twig: number, tuft: number, from?: number, inner?: number, limb?: number, top?: number, bare?: boolean, spring?: boolean },
*   bear: (ctx: Ctx) => void
* }} Wood — a tree of the forest garden, described: its seed, its roots (`nodules` the alder's), its crown (in flushes,
*   with a leader, or a coppice of `stems` leaders from the stool, one every `every` stages from `from`), its leaves
*   (a node every `gap` metres along the outer shoots, of one leaf or a short twig `twig` long with `per`; `tuft` more
*   at each tip; along the older wood within, `inner` times sparser; on a leader's limbs from `limb` of the way out,
*   and in sprays up its `top` metres; `bare` if it flowers before they come, `spring` if as they come)
*   and `bear`, which grows its flowers and its nuts
*/
/**
* @param {Wood} spec
* @returns {(g: number, seed: string) => THREE.Group}
*/
function wood(spec) {
//#piece 147e60b644ef5883b998a01065bc71678e516673338121350ae714b82c54a9f0
//#piece afd5f76ee003ee5b5a171b6215e813e6a1695d6b965ccebd6055f6f3ba68f295
			radius: .0018 + .004 * span(g, 1, 3),
			stemColor: "#7a6a42",
//#piece fcb09042a0aeb4a9409dd2d58140ece1120e746f9a9feb2d79c515ebf36f11cf
//#piece 361bc7ba1290cf80fe3ca5ce0a838c2b33aa7647f59364b993acacb02437b3af
			old: "#5e4632"
		});
//#piece 08fef1b2b79afe9694f39a0ed2fa1d0526bf137c52aaa04fe71302b99aaa477c
				laterals: 4,
				lateral: .25,
				depth: 2,
				age: (g - born - .6) / 2.5,
				young: "#efdcb8",
				old: "#5e4632"
			});
		}
		if (spec.nodules) nodules(bag, seed, g, at);
		/** @type {Shoot[]} */
		let shoots = [];
		const girth = table(g, [
			[2, .12],
			[3, .25],
			[4, .55],
			[5, .8],
			[6, .92],
			[9, 1]
		]);
		if (spec.flush) shoots = flushCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: {
				...spec.flush,
				radius: spec.flush.radius * girth
			}
		});
		else if (spec.leader) shoots = leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		});
		else if (spec.coppice) shoots = coppice(bag, seed, g, s.top.clone(), spec.coppice);
		for (const sh of shoots) if (sh.gen <= (spec.flush ? 2 : 1) && sh.radius > .01) bag.space.rod(sh.pts, sh.radius + .01);
		const clear = new Clear();
		spec.bear({
			bag,
			g,
			seed,
			shoots,
			vigour,
			clear,
			gens: spec.flush?.gens ?? 2
		});
		const L = spec.leaf;
		const tr = chance(seed, "leaf-make");
		const B = L.blade;
		const make = () => B.pinnate ? pinnateLeaf(B.length * about(tr, 1, .06), B.pinnate, B.wide) : simpleLeaf({
			...B,
			length: B.length * about(tr, 1, .06)
		});
		const tpls = [
			make(),
			make(),
			make()
		];
		const season = L.bare ? table(g, [
			[4.3, 1],
			[4.5, 0],
			[5.25, 0],
			[5.8, 1]
		]) : 1;
		const unfold = L.bare ? clamp((g - 5.25) / .9) : 1;
		const fall = span(g, 8.2, 9.2);
		const leaves = new Foliage();
		if (season > .03) for (const sh of shoots) foliage(bag, leaves, spec, seed, g, sh, tpls, clear, season, g > 5.25 && g < 6.2 ? unfold : 1, fall);
		leaves.into(bag);
		for (const t of tpls) t.dispose();
		return bag.build();
	};
}
/**
* The leaves of a shoot: one by one along it in a spiral, turned out toward the light, and a tuft at its tip; on a
* leader's limbs along their outer half, and up the leader's own top. New leaves their young colour, darkening as they
* harden; in the autumn some yellowing.
* @param {Bag} bag @param {Foliage} leaves @param {Wood} spec @param {string} seed @param {number} g @param {Shoot} sh
* @param {THREE.BufferGeometry[]} tpls @param {Clear} clear @param {number} season @param {number} unfold @param {number} fall
*/
function foliage(bag, leaves, spec, seed, g, sh, tpls, clear, season, unfold, fall) {
	const L = spec.leaf;
	const lr = chance(seed, "leaves", ...sh.key);
	const leader = !spec.flush;
	const outer = (spec.flush?.gens ?? 0) - 1;
	const leafy = leader ? true : sh.end || sh.gen === 0 && g < 3.4 || sh.gen >= Math.min(L.from ?? 99, outer);
	const inner = !leafy && sh.gen >= 1 && L.inner ? L.inner : 0;
	if (!leafy && !inner) return;
	const age = Math.min(clamp((g - sh.born) / .6), unfold);
	const reach = L.blade.pinnate ? L.blade.length * 1.1 : L.blade.length + L.blade.stalk;
	const young = new three.Color(L.young), old = new three.Color(L.colour), autumn = new three.Color(L.autumn);
	const spring = L.spring ? .75 * table(g, [
		[4.4, 0],
		[4.75, 1],
		[5.3, 1],
		[5.9, 0]
	]) : 0;
	/** one leaf at p, reaching out along `out` @param {THREE.Vector3} p @param {THREE.Vector3} out */
	const leaf = (p, out) => {
		const size = between(lr, .8, 1.1) * lerp(.45, 1, age) * lerp(.55, 1, clamp(g - 2)) * season;
		const hang = lerp(-.7, -L.droop, age) + about(lr, 0, .3);
		const tpl = tpls[Math.floor(lr() * tpls.length)];
		const roll = (lr() - .5) * .6;
		const tint = lr();
		const yellow = fall * clamp((lr() - .6) * 1.6);
		if (size < .02) return;
		let dir = null;
		const flat = out.clone().setY(0);
		if (flat.lengthSq() < 1e-6) flat.set(1, 0, 0);
		flat.normalize();
		for (const turn of [
			0,
			.7,
			-.7,
			1.5,
			-1.5,
			2.4,
			-2.4
		]) {
			const d = flat.clone().applyAxisAngle(v3(0, 1, 0), turn).multiplyScalar(Math.cos(hang)).add(v3(0, Math.sin(hang), 0)).normalize();
			let hit = false;
			for (const f of [
				.35,
				.7,
				1
			]) if (clear.hit(p.clone().addScaledVector(d, reach * size * f), reach * size * .16)) hit = true;
			if (!hit) {
				dir = d;
				break;
			}
		}
		if (!dir) return;
		const colour = young.clone().lerp(old, age * (1 - spring)).multiplyScalar(.92 + .16 * tint).lerp(autumn, yellow * .75);
		leaves.stamp(tpl, aim(p, dir, roll).multiply(new three.Matrix4().makeScale(size, size, size)), colour);
	};
	/** out from the shoot, round it by `bear`, and a little out from the trunk */
	const outFrom = (p, dir, bear, forward) => {
		let side = new three.Vector3().crossVectors(dir, v3(0, 1, 0));
		if (side.lengthSq() < 1e-6) side = v3(1, 0, 0);
		side.normalize().applyAxisAngle(dir, bear);
		const away = v3(p.x, 0, p.z);
		if (away.lengthSq() > 1e-6) side.addScaledVector(away.normalize(), .45);
		return side.addScaledVector(dir, forward);
	};
	if (leader && sh.gen === 0) {
		const top = Math.min(L.top ?? 2.4, sh.length * .6);
		const n = Math.max(2, Math.min(40, Math.round(top / L.gap)));
		for (let k = 0; k < n; k++) {
			const { at, dir } = along(sh.pts, 1 - top / sh.length * (k / n));
			const twig = .06 + .3 * (k / n) * clamp(sh.length / 4);
			for (let m = 0; m < 4; m++) {
				const a = (k * 4 + m) * 2.39996;
				const o = v3(Math.cos(a), 0, Math.sin(a));
				leaf(at.clone().addScaledVector(o, twig), o.addScaledVector(dir, .5));
			}
		}
		return;
	}
