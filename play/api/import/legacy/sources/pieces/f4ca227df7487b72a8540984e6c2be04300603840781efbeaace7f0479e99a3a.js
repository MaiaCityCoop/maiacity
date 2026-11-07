	return {
		group: g,
		colliders: [
			{
				x: 0,
				z: -1.2,
				r: 1.3
			},
			{
				x: -1.3,
				z: .8,
				r: 1.3
			},
			{
				x: 1.3,
				z: .8,
				r: 1.3
			}
		]
	};
}
/** the plain surfaces the 3D models viewer builds the timber coop and hutch with (their v1), away from any world */
function plainKit() {
	const c = (hex, rough = .8) => new three.MeshStandardMaterial({
		color: hex,
		roughness: rough
	});
	const box = (w, h, d, mat, x = 0, y = 0, z = 0, rotY = 0) => {
		const m = new three.Mesh(new three.BoxGeometry(w, h, d), mat);
		m.position.set(x, y + h / 2, z);
		m.rotation.y = rotY;
		m.castShadow = m.receiveShadow = true;
		return m;
	};
	const none = () => new three.Group();
	return {
		box,
		table: none,
		sofa: none,
		lantern: none,
		oak: c("#a8774c", .82),
		lime: c("#d9d2c2", .9),
		stone: () => c("#a9a49a", .85),
		dark: c("#23262a", .5),
		steel: c("#2e3236", .4),
		counter: c("#f3f1ec", .3),
		timber: c("#9c6b3f", .6),
		linen: c("#f1ece2", .95),
		cushion: c("#c47a4a", .9),
		rug: c("#b9a589", 1),
		paper: c("#fff4e2", .9)
	};
}
