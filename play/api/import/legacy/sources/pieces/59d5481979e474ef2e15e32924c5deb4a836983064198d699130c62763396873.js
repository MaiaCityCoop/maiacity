		x * S,
		z * S,
		y * S
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 2) => T(block(w * S, h * S, l * S, L(x, y, z), r * S));
	const bar = (a, b, w, h, r = 2) => T(beam(L(...a), L(...b), w * S, h * S, r * S));
//#piece d2ca4bab6a379ab60cac7c1a914826ca5766b5a220a624f17057025bb684ee21
		const g = new three.CylinderGeometry(r1 * S, r * S, A.distanceTo(B), seg);
//#piece 393c6a3327995c6fa5cbd4541daa35e045a6b13413ecf8c8f58fc6166e60c809
	const hose = (pts, r = 9.5) => T(new three.TubeGeometry(new three.CatmullRomCurve3(pts.map((p) => new three.Vector3(...L(...p)))), 24, r * S, 8, false));
//#piece b30e53550ff5a0e79d8036ccc899e40e62d826ee3e9da8cbe8bd595f33082c6d
			], t, leg).translate(sx * (-t / 2) * S, 0, 0));
