		at: pts[k].clone().lerp(pts[k + 1], f - k),
		dir: pts[k + 1].clone().sub(pts[k]).normalize()
	};
}
/**
* The leaves of a shoot: a whorl at its tip (and a few below it), or one by one all along it. A new flush its own
* colour (the mango's bronze-red, the lemon's purple), darkening as it hardens.
* @param {Bag} bag @param {Orchard} spec @param {string} seed @param {number} g @param {import('./crown.js').Shoot} sh
