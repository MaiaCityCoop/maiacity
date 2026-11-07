	else if (kind === "fig") {
		const t = new three.Mesh(sphere(), barkMat());
		t.scale.set(.03 * size, .7 * size, .03 * size);
		t.position.y = ph + .6 * size;
		g.add(t);
		for (let i = 0; i < 22; i++) {
			const leaf = new three.Mesh(leafGeo(), house.fig());
			leaf.scale.setScalar((.22 + r() * .08) * size);
			leaf.position.set((r() - .5) * .4 * size, ph + (.6 + r() * .9) * size, (r() - .5) * .4 * size);
			leaf.rotation.set(r() * 3, r() * 6, r() * 3);
			g.add(leaf);
		}
	} else if (kind === "snake") for (let i = 0; i < 9; i++) {
		const leaf = new three.Mesh(leafGeo(), house.snake());
		leaf.scale.set(.12 * size, (.6 + r() * .4) * size, 1);
		leaf.position.set((r() - .5) * .18, ph, (r() - .5) * .18);
		leaf.rotation.set((r() - .5) * .3, r() * 6, (r() - .5) * .3);
		g.add(leaf);
	}
