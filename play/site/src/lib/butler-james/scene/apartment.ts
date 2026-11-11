// THE SHOW'S PLACEHOLDER WORLD (intent 42a96129): a five-room apartment made of boxes, seen as a cutaway, standing in
// until a real demo property exists. It tells the offer as the page scrolls (../Show.svelte gives it the scroll, 0..1):
//
//   0     the finished apartment, slowly turning
//   1/3   sunk into its floor plan, seen from above: what the customer sends
//   2/3   the walls risen from the plan, the rooms filled: what we build
//   1     the camera down in the living room at eye height, the walls at their full height: what a buyer walks
//
// One turns it by dragging (mouse or one finger; a finger's up and down stays the page's scroll), lights a room by
// tapping it, and switches day and evening. three.js, loaded lazily, drawn by play's one renderer (the render core,
// $lib/content/render/core.js: WebGPU, or its WebGL 2 backend), the page's one tie to play. No world of play/SPEC.md
// §4.16: its own budget, held by the intent's check c8 (at most 30,000 triangles and 60 draws a frame), so everything
// of one material is welded into one mesh. It draws only when something changed. What a check reads is on the canvas:
// data-frames, data-tris, data-draws (the most of any frame), data-first-ms, data-room.

import {
	BoxGeometry, BufferGeometry, Color, CylinderGeometry, DirectionalLight, HemisphereLight, IcosahedronGeometry, Mesh,
	MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Raycaster, Scene, Vector2, Vector3
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { disposeRenderer, makeRenderer } from '$lib/content/render/core.js';
import { SCENE } from '../brand';

/** a wall's full height, how much of it stands in the cutaway, and its thickness */
const H = 2.6, CUT = 1.35 / H, T = 0.14;

export type RoomId = 'living' | 'kitchen' | 'bedroom' | 'bath' | 'hall';
/** the rooms, in metres: x from west to east, z from north to south */
const ROOMS: { id: RoomId; x0: number; x1: number; z0: number; z1: number; floor: 'floor' | 'tile' }[] = [
	{ id: 'living', x0: -5, x1: 1, z0: -3.5, z1: 0.5, floor: 'floor' },
	{ id: 'kitchen', x0: 1, x1: 5, z0: -3.5, z1: 0.5, floor: 'tile' },
	{ id: 'bedroom', x0: -5, x1: -0.5, z0: 0.5, z1: 3.5, floor: 'floor' },
	{ id: 'bath', x0: -0.5, x1: 2, z0: 0.5, z1: 3.5, floor: 'tile' },
	{ id: 'hall', x0: 2, x1: 5, z0: 0.5, z1: 3.5, floor: 'floor' }
];
/** the walls along their middle lines, [x0, z0, x1, z1, height]: doors and openings are the gaps, windows the low ones */
const SILL = 0.9;
const WALLS: [number, number, number, number, number][] = [
	// north, with the living room's and the kitchen's windows
	[-5, -3.5, -4, -3.5, H], [-4, -3.5, -1.5, -3.5, SILL], [-1.5, -3.5, 2.2, -3.5, H], [2.2, -3.5, 4, -3.5, SILL], [4, -3.5, 5, -3.5, H],
	// south, with the bedroom's window
	[-5, 3.5, -3.8, 3.5, H], [-3.8, 3.5, -1.8, 3.5, SILL], [-1.8, 3.5, 5, 3.5, H],
	// west; east, with the entrance
	[-5, -3.5, -5, 3.5, H], [5, -3.5, 5, 1.5, H], [5, 2.4, 5, 3.5, H],
	// the long inner wall, with the doors to the bedroom, the bath and the hall
	[-5, 0.5, -3.3, 0.5, H], [-2.4, 0.5, 0.1, 0.5, H], [0.9, 0.5, 3, 0.5, H], [3.9, 0.5, 5, 0.5, H],
	// living and kitchen, open to each other; bedroom, bath, hall
	[1, -3.5, 1, -2.2, H], [1, -0.4, 1, 0.5, H], [-0.5, 0.5, -0.5, 3.5, H], [2, 0.5, 2, 3.5, H]
];

type Part = 'wood' | 'fabric' | 'soft' | 'leaf' | 'stone';
const ROUGH: Record<Part | 'wall' | 'floor' | 'tile', number> = { wall: 0.95, floor: 0.7, tile: 0.45, wood: 0.6, fabric: 0.9, soft: 1, leaf: 0.8, stone: 0.5 };

const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function build() {
	const bins = {} as Record<Part, BufferGeometry[]>;
	const flat = (g: BufferGeometry) => (g.index ? g.toNonIndexed() : g);
	const put = (part: Part, g: BufferGeometry, x: number, y: number, z: number) => (bins[part] ??= []).push(flat(g.translate(x, y, z)));
	/** a box by its size and the middle of its foot */
	const box = (part: Part, w: number, h: number, d: number, x: number, y: number, z: number) => put(part, new BoxGeometry(w, h, d), x, y + h / 2, z);

	// ---- living: sofa, rug, low table, a board under the window, armchair, plant
	box('soft', 3.2, 0.02, 2.2, -2.4, 0, -1.6);
	box('fabric', 2.4, 0.42, 0.95, -2.4, 0, -0.25);
	box('fabric', 2.4, 0.38, 0.22, -2.4, 0.42, 0.1);
	box('fabric', 0.22, 0.6, 0.95, -3.7, 0, -0.25);
	box('fabric', 0.22, 0.6, 0.95, -1.1, 0, -0.25);
	box('soft', 0.5, 0.14, 0.4, -3.1, 0.42, -0.3);
	box('soft', 0.5, 0.14, 0.4, -1.7, 0.42, -0.3);
	box('wood', 1.2, 0.06, 0.65, -2.4, 0.34, -1.6);
	for (const [x, z] of [[-2.9, -1.85], [-1.9, -1.85], [-2.9, -1.35], [-1.9, -1.35]]) box('wood', 0.05, 0.34, 0.05, x, 0, z);
	box('wood', 2.2, 0.45, 0.4, -2.75, 0, -3.2);
	box('stone', 1.3, 0.75, 0.05, -2.75, 0.5, -3.2);
	box('fabric', 0.85, 0.4, 0.85, -4.3, 0, -1.7);
	box('fabric', 0.2, 0.5, 0.85, -4.65, 0.4, -1.7);
	put('stone', new CylinderGeometry(0.22, 0.17, 0.42, 12), 0.35, 0.21, -3);
	for (const [dx, dy, dz, r] of [[0, 0.95, 0, 0.45], [0.2, 1.3, 0.1, 0.32], [-0.2, 1.25, -0.05, 0.3]]) put('leaf', new IcosahedronGeometry(r, 1), 0.35 + dx, dy, -3 + dz);
	// its floor lamp: the pole here, the shade glows on its own
	put('stone', new CylinderGeometry(0.02, 0.02, 1.5, 8), -0.6, 0.75, 0.05);

	// ---- kitchen: an L of counters, a table and four chairs
	box('wood', 3.6, 0.9, 0.6, 3.1, 0, -3.15);
	box('stone', 3.7, 0.04, 0.66, 3.1, 0.9, -3.15);
	box('wood', 0.6, 0.9, 1.6, 4.65, 0, -2.05);
	box('stone', 0.66, 0.04, 1.66, 4.65, 0.9, -2.05);
	box('wood', 1.5, 0.05, 0.85, 2.9, 0.72, -0.9);
	for (const [x, z] of [[2.25, -1.25], [3.55, -1.25], [2.25, -0.55], [3.55, -0.55]]) box('wood', 0.06, 0.72, 0.06, x, 0, z);
	for (const [x, z, back] of [[2.55, -1.6, -1], [3.25, -1.6, -1], [2.55, -0.2, 1], [3.25, -0.2, 1]]) {
		box('stone', 0.4, 0.05, 0.4, x, 0.44, z);
		box('stone', 0.4, 0.4, 0.04, x, 0.49, z + back * 0.18);
	}

	// ---- bedroom: bed, two bedside boards, a wardrobe
	box('wood', 1.9, 0.3, 2.1, -2.8, 0, 2.3);
	box('soft', 1.8, 0.2, 2.0, -2.8, 0.3, 2.3);
	box('fabric', 1.8, 0.1, 1.2, -2.8, 0.5, 1.95);
	box('soft', 0.7, 0.12, 0.4, -3.25, 0.5, 3.0);
	box('soft', 0.7, 0.12, 0.4, -2.35, 0.5, 3.0);
	box('wood', 1.9, 0.9, 0.08, -2.8, 0.3, 3.36);
	box('wood', 0.45, 0.45, 0.4, -4.1, 0, 3.15);
	box('wood', 0.45, 0.45, 0.4, -1.5, 0, 3.15);
	box('wood', 0.6, 1.25, 1.8, -4.65, 0, 1.6);

	// ---- bath: tub, basin, toilet
	box('soft', 0.8, 0.55, 1.8, 1.5, 0, 2.5);
	box('stone', 0.66, 0.04, 1.66, 1.5, 0.5, 2.5);
	box('wood', 0.9, 0.8, 0.5, 0.15, 0, 3.2);
	box('soft', 0.94, 0.06, 0.54, 0.15, 0.8, 3.2);
	box('soft', 0.42, 0.4, 0.6, 0.1, 0, 1.5);
	box('soft', 0.42, 0.5, 0.18, 0.1, 0.4, 1.25);

	// ---- hall: a bench, a tall board, a mat at the door
	box('wood', 1.4, 0.42, 0.4, 3.2, 0, 3.2);
	box('fabric', 1.3, 0.06, 0.36, 3.2, 0.42, 3.2);
	box('wood', 0.4, 1.2, 0.9, 2.3, 0, 1.3);
	box('fabric', 0.6, 0.02, 0.9, 4.5, 0, 1.95);

	const things = (Object.keys(bins) as Part[]).map((part) => {
		const m = new Mesh(mergeGeometries(bins[part]), new MeshStandardMaterial({ color: new Color(SCENE[part]), roughness: ROUGH[part] }));
		m.castShadow = m.receiveShadow = true;
		return m;
	});

	const wallBits = WALLS.map(([x0, z0, x1, z1, h]) => {
		const along = Math.abs(x1 - x0) + Math.abs(z1 - z0) + T;
		const g = x0 === x1 ? new BoxGeometry(T, h, along) : new BoxGeometry(along, h, T);
		return g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2).toNonIndexed();
	});
	const walls = new Mesh(mergeGeometries(wallBits), new MeshStandardMaterial({ color: new Color(SCENE.wall), roughness: ROUGH.wall, emissive: new Color(SCENE.accent), emissiveIntensity: 0 }));
	walls.castShadow = walls.receiveShadow = true;

	// each room's floor its own, so a room can light up
	const floors = ROOMS.map((r) => {
		const g = new BoxGeometry(r.x1 - r.x0, 0.1, r.z1 - r.z0).translate((r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2);
		const m = new Mesh(g, new MeshStandardMaterial({ color: new Color(SCENE[r.floor]), roughness: ROUGH[r.floor], emissive: new Color(SCENE.accent), emissiveIntensity: 0 }));
		m.receiveShadow = true;
		m.userData.room = r.id;
		return m;
	});

	// what glows and takes no light: the two lamps' shades, one draw
	const shades = [new CylinderGeometry(0.16, 0.22, 0.3, 16).translate(-0.6, 1.6, 0.05), new CylinderGeometry(0.12, 0.16, 0.22, 16).translate(-4.1, 0.6, 3.15)].map((g) => g.toNonIndexed());
	const glow = new Mesh(mergeGeometries(shades), new MeshBasicMaterial({ color: new Color(SCENE.lamp) }));
	return { things, walls, floors, glow };
}

/** the camera's four stations, [position, what it looks at]: turning above, the plan from above, the build, inside */
const STATIONS: [Vector3, Vector3][] = [
	[new Vector3(8.5, 8.5, 10.5), new Vector3(0, 0.4, 0)],
	[new Vector3(0, 17, 3.2), new Vector3(0, 0, 0)],
	[new Vector3(-9, 7.5, 9.5), new Vector3(0, 0.6, 0)],
	[new Vector3(0.45, 1.55, -2.7), new Vector3(-3.4, 0.75, -0.7)]
];

export type Apartment = {
	/** in view or not: out of view nothing is drawn */
	setVisible(v: boolean): void;
	/** how far the show is scrolled, 0..1 */
	setScroll(p: number): void;
	/** day or evening */
	setEvening(on: boolean): void;
	dispose(): void;
};
export type Options = {
	/** no motion of its own (prefers-reduced-motion): it follows the scroll and the hand, at once, and nothing else */
	still: boolean;
	/** when the scene began to load (performance.now) */
	started: number;
	/** the lit room and where its middle is on the canvas, in CSS pixels; null when none is lit */
	onRoom(room: { id: RoomId; x: number; y: number } | null): void;
};

/**
 * the apartment drawn into `canvas`, sized by its box. Rejects where the browser gives no WebGPU and no WebGL 2: the
 * caller keeps its still.
 */
export async function mount(canvas: HTMLCanvasElement, opts: Options): Promise<Apartment> {
	const renderer = await makeRenderer({ canvas, alpha: true, power: 'low-power', toneMapping: 'neutral', shadows: true });
	renderer.setClearColor(new Color(SCENE.evening.ground), 0);
	// the sun's shadows change only when the apartment does: drawn when asked
	// (the core keeps three's classic shadow switch on its renderer; three's own types do not name it)
	const shadows = renderer.shadowMap as unknown as { autoUpdate: boolean; needsUpdate: boolean };
	shadows.autoUpdate = false;
	shadows.needsUpdate = true;

	const scene = new Scene();
	const { things, walls, floors, glow } = build();
	scene.add(...things, walls, ...floors, glow);
	const hemi = new HemisphereLight(new Color(SCENE.day.sky), new Color(SCENE.day.ground), 2.1);
	const sun = new DirectionalLight(new Color(SCENE.day.sun), 3);
	sun.position.set(-7, 12, -6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
	sun.shadow.bias = -0.002;
	const lamps = [new PointLight(new Color(SCENE.lamp), 0, 7, 2), new PointLight(new Color(SCENE.lamp), 0, 5, 2)];
	lamps[0].position.set(-0.6, 1.5, 0.05);
	lamps[1].position.set(-4.1, 0.8, 3.15);
	scene.add(hemi, sun, sun.target, ...lamps);
	const day = { sun: new Color(SCENE.day.sun), sky: new Color(SCENE.day.sky), ground: new Color(SCENE.day.ground) };
	const eve = { sun: new Color(SCENE.evening.sun), sky: new Color(SCENE.evening.sky), ground: new Color(SCENE.evening.ground) };
	const wallColour = new Color(SCENE.wall), accent = new Color(SCENE.accent);

	const camera = new PerspectiveCamera(38, 1, 0.05, 80);
	const pos = new Vector3(), look = new Vector3(), tmp = new Vector3();
	let w = 1, h = 1;

	// ---- the state: where it is, and where it is going
	let goal = 0, p = 0; // the scroll
	let evening = 0, eveningGoal = 0;
	let yaw = 0, spin = 0; // the hand's turn, and its own slow one
	let lit: RoomId | null = null;
	const litNow = new Map<RoomId, number>(ROOMS.map((r) => [r.id, 0]));
	let built = -1;
	let down: { x: number; t: number; moved: number } | null = null;

	let frames = 0, mostTris = 0, mostDraws = 0;
	function draw() {
		// ---- the apartment, by the scroll: down into its plan, and up again; its walls to their full height inside
		const up = p < 0.33 ? 1 - smooth(0.04, 0.26, p) : smooth(0.4, 0.64, p);
		const inside = smooth(0.74, 0.98, p);
		const wallsUp = Math.max(0.006, up * mix(CUT, 1, inside));
		const thingsUp = p < 0.33 ? 1 - smooth(0.02, 0.18, p) : smooth(0.52, 0.7, p);
		const key = wallsUp * 1000 + thingsUp;
		if (key !== built) {
			built = key;
			walls.scale.y = wallsUp;
			// as a plan the walls are lines of the accent
			const plan = 1 - smooth(0, 0.5, up);
			(walls.material as MeshStandardMaterial).color.copy(wallColour).lerp(accent, plan);
			(walls.material as MeshStandardMaterial).emissiveIntensity = plan * 0.9;
			for (const m of things) {
				m.visible = thingsUp > 0.004;
				m.scale.y = Math.max(0.004, thingsUp);
			}
			glow.visible = thingsUp > 0.6;
			shadows.needsUpdate = true;
		}
		// ---- the light, by day and in the evening
		hemi.color.copy(day.sky).lerp(eve.sky, evening);
		hemi.groundColor.copy(day.ground).lerp(eve.ground, evening);
		hemi.intensity = mix(2.1, 0.6, evening);
		sun.color.copy(day.sun).lerp(eve.sun, evening);
		sun.intensity = mix(3, 0.7, evening);
		lamps[0].intensity = evening * 9 * thingsUp;
		lamps[1].intensity = evening * 5 * thingsUp;
		for (const f of floors) (f.material as MeshStandardMaterial).emissiveIntensity = (litNow.get(f.userData.room) ?? 0) * 0.55;

		// ---- the camera, from station to station; a narrow screen stands further back, and the picture is set beside
		// the text (to the right on a wide screen, above it on a narrow one) until the camera goes inside
		const s = Math.min(2.999, p * 3), i = Math.floor(s), t = smooth(0, 1, s - i);
		pos.lerpVectors(STATIONS[i][0], STATIONS[i + 1][0], t);
		look.lerpVectors(STATIONS[i][1], STATIONS[i + 1][1], t);
		const narrow = w / h < 1;
		const back = mix(narrow ? Math.min(3, 1.2 / (w / h)) : 1.34, 1, inside);
		pos.sub(look).multiplyScalar(back);
		// its own slow turn at the top, the hand's turn everywhere: around the apartment outside, of the head inside
		const turn = yaw + spin * (1 - smooth(0, 0.12, p));
		pos.applyAxisAngle(tmp.set(0, 1, 0), turn * (1 - inside)).add(look);
		if (inside > 0) look.sub(pos).applyAxisAngle(tmp.set(0, 1, 0), turn * inside).add(pos);
		camera.position.copy(pos);
		camera.lookAt(look);
		camera.fov = mix(38, 68, inside);
		const aside = 1 - inside;
		if (narrow) camera.setViewOffset(w, h, 0, h * 0.25 * aside, w, h);
		else camera.setViewOffset(w, h, -w * 0.23 * aside, -h * 0.02 * aside, w, h);
		camera.updateProjectionMatrix();

		renderer.render(scene, camera);
		frames++;
		mostTris = Math.max(mostTris, renderer.info.render.triangles);
		mostDraws = Math.max(mostDraws, renderer.info.render.drawCalls);
		canvas.dataset.frames = String(frames);
		canvas.dataset.tris = String(mostTris);
		canvas.dataset.draws = String(mostDraws);
		if (frames === 1) canvas.dataset.firstMs = String(Math.round(performance.now() - opts.started));
		// the lit room's name, where its middle is drawn
		const room = lit && ROOMS.find((r) => r.id === lit);
		if (room) {
			tmp.set((room.x0 + room.x1) / 2, 0.2, (room.z0 + room.z1) / 2).project(camera);
			opts.onRoom({ id: room.id, x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h });
		} else opts.onRoom(null);
		canvas.dataset.room = lit ?? '';
	}

	let fitted = '';
	function fit() {
		const cw = canvas.clientWidth, ch = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
		// only a new size draws again (the observer also calls once as it starts)
		if (!cw || !ch || fitted === `${cw}x${ch}@${dpr}`) return;
		fitted = `${cw}x${ch}@${dpr}`;
		w = cw;
		h = ch;
		renderer.setPixelRatio(dpr);
		renderer.setSize(cw, ch, false);
		camera.aspect = cw / ch;
		draw();
	}
	const sized = new ResizeObserver(fit);
	sized.observe(canvas);

	// ---- the loop: only while in view, and only while something moves
	let visible = true, raf = 0, last = 0;
	/** whether anything is still on its way */
	function moving() {
		if (Math.abs(goal - p) > 0.0004 || Math.abs(eveningGoal - evening) > 0.002) return true;
		for (const r of ROOMS) if (Math.abs((r.id === lit ? 1 : 0) - litNow.get(r.id)!) > 0.01) return true;
		// its own slow turn, at the top of the show
		return p < 0.12;
	}
	function tick(now: number) {
		raf = 0;
		const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
		last = now;
		const ease = (rate: number) => 1 - Math.exp(-dt * rate);
		p += (goal - p) * ease(7);
		if (Math.abs(goal - p) <= 0.0004) p = goal;
		evening += (eveningGoal - evening) * ease(4);
		for (const r of ROOMS) litNow.set(r.id, mix(litNow.get(r.id)!, r.id === lit ? 1 : 0, ease(8)));
		if (!down) spin += dt * 0.12;
		draw();
		wake();
	}
	/** draw what changed: at once where motion is not welcome, else frame by frame until it has arrived */
	function wake(changed = false) {
		if (!visible || document.hidden || raf) return;
		if (opts.still) {
			if (!changed) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				p = goal;
				evening = eveningGoal;
				for (const r of ROOMS) litNow.set(r.id, r.id === lit ? 1 : 0);
				draw();
			});
		} else if (changed || moving()) raf = requestAnimationFrame(tick);
	}

	// ---- turning it, and lighting a room
	const ray = new Raycaster(), ndc = new Vector2();
	const onDown = (e: PointerEvent) => {
		if (!e.isPrimary) return;
		down = { x: e.clientX, t: performance.now(), moved: 0 };
		canvas.setPointerCapture?.(e.pointerId);
	};
	const onMove = (e: PointerEvent) => {
		if (!down || !e.isPrimary) return;
		const dx = e.clientX - down.x;
		down.moved += Math.abs(dx);
		down.x = e.clientX;
		yaw -= dx * 0.006;
		wake(true);
	};
	const onUp = (e: PointerEvent) => {
		if (!down || !e.isPrimary) return;
		const tap = down.moved < 8 && performance.now() - down.t < 450;
		down = null;
		if (tap) {
			const r = canvas.getBoundingClientRect();
			ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
			ray.setFromCamera(ndc, camera);
			const hit = ray.intersectObjects(floors, false)[0];
			const id = (hit?.object.userData.room as RoomId | undefined) ?? null;
			lit = id === lit ? null : id;
		}
		last = 0;
		wake(true);
	};
	const onCancel = () => (down = null);
	// a room named by the page (the cards of the photos): lit, as by a tap
	const onNamed = (e: Event) => {
		const id = (e as CustomEvent<RoomId>).detail;
		lit = id === lit ? null : id;
		last = 0;
		wake(true);
	};
	const onHidden = () => {
		last = 0;
		wake();
	};
	canvas.addEventListener('pointerdown', onDown);
	canvas.addEventListener('pointermove', onMove);
	canvas.addEventListener('pointerup', onUp);
	canvas.addEventListener('pointercancel', onCancel);
	canvas.addEventListener('bj-room', onNamed);
	document.addEventListener('visibilitychange', onHidden);

	fit();
	if (!frames) draw();
	wake();

	return {
		setVisible(v) {
			if (v === visible) return;
			visible = v;
			if (!v && raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
			last = 0;
			wake(v && opts.still && p !== goal);
		},
		setScroll(to) {
			const next = Math.min(1, Math.max(0, to));
			if (next === goal) return;
			goal = next;
			wake(true);
		},
		setEvening(on) {
			if (eveningGoal === (on ? 1 : 0)) return;
			eveningGoal = on ? 1 : 0;
			wake(true);
		},
		dispose() {
			if (raf) cancelAnimationFrame(raf);
			sized.disconnect();
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointercancel', onCancel);
			canvas.removeEventListener('bj-room', onNamed);
			document.removeEventListener('visibilitychange', onHidden);
			for (const m of [...things, walls, ...floors, glow]) {
				m.geometry.dispose();
				(m.material as MeshStandardMaterial).dispose();
			}
			disposeRenderer(renderer);
		}
	};
}
