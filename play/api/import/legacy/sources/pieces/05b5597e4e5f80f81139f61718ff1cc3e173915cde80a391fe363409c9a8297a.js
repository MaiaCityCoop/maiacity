	const c = new three.Color(colour);
	bag.add("body", tube(pts, (u) => radius * (u < .1 ? .5 + 5 * u : 1 - .45 * u * u), (u) => c.clone().multiplyScalar(.85 + .25 * u), 5));
//#piece 48edcb33ecc24b25ed53610de749e7738fbcc1f9f6eca168663172bb6524d4c9
//#piece d4df3743b507bcf919cf22c24156209a6c9ed6e0389a9e88f75f0fe833928716
