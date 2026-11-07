//#piece acf4a5c23ace6076792cc8f05f091968bd456ca50412ac1bb24e22988509aba2
//#piece 3bc64030a534155d4b68a613076b61780a35b6582b64f5cdc50d0ac5260bfb9e
const fruit = /* @__PURE__ */ (() => [
	"#f2a33a",
	"#e8c547",
	"#7fae3f",
	"#e0662f",
	"#b8342f"
].map((c) => col(c, .6)))();
/** A landscape in oils, for the easels: sky, hills, a sun, and sometimes a dome. */
function painting(seed) {
	const r = seeded(seed);
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 96;
	const x = c.getContext("2d");
	const sky = x.createLinearGradient(0, 0, 0, 96);
	const skies = [
		["#f6c68a", "#f4e4c8"],
		["#9cc6d9", "#e8f0ea"],
		["#e89a7a", "#f7d7a8"],
		["#b7c7e8", "#f3ead9"]
	][Math.floor(r() * 4)];
	sky.addColorStop(0, skies[0]);
	sky.addColorStop(1, skies[1]);
	x.fillStyle = sky;
	x.fillRect(0, 0, 128, 96);
	x.fillStyle = "#fff1c9";
	x.beginPath();
	x.arc(20 + r() * 88, 16 + r() * 20, 6 + r() * 6, 0, Math.PI * 2);
	x.fill();
	for (let h = 0; h < 3; h++) {
		x.fillStyle = [
			"#6f8f6a",
			"#4f7050",
			"#3a5a3f"
		][h];
		x.beginPath();
		x.moveTo(0, 96);
		for (let i = 0; i <= 8; i++) x.lineTo(i * 16, 48 + h * 12 + Math.sin(i * (.8 + r()) + h) * 8 * (1 + r()));
		x.lineTo(128, 96);
		x.fill();
	}
	if (r() < .6) {
		x.strokeStyle = "rgba(255,255,255,0.85)";
		x.fillStyle = "rgba(230,240,238,0.5)";
		for (let d = 0; d < 1 + r() * 3; d++) {
			x.beginPath();
			x.arc(20 + r() * 88, 78, 6 + r() * 10, Math.PI, 0);
			x.fill();
			x.stroke();
		}
	}
	const tex = new three.CanvasTexture(c);
	tex.colorSpace = three.SRGBColorSpace;
	return new three.MeshStandardMaterial({
		map: tex,
		roughness: .7
	});
}
//#piece 4f60a176d56cad3cfbbd14f9e6860be98a26c03a765515821a9f89db0c4942b1
	return g;
}
function studio(k, seed) {
	const g = new three.Group();
	const cs = [];
	for (let i = 0; i < 6; i++) {
		const x = -4.5 + i * 1.8;
		const z = .6 + Math.abs(i - 2.5) * .35;
		const e = new three.Group();
		for (const [lx, lz, rx] of [
			[
				-.35,
				.1,
				.1
			],
			[
				.35,
				.1,
				-.1
			],
			[
				0,
				-.45,
				0
			]
		]) {
			const leg = k.box(.05, 1.9, .05, k.timber, lx, 0, lz);
			leg.rotation.set(lz < 0 ? -.22 : .06, 0, rx);
			e.add(leg);
		}
		const canvas = k.box(.9, .68, .03, painting(seed + i), 0, .9, .2);
		canvas.rotation.x = -.1;
		e.add(canvas);
		e.add(k.box(.95, .04, .12, k.timber, 0, .88, .22));
		e.position.set(x, 0, z);
		e.rotation.y = Math.PI + (i - 2.5) * .08;
		g.add(e);
		g.add(stool(k, x, z - 1));
		cs.push({
			x,
			z,
			r: .5
		});
	}
	g.add(k.box(3, .06, .9, k.oak, 0, .8, -2.3));
	for (const sx of [-1.4, 1.4]) g.add(k.box(.08, .8, .8, k.oak, sx, 0, -2.3));
	for (let i = 0; i < 9; i++) {
		const jar = new three.Mesh(new three.CylinderGeometry(.06, .06, .14, 10), [...glaze, ...fruit][i % 10]);
		jar.position.set(-1.2 + i * .3, .93, -2.3 + i % 2 * .2);
		g.add(jar);
	}
	cs.push({
		x: 0,
		z: -2.3,
		r: 1.5
	});
	g.add(k.box(2.4, 1.6, .05, painting(seed + 40), 5.2, 1.2, 3.2, Math.PI));
	g.add(k.box(.7, 1, .7, k.lime, -5.4, 0, -1.8));
	const sculpt = new three.Mesh(new three.TorusKnotGeometry(.28, .08, 64, 10, 2, 3), white);
	sculpt.position.set(-5.4, 1.4, -1.8);
	sculpt.castShadow = true;
	g.add(sculpt);
	cs.push({
		x: -5.4,
		z: -1.8,
		r: .6
	});
//#piece 609e8cee2c09c861e5cb8f247e7ea79ebd105401cde5935d0fe7001e08eef750
	id: "art-studio",
	label: "Art studio",
	note: "easels in an arc facing the light, a paint table of jars, a finished canvas on the wall, a sculpture on its plinth",
	usedIn: "Dome rooms",
	make: () => centred(studio(kitOf(), 10).group)
//#piece efdcca1a04fdda7a2276303e92b595b83cca8a110f3d7dda62713404df030b61
