//#piece 1e2b17470c79ceb1daa9c1c785aa97a42cb96467353a4fc54ef9743f9fc9bc57
//#piece 8d9065a8cc6dec5b55423a03a1b69de1e2dd8d2e270c671fadcca7fc3ff61b42
//#piece 9376596ea7cea4369f22e6b089b016d946aeec342c8d5021f863c76d9c6f6213
//#piece 820993098d414cdd2fd60a6bca99d526b047fc5e67f9cee17355f01487973907
//#piece 8af2ab8c7445977469ed797120f7b100d1bb5bcf1d0c3b7f6b69dccbbd7d476e
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
//#piece c729b38b253f1abf985872fc0f824e9e23f518a8cc3f50841183a2676ff24549
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
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
