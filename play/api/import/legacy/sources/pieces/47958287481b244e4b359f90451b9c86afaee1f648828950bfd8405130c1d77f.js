		const throttle = new three.Group();
		throttle.position.set(.032, .42, CRANK.z + .02);
		throttle.add(lever);
		carb.push(throttle);
		part({
			id: "carburettor",
			label: "Carburettor and intake",
