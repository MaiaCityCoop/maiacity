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
