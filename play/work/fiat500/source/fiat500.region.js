//#region src/lib/machines/fiat500.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/*
 * THE FIAT 500 F (1965–72), Rosso Corallo 102: its research, as AirSup's step 1 asks, every number with the artifact it
 * comes from (play's Artifacts, by UUID), the rest marked [inferred].
 *
 * Size (e5efff81-8de1-45b3-9de1-2fd3e521bd53): 2,970 × 1,320 × 1,325 mm, wheelbase 1,840, tracks 1,121 front and
 * 1,135 rear, 520 kg in running order. Tyres 125 SR 12, 514 mm across (e12362b0-2cf5-4b87-95da-e0f36b801404), on
 * 3½ × 12 in pressed-steel discs (3b5332c8-1083-4e85-bad5-156a90148b09).
 * Engine (e5efff81…, 3b5332c8…, 1b98fcfa-450a-4c35-bceb-ea74624dde5f): type 110F.000, two vertical cylinders in line
 * behind the rear axle, 67.4 × 70 mm, 499.5 cc, compression 7.1:1, pushrod overhead valves, 18 hp (13.2 kW) at
 * 4,600 rpm, 31 N·m at 3,000 rpm; one Weber 26 IMB carburettor (21 mm choke); forced air cooling by a fan, a shroud
 * and a thermostat; a gear pump and a centrifugal oil filter.
 * Drive (3b5332c8…): a single dry plate, 4 speeds (teeth 37/10, 31/15, 26/20, 21/24 = 3.700, 2.067, 1.300, 0.875;
 * II–IV dog-engaged), the crown wheel and pinion 8/41 = 5.125, half-shafts with sliding joints at the differential and
 * flexible joints at the wheels. Top speed 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68).
 * Chassis (3b5332c8…, 1b98fcfa…): a load-bearing steel body; front independent on a transverse leaf spring with
 * telescopic dampers; rear independent on swinging (semi-trailing) arms with coil springs and telescopic dampers;
 * steering by worm and helical sector, a track rod to each wheel; hydraulic drums on all four wheels, the hand brake
 * on the rear; a cylindrical 22 L fuel tank (1b98fcfa…).
 * Drag: Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2); the frontal area is the shell's own, measured off its front
 * view. Paint: Rosso Corallo, Fiat code 102 (1968–72), #b1372f (344cf860-1a7d-4bf7-86e3-ac16638425a4,
 * d317c2f0-cfa5-4faa-b502-157ac3e44b52).
 *
 * Its shape is its reference sheet's (play's file fda28639be522b6601a7b84076cf07817ea8678ed022de1eb52ce070b469338a):
 * the outlines of its row-1 turnaround traced at 20 mm (side: the top and the paint's lower edge; plan: the paint's
 * half-width; front and rear: the paint's half-width at each height), each view's axes scaled to the cited length,
 * width and height, and the shell lofted from them station by station. The sheet's wheels stand 1,895 mm apart, the
 * cited wheelbase is 1,840: each arch keeps the sheet's place, each wheel stands 14 mm inboard of its arch's middle.
 */
/** the sheet's traced outlines (m): side top and lower paint edge, plan half-width, all by z; front and rear half-widths by y */
const TRACE = {
	z0: /*@z0@*/0,
	dz: /*@dz@*/0,
	top: /*@top@*/[],
	bot: /*@bot@*/[],
	W: /*@W@*/[],
	y0: /*@y0@*/0,
	dy: /*@dy@*/0,
	front: /*@front@*/[],
	rear: /*@rear@*/[]
};
/** the Fiat's measures (m): its ends, axles, wheel wells, cabin and openings, read off the sheet at the cited scale */
const F5 = {
	L: 2.97,
	W: 1.32,
	H: 1.325,
	/** the shell's ends (the bumpers stand out to ±1.485) */
	nose: 1.43,
	tail: -1.43,
	axle: {
		front: .9625,
		rear: -.8775,
		/** the arches' middles, as the sheet has them */
		archF: .976,
		archR: -.891,
		xF: 1.121 / 2,
		xR: 1.135 / 2,
		y: .25
	},
	/** the wheel wells' inner walls (x) */
	well: { front: .37, rear: .45 },
	/** the canvas rolltop's opening, (z, x) in plan */
	roof: { z0: -.33, z1: .36, x: .385, y: 1.2 },
	/** the driver's seat (x, z), the steering wheel's hub */
	driver: { x: .27, z: -.12 },
	wheel: [.28, .86, .3]
};
const TYRE5 = /* @__PURE__ */ (() => ({ ...tyreSize(125, 83.7, 12), code: "125 SR 12" }))();
const SOURCES5 = [
	{ label: "Fiat 500 F (1971) specification sheet (e5efff81-8de1-45b3-9de1-2fd3e521bd53)", url: "https://auta5p.eu/lang/en/katalog/auto.php?idf=Fiat-500-F-26639" },
	{ label: "Fiat 500 F technical sheet: gears, axle, suspension (3b5332c8-1083-4e85-bad5-156a90148b09)", url: "https://www.cincent.tn.it/scheda-tecnica-fiat-500-f/" },
	{ label: "Features of the Fiat 500 F (1b98fcfa-450a-4c35-bceb-ea74624dde5f)", url: "https://www.garagefiat500.com/features-of-the-fiat-500-f/" },
	{ label: "125 SR 12 Cinturato CN54 (e12362b0-2cf5-4b87-95da-e0f36b801404)", url: "https://www.longstonetyres.co.uk/125sr12-cinturato-cn54.html" },
	{ label: "A 1966 Fiat 500 F: 95 km/h (ecc4134c-a8af-4d8d-8094-e8bc9c2d0a68)", url: "https://all-andorra.com/fiat-500-f-from-1966" },
	{ label: "Fiat 500 (1957–75), Cd 0.38 (cfa16bdf-268d-4e7b-b3ba-44e86656edf2)", url: "https://en.wikipedia.org/wiki/Fiat_500" },
	{ label: "Nuova 500 colours: Rosso Corallo 102 (344cf860-1a7d-4bf7-86e3-ac16638425a4)", url: "https://www.500clubitalia.it/informazioni-tecniche/colori" },
	{ label: "Fiat 500 F in detail: series, trim, colours (d317c2f0-cfa5-4faa-b502-157ac3e44b52)", url: "https://www.fiatvanderlaan.com/kb-docs/fiat-500-classic-model-500f-details" },
	{ label: "Telling the N, D, F, L and R apart (78b9bf39-5633-4c1c-abc7-81fda933e2a9)", url: "https://www.fiat500enthusiasts.co.uk/model-history/the-evolution-of-a-classic" },
	{ label: "Photo: a 1966 500 F, front three-quarter (4463df70-077f-42ba-bdf2-86d3da9e4951)", url: "https://commons.wikimedia.org/wiki/File:1966_Fiat_500F.jpg" },
	{ label: "Photo: a 1966 500 F, rear three-quarter (abce8d6e-3976-4369-8b3f-aa49240d0ac6)", url: "https://commons.wikimedia.org/wiki/File:1966_Fiat_500F_Rear.jpg" },
	{ label: "Road load and rolling resistance (Wong, Theory of Ground Vehicles)", url: "https://en.wikipedia.org/wiki/Rolling_resistance" },
	{ label: "Machine skill kit (AirSup, MIT)", url: "https://github.com/AirsupHQ/machine-skill" }
];
const SRC5 = /* @__PURE__ */ (() => ({
	size: SOURCES5[0].label,
	mech: SOURCES5[1].label,
	trim: SOURCES5[2].label,
	tyre: SOURCES5[3].label,
	top: SOURCES5[4].label,
	air: SOURCES5[5].label,
	paint: SOURCES5[6].label,
	look: SOURCES5[7].label,
	road: SOURCES5[11].label
}))();
const ASSEMBLIES5 = [
	{ id: "chassis", label: "Suspension and steering", note: "The transverse leaf spring and dampers in front, the worm-and-sector box and its track rods; the swinging arms with their coil springs and dampers behind.", out: [0, -.6, 0] },
	{ id: "wheels", label: "Wheels and brakes", note: "Four 125 SR 12 tyres on 12-inch pressed-steel wheels under domed hub caps; a drum at each.", out: [.5, -.2, 0] },
	{ id: "engine", label: "Engine", note: "The air-cooled 499.5 cc twin behind the rear axle: crankcase, finned barrels, head, pushrods, crank and rods; its fan and shroud, carburettor, air filter and exhaust.", out: [0, .25, -.5] },
	{ id: "drivetrain", label: "Gearbox and drive", note: "The clutch, the 4-speed gearbox and the final drive in one casing with the engine, the half-shafts to the rear wheels.", out: [0, -.35, -.2] },
	{ id: "front", label: "Front compartment", note: "The cylindrical 22 L fuel tank under the scuttle and the spare wheel in the nose.", out: [0, .35, .5] },
	{ id: "body", label: "Body", note: "The steel body: its shell traced off the reference sheet, its seams, the glass in its rubber, the rolltop.", out: [0, .9, 0] },
	{ id: "openings", label: "Doors and lids", note: "The two front-hinged doors, the front lid and the engine lid, each with its gap.", out: [.6, .3, 0] },
	{ id: "trim", label: "Lamps and chrome", note: "Round headlamps and indicators, the whiskers and horn cover, the rectangular tail lamps, the side repeaters, bumpers, handles.", out: [0, .2, .4] },
	{ id: "cab", label: "Interior", note: "The painted dashboard with its single round instrument, the steering wheel, pedals and gear lever, two front seats and the rear bench, the floor and its mats.", out: [0, .7, 0] }
];
const STEPS5 = [
	"Hang the front leaf spring and the rear arms on the body; fit the steering box and its rods",
	"Bolt on the drums and the wheels",
	"Lift in the engine with its fan, shroud and exhaust",
	"Fit the gearbox and final drive, the half-shafts",
	"Fit the fuel tank and the spare wheel under the front lid",
	"The painted shell, its glass and the rolltop",
	"Hang the doors and the two lids",
	"Fit the lamps, the bumpers and the chrome",
	"Fit the dashboard, the steering wheel, pedals and the seats"
];
/** sRGB #rrggbb to linear [r, g, b] @param {string} h */
const lin5 = (h) => [1, 3, 5].map((i) => {
	const c = parseInt(h.slice(i, i + 2), 16) / 255;
	return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
});
/** the Fiat's own materials: the paint, its trim and inside */
function materials5() {
	return {
		paint: MAT.paint({ color: lin5("#b1372f"), roughness: .3, clearcoat: 1, clearcoatRoughness: .06 }),
		/** the paint inside the doors, the lids' undersides and the bay: the same red, less polished */
		paintIn: MAT.paint({ color: lin5("#a8352d"), roughness: .5, clearcoat: .3, clearcoatRoughness: .4 }),
		chrome: MAT.chrome(),
		/** the wheels' silver paint (aluminium 690) */
		silver: MAT.paint({ color: [.55, .56, .57], metalness: .55, roughness: .38, clearcoat: .5 }),
		glass: MAT.glass({ color: [.93, .96, .95] }),
		lens: MAT.glass({ color: [.95, .95, .95], roughness: .08 }),
		amber: MAT.glass({ color: [1, .42, .02], roughness: .1, transmission: .6, emissive: [.08, .03, 0] }),
		red: MAT.glass({ color: [.75, .02, .02], roughness: .1, transmission: .55, emissive: [.05, 0, 0] }),
		reflector: MAT.chrome({ roughness: .18 }),
		rubber: MAT.rubber(),
		gap: MAT.satin({ color: [.012, .008, .008], roughness: .9 }),
		canvas: MAT.satin({ color: [.022, .022, .024], roughness: .95, finish: "cast", rep: [40, 40] }),
		vinyl: MAT.satin({ color: [.018, .018, .02], roughness: .55, clearcoat: .2 }),
		ivory: MAT.plastic({ color: [.62, .6, .53], roughness: .35 }),
		mat: MAT.rubber({ color: [.03, .03, .032], finish: "knurl", rep: [30, 30] }),
		black: MAT.plastic({ color: [.02, .02, .022], roughness: .5 }),
		dial: MAT.plastic({ color: [.02, .02, .025], roughness: .4 }),
		tick: MAT.plastic({ color: [.85, .85, .8], roughness: .4 }),
		needle: MAT.plastic({ color: [.9, .25, .05], roughness: .4 }),
		fan: MAT.plastic({ color: [.55, .48, .33], roughness: .45 }),
		shroud: MAT.satin({ color: [.03, .03, .032], roughness: .55 }),
		alloy: MAT.aluminium({ finish: "cast", roughness: .45 }),
		iron: MAT.castIron(),
		steel: MAT.steel(),
		exhaust: MAT.steelDark({ roughness: .6 })
	};
}

/* —— the shell: lofted station by station from the sheet's traced outlines —— */

/** a traced table read at `x` (linear, its ends held, its gaps bridged) @param {(number | null)[]} t @param {number} x0 @param {number} dx @param {number} x */
function traced(t, x0, dx, x) {
	const xs = [], ys = [];
	t.forEach((v, i) => {
		if (v !== null) xs.push(x0 + i * dx), ys.push(v);
	});
	return table(xs, ys, x);
}
/** the sheet's front or rear half-width at height y, as a share of its widest (held above 1.22 m, the roof's crown is the section's own) */
const profMax = /* @__PURE__ */ (() => ({
	front: Math.max(...TRACE.front.filter((v) => v !== null)),
	rear: Math.max(...TRACE.rear.filter((v) => v !== null))
}))();
function prof5(z, y) {
	const yy = clamp(y, .2, 1.22);
	const f = traced(TRACE.front, TRACE.y0, TRACE.dy, yy) / profMax.front, r = traced(TRACE.rear, TRACE.y0, TRACE.dy, yy) / profMax.rear;
	const s = clamp((z + .6) / 1.2);
	const k = s * s * (3 - 2 * s);
	return r + (f - r) * k;
}
/** the floor's underside along z: the underbody, rising to the valances at each end [read off the sheet's side view] */
const FLOOR5 = { z: [-1.43, -1.36, -1.3, -1.2, -.6, .6, 1.25, 1.33, 1.38, 1.43], y: [.42, .3, .26, .235, .2, .2, .225, .26, .3, .4] };
/**
 * The shell's section at station z: its top, the underbody's height, the wheel arch's lip (the paint's lower edge),
 * the side's half-width at a height, the crown, and the wheel well's inner wall.
 * @param {number} z
 */
function section5(z) {
	const { nose, tail } = F5;
	const zt = clamp(z, TRACE.z0, TRACE.z0 + (TRACE.W.length - 1) * TRACE.dz);
	let W = traced(TRACE.W, TRACE.z0, TRACE.dz, zt);
	// the ends rounded in plan from the last traced station to the tip
	const zl = TRACE.z0 + (TRACE.W.length - 1) * TRACE.dz;
	if (z > zl) W *= Math.sqrt(Math.max(0, 1 - ((z - zl) / (nose - zl)) ** 2));
	if (z < TRACE.z0) W *= Math.sqrt(Math.max(0, 1 - ((TRACE.z0 - z) / (TRACE.z0 - tail)) ** 2));
	// the shell's top: the sheet's, less the canvas over the rolltop's opening
	let top = traced(TRACE.top, TRACE.z0, TRACE.dz, zt);
	const r = F5.roof;
	const inRoof = clamp(Math.min(z - r.z0, r.z1 - z) / .04 + .5);
	top -= .026 * inRoof;
	const lip = traced(TRACE.bot, TRACE.z0, TRACE.dz, zt);
	const floor = Math.min(lip, table(FLOOR5.z, FLOOR5.y, z));
	const xWell = z > 0 ? F5.well.front : F5.well.rear;
	const b = Math.min(.075, Math.max(.01, (top - lip) * .3));
	const rb = Math.min(.045, Math.max(.005, (top - lip) * .15));
	/** the side's half-width at height y: the plan's width times the front/rear outline's share, its foot rounded */
	const side = (y) => {
		let x = W * prof5(z, y);
		if (y < lip + rb) {
			const x0 = W * prof5(z, lip + rb);
			x = Math.min(x, x0 - rb + Math.sqrt(Math.max(0, rb * rb - (lip + rb - y) ** 2)));
		}
		return Math.max(0, x);
	};
	return { z, W, top, lip, floor, xWell, b, side };
}
/** the shell's stations along z: closer at the ends, where it rounds fastest */
function stations5() {
	const zs = [];
	for (let z = F5.tail; z < F5.nose - 1e-9; ) {
		zs.push(z);
		z += Math.abs(z) > 1.3 ? .006 : .015;
	}
	zs.push(F5.nose);
	return zs;
}
/** counts of the section's points: underbody, wheel well, lip (the arch's roof), side, crown */
const SEC5 = { bottom: 5, well: 5, lip: 4, side: 38, crown: 16 };
/**
 * The section's points (x ≥ 0), from the underbody's middle round to the top's: the underbody out to the wheel well,
 * up its inner wall, out along the arch's roof to the lip, up the side, over the crown. Each run is its own: their
 * meeting corners stay crisp.
 * @param {ReturnType<typeof section5>} s
 * @returns {{ under: V2[], skin: V2[] }}
 */
function sectionPoints5(s) {
	const { side, top, lip, floor, b } = s;
	const xLip = side(lip);
	const xw = Math.min(s.xWell, Math.max(0, xLip - .015));
	/** @type {V2[]} */
	const under = [];
	for (let k = 0; k <= SEC5.bottom; k++) under.push([xw * k / SEC5.bottom, floor]);
	for (let k = 1; k <= SEC5.well; k++) under.push([xw, floor + (lip - floor) * k / SEC5.well]);
	for (let k = 1; k <= SEC5.lip; k++) under.push([xw + (xLip - xw) * k / SEC5.lip, lip]);
	/** @type {V2[]} */
	const skin = [];
	const yc = top - b;
	for (let k = 0; k <= SEC5.side; k++) {
		const u = k / SEC5.side;
		const y = lip + (yc - lip) * u;
		skin.push([side(y), y]);
	}
	const a = side(yc);
	for (let k = 1; k <= SEC5.crown; k++) {
		const th = k / SEC5.crown * Math.PI / 2;
		skin.push([a * Math.pow(Math.cos(th), 2 / 2.6), yc + b * Math.pow(Math.sin(th), 2 / 2.6)]);
	}
	return { under, skin };
}
/**
 * A grid of points (stations × points round a section, both sides) as a triangle soup: positions, normals (the grid's
 * own: across its stations and round its section) and uvs.
 * @param {V3[][]} P one row per station, each point x ≥ 0 from the bottom round to the top
 */
function gridSoup5(P) {
	const ni = P.length, nj = P[0].length;
	const N = P.map((row, i) => row.map((p, j) => {
		const a = P[Math.max(0, i - 1)][j], c = P[Math.min(ni - 1, i + 1)][j];
		let jb = Math.max(0, j - 1), jf = Math.min(nj - 1, j + 1);
		const di = new three.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
		const dj = new three.Vector3(P[i][jf][0] - P[i][jb][0], P[i][jf][1] - P[i][jb][1], P[i][jf][2] - P[i][jb][2]);
		const n = new three.Vector3().crossVectors(dj, di);
		if (n.lengthSq() < 1e-14) n.set(p[0] > 1e-4 ? 1 : 0, p[0] > 1e-4 ? 0 : 1, 0);
		return n.normalize();
	}));
	const pos = [], nor = [], uv = [];
	const put = (i, j, sx) => {
		const p = P[i][j], n = N[i][j];
		pos.push(sx * p[0], p[1], p[2]);
		nor.push(sx * n.x, n.y, n.z);
		uv.push(p[2], j / (nj - 1));
	};
	for (const sx of [1, -1]) for (let i = 0; i < ni - 1; i++) for (let j = 0; j < nj - 1; j++) {
		const quad = sx > 0 ? [[i, j], [i, j + 1], [i + 1, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]] : [[i, j], [i + 1, j], [i, j + 1], [i, j + 1], [i + 1, j], [i + 1, j + 1]];
		for (const [a, b] of quad) put(a, b, sx);
	}
	return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv) };
}
/** the shell lofted: its skin (side and crown) and its underside (underbody, wells and arches' roofs) as soups */
function shellSoups5() {
	const skin = [], under = [];
	for (const z of stations5()) {
		const pts = sectionPoints5(section5(z));
		skin.push(pts.skin.map(([x, y]) => [x, y, z]));
		under.push(pts.under.map(([x, y]) => [x, y, z]));
	}
	return { skin: gridSoup5(skin), under: gridSoup5(under) };
}
/**
 * A point on the shell's end, nose (dir 1) or tail (−1), at (x, y): the station where the section first holds it.
 * @param {number} x @param {number} y @param {1 | -1} dir
 */
function endZ5(x, y, dir) {
	const inside = (z) => {
		const s = section5(z);
		return y <= s.top && y >= s.lip && Math.abs(x) <= s.side(y);
	};
	let lo = dir > 0 ? F5.nose : F5.tail, hi = dir > 0 ? F5.nose - .6 : F5.tail + .6;
	if (!inside(hi)) return hi;
	for (let k = 0; k < 40; k++) {
		const m = (lo + hi) / 2;
		if (inside(m)) hi = m;
		else lo = m;
	}
	return (lo + hi) / 2;
}
/** a point on the shell's side at (z, y), side sx @param {number} z @param {number} y @param {1 | -1} [sx] @returns {V3} */
const sideAt5 = (z, y, sx = 1) => [sx * section5(z).side(y), y, z];
/** the shell's outward normal at a point on its side, nose or tail, by its neighbours @param {(u: number, v: number) => V3} f @param {number} u @param {number} v */
function normalOf5(f, u, v, e = .004) {
	const a = new three.Vector3(...f(u + e, v)).sub(new three.Vector3(...f(u - e, v)));
	const b = new three.Vector3(...f(u, v + e)).sub(new three.Vector3(...f(u, v - e)));
	return new three.Vector3().crossVectors(a, b).normalize();
}

/* —— cutting the shell into its panels: signed distances, positive inside a region —— */

/** a polygon's signed distance (negative inside) @param {V2[]} pts @param {number} px @param {number} py */
function sdPoly5(pts, px, py) {
	let d = Infinity, s = 1;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [ax, ay] = pts[j], [bx, by] = pts[i];
		const ex = bx - ax, ey = by - ay, wx = px - ax, wy = py - ay;
		const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey));
		d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
		const c1 = py >= ay, c2 = py < by, c3 = ex * wy > ey * wx;
		if (c1 && c2 && c3 || !c1 && !c2 && !c3) s = -s;
	}
	return s * d;
}
/**
 * A region as a rounded polygon: its signed distance, positive inside, its corners rounded by r (the polygon drawn
 * where its edges are, anticlockwise).
 * @param {V2[]} pts @param {number} r
 */
function region5(pts, r) {
	const core = insetEdges(pts, pts.map(() => r));
	return (u, v) => r - sdPoly5(core, u, v);
}
/**
 * A soup cut by a field: the part where f ≥ 0, each triangle the field crosses cut where it crosses (positions,
 * normals and uvs interpolated), so the edge is as smooth as the field.
 * @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} src @param {(x: number, y: number, z: number) => number} f
 */
function clip5(src, f) {
	const pos = [], nor = [], uv = [];
	const P = src.pos, Nn = src.nor, U = src.uv, n = P.length / 3;
	const vals = new Float32Array(n);
	for (let i = 0; i < n; i++) vals[i] = f(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
	const emit = (vs) => {
		for (let k = 1; k + 1 < vs.length; k++) for (const v of [vs[0], vs[k], vs[k + 1]]) pos.push(v[0], v[1], v[2]), nor.push(v[3], v[4], v[5]), uv.push(v[6], v[7]);
	};
	const vert = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2], U[i * 2], U[i * 2 + 1]];
	for (let t = 0; t < n; t += 3) {
		const a = vals[t], b = vals[t + 1], c = vals[t + 2];
		if (a >= 0 && b >= 0 && c >= 0) {
			emit([vert(t), vert(t + 1), vert(t + 2)]);
			continue;
		}
		if (a < 0 && b < 0 && c < 0) continue;
		const out = [];
		for (let k = 0; k < 3; k++) {
			const i = t + k, j = t + (k + 1) % 3, vi = vals[i], vj = vals[j];
			if (vi >= 0) out.push(vert(i));
			if (vi >= 0 !== vj >= 0) {
				const s = vi / (vi - vj), A = vert(i), B = vert(j);
				out.push(A.map((x, q) => x + (B[q] - x) * s));
			}
		}
		if (out.length >= 3) emit(out);
	}
	return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv) };
}
/** a soup as a geometry, its points moved `off` along their normals (out, or in when negative) @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s @param {number} [off] */
function geoOf5(s, off = 0) {
	const g = new three.BufferGeometry();
	const p = s.pos.slice();
	if (off) for (let i = 0; i < p.length; i++) p[i] += s.nor[i] * off;
	g.setAttribute("position", new three.BufferAttribute(p, 3));
	g.setAttribute("normal", new three.BufferAttribute(s.nor.slice(), 3));
	g.setAttribute("uv", new three.BufferAttribute(s.uv.slice(), 2));
	g.computeBoundingBox();
	g.computeBoundingSphere();
	return g;
}
/** a soup turned inside out (a lining seen from within): its winding and normals flipped @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s */
function flip5(s) {
	const pos = s.pos.slice(), nor = s.nor.slice(), uv = s.uv.slice();
	for (let t = 0; t < pos.length; t += 9) for (let q = 0; q < 3; q++) {
		const a = pos[t + 3 + q];
		pos[t + 3 + q] = pos[t + 6 + q];
		pos[t + 6 + q] = a;
		const b = nor[t + 3 + q];
		nor[t + 3 + q] = nor[t + 6 + q];
		nor[t + 6 + q] = b;
	}
	for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
	for (let t = 0; t < uv.length; t += 6) for (let q = 0; q < 2; q++) {
		const a = uv[t + 2 + q];
		uv[t + 2 + q] = uv[t + 4 + q];
		uv[t + 4 + q] = a;
	}
	return { pos, nor, uv };
}
/** a soup moved into another frame (its points less `o`) @param {{ pos: Float32Array, nor: Float32Array, uv: Float32Array }} s @param {V3} o */
function shift5(s, o) {
	const pos = s.pos.slice();
	for (let i = 0; i < pos.length; i += 3) pos[i] -= o[0], pos[i + 1] -= o[1], pos[i + 2] -= o[2];
	return { pos, nor: s.nor, uv: s.uv };
}

/* —— where the shell is cut: its seams and openings, each a field positive inside (m) —— */

/** a rounded intersection of two fields, its corner of radius R @param {number} a @param {number} b @param {number} R */
const both5 = (a, b, R) => a > R || b > R ? Math.min(a, b) : R - Math.hypot(R - a, R - b);
/** the panels' gap, each side of a seam (m): 4.4 mm across */
const GAP5 = .0022;
const DOOR5 = /* @__PURE__ */ (() => region5([[-.32, .3], [.645, .3], [.645, .875], [.44, 1.2], [-.32, 1.212]], .035))();
const DOORWIN5 = /* @__PURE__ */ (() => region5([[-.272, .862], [.4, .862], [.248, 1.135], [-.272, 1.135]], .028))();
const QUARTER5 = /* @__PURE__ */ (() => region5([[-.885, .865], [-.385, .865], [-.385, 1.152], [-.64, 1.158]], .05))();
const SCREEN5 = /* @__PURE__ */ (() => region5([[-.458, .935], [.458, .935], [.452, 1.218], [-.452, 1.218]], .068))();
const BACKLIGHT5 = /* @__PURE__ */ (() => region5([[-.325, 1.01], [.325, 1.01], [.325, 1.215], [-.325, 1.215]], .05))();
const ROOFHOLE5 = /* @__PURE__ */ (() => region5([[F5.roof.z0, -F5.roof.x], [F5.roof.z1, -F5.roof.x], [F5.roof.z1, F5.roof.x], [F5.roof.z0, F5.roof.x]], .03))();
const ENGINELID5 = /* @__PURE__ */ (() => region5([[-.425, .435], [.425, .435], [.42, .848], [-.42, .848]], .045))();
/** the fields, by name: each (x, y, z) → m, positive inside */
const CUTS5 = {
	doorL: (x, y, z) => x > .25 ? DOOR5(z, y) : -1,
	doorR: (x, y, z) => x < -.25 ? DOOR5(z, y) : -1,
	winL: (x, y, z) => x > .25 ? DOORWIN5(z, y) : -1,
	winR: (x, y, z) => x < -.25 ? DOORWIN5(z, y) : -1,
	quarterL: (x, y, z) => x > .25 ? QUARTER5(z, y) : -1,
	quarterR: (x, y, z) => x < -.25 ? QUARTER5(z, y) : -1,
	screen: (x, y, z) => z > .3 && y > .88 ? SCREEN5(x, y) : -1,
	backlight: (x, y, z) => z < -.6 && y > .95 ? BACKLIGHT5(x, y) : -1,
	roof: (x, y, z) => y > 1.15 ? ROOFHOLE5(z, x) : -1,
	/** the front lid: above its seam along the wings and across the nose, ahead of the scuttle (which curves back to the sides) */
	frontLid: (x, y, z) => {
		const xs = Math.min(1, Math.abs(x) / .6);
		const seam = .716 + .02 * xs * xs + Math.max(0, .8 - z) * .12;
		return z < .45 ? -1 : both5(z - (.7 - .07 * xs * xs), y - seam, .07);
	},
	engineLid: (x, y, z) => z < -1 ? ENGINELID5(x, y) : -1
};
/** the soup outside every one of these fields, a gap's half from each seam @param {any} s @param {string[]} names @param {number} [g] */
const outside5 = (s, names, g = GAP5) => names.reduce((acc, n) => clip5(acc, (x, y, z) => -CUTS5[n](x, y, z) - g), s);
/** the soup inside a field, a gap's half in from its seam @param {any} s @param {string} name @param {number} [g] */
const inside5 = (s, name, g = GAP5) => clip5(s, (x, y, z) => CUTS5[name](x, y, z) - g);
/** a band of the soup along a field's edge, from `a` to `b` (m, positive inside) @param {any} s @param {string} name @param {number} a @param {number} b */
const band5 = (s, name, a, b) => clip5(clip5(s, (x, y, z) => CUTS5[name](x, y, z) - a), (x, y, z) => b - CUTS5[name](x, y, z));

/** the Fiat as the solver runs it: its cited mass, gearing and tyres; the rest [inferred] */
const VEHICLE5 = /* @__PURE__ */ (() => ({
	kerb: 520,
	payload: 320,
	Crr: .015,
	CdA: .38 * 1.4,
	r: TYRE5.r * .97,
	eta: .88,
	gears: [37 / 10, 31 / 15, 26 / 20, 21 / 24],
	final: 41 / 8,
	engine: {
		rpm: [800, 1500, 2000, 2500, 3000, 3500, 4000, 4600, 5000, 5300],
		nm: [17, 24, 27.5, 29.8, 31, 30.7, 29.6, 27.9, 21, 8],
		idle: 850,
		stall: 600,
		max: 5300,
		up: 4300,
		down: 1700,
		launch: 1500,
		Vd: 499.5e-6,
		fmep: 13e4,
		bsfc: 270,
		fuel: "petrol",
		J: .045
	},
	Jw: .35,
	wheels: 4,
	axles: {
		wb: F5.axle.front - F5.axle.rear,
		h: .52,
		front: .42,
		loadFront: .45,
		k: [9e3, 14e3],
		travel: [.07, .09]
	}
}))();
const KMH5 = 1 / 3.6;

/**
 * The Fiat 500 F: a root at its real size, every part its own, vehicle.js's solver driving it.
 * @param {{ speed?: number, grade?: number, load?: number, doors?: number, roof?: number, lid?: number }} [o] the speed
 *   asked (km/h), the grade (%), the load in it (kg: the driver is 75), the doors open (0 shut … 1 open), the rolltop
 *   folded back (0 … 1), the engine lid up (0 … 1)
 * @returns {THREE.Group}
 */
function fiat500({ speed = 60, grade = 0, load = 75, doors = 0, roof = 0, lid = 0 } = {}) {
	const root = new three.Group();
	root.name = "Fiat 500 F";
	const M = materials5(), R = vehicleMaterials(), E = engineMaterials();
	const kit = assetKit(root, { assemblies: ASSEMBLIES5, steps: STEPS5, sources: SOURCES5 });
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** the sprung body: the shell and everything bolted to it, sinking and pitching on the springs */
	const body = new three.Group();
	body.name = "sprung";
	root.add(body);
	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	const { axle } = F5;
	const sim = vehicleSolver(VEHICLE5);
	const kmh = () => sim.s.v * 3.6;

	/* —— the shell —— */
	const shell = shellSoups5();
	const skin = shell.skin;
	const openings = ["doorL", "doorR", "frontLid", "engineLid", "screen", "backlight", "quarterL", "quarterR", "roof"];
	{
		const paint = outside5(skin, openings);
		// the dark of each gap: a strip of the shell along every seam, set in behind it
		const gaps = ["doorL", "doorR", "frontLid", "engineLid"].map((n) => geoOf5(band5(skin, n, -.009, .009), -.007));
		part({
			id: "shell",
			label: "Body shell",
			assembly: "body",
			source: SRC5.look,
			what: "The 500’s load-bearing steel body, pressed and welded in one: its sides with the wheel arches and sills, the roof with its rolltop’s opening, the scuttle, the wings, the nose and the tail with its louvred intake. Its outline is its reference sheet’s, traced view by view and lofted station by station; the doors and lids sit in it behind 4 mm gaps.",
			specs: [["Length (body)", "2,860 mm; 2,970 over the bumpers"], ["Width", "1,320 mm"], ["Height", "1,325 mm to the rolltop"], ["Paint", "Rosso Corallo, Fiat 102, #b1372f"], ["Panel gaps", "4.4 mm"]]
		}, [m(geoOf5(paint), M.paint), m(GEO.merge(gaps), M.gap)], { xray: "shell" });
		part({
			id: "underbody",
			label: "Floor pan and wheel wells",
			assembly: "body",
			source: SRC5.look,
			what: "The underside of the shell: the floor pan from end to end and the four wheel wells over the tyres, painted and sealed.",
			specs: [["Ground clearance", "130 mm (lowest point)"]]
		}, [m(geoOf5(shell.under), M.paintIn)], { xray: "shell" });
	}
	/* —— the glass, each pane in its rubber —— */
	{
		const panes = [], seals = [];
		for (const [n, w] of [["screen", .028], ["backlight", .022], ["quarterL", .024], ["quarterR", .024]]) {
			panes.push(geoOf5(inside5(skin, n, .006), -.006));
			seals.push(geoOf5(band5(skin, n, -.001, w), .0015));
		}
		part({
			id: "glass",
			label: "Windscreen, back and quarter windows",
			assembly: "body",
			source: SRC5.trim,
			what: "The laminated windscreen (larger on the F than on the D), the toughened back window over the engine and the two fixed quarter windows, each set in a black rubber seal in the shell’s flange.",
			specs: [["Windscreen", "laminated, curved"], ["Seals", "black rubber, 22–28 mm"]]
		}, [m(GEO.merge(panes), M.glass), m(GEO.merge(seals), M.rubber)]);
	}
	/* —— the doors, on their hinges at the front —— */
	const doorHinges = [];
	for (const sx of [1, -1]) {
		const n = sx > 0 ? "doorL" : "doorR", w = sx > 0 ? "winL" : "winR";
		const pivot = [sx * (section5(.645).side(.62) - .028), .62, .645];
		const h = hinge(body, { at: pivot, axis: "y", max: -sx * 1.15, name: `door-${sx > 0 ? "l" : "r"}` });
		doorHinges.push(h);
		const piece = inside5(skin, n);
		const outer = clip5(piece, (x, y, z) => -CUTS5[w](x, y, z) - .009);
		const frame = band5(piece, w, -.009, -.003);
		const seal = band5(piece, w, -.003, .004);
		const glass = clip5(piece, (x, y, z) => CUTS5[w](x, y, z));
		const card = clip5(piece, (x, y, z) => .86 - y);
		const geo = (s, off) => geoOf5(shift5(s, pivot), off);
		kit.part(new three.Group().add(m(geo(outer, 0), M.paint), m(geo(frame, .001), M.chrome), m(geo(seal, .0005), M.rubber), m(geo(glass, -.004), M.glass), m(geoOf5(shift5(flip5(card), pivot), .065), M.paintIn)), {
			id: `door-${sx > 0 ? "left" : "right"}`,
			label: sx > 0 ? "Door, left (the driver’s)" : "Door, right",
			assembly: "openings",
			source: SRC5.trim,
			what: "A front-hinged steel door (the F’s, by the Highway Code of 1965): its skin, the framed window with its chrome trim and the vent wing ahead of the winding glass, the painted inner panel; held by two hinges and a push-button lock.",
			moves: "Swings out on its hinges at its front edge.",
			drive: "A hand, by its handle",
			specs: [["Hinges", "2, at the front edge"], ["Opening", "66°"]]
		}, { explode: [sx * .5, 0, 0] }, h.pivot);
	}
	/* —— the front lid and the engine lid —— */
	{
		const lidF = inside5(skin, "frontLid");
		part({
			id: "front-lid",
			label: "Front lid",
			assembly: "openings",
			source: SRC5.look,
			what: "The domed front lid over the luggage space, the tank and the spare wheel: it covers the whole front from the scuttle to above the whiskers, its seam running along the wings’ shoulders.",
			specs: [["Seam", "4.4 mm"]]
		}, [m(geoOf5(lidF), M.paint)], { explode: [0, .3, .25] });
	}
	const lidPivot = [0, .848, endZ5(0, .848, -1) + .012];
	const engineLid = hinge(body, { at: lidPivot, axis: "x", max: 1.25, name: "engine-lid" });
	{
		const piece = inside5(skin, "engineLid");
		kit.part(new three.Group().add(m(geoOf5(shift5(piece, lidPivot)), M.paint), m(geoOf5(shift5(flip5(piece), lidPivot), .02), M.paintIn)), {
			id: "engine-lid",
			label: "Engine lid",
			assembly: "openings",
			source: SRC5.look,
			what: "The rear lid over the engine, hinged along its top under the louvred intake band: its two banks of horizontal louvres let the warm air out of the bay.",
			moves: "Swings up on its top hinges.",
			drive: "A hand, by its handle",
			specs: [["Louvres", "2 × 9"]]
		}, { explode: [0, .25, -.3] }, engineLid.pivot);
	}

	/* —— the wheels: drums all round, 125 SR 12 on 12-inch steel discs under domed caps —— */
	const wheelOpts = {
		size: TYRE5,
		rimW: 3.5 * .0254,
		et: .022,
		rim: "steel",
		studs: 4,
		pcd: .19,
		M: R,
		assembly: "wheels",
		source: SRC5.tyre,
		brake: "drum",
		drum: { r: .085, depth: .05 },
		rimMat: M.silver,
		specs: [["Tyre", "125 SR 12, 514 mm across (e12362b0…)"], ["Drum", "170 mm"]]
	};
	const corners = {
		fl: wheelCorner(kit, { ...wheelOpts, id: "fl", label: "front left", at: [axle.xF, axle.y, axle.front], side: 1, steers: true, arm: -1, drive: "The road; steered by its kingpin" }),
		fr: wheelCorner(kit, { ...wheelOpts, id: "fr", label: "front right", at: [-axle.xF, axle.y, axle.front], side: -1, steers: true, arm: -1 }),
		rl: wheelCorner(kit, { ...wheelOpts, id: "rl", label: "rear left", at: [axle.xR, axle.y, axle.rear], side: 1, drive: "The half-shaft, from the final drive" }),
		rr: wheelCorner(kit, { ...wheelOpts, id: "rr", label: "rear right", at: [-axle.xR, axle.y, axle.rear], side: -1, drive: "The half-shaft, from the final drive" })
	};
	// the domed hub cap and the rim's painted face, on each wheel
	for (const c of Object.values(corners)) {
		const x0 = wheelOpts.et + .006;
		const cap = latheX([[0, x0 + .046], [.03, x0 + .045], [.07, x0 + .037], [.1, x0 + .022], [.118, x0 + .006], [.121, x0], [0, x0]], 56);
		const face = latheX([[.112, x0 - .006], [.152, x0 - .014], [.152, x0 - .008], [.115, x0 + .001]], 56);
		c.wheel.add(m(cap, M.chrome), m(face, M.silver));
	}

	/* —— the drive, the controls and the lab —— */
	const ctl = {
		speed: { label: "Speed asked", min: 0, max: 110, value: speed, step: 1, unit: "km/h", ends: ["Standing", "110 km/h"] },
		grade: { label: "Grade", min: -15, max: 30, value: grade, step: .5, unit: "%", ends: ["Downhill", "Steep climb"] },
		load: { label: "Load inside (people and bags)", min: 0, max: VEHICLE5.payload, value: load, step: 5, unit: "kg", ends: ["Empty", "Four aboard"] },
		doors: { label: "Doors open", min: 0, max: 1, value: doors, step: .01, digits: 2, ends: ["Shut", "Open"] },
		roof: { label: "Rolltop folded back", min: 0, max: 1, value: roof, step: .01, digits: 2, ends: ["Closed", "Open"] },
		lid: { label: "Engine lid up", min: 0, max: 1, value: lid, step: .01, digits: 2, ends: ["Shut", "Up"] }
	};
	const input = (env) => ({
		vSet: ctl.speed.value * KMH5,
		grade: env.broken ? .3 : ctl.grade.value / 100,
		load: env.broken ? VEHICLE5.payload * 1.6 : ctl.load.value
	});
	sim.settle(input({ broken: false }));
	const ticks = [];
	kit.onTick((dt, env) => {
		const inp = input(env);
		sim.step(dt, inp);
		const s = sim.s;
		const al = (s.sagF - s.sagR) / VEHICLE5.axles.wb;
		body.rotation.x = al;
		body.position.y = -s.sagF + al * axle.front;
		body.updateMatrix();
		for (const c of Object.values(corners)) c.set(s.wheelAng);
		for (const d of doorHinges) d.set(clamp(ctl.doors.value));
		engineLid.set(clamp(ctl.lid.value));
		for (const f of ticks) f(dt, s);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || lug && s.gear === 1 || s.bottomed;
		r.state = s.stalled ? env.broken ? `stalled: ${fmt(VEHICLE5.payload * 1.6)} kg in it up a 30 % grade` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `flat out in ${ordinal(s.gear)}` : s.Fb > 1 ? `braking in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? `first gear gives at most ${fmt(s.can)} N at the wheels, the hill and the road take ${fmt(s.need)} N` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3, 1)} kW at the flywheel · the road takes ${fmt(s.road.F)} N (rolling ${fmt(s.road.roll)}, climbing ${fmt(s.road.climb)}, air ${fmt(s.road.air)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 2)} L/h`}`;
	});
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: { label: "Power at the wheels", unit: "kW", max: 14, digits: 1 },
		read: { value: 0, state: "", sub: "", bad: false },
		controls: ctl,
		moves: {
			doors: { label: "Doors", seconds: 6, note: "both doors swung open and shut", at: (u) => ({ doors: Math.sin(u * Math.PI) }) },
			rolltop: { label: "Rolltop", seconds: 8, note: "the canvas folded back and closed again", at: (u) => ({ roof: Math.sin(u * Math.PI) }) },
			lid: { label: "Engine lid", seconds: 6, note: "the engine lid lifted and shut", at: (u) => ({ lid: Math.sin(u * Math.PI) }) }
		},
		how: {
			text: "A driver holds the speed asked: the road takes a force to roll the tyres, to lift the car up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the final drive’s losses at the engine. The driver picks the highest of the four gears that gives that push without the engine running too slow, and opens the throttle for it. Flat out on the level, the twin’s full-load curve in fourth meets the road’s load: that is its top speed. Where first gear gives less than a hill takes, the speed falls, the engine lugs and stalls. Shown slowed: the wheels 10 times, the engine 40 times.",
			eqs: [
				"F = m g Crr cos θ + m g sin θ + ½ ρ Cd A v²      m = 520 kg + load, Crr = 0.015, Cd = 0.38, A = 1.40 m²",
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.88",
				"n = (v / r) · i_gear · i_axle      r = 0.249 m, i = 3.700, 2.067, 1.300, 0.875, i_axle = 41/8 = 5.125",
				"T_engine ≤ T_full(n)      31 N·m at 3,000 rpm, 27.9 N·m (13.2 kW) at 4,600",
				"m_eff dv/dt = T i η / r − F      m_eff = m + (4 J_w + J_e i² η) / r²"
			]
		},
		breakIt: { label: "Four aboard with luggage up a 30 % hill", run: () => {}, reset: () => sim.restart() },
		cut: { a: [1, 0, 0], b: [0, 1, 0], center: [0, .6, 0], reach: .4 }
	};
	kit.seal({ lab }).tick(0, { broken: false, time: 0, slow: 0, cut: 0, xray: 0 });
	return root;
}

//#endregion
