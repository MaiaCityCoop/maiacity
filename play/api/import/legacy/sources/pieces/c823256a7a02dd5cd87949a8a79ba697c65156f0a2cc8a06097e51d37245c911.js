/** A turned pot, for the pottery shelves and the planters. */
function pot(mat, h, seed) {
	const r = seeded(seed);
	const w = .4 + r() * .5;
	const pts = [
		0,
		.15,
		.45,
		.75,
		.95,
		1
	].map((t) => new three.Vector2(h * (.25 + Math.sin(t * Math.PI * (.8 + r() * .3)) * w * .5 + (t > .9 ? .05 : 0)), t * h));
	const m = new three.Mesh(new three.LatheGeometry(pts, 14), mat);
	m.castShadow = true;
	return m;
}
//#piece 4f60a176d56cad3cfbbd14f9e6860be98a26c03a765515821a9f89db0c4942b1
	return g;
}
