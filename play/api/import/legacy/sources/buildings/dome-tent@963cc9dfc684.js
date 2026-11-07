//#piece c2cad93079f1dc543d36b739e10cbc830363caf4cd9abeeb42ca02d728322c1a
	setPitch(pitch);
	return g;
}
//#piece 2221ac7a890efd4f92fa5749000b3b41f28e11d70ff2012bf5861ecfcd1d096a
	return g;
}

//#endregion
//#region src/lib/buildings/tent.js
/** The bell tent pitched, the fire place lit in front of its door: one object, the tent's foot at the origin. */
function tentSite() {
	const g = new three.Group();
	g.name = "bell-tent-site";
	const tent = bellTent();
	const fire = firePlace();
	fire.position.set(BELL_TENT.fire.x, 0, BELL_TENT.fire.z);
	g.add(tent, fire);
	g.userData = {
		setPitch: tent.userData.setPitch,
		fire: fire.userData.fire,
		tick: fire.userData.tick,
		walk: {
			x: 0,
			z: BELL_TENT.R + 1,
			yaw: 0,
			lamps: []
		}
	};
//#piece 962515424d4d5b8eca1292c5b8bd7e477caaa95068741ccffe32436363b6abe9
const HISTORY = { "dome-tent": [{
	v: 1,
	date: "2026-10-05",
	note: "Sandbox 3’s tent: its interior, raised by that world’s own code (./inside.js)"
}, {
	v: 2,
	date: "2026-10-17",
	note: "Built in the asset box: the Things’ bell tent, pitched, and its fire place lit in front of its door; walked in by its own shape, pitched again, the fire lit or put out"
}] };
//#piece cee74b027bf2fa660a8f66c3439de5cabe3f507764f2329c5d52fbad31afa634
const CONTAINER_LIST = [];
//#piece 3f47ee2d949c9a770f3515a410352fdcc5f315396757a5e0120acaf0e00683b1
const WAYSIDE_LIST = /* @__PURE__ */ (() => [{
	id: "dome-tent",
	label: "Bell tent",
	group: "Tents and domes",
	note: "the bell tent pitched, its fire place lit in front of its door. Walk in",
	usedIn: "Sandbox 3",
	make: () => tentSite()
}])();
//#piece bc2f000888a03e3cbc16d5fcb09bcb5fe1b4711c42bea1627bce347b7b9dac7b
