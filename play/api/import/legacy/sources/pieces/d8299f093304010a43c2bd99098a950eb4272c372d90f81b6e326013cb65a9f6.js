	const from = leader && sh.gen === 1 ? L.limb ?? .5 : inner ? .3 : .12;
	const gap = sh.gen === 0 && !leader ? Math.min(L.gap, .09) : L.gap * (inner || 1);
	const n = Math.min(40, Math.max(1, Math.round(sh.length * (1 - from) / gap)));
	const bark = new three.Color(spec.flush?.bark[0] ?? spec.leader?.bark[0] ?? spec.coppice?.leader.bark[0] ?? "#6a5a4a");
	for (let k = 0; k < n; k++) {
		const u = from + (k + .5) / n * (1 - from);
		const { at, dir } = along(sh.pts, u);
		const out = outFrom(at, dir, k * 2.39996 + lr() * .5, .45);
		if (L.per <= 1) {
			leaf(at, out);
			continue;
		}
		const td = out.clone().normalize().add(v3(0, .25, 0)).normalize();
		const tl = L.twig * between(lr, .7, 1.15) * lerp(.4, 1, age) * season + .01;
		const end = at.clone().addScaledVector(td, tl);
		bag.add("body", tube([at, end], (t) => .003 * (1 - .5 * t), () => bark, 3));
		for (let m = 0; m < L.per; m++) {
			const p = at.clone().lerp(end, (m + 1) / L.per);
			leaf(p, outFrom(p, td, (m % 2 ? 1 : -1) * 1.3 + lr() * .4, m === L.per - 1 ? 1.2 : .4));
		}
	}
	if ((sh.end || leader) && !inner) for (let k = 0; k < L.tuft; k++) {
		const { at, dir } = along(sh.pts, 1 - k % 3 * .05);
		leaf(at, outFrom(at, dir, k * 2.39996 + 1, 1.1));
	}
}
/** a place along a path, u 0 … 1 */
//#piece 10be253320949b7a42ae06618a28f35677c89220b3cd3505cc0edff4e2bebc92
		at: pts[k].clone().lerp(pts[k + 1], f - k),
		dir: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/**
* The hazel's stool: stems coming up from the base one after another, each a leader of its own leaning out from the
* middle, the first the seedling's own; they are grown upright (./crown.js) and tipped over at their foot.
* @param {Bag} bag @param {string} seed @param {number} g @param {THREE.Vector3} top
* @param {NonNullable<Wood['coppice']>} c
* @returns {Shoot[]}
*/
function coppice(bag, seed, g, top, c) {
	/** @type {Shoot[]} */
	const out = [];
	const cr = chance(seed, "stool");
	const count = c.stems[0] + Math.floor(cr() * (c.stems[1] - c.stems[0] + 1));
	for (let i = 0; i < count; i++) {
		const sr = chance(seed, "stem", i);
		const born = c.from + i * c.every * about(sr, 1, .25);
		const bear = i * 2.39996 + about(sr, 0, .3);
		const off = i === 0 ? 0 : c.stool * between(sr, .4, 1);
		const tilt = i === 0 ? about(sr, .05, .03) : c.lean * between(sr, .55, 1.2);
		const local = g - born + 2;
		if (local <= 2) continue;
		const base = top.clone().add(v3(Math.cos(bear) * off, -.02, Math.sin(bear) * off));
		const m = new three.Matrix4().makeTranslation(base.x, base.y, base.z).multiply(new three.Matrix4().makeRotationAxis(v3(-Math.sin(bear), 0, Math.cos(bear)), -tilt));
		const proxy = {
			/** @param {import('./grow.js').Kind} kind @param {THREE.BufferGeometry} geo @param {THREE.Matrix4} [mm] */
			add(kind, geo, mm) {
				if (mm) geo.applyMatrix4(mm);
				geo.applyMatrix4(m);
				bag.add(kind, geo);
				return proxy;
			},
			space: bag.space
		};
		const tall = about(sr, 1, .12) * (1 - .06 * i);
		const spec = {
			...c.leader,
			height: c.leader.height.map(([a, h]) => [a, h * tall])
		};
		const shoots = leaderCrown(proxy, {
			seed: `${seed}·${i}`,
			g: local,
			from: v3(0, 0, 0),
			spec
		});
		const turn = new three.Matrix3().setFromMatrix4(m);
		for (const sh of shoots) {
			sh.pts = sh.pts.map((p) => p.clone().applyMatrix4(m));
			sh.tip = sh.tip.clone().applyMatrix4(m);
			sh.dir = sh.dir.clone().applyMatrix3(turn).normalize();
			sh.key = [
				"stem",
				i,
				...sh.key
			];
			out.push(sh);
		}
	}
	return out;
}
/**
* The alder's root nodules: clusters of knobbly orange-brown lumps on its shallow roots, where Frankia, living in
* them, fixes nitrogen from the air for the alder and, as roots and leaves rot, for the plants round it.
* @param {Bag} bag @param {string} seed @param {number} g @param {THREE.Vector3} at
*/
