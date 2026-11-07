//#piece 49108f821b155b24a5b6ec659c4399d6a5b416bad5adc307ec552a423889a5ef
//#region src/lib/biomes/noise.js
const fract$1 = (x) => x - Math.floor(x);
/** a hash of a lattice point, 0…1 @param {number} x @param {number} y */
function h21(x, y) {
	let px = fract$1(x * 123.34), py = fract$1(y * 456.21);
	const d = px * (px + 45.32) + py * (py + 45.32);
	px += d;
	py += d;
	return fract$1(px * py);
}
/** smooth value noise, 0…1 @param {number} x @param {number} y */
function vn(x, y) {
	const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
	const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1);
	return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
/** three octaves of it, 0…1 @param {number} x @param {number} y */
const fbm2 = (x, y) => vn(x, y) * .55 + vn(x * 2.03 + 7.1, y * 2.03 + 7.1) * .3 + vn(x * 4.1 + 3.3, y * 4.1 + 3.3) * .15;
//#piece aab55d5c339c01ae09c509bdd50faefa12b9e7b55d400b020ae53f8188c3d2d7
	}
//#piece c62608554484cfe6384d662c31be89f79c823cfb3e4ae356d7aeeee5c41899dd
//#piece 0077c186bf9a692b3bfb1b6cf04e40114df758cf024e167a5d1c9c4f4861fabf
//#piece 1fa7a17305ce2a9b7794a9a7cfb1ec83ff9c143ec7e891afd3fd9ee6d0c796c2
//#piece ddea639caddd3dbe0b17e3b5d936203a3691518aa8eacefa06fc781ce056e6c9
//#piece 87285ee60040e60a446473968746c54546e6212ae01364807ed772834588d8ba
//#piece 54038b6c12687cde4d4755cabca3006d482dd981e2ed87a70d497e8c8b6135f9
	mushrooms: {
		label: "Mushrooms",
		build: mushrooms
	}
};

//#endregion
//#region src/lib/biomes/surfaces.js
/** @typedef {'litter' | 'humus' | 'needles' | 'moss' | 'green' | 'soil'} Surface */
/** @type {Surface[]} */
const SURFACES = [
	"litter",
	"humus",
	"needles",
	"moss",
	"green",
	"soil"
];
/** @type {Record<Surface, { label: string, patch: number, tile: number }>} its name, how big its patches are (m), how much ground one tile of its texture covers (m) */
const SURFACE = {
	litter: {
		label: "Leaf litter",
		patch: 6,
		tile: 2.2
	},
	humus: {
		label: "Humus",
		patch: 3,
		tile: 2.4
	},
	needles: {
		label: "Needles",
		patch: 7,
		tile: 1.6
	},
	moss: {
		label: "Moss carpet",
		patch: 4,
		tile: 2
	},
	green: {
		label: "Living mat",
		patch: 9,
		tile: 1.7
	},
	soil: {
		label: "Bare soil",
		patch: 5,
		tile: 2.6
	}
};
const textures = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** @param {string} key @param {(x: CanvasRenderingContext2D, r: () => number) => void} draw */
function canvasTexture(key, draw) {
	const hit = textures.get(key);
	if (hit) return hit;
	const c = document.createElement("canvas");
	c.width = c.height = 512;
	draw(c.getContext("2d"), rng([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
	const t = new three.CanvasTexture(c);
	t.colorSpace = three.SRGBColorSpace;
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.anisotropy = 8;
	textures.set(key, t);
	return t;
}
/** a mottled base: two colours by a noise @param {CanvasRenderingContext2D} x @param {() => number} r @param {number[]} a @param {number[]} b @param {number} scale */
function base(x, r, a, b, scale) {
	const img = x.createImageData(512, 512);
	for (let i = 0; i < 262144; i++) {
		const g = fbm2(i % 512 / scale, (i / 512 | 0) / scale) * .75 + r() * .25;
		for (let k = 0; k < 3; k++) img.data[i * 4 + k] = a[k] + (b[k] - a[k]) * g;
		img.data[i * 4 + 3] = 255;
	}
	x.putImageData(img, 0, 0);
}
const pick$1 = (list, r) => list[Math.floor(r() * list.length)];
/** a leaf, its tip to one side, a midrib @param {CanvasRenderingContext2D} x */
function leaf(x, cx, cy, len, a, fill, wide) {
	x.save();
	x.translate(cx, cy);
	x.rotate(a);
	x.fillStyle = fill;
	x.beginPath();
	x.moveTo(-len, 0);
	x.quadraticCurveTo(-len * .2, -len * wide, len, 0);
	x.quadraticCurveTo(-len * .2, len * wide, -len, 0);
	x.fill();
	x.globalAlpha *= .5;
	x.strokeStyle = "#2a1a0c";
	x.lineWidth = .7;
	x.beginPath();
	x.moveTo(-len, 0);
	x.lineTo(len * .9, 0);
	x.stroke();
	x.restore();
}
/** @type {Record<Surface, () => THREE.Texture>} */
const TEXTURES = {
	litter: () => canvasTexture("biome-litter", (x, r) => {
		base(x, r, [
			44,
			30,
			18
		], [
			70,
			48,
			28
		], 20);
		const browns = [
			"#7a4e2e",
			"#6b4a32",
			"#8a6a4a",
			"#5a3e2a",
			"#9a7350",
			"#4e3a2a",
			"#86603e",
			"#6e5a44",
			"#a07a52"
		];
		for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 1700; i++) {
			x.globalAlpha = pass ? .92 : .6;
			leaf(x, r() * 512, r() * 512, 7 + r() * 11, r() * Math.PI * 2, pick$1(browns, r), .42 + r() * .2);
		}
		x.globalAlpha = 1;
		for (let i = 0; i < 40; i++) {
			x.strokeStyle = r() < .5 ? "#3a2a1c" : "#5a4430";
			x.lineWidth = 1 + r() * 2;
			const cx = r() * 512, cy = r() * 512, len = 15 + r() * 40, a = r() * Math.PI;
			x.beginPath();
			x.moveTo(cx, cy);
			x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
			x.stroke();
		}
	}),
	humus: () => canvasTexture("biome-humus", (x, r) => {
		base(x, r, [
			24,
			17,
			11
		], [
			52,
			37,
			24
		], 9);
		for (let i = 0; i < 3500; i++) {
			x.fillStyle = r() < .5 ? "rgba(20,14,9,0.6)" : "rgba(80,58,36,0.5)";
			x.beginPath();
			x.arc(r() * 512, r() * 512, .8 + r() * 2.2, 0, Math.PI * 2);
			x.fill();
		}
		for (let i = 0; i < 200; i++) {
			x.globalAlpha = .5;
			leaf(x, r() * 512, r() * 512, 3 + r() * 5, r() * 6.28, pick$1([
				"#5e3e22",
				"#4a3220",
				"#6a4a2a"
			], r), .5);
		}
		x.globalAlpha = 1;
	}),
	needles: () => canvasTexture("biome-needles", (x, r) => {
		base(x, r, [
			52,
			36,
			24
		], [
			88,
			60,
			38
		], 16);
		const tones = [
			"#8a5a32",
			"#a06a3a",
			"#6e5440",
			"#9a8268",
			"#5a4030",
			"#b0784a"
		];
		for (let i = 0; i < 9e3; i++) {
			const cx = r() * 512, cy = r() * 512, len = 4 + r() * 6, a = r() * Math.PI;
			x.strokeStyle = pick$1(tones, r);
			x.globalAlpha = .85;
			x.lineWidth = .9;
			x.beginPath();
			x.moveTo(cx, cy);
			x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
			x.stroke();
		}
		x.globalAlpha = 1;
	}),
	moss: () => canvasTexture("biome-moss", (x, r) => {
		base(x, r, [
			34,
			54,
			18
		], [
			96,
			128,
			46
		], 10);
		for (let i = 0; i < 9e3; i++) {
			x.fillStyle = pick$1([
				"#4a6a22",
				"#5e8028",
				"#78963a",
				"#3a5418",
				"#88a444"
			], r);
			x.globalAlpha = .7;
			x.beginPath();
			x.arc(r() * 512, r() * 512, 1 + r() * 2.2, 0, Math.PI * 2);
			x.fill();
		}
		x.globalAlpha = 1;
	}),
	green: () => canvasTexture("biome-green", (x, r) => {
		base(x, r, [
			28,
			48,
			22
		], [
			58,
			88,
			36
		], 22);
		const greens = [
			"#3f6a2c",
			"#4e7a34",
			"#5b8a3a",
			"#6a9842",
			"#466f30",
			"#78a44a"
		];
		for (let i = 0; i < 5200; i++) {
			const cx = r() * 512, cy = r() * 512, k = r();
			x.fillStyle = pick$1(greens, r);
			if (k < .45) {
				const s = 2.2 + r() * 2.4, a = r() * Math.PI * 2;
				for (let j = 0; j < 3; j++) {
					const b = a + j * Math.PI * 2 / 3;
					x.beginPath();
					x.arc(cx + Math.cos(b) * s, cy + Math.sin(b) * s, s * .95, 0, Math.PI * 2);
					x.fill();
				}
			} else if (k < .8) {
				const len = 6 + r() * 12, a = r() * Math.PI * 2;
				x.strokeStyle = pick$1(greens, r);
				x.lineWidth = 1 + r();
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
				x.stroke();
			} else {
				x.beginPath();
				x.ellipse(cx, cy, 2 + r() * 3, 1.5 + r() * 2, r() * Math.PI, 0, Math.PI * 2);
				x.fill();
			}
		}
	}),
	soil: () => canvasTexture("biome-soil", (x, r) => {
		base(x, r, [
			74,
			54,
			36
		], [
			116,
			88,
			60
		], 14);
		for (let i = 0; i < 1400; i++) {
			x.fillStyle = pick$1([
				"#8a8076",
				"#6a6058",
				"#a09486",
				"#5a4a3a"
			], r);
			x.beginPath();
			x.ellipse(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 2.4, r() * 3, 0, Math.PI * 2);
			x.fill();
		}
	})
};
/** @typedef {Partial<Record<Surface, number>>} Weights how much of the floor each surface takes (any scale) */
/**
* How much of the floor at x, z (world metres) each surface is: the same sums as the shader's. (Ground laid flat:
* its other axis runs −z.)
* @param {Weights} weights @param {number} x @param {number} z
* @returns {Record<Surface, number>}
*/
function surfacesAt(weights, x, z) {
	const u = x, v = -z;
	/** @type {Record<string, number>} */
	const out = {};
	let sum = 0;
	SURFACES.forEach((s, i) => {
		const w = weights[s] ?? 0;
		if (w <= 0) return out[s] = 0;
		const p = SURFACE[s].patch, f = fbm2(u / p + i * 17.3, v / p + i * 17.3);
		const v6 = w * Math.pow(.35 + f, 6);
		out[s] = v6;
		sum += v6;
	});
	for (const s of SURFACES) out[s] = sum > 0 ? out[s] / sum : 0;
	return out;
//#piece ca817ec2fc9fe61368a8ac2881e9d0bc88dff98689106955be77984b53ea44af
//#region src/lib/biomes/index.js
/** @typedef {import('./cover.js').Cover} Cover */
/** @typedef {import('./surfaces.js').Surface} Surface */
/**
* @typedef {object} Colony one kind of cover in a biome
* @property {Cover} kind
* @property {number} share how often it is met where its colonies are, against the others
* @property {number} colony how big its colonies are across (m)
* @property {number} spread how much of the ground its colonies take (0…1)
* @property {Surface} [on] the surface it grows on (it is met there, and seldom elsewhere)
* @property {number} [fill] how full its colonies are (0…1, 0.85 if not said)
* @property {string} [ref] the asset it is, as a biome's card names it (./card.js): the cover's kind at its seed; where a
*   biome says none, ./built.js `coverRef` of its kind and ./index.js `coverSeed`
*/
/**
* @typedef {object} Recipe a biome
* @property {string} id
* @property {string} label
* @property {string} note
* @property {string} from where it is used
* @property {Partial<Record<Surface, number>>} surface how much of the floor each surface takes
* @property {number} density how many plants (or things) of its cover stand on a square metre inside their colonies
* @property {Colony[]} cover
*/
/** @type {Recipe[]} */
const LIST$1 = [{
