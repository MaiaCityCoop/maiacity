//#piece 1e2b17470c79ceb1daa9c1c785aa97a42cb96467353a4fc54ef9743f9fc9bc57
//#piece ac3ab52097d6e3ce7420d8bcd96fc905ff928ce27ed8f8582295f6a56cb5c2e0
//#piece bb105e2a9696a7151c97a449ba10936eaff3baaaa4e4b41dd84dc190b9f6cbca
const lerp = /* @__PURE__ */ (() => three.MathUtils.lerp)();
//#piece f52dfe08bf448ef319567e33e676e9f419fb4e62d242f9f73e4ae9c78b96a0d8
}
//#piece 2221ac7a890efd4f92fa5749000b3b41f28e11d70ff2012bf5861ecfcd1d096a
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
const HISTORY = /* @__PURE__ */ (() => ({ "fire-place": [{
	...FIRST,
	date: "2026-10-14",
	note: "The bell tent’s fire place in its parts, built step by step and lit"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "fire-place",
	label: "Fire place",
	note: "the bell tent’s fire place, in front of its door: a ring of field stones 1.2 m across round a bed of ash, four logs in a tepee, the flames and their light, two green folding camp chairs facing the fire, a woodpile of nine split logs on two bearers. In its parts, built step by step, lit or put out",
	usedIn: "MaiaCity V1",
	make: () => firePlace(),
	variants: [
		{
			id: "fire-place-lit",
			label: "Burning",
			note: "built and lit",
			make: () => firePlace()
		},
		{
			id: "fire-place-laid",
			label: "Laid",
			note: "built, the logs over the kindling, not lit",
			make: () => firePlace({ lit: 0 })
		},
		{
			id: "fire-place-ring",
			label: "Ring of stones",
			note: "the ring of stones set, nothing else yet",
			make: () => firePlace({ built: .28 })
		}
	]
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
