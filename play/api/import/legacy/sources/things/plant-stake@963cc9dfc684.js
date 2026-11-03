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
/** the plant stake's measures: 1 m of round peeled pine 32 mm thick, its point 9 cm; the flag 10 × 7 cm on its wire */
const STAKE = {
	len: 1,
	r: .016,
	tip: .09,
	flagW: .1,
	flagH: .07
};
const stakeWood = () => canvasTexture("plant-stake-wood", 128, 1024, (x, r) => {
	x.fillStyle = "#d6b483";
	x.fillRect(0, 0, 128, 1024);
	for (let i = 0; i < 70; i++) {
		const gx = r() * 128, w = .6 + r() * 2.2;
		x.strokeStyle = r() < .5 ? "#b38a57" : "#e6caa0";
		x.globalAlpha = .15 + r() * .35;
		x.lineWidth = w;
		x.beginPath();
		x.moveTo(gx, 0);
		for (let y = 0; y <= 1024; y += 64) x.lineTo(gx + Math.sin(y * .01 + i) * 1.5, y);
		x.stroke();
	}
	x.globalAlpha = 1;
	for (let i = 0; i < 9; i++) {
		x.fillStyle = r() < .5 ? "#6e4c2e" : "#8a6440";
		x.globalAlpha = .55 + r() * .35;
		x.beginPath();
		x.ellipse(r() * 128, r() * 1024, 2 + r() * 5, 20 + r() * 70, 0, 0, Math.PI * 2);
		x.fill();
	}
	x.globalAlpha = 1;
	for (const [kx, ky] of [[40, 300], [96, 720]]) for (let k = 4; k >= 1; k--) {
		x.fillStyle = k % 2 ? "#8c6238" : "#a8794a";
		x.beginPath();
		x.ellipse(kx, ky, k * 2.4, k * 4.2, 0, 0, Math.PI * 2);
		x.fill();
	}
});
const endGrain = () => canvasTexture("plant-stake-end", 128, 128, (x) => {
	x.fillStyle = "#e4cba0";
	x.fillRect(0, 0, 128, 128);
	for (let k = 1; k < 9; k++) {
		x.strokeStyle = "rgba(150,105,60,0.55)";
		x.lineWidth = 1.5;
		x.beginPath();
		x.arc(66, 62, k * 7.5, 0, Math.PI * 2);
		x.stroke();
	}
});
/** the flag's print, on one side: a sleeve down its hoist, the plant in a frame next to it, the tree's name and what it
*  is. `hoistLeft`: the side seen from the front has the wire on its left, the back has it on its right. */
function drawFlag(x, seed, name, hoistLeft) {
	const s = ALL_PACKETS[seed] ?? ALL_PACKETS.apple;
	const W = 500, H = 350;
	x.clearRect?.(0, 0, W, H);
	x.fillStyle = "#f6efdc";
	x.fillRect(0, 0, W, H);
	const at = (px) => hoistLeft ? px : W - px;
	x.fillStyle = s.band;
	x.fillRect(hoistLeft ? 0 : 474, 0, 26, H);
	x.strokeStyle = s.band;
	x.setLineDash?.([10, 7]);
	x.lineWidth = 3;
	x.strokeRect(10, 10, 480, 330);
	x.setLineDash?.([]);
	const fx = Math.min(at(44), at(254));
	x.fillStyle = "#fffdf6";
	x.fillRect(fx, 62, 210, 226);
	x.lineWidth = 4;
	x.strokeRect(fx, 62, 210, 226);
	x.save();
	x.translate(fx + 10, 80);
	x.scale(.86, .86);
	FRUIT[seed in FRUIT ? seed : "apple"](x);
	x.restore();
	const cx = (at(268) + at(478)) / 2, text = name || s.label;
	let size = 66;
	x.font = `bold ${size}px Georgia, serif`;
	while (size > 26 && x.measureText(text).width > 200) x.font = `bold ${size -= 2}px Georgia, serif`;
	x.textAlign = "center";
	x.fillStyle = "#2a2218";
	x.fillText(text, cx, name ? 172 : 190);
	if (name) {
		x.fillStyle = s.band;
		x.fillRect(cx - 70, 196, 140, 3);
		x.font = "italic 30px Georgia, serif";
		x.fillStyle = "#5a4c3a";
		x.fillText(s.label, cx, 240);
	}
}
/** A plant stake, as a young tree gets one beside it: 1 m of round peeled pine, axe-pointed, to tie the tree to as it
*  grows, pushed in beside the seed. Near its top a little waxed-cloth flag on a wire, printed on both sides with the
*  tree's name and a picture of what it is (`seed`: one of SEED_PACKETS), flying to its left (+x). Its origin is its
*  point (push it in to the depth you want). `userData.setName(name)` reprints the flag; `userData.flag` is the cloth,
*  its pivot on the wire (turn it on y to swing it in the wind). */
function plantStake({ name = "", seed = "apple" } = {}) {
	const g = new three.Group();
	g.name = "plant-stake";
	const { len, r, tip, flagW, flagH } = STAKE;
	const wood = new three.MeshStandardMaterial({
		map: stakeWood(),
		roughness: .82
	});
	const cut = new three.MeshStandardMaterial({
		color: "#e3c898",
		roughness: .85,
		flatShading: true
	});
	const point = new three.Mesh(new three.ConeGeometry(r, tip, 7, 1).rotateX(Math.PI).translate(0, tip / 2, 0), cut);
	const top = len - .006;
	const pole = new three.Mesh(new three.CylinderGeometry(r, r, top - tip, 16, 1).translate(0, (top + tip) / 2, 0), wood);
	const bevel = new three.Mesh(new three.CylinderGeometry(r * .8, r, .006, 16, 1).translate(0, len - .003, 0), cut);
	const end = new three.Mesh(new three.CircleGeometry(r * .8, 16).rotateX(-Math.PI / 2).translate(0, len, 0), new three.MeshStandardMaterial({
		map: endGrain(),
		roughness: .9
	}));
	g.add(point, pole, bevel, end);
	const wire = std("#a7abae", .4, { metalness: .8 })();
	const wx = r + .0016, w0 = len - .13, w1 = len + .125;
	g.add(new three.Mesh(new three.CylinderGeometry(.0013, .0013, w1 - w0, 6).translate(wx, (w0 + w1) / 2, 0), wire));
	const knob = new three.Mesh(new three.SphereGeometry(.0022, 8, 6), wire);
	knob.position.set(wx, w1, 0);
	g.add(knob);
	const twine = std("#cdb38a", .95)();
	for (const ly of [len - .03, len - .105]) for (let k = 0; k < 4; k++) {
		const wrap = new three.Mesh(new three.TorusGeometry(r + .0012, .0011, 5, 24), twine);
		wrap.rotation.x = Math.PI / 2;
		wrap.position.set(8e-4, ly + k * .0024, 0);
		wrap.scale.set(1.08, 1, 1);
		g.add(wrap);
	}
	const flag = new three.Group();
	flag.position.set(wx, w1 - .006 - flagH / 2, 0);
	g.add(flag);
	const print = (hoistLeft) => {
		const c = document.createElement("canvas");
		c.width = 500;
		c.height = 350;
		const t = new three.CanvasTexture(c);
		t.colorSpace = three.SRGBColorSpace;
		t.anisotropy = 8;
		if (!hoistLeft) {
			t.wrapS = three.RepeatWrapping;
			t.repeat.x = -1;
			t.offset.x = 1;
		}
		return {
			c,
			t,
			hoistLeft
		};
	};
	const sides = [print(true), print(false)];
	const cloth = new three.PlaneGeometry(flagW, flagH, 20, 4).translate(flagW / 2 + .002, 0, 0);
	const p = cloth.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const u = (p.getX(i) - .002) / flagW;
		p.setZ(i, .007 * u * Math.sin(u * Math.PI * 2.2));
		p.setY(i, p.getY(i) - .005 * u * u);
	}
	cloth.computeVertexNormals();
	const faces = sides.map(({ t }, i) => new three.Mesh(cloth, new three.MeshStandardMaterial({
		map: t,
		roughness: .55,
		side: i ? three.BackSide : three.FrontSide
	})));
	const sleeve = new three.Mesh(new three.CylinderGeometry(.0028, .0028, flagH, 10), std((ALL_PACKETS[seed] ?? ALL_PACKETS.apple).band, .6)());
	flag.add(...faces, sleeve);
	const setName = (n) => {
		for (const { c, t, hoistLeft } of sides) {
			drawFlag(c.getContext("2d"), seed, n, hoistLeft);
			t.needsUpdate = true;
		}
		g.userData.name = n;
	};
	g.traverse((o) => o.isMesh && (o.castShadow = true));
	g.userData = {
		seed,
		flag,
		setName
	};
	setName(name);
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
const HISTORY = /* @__PURE__ */ (() => ({ "plant-stake": [{
	...FIRST,
	date: "2026-10-14",
	build: () => plantStake({
		name: "Samuel",
		seed: "apple"
	})
}, {
	v: 2,
	date: "2026-10-16",
	note: "Built with the tree’s name and its plant (`name`, `seed`), printed on its flag: MaiaCity V1 puts one by every tree it grows; the stake itself as v1"
}] }))();
const LIST = /* @__PURE__ */ (() => [{
	id: "plant-stake",
	label: "Plant stake",
	note: "a young tree’s stake of round peeled pine, 1 m long and 32 mm thick, axe-pointed, pushed in beside the seed; on a wire tied to its top a 10 × 7 cm waxed-cloth flag printed on both sides with the tree’s name and its plant",
	usedIn: "MaiaCity V1",
	params: [{
		id: "name",
		label: "Name on its flag",
		type: "string",
		value: "Samuel"
	}, {
		id: "seed",
		label: "Its plant",
		type: "string",
		value: "apple",
		maxLength: 24
	}],
	make: (name = "Samuel", seed = "apple") => plantStake({
		name: String(name),
		seed: String(seed)
	})
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