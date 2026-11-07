//#region src/lib/actors/clicklock.js
/** the ClickLock's card, shared by every machine that uses one */
const CLICKLOCK = {
	label: "ClickLock",
	what: "Our one snap-in latch: slide it in and two spring pawls click into the keepers on the rails; press the flush tab on its face and both let go, and it slides out. No tool, no screw.",
	specs: [
		["Hold", "2 spring pawls, ~300 N each [inferred]"],
		["Release", "One flush tab, ~20 N"],
		["Used by", "BatteryPack, BatteryCube"]
	]
};
/**
* The sliding half: a pawl on each side `half` from the middle, `back` behind the face, at height z; the release tab
* on the face (y = face) at height `tabZ`; with `withTab` false a grip's trigger releases it instead.
//#piece 32dbd7309a0f19340cc93ea8e98bf3e2181f9e8f887e66773eeaf597b0707545
* @param {{ half: number, face: number, z: number, tabZ: number, back?: number, steel?: string, tab?: string, withTab?: boolean }} o
*/
function clickLatch(box, put, { half, face, z, tabZ, back = 40, steel = "#8d9396", tab = "#3a3f44", withTab = true }) {
	for (const sx of [-1, 1]) put(box(sx * (half + 3), face - back, z, 6, 12, 8, 1), steel);
	if (!withTab) return;
	put(box(0, face + 1.5, tabZ, 64, 3, 12, 1.5), tab);
	put(box(0, face + 3.2, tabZ, 40, .6, 2, .3), "#d9dcde");
}
/**
