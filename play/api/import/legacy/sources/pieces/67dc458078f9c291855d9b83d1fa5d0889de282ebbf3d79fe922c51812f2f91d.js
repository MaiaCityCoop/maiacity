		x * S$1,
		z * S$1,
		y * S$1
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S$1, h * S$1, l * S$1, L(x, y, z), r * S$1) : new three.BoxGeometry(w * S$1, h * S$1, l * S$1).translate(...L(x, y, z)));
//#piece e78dcee97b27a60a50b2ed16f0f310028721a76e629e4129ccfc274f7cfa4386
		const g = new three.CylinderGeometry(r * S$1, r * S$1, A.distanceTo(B), n);
//#piece 393c6a3327995c6fa5cbd4541daa35e045a6b13413ecf8c8f58fc6166e60c809
