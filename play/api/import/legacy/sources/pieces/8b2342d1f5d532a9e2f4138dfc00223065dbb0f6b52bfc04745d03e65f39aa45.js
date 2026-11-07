		}
		for (let i = 0; i < 6; i++) parts.push({
			geo: limb(pts[i], pts[i + 1], .017 * (1 - i / 7) + .003, .017 * (1 - (i + 1) / 7) + .003, { seg: 8 }),
			color: i % 2 ? "#7a6a58" : "#6c5c4b",
			bone: "head"
		});
	}
	if (L.beard) parts.push({
		geo: spike([
			0,
