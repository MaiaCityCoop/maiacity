			what: "In the V: the carburettor mixes petrol into the air the cleaner gives it, its throttle opened by the governor, and the manifold carries the charge to both heads.",
			moves: "Its throttle plate opens and closes with the governor.",
			drive: "The governor",
			specs: [["Throttle", "Butterfly, governed"], ["Choke", "Cable, from the panel"]]
		}, carb, { explode: [
			0,
			.16,
			.1
		] });
		moving.throttle = throttle;
		const element = GEO.lathe([
			[.05, .482],
			[.08, .482],
			[.08, .525],
			[.05, .525]
		], 72);
		const pos = element.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x);
			if (Math.hypot(x, z) > .075) {
				const k = 1 + .06 * Math.cos(a * 36);
				pos.setX(i, x * k);
				pos.setZ(i, z * k);
			}
		}
		element.computeVertexNormals();
		const cleaner = [
