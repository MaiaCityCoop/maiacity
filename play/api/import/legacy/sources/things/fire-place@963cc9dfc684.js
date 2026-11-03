Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);

//#region src/lib/models/parts.ts
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const std = (color, roughness = .8, more = {}) => shared(() => new three.MeshStandardMaterial({
	color,
	roughness,
	...more
}));

//#endregion
//#region src/lib/models/belltent.js
const m = /* @__PURE__ */ (() => ({
	pole: std("#9c6b3f", .6),
	ferrule: std("#8e9398", .4, { metalness: .7 }),
	steel: std("#3a3d40", .5, { metalness: .6 }),
	rope: std("#d8ccb0", 1),
	runner: std("#a77d4f", .7),
	sheet: std("#5c6650", .95),
	rim: std("#4f5845", .9, { side: three.DoubleSide }),
	rubber: std("#1c1d1e", .8),
	hook: std("#c8742c", .6),
	rug: std("#b9a589", 1),
	mat: std("#2f3438", .9),
	bagA: std("#2f6f73", .8),
	bagB: std("#b5553a", .8),
	linen: std("#f1ece2", .95),
	crate: std("#a98256", .8),
	groove: std("#6f5232", .85),
	enamel: std("#f4f1ea", .35),
	enamelRim: std("#2c4a6e", .4),
	book: std("#c47a4a", .9),
	pages: std("#efe6d2", .9),
	enamelIn: std("#f4f1ea", .35, { side: three.DoubleSide }),
	packA: std("#56643f", .9),
	packB: std("#7a4a32", .9),
	strap: std("#1e1f1f", .75),
	lantern: std("#2f4a3a", .45, { metalness: .5 }),
	stone: std("#8d8a83", .9),
	ash: std("#3b3835", 1),
	bark: std("#6b4c32", .9),
	wood: std("#c9a274", .8),
	seat: std("#3f5f4a", .9),
	leg: std("#23262a", .5, { metalness: .4 }),
	bag: std("#cfc3a4", .92),
	buckle: std("#111213", .45),
	sack: std("#4b4a33", .95),
	folded: std("#e6dcc4", .95)
}))();
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
const span = (k, [a, b]) => clamp((k - a) / (b - a));
const lerp = /* @__PURE__ */ (() => three.MathUtils.lerp)();
/** the i-th of n turns, one after another, as far as f of them is done: how far this one is (0 … 1) */
const turn = (f, i, n) => clamp(f * n - i);
const UP = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
/** a round rod stretched from a to b, set again as it moves */
function rod(r, mat, seg = 6) {
	const o = new three.Mesh(new three.CylinderGeometry(r, r, 1, seg), mat);
	o.castShadow = true;
	o.userData.span = (a, b) => {
		const d = b.clone().sub(a);
		const len = d.length();
		o.visible = len > 1e-4;
		if (!o.visible) return;
		o.position.copy(a).addScaledVector(d, .5);
		o.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
		o.scale.set(1, len, 1);
	};
	return o;
}
/** a folding camp chair facing +z: steel tubes crossed under the seat on either side, a canvas seat at 42 cm and
*  back, armrests */
function campChair() {
	const c = new three.Group();
	const v = (x, y, z) => new three.Vector3(x, y, z);
	const tube = (a, b) => {
		const t = rod(.011, m.leg(), 8);
		t.userData.span(a, b);
		c.add(t);
	};
	for (const sx of [-1, 1]) {
		const x = sx * .25;
		tube(v(x, 0, .22), v(x, .42, -.2));
		tube(v(x, 0, -.22), v(x, .42, .2));
		tube(v(x, .42, -.22), v(x, .9, -.34));
		tube(v(x, .42, .2), v(x, .62, .2));
		tube(v(x, .62, .2), v(x, .62, -.27));
		const pad = new three.Mesh(new three.BoxGeometry(.05, .016, .42), m.seat());
		pad.position.set(x, .635, -.03);
		c.add(pad);
	}
	tube(v(-.25, .42, .2), v(.25, .42, .2));
	tube(v(-.25, .42, -.21), v(.25, .42, -.21));
	const seat = new three.Mesh(new three.BoxGeometry(.5, .015, .42), m.seat());
	seat.position.y = .41;
	const back = new three.Mesh(new three.BoxGeometry(.5, .46, .012), m.seat());
	back.position.set(0, .67, -.285);
	back.rotation.x = -.245;
	c.add(seat, back);
	c.traverse((o) => o.isMesh && (o.castShadow = true));
	return c;
}
/** the fire place's measures: the stone ring's radius, the steps of building it (setBuild), the last one lighting it */
const FIRE_PLACE = {
	ring: .6,
	steps: {
		stones: [0, .28],
		woodpile: [.28, .5],
		logs: [.5, .68],
		chairs: [.68, .86],
		light: [.86, 1]
	}
};
const FIRE_ASSEMBLIES = [
	{
		id: "ring",
		label: "Fire ring",
		note: "Where the fire is kept: a ring of field stones round a bed of ash.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "fire",
		label: "The fire",
		note: "Four logs over kindling in a tepee, and what burns.",
		out: [
			0,
			.9,
			0
		]
	},
	{
		id: "seats",
		label: "Chairs",
		note: "Two folding camp chairs facing the fire.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "wood",
		label: "Woodpile",
		note: "Split logs stacked to dry, within reach of the fire.",
		out: [
			-.6,
			0,
			0
		]
	}
];
const FIRE_STEPS = [
	"Clear a round of earth and set a ring of stones round it, 1.2 m across.",
	"Stack the woodpile beside it, split logs three rows high.",
	"Lay four logs over the kindling in a tepee.",
	"Unfold the two chairs facing the fire.",
	"Light the kindling."
];
const FIRE_PARTS = [
	{
		id: "stones",
		label: "Stones",
		assembly: "ring",
		step: 1,
		count: 11,
		what: "Field stones the size of a loaf set round the fire, 1.2 m across: they keep the embers in and the grass out.",
		specs: [["Across", "1.2 m"], ["Stones", "about 30 cm"]]
	},
	{
		id: "ash",
		label: "Bed of ash",
		assembly: "ring",
		step: 1,
		what: "The bare earth inside the ring, grey with old ash; it glows where the embers lie.",
		moves: "Glows as the fire burns down"
	},
	{
		id: "logs",
		label: "Logs",
		assembly: "fire",
		step: 3,
		count: 4,
		what: "Four split logs, 80 cm long, leant together over the kindling so the air draws up through them.",
		specs: [["Long", "80 cm"], ["Round", "13 cm"]]
	},
	{
		id: "flames",
		label: "Flames",
		assembly: "fire",
		step: 5,
		what: "The fire itself and its light: warm, flickering, lighting the ground about 7 m round.",
		moves: "Flicker; grow when it is lit, die down when it is put out",
		specs: [["Light", "about 7 m round"]]
	},
	{
		id: "chairs",
		label: "Chairs",
		assembly: "seats",
		step: 4,
		count: 2,
		what: "Two green folding camp chairs, the seats at 40 cm, facing the fire.",
		moves: "Unfold",
		specs: [["Seat", "50 × 45 cm at 40 cm"]]
	},
	{
		id: "woodpile",
		label: "Woodpile",
		assembly: "wood",
		step: 2,
		count: 9,
		what: "Nine split logs 60 cm long, three rows of three on two bearers off the ground.",
		specs: [["Long", "60 cm"], ["Rows", "three"]]
	}
];
/**
* The fire place, built as far as `built` (0 … 1, its last step lighting it) and lit as much as `lit`. Its ring is at
* its origin; the chairs on its +z side, the woodpile on its −x side. userData:
* - setBuild(k), built; fire: { light, setLit(k), update(t) } (the flames and their flicker); tick(t) = fire.update
* - walk: { colliders: [{ x, z, r }] } (the ring, the chairs, the woodpile) with the Things viewer's walk in it
* - parts, catalog, explode(k)
*/
function firePlace({ built = 1, lit = 1 } = {}) {
	const { ring, steps } = FIRE_PLACE;
	const g = new three.Group();
	const parts = {};
	for (const { id } of FIRE_PARTS) {
		const p = new three.Group();
		p.name = id;
		p.userData.part = id;
		g.add(p);
		parts[id] = p;
	}
	/** a piece of a part, set down in its place as it is built */
	const set = (id) => {
		const c = new three.Group();
		parts[id].add(c);
		return c;
	};
	const stones = [];
	for (let k = 0; k < 11; k++) {
		const a = k / 11 * Math.PI * 2;
		const c = set("stones");
		const st = new three.Mesh(new three.DodecahedronGeometry(.17, 0), m.stone());
		st.position.set(Math.sin(a) * ring, .08, Math.cos(a) * ring);
		st.scale.set(1, .7, .9);
		st.rotation.set(k * .7, k * 1.3, k * .4);
		st.castShadow = st.receiveShadow = true;
		c.add(st);
		stones.push(c);
	}
	const ash = new three.Mesh(new three.CircleGeometry(ring - .08, 32).rotateX(-Math.PI / 2), m.ash());
	ash.position.y = .006;
	ash.receiveShadow = true;
	const embers = new three.MeshStandardMaterial({
		color: "#2a2522",
		roughness: 1,
		emissive: "#ff4a12",
		emissiveIntensity: 0
	});
	const glowBed = new three.Mesh(new three.CircleGeometry(.26, 24).rotateX(-Math.PI / 2), embers);
	glowBed.position.y = .009;
	parts.ash.add(ash, glowBed);
	const pile = [];
	{
		const at = new three.Vector3(-1.55, 0, -.2);
		for (const z of [-.2, .2]) {
			const c = set("woodpile");
			const b = new three.Mesh(new three.BoxGeometry(.5, .05, .06), m.bark());
			b.position.set(at.x, .025, at.z + z);
			c.add(b);
			pile.push(c);
		}
		for (let k = 0; k < 9; k++) {
			const c = set("woodpile");
			const log = new three.Mesh(new three.CylinderGeometry(.07, .07, .6, 7), [
				m.bark(),
				m.wood(),
				m.wood()
			]);
			log.rotation.x = Math.PI / 2;
			log.position.set(at.x - .15 + k % 3 * .15, .05 + .07 + Math.floor(k / 3) * .13, at.z);
			log.rotation.y = k % 2 * .3;
			log.castShadow = true;
			c.add(log);
			pile.push(c);
		}
	}
	const logs = [];
	for (let k = 0; k < 4; k++) {
		const c = set("logs");
		const log = new three.Mesh(new three.CylinderGeometry(.06, .07, .8, 8), [
			m.bark(),
			m.wood(),
			m.wood()
		]);
		log.rotation.set(Math.PI / 2 - .5, k / 4 * Math.PI, 0, "YXZ");
		log.position.y = .2;
		log.castShadow = true;
		c.add(log);
		logs.push(c);
	}
	const flameMat = new three.MeshStandardMaterial({
		color: "#ffb347",
		emissive: "#ff7a1a",
		emissiveIntensity: 2.2,
		transparent: true,
		opacity: .85
	});
	const flamesG = set("flames");
	const flames = [
		0,
		1,
		2
	].map((k) => {
		const f = new three.Mesh(new three.ConeGeometry(.16 - k * .03, .55 - k * .1, 8).translate(0, (.55 - k * .1) / 2, 0), flameMat);
		f.position.set((k - 1) * .08, .08, k % 2 * .06);
		flamesG.add(f);
		return f;
	});
	const light = new three.PointLight("#ff9a4a", 0, 7, 1.8);
	light.position.set(0, .6, 0);
	flamesG.add(light);
	const chairs = [];
	for (const [cx, cz, face] of [[
		-1.2,
		.6,
		2.1
	], [
		.9,
		1.1,
		-2.6
	]]) {
		const c = set("chairs");
		const chair = campChair();
		chair.position.set(cx, 0, cz);
		chair.rotation.y = face;
		c.add(chair);
		chairs.push(chair);
	}
	let want = clamp(lit);
	let flame = 0;
	function burn() {
		flame = want * ease(span(g.userData.built ?? 1, steps.light));
		flamesG.visible = flame > .01;
		light.intensity = 2 * flame;
		flameMat.opacity = .85 * Math.min(1, flame * 1.5);
		embers.emissiveIntensity = .9 * flame;
		for (const f of flames) f.scale.setScalar(.3 + .7 * flame);
	}
	/** lit as much as k (0 out … 1 burning) */
	function setLit(k) {
		want = clamp(k);
		g.userData.fire.lit = want;
		burn();
	}
	function update(t) {
		if (!flamesG.visible) return;
		flames.forEach((f, k) => {
			const s = (.85 + Math.sin(t * (9 + k * 3) + k) * .15) * (.3 + .7 * flame);
			f.scale.set(s, (.8 + Math.abs(Math.sin(t * (7 + k * 2))) * .4) * (.3 + .7 * flame), s);
		});
		light.intensity = (1.7 + Math.sin(t * 13) * .3 + Math.sin(t * 7.3) * .2) * flame;
	}
	let now = -1;
	function setBuild(k) {
		k = clamp(k);
		if (k === now) return;
		now = k;
		g.userData.built = k;
		const drop = (c, u) => {
			c.visible = u > 0;
			c.position.y = (1 - ease(u)) * .4;
		};
		const st = span(k, steps.stones);
		stones.forEach((c, i) => drop(c, turn(st, i, stones.length)));
		parts.ash.visible = st >= 1;
		const wp = span(k, steps.woodpile);
		pile.forEach((c, i) => drop(c, turn(wp, i, pile.length)));
		const lg = span(k, steps.logs);
		logs.forEach((c, i) => drop(c, turn(lg, i, logs.length)));
		const ch = span(k, steps.chairs);
		chairs.forEach((chair, i) => {
			const u = turn(ch, i, chairs.length);
			chair.parent.visible = u > 0;
			chair.position.y = (1 - ease(clamp(u / .4))) * .3;
			chair.scale.x = lerp(.12, 1, ease(clamp((u - .4) / .6)));
		});
		burn();
	}
	function explode(k) {
		for (const info of FIRE_PARTS) {
			const out = FIRE_ASSEMBLIES.find((a) => a.id === info.assembly).out;
			parts[info.id].position.set(out[0] * k, out[1] * k, out[2] * k);
		}
		parts.chairs.children.forEach((c, i) => {
			const [cx, cz] = i ? [.9, 1.1] : [-1.2, .6];
			const d = Math.hypot(cx, cz);
			c.position.set(cx / d * .6 * k, 0, cz / d * .6 * k);
		});
		parts.stones.children.forEach((c, i) => {
			const a = i / 11 * Math.PI * 2;
			c.position.x = Math.sin(a) * .35 * k;
			c.position.z = Math.cos(a) * .35 * k;
		});
	}
	const colliders = [
		{
			x: 0,
			z: 0,
			r: .75
		},
		{
			x: -1.2,
			z: .6,
			r: .4
		},
		{
			x: .9,
			z: 1.1,
			r: .4
		},
		{
			x: -1.55,
			z: -.2,
			r: .45
		}
	];
	g.userData = {
		built,
		setBuild,
		fire: {
			light,
			setLit,
			update,
			lit: want
		},
		tick: update,
		walk: {
			colliders,
			x: .2,
			z: 3.2,
			yaw: 0,
			canStand(x, z, _here, _ground, from) {
				for (const c of colliders) {
					const e = Math.hypot(x - c.x, z - c.z);
					if (e < c.r && e < Math.hypot(from.x - c.x, from.z - c.z)) return false;
				}
				return true;
			},
			floorAt: () => 0,
			lamps: []
		},
		parts,
		explode,
		catalog: {
			assemblies: FIRE_ASSEMBLIES,
			parts: FIRE_PARTS,
			steps: FIRE_STEPS,
			ranges: Object.values(steps),
			sources: [{
				label: "Campfire (Wikipedia)",
				url: "https://en.wikipedia.org/wiki/Campfire"
			}],
			play: "Build it",
			seconds: 16
		}
	};
	setBuild(built);
	return g;
}

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/models/index.ts
/** the models' older versions, by id, each with its frozen builder (the rest are at v1) */
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
}])();
const MODELS = /* @__PURE__ */ (() => versioned([...LIST], "make", HISTORY))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("things", MODELS, id, v, variant);
const list = () => recipesIn(MODELS);

//#endregion
exports.list = list;
exports.recipe = recipe;