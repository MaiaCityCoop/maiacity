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
/** the bag's measures: its length and its radius rolled up */
const BELL_TENT_BAG = {
	len: 1.1,
	r: .25
};
/**
* The bell tent's bag: canvas rolled round what is in it, two straps buckled over its top; open (0 rolled … 1 lying
* flat), its straps undone and the canvas unrolled, what was in it settled on it. userData: setOpen, open, parts
* ({ canvas, groundsheet, pole, wallPoles, pegs }: the canvas folded, the groundsheet rolled, the centre pole's three
* sections, the wall poles' bundle, the pegs' sack; each to be taken off it as the tent is pitched).
*/
function bellTentBag({ open = 0 } = {}) {
	const { len, r } = BELL_TENT_BAG;
	const g = new three.Group();
	const W = 2 * Math.PI * r;
	/** a sheet of the canvas (x0 … x1 along the bag) at radius rr round its middle, as open as k */
	const sheet = (x0, x1, rr, mat, cols, rows) => {
		const geo = new three.PlaneGeometry(1, 1, cols, rows);
		const mesh = new three.Mesh(geo, mat);
		mesh.castShadow = true;
		mesh.frustumCulled = false;
		mesh.userData.lay = (k) => {
			const pa = geo.attributes.position;
			const bend = (1 - k) / r;
			for (let j = 0; j <= rows; j++) {
				const a = (j / rows - .5) * W * (rr / r);
				for (let i = 0; i <= cols; i++) {
					const x = x1 - (x1 - x0) * i / cols;
					const idx = j * (cols + 1) + i;
					if (bend < 1e-4) pa.setXYZ(idx, x, .002 - (rr - r) * .25, a);
					else {
						const rho = 1 / bend + (rr - r);
						const b = a / rho;
						pa.setXYZ(idx, x, .002 + 1 / bend - rho * Math.cos(b), rho * Math.sin(b));
					}
				}
			}
			pa.needsUpdate = true;
			geo.computeVertexNormals();
			geo.boundingBox = geo.boundingSphere = null;
		};
		return mesh;
	};
	const bagMat = m.bag().clone();
	bagMat.side = three.DoubleSide;
	const cover = sheet(-len / 2, len / 2, r, bagMat, 10, 44);
	g.add(cover);
	const straps = [-.32, .32].map((x) => sheet(x - .02, x + .02, r + .004, m.strap(), 1, 44));
	g.add(...straps);
	const buckles = [-.32, .32].map((x) => {
		const b = new three.Mesh(new three.BoxGeometry(.05, .012, .04), m.buckle());
		b.position.set(x, 2 * r + .006, 0);
		g.add(b);
		return b;
	});
	const handle = new three.Mesh(new three.BoxGeometry(.34, .006, .035), m.strap());
	handle.position.set(0, 2 * r + .003, .015);
	g.add(handle);
	const roll = (rad, l, mat) => {
		const o = new three.Mesh(new three.CylinderGeometry(rad, rad, l, 20).rotateZ(Math.PI / 2), mat);
		o.castShadow = true;
		return o;
	};
	const canvasG = new three.Group();
	canvasG.add(roll(.11, 1, m.folded()));
	for (const x of [-.3, .3]) {
		const tie = new three.Mesh(new three.TorusGeometry(.112, .006, 6, 20).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		canvasG.add(tie);
	}
	const sheetRoll = roll(.075, .7, m.sheet());
	const poleG = new three.Group();
	for (let i = 0; i < 3; i++) {
		const a = i / 3 * Math.PI * 2;
		const s = roll(.035, 1.05, m.pole());
		s.position.set(0, Math.sin(a) * .04, Math.cos(a) * .04);
		poleG.add(s);
	}
	const wallG = new three.Group();
	for (let i = 0; i < 10; i++) {
		const ringN = i < 3 ? 0 : 1;
		const a = ringN ? (i - 3) / 7 * Math.PI * 2 : i / 3 * Math.PI * 2;
		const s = roll(.0125, .84, m.pole());
		const d = ringN ? .027 : .012;
		s.position.set(0, Math.sin(a) * d, Math.cos(a) * d);
		wallG.add(s);
	}
	for (const x of [-.25, .25]) {
		const tie = new three.Mesh(new three.TorusGeometry(.042, .005, 6, 16).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		wallG.add(tie);
	}
	const sack = new three.Group();
	const sackBody = new three.Mesh(new three.CylinderGeometry(.06, .065, .28, 14).rotateZ(Math.PI / 2), m.sack());
	sackBody.castShadow = true;
	const sackTie = new three.Mesh(new three.TorusGeometry(.03, .005, 6, 12).rotateY(Math.PI / 2), m.rope());
	sackTie.position.x = .15;
	sack.add(sackBody, sackTie);
	const parts = {
		canvas: canvasG,
		groundsheet: sheetRoll,
		pole: poleG,
		wallPoles: wallG,
		pegs: sack
	};
	const places = {
		canvas: [new three.Vector3(0, .15, .07), new three.Vector3(0, .112, -.42)],
		groundsheet: [new three.Vector3(-.17, .17, -.12), new three.Vector3(-.17, .077, -.14)],
		pegs: [new three.Vector3(.36, .17, -.12), new three.Vector3(.36, .067, -.14)],
		pole: [new three.Vector3(0, .36, -.06), new three.Vector3(0, .074, .14)],
		wallPoles: [new three.Vector3(0, .38, .09), new three.Vector3(0, .041, .4)]
	};
	for (const o of Object.values(parts)) g.add(o);
	let now = -1;
	function setOpen(k) {
		k = clamp(k);
		if (k === now) return;
		now = k;
		g.userData.open = k;
		const lay = ease(clamp((k - .12) / .88));
		for (const s of [cover, ...straps]) s.userData.lay(lay);
		for (const b of buckles) b.visible = k < .08;
		handle.visible = lay < .02;
		for (const [name, [from, to]] of Object.entries(places)) parts[name].position.lerpVectors(from, to, ease(clamp((k - .3) / .7)));
	}
	g.userData = {
		open,
		setOpen,
		parts
	};
	setOpen(open);
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
const HISTORY = /* @__PURE__ */ (() => ({ "bell-tent-bag": [{
	...FIRST,
	date: "2026-10-14",
	note: "The bell tent packed in its bag"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "bell-tent-bag",
	label: "Bell tent bag",
	note: "the bell tent packed: a roll of canvas 1.1 m long and 0.5 m thick, two straps buckled round it and a handle on top; unrolled, what is in it lies on it: the canvas folded and tied, the groundsheet rolled, the centre pole in three sections, the ten wall poles in a bundle, the pegs in a sack",
	usedIn: "MaiaCity V1",
	make: () => bellTentBag(),
	variants: [{
		id: "bell-tent-bag-rolled",
		label: "Rolled",
		note: "rolled up and strapped",
		make: () => bellTentBag()
	}, {
		id: "bell-tent-bag-open",
		label: "Unrolled",
		note: "its straps undone and the canvas laid out flat",
		make: () => bellTentBag({ open: 1 })
	}]
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