		const where = (s) => {
			const f = Math.min(pts.length - 1.0001, s / b.step), k = Math.floor(f);
			return {
				p: pts[k].clone().lerp(pts[k + 1], f - k),
				d: pts[k + 1].clone().sub(pts[k]).normalize(),
