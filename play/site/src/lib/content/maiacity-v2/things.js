// @ts-nocheck — plain JS, kept loose on purpose
/*
 * MAIACITY V1'S THINGS — every library asset the world draws, by its ref at its version (built in the asset box, drawn
 * by ./drawn.js), never by calling a builder; and the measures the world lays its story out by: numbers a builder
 * decides (the pickup's tailgate, the ramp's run, the tent's fire place) that the world needs before anything is built.
 * They are written down here; no test holds them to the builders today (its test is gone).
 */
import { slotRef } from '$lib/content/assets/catalog.js';
import { SANDBOX } from '$lib/kernel/sandboxes.js';

/** the library's assets the world puts in, each by its slot of Sandbox 3's pins (each the build V2 drew: ../assets/catalog.js `resolve`) */
const slot = (key) => slotRef(SANDBOX.three, key);
export const THINGS = {
	water: slot('water'),
	busStop: slot('busStop'),
	gasStation: slot('gasStation'),
	shed: slot('shed'),
	solar: slot('solar'),
	ramp: slot('ramp'),
	battery: slot('battery'),
	cube: slot('cube'),
	pickup: slot('pickup'),
	tent: slot('tent'),
	fire: slot('fire'),
	bag: slot('bag'),
	pack: slot('pack'),
	stake: slot('stake'),
	earth: slot('earth'),
	van: slot('van'),
	containerKitchen: slot('containerKitchen'),
	containerSanitary: slot('containerSanitary'),
	containerTech: slot('containerTech'),
	containerWorkshop: slot('containerWorkshop'),
	domeGlamp: slot('domeGlamp')
};

/** the MaiaCity centre's bus stop and gas station in its own ground (x, z, turn) */
export const CENTRE_AT = {
	busStop: { x: -14, z: -6.5, turn: 0 },
	gasStation: { x: 10, z: 0, turn: -Math.PI / 2 }
};

/** the pickup (things/pickup@3), its frame (+z front, +x left): its tailgate's hinge and length (let down flat, it
 *  reaches out behind by that); the driver's and passenger's hips on their seats */
export const PICKUP = {
	tailgate: -2.62,
	gate: 0.44,
	driver: { x: 0.42, y: 0.84, z: 0.62 },
	passenger: { x: -0.42, y: 0.84, z: 0.62 }
};

/** the loading ramp (things/loading-ramp@1): how high its lip rises and how far its foot runs out from it */
export const RAMP = { rise: 1.16, run: 2 };

/** the bell tent (things/bell-tent@1): its radius at the ground, how far its guy pegs stand out from it, the stretch
 *  of its pitch (0 … 1) each step takes, and where its fire place stands in front of it (the tent's own frame) */
export const BELL_TENT = {
	R: 2.1,
	guyOut: 1.5,
	steps: { groundsheet: [0, 0.12], canvas: [0.12, 0.2], pole: [0.2, 0.42], wall: [0.42, 0.56], guys: [0.56, 0.78], door: [0.78, 0.86], inside: [0.86, 1] },
	fire: { x: 1.2, z: 4.2 }
};

/** what of the pitched bell tent and its fire place stands in a walker's way, as circles */
export const TENT_WALK = {
	r: 2.1,
	door: 0.55,
	headroom: 1.2985346840701377,
	colliders: [
		{ x: 0, z: 0, r: 0.2 },
		{ x: 0.95, z: 0.45, r: 0.35 },
		{ x: -1.3, z: 0.1, r: 0.28 },
		{ x: -1.25, z: 0.55, r: 0.28 }
	]
};
export const FIRE_WALK = {
	colliders: [
		{ x: 0, z: 0, r: 0.75 },
		{ x: -1.2, z: 0.6, r: 0.4 },
		{ x: 0.9, z: 1.1, r: 0.4 },
		{ x: -1.55, z: -0.2, r: 0.45 }
	]
};

/** the bell tent's lantern (part `lantern`, the children's path to it), turned up at dusk; and how the world finds the
 *  canvas's material, its emissive turned warm at night */
export const TENT_LAMP = { part: 'lantern', path: [0, 2] };
export const TENT_CLOTH = { emissive: 0x5a4c34 };

/** the tent's bag (things/bell-tent-bag@1): what was in it, the last of its build's own parts, in this order */
export const BAG_PARTS = ['canvas', 'groundsheet', 'pole', 'wallPoles', 'pegs'];

/** the fire place (things/fire-place@1): the stretch of its build (0 … 1) its fire catches over, the last: built that
 *  far it burns as much as the ease of how far into it it is */
export const FIRE_CATCHES = [0.86, 1];

/** where the work is as the tent is pitched to k (its frame), its builder's `work` read off its places: groundsheet,
 *  pegs, canvas, poles, guys (each at its turn round the ring, the door's left out), door, things put down */
const round = (of, r, from, to) => Array.from({ length: to - from + 1 }, (_, j) => (((from + j + 0.5) / of) * Math.PI * 2)).map((a) => ({ a, x: Math.sin(a) * r, z: Math.cos(a) * r }));
const TENT_WORK = {
	sheetPegs: round(14, BELL_TENT.R + 0.03, 1, 12),
	wallPegs: round(22, BELL_TENT.R + 0.04, 1, 20),
	guys: round(12, 1, 1, 10).map((p) => p.a),
	spots: [[0, 0.55], [0, -0.6], [0, -0.6], [0, -1.2], [0.75, 0.6], [0.75, 0.6], [0.75, 0.6], [-0.9, 0.3], [0.3, 0.3]]
};
export function tentWork(k) {
	const { R, guyOut, steps } = BELL_TENT, { sheetPegs, wallPegs, guys, spots } = TENT_WORK;
	const clamp = (x) => Math.min(1, Math.max(0, x)), ease = (x) => x * x * (3 - 2 * x);
	const span = (x, [a, b]) => clamp((x - a) / (b - a));
	const at = (x, z) => ({ x, y: 0, z }), ring = (a, r) => at(Math.sin(a) * r, Math.cos(a) * r);
	const nth = (list, f) => list[Math.min(list.length - 1, Math.floor(f * list.length))];
	k = clamp(k);
	if (k <= steps.groundsheet[1]) {
		const gs = span(k, steps.groundsheet);
		if (gs < 0.7) return at(0, R - 2 * R * ease(clamp((gs - 0.35) / 0.35)));
		const p = nth(sheetPegs, clamp((gs - 0.7) / 0.3));
		return at(p.x, p.z);
	}
	if (k <= steps.canvas[1]) return at(0, R * 0.6 * (1 - span(k, steps.canvas)));
	if (k <= steps.pole[1]) return at(0, 0);
	if (k <= steps.wall[1]) {
		const ws = span(k, steps.wall);
		if (ws < 0.6) return ring(nth(guys, ws / 0.6), R + 0.3);
		const p = nth(wallPegs, (ws - 0.6) / 0.4);
		return at(p.x, p.z);
	}
	if (k <= steps.guys[1]) return ring(nth(guys, span(k, steps.guys)), R + guyOut - 0.3);
	if (k <= steps.door[1]) return at(0, R + 0.4);
	const [x, z] = nth(spots, span(k, steps.inside));
	return at(x, z);
}

/** a tree's plant stake, its flag printed with the tree's name and its plant (things/plant-stake@2) */
export const stakeRef = (name, seed) => `${THINGS.stake}?${new URLSearchParams({ name, seed })}`;
/** the stake's flag (the cloth on its wire, shown once a seed is picked): the path of children down to it */
export const STAKE_FLAG = { path: [14] };

/** the open backpack (things/backpack@2): the seeds' packets in it, each its node `seed-packet:<id>` (its bottle is
 *  `water-bottle`, its cap `cap`, what is in it `inside`), and where the bottle pours from, up its own upright */
export const PACK_PACKETS = ['apple', 'pear', 'cherry', 'plum', 'apricot', 'quince', 'mulberry', 'walnut', 'chestnut', 'hazel'];
export const BOTTLE_MOUTH = 0.268;

/** the people: the rigged stand-in (actors/stand-in@11) at their height and look (./van.js PEOPLE), moves from the box's tables */
const STAND_IN = slot('stand-in');
/** the elder woman of seat C */
export const ELDER_WOMAN = slot('elder-woman');
/** a person's ref: their height (m) and what of their look is not the stand-in's, by name, in a steady order */
export const standInRef = (height, look = {}) =>
	`${STAND_IN}?${new URLSearchParams(Object.entries({ height, ...look }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, String(v)]))}`;
/** the stand-in's walk comes round every 1.05 s: played within one round, its tables (32 s, end blended into start) never read across the seam */
export const WALK_CYCLE = 1.05;
