*/
//#piece 233142b30516032aeddf3225ce96fdc9fb126af4d87b1799bf19858b0d1f26c3
	});
}
/**
* A pinnate leaf (a lentil's, a chickpea's): its rachis out from `at`, leaflets in pairs along it, and a leaflet or a
* tendril at its end. From far off (a world's lower detail) the whole leaf is one feathery blade.
* @param {Bag} bag @param {Blades} blades
* @param {{
*   r: () => number, at: THREE.Vector3, out: THREE.Vector3, lift: number, length: number, pairs: number,
*   leaflet: { length: number, width: number, shape: (u: number) => number, segs: number }, paint: (u: number, v: number) => THREE.Color,
*   stalk: THREE.ColorRepresentation, radius: number, grown: number, old: number, terminal?: boolean, tendril?: number, drop?: number
* }} o — `drop` the part of its leaflets fallen (an old leaf at harvest)
*/
function pinnateLeaf(bag, blades, o) {
	const g = clamp(o.grown);
	if (g <= .02) return;
	const len = o.length * lerp(.3, 1, g);
	const lift = lerp(1.2, o.lift, g) - o.old * .5;
	const d = o.out.clone().setY(0).normalize().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	const pts = arch(o.at, d, len, .3 + o.old * .4, 2);
	const leafLen = o.leaflet.length * lerp(.35, 1, g), leafWide = o.leaflet.width * lerp(.35, 1, g);
	const drop = o.drop ?? 0;
	if (DETAIL.level < .5) {
		if (o.r() < drop) return;
		const end = pts[pts.length - 1];
		blades.add({
			at: o.at,
			dir: end.clone().sub(o.at),
			length: len + (o.terminal ? leafLen * .6 : 0),
			width: leafLen * .8,
			shape: oval,
			segs: 2,
			fold: .2,
			droop: .1,
			paint: o.paint(.5, 0)
		});
		return;
	}
	wire(bag, blades, pts, o.radius, () => o.stalk, 3, o.out);
	const fold = .35 * (1 - g) + .12;
	for (let k = 0; k < o.pairs; k++) {
		const u = lerp(.3, .92, o.pairs === 1 ? 1 : k / (o.pairs - 1));
		const p = point(pts, u), t = towards(pts, u);
		const across = new three.Vector3().crossVectors(t, UP);
		if (across.lengthSq() < 1e-6) across.set(1, 0, 0);
		across.normalize();
		for (const side of [-1, 1]) {
			const size = lerp(.8, 1, k / Math.max(1, o.pairs - 1)) * about(o.r, 1, .08);
			if (o.r() < drop) continue;
			const dir = across.clone().multiplyScalar(side * .85).addScaledVector(t, .45).add(v3(0, -.1 - o.old * .4, 0)).normalize();
			blades.add({
				at: p,
				dir,
				length: leafLen * size,
				width: leafWide * size,
				shape: o.leaflet.shape,
				segs: o.leaflet.segs,
				fold,
				droop: .08 + o.old * .3,
				paint: o.paint
			});
		}
	}
	const end = pts[pts.length - 1], t = towards(pts, 1);
	if (o.terminal && o.r() >= drop) blades.add({
		at: end,
		dir: t,
		length: leafLen,
		width: leafWide,
		shape: o.leaflet.shape,
		segs: o.leaflet.segs,
		fold,
		droop: .1 + o.old * .3,
		paint: o.paint
	});
	if (o.tendril) {
		const tp = [end.clone()];
		const td = t.clone();
		const axis = new three.Vector3().crossVectors(t, UP).normalize();
		for (let k = 0; k < 5; k++) {
			td.applyAxisAngle(axis, -.55 * (k + 1) * .5).normalize();
			tp.push(tp[k].clone().addScaledVector(td, o.tendril * g / 5));
		}
		blades.strip(tp, 7e-4, () => o.stalk, o.out);
	}
}
