			const finGeo = GEO.merge(fins);
			const liner = GEO.lathe([
				[ENGINE.bore / 2, .095],
				[ENGINE.bore / 2 + .0065, .095],
				[ENGINE.bore / 2 + .0065, ENGINE.deck],
				[ENGINE.bore / 2, ENGINE.deck]
			], 48);
			const barrel = new three.Group();
			barrel.add(m(onBank(finGeo, sx), M.castAl), m(onBank(liner, sx), M.castIron));
			part({
				id: `cylinder-${side}`,
				label: `Cylinder, ${side}`,
