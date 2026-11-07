//#piece 4a02c396ad62bcc353e0ee1be1e07c27cb15199254e83d201107ad6bae1109c0
//#piece b6d39cef9c0f38a16a0b8f6ff6f1dceb9c90d642fd3e794cbe0f093436f98714
//#piece b9d556e9b345f93cfaab3cc5cb91d38396d7084a0ab1aa59cf8d1f006a823643
}

//#endregion
//#piece 8d9065a8cc6dec5b55423a03a1b69de1e2dd8d2e270c671fadcca7fc3ff61b42
//#piece ac3ab52097d6e3ce7420d8bcd96fc905ff928ce27ed8f8582295f6a56cb5c2e0
/** the tent's measures (as the Buildings' bell tent): its radius at the wall, the wall's height, the pole's top, the
*  door's half width and its top, how far out the guy ropes' pegs are from the wall; each pitching step's range of k
*  (setPitch), in order; and where its fire place stands in front of it */
const BELL_TENT = {
	R: 2.1,
	wall: .75,
	pole: 3,
	doorHalf: .55,
	doorTop: 1.8,
	guyOut: 1.5,
	steps: {
		groundsheet: [0, .12],
		canvas: [.12, .2],
		pole: [.2, .42],
		wall: [.42, .56],
		guys: [.56, .78],
		door: [.78, .86],
		inside: [.86, 1]
	},
	fire: {
		x: 1.2,
		z: 4.2
	}
};
//#piece bb105e2a9696a7151c97a449ba10936eaff3baaaa4e4b41dd84dc190b9f6cbca
const lerp = /* @__PURE__ */ (() => three.MathUtils.lerp)();
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
//#piece f52dfe08bf448ef319567e33e676e9f419fb4e62d242f9f73e4ae9c78b96a0d8
}
/**
* A peg at its spot, turned so +z is away from the tent: a shaft leaning out by `tilt`, `len` long in the hand and
* `out` of it left showing once it is knocked in, a hook at its top (and a rubber ring, `ring`, for the groundsheet's).
* userData.drive(t): 0 not there; brought down to the ground, then knocked in.
*/
function peg({ tilt = 0, len = .23, out = .04, r = .005, head = m.steel(), ring = false }) {
	const p = new three.Group();
	const lean = new three.Group();
	lean.rotation.x = tilt;
	p.add(lean);
	const shaft = new three.Mesh(new three.CylinderGeometry(r, r * .6, 1, 6).translate(0, .5, 0), m.steel());
	shaft.castShadow = true;
	const hook = new three.Mesh(new three.TorusGeometry(.012, r * .8, 4, 8, Math.PI).rotateY(Math.PI / 2), head);
	lean.add(shaft, hook);
	if (ring) {
		const band = new three.Mesh(new three.TorusGeometry(.022, .005, 5, 12).rotateX(Math.PI / 2), m.rubber());
		band.position.set(0, .006, -.02);
		p.add(band);
	}
	p.userData.drive = (t) => {
		p.visible = t > 0;
		const lift = (1 - ease(clamp(t / .3))) * .35;
		const h = lerp(len, out, ease(clamp((t - .3) / .7)));
		shaft.scale.y = h;
		shaft.position.y = lift;
		hook.position.y = lift + h;
	};
	return p;
}
/** the canvas's weave and the seams between its twelve panels, along the texture's u (one panel a repeat) */
const canvasTex = () => canvasTexture("bell-tent-canvas", 256, 256, (x, r) => {
	x.fillStyle = "#ece3cf";
	x.fillRect(0, 0, 256, 256);
	for (let i = 0; i < 3200; i++) {
		x.fillStyle = `rgba(${r() < .5 ? "255,255,255" : "90,70,40"},${.03 + r() * .04})`;
		x.fillRect(r() * 256, r() * 256, 1.5, 1.5);
	}
	x.fillStyle = "rgba(110,90,60,0.32)";
	x.fillRect(0, 0, 3, 256);
	x.fillStyle = "rgba(255,255,255,0.25)";
	x.fillRect(3, 0, 2, 256);
});
/** the cards of the tent's parts, its assemblies (and which way each is drawn out of it, taken apart), its steps */
const TENT_ASSEMBLIES = [
	{
		id: "ground",
		label: "Groundsheet",
		note: "What it stands on: the bathtub groundsheet and the pegs that hold it down.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "canvas",
		label: "Canvas",
		note: "One piece of cotton canvas sewn from twelve panels: the bell, the wall below it, the door in both.",
		out: [
			0,
			2.6,
			0
		]
	},
	{
		id: "poles",
		label: "Poles",
		note: "The centre pole the whole tent hangs from, and the short wall poles under its eave.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "guys",
		label: "Ropes and pegs",
		note: "What holds it to the ground and keeps the canvas tight: the guy ropes, their runners and pegs, the wall pegs.",
		out: [
			0,
			0,
			0
		]
	},
	{
		id: "inside",
		label: "Inside",
		note: "What is brought in once it stands: two beds at the back, a table, the packs, the lantern.",
		out: [
			0,
			0,
			0
		]
	}
];
const TENT_STEPS = [
	"Lay the groundsheet out where the tent will stand, its door to the front, unfold it and peg it down through the rings round its edge.",
	"Spread the canvas over it, its door over the groundsheet’s door.",
	"Crawl in under the canvas with the centre pole, put its spike through the cap at the top and walk it upright: the canvas rises on it.",
	"Stand a wall pole under the eave at each guy rope’s loop, its spike through the eyelet, then peg the wall’s foot out round the groundsheet.",
	"Run each guy rope out from its wall pole, knock its peg in at 45° 1.5 m out from the wall, loop the rope over it and pull it tight with its runner.",
	"Roll the door flaps back to either side of the door and tie them.",
	"Bring the things in: the rug, two mats and sleeping bags with their pillows, the crate with two mugs and a book, the packs; hang the lantern on the pole and light it."
];
const TENT_PARTS = [
	{
		id: "groundsheet",
		label: "Groundsheet",
		assembly: "ground",
		step: 1,
		what: "Heavy PVC, round, 4.2 m across, its edge turned up 15 cm into a tub so no water runs in; zipped to the foot of the wall all round.",
		specs: [
			["Across", "4.2 m"],
			["Rim", "15 cm high"],
			["Weight", "about 540 g/m²"]
		]
	},
	{
		id: "sheet-pegs",
		label: "Groundsheet pegs",
		assembly: "ground",
		step: 1,
		count: 12,
		what: "A plastic hook peg through a rubber ring at each D-ring round the groundsheet’s edge: the rubber gives, so the sheet is held without tearing.",
		specs: [["Peg", "18 cm"], ["Ring", "45 mm rubber"]]
	},
	{
		id: "bell",
		label: "Bell",
		assembly: "canvas",
		step: 2,
		what: "The roof: twelve panels of 285 g/m² cotton canvas sewn into a bell, rising from the eave to a leather-backed cap round the pole’s spike. It glows from inside at night.",
		moves: "Rises on the centre pole as it is walked upright",
		specs: [
			["Across at the eave", "4.5 m"],
			["Up to", "3 m"],
			["Canvas", "285 g/m² cotton, proofed"]
		]
	},
	{
		id: "wall",
		label: "Wall",
		assembly: "canvas",
		step: 2,
		what: "The same canvas hanging 75 cm from the eave to the ground, all round but for the door, pegged out at its foot; zipped to the groundsheet.",
		moves: "Hangs loose until the wall poles push the eave up and its foot is pegged",
		specs: [["High", "75 cm"], ["Round", "13.2 m"]]
	},
	{
		id: "door-flaps",
		label: "Door flaps",
		assembly: "canvas",
		step: 6,
		count: 2,
		what: "The door, 1.1 m wide and 1.8 m high, closes with two flaps zipped down its middle; by day they are rolled back to either side and tied with their ties.",
		moves: "Roll back to the sides of the door and are tied",
		specs: [["Door", "1.1 × 1.8 m"], ["Ties", "two each"]]
	},
	{
		id: "centre-pole",
		label: "Centre pole",
		assembly: "poles",
		step: 3,
		what: "Ash, 70 mm round and 3.15 m long in three sections joined by steel ferrules; a spike at its top through the canvas’s cap, a rubber foot.",
		moves: "Walked upright from lying, its top under the cap, its foot sliding in to the middle",
		specs: [
			["Long", "3.15 m"],
			["Sections", "three, 1.05 m"],
			["Round", "70 mm"]
		]
	},
	{
		id: "wall-poles",
		label: "Wall poles",
		assembly: "poles",
		step: 4,
		count: 10,
		what: "Short poles standing just inside the wall under the eave, each with a spike through the eyelet at a guy rope’s loop: they hold the eave up so the wall hangs straight.",
		moves: "Stood up one by one",
		specs: [["High", "82 cm with its spike"], ["Round", "25 mm"]]
	},
	{
		id: "guy-ropes",
		label: "Guy ropes",
		assembly: "guys",
		step: 5,
		count: 10,
		what: "Ten 8 mm polyester ropes from the wall poles’ spikes out to their pegs; tight, they pull the eave out and keep the canvas taut in the wind.",
		moves: "Run out to their pegs and tensioned",
		specs: [["Rope", "8 mm"], ["Out", "1.5 m from the wall"]]
	},
	{
		id: "runners",
		label: "Runners",
		assembly: "guys",
		step: 5,
		count: 10,
		what: "A wooden runner on each guy rope: slid along it, it pulls the rope tight or lets it off as the canvas shrinks in the rain and dries.",
		moves: "Slid along its rope to tension it"
	},
	{
		id: "guy-pegs",
		label: "Guy pegs",
		assembly: "guys",
		step: 5,
		count: 10,
		what: "Steel pegs 30 cm long, knocked in at 45° leaning away from the tent, so the rope pulls them down into the ground and not out of it.",
		specs: [["Long", "30 cm"], ["Angle", "45°"]]
	},
	{
		id: "wall-pegs",
		label: "Wall pegs",
		assembly: "guys",
		step: 4,
		count: 18,
		what: "Steel pin pegs through the loops at the wall’s foot, all round but for the door.",
		specs: [["Long", "23 cm"]]
	},
	{
		id: "rug",
		label: "Rug",
		assembly: "inside",
		step: 7,
		what: "A round jute rug 1.8 m across in front of the beds."
	},
	{
		id: "mats",
		label: "Mats",
		assembly: "inside",
		step: 7,
		count: 2,
		what: "Two foam sleeping mats, 62 cm wide and 1.9 m long, at the back."
	},
	{
		id: "sleeping-bags",
		label: "Sleeping bags",
		assembly: "inside",
		step: 7,
		count: 2,
		what: "Two sleeping bags on the mats, one teal and one rust."
	},
	{
		id: "pillows",
		label: "Pillows",
		assembly: "inside",
		step: 7,
		count: 2,
		what: "Two linen pillows at the head of the beds, by the wall."
	},
	{
		id: "crate",
		label: "Crate",
		assembly: "inside",
		step: 7,
		what: "A wooden crate 50 × 36 cm on its side for a table, by the door."
	},
	{
		id: "mugs",
		label: "Mugs",
		assembly: "inside",
		step: 7,
		count: 2,
		what: "Two white enamel mugs with blue rims on the crate."
	},
	{
		id: "book",
		label: "Book",
		assembly: "inside",
		step: 7,
		what: "A book left on the crate."
	},
	{
		id: "packs",
		label: "Packs",
		assembly: "inside",
		step: 7,
		count: 2,
		what: "Two packs against the wall, olive and brown."
	},
	{
		id: "lantern",
		label: "Lantern",
		assembly: "inside",
		step: 7,
		what: "A green hurricane lantern hung from a hook on the pole at 2 m, its flame behind glass: the light inside the tent, and the glow of the canvas at night.",
		moves: "Hung on its hook and lit",
		specs: [["Hung at", "2 m"], ["Light", "warm, about 5 m"]]
	}
];
const SOURCES = [{
	label: "Bell tent (Wikipedia)",
	url: "https://en.wikipedia.org/wiki/Bell_tent"
}, {
	label: "The Buildings’ bell tent",
	url: "/app/buildings/"
}];
/**
* The bell tent, pitched as far as `pitch` (0 nothing … 1 standing, furnished, the lantern lit). userData:
* - setPitch(k), pitch; work(k): where the work is at k (the tent's frame), for a worker to stand by
* - lamp: the lantern's PointLight; canvas: the canvas's material (its emissive is the glow at night)
* - walk: { r, door, headroom, colliders: [{ x, z, r }] } (the wall's radius at the ground, the door's half width at
*   +z, how far from the pole a grown-up stands upright under the bell, what is in the way), with the Things viewer's
*   walk (x, z, yaw, canStand, floorAt, lamps) in it too
* - parts (each part's group by id), catalog, explode(k)
*/
function bellTent({ pitch = 1 } = {}) {
	const { R, wall, pole, doorHalf, doorTop, guyOut, steps } = BELL_TENT;
	const g = new three.Group();
	const parts = {};
	for (const { id } of TENT_PARTS) {
		const p = new three.Group();
		p.name = id;
		p.userData.part = id;
		g.add(p);
		parts[id] = p;
	}
	/** a piece of a part that is drawn straight out from the middle when the tent is taken apart */
	const piece = (part, a) => {
		const q = new three.Group();
		if (a !== void 0) q.userData.radial = [Math.sin(a), Math.cos(a)];
		part.add(q);
		return q;
	};
	const gap = doorHalf / R;
	const sheetPart = parts.groundsheet;
	const fold = new three.Group();
	sheetPart.add(fold);
	const floor = new three.Mesh(new three.CircleGeometry(R - .01, 64).rotateX(-Math.PI / 2), m.sheet());
	floor.position.y = .012;
	floor.receiveShadow = true;
	const tub = new three.Mesh(new three.CylinderGeometry(R - .015, R - .015, .15, 64, 1, true, gap, Math.PI * 2 - 2 * gap), m.rim());
	tub.position.y = .075;
	fold.add(floor, tub);
	const sheetPegs = [];
	for (let i = 0; i < 14; i++) {
		const a = (i + .5) / 14 * Math.PI * 2;
		if (Math.abs(adiff(a, 0)) < gap + .05) continue;
		const p = peg({
			len: .18,
			out: .035,
			r: .006,
			head: m.hook(),
			ring: true
		});
		p.position.set(Math.sin(a) * (R + .03), 0, Math.cos(a) * (R + .03));
		p.rotation.y = a;
		piece(parts["sheet-pegs"], a).add(p);
		sheetPegs.push(p);
	}
	const canvas = new three.MeshStandardMaterial({
		map: canvasTex(),
		color: "#ffffff",
		emissive: "#5a4c34",
		emissiveIntensity: .35,
		roughness: 1,
		side: three.DoubleSide
	});
	const BR = 24, BC = 72, WR = 6, WC = 64, PANELS = 12;
	const bellAt = (v) => ({
		r: (R + .12) * (1 - v) ** 1.25 + .04,
		y: wall + (pole - wall) * (1 - (1 - v) ** 1.6)
	});
	const MER = [];
	{
		let s = 0, prev = null;
		for (let q = 0; q <= BR; q++) {
			const p = bellAt(1 - q / BR);
			if (prev) s += Math.hypot(p.r - prev.r, p.y - prev.y);
			MER.push({
				s,
				r: p.r,
				y: p.y,
				bell: true
			});
			prev = p;
		}
		const hem = s + .02;
		for (let w = 0; w <= WR; w++) MER.push({
			s: hem + wall * w / WR,
			r: R,
			y: wall * (1 - w / WR),
			bell: false
		});
	}
	const S_HEM = MER[BR].s;
	const N = MER.length;
	const rr = new Float32Array(N), ry = new Float32Array(N), lying = new Float32Array(N);
	const LIE = .025;
	/**
	* The canvas's meridian as it hangs now: its eave let down by `sag` (no wall poles under it yet), its top let down by
	* `drop` (the pole not up yet); where it meets the ground the rest lies on it, bunched (`bunch`), and spread out as
	* far as `spread` (the canvas still in a heap by the door, at 0).
	*/
	function hang(drop, sag, spread = 1) {
		for (let i = 0; i < N; i++) {
			const p = MER[i];
			const near = p.bell ? ease(clamp(1 - (S_HEM - p.s) / .9)) : 1;
			rr[i] = p.r - sag * .1 * near;
			ry[i] = p.y - sag * .24 * near - drop;
			lying[i] = 0;
		}
		let k = 0;
		while (k < N && ry[k] > LIE) k++;
		if (k === N) return;
		let r0 = 0, s0 = 0;
		if (k > 0) {
			const t = (ry[k - 1] - LIE) / (ry[k - 1] - ry[k]);
			r0 = lerp(rr[k - 1], rr[k], t);
			s0 = lerp(MER[k - 1].s, MER[k].s, t);
		}
		for (let i = k; i < N; i++) {
			rr[i] = (r0 + (MER[i].s - s0) * .62) * spread;
			ry[i] = LIE + (MER[i].s - s0) * .004;
			lying[i] = 1;
		}
	}
	let heap = 0;
	const crumple = (a, s, i) => lying[i] * (.012 + .018 * (.5 + .5 * Math.sin(a * 9 + s * 4.5))) + heap * .16 * (.5 + .5 * Math.sin(a * 6) * Math.cos(s * 6));
	/** the pole being walked up under the canvas (its top over the middle, its foot at z = foot), or null: the canvas
	*  lies over it in a ridge, its sides falling away from it */
	let ridge = null;
	const over = (x, y, z) => {
		if (!ridge || z <= 0 || z >= ridge.foot) return y;
		return Math.max(y, ridge.top * (1 - z / ridge.foot) + .06 - Math.max(0, Math.abs(x) - .08) * .9);
	};
	const place = (pa, idx, a, i) => {
		const x = Math.sin(a) * rr[i], z = Math.cos(a) * rr[i] + heap * 1.3;
		pa.setXYZ(idx, x, over(x, ry[i] + crumple(a, MER[i].s, i), z), z);
	};
	const bellGeo = new three.BufferGeometry();
	{
		const pos = /* @__PURE__ */ new Float32Array(5475), uv = [], idx = [];
		for (let q = 0; q <= BR; q++) for (let i = 0; i <= BC; i++) uv.push(i / BC * PANELS, MER[q].s);
		for (let q = 0; q < BR; q++) for (let i = 0; i < BC; i++) {
			const a = (i + .5) / BC * Math.PI * 2;
			if (Math.abs(adiff(a, 0)) * MER[q].r < doorHalf && MER[q].y < doorTop) continue;
			const p = q * 73 + i, l = p + BC + 1;
			idx.push(l, p, l + 1, l + 1, p, p + 1);
		}
		bellGeo.setAttribute("position", new three.BufferAttribute(pos, 3));
		bellGeo.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		bellGeo.setIndex(idx);
	}
	const wallGeo = new three.BufferGeometry();
	const wallA = (i) => gap + (Math.PI * 2 - 2 * gap) * i / WC;
	{
		const pos = /* @__PURE__ */ new Float32Array(1365), uv = [], idx = [];
		for (let w = 0; w <= WR; w++) for (let i = 0; i <= WC; i++) uv.push(wallA(i) / (Math.PI * 2) * PANELS, MER[25 + w].s);
		for (let w = 0; w < WR; w++) for (let i = 0; i < WC; i++) {
			const p = w * 65 + i, l = p + WC + 1;
			idx.push(l, p, l + 1, l + 1, p, p + 1);
		}
		wallGeo.setAttribute("position", new three.BufferAttribute(pos, 3));
		wallGeo.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		wallGeo.setIndex(idx);
	}
	const bell = new three.Mesh(bellGeo, canvas);
	const wallMesh = new three.Mesh(wallGeo, canvas);
	for (const o of [bell, wallMesh]) {
		o.castShadow = true;
		o.frustumCulled = false;
	}
	parts.bell.add(bell);
	parts.wall.add(wallMesh);
	const UC = 6;
	const flapRows = [];
	{
		let q = 0;
		while (MER[q + 1].y >= doorTop) q++;
		const t = (MER[q].y - doorTop) / (MER[q].y - MER[q + 1].y);
		flapRows.push({
			i: q,
			t,
			r: lerp(MER[q].r, MER[q + 1].r, t),
			s: lerp(MER[q].s, MER[q + 1].s, t)
		});
		for (let i = q + 1; i < N; i++) flapRows.push({
			i,
			t: 0,
			r: MER[i].r,
			s: MER[i].s
		});
	}
	const at = (arr, row) => row.t ? lerp(arr[row.i], arr[row.i + 1], row.t) : arr[row.i];
	const flapReach = (row) => doorHalf / row.r + .05;
	const flaps = [-1, 1].map((side) => {
		const geo = new three.BufferGeometry();
		const pos = new Float32Array(flapRows.length * 7 * 3), uv = [], idx = [];
		flapRows.forEach((row) => {
			for (let c = 0; c <= UC; c++) uv.push(side * flapReach(row) * c / UC / (Math.PI * 2) * PANELS, row.s);
		});
		for (let w = 0; w < flapRows.length - 1; w++) for (let c = 0; c < UC; c++) {
			const p = w * 7 + c, l = p + UC + 1;
			idx.push(l, p, l + 1, l + 1, p, p + 1);
		}
		geo.setAttribute("position", new three.BufferAttribute(pos, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		geo.setIndex(idx);
		const mesh = new three.Mesh(geo, canvas);
		mesh.castShadow = true;
		mesh.frustumCulled = false;
		const roll = new three.Group();
		const segs = flapRows.slice(1).map(() => new three.Mesh(new three.CylinderGeometry(1, 1, 1, 12), canvas));
		const knees = flapRows.map(() => new three.Mesh(new three.SphereGeometry(1, 12, 8), canvas));
		for (const o of [...segs, ...knees]) o.castShadow = true;
		roll.add(...segs, ...knees);
		const ties = [.22, .62].map((f) => {
			const t = new three.Mesh(new three.TorusGeometry(1, .08, 6, 14).rotateX(Math.PI / 2), m.strap());
			t.userData.f = f;
			return t;
		});
		piece(parts["door-flaps"]).add(mesh, roll, ...ties);
		return {
			side,
			geo,
			mesh,
			roll,
			segs,
			knees,
			ties
		};
	});
	/** the canvas hung as it is now (hang), and the door's flaps as far as rolled back */
	function drape(roll) {
		const bp = bellGeo.attributes.position;
		for (let q = 0; q <= BR; q++) for (let i = 0; i <= BC; i++) place(bp, q * 73 + i, i / BC * Math.PI * 2, q);
		const wp = wallGeo.attributes.position;
		for (let w = 0; w <= WR; w++) for (let i = 0; i <= WC; i++) place(wp, w * 65 + i, wallA(i), 25 + w);
		for (const geo of [bellGeo, wallGeo]) {
			geo.attributes.position.needsUpdate = true;
			geo.computeVertexNormals();
			geo.boundingBox = geo.boundingSphere = null;
		}
		for (const f of flaps) {
			const fp = f.geo.attributes.position;
			flapRows.forEach((row, w) => {
				const r = at(rr, row) + .012, y = at(ry, row) + lying[row.i] * .004;
				for (let c = 0; c <= UC; c++) {
					const a = f.side * flapReach(row) * (roll + (1 - roll) * (c / UC));
					const x = Math.sin(a) * r, z = Math.cos(a) * r + heap * 1.3;
					fp.setXYZ(w * 7 + c, x, over(x, y + crumple(a, row.s, row.i), z), z);
				}
			});
			fp.needsUpdate = true;
			f.geo.computeVertexNormals();
			f.geo.boundingBox = f.geo.boundingSphere = null;
			f.mesh.visible = roll < .98;
			f.roll.visible = roll > .02;
			if (!f.roll.visible) {
				for (const t of f.ties) t.visible = false;
				continue;
			}
			const rad = .01 + .032 * roll;
			const pts = flapRows.map((row) => {
				const a = f.side * flapReach(row);
				const r = at(rr, row) + .02 + rad;
				return new three.Vector3(Math.sin(a) * r, Math.max(rad, at(ry, row)), Math.cos(a) * r);
			});
			const lens = [0];
			f.segs.forEach((sg, i) => {
				const d = pts[i + 1].clone().sub(pts[i]);
				const len = Math.max(1e-4, d.length());
				lens.push(lens[i] + len);
				sg.position.copy(pts[i]).addScaledVector(d, .5);
				sg.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
				sg.scale.set(rad, len, rad);
			});
			f.knees.forEach((kn, i) => {
				kn.position.copy(pts[i]);
				kn.scale.setScalar(rad);
			});
			for (const t of f.ties) {
				const want = t.userData.f * lens.at(-1);
				const i = Math.max(0, lens.findIndex((l) => l >= want) - 1);
				const sg = f.segs[Math.min(i, f.segs.length - 1)];
				t.position.lerpVectors(pts[i], pts[i + 1], (want - lens[i]) / Math.max(1e-4, lens[i + 1] - lens[i]));
				t.quaternion.copy(sg.quaternion);
				t.scale.set(rad + .004, .1, rad + .004);
			}
		}
	}
	const L = pole + .15;
	const centre = new three.Group();
	{
		const sec = 1.05;
		for (let i = 0; i < 3; i++) {
			const top = i === 2 ? L - .15 - 2 * sec : sec;
			const s = new three.Mesh(new three.CylinderGeometry(.035, .035, top, 14), m.pole());
			s.position.y = i * sec + top / 2;
			s.castShadow = true;
			centre.add(s);
		}
		for (const y of [sec, 2 * sec]) {
			const f = new three.Mesh(new three.CylinderGeometry(.039, .039, .09, 14), m.ferrule());
			f.position.y = y;
			centre.add(f);
		}
		const spike = new three.Mesh(new three.CylinderGeometry(.008, .012, .15, 8), m.ferrule());
		spike.position.y = L - .075;
		const foot = new three.Mesh(new three.CylinderGeometry(.045, .045, .025, 14), m.rubber());
		foot.position.y = .0125;
		centre.add(spike, foot);
	}
	parts["centre-pole"].add(centre);
	/** the pole as far as walked upright (0 lying under the canvas, its foot out of the door; 1 standing) */
	function raisePole(p) {
		const th = lerp(.03, Math.PI / 2, ease(p));
		const top = new three.Vector3(0, L * Math.sin(th), 0);
		const foot = new three.Vector3(0, 0, L * Math.cos(th));
		centre.position.copy(foot);
		centre.quaternion.setFromUnitVectors(UP, top.sub(foot).normalize());
		ridge = p < 1 ? {
			top: L * Math.sin(th),
			foot: L * Math.cos(th)
		} : null;
		return L * (1 - Math.sin(th));
	}
	const GUYS = [];
	for (let k = 0; k < 12; k++) {
		const a = (k + .5) / 12 * Math.PI * 2;
		if (Math.abs(adiff(a, 0)) >= .3) GUYS.push(a);
	}
	const WP = {
		r: R + .06,
		h: .78,
		spike: .06
	};
	const wallPoles = GUYS.map((a) => {
		const p = new three.Group();
		p.position.set(Math.sin(a) * WP.r, 0, Math.cos(a) * WP.r);
		p.rotation.y = a;
		const hinge = new three.Group();
		p.add(hinge);
		const shaft = new three.Mesh(new three.CylinderGeometry(.0125, .0125, WP.h, 8).translate(0, WP.h / 2, 0), m.pole());
		const spike = new three.Mesh(new three.CylinderGeometry(.003, .005, WP.spike, 6).translate(0, WP.h + WP.spike / 2, 0), m.ferrule());
		shaft.castShadow = true;
		hinge.add(shaft, spike);
		piece(parts["wall-poles"], a).add(p);
		p.userData.stand = (t) => {
			p.visible = t > 0;
			hinge.rotation.x = Math.PI / 2 * (1 - ease(t));
		};
		return p;
	});
	const wallPegs = [];
	for (let i = 0; i < 22; i++) {
		const a = (i + .5) / 22 * Math.PI * 2;
		if (Math.abs(adiff(a, 0)) < gap + .04) continue;
		const p = peg({
			tilt: .25,
			len: .23,
			out: .04
		});
		p.position.set(Math.sin(a) * (R + .04), 0, Math.cos(a) * (R + .04));
		p.rotation.y = a;
		piece(parts["wall-pegs"], a).add(p);
		wallPegs.push(p);
	}
	const A = {
		r: WP.r,
		y: WP.h + .04
	};
	const guys = GUYS.map((a) => {
		const dir = new three.Vector3(Math.sin(a), 0, Math.cos(a));
		const toward = (r, y) => dir.clone().multiplyScalar(r).setY(y);
		const ropeP = piece(parts["guy-ropes"], a);
		const runP = piece(parts.runners, a);
		const pegP = piece(parts["guy-pegs"], a);
		const r0 = rod(.004, m.rope(), 5), r1 = rod(.004, m.rope(), 5);
		ropeP.add(r0, r1);
		const runner = new three.Mesh(new three.BoxGeometry(.022, .07, .016), m.runner());
		runner.castShadow = true;
		runP.add(runner);
		const p = peg({
			tilt: Math.PI / 4,
			len: .3,
			out: .08,
			r: .006
		});
		p.position.copy(toward(R + guyOut, 0));
		p.rotation.y = a;
		pegP.add(p);
		const top = toward(A.r, A.y), hung = toward(R + .2, .03);
		const tied = toward(R + guyOut + .08 * Math.sin(Math.PI / 4), .08 * Math.cos(Math.PI / 4) + .01);
		/** as far as this rope is run out (0 hanging down the wall … 1 on its peg, pulled tight) */
		function set(u) {
			p.userData.drive(clamp((u - .15) / .4));
			const out = ease(clamp(u / .55));
			const tight = ease(clamp((u - .55) / .45));
			const end = hung.clone().lerp(tied, out);
			end.y += Math.sin(Math.PI * out) * .35 * (1 - tight);
			const mid = top.clone().lerp(end, .5);
			mid.y -= .16 * out * (1 - tight);
			r0.userData.span(top, mid);
			r1.userData.span(mid, end);
			const d = end.clone().sub(mid);
			runner.position.copy(mid).addScaledVector(d, lerp(.75, .35, tight));
			runner.quaternion.setFromUnitVectors(UP, d.normalize());
		}
		return { set };
	});
	/** a thing brought in: its part, and a group it is carried in by (lowered into its place as it comes) */
	const thing = (id) => {
		const c = new three.Group();
		parts[id].add(c);
		return c;
	};
	const inside = [];
	{
		const c = thing("rug");
		const rug = new three.Mesh(new three.CircleGeometry(.9, 48).rotateX(-Math.PI / 2), m.rug());
		rug.position.set(0, .022, .55);
		rug.receiveShadow = true;
		c.add(rug);
		inside.push(c);
	}
	{
		const c = thing("mats");
		for (const x of [-.36, .36]) soft(c, .62, .05, 1.9, .02, m.mat(), x, .045, -.72);
		inside.push(c);
	}
	{
		const c = thing("sleeping-bags");
		[m.bagA(), m.bagB()].forEach((mat, i) => soft(c, .56, .12, 1.55, .05, mat, i ? .36 : -.36, .13, -.55));
		inside.push(c);
	}
	{
		const c = thing("pillows");
		for (const x of [-.36, .36]) soft(c, .45, .1, .3, .04, m.linen(), x, .07 + .05, -1.45);
		inside.push(c);
	}
	{
		const c = thing("crate");
		const crate = new three.Group();
		crate.position.set(.95, 0, .45);
		crate.rotation.y = .4;
		const body = new three.Mesh(new three.BoxGeometry(.5, .36, .36), m.crate());
		body.position.y = .18;
		body.castShadow = body.receiveShadow = true;
		crate.add(body);
		for (const y of [.12, .24]) {
			const gr = new three.Mesh(new three.BoxGeometry(.504, .008, .364), m.groove());
			gr.position.y = y;
			crate.add(gr);
		}
		c.add(crate);
		inside.push(c);
	}
	{
		const c = thing("mugs");
		for (const [x, z] of [[.86, .4], [1.02, .52]]) {
			const mug = new three.Group();
			mug.position.set(x, .36, z);
			const cup = new three.Mesh(new three.CylinderGeometry(.04, .036, .08, 16, 1, true), m.enamelIn());
			cup.position.y = .04;
			const bottom = new three.Mesh(new three.CircleGeometry(.036, 16).rotateX(-Math.PI / 2), m.enamel());
			bottom.position.y = .004;
			const lip = new three.Mesh(new three.TorusGeometry(.04, .003, 5, 18).rotateX(Math.PI / 2), m.enamelRim());
			lip.position.y = .08;
			const handle = new three.Mesh(new three.TorusGeometry(.022, .004, 5, 12, Math.PI), m.enamel());
			handle.rotation.z = -Math.PI / 2;
			handle.position.set(.04, .042, 0);
			cup.castShadow = true;
			mug.add(cup, bottom, lip, handle);
			c.add(mug);
		}
		inside.push(c);
	}
	{
		const c = thing("book");
		const book = new three.Group();
		book.position.set(1.05, .36, .33);
		book.rotation.y = .3;
		const cover = new three.Mesh(new three.BoxGeometry(.16, .03, .22), m.book());
		cover.position.y = .015;
		const pages = new three.Mesh(new three.BoxGeometry(.15, .024, .212), m.pages());
		pages.position.set(.006, .015, 0);
		book.add(cover, pages);
		c.add(book);
		inside.push(c);
	}
	{
		const c = thing("packs");
		for (const [x, z, ry, w, h, d, mat] of [[
			-1.3,
			.1,
			-1.2,
			.36,
			.5,
			.24,
			m.packA()
		], [
			-1.25,
			.55,
			-1.4,
			.34,
			.46,
			.22,
			m.packB()
		]]) {
			const pk = new three.Group();
			pk.position.set(x, 0, z);
			pk.rotation.y = ry;
			soft(pk, w, h, d, .05, mat, 0, h / 2, 0);
			soft(pk, w * .9, .07, d * .9, .03, mat, 0, h + .02, .01);
			soft(pk, w * .7, h * .4, .06, .025, mat, 0, h * .35, d / 2 + .02);
			for (const sx of [-1, 1]) {
				const s = new three.Mesh(new three.BoxGeometry(.04, h * .8, .012), m.strap());
				s.position.set(sx * w * .25, h * .5, -d / 2 - .006);
				pk.add(s);
			}
			c.add(pk);
		}
		inside.push(c);
	}
	const lamp = new three.PointLight("#ffcf8a", 0, 5, 1.6);
	const LAMP = 1.4;
	const glass = new three.MeshStandardMaterial({
		color: "#fff1d6",
		roughness: .15,
		emissive: "#ffcf8a",
		emissiveIntensity: 0,
		transparent: true,
		opacity: .85
	});
	{
		const c = thing("lantern");
		const hook = new three.Mesh(new three.TorusGeometry(.02, .003, 4, 10, Math.PI * 1.3), m.steel());
		hook.position.set(.05, 2.03, 0);
		hook.rotation.z = Math.PI * .85;
		const lt = new three.Group();
		lt.position.set(.06, 1.72, 0);
		const base = new three.Mesh(new three.CylinderGeometry(.06, .065, .04, 18), m.lantern());
		base.position.y = .02;
		const globe = new three.Mesh(new three.SphereGeometry(.052, 16, 12), glass);
		globe.scale.y = 1.4;
		globe.position.y = .11;
		const cap = new three.Mesh(new three.CylinderGeometry(.022, .068, .05, 18), m.lantern());
		cap.position.y = .205;
		const chimney = new three.Mesh(new three.CylinderGeometry(.016, .02, .03, 12), m.lantern());
		chimney.position.y = .245;
		const handle = new three.Mesh(new three.TorusGeometry(.06, .003, 4, 16, Math.PI), m.steel());
		handle.position.y = .215;
		lt.add(base, globe, cap, chimney, handle);
		for (let i = 0; i < 4; i++) {
			const a = i / 4 * Math.PI * 2 + Math.PI / 4;
			const w = new three.Mesh(new three.CylinderGeometry(.003, .003, .15, 4), m.lantern());
			w.position.set(Math.cos(a) * .058, .11, Math.sin(a) * .058);
			lt.add(w);
		}
		base.castShadow = cap.castShadow = true;
		lamp.position.set(.06, 1.83, 0);
		c.add(hook, lt, lamp);
		inside.push(c);
	}
	let now = -1;
	function setPitch(k) {
		k = clamp(k);
		if (k === now) return;
		now = k;
		g.userData.pitch = k;
		const gs = span(k, steps.groundsheet);
		sheetPart.visible = k > 0;
		const across = ease(clamp(gs / .35)), back = ease(clamp((gs - .35) / .35));
		fold.scale.set(lerp(.14, 1, across), 1, lerp(.12, 1, back));
		fold.position.z = R * (1 - fold.scale.z);
		sheetPegs.forEach((p, i) => p.userData.drive(turn(clamp((gs - .7) / .3), i, sheetPegs.length)));
		const cs = span(k, steps.canvas);
		const ps = span(k, steps.pole);
		const ws = span(k, steps.wall);
		const ds = span(k, steps.door);
		const up = cs > 0;
		for (const id of [
			"bell",
			"wall",
			"door-flaps"
		]) parts[id].visible = up;
		parts["centre-pole"].visible = ps > 0;
		ridge = null;
		const drop = ps > 0 ? raisePole(ps) : L;
		const stood = clamp(ws / .6);
		heap = 1 - ease(cs);
		if (up) {
			hang(drop, 1 - ease(stood), lerp(.18, 1, ease(cs)));
			drape(ease(clamp(ds / .75)));
		}
		wallPoles.forEach((p, i) => p.userData.stand(turn(stood, i, wallPoles.length)));
		wallPegs.forEach((p, i) => p.userData.drive(turn(clamp((ws - .6) / .4), i, wallPegs.length)));
		for (const f of flaps) for (const t of f.ties) t.visible = ds > .85 && f.roll.visible;
		const gu = span(k, steps.guys);
		for (const id of [
			"guy-ropes",
			"runners",
			"guy-pegs"
		]) parts[id].visible = gu > 0;
		guys.forEach((gy, i) => gy.set(turn(gu, i, guys.length)));
		const ins = span(k, steps.inside);
		inside.forEach((c, i) => {
			const u = turn(ins, i, inside.length);
			c.visible = u > 0;
			const last = i === inside.length - 1;
			c.position.y = last ? -(1 - ease(clamp(u / .6))) * .5 : (1 - ease(u)) * .35;
		});
		const glow = ease(clamp((turn(ins, inside.length - 1, inside.length) - .6) / .4));
		lamp.intensity = LAMP * glow;
		glass.emissiveIntensity = .9 * glow;
		lamp.visible = glow > 0;
	}
	/** where the work is at k (in the tent's frame): the groundsheet's edge, the canvas, the pole's foot, the wall pole
	*  or peg going in, the guy's peg, the door, the thing being put down */
	function work(k) {
		k = clamp(k);
		const v = (a, y = 0) => new three.Vector3(Math.sin(a) * (R + .3), y, Math.cos(a) * (R + .3));
		if (k <= steps.groundsheet[1]) {
			const gs = span(k, steps.groundsheet);
			if (gs < .7) return new three.Vector3(0, 0, R - 2 * R * ease(clamp((gs - .35) / .35)));
			const i = Math.min(sheetPegs.length - 1, Math.floor(clamp((gs - .7) / .3) * sheetPegs.length));
			return sheetPegs[i].position.clone();
		}
		if (k <= steps.canvas[1]) return new three.Vector3(0, 0, R * .6 * (1 - span(k, steps.canvas)));
		if (k <= steps.pole[1]) return centre.position.clone();
		if (k <= steps.wall[1]) {
			const ws = span(k, steps.wall);
			if (ws < .6) return v(GUYS[Math.min(GUYS.length - 1, Math.floor(ws / .6 * GUYS.length))], 0);
			return wallPegs[Math.min(wallPegs.length - 1, Math.floor((ws - .6) / .4 * wallPegs.length))].position.clone();
		}
		if (k <= steps.guys[1]) {
			const a = GUYS[Math.min(GUYS.length - 1, Math.floor(span(k, steps.guys) * GUYS.length))];
			return new three.Vector3(Math.sin(a) * (R + guyOut - .3), 0, Math.cos(a) * (R + guyOut - .3));
		}
		if (k <= steps.door[1]) return new three.Vector3(0, 0, R + .4);
		const spots = [
			[0, .55],
			[0, -.6],
			[0, -.6],
			[0, -1.2],
			[.75, .6],
			[.75, .6],
			[.75, .6],
			[-.9, .3],
			[.3, .3]
		];
		const [x, z] = spots[Math.min(spots.length - 1, Math.floor(span(k, steps.inside) * spots.length))];
		return new three.Vector3(x, 0, z);
	}
	/** taken apart as far as k: each assembly drawn out its way, the ring of ropes and pegs spread out round it */
	const SPREAD = {
		"sheet-pegs": .35,
		"wall-poles": .55,
		"wall-pegs": .7,
		"guy-ropes": 1,
		runners: 1,
		"guy-pegs": 1
	};
	function explode(k) {
		for (const info of TENT_PARTS) {
			const p = parts[info.id];
			const out = TENT_ASSEMBLIES.find((a) => a.id === info.assembly).out;
			p.position.set(out[0] * k, out[1] * k, out[2] * k);
			const d = (SPREAD[info.id] ?? 0) * k;
			for (const c of p.children) if (c.userData.radial) c.position.set(c.userData.radial[0] * d, 0, c.userData.radial[1] * d);
		}
	}
	const headroom = bellAt(1 - (1 - (doorTop - wall) / (pole - wall)) ** (1 / 1.6)).r - .1;
	const colliders = [
		{
			x: 0,
			z: 0,
			r: .2
		},
		{
			x: .95,
			z: .45,
			r: .35
		},
		{
			x: -1.3,
			z: .1,
			r: .28
		},
		{
			x: -1.25,
			z: .55,
			r: .28
		}
	];
	g.userData = {
		pitch,
		setPitch,
		work,
		lamp,
		canvas,
		walk: {
			r: R,
			door: doorHalf,
			headroom,
			colliders,
			x: 0,
			z: R + 2.4,
			yaw: 0,
			canStand(x, z, _here, _ground, from) {
				const d = Math.hypot(x, z);
				const open = (g.userData.pitch ?? 0) >= steps.door[1];
				if (!(d < headroom || d > R + .3 || open && z > 0 && Math.abs(x) < doorHalf - .12)) return false;
//#piece 7a6fb1e1852cc9a9874fcf96259c5ea8f273245acb1fc6d5dbc81169cdc9a77d
			assemblies: TENT_ASSEMBLIES,
			parts: TENT_PARTS,
			steps: TENT_STEPS,
			ranges: Object.values(steps),
			sources: SOURCES,
			play: "Pitch it",
			seconds: 28
		}
	};
