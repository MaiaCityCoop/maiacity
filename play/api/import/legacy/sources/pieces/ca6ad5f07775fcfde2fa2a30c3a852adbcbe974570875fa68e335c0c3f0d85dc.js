		}) : spec.leader ? leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		}) : [];
		const space = bag.space;
		const onWood = f.sites === "trunk" || f.sites === "limbs";
		for (const sh of shoots) {
			if (sh.gen > 2 || sh.radius <= .01) continue;
			if (!onWood) space.rod(sh.pts, sh.radius + .01);
			else for (let i = 0; i + 1 < sh.pts.length; i++) space.rods.push({
