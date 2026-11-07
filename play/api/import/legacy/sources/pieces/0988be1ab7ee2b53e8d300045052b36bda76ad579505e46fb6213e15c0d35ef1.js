		const lengths = [0];
		for (let i = 1; i < sh.pts.length; i++) lengths.push(lengths[i - 1] + sh.pts[i].distanceTo(sh.pts[i - 1]));
		const total = lengths[lengths.length - 1];
