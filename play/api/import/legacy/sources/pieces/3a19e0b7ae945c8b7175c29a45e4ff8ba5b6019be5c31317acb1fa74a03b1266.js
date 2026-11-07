		return {
			p: pts[k].clone().lerp(pts[k + 1], f - k),
			d: pts[k + 1].clone().sub(pts[k]).normalize()
		};
	};
