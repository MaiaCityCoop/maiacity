		for (const name in p) {
			const t = p[name];
			if (!t) continue;
			if (name === "root") list[0].position.add(move.set(t[0], t[1], t[2]));
			else {
				const b = byName[name];
				if (!b) continue;
				b.rotation.set(t[0], t[1], t[2]);
				if (t.length >= 4) b.scale.setScalar(t[3]);
				if (t.length === 7) b.position.add(move.set(t[4], t[5], t[6]));
			}
		}
	};
}
