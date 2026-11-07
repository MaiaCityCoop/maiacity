//#piece c2cad93079f1dc543d36b739e10cbc830363caf4cd9abeeb42ca02d728322c1a
	setPitch(pitch);
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
const HISTORY = /* @__PURE__ */ (() => ({ "bell-tent": [{
	...FIRST,
	date: "2026-10-14",
	note: "The Buildings’ bell tent made a model in its 20 parts, pitched step by step: the groundsheet, the canvas spread, the pole walked up, the wall poles and pegs, the guy ropes, the door rolled back, the things brought in and the lantern lit"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "bell-tent",
	label: "Bell tent",
	note: "our bell tent: cotton canvas 4.2 m across on one centre pole 3 m high, a wall of 75 cm all round, a door 1.1 × 1.8 m whose flaps roll back to either side; ten wall poles under its eave, ten guy ropes out to pegs 1.5 m from the wall, a bathtub groundsheet zipped in. Inside two mats and sleeping bags, a crate for a table, two packs, a hurricane lantern on the pole. It is in its 20 parts: pick one for its card, show it alone, explode the tent, pitch it step by step; step inside",
	usedIn: "MaiaCity V1",
	make: () => bellTent(),
	variants: [
		{
			id: "bell-tent-pitched",
			label: "Pitched",
			note: "standing, its door rolled back, the things in and the lantern lit",
			make: () => bellTent()
		},
		{
			id: "bell-tent-groundsheet",
			label: "Groundsheet",
			note: "the groundsheet unfolded and pegged down",
			make: () => bellTent({ pitch: .12 })
		},
		{
			id: "bell-tent-canvas",
			label: "Canvas spread",
			note: "the canvas spread out over it, the door at the front",
			make: () => bellTent({ pitch: .2 })
		},
		{
			id: "bell-tent-pole",
			label: "Pole going up",
			note: "the centre pole being walked upright under the canvas",
			make: () => bellTent({ pitch: .31 })
		},
		{
			id: "bell-tent-pole-up",
			label: "Pole up",
			note: "the pole standing, the eave still hanging, the wall loose",
			make: () => bellTent({ pitch: .42 })
		},
		{
			id: "bell-tent-wall",
			label: "Wall pegged",
			note: "the wall poles under the eave and the wall’s foot pegged out",
			make: () => bellTent({ pitch: .56 })
		},
		{
			id: "bell-tent-guys",
			label: "Guys out",
			note: "the guy ropes run out to their pegs and tight, the door still closed",
			make: () => bellTent({ pitch: .78 })
		},
		{
			id: "bell-tent-door",
			label: "Door open",
			note: "the door’s flaps rolled back and tied, nothing in it yet",
			make: () => bellTent({ pitch: .86 })
		}
	]
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
