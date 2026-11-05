/*
 * Sandbox 4, the dome cassette joint (Samuel 2026-11-05): one cast cassette of the grand dome (Ø 100 m) set into the
 * lowest two rows, in five steps on one clock. Everything on screen is a function of the time t (apply), so a step,
 * the timeline and Play all show the same state; the camera follows its own path until someone drags the view.
 *
 * The geometry is the joint as designed in the conversation it came from, at real size in metres:
 *   - the shell: a regular band of the frequency-18 grid on a sphere of R 50 m, edges 3.4 m (one pane of float glass);
 *   - a cassette: a triangle whose every point at depth r lies on the ray to the dome's centre (F), so its edge faces
 *     are radial planes: it can only come in from outside and wedges in like a keystone;
 *   - each edge a half-rib 16 × 45 cm with a dovetail groove; two neighbours' grooves make a bowtie channel that basalt
 *     key segments (36 cm, 7 per edge) are fed along from the open node pocket (corners cut back 30 cm);
 *   - a cast cap closes each pocket; a ring cable through the keys of the lowest ring joints clamps the row.
 * The numbers are rough hand calculations, not engineering.
 */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createControls, createRenderer, disposeObject, disposeRenderer, fitTo, lowPower } from '$lib/content/render/core.js';

/* ---------------- real measures, metres ---------------- */
export const R = 50; // dome radius
export const L = 3.4; // cassette edge
const ROWH = (L * Math.sqrt(3)) / 2; // a row's height on the shell
const dE = ROWH / R, dA = L / R; // the grid's angular steps
export const D = 0.45; // rib depth
export const W = 0.16; // half-rib width in the cassette's plane
export const C = 0.3; // corner cut back along each edge: the node pocket
const RC = D / 2; // the key's centre depth
export const GA = 0.06, GB = 0.12, GD = 0.05; // the groove: wide at the seam, wide inside, deep
const KEY_PITCH = 0.4;
const GLASS0 = 0.05, GLASS1 = 0.08; // the glass, measured in from the outer face

/** when each step starts, seconds */
export const T = { seat: 4, keys: 8.2, caps: 14.8, cable: 18.2, end: 23.5 } as const;
export const STEPS = [
	{ t: 0, name: 'Dome', title: 'The grand dome', text: '100 m across, about 3,100 cassettes. The view closes in on the two lowest rows.' },
	{ t: T.seat, name: 'Seat', title: 'Seat the cassette', text: "It comes in from outside. Its edge faces lie on planes through the dome's centre, so it wedges in like a keystone and cannot fall inward." },
	{ t: T.keys, name: 'Key', title: 'Feed the keys', text: 'Basalt key segments drop into the open node pocket and slide along the bowtie channel the two neighbours form. Once keyed, the joint cannot open or pull out.' },
	{ t: T.caps, name: 'Cap', title: 'Cap the nodes', text: 'A cast plug closes each pocket where six cassettes meet and covers the seams at the corner.' },
	{ t: T.cable, name: 'Clamp', title: 'Clamp the ring', text: 'On the 100 m dome, ring cables run through the keys of the lower rows and are tensioned, pressing every joint shut. Release them and the dome comes apart again.' }
] as const;

/** the cassette's mass and the dome's counts, from the measures above */
export const FACTS = (() => {
	const At = (Math.sqrt(3) / 4) * L * L, Lw = L - 2 * Math.sqrt(3) * W, Aw = (Math.sqrt(3) / 4) * Lw * Lw;
	const Ac = 3 * 0.5 * C * C * Math.sin(Math.PI / 3);
	const vol = (At - Aw - Ac) * D - 3 * (L - 2 * C) * (((GA + GB) / 2) * GD);
	const mass = vol * 2.3 + Aw * (GLASS1 - GLASS0) * 2.5; // cast ceramic 2.3 t/m³, glass 2.5 t/m³
	const n = (2 * Math.PI * R * R) / At, joints = 1.5 * n;
	const round = (x: number, s: number) => (Math.round(x / s) * s).toLocaleString('en');
	return { mass: mass.toFixed(1), cassettes: round(n, 100), joints: round(joints, 100), keys: round(7 * joints, 1000), caps: round(n / 2, 100) };
})();

/* ---------------- the brand's colours, in the world ---------------- */
const COL = {
	ceramic: 0xd9cfba, fresh: 0xefc46a, cap: 0xc2b79e, basalt: 0x2c3830, glass: 0xa9c7c1, beam: 0xaea590,
	cable: 0xc8744f, person: 0x4d5d51, ground: 0xaab78e, floor: 0xcfc6b1, fog: 0xf1ede3,
	line: 0x26382c, lineFresh: 0x24452f, domeLine: 0x6f7d6c, skin: 0xe9ece2, rope: 0x3a463d
};

/* ---------------- helpers ---------------- */
type V = THREE.Vector3;
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const s = clamp01((x - a) / (b - a)); return s * s * (3 - 2 * s); };
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const win = (t: number, a: number, b: number, f: number) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));

class Geo {
	p: number[] = [];
	tri(a: V, b: V, c: V) { this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
	quad(a: V, b: V, c: V, d: V) { this.tri(a, b, c); this.tri(a, c, d); }
	build() {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
		g.computeVertexNormals();
		return g;
	}
}

/* ---------------- the geodesic band ---------------- */
const nid = (k: number, i: number) => `${k}:${i}`;
function nodePos(k: number, i: number) {
	const a = (i + 0.5 * (k % 2)) * dA, e = k * dE;
	return V3(R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a));
}
const nodeOf = (id: string) => { const [k, i] = id.split(':').map(Number); return nodePos(k, i); };
const TRIS: string[][] = [];
for (let i = -3; i <= 2; i++) TRIS.push([nid(0, i), nid(0, i + 1), nid(1, i)]); // row 1, pointing up
for (let i = -2; i <= 2; i++) TRIS.push([nid(1, i - 1), nid(1, i), nid(0, i)]); // row 1, pointing down
for (let i = -3; i <= 1; i++) TRIS.push([nid(1, i), nid(1, i + 1), nid(2, i + 1)]); // row 2, up
for (let i = -3; i <= 2; i++) TRIS.push([nid(2, i), nid(2, i + 1), nid(1, i)]); // row 2, down
const NEW_IDS = ['1:-1', '1:0', '2:0'];

type Edge = { a: V; b: V; e: V; m: V; len: number; ia: string; ib: string };
type Frame = { ids: string[]; V: V[]; n: V; h: number; cen: V; F: (P: V, r: number) => V; to2: (P: V) => THREE.Vector2; edges: Edge[]; fresh: boolean };

function makeFrame(ids0: string[]): Frame {
	const ids = ids0.slice(), Vs = ids.map(nodeOf);
	const n = new THREE.Vector3().subVectors(Vs[1], Vs[0]).cross(new THREE.Vector3().subVectors(Vs[2], Vs[0])).normalize();
	const cen = Vs[0].clone().add(Vs[1]).add(Vs[2]).divideScalar(3);
	if (n.dot(cen) < 0) { [Vs[1], Vs[2]] = [Vs[2], Vs[1]]; [ids[1], ids[2]] = [ids[2], ids[1]]; n.negate(); }
	const h = n.dot(Vs[0]);
	const ex = new THREE.Vector3().subVectors(Vs[1], Vs[0]).normalize();
	const ey = new THREE.Vector3().crossVectors(n, ex);
	// a point of the cassette at depth r lies on the ray to the dome's centre: its side faces are radial planes
	const F = (P: V, r: number) => P.clone().multiplyScalar((h - r) / h);
	const to2 = (P: V) => { const d = P.clone().sub(Vs[0]); return new THREE.Vector2(d.dot(ex), d.dot(ey)); };
	const edges = [0, 1, 2].map((i) => {
		const a = Vs[i], b = Vs[(i + 1) % 3], o = Vs[(i + 2) % 3];
		const e = b.clone().sub(a); const len = e.length(); e.divideScalar(len);
		const m = new THREE.Vector3().crossVectors(n, e);
		if (m.dot(o.clone().sub(a)) < 0) m.negate();
		return { a, b, e, m, len, ia: ids[i], ib: ids[(i + 1) % 3] };
	});
	return { ids, V: Vs, n, h, cen, F, to2, edges, fresh: NEW_IDS.every((id) => ids.includes(id)) };
}

function extrude(gb: Geo, F: Frame['F'], a: V, e: V, m: V, u0: number, u1: number, prof: number[][]) {
	const at = (u: number, q: number, r: number) => F(a.clone().addScaledVector(e, u).addScaledVector(m, q), r);
	const s0 = prof.map(([q, r]) => at(u0, q, r)), s1 = prof.map(([q, r]) => at(u1, q, r));
	const tri = THREE.ShapeUtils.triangulateShape(prof.map(([q, r]) => new THREE.Vector2(q, r)), []);
	tri.forEach(([x, y, z]) => { gb.tri(s0[x], s0[y], s0[z]); gb.tri(s1[x], s1[z], s1[y]); });
	for (let i = 0; i < prof.length; i++) { const j = (i + 1) % prof.length; gb.quad(s0[i], s0[j], s1[j], s1[i]); }
}
function prism(gb: Geo, f: Frame, pts: V[], r0: number, r1: number) {
	const top = pts.map((p) => f.F(p, r0)), bot = pts.map((p) => f.F(p, r1));
	const tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => f.to2(p)), []);
	tri.forEach(([x, y, z]) => { gb.tri(top[x], top[y], top[z]); gb.tri(bot[x], bot[z], bot[y]); });
	for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; gb.quad(top[i], bot[i], bot[j], top[j]); }
}
function convexPrism(gb: Geo, pts: V[], r0: number, r1: number, map: (p: V, r: number) => V) {
	const top = pts.map((p) => map(p, r0)), bot = pts.map((p) => map(p, r1));
	for (let i = 1; i < pts.length - 1; i++) { gb.tri(top[0], top[i], top[i + 1]); gb.tri(bot[0], bot[i + 1], bot[i]); }
	for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; gb.quad(top[i], bot[i], bot[j], top[j]); }
}

// the half-rib's section (q from the seam into the cassette, r the depth from the outer face), its dovetail on the seam
const RIB = [[0, 0], [W, 0], [W, D], [0, D], [0, RC + GA / 2], [GD, RC + GB / 2], [GD, RC - GB / 2], [0, RC - GA / 2]];
const g1 = GD - 0.004, a1 = GA / 2 - 0.003, b1 = GB / 2 - 0.003; // the key, a few millimetres smaller than its channel
const KEY = [[-g1, RC - b1], [0, RC - a1], [g1, RC - b1], [g1, RC + b1], [0, RC + a1], [-g1, RC + b1]];

function windowCorner(f: Frame, i: number) {
	const v = f.V[i];
	const e1 = f.V[(i + 1) % 3].clone().sub(v).normalize(), e2 = f.V[(i + 2) % 3].clone().sub(v).normalize();
	const th = Math.acos(e1.dot(e2));
	return v.clone().addScaledVector(e1.clone().add(e2).normalize(), W / Math.sin(th / 2));
}
function cornerPoints(f: Frame, i: number): [V, V, V, V] {
	const v = f.V[i], e1 = f.edges[i].e, prev = f.edges[(i + 2) % 3];
	return [v.clone().addScaledVector(e1, C), v.clone().addScaledVector(prev.e.clone().negate(), C), f.edges[i].m, prev.m];
}
function buildCassette(f: Frame) {
	const gb = new Geo();
	f.edges.forEach((ed) => extrude(gb, f.F, ed.a, ed.e, ed.m, C, ed.len - C, RIB));
	const Wc = [0, 1, 2].map((i) => windowCorner(f, i));
	for (let i = 0; i < 3; i++) {
		const [P1, P5, m1, m2] = cornerPoints(f, i);
		prism(gb, f, [P1, P1.clone().addScaledVector(m1, W), Wc[i], P5.clone().addScaledVector(m2, W), P5], 0, D);
	}
	const glass = new Geo();
	prism(glass, f, Wc.map((p) => p.clone().lerp(f.cen, 0.012)), GLASS0, GLASS1);
	return { concrete: gb.build(), glass: glass.build() };
}
function arcBox(r0: number, r1: number, y0: number, y1: number, aS: number, aE: number, n: number) {
	const gb = new Geo(), P = (r: number, y: number, a: number) => V3(r * Math.cos(a), y, r * Math.sin(a));
	for (let s = 0; s < n; s++) {
		const a = aS + ((aE - aS) * s) / n, b = aS + ((aE - aS) * (s + 1)) / n;
		gb.quad(P(r1, y0, a), P(r1, y0, b), P(r1, y1, b), P(r1, y1, a));
		gb.quad(P(r0, y1, a), P(r0, y1, b), P(r0, y0, b), P(r0, y0, a));
		gb.quad(P(r0, y1, a), P(r1, y1, a), P(r1, y1, b), P(r0, y1, b));
	}
	gb.quad(P(r0, y0, aS), P(r1, y0, aS), P(r1, y1, aS), P(r0, y1, aS));
	gb.quad(P(r0, y0, aE), P(r0, y1, aE), P(r1, y1, aE), P(r1, y0, aE));
	return gb.build();
}

/* ---------------- the camera's path ---------------- */
const CAM: [number, number[], number[]][] = [
	[0.0, [128, 62, -96], [0, 14, 0]],
	[1.6, [128, 62, -96], [0, 14, 0]],
	[4.0, [63, 9.5, -13], [49.8, 3.4, 0]],
	[5.0, [57.8, 5.9, -8], [49.8, 3.6, 0]],
	[8.0, [56.8, 5.3, -6.8], [49.8, 3.6, 0]],
	[9.2, [54.3, 5.3, -3.9], [49.8, 3.9, -0.3]],
	[14.3, [53.9, 4.7, -3.0], [49.8, 3.8, -0.3]],
	[15.6, [55.8, 5.4, 4.6], [49.9, 3.0, 0.2]],
	[18.0, [55.3, 5.0, 4.0], [49.9, 3.0, 0.2]],
	[19.2, [61, 7.5, 9.5], [49.8, 2.7, 0]],
	[23.5, [60.5, 6.2, -9.5], [49.8, 2.7, 0]]
];
function camAt(t: number) {
	let i = 0;
	while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
	const [t0, p0, q0] = CAM[i], [t1, p1, q1] = CAM[i + 1];
	const s = smooth(t0, t1, t);
	return { pos: V3(p0[0], p0[1], p0[2]).lerp(V3(p1[0], p1[1], p1[2]), s), tgt: V3(q0[0], q0[1], q0[2]).lerp(V3(q1[0], q1[1], q1[2]), s) };
}
export const stepAt = (t: number) => { let s = 0; STEPS.forEach((st, i) => { if (t >= st.t) s = i; }); return s; };

export type JointState = { t: number; step: number; playing: boolean; auto: boolean };
export type Joint = {
	toggle(): void; restart(): void; goto(step: number): void; scrub(t: number): void;
	setXray(on: boolean): void; follow(): void; dispose(): void;
};

/** Mounts the scene into `el` (its canvas and its labels), playing from the start unless motion is to be reduced. */
export function mountJoint(el: HTMLElement, onTick: (s: JointState) => void): Joint {
	const low = lowPower();
	const renderer = createRenderer({ container: el, alpha: true, toneMapping: 'aces', exposure: 0.88, shadows: 'soft', clipping: true, maxPixelRatio: low ? 1.5 : 2 });
	renderer.setClearColor(0x000000, 0);
	renderer.domElement.classList.add('cj-canvas');
	const labels = new CSS2DRenderer();
	labels.domElement.className = 'cj-labels';
	el.appendChild(labels.domElement);

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(COL.fog, 140, 700);
	const pmrem = new THREE.PMREMGenerator(renderer);
	const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 2500);
	const controls = createControls(camera, renderer.domElement, { dampingFactor: 0.09, minDistance: 1.5, maxDistance: 420, maxPolarAngle: Math.PI / 2 - 0.03 });

	scene.add(new THREE.HemisphereLight(0xeef0e6, 0x8f9874, 0.6));
	const sun = new THREE.DirectionalLight(0xfff0d8, 2.9);
	sun.position.set(82, 46, -30); sun.target.position.set(50, 2, 0);
	sun.castShadow = true; sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
	Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 160 });
	sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
	scene.add(sun, sun.target);

	/* materials */
	const ds = THREE.DoubleSide;
	const matCer = new THREE.MeshStandardMaterial({ color: COL.ceramic, roughness: 0.86, metalness: 0, side: ds, transparent: true, envMapIntensity: 0.45 });
	const matNew = matCer.clone(); matNew.color.set(COL.fresh);
	const matPlug = matCer.clone(); matPlug.color.set(COL.cap);
	const matGlass = new THREE.MeshStandardMaterial({ color: COL.glass, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.32, side: ds, depthWrite: false, envMapIntensity: 1.4 });
	const matKey = new THREE.MeshStandardMaterial({ color: COL.basalt, roughness: 0.42, metalness: 0.15, side: ds, transparent: true, envMapIntensity: 0.7 });
	const matBeam = new THREE.MeshStandardMaterial({ color: COL.beam, roughness: 0.92, side: ds, envMapIntensity: 0.4 });
	const matCable = new THREE.MeshStandardMaterial({ color: COL.cable, roughness: 0.4, metalness: 0.3, emissive: COL.cable, emissiveIntensity: 0 });
	const matPerson = new THREE.MeshStandardMaterial({ color: COL.person, roughness: 0.7 });
	const lineMat = new THREE.LineBasicMaterial({ color: COL.line, transparent: true, opacity: 0.42 });
	const lineNew = new THREE.LineBasicMaterial({ color: COL.lineFresh, transparent: true, opacity: 0.95 });
	const matGround = new THREE.MeshStandardMaterial({ color: COL.ground, roughness: 1 });
	const matFloor = new THREE.MeshStandardMaterial({ color: COL.floor, roughness: 0.95 });

	/* the cassettes */
	const frames = TRIS.map(makeFrame);
	let newMesh!: THREE.Mesh, newFrame!: Frame;
	frames.forEach((f) => {
		const g = buildCassette(f);
		const mesh = new THREE.Mesh(g.concrete, f.fresh ? matNew : matCer);
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.add(new THREE.Mesh(g.glass, matGlass));
		mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g.concrete, 25), f.fresh ? lineNew : lineMat));
		scene.add(mesh);
		if (f.fresh) { newMesh = mesh; newFrame = f; }
	});
	const newOut = newFrame.cen.clone().normalize(); // it arrives along the ray from the dome's centre

	/* the joints and their keys */
	const edgeMap = new Map<string, { ci: number; ei: number }[]>();
	frames.forEach((f, ci) => f.edges.forEach((ed, ei) => {
		const k = [ed.ia, ed.ib].sort().join('|');
		if (!edgeMap.has(k)) edgeMap.set(k, []);
		edgeMap.get(k)!.push({ ci, ei });
	}));
	const keySegments = (f: Frame, ed: Edge) => {
		const span = ed.len - 2 * C, n = Math.round(span / KEY_PITCH), pitch = span / n, seg = pitch - 0.04;
		return Array.from({ length: n }, (_, s) => {
			const uc = C + pitch * (s + 0.5), gb = new Geo();
			extrude(gb, f.F, ed.a, ed.e, ed.m, uc - seg / 2, uc + seg / 2, KEY);
			return { geo: gb.build(), uc };
		});
	};
	const animKeys: { mesh: THREE.Mesh; uFinal: number; uEntry: number; e: V; nrm: V; t0: number }[] = [];
	let edgeDelay = 0;
	for (const [, list] of edgeMap) {
		if (list.length < 2) continue;
		const own = list.find((x) => frames[x.ci].fresh) ?? list[0];
		const f = frames[own.ci], ed = f.edges[own.ei];
		const segs = keySegments(f, ed);
		if (!f.fresh) { segs.forEach((s) => scene.add(new THREE.Mesh(s.geo, matKey))); continue; }
		// the bottom joint is fed from its left node; the two sides from the open top node, the next row not yet there
		const ends = [ed.ia, ed.ib], entry = ends.includes('1:-1') && ends.includes('1:0') ? '1:-1' : '2:0';
		const atStart = ed.ia === entry;
		const uEntry = atStart ? 0 : ed.len, nrm = (atStart ? ed.a : ed.b).clone().normalize();
		segs.sort((p, q) => Math.abs(q.uc - uEntry) - Math.abs(p.uc - uEntry));
		const delay = edgeDelay; edgeDelay += 0.2;
		segs.forEach((s, j) => {
			const mesh = new THREE.Mesh(s.geo, matKey); mesh.castShadow = true; scene.add(mesh);
			animKeys.push({ mesh, uFinal: s.uc, uEntry, e: ed.e.clone(), nrm, t0: T.keys + 0.5 + delay + j * 0.45 });
		});
	}

	/* a cap on each lowest-ring node that six cassettes surround */
	const plugs = ['1:-2', '1:-1', '1:0', '1:1'].map((id, idx) => {
		const N = nodeOf(id), nrm = N.clone().normalize();
		const pts: V[] = [];
		frames.forEach((f) => { const i = f.ids.indexOf(id); if (i >= 0) { const [P1, P5] = cornerPoints(f, i); pts.push(P1, P5); } });
		const uniq: V[] = [];
		pts.forEach((p) => { if (!uniq.some((q) => q.distanceTo(p) < 1e-3)) uniq.push(p); });
		const t1 = V3(0, 1, 0).cross(nrm).normalize(), t2 = nrm.clone().cross(t1);
		const ang = (p: V) => { const d = p.clone().sub(N); return Math.atan2(d.dot(t2), d.dot(t1)); };
		uniq.sort((p, q) => ang(p) - ang(q));
		const G = (p: V, r: number) => p.clone().multiplyScalar(1 - r / p.length());
		const gb = new Geo();
		convexPrism(gb, uniq, 0, D, G);
		convexPrism(gb, uniq.map((p) => N.clone().add(p.clone().sub(N).multiplyScalar(1.28))), -0.035, 0, G);
		const mesh = new THREE.Mesh(gb.build(), matPlug);
		mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
		return { mesh, nrm, t0: T.caps + 0.5 + idx * 0.35 };
	});

	/* the ring cable, through the keys of the lowest ring's joints */
	const cablePath = new THREE.CurvePath<THREE.Vector3>();
	const cablePts = Array.from({ length: 6 }, (_, j) => nodePos(1, j - 3).multiplyScalar(1 - RC / R));
	for (let i = 0; i < cablePts.length - 1; i++) cablePath.add(new THREE.LineCurve3(cablePts[i], cablePts[i + 1]));
	const cableGeo = new THREE.TubeGeometry(cablePath, 320, 0.03, 10, false);
	const cableCount = cableGeo.index!.count;
	const cable = new THREE.Mesh(cableGeo, matCable);
	scene.add(cable);

	/* the ring beam, the ground, the floor, someone for scale, the crane's rope */
	const beam = new THREE.Mesh(arcBox(R - 0.85, R + 0.25, -0.9, 0, -3.8 * dA, 3.8 * dA, 48), matBeam);
	beam.castShadow = beam.receiveShadow = true; scene.add(beam);
	const ground = new THREE.Mesh(new THREE.CircleGeometry(700, 72), matGround);
	ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);
	const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.85, 96), matFloor);
	floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05; floor.receiveShadow = true; scene.add(floor);
	const person = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.05, 4, 12), matPerson); body.position.y = 0.725;
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), matPerson); head.position.y = 1.62;
	body.castShadow = head.castShadow = true;
	person.add(body, head); person.position.set(53.4, -0.3, 4.4); scene.add(person);
	const ropeGeo = new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 1, 0)]);
	const ropeMat = new THREE.LineBasicMaterial({ color: COL.rope, transparent: true });
	const rope = new THREE.Line(ropeGeo, ropeMat); scene.add(rope);
	const ropeTop = nodeOf('2:0');

	/* the whole dome, for the overview */
	const domeLineMat = new THREE.LineBasicMaterial({ color: COL.domeLine, transparent: true, opacity: 0.4, clippingPlanes: [new THREE.Plane(V3(0, 1, 0), -0.2)] });
	const domeLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R, 17), 1), domeLineMat);
	scene.add(domeLines);
	const skinMat = new THREE.MeshBasicMaterial({ color: COL.skin, transparent: true, opacity: 0.08, side: ds, depthWrite: false });
	const skin = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), skinMat);
	scene.add(skin);
	const PATCH = V3(49.8, 3, 0);

	/* labels, each shown in its window of time */
	const shown: { o: CSS2DObject; a: number; b: number }[] = [];
	const label = (text: string, pos: V, a: number, b: number, hot = false, parent: THREE.Object3D = scene) => {
		const div = document.createElement('div'); div.className = 'cj-label' + (hot ? ' hot' : '');
		const span = document.createElement('span'); span.textContent = text; div.appendChild(span);
		const o = new CSS2DObject(div); o.position.copy(pos); parent.add(o);
		shown.push({ o, a, b });
	};
	const out = (id: string, d: number) => { const p = nodeOf(id); return p.clone().addScaledVector(p.clone().normalize(), d); };
	label('Ø 100 m · R 50 m', V3(0, 53.5, 0), 0, 3.4);
	label('The lowest two rows', V3(50.6, 7.6, 0), 0.4, 3.8, true);
	label(`New cassette · 3.4 m · ≈ ${FACTS.mass} t`, newFrame.cen.clone().addScaledVector(newFrame.n, 0.5), T.seat + 0.3, T.keys, true, newMesh);
	label('Ring beam', V3(50.4, -0.45, -3.6), T.seat + 0.6, T.keys);
	label('1.75 m', V3(53.4, 2.05, 4.4), T.seat, T.cable);
	label('Node pocket', out('1:-1', 0.25), T.keys + 0.2, T.keys + 3.2, true);
	label('Open top node', out('2:0', 0.3), T.keys + 0.2, T.keys + 3.2);
	label('Basalt key segments', nodeOf('1:-1').lerp(nodeOf('1:0'), 0.5).addScaledVector(V3(1, 0, 0), 0.15), T.keys + 3.4, T.caps, true);
	label('Node cap', out('1:0', 0.3), T.caps + 0.5, T.cable, true);
	label('Ring cable, tensioned', out('1:1', 0.3), T.cable + 1.2, T.end + 1, true);

	/* the state at time t */
	let xrayManual = false;
	const apply = (t: number) => {
		const seat = easeOutCubic(clamp01((t - (T.seat + 0.5)) / 3.0));
		newMesh.position.copy(newOut).multiplyScalar(3.2 * (1 - seat));
		const top = ropeTop.clone().add(newMesh.position), rp = ropeGeo.attributes.position as THREE.BufferAttribute;
		rp.setXYZ(0, top.x, top.y, top.z); rp.setXYZ(1, top.x, top.y + 24, top.z); rp.needsUpdate = true;
		ropeMat.opacity = 1 - smooth(T.seat + 3.6, T.seat + 4.2, t);
		rope.visible = ropeMat.opacity > 0.01;

		for (const k of animKeys) {
			const tt = t - k.t0;
			k.mesh.visible = tt >= 0;
			if (tt < 0) continue;
			const drop = easeOutCubic(clamp01(tt / 0.5));
			const dur = Math.max(0.2, Math.abs(k.uFinal - k.uEntry) / 2.0);
			const u = k.uEntry + (k.uFinal - k.uEntry) * (tt < 0.5 ? 0 : easeOut(clamp01((tt - 0.5) / dur)));
			k.mesh.position.copy(k.e).multiplyScalar(u - k.uFinal).addScaledVector(k.nrm, 0.9 * (1 - drop));
		}
		for (const p of plugs) {
			const tt = t - p.t0;
			p.mesh.visible = tt >= 0;
			if (tt >= 0) p.mesh.position.copy(p.nrm).multiplyScalar(1.2 * (1 - easeOutCubic(clamp01(tt / 0.7))));
		}
		const grow = clamp01((t - (T.cable + 0.6)) / 2.8);
		cable.visible = grow > 0;
		cableGeo.setDrawRange(0, Math.floor((grow * cableCount) / 6) * 6);
		matCable.emissiveIntensity = grow > 0 ? 0.35 + 0.55 * win(t, T.cable + 3.4, T.cable + 4.8, 0.45) : 0;

		const xr = Math.max(xrayManual ? 1 : 0, win(t, T.keys + 0.3, T.caps - 0.1, 0.5), win(t, T.cable + 0.2, T.end + 9, 0.5));
		for (const m of [matCer, matNew, matPlug]) { m.opacity = 1 - 0.74 * xr; m.depthWrite = xr < 0.02; }
		lineMat.opacity = 0.42 * (1 - 0.45 * xr);
		matGlass.opacity = 0.32 * (1 - 0.65 * xr);
		const kx = win(t, T.cable + 0.2, T.end + 9, 0.5);
		matKey.opacity = 1 - 0.5 * kx; matKey.depthWrite = kx < 0.02;
		for (const l of shown) l.o.visible = t >= l.a && t <= l.b;
	};

	/* size: about 54° across, so a tall screen sees the same patch as a wide one */
	const fitter = fitTo(renderer, el, {
		camera,
		fit: (cam, w, h) => {
			cam.aspect = w / h;
			cam.fov = Math.min(78, Math.max(36, (2 * Math.atan(Math.tan((54 * Math.PI) / 360) / cam.aspect) * 180) / Math.PI));
			cam.updateProjectionMatrix();
		},
		onResize: (w, h) => labels.setSize(w, h)
	});

	/* the clock */
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let t = reduce ? T.caps + 3.2 : 0, playing = !reduce, auto = true, last = performance.now(), raf = 0;
	const tell = () => onTick({ t, step: stepAt(t), playing, auto });
	const onStart = () => { auto = false; tell(); };
	controls.addEventListener('start', onStart);
	const loop = (now: number) => {
		const dt = Math.min(0.05, (now - last) / 1000); last = now;
		if (playing) { t += dt; if (t >= T.end) { t = T.end; playing = false; } }
		apply(t);
		if (auto) { const c = camAt(t); camera.position.copy(c.pos); controls.target.copy(c.tgt); }
		controls.update();
		const far = smooth(24, 75, camera.position.distanceTo(PATCH));
		domeLineMat.opacity = 0.4 * far; skinMat.opacity = 0.08 * far;
		domeLines.visible = skin.visible = far > 0.01;
		renderer.render(scene, camera);
		labels.render(scene, camera);
		tell();
		raf = requestAnimationFrame(loop);
	};
	raf = requestAnimationFrame(loop);

	return {
		toggle() { if (!playing && t >= T.end) { t = 0; auto = true; } playing = !playing; tell(); },
		restart() { t = 0; playing = true; auto = true; tell(); },
		goto(step) { t = STEPS[step].t; playing = true; auto = true; tell(); },
		scrub(at) { t = Math.min(T.end, Math.max(0, at)); playing = false; tell(); },
		setXray(on) { xrayManual = on; },
		follow() { auto = true; tell(); },
		dispose() {
			cancelAnimationFrame(raf);
			controls.removeEventListener('start', onStart);
			controls.dispose();
			fitter.dispose();
			disposeObject(scene);
			envTex.dispose(); pmrem.dispose();
			labels.domElement.remove();
			disposeRenderer(renderer);
		}
	};
}
