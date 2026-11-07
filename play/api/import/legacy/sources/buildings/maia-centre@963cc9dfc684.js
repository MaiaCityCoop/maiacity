//#piece f146fbf72edada4bfa3d771384d376a5fb3b6509729847bf501db8cd1674917d
//#region src/lib/models/wayside.js
const m = /* @__PURE__ */ (() => ({
//#piece 5a336f3e7c229536c1fb448a76aed44b41c85111e3d056c6b271fd28abd8b3aa
//#piece 9fe27507681d2366e18395ec1e1fe6a4d8c6f034b61af66d45ef1e65efd814e4
	return g;
}
//#piece 68293c5870696f3ce93df9a1784dc11117bb1f98d354a37d77b377bf702d2387
	return g;
}
//#piece e573ce10117d6c26d0c1296d1c8eb01374c349beaf67bba8f08aa33613039486
	return g;
}
/** A place: the MaiaCity centre as the newcomer finds it, where the dusty highway ends: the road comes in from the
*  west (−x) and stops at this place's origin, the abandoned gas station's forecourt facing its end, the bus stop on
*  its south side, the old travel van pulled up at it, its side door to the stop. About 70 × 30 m. */
function maiaCentre({ withVan = true, withRoad = true } = {}) {
	const g = new three.Group();
	g.name = "maia-centre";
	const road = new three.Mesh(new three.PlaneGeometry(60, 7), m.sand());
	road.rotation.x = -Math.PI / 2;
	road.position.set(-30, .02, 0);
	road.receiveShadow = true;
	if (withRoad) g.add(road);
	const stop = busStop();
	stop.position.set(-14, 0, -6.5);
	const station = gasStation();
	station.position.set(10, 0, 0);
	station.rotation.y = -Math.PI / 2;
	g.add(stop, station);
	if (withVan) {
		const van = travelVan();
		van.position.set(-14, 0, -1.8);
		van.rotation.y = Math.PI / 2;
		g.add(van);
	}
//#piece 844380e3a4ea99bd12755544e70a85d5da6f40b258de1a1f2b89851ea6275878
	id: "maia-centre",
	label: "MaiaCity centre",
	group: "Places",
	note: "the centre of the city plot today, where the sand highway ends: the abandoned gas station at the road’s end, the bus stop, the travel van pulling in. Where the story starts",
	usedIn: "MaiaCity V1",
	make: () => maiaCentre()
}])();
//#piece bc2f000888a03e3cbc16d5fcb09bcb5fe1b4711c42bea1627bce347b7b9dac7b
