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
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");

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
/** A part: a box at its place, casting shadows (and catching them, unless `catches` is false). */
function part(g, w, h, d, m, x, y, z, catches = true) {
	const p = new three.Mesh(new three.BoxGeometry(w, h, d), m);
	p.position.set(x, y, z);
	p.castShadow = true;
	p.receiveShadow = catches;
	g.add(p);
	return p;
}
/** A soft part: a box with rounded edges (a mattress, a pillow, a seat). */
function soft(g, w, h, d, radius, m, x, y, z) {
	const p = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2)), m);
	p.position.set(x, y, z);
	p.castShadow = p.receiveShadow = true;
	g.add(p);
	return p;
}
const v3 = (x, y, z) => new three.Vector3(x, y, z);

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
//#region src/lib/models/units.js
const CM = .01;
const MM = .001;
/** a kilometre an hour, in metres a second */
const KMH = 1e3 / 3600;
/** how fast things move, at real speeds */
const SPEED = {
	walk: 5 * KMH,
	track: 30 * KMH,
	highway: 80 * KMH
};

//#endregion
//#region src/lib/models/planting.js
const m = /* @__PURE__ */ (() => ({
	pack: std("#b4532a", .85),
	packDark: std("#2f3338", .8),
	nylon: std("#4a4f55", .7),
	mesh: std("#69717b", .9),
	lining: std("#1d1f22", .95),
	buckle: std("#161616", .5),
	cord: std("#d8d2c4", .8),
	clothes: std("#5f7590", .95),
	bottle: std("#6f8f7a", .45, { metalness: .35 }),
	bottleBand: std("#e7e2d6", .6),
	cap: std("#202224", .5),
	mouth: std("#0c0c0c", .9),
	steel: std("#c4c8cb", .3, { metalness: .9 }),
	kraft: std("#c9a878", .9),
	wood: std("#c8a46a", .75),
	endGrain: std("#e2c99b", .8),
	paint: std("#e2672a", .6)
}))();
/** V1's seeds (engine SEEDLINGS ids, Samuel 2026-10-14: ten trees from our plants that bear fruit or nuts): what each
*  packet says and its colours */
const SEED_PACKETS = {
	apple: {
		label: "Apple",
		latin: "Malus domestica",
		band: "#b8322a",
		ground: "#f3ead6"
	},
	pear: {
		label: "Pear",
		latin: "Pyrus communis",
		band: "#8a9a2c",
		ground: "#f2eedb"
	},
	cherry: {
		label: "Sweet cherry",
		latin: "Prunus avium",
		band: "#8e1730",
		ground: "#f6e9e2"
	},
	plum: {
		label: "Plum",
		latin: "Prunus domestica",
		band: "#4a2d6b",
		ground: "#efe9f2"
	},
	apricot: {
		label: "Apricot",
		latin: "Prunus armeniaca",
		band: "#d06f22",
		ground: "#f8ecdb"
	},
	quince: {
		label: "Quince",
		latin: "Cydonia oblonga",
		band: "#b8901c",
		ground: "#f5f0d8"
	},
	mulberry: {
		label: "Mulberry",
		latin: "Morus nigra",
		band: "#3b1431",
		ground: "#f2e6ec"
	},
	walnut: {
		label: "Walnut",
		latin: "Juglans regia",
		band: "#4f6a2e",
		ground: "#ecebdc"
	},
	chestnut: {
		label: "Sweet chestnut",
		latin: "Castanea sativa",
		band: "#7c3f1a",
		ground: "#f1e5d5"
	},
	hazel: {
		label: "Hazel",
		latin: "Corylus avellana",
		band: "#7a5530",
		ground: "#efe6d4"
	}
};
/** every packet there is: V1's seeds, and those it no longer has (blackcurrant is a bush; it went on 2026-10-14) */
const ALL_PACKETS = /* @__PURE__ */ (() => ({
	...SEED_PACKETS,
	blackcurrant: {
		label: "Blackcurrant",
		latin: "Ribes nigrum",
		band: "#3d2a55",
		ground: "#ece8ef"
	}
}))();
/** a packet's size: 7 × 10 cm, a few seeds thick */
const PACKET = {
	w: 7 * CM,
	h: 10 * CM,
	d: 4 * MM
};
/** a leaf on its stalk, its tip at angle a (radians, 0 = right, up is −) @param {CanvasRenderingContext2D} x */
function leaf(x, cx, cy, len, a, colour = "#4f7d32") {
	x.save();
	x.translate(cx, cy);
	x.rotate(a);
	const g = x.createLinearGradient(0, -len * .25, 0, len * .25);
	g.addColorStop(0, "#6c9a45");
	g.addColorStop(1, colour);
	x.fillStyle = g;
	x.beginPath();
	x.moveTo(0, 0);
	x.quadraticCurveTo(len * .5, -len * .32, len, 0);
	x.quadraticCurveTo(len * .5, len * .32, 0, 0);
	x.fill();
	x.strokeStyle = "rgba(30,50,20,0.55)";
	x.lineWidth = 1.5;
	x.beginPath();
	x.moveTo(0, 0);
	x.lineTo(len * .92, 0);
	x.stroke();
	x.restore();
}
/** a round fruit with its light from the top left @param {CanvasRenderingContext2D} x */
function ball(x, cx, cy, r, light, dark, shine = .55) {
	const g = x.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
	g.addColorStop(0, light);
	g.addColorStop(1, dark);
	x.fillStyle = g;
	x.beginPath();
	x.arc(cx, cy, r, 0, Math.PI * 2);
	x.fill();
	x.fillStyle = `rgba(255,255,255,${shine})`;
	x.beginPath();
	x.ellipse(cx - r * .38, cy - r * .42, r * .2, r * .12, -.6, 0, Math.PI * 2);
	x.fill();
}
const stalk = (x, x0, y0, x1, y1, cxp, cyp, w = 4) => {
	x.strokeStyle = "#5a3d22";
	x.lineWidth = w;
	x.lineCap = "round";
	x.beginPath();
	x.moveTo(x0, y0);
	x.quadraticCurveTo(cxp, cyp, x1, y1);
	x.stroke();
};
/** each seed's fruit, drawn in a 220 × 200 box at (0, 0) @type {Record<string, (x: CanvasRenderingContext2D) => void>} */
const FRUIT = {
	apple(x) {
		leaf(x, 112, 46, 64, -.5);
		ball(x, 82, 118, 56, "#f06a4f", "#9e1f1a");
		ball(x, 148, 128, 48, "#f3c75a", "#b8482a", .4);
		stalk(x, 84, 64, 92, 40, 82, 50);
		stalk(x, 148, 82, 156, 60, 150, 70);
	},
	pear(x) {
		const pear = (cx, cy, s, light, dark) => {
			const g = x.createRadialGradient(cx - 14 * s, cy - 6 * s, 6 * s, cx, cy + 10 * s, 62 * s);
			g.addColorStop(0, light);
			g.addColorStop(1, dark);
			x.fillStyle = g;
			x.beginPath();
			x.moveTo(cx, cy - 58 * s);
			x.bezierCurveTo(cx + 20 * s, cy - 58 * s, cx + 18 * s, cy - 20 * s, cx + 40 * s, cy + 12 * s);
			x.bezierCurveTo(cx + 62 * s, cy + 48 * s, cx + 30 * s, cy + 70 * s, cx, cy + 70 * s);
			x.bezierCurveTo(cx - 30 * s, cy + 70 * s, cx - 62 * s, cy + 48 * s, cx - 40 * s, cy + 12 * s);
			x.bezierCurveTo(cx - 18 * s, cy - 20 * s, cx - 20 * s, cy - 58 * s, cx, cy - 58 * s);
			x.fill();
			stalk(x, cx, cy - 56 * s, cx + 8 * s, cy - 78 * s, cx - 2 * s, cy - 70 * s);
		};
		leaf(x, 126, 40, 60, -.3);
		pear(146, 112, .92, "#e6e07a", "#8f9a2a");
		pear(82, 104, 1.05, "#f0e58a", "#a49b30");
	},
	cherry(x) {
		leaf(x, 112, 30, 70, -.15);
		stalk(x, 112, 34, 70, 132, 76, 60, 3.5);
		stalk(x, 112, 34, 150, 140, 140, 70, 3.5);
		ball(x, 70, 150, 34, "#e5455a", "#6a0a1c");
		ball(x, 150, 158, 34, "#de3a52", "#5e0818");
	},
	hazel(x) {
		const nut = (cx, cy, a) => {
			x.save();
			x.translate(cx, cy);
			x.rotate(a);
			x.fillStyle = "#7f9a48";
			x.beginPath();
			for (let i = 0; i <= 10; i++) {
				const t = Math.PI * (1.05 + .9 * i / 10), r = i % 2 ? 50 : 36;
				x.lineTo(Math.cos(t) * r, -18 + Math.sin(t) * r * .8);
			}
			x.closePath();
			x.fill();
			const g = x.createRadialGradient(-12, 6, 4, 0, 14, 42);
			g.addColorStop(0, "#c58a52");
			g.addColorStop(1, "#6b3f1d");
			x.fillStyle = g;
			x.beginPath();
			x.ellipse(0, 18, 34, 38, 0, 0, Math.PI * 2);
			x.fill();
			x.fillStyle = "rgba(240,215,170,0.8)";
			x.beginPath();
			x.ellipse(0, -10, 22, 10, 0, 0, Math.PI * 2);
			x.fill();
			x.restore();
		};
		leaf(x, 118, 40, 70, -.4, "#55803a");
		nut(76, 110, -.25);
		nut(150, 124, .3);
	},
	blackcurrant(x) {
		leaf(x, 70, 36, 70, -1, "#4f7d32");
		stalk(x, 104, 28, 124, 176, 136, 90, 3);
		for (const [cx, cy, r] of [
			[
				96,
				74,
				17
			],
			[
				126,
				86,
				19
			],
			[
				104,
				106,
				20
			],
			[
				134,
				120,
				19
			],
			[
				110,
				142,
				19
			],
			[
				140,
				156,
				17
			],
			[
				116,
				176,
				15
			]
		]) ball(x, cx, cy, r, "#5b4a78", "#120c1c", .5);
	},
	plum(x) {
		const plum = (cx, cy, a) => {
			x.save();
			x.translate(cx, cy);
			x.rotate(a);
			const g = x.createRadialGradient(-14, -18, 6, 0, 0, 58);
			g.addColorStop(0, "#7b67b0");
			g.addColorStop(1, "#1f1440");
			x.fillStyle = g;
			x.beginPath();
			x.ellipse(0, 0, 38, 50, 0, 0, Math.PI * 2);
			x.fill();
			x.fillStyle = "rgba(205,200,235,0.28)";
			x.beginPath();
			x.ellipse(-8, -6, 30, 40, 0, 0, Math.PI * 2);
			x.fill();
			x.strokeStyle = "rgba(20,10,40,0.6)";
			x.lineWidth = 2.5;
			x.beginPath();
			x.moveTo(14, -46);
			x.quadraticCurveTo(28, 0, 12, 46);
			x.stroke();
			x.restore();
		};
		leaf(x, 104, 30, 74, -.2);
		stalk(x, 104, 34, 72, 66, 84, 40, 3);
		stalk(x, 104, 34, 148, 76, 132, 44, 3);
		plum(70, 118, -.15);
		plum(150, 128, .2);
	},
	apricot(x) {
		const apricot = (cx, cy, r) => {
			ball(x, cx, cy, r, "#ffc260", "#d8641c", .3);
			const g = x.createRadialGradient(cx + r * .3, cy - r * .1, r * .1, cx + r * .3, cy - r * .1, r * .8);
			g.addColorStop(0, "rgba(210,50,30,0.55)");
			g.addColorStop(1, "rgba(210,50,30,0)");
			x.fillStyle = g;
			x.beginPath();
			x.arc(cx, cy, r, 0, Math.PI * 2);
			x.fill();
			x.fillStyle = "rgba(150,30,20,0.5)";
			for (let i = 0; i < 14; i++) {
				const a = i * 2.4, d = r * (.3 + i * 37 % 10 / 16);
				x.beginPath();
				x.arc(cx + r * .25 + Math.cos(a) * d * .6, cy - r * .1 + Math.sin(a) * d * .6, 1.6, 0, Math.PI * 2);
				x.fill();
			}
			x.strokeStyle = "rgba(160,70,20,0.55)";
			x.lineWidth = 2.5;
			x.beginPath();
			x.moveTo(cx - r * .1, cy - r * .95);
			x.quadraticCurveTo(cx - r * .45, cy, cx - r * .05, cy + r * .95);
			x.stroke();
		};
		leaf(x, 112, 40, 66, -.45);
		leaf(x, 112, 40, 52, -2.5);
		apricot(80, 120, 50);
		apricot(150, 132, 42);
	},
	quince(x) {
		leaf(x, 120, 38, 72, -.35, "#6f8f4f");
		const g = x.createRadialGradient(92, 82, 8, 110, 116, 92);
		g.addColorStop(0, "#fbe680");
		g.addColorStop(1, "#c48d17");
		x.fillStyle = g;
		x.beginPath();
		x.moveTo(110, 40);
		x.bezierCurveTo(140, 40, 146, 72, 168, 98);
		x.bezierCurveTo(196, 132, 170, 186, 112, 186);
		x.bezierCurveTo(54, 186, 26, 134, 54, 98);
		x.bezierCurveTo(76, 72, 82, 40, 110, 40);
		x.fill();
		x.fillStyle = "rgba(255,250,225,0.35)";
		x.beginPath();
		x.ellipse(86, 100, 18, 34, .3, 0, Math.PI * 2);
		x.fill();
		x.strokeStyle = "rgba(150,100,20,0.35)";
		x.lineWidth = 2;
		for (const dx of [
			-30,
			0,
			30
		]) x.beginPath(), x.moveTo(110 + dx * .3, 52), x.quadraticCurveTo(110 + dx * 1.6, 120, 110 + dx * .4, 182), x.stroke();
		x.fillStyle = "#5b3d1e";
		for (let i = 0; i < 5; i++) {
			const a = i / 5 * Math.PI * 2;
			x.beginPath();
			x.ellipse(110 + Math.cos(a) * 7, 182 + Math.sin(a) * 4, 6, 3, a, 0, Math.PI * 2);
			x.fill();
		}
		stalk(x, 110, 42, 116, 26, 108, 32, 5);
	},
	mulberry(x) {
		const berry = (cx, cy, a, light, dark) => {
			x.save();
			x.translate(cx, cy);
			x.rotate(a);
			stalk(x, 0, -38, 2, -56, -4, -48, 3);
			for (let row = 0; row < 7; row++) for (let k = 0; k < 3; k++) {
				const w = 16 * Math.sin((row + .6) / 7.2 * Math.PI);
				ball(x, (k - 1) * w * .8 + (row % 2 ? 4 : -4) * (k === 1 ? 0 : 1), -32 + row * 11, 8.5, light, dark, .45);
			}
			x.restore();
		};
		x.fillStyle = "#5a8a3a";
		x.beginPath();
		x.moveTo(36, 96);
		for (let i = 0; i <= 18; i++) {
			const t = i / 18 * Math.PI * 2, r = 46 + (i % 2 ? 6 : 0);
			x.lineTo(80 + Math.cos(t) * r, 70 + Math.sin(t) * r * .82);
		}
		x.fill();
		x.strokeStyle = "rgba(30,50,20,0.5)";
		x.lineWidth = 2;
		x.beginPath(), x.moveTo(40, 100), x.lineTo(112, 44), x.stroke();
		berry(126, 120, .15, "#6a2a52", "#160610");
		berry(172, 132, -.1, "#e05a62", "#8a1426");
		berry(92, 148, .4, "#5a2246", "#12050d");
	},
	walnut(x) {
		x.save();
		x.translate(60, 52);
		x.rotate(-.5);
		stalk(x, -40, 0, 70, 0, 15, -4, 3);
		for (const [lx, a] of [
			[-24, -1.2],
			[-24, 1.2],
			[8, -1.15],
			[8, 1.15],
			[70, 0]
		]) leaf(x, lx, 0, lx === 70 ? 46 : 40, a, "#4d7a30");
		x.restore();
		ball(x, 82, 130, 50, "#8fb052", "#3f6420", .3);
		x.fillStyle = "#3a2412";
		x.beginPath();
		x.ellipse(90, 124, 30, 34, .2, 0, Math.PI * 2);
		x.fill();
		const shell = (cx, cy, r) => {
			const g = x.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r);
			g.addColorStop(0, "#d9b47c");
			g.addColorStop(1, "#8a5f2c");
			x.fillStyle = g;
			x.beginPath();
			x.ellipse(cx, cy, r * .92, r, 0, 0, Math.PI * 2);
			x.fill();
			x.strokeStyle = "rgba(90,55,20,0.6)";
			x.lineWidth = 1.8;
			for (let i = 0; i < 9; i++) {
				const yy = cy - r * .8 + i * r * 1.6 / 8;
				x.beginPath();
				x.moveTo(cx - r * .75, yy);
				for (let k = 1; k <= 6; k++) x.lineTo(cx - r * .75 + k * r * 1.5 / 6, yy + (k % 2 ? 4 : -4));
				x.stroke();
			}
			x.strokeStyle = "rgba(80,45,15,0.8)";
			x.lineWidth = 2.5;
			x.beginPath(), x.moveTo(cx, cy - r), x.lineTo(cx, cy + r), x.stroke();
		};
		shell(92, 124, 26);
		shell(164, 146, 34);
	},
	chestnut(x) {
		x.save();
		x.translate(40, 40);
		x.rotate(.12);
		x.fillStyle = "#5d8c35";
		x.beginPath();
		x.moveTo(0, 0);
		for (let i = 0; i <= 12; i++) x.lineTo(i * 12, -12 - Math.sin(i / 12 * Math.PI) * 6 + (i % 2 ? -4 : 0));
		for (let i = 12; i >= 0; i--) x.lineTo(i * 12, 12 + Math.sin(i / 12 * Math.PI) * 6 + (i % 2 ? 4 : 0));
		x.fill();
		x.strokeStyle = "rgba(30,50,20,0.5)";
		x.lineWidth = 2;
		x.beginPath(), x.moveTo(0, 0), x.lineTo(144, 0), x.stroke();
		x.restore();
		const cx = 104, cy = 128;
		x.strokeStyle = "#8fae4a";
		x.lineWidth = 2;
		for (let i = 0; i < 70; i++) {
			const a = i / 70 * Math.PI * 2, r0 = 54, r1 = 74 + i * 13 % 7;
			x.beginPath(), x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .85), x.lineTo(cx + Math.cos(a + .05) * r1, cy + Math.sin(a + .05) * r1 * .85), x.stroke();
		}
		const husk = x.createRadialGradient(cx, cy, 20, cx, cy, 62);
		husk.addColorStop(0, "#f1ead2");
		husk.addColorStop(1, "#9db45a");
		x.fillStyle = husk;
		x.beginPath();
		x.ellipse(cx, cy, 60, 52, 0, 0, Math.PI * 2);
		x.fill();
		const nut = (nx, ny, a) => {
			x.save();
			x.translate(nx, ny);
			x.rotate(a);
			const g = x.createRadialGradient(-10, -10, 3, 0, 0, 34);
			g.addColorStop(0, "#b0602c");
			g.addColorStop(1, "#4a2210");
			x.fillStyle = g;
			x.beginPath();
			x.moveTo(0, -32);
			x.quadraticCurveTo(30, -22, 28, 10);
			x.quadraticCurveTo(24, 30, 0, 30);
			x.quadraticCurveTo(-24, 30, -28, 10);
			x.quadraticCurveTo(-30, -22, 0, -32);
			x.fill();
			x.fillStyle = "#d9c9a0";
			x.beginPath();
			x.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
			x.fill();
			x.fillStyle = "rgba(255,255,255,0.45)";
			x.beginPath();
			x.ellipse(-10, -12, 6, 12, .4, 0, Math.PI * 2);
			x.fill();
			x.restore();
		};
		nut(82, 126, -.25);
		nut(128, 128, .25);
	}
};
/** the packet's printed front: its band, the fruit in a frame, its name and its Latin name */
function packetFace(id) {
	const s = ALL_PACKETS[id];
	return canvasTexture(`seed-packet:${id}`, 280, 400, (x) => {
		x.fillStyle = s.ground;
		x.fillRect(0, 0, 280, 400);
		x.fillStyle = s.band;
		x.fillRect(0, 0, 280, 54);
		x.fillStyle = "rgba(0,0,0,0.18)";
		x.fillRect(0, 50, 280, 4);
		x.fillStyle = "#fbf7ee";
		x.font = "bold 26px Georgia, serif";
		x.textAlign = "center";
		x.fillText("SEEDS", 140, 36);
		x.fillStyle = "#fffdf6";
		x.fillRect(22, 70, 236, 214);
		x.strokeStyle = s.band;
		x.lineWidth = 4;
		x.strokeRect(22, 70, 236, 214);
		x.save();
		x.translate(30, 78);
		FRUIT[id](x);
		x.restore();
		x.fillStyle = "#2a2218";
		x.font = `bold ${s.label.length > 9 ? 30 : 38}px Georgia, serif`;
		x.fillText(s.label, 140, 330);
		x.font = "italic 19px Georgia, serif";
		x.fillStyle = "#5a4c3a";
		x.fillText(s.latin, 140, 358);
		x.fillStyle = s.band;
		x.fillRect(60, 374, 160, 2);
		x.font = "15px Georgia, serif";
		x.fillStyle = "#6a5c48";
		x.fillText("about 10 seeds", 140, 394);
	});
}
/** A seed packet: 7 × 10 cm, a paper envelope with a few seeds in it, its fruit printed on the front (+z) with its
*  name; standing on its bottom edge. `id`: one of V1's seeds (SEED_PACKETS), or blackcurrant (ALL_PACKETS). */
function seedPacket(id = "apple") {
	const g = new three.Group();
	g.name = `seed-packet:${id}`;
	const front = new three.MeshStandardMaterial({
		map: packetFace(id),
		roughness: .85
	});
	const paper = m.kraft();
	const body = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(PACKET.w, PACKET.h, PACKET.d, 2, .0012), [
		paper,
		paper,
		paper,
		paper,
		front,
		paper
	]);
	body.position.y = PACKET.h / 2;
	body.castShadow = body.receiveShadow = true;
	g.add(body);
	part(g, PACKET.w * .98, .022, 8e-4, paper, 0, PACKET.h - .013, -PACKET.d / 2 - 4e-4);
	g.userData = { seed: id };
	return g;
}
/** the bottle's measures: 1 l, 7.7 cm across, its mouth 26.8 cm up (where water pours from), the cap to 30 cm */
const BOTTLE = {
	r: .0385,
	mouth: .268,
	top: .3
};
/** A 1 l refillable water bottle: powder-coated steel, a pale band round it, a screw cap with a carry loop. Standing
*  on its base; `userData.mouth` is where it pours from (its open neck, at the top), `userData.cap` the cap to take
*  off before pouring. */
function waterBottle() {
	const g = new three.Group();
	g.name = "water-bottle";
	const prof = [
		[0, 0],
		[.033, 0],
		[.0378, .004],
		[.0385, .012],
		[.0385, .2],
		[.035, .224],
		[.025, .243],
		[.018, .252],
		[.017, BOTTLE.mouth],
		[.0135, BOTTLE.mouth],
		[.0135, .25]
	].map(([r, y]) => new three.Vector2(r, y));
	const body = new three.Mesh(new three.LatheGeometry(prof, 36), m.bottle());
	body.castShadow = body.receiveShadow = true;
	g.add(body);
	const band = new three.Mesh(new three.CylinderGeometry(.0388, .0388, .06, 36, 1, true), m.bottleBand());
	band.position.y = .11;
	g.add(band);
	const hole = new three.Mesh(new three.CircleGeometry(.0135, 20).rotateX(-Math.PI / 2), m.mouth());
	hole.position.y = .251;
	g.add(hole);
	const cap = new three.Group();
	cap.name = "cap";
	const lid = new three.Mesh(new three.CylinderGeometry(.0205, .021, .026, 28), m.cap());
	lid.position.y = .012;
	const loop = new three.Mesh(new three.TorusGeometry(.012, .0035, 8, 20, Math.PI), m.cap());
	loop.position.y = .025;
	cap.add(lid, loop);
	cap.position.y = .257;
	cap.traverse((o) => o.isMesh && (o.castShadow = true));
	g.add(cap);
	g.userData = {
		mouth: new three.Vector3(0, BOTTLE.mouth, 0),
		cap
	};
	return g;
}
/** the pack's measures: about 35 l, 32 cm across, 22 cm deep, its opening's rim 46 cm up */
const PACK = {
	w: .32,
	d: .22,
	rim: .48,
	top: .42,
	floor: .3
};
/** an open shell of fabric: a rounded rectangle w × d (corners `r`), walls `t` thick, from y0 up to y1, shaped by
*  `shape(y)` → [how much narrower across, how much fuller front to back] */
function shell(w, d, y0, y1, t, r, mat, shape) {
	const rounded = (W, D, R) => {
		const s = new three.Shape();
		s.moveTo(-W / 2 + R, -D / 2);
		s.lineTo(W / 2 - R, -D / 2);
		s.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + R);
		s.lineTo(W / 2, D / 2 - R);
		s.quadraticCurveTo(W / 2, D / 2, W / 2 - R, D / 2);
		s.lineTo(-W / 2 + R, D / 2);
		s.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - R);
		s.lineTo(-W / 2, -D / 2 + R);
		s.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + R, -D / 2);
		return s;
	};
	const outer = rounded(w, d, r);
	outer.holes.push(rounded(w - 2 * t, d - 2 * t, Math.max(.005, r - t)));
	const geo = new three.ExtrudeGeometry(outer, {
		depth: y1 - y0,
		bevelEnabled: false,
		curveSegments: 6,
		steps: 8
	});
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const y = pos.getY(i) + y0, [kx, kz] = shape(y);
		pos.setXYZ(i, pos.getX(i) * kx, y, pos.getZ(i) * kz);
	}
	geo.computeVertexNormals();
	const mesh = new three.Mesh(geo, mat);
	mesh.castShadow = mesh.receiveShadow = true;
	return mesh;
}
/** a flat strap along a smooth curve through `pts` (a shoulder strap, a hip belt's wing): `w` wide across x, `t` thick,
*  padded (rounded in section) */
function strap(g, pts, w, t, mat) {
	const curve = new three.CatmullRomCurve3(pts);
	const N = 28, sides = 10, P = [], idx = [];
	const across = new three.Vector3(1, 0, 0);
	for (let i = 0; i <= N; i++) {
		const u = i / N, c = curve.getPointAt(u), tan = curve.getTangentAt(u);
		const side = across.clone().addScaledVector(tan, -across.dot(tan)).normalize(), up = new three.Vector3().crossVectors(tan, side);
		const taper = .75 + .25 * Math.sin(Math.PI * Math.min(1, u * 1.4));
		for (let k = 0; k < sides; k++) {
			const a = k / sides * Math.PI * 2;
			const p = c.clone().addScaledVector(side, Math.cos(a) * w * taper / 2).addScaledVector(up, Math.sin(a) * t / 2);
			P.push(p.x, p.y, p.z);
		}
		if (i) for (let k = 0; k < sides; k++) {
			const a = (i - 1) * sides + k, b = (i - 1) * sides + (k + 1) % sides, c2 = i * sides + k, d = i * sides + (k + 1) % sides;
			idx.push(a, c2, b, b, c2, d);
		}
	}
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.Float32BufferAttribute(P, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	const mesh = new three.Mesh(geo, mat);
	mesh.castShadow = true;
	g.add(mesh);
	return mesh;
}
/** A hiker's backpack, about 35 l: a rust-red body, 32 × 22 cm and 46 cm to its rim, a drawstring collar, a lid
*  pocket on top hinged at the back; a front pocket, mesh bottle pockets and compression straps on the sides; on the
*  back (−z) a padded panel, two curved shoulder straps with a sternum strap, and a hip belt. Its front (+z) is the
*  pocket's side. `open` (0 … 1) throws the lid back over the shoulder straps; open, it holds a 1 l water bottle and
*  the seed packets (userData.bottle, userData.packets by seed) standing on the clothes inside: v2 the ten of V1's
*  seeds in two rows, six in front and four behind them, raised, the bottle in the corner behind; v1 the first five
*  in one row. `userData.setOpen(k)` opens or closes it (the things inside show only while it is open). */
function backpack({ open = 1, v = 2 } = {}) {
	const g = new three.Group();
	g.name = "backpack";
	const { w, d, rim, top, floor } = PACK;
	soft(g, w + .004, .06, d + .004, .03, m.packDark(), 0, .03, 0);
	g.add(shell(w, d, .04, top, .014, .06, m.pack(), (y) => [1 - .06 * (y / top), 1 + .1 * Math.sin(Math.PI * y / top)]));
	g.add(shell(w - .02, d - .02, top - .012, rim, .006, .05, m.nylon(), (y) => [1 - .08 * ((y - top) / (rim - top)), 1 - .1 * ((y - top) / (rim - top))]));
	part(g, w - .04, .002, d - .04, m.lining(), 0, floor + .001, 0);
	const cw = w / 2 - .016, cd = d / 2 - .016, rr = .03;
	const loop = [];
	for (const [cx, cz, a0] of [
		[
			cw - rr,
			cd - rr,
			0
		],
		[
			-cw + rr,
			cd - rr,
			Math.PI / 2
		],
		[
			-cw + rr,
			-cd + rr,
			Math.PI
		],
		[
			cw - rr,
			-cd + rr,
			3 * Math.PI / 2
		]
	]) for (let i = 0; i <= 4; i++) {
		const a = a0 + i / 4 * (Math.PI / 2);
		loop.push(v3(cx + rr * Math.cos(a), rim - .012, cz + rr * Math.sin(a)));
	}
	const cord = new three.Mesh(new three.TubeGeometry(new three.CatmullRomCurve3(loop, true), 64, .003, 6, true), m.cord());
	g.add(cord);
	part(g, .014, .026, .012, m.buckle(), .03, rim - .03, d / 2 + .002);
	const front = d / 2 * (1 + .1 * Math.sin(Math.PI * .17 / top));
	soft(g, .24, .2, .04, .015, m.pack(), 0, .17, front + .006);
	part(g, .2, .004, .004, m.packDark(), 0, .265, front + .026);
	part(g, .03, .04, .012, m.packDark(), 0, .04, d / 2 + .004);
	for (const sx of [-1, 1]) {
		soft(g, .035, .13, d * .8, .012, m.mesh(), sx * (w / 2 + .012), .1, 0);
		for (const y of [.2, floor + .08]) {
			part(g, .006, .022, d - .02, m.packDark(), sx * (w / 2 + .003), y, 0);
			part(g, .01, .03, .03, m.buckle(), sx * (w / 2 + .008), y, d / 2 - .04);
		}
	}
	soft(g, w - .04, .38, .03, .012, m.packDark(), 0, .24, -d / 2 - .012);
	for (const sx of [-1, 1]) {
		strap(g, [
			v3(sx * .05, top - .02, -d / 2 - .03),
			v3(sx * .07, top - .1, -d / 2 - .085),
			v3(sx * .1, .22, -d / 2 - .08),
			v3(sx * .12, .1, -d / 2 - .045)
		], .06, .018, m.packDark());
		strap(g, [
			v3(sx * .1, .07, -d / 2 - .03),
			v3(sx * .18, .068, -d / 2 - .04),
			v3(sx * .22, .065, -d / 2 - .1)
		], .09, .02, m.packDark());
	}
	part(g, .13, .015, .006, m.buckle(), 0, top - .12, -d / 2 - .094);
	const grab = new three.Mesh(new three.TorusGeometry(.025, .005, 6, 14, Math.PI), m.packDark());
	grab.position.set(0, rim - .03, -d / 2 - .006);
	g.add(grab);
	const flap = new three.Group();
	flap.name = "lid";
	flap.position.set(0, rim, -d / 2);
	soft(flap, w + .01, .06, d + .03, .025, m.pack(), 0, .028, (d + .03) / 2 - .005);
	part(flap, w * .7, .004, .004, m.packDark(), 0, .058, d * .55);
	g.add(flap);
	const inside = new three.Group();
	inside.name = "inside";
	soft(inside, w - .05, .11, d - .05, .04, m.clothes(), 0, floor + .055, 0);
	const bottle = waterBottle();
	bottle.position.set(v >= 2 ? -.095 : -.085, floor, v >= 2 ? -.05 : -.04);
	bottle.rotation.z = .08;
	inside.add(bottle);
	const packets = {};
	const add = (id, [px, py, pz], [rx, ry, rz]) => {
		const p = seedPacket(id);
		p.position.set(px, py, pz);
		p.rotation.set(rx, ry, rz);
		inside.add(p);
		packets[id] = p;
	};
	if (v < 2) [
		"apple",
		"pear",
		"cherry",
		"hazel",
		"blackcurrant"
	].forEach((id, i) => add(id, [
		.11 - i * .035,
		floor + .09,
		.07 - i * .008
	], [
		-.08,
		-.25 + i * .03,
		(i - 2) * .05
	]));
	else Object.keys(SEED_PACKETS).forEach((id, i) => {
		const back = i >= 6, j = back ? i - 6 : i, n = back ? 4 : 6;
		const x = back ? -.018 + j * .039 : -.1 + j * .04;
		add(id, [
			x,
			floor + (back ? .12 : .09),
			(back ? -.012 : .068) + j * .003
		], [
			back ? -.12 : -.08,
			(j - (n - 1) / 2) * -.03,
			(j - (n - 1) / 2) * -.025
		]);
	});
	g.add(inside);
	g.traverse((o) => o.isMesh && (o.castShadow = true));
	const setOpen = (k) => {
		flap.rotation.x = -2.6 * Math.max(0, Math.min(1, k));
		inside.visible = k > .5;
	};
	setOpen(open);
	g.userData = {
		lid: flap,
		bottle,
		packets,
		inside,
		setOpen
	};
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
const HISTORY = /* @__PURE__ */ (() => ({ backpack: [{
	...FIRST,
	date: "2026-10-14",
	build: () => backpack({ v: 1 })
}, {
	v: 2,
	date: "2026-10-14",
	note: "Ten seed packets in it, one for each of V1’s ten trees: six along the front wall, four behind them standing higher, each a little in front of the one before so all ten read from above; the bottle in the corner behind"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "backpack",
	label: "Backpack",
	note: "a hiker’s pack of about 35 l, 32 × 22 cm and 46 cm to its rim: a drawstring collar, a lid pocket thrown back, a front pocket, mesh bottle pockets, padded back, curved shoulder straps and a hip belt; open, a 1 l water bottle and ten seed packets in it",
	usedIn: "MaiaCity V1",
	make: () => backpack()
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