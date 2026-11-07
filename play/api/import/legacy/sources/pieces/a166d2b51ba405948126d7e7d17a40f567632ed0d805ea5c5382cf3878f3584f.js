	else for (let i = 0; i < 30; i++) {
		const a = r() * Math.PI * 2;
		const down = r() * .8 * size;
		const leaf = new three.Mesh(leafGeo(), house.pothos());
		leaf.scale.setScalar(.1 * size);
		leaf.position.set(Math.sin(a) * (pr + .02), ph - down, Math.cos(a) * (pr + .02));
		leaf.rotation.set(r() * 3, a, r() * 3);
		g.add(leaf);
	}
