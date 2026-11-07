/** A canopy of crossed leaf cards filling an ellipsoid. */
function canopy(group, r, cx, cy, cz, rx, ry, cards, mat, cardSize) {
	for (let i = 0; i < cards; i++) {
		const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = Math.cbrt(r());
		const m = new three.Mesh(card(), mat);
		m.position.set(cx + Math.sin(v) * Math.cos(u) * rx * d, cy + Math.cos(v) * ry * d, cz + Math.sin(v) * Math.sin(u) * rx * d);
		m.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
		m.scale.setScalar(cardSize * (.8 + r() * .5));
		m.castShadow = true;
		group.add(m);
	}
}
