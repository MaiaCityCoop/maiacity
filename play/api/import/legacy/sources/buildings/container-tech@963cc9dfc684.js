//#piece c13f7b18f4effb2aa2fd97fb04ca6ccf54408f5e43b765a9b616498ca2292886
//#piece 46f629490bb8febee4061326fadb92c88b930b6e2878c797c59888579273c0d0
//#piece 8d9065a8cc6dec5b55423a03a1b69de1e2dd8d2e270c671fadcca7fc3ff61b42
//#piece 32599c99b93fd576369015e6d6650141015bd6c677c857792d27c0b3d3e6b837
*/
//#piece 5453b45df81dd34e604d13da7f7e7b65c4ec6b8cc0d9fa7ddd8c599bc6c57190
//#piece 78dc6d7754f85da0726e8692a4ad380484b9beab07751700ed617600bf8cc508
//#piece 2f082b7b1e56eed08b82d3c70af61f2a97625a430c2eaea9f5a77eac70e7ba7d
/** A rack's front: 42 units of servers, GPU boxes and switches behind a mesh door, `leds` true for their lights alone. */
/** @param {number} seed @param {boolean} leds */
function rackFront(seed, leds) {
	return canvasTexture(`rack:${seed}:${leds}`, 128, 448, (x, r) => {
		x.fillStyle = leds ? "#000" : "#141518";
		x.fillRect(0, 0, 128, 448);
		const u = 10;
		let y = 14;
		while (y < 434) {
			const kind = r();
			const h = kind < .45 ? 4 : kind < .7 ? 2 : 1;
			const top = y, hh = Math.min(h * u, 434 - y);
			if (!leds) {
				x.fillStyle = h === 4 ? "#24272b" : h === 2 ? "#2c3035" : "#1d1f22";
				x.fillRect(8, top + 1, 112, hh - 2);
				x.fillStyle = "rgba(255,255,255,0.08)";
				if (h > 1) for (let gx = 14; gx < 100; gx += 4) for (let gy = top + 4; gy < top + hh - 4; gy += 4) x.fillRect(gx, gy, 2, 2);
				else for (let p = 0; p < 24; p++) x.fillRect(14 + p * 4, top + 3, 3, 4);
			}
			const n = h === 1 ? 6 : 2;
			for (let k = 0; k < n; k++) {
				const on = r();
				x.fillStyle = on < .75 ? "#38e07a" : on < .95 ? "#4aa8ff" : "#ff9a2e";
				if (leds || on < .2) x.fillRect(h === 1 ? 14 + k * 16 : 106 + k * 6, top + (h === 1 ? 7 : 4), 3, 2);
			}
			y += hh;
		}
	}, !leds);
}
/** The energy dashboard on the control desk: today's sun, the batteries' charge, the fuel cell, the servers' load. */
function dashboard() {
	return canvasTexture("energy-dashboard", 512, 300, (x, r) => {
		x.fillStyle = "#0d1418";
		x.fillRect(0, 0, 512, 300);
		x.fillStyle = "#7fe0a8";
		x.font = "bold 26px Arial, sans-serif";
		x.fillText("SOLAR  11.2 kWp   ·   8.7 kW", 18, 38);
		x.fillStyle = "#a9c4cf";
		x.font = "20px Arial, sans-serif";
		x.fillText("BATTERY 82 %   FUEL CELL standby   H₂ 64 %", 18, 72);
		x.fillText("STARLINK 212 ↓ 24 ↑ Mbit/s   AI RACKS 6.1 kW", 18, 100);
		x.strokeStyle = "#f2c230";
		x.lineWidth = 3;
		x.beginPath();
		for (let i = 0; i <= 48; i++) {
			const px = 18 + i * 9.8, py = 270 - Math.max(0, Math.sin((i - 6) / 36 * Math.PI)) * 130 - r() * 6;
			if (i === 0) x.moveTo(px, py);
			else x.lineTo(px, py);
		}
		x.stroke();
		x.strokeStyle = "#4aa8ff";
		x.beginPath();
		for (let i = 0; i <= 48; i++) {
			const px = 18 + i * 9.8, py = 230 - i * .6 - r() * 10;
			if (i === 0) x.moveTo(px, py);
			else x.lineTo(px, py);
		}
		x.stroke();
	});
}
//#piece 920da7461a625f8907a2cc4ec189e0c8ac9f86c7d3b96c55062bad1a8364c9c8
//#piece 7e1ff95f55cb798a42610c4bb88b688e8a13c244803c99eac250e9aa468247a4
}
const screenMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: dashboard(),
	emissive: "#ffffff",
	emissiveMap: dashboard(),
	emissiveIntensity: .9
})))();
//#piece 65f0b88efcade786ab00b5716b93abb79ddc65d2ff61cb613f3fa36bf6ae2bd6
//#piece 43a308f2c500f9460f1458eaabb608564f4dae30c48395b480555f5ede111207
//#piece c7de36311572ca015b38b7eaf86fe188a02cbdf513f5c612c43b3a25ceae1da4
//#piece 31ee9d232982a4a3c3aaa7915346e823b2cdf91ae6949bbb45323ca07cbad122
//#piece 68a9130d5b5ded427f272f564b2cb112fed5d1ac7db2df1493b90caa3af0d98e
//#piece ca20793e1c3d005c5b401e8b2d59ea8edfc6423c859f20b3b2a7369a1a6255a3
//#piece 6dcfdd94afcebae487a3860125aeafde0abd070f0960c2397b32b4b7b575ddf8
	part(p, 1.72, .035, 1.13, m.galv(), 0, 0, 0);
//#piece 70ce7fc64284b554eac0a1ee9102c98d63456d40aadaf4f48d9e5ba58e9cfa70
	return p;
}
/** The solar array: two rows of seven panels on rails over the roof, a wing of seven folded out each side on struts — 28 panels, about 11 kWp. */
/** @param {THREE.Group} roof */
function solarArray(roof) {
	for (const sz of [-1, 1]) part(roof, L - .2, .05, .05, m.galv(), 0, H + .08, sz * .75);
	for (let i = 0; i < 7; i++) {
		const x = -L / 2 + .1 + .86 + i * 1.73;
		for (const sz of [-1, 1]) pvPanel(roof, x, H + .14 + (sz < 0 ? .04 : 0), sz * .575, .035);
		for (const sz of [-1, 1]) {
			pvPanel(roof, x, H + .02, sz * (W / 2 + .62), sz * .12);
			bar(roof, v3(x, 2.05, sz * (W / 2 + .03)), v3(x, H - .02, sz * (W / 2 + 1.05)), .02, m.galv());
		}
	}
}
/** Starlink on a mast: the rectangular dish (51 × 30 cm) tipped to the sky; its mast clamped to the end wall. */
function starlinkMast() {
	const g = new three.Group();
	bar(g, v3(0, 1.8, 0), v3(0, H + 1.25, 0), .025, m.galv());
	for (const y of [2, 2.7]) part(g, .12, .06, .06, m.frame(), .06, y, 0);
	const dish = new three.Group();
	dish.position.set(0, H + 1.3, 0);
	dish.rotation.x = -.35;
	g.add(dish);
	soft(dish, .513, .04, .303, .015, m.white(), 0, .05, 0);
	bar(dish, v3(0, 0, 0), v3(0, .04, 0), .02, m.white());
	bar(g, v3(0, 2.3, 0), v3(0, .8, 0), .006, m.black());
	return g;
}
/** A battery cabinet: 0.6 × 0.6 × 2.0 m, eight LFP modules of 5 kWh behind a glass door, their charge lights. */
function batteryCabinet() {
	const g = new three.Group();
	part(g, .6, 2, .6, m.white(), 0, 1, 0);
	part(g, .56, .1, .02, m.graphite(), 0, 1.92, .3);
	unlit(part(g, .14, .06, .004, m.ledBlue(), .15, 1.92, .312));
	for (let i = 0; i < 8; i++) {
		const y = .18 + i * .21;
		part(g, .52, .18, .02, m.graphite(), 0, y, .3);
		for (let k = 0; k < 4; k++) unlit(part(g, .018, .012, .004, k < 3 || i % 3 ? m.ledGreen() : m.black(), -.2 + k * .03, y + .05, .312));
	}
	return g;
}
/** A hybrid inverter on the wall, 0.5 × 0.7 × 0.22 m, its display and isolator under it; its back at z 0. */
function inverter() {
	const g = new three.Group();
	part(g, .5, .7, .22, m.blue(), 0, 1.45, .11);
	part(g, .3, .08, .01, m.black(), 0, 1.6, .225);
	unlit(part(g, .22, .05, .004, m.ledBlue(), 0, 1.6, .231));
	part(g, .16, .2, .1, m.grey(), 0, .92, .05);
	part(g, .04, .04, .03, m.red(), 0, .95, .11);
	part(g, .1, .7500000000000001, .06, m.grey(), 0, 2.1750000000000003, .03);
	return g;
}
/** A tall grey cabinet w wide with its name on it: the distribution board, the fuel cell, the electrolyser. */
/** @param {number} w @param {number} d @param {number} h @param {string} name @param {string} band */
function cabinet(w, d, h, name, band) {
	const g = new three.Group();
	part(g, w, h, d, m.grey(), 0, h / 2, 0);
	part(g, w, .12, .012, std(band, .5)(), 0, h - .2, d / 2 + .006);
	unlit(sheet(g, Math.min(.5, w - .1), .12, plateMat(name, "#d6d6d1", "#27312d"), 0, h - .4, d / 2 + .008));
	part(g, .008, h - .1, .004, m.graphite(), 0, h / 2, d / 2 + .003);
	for (let i = 0; i < 8; i++) part(g, w * .35, .012, .006, m.graphite(), -w / 4, .25 + i * .04, d / 2 + .003);
	part(g, .025, .12, .03, m.black(), w / 2 - .08, h / 2, d / 2 + .015);
	unlit(part(g, .12, .07, .004, m.ledGreen(), w / 4, h - .55, d / 2 + .008));
	return g;
}
/** A server rack, 0.6 × 1.0 × 2.0 m (42 units), its mesh door showing the servers and their lights. */
/** @param {number} seed */
function serverRack(seed) {
	const g = new three.Group();
	part(g, .6, 2, 1, m.black(), 0, 1, 0);
	const face = sheet(g, .56, 1.96, new three.MeshStandardMaterial({
		map: rackFront(seed, false),
		emissive: "#ffffff",
		emissiveMap: rackFront(seed, true),
		emissiveIntensity: 1.4,
		roughness: .5
	}), 0, 1, .501);
	face.receiveShadow = true;
	part(g, .025, 1.96, .02, m.graphite(), .27, 1, .51);
	return g;
}
/** A wall-mounted air conditioner's indoor unit, 0.9 × 0.3 × 0.22 m; its back at z 0. */
function acIndoor() {
	const g = new three.Group();
	soft(g, .9, .3, .22, .04, m.white(), 0, 0, .11);
	part(g, .8, .03, .02, m.grey(), 0, -.1, .22);
	unlit(part(g, .03, .012, .004, m.ledBlue(), .35, .05, .222));
	return g;
}
/** An air conditioner's outdoor unit, 0.8 × 0.3 × 0.6 m, its fan behind a grille facing +z. */
function acOutdoor() {
	const g = new three.Group();
	part(g, .8, .6, .3, m.white(), 0, .3, 0);
	const grille = new three.Mesh(new three.CircleGeometry(.22, 24), m.graphite());
	grille.position.set(-.1, .3, .151);
	g.add(grille);
	for (let i = 0; i < 4; i++) {
		const ring = new three.Mesh(new three.TorusGeometry(.06 + i * .05, .004, 4, 24), m.galv());
		ring.position.set(-.1, .3, .155);
		g.add(ring);
	}
	return g;
}
/** A bundle of six hydrogen bottles in a steel cage, 0.6 × 0.9 × 1.8 m, their red shoulders; the regulator and a yellow pipe. */
function hydrogenBundle() {
	const g = new three.Group();
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, .05, 1.8, .05, m.frame(), sx * .28, .9, sz * .43);
	for (const y of [
		.05,
		.9,
		1.75
	]) for (const sz of [-1, 1]) part(g, .6, .04, .03, m.frame(), 0, y, sz * .43);
	for (let i = 0; i < 6; i++) {
		const x = i % 2 ? .12 : -.12, z = -.28 + Math.floor(i / 2) * .28;
		drum(g, .11, 1.4, m.grey(), x, .05, z);
		drum(g, .11, .18, m.red(), x, 1.45, z);
		drum(g, .025, .08, m.chrome(), x, 1.63, z, 8);
	}
	part(g, .14, .1, .1, m.chrome(), .2, 1.7, 0);
//#piece beb6bca887886923a6b060ad8a954bcc592059e8846a1754dc04c8003b095b8f
* The tech container: the settlement's power, its link to the world and its AI. Solar on the roof and on wings
* folded out either side, about 11 kWp (as Africa GreenTec's Solartainer); inside from the open end the control desk,
* the hybrid inverters and the distribution board, 40 kWh of LFP batteries in five cabinets; a hydrogen fuel cell and
* the electrolyser that fills its bottles from the summer's surplus (the bottles caged outside); Starlink on its mast;
* and behind a glass wall the AI server room, seven racks along the back, cooled by two split units.
*/
function techContainer() {
	const b = box({
		name: "tech container",
		color: "#5e8a6b",
		floor: floorMaterial("#9b9e9f"),
		label: "TECH",
		labelX: 0,
		front: [{
			u0: 3.6,
			u1: 4.4,
			y0: 1.5,
			y1: 2.2,
			glass: "clear"
		}]
	});
	const { g, roof, solids } = b;
	const f = fitter(g, solids);
	solarArray(roof);
	f.put(starlinkMast(), -L / 2 - .08, .95, { y: 0 });
	part(g, .06, .12, .06, m.frame(), -L / 2 - .03, 2, .95);
	for (let i = 0; i < 5; i++) f.put(batteryCabinet(), 1.9 + i * .62, atBack(.6), {
		w: .6,
		d: .6
	});
	f.put(cabinet(.8, .4, 2, "DISTRIBUTION", "#f2c230"), 5.2, atBack(.4), {
		w: .8,
		d: .4
	});
	for (let i = 0; i < 3; i++) f.put(inverter(), 1.4 + i * .6, Z1, {
		ry: Math.PI,
		y: FLOOR
	});
	f.block(1.1, 2.9, Z1 - .22, Z1);
	part(g, 4.6, .08, .3, m.galv(), 3.3, 2.5500000000000003, Z1 - .3);
	part(g, 11.5, .08, .3, m.galv(), 0, 2.5500000000000003, Z0 + .25);
	const desk = f.put(steelTable(1.2, .6, {
		upstand: false,
		shelf: false
	}), 4.9, atFront(.6), {
		ry: Math.PI,
		w: 1.2,
		d: .6
	});
	part(desk, .55, .34, .03, m.black(), 0, 1.15, .1);
	unlit(sheet(desk, .52, .3, screenMat(), 0, 1.15, .116));
	bar(desk, v3(0, .9, .08), v3(0, .98, .08), .02, m.black());
	part(desk, .4, .015, .13, m.graphite(), 0, .91, -.12);
	drum(g, .2, .05, m.graphite(), 4.9, .6, Z1 - .9, 20);
	bar(g, v3(4.9, FLOOR, Z1 - .9), v3(4.9, .6, Z1 - .9), .025, m.graphite());
	f.put(extinguisher(), 5.75, Z1, {
		ry: Math.PI,
		y: 1.05
	});
	f.put(cabinet(1.1, .75, 1.9, "FUEL CELL H₂", "#2f8a4a"), -.35, atBack(.75), {
		w: 1.1,
		d: .75
	});
	f.put(cabinet(1, .75, 1.9, "ELECTROLYSER", "#2a64a8"), .8, atBack(.75), {
		w: 1,
		d: .75
	});
	drum(g, .22, 1.1, m.white(), .2, FLOOR, Z1 - .25, 24);
	f.block(-.02, .42, Z1 - .47, Z1);
	unlit(sheet(g, .3, .075, plateMat("H₂O", "#ffffff", "#2a64a8"), .2, .9500000000000001, Z1 - .47, Math.PI));
	bar(g, v3(-.35, 2.05, Z0 + .3), v3(-.35, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	bar(g, v3(-.35, 2.4000000000000004, Z0 + .3), v3(X0, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	unlit(sheet(g, .2, .18, plateMat("⚠ H₂", "#f2c230", "#1b1c1e"), 1.5, 1.75, Z0 + .01));
	const gx = -1.3;
	unlit(part(g, .012, 2.5500000000000003, 1.45, m.glass(), gx, 1.425, Z0 + .725));
	part(g, .05, 2.5500000000000003, .05, m.frame(), gx, 1.425, Z0 + 1.45);
	part(g, .05, .05, Z1 - Z0, m.frame(), gx, 2.6750000000000003, 0);
	part(g, .05, .40000000000000036, Z1 - Z0 - 1.45, m.frame(), gx, 2.5, Z1 - (Z1 - Z0 - 1.45) / 2);
	f.block(-1.33, -1.27, Z0, Z0 + 1.48);
	const door = new three.Group();
	door.position.set(gx, FLOOR, Z1 - .03);
	door.rotation.y = Math.PI;
	g.add(door);
	unlit(part(door, .72, 2.1, .012, m.glass(), .36, 1.05, 0));
	part(door, .03, .6, .03, m.chrome(), .65, 1.05, -.03);
	f.block(-2.05, gx, Z1 - .06, Z1);
	unlit(sheet(g, .5, .12, plateMat("AI SERVERS", "#1b1c1e", "#38e07a"), -1.29, 2.35, Z0 + .7, Math.PI / 2));
	for (let i = 0; i < 7; i++) f.put(serverRack(i + 1), -5.55 + i * .6, atBack(1), {
		w: .6,
		d: 1
	});
	for (const x of [-4.8, -2.6]) f.put(acIndoor(), x, Z1, {
		ry: Math.PI,
		y: 2.3
	});
	const net = f.put(new three.Group(), -3.7, Z1, {
		ry: Math.PI,
		y: 1.2
	});
	part(net, .6, .6, .45, m.black(), 0, .3, .225);
	unlit(part(net, .5, .5, .006, m.glass(), 0, .3, .452));
	part(net, .44, .045, .3, m.graphite(), 0, .42, .25);
	for (let k = 0; k < 12; k++) unlit(part(net, .012, .008, .004, k % 4 ? m.ledGreen() : m.ledBlue(), -.18 + k * .03, .43, .402));
	soft(net, .22, .05, .16, .02, m.white(), -.1, .17, .25);
	f.block(-4, -3.4, Z1 - .45, Z1);
	const gas = f.put(new three.Group(), -5.75, Z1 - .2, {
		w: .3,
		d: .3
	});
	drum(gas, .13, 1.3, m.red(), 0, 0, 0, 20);
	drum(gas, .04, .1, m.chrome(), 0, 1.3, 0, 10);
	f.put(hydrogenBundle(), -L / 2 - .45, -.55, {
		w: .6,
		d: .9
	});
	bar(g, v3(-L / 2 - .25, 1.75, -.55), v3(-L / 2 - .25, 2.4000000000000004, -.55), .014, m.yellow());
	bar(g, v3(-L / 2 - .25, 2.4000000000000004, -.55), v3(-L / 2 - .25, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	bar(g, v3(-L / 2 - .25, 2.4000000000000004, Z0 + .3), v3(X0, 2.4000000000000004, Z0 + .3), .014, m.yellow());
	for (const y of [.1, .8]) f.put(acOutdoor(), -L / 2 - .2, .3, {
		ry: -Math.PI / 2,
		y,
		w: .3,
		d: .8
	});
//#piece 9fe4d7a5c3a57f0228d10a8b40c58e70009e318ff4e0c558cbf3c42584741b56
	id: "container-tech",
	label: "Tech container",
	note: "28 solar panels (about 11 kWp) on the roof and fold-out wings, 40 kWh of batteries, inverters, a hydrogen fuel cell and electrolyser, Starlink, and the AI server room behind glass. Walk in",
	usedIn: "Sandbox 1",
	make: () => techContainer()
//#piece a805881158d711f214494d7a3f7d58187dc9573d69dbb10f5306b43780e85b80
