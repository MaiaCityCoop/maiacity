		color: "#b8c34a",
		roughness: .6
	}))
}))();
//#piece 205fe7b61eeba25966b00fa8b2ac2ab186e52c1d4b586a06b127bf7b4ef50a6a
function hang(group, r, cy, rx, ry, n, mat, size) {
	for (let i = 0; i < n; i++) {
		const a = r() * Math.PI * 2, d = .55 + r() * .45;
		const m = new three.Mesh(sphere(), mat);
		m.position.set(Math.cos(a) * rx * d, cy - ry * (.2 + r() * .5), Math.sin(a) * rx * d);
		m.scale.set(...size);
		m.castShadow = true;
		group.add(m);
	}
}
