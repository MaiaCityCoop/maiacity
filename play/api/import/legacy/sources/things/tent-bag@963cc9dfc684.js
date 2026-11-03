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
//#region src/lib/models/textures.ts
function rng(seed) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const cache = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
function canvasTexture(key, w, h, draw, srgb = true) {
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	draw(c.getContext("2d"), rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
	const t = new three.CanvasTexture(c);
	if (srgb) t.colorSpace = three.SRGBColorSpace;
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.anisotropy = 8;
	cache.set(key, t);
	return t;
}

//#endregion
//#region src/lib/models/tent.js
const m = /* @__PURE__ */ (() => ({
	tube: std("#a9afb3", .4, { metalness: .7 }),
	hub: std("#55595d", .5, { metalness: .6 }),
	zip: std("#26282a", .7),
	cord: std("#2a2a2a", .8),
	bulb: std("#fff1d6", .3, {
		emissive: "#ffcf8a",
		emissiveIntensity: .6
	}),
	bag: std("#6b6a48", .92),
	strap: std("#1e1f1f", .75),
	buckle: std("#111213", .45),
	sack: std("#4b4a33", .95),
	wood: std("#9a7a52", .85)
}))();
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
/** the groundsheet seen from above (u across x, v from the door to the back): heavy grey-green PVC, a darker hem
*  round its edge, welded seams across it */
const floorTex = () => canvasTexture("dome-tent-floor", 512, 512, (x, r) => {
	x.fillStyle = "#56604f";
	x.fillRect(0, 0, 512, 512);
	for (let i = 0; i < 2600; i++) {
		x.fillStyle = `rgba(${r() < .5 ? "255,255,255" : "0,0,0"},${.03 + r() * .04})`;
		x.fillRect(r() * 512, r() * 512, 2, 2);
	}
	x.strokeStyle = "rgba(0,0,0,0.18)";
	x.lineWidth = 3;
	for (const v of [.34, .66]) x.beginPath(), x.moveTo(0, v * 512), x.lineTo(512, v * 512), x.stroke();
	x.strokeStyle = "#3c4337";
	x.lineWidth = 14;
	x.beginPath();
	x.arc(256, 256, 249, 0, Math.PI * 2);
	x.stroke();
});
/** the bag's measures: its length and its radius rolled up */
const TENT_BAG = {
	len: .9,
	r: .2
};
/**
* The tent's bag: olive canvas rolled round what is in it, two straps buckled over its top; open (0 rolled … 1 lying
* flat), its straps undone and the canvas unrolled, what was in it settled on it. userData: setOpen, open, parts
* ({ floor, cover, tubes, hubs }: the groundsheet's roll, the cover's roll, the tubes' bundle, the hubs' sack, to be
* taken off it as the tent is pitched).
*/
function packedTent({ open = 0 } = {}) {
	return bagged(TENT_BAG, { open });
}
/** the storage tent's bag: its length and its radius rolled up */
const STORAGE_TENT_BAG = {
	len: 1,
	r: .35
};
/** The storage tent's bag, open as far as `open`: userData as packedTent's. */
function storageTentBag({ open = 0 } = {}) {
	return bagged(STORAGE_TENT_BAG, { open });
}
/** the bag of measures B (TENT_BAG, STORAGE_TENT_BAG): what is in it as much thicker as it is (fr) and as much longer
*  (fl) as the dome tent's */
function bagged(B, { open = 0 } = {}) {
	const { len, r } = B;
	const fr = r / TENT_BAG.r, fl = len / TENT_BAG.len;
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
	const canvas = sheet(-len / 2, len / 2, r, bagMat, 10, 40);
	g.add(canvas);
	const straps = [-.26 * fl, .26 * fl].map((x) => sheet(x - .02 * fr, x + .02 * fr, r + .004, m.strap(), 1, 40));
	g.add(...straps);
	const buckles = [-.26 * fl, .26 * fl].map((x) => {
		const b = new three.Mesh(new three.BoxGeometry(.05 * fr, .012, .04 * fr), m.buckle());
		b.position.set(x, 2 * r + .006, 0);
		g.add(b);
		return b;
	});
	const handle = new three.Mesh(new three.BoxGeometry(.3 * fl, .006, .035 * fr), m.strap());
	handle.position.set(0, 2 * r + .003, .015 * fr);
	g.add(handle);
	const floorTexture = floorTex();
	const roll = (rad, l, mat) => {
		const o = new three.Mesh(new three.CylinderGeometry(rad, rad, l, 18).rotateZ(Math.PI / 2), mat);
		o.castShadow = true;
		return o;
	};
	const floorRoll = roll(.075 * fr, .86 * fl, new three.MeshStandardMaterial({
		map: floorTexture,
		roughness: .75
	}));
	const coverRoll = roll(.075 * fr, .84 * fl, std("#e6dcc4", .9)());
	const tubes = new three.Group();
	for (let i = 0; i < 19; i++) {
		const ringN = i === 0 ? 0 : i < 7 ? 1 : 2;
		const a = ringN === 1 ? (i - 1) / 6 * Math.PI * 2 : (i - 7) / 12 * Math.PI * 2 + .26;
		const t = new three.Mesh(new three.CylinderGeometry(.01 * fr, .01 * fr, .62 * fl, 8).rotateZ(Math.PI / 2), m.tube());
		t.position.set(0, Math.sin(a) * .021 * fr * ringN, Math.cos(a) * .021 * fr * ringN);
		t.castShadow = true;
		tubes.add(t);
	}
	for (const x of [-.2 * fl, .2 * fl]) {
		const tie = new three.Mesh(new three.TorusGeometry(.052 * fr, .006, 6, 18).rotateY(Math.PI / 2), m.strap());
		tie.position.x = x;
		tubes.add(tie);
	}
	const hubSack = new three.Group();
	const sackBody = new three.Mesh(new three.CylinderGeometry(.045 * fr, .05 * fr, .16 * fl, 12).rotateZ(Math.PI / 2), m.sack());
	const sackTie = new three.Mesh(new three.TorusGeometry(.026 * fr, .005, 6, 12).rotateY(Math.PI / 2), m.cord());
	sackTie.position.x = .085 * fl;
	hubSack.add(sackBody, sackTie);
	sackBody.castShadow = true;
	const parts = {
		floor: floorRoll,
		cover: coverRoll,
		tubes,
		hubs: hubSack
	};
	const places = {
		floor: [new three.Vector3(0, .12, -.08), new three.Vector3(0, .078, -.22)],
		cover: [new three.Vector3(0, .12, .08), new three.Vector3(0, .078, 0)],
		tubes: [new three.Vector3(-.11, .275, 0), new three.Vector3(-.11, .058, .2)],
		hubs: [new three.Vector3(.32, .27, 0), new three.Vector3(.32, .053, .2)]
	};
	for (const ends of Object.values(places)) for (const v of ends) v.set(v.x * fl, v.y * fr, v.z * fr);
	for (const o of Object.values(parts)) g.add(o);
	let at = -1;
	function setOpen(k) {
		k = clamp(k);
		if (k === at) return;
		at = k;
		g.userData.open = k;
		const lay = ease(clamp((k - .12) / .88));
		for (const s of [canvas, ...straps]) s.userData.lay(lay);
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
const HISTORY = /* @__PURE__ */ (() => ({ "tent-bag": [{
	...FIRST,
	date: "2026-10-14",
	note: "The dome tent’s bag: 0.9 m long and 0.4 m thick",
	build: () => packedTent()
}, {
	v: 2,
	date: "2026-10-14",
	note: "The storage tent’s bag: 1 m long and 0.7 m thick, its tubes in halves"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "tent-bag",
	label: "Storage tent bag",
	note: "the storage tent packed: a roll of olive canvas 1 m long and 0.7 m thick, two straps buckled round it and a handle on top; unrolled, what is in it lies on it: the groundsheet rolled, the cover rolled, the frame’s tubes in halves in a bundle and the hubs in a sack",
	usedIn: "MaiaCity V1",
	make: () => storageTentBag(),
	variants: [{
		id: "tent-bag-rolled",
		label: "Rolled",
		note: "rolled up and strapped",
		make: () => storageTentBag()
	}, {
		id: "tent-bag-open",
		label: "Unrolled",
		note: "its straps undone and the canvas laid out flat",
		make: () => storageTentBag({ open: 1 })
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