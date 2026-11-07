	for (let i = 0; i < p.count; i += 3) {
		const tri = [
			0,
			1,
			2
		].map((k) => new three.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
		if ((tri[0].y + tri[1].y + tri[2].y) / 3 < -R * .02) continue;
