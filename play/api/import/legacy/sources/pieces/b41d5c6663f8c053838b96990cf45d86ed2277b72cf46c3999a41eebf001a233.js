//#region src/lib/assets/register.js
/**
* @template {{ id: string }} T
* @param {T[]} items
* @param {keyof T} key
* @param {Record<string, (import('../app/versions.js').Change & { build?: any })[]>} [history]
*/
function registerAssets(items, key, history = {}) {
	const ids = /* @__PURE__ */ new Set();
	for (const item of items) {
		if (!item.id || /[@:?/]/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate asset identity: ${item.id}`);
		ids.add(item.id);
		const changes = history[item.id];
		if (changes && (!changes.length || changes.some((change, index) => change.v !== index + 1 || !/^\d{4}-\d{2}-\d{2}$/.test(change.date)))) throw new Error(`Invalid asset history: ${item.id}`);
	}
	const registered = versioned(items, key, history);
	for (const item of registered) for (const version of item.versions) {
		if (!version.kept) continue;
		const build = version.build;
		if (typeof build === "function") continue;
		if (!Array.isArray(build) || !build.length) throw new Error(`Missing builder: ${item.id}@${version.v}`);
		const variants = /* @__PURE__ */ new Set();
		for (const variant of build) {
			if (!variant.id || variants.has(variant.id) || typeof variant.make !== "function") throw new Error(`Invalid variant: ${item.id}@${version.v}`);
			variants.add(variant.id);
		}
	}
	return registered;
}

//#endregion
//#region src/lib/sandbox-2/interior/interior.ts
//#piece 63fab91d4b9d58a1a9d577fe992123f83520748a73bd84a43e445b7c0478602d
*/
const DOMES = {
	tent: {
		label: "Bell tent",
		people: "two people",
		diameter: 4.2,
		detail: 0,
		strut: 0
	},
	glamp: {
		label: "Glamping dome",
		people: "four people",
		diameter: 16,
		detail: 3,
		strut: .06
	},
	home: {
		label: "Small dome",
		people: "twelve people",
		diameter: 40,
		detail: 4,
		strut: .09,
		gallery: {
			height: 4.2,
			depth: 8,
			rooms: 6,
			floors: 1
		}
	},
	large: {
		label: "Medium dome",
		people: "twenty-four people",
		diameter: 70,
		detail: 5,
		strut: .12,
		gallery: {
			height: 5,
			depth: 10.5,
			rooms: 10,
			floors: 2
		}
	},
	grand: {
		label: "Large dome",
		people: "forty-eight people",
		diameter: 100,
		detail: 6,
		strut: .14,
		gallery: {
			height: 5.5,
			depth: 11.5,
			rooms: 12,
			floors: 2
		}
	},
	master: {
		label: "Master dome",
		people: "the commons",
		diameter: 136,
		detail: 7,
		strut: .16,
		gallery: {
			height: 6,
			depth: 12.5,
			rooms: 16,
			floors: 2
		}
	},
	factory: {
		label: "Solar factory dome",
		people: "the factory coop",
		diameter: 136,
		detail: 7,
		strut: .16
	}
};
/** The big domes have four doors, one to each point of the compass; the glamping dome has one; the large dome
*  none to the north, where its pond lies against a closed wall. */
const DOORS = /* @__PURE__ */ (() => [
	0,
	Math.PI / 2,
	Math.PI,
	-Math.PI / 2
])();
const doorsOf = (kind) => kind === "glamp" || kind === "tent" ? [0] : kind === "grand" ? DOORS.slice(1) : DOORS;
/** The large dome's closed north: its shell north of this line (z, a seventh of the dome's width in from the north
*  wall) is massive stone, over its pond. Null in every other dome. */
const tankLine = (kind, R) => kind === "grand" ? R - 2 * R / 7 : null;
/** A door's half-width, and its height at the top of the arch (the glamping door is square-headed). */
const doorSize = (kind) => kind === "tent" ? {
	dw: .55,
	dh: 1.8,
	top: 1.8
} : kind === "glamp" ? {
	dw: .75,
	dh: 2.5,
	top: 2.5
} : {
	dw: 1.3,
	dh: 3,
	top: 3.52
};
/** The signed difference between two angles, in -π..π. */
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
//#piece 2d75f529b5d4b179fb8f9db147c96dbff769b65474b431e2a3b51d33b27dfc28
//#piece 648289f106d5d2ff891bed8b56214ea819aa58bf067adea5c455588158c435d7
	};
};
/** Polar placement: angle 0 faces +z, clockwise to +x — the same sense as three's cylinders. */
const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
//#piece c31102153abc81c31971f6e252410b489abd287523c8ad24cf02d3f5eeb5526f
