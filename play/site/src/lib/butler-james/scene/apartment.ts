// THE BANNER'S PLACEHOLDER WORLD (intent 42a96129): a small apartment made of boxes, to stand in the hero until a real
// demo property exists. three.js, loaded lazily by ../Hero.svelte, drawn by play's one renderer (the render core,
// $lib/content/render/core.js: WebGPU, or its WebGL 2 backend), the page's one tie to play. No world of play/SPEC.md
// §4.16: its own budget, held by the intent's check c8 (at most 30,000 triangles and 60 draws a frame), so everything of one
// material is welded into one mesh (a draw each, and one more each in the sun's shadow pass).
//
// One looks around by dragging (mouse or one finger; a finger's up and down stays the page's scroll) and walks by
// tapping the floor. It draws only when something changed: on a drag, a walk, a resize, and, where motion is welcome,
// a slow sway while it is in view. What a check reads is on the canvas: data-frames, data-tris, data-draws.

import {
	BoxGeometry, BufferGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, HemisphereLight,
	IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Plane, PointLight, Raycaster,
	Scene, Vector2, Vector3
} from 'three';
import { disposeRenderer, makeRenderer } from '$lib/content/render/core.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE } from '../brand';

/** the room, in metres: x across, z from the window wall (−D) to the wall behind the visitor (+D), H high */
const W = 4.2, D = 3.2, H = 2.6, T = 0.12;
const EYE = 1.6;

type Part = keyof typeof PARTS;
const PARTS = {
	wall: { colour: SCENE.wall, roughness: 0.95 },
	floor: { colour: SCENE.floor, roughness: 0.7 },
	wood: { colour: SCENE.wood, roughness: 0.6 },
	fabric: { colour: SCENE.fabric, roughness: 0.9 },
	rug: { colour: SCENE.rug, roughness: 1 },
	brass: { colour: SCENE.brass, roughness: 0.35, metalness: 0.8 },
	leaf: { colour: SCENE.leaf, roughness: 0.8 },
	stone: { colour: SCENE.stone, roughness: 0.5 }
} as const;

/** the apartment's shapes, welded by material */
function build() {
	const bins = {} as Record<Part, BufferGeometry[]>;
	const put = (part: Part, g: BufferGeometry, x: number, y: number, z: number) => {
		g.translate(x, y, z);
		(bins[part] ??= []).push(g.index ? g.toNonIndexed() : g);
	};
	/** a box by its size and the middle of its foot */
	const box = (part: Part, w: number, h: number, d: number, x: number, y: number, z: number) => put(part, new BoxGeometry(w, h, d), x, y + h / 2, z);

	// the shell: floor, ceiling, three whole walls and the window wall around its opening
	box('floor', 2 * W, T, 2 * D, 0, -T, 0);
	box('wall', 2 * W, T, 2 * D, 0, H, 0);
	box('wall', T, H, 2 * D, -W - T / 2, 0, 0);
	box('wall', T, H, 2 * D, W + T / 2, 0, 0);
	box('wall', 2 * W, H, T, 0, 0, D + T / 2);
	const wx0 = -2.6, wx1 = 1.0, sill = 0.45, lintel = 2.25; // the window: wide, low-silled
	box('wall', wx0 + W, H, T, (wx0 - W) / 2, 0, -D - T / 2);
	box('wall', W - wx1, H, T, (W + wx1) / 2, 0, -D - T / 2);
	box('wall', wx1 - wx0, sill, T, (wx0 + wx1) / 2, 0, -D - T / 2);
	box('wall', wx1 - wx0, H - lintel, T, (wx0 + wx1) / 2, lintel, -D - T / 2);
	// its frame and two mullions, the sill a board
	for (const x of [wx0, wx0 + (wx1 - wx0) / 3, wx0 + (2 * (wx1 - wx0)) / 3, wx1]) box('wood', 0.05, lintel - sill, 0.06, x, sill, -D - T / 2);
	box('wood', wx1 - wx0 + 0.1, 0.04, 0.24, (wx0 + wx1) / 2, sill, -D + 0.02);
	// skirting along the walls
	box('wood', 2 * W, 0.08, 0.02, 0, 0, D - 0.01);
	box('wood', 0.02, 0.08, 2 * D, -W + 0.01, 0, 0);
	box('wood', 0.02, 0.08, 2 * D, W - 0.01, 0, 0);

	// the sitting corner under the window: rug, sofa, low table, lamp
	box('rug', 3.0, 0.02, 2.0, -1.2, 0, -1.0);
	box('fabric', 2.2, 0.42, 0.9, -1.4, 0, -2.3);
	box('fabric', 2.2, 0.4, 0.22, -1.4, 0.42, -2.64);
	box('fabric', 0.2, 0.6, 0.9, -2.6, 0, -2.3);
	box('fabric', 0.2, 0.6, 0.9, -0.2, 0, -2.3);
	box('rug', 0.5, 0.14, 0.4, -2.0, 0.42, -2.3);
	box('rug', 0.5, 0.14, 0.4, -0.8, 0.42, -2.3);
	box('wood', 1.1, 0.05, 0.6, -1.3, 0.36, -0.9);
	for (const [x, z] of [[-1.8, -1.15], [-0.8, -1.15], [-1.8, -0.65], [-0.8, -0.65]]) box('wood', 0.05, 0.36, 0.05, x, 0, z);
	box('brass', 0.3, 0.02, 0.2, -1.1, 0.41, -0.9);
	put('brass', new CylinderGeometry(0.015, 0.015, 1.5, 8), -3.3, 0.75, -2.4);
	put('brass', new CylinderGeometry(0.16, 0.16, 0.02, 16), -3.3, 0.01, -2.4);
	// the armchair, turned to the room
	box('fabric', 0.8, 0.4, 0.8, -3.2, 0, -0.6);
	box('fabric', 0.18, 0.5, 0.8, -3.6, 0.4, -0.6);

	// the dining place on the right: table, four chairs, a bowl
	box('wood', 1.6, 0.05, 0.9, 2.2, 0.72, -1.2);
	for (const [x, z] of [[1.5, -1.55], [2.9, -1.55], [1.5, -0.85], [2.9, -0.85]]) box('wood', 0.06, 0.72, 0.06, x, 0, z);
	for (const [x, z, back] of [[1.8, -1.95, -1], [2.6, -1.95, -1], [1.8, -0.45, 1], [2.6, -0.45, 1]]) {
		box('stone', 0.42, 0.05, 0.42, x, 0.44, z);
		box('stone', 0.42, 0.42, 0.04, x, 0.49, z + back * 0.19);
		for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box('stone', 0.03, 0.44, 0.03, x + dx, 0, z + dz);
	}
	put('brass', new CylinderGeometry(0.18, 0.1, 0.08, 16), 2.2, 0.81, -1.2);

	// the shelf on the right wall, with a few books, and a sideboard on the left
	box('wood', 0.3, 2.0, 1.6, W - 0.15, 0, 1.2);
	for (const y of [0.5, 1.0, 1.5]) box('wall', 0.26, 0.36, 1.48, W - 0.19, y, 1.2);
	for (const [y, z, n] of [[0.5, 0.7, 5], [1.0, 1.5, 4], [1.5, 0.9, 6]])
		for (let i = 0; i < n; i++) box(i % 3 ? 'fabric' : 'brass', 0.2, 0.24 + (i % 2) * 0.05, 0.045, W - 0.2, y, z + i * 0.055);
	box('wood', 0.45, 0.7, 1.8, -W + 0.225, 0, 1.4);
	box('stone', 0.5, 0.03, 1.86, -W + 0.25, 0.7, 1.4);
	// a picture over the sideboard: a brass frame, an ink field
	box('brass', 0.03, 0.9, 1.2, -W + 0.015, 1.25, 1.4);
	box('fabric', 0.035, 0.8, 1.1, -W + 0.02, 1.3, 1.4);

	// two plants: by the window and on the sideboard
	put('stone', new CylinderGeometry(0.2, 0.15, 0.4, 12), 1.6, 0.2, -2.7);
	for (const [dx, dy, dz, r] of [[0, 0.9, 0, 0.42], [0.2, 1.25, 0.1, 0.3], [-0.2, 1.2, -0.05, 0.28], [0.05, 1.5, 0, 0.22]])
		put('leaf', new IcosahedronGeometry(r, 1), 1.6 + dx, dy, -2.7 + dz);
	put('stone', new CylinderGeometry(0.1, 0.08, 0.18, 12), -W + 0.25, 0.82, 0.8);
	put('leaf', new IcosahedronGeometry(0.2, 1), -W + 0.25, 1.05, 0.8);

	const meshes: Mesh[] = [];
	for (const part of Object.keys(bins) as Part[]) {
		const { colour, ...rest } = PARTS[part];
		const m = new Mesh(mergeGeometries(bins[part]), new MeshStandardMaterial({ color: new Color(colour), ...rest }));
		for (const g of bins[part]) g.dispose();
		m.castShadow = part !== 'floor' && part !== 'rug';
		m.receiveShadow = true;
		m.matrixAutoUpdate = false;
		meshes.push(m);
	}
	// what glows and takes no light: the lamp's shade, one more draw
	const shade = new Mesh(new CylinderGeometry(0.14, 0.2, 0.28, 16, 1, true).translate(-3.3, 1.55, -2.4), new MeshBasicMaterial({ color: new Color(SCENE.lamp), side: DoubleSide }));
	shade.matrixAutoUpdate = false;
	meshes.push(shade);
	return meshes;
}

export type Apartment = {
	/** in view or not: out of view nothing is drawn */
	setVisible(v: boolean): void;
	dispose(): void;
};

/**
 * the apartment drawn into `canvas`, sized by its box. Rejects where the browser gives no WebGPU and no WebGL 2: the
 * caller keeps its still. `still`: no motion of its own (prefers-reduced-motion): one frame, then only what the visitor does.
 */
export async function mount(canvas: HTMLCanvasElement, opts: { still: boolean; started: number }): Promise<Apartment> {
	const renderer = await makeRenderer({ canvas, power: 'low-power', toneMapping: 'neutral', shadows: true });
	// the sun's shadows change with nothing: drawn once, and again only when asked
	renderer.shadowMap.autoUpdate = false;
	renderer.shadowMap.needsUpdate = true;

	const scene = new Scene();
	scene.background = new Color(SCENE.sky);
	const meshes = build();
	scene.add(...meshes);
	scene.add(new HemisphereLight(new Color(SCENE.sky), new Color(SCENE.wall), 1.6));
	const sun = new DirectionalLight(new Color(SCENE.sun), 3.2);
	sun.position.set(-3.5, 6, -9);
	sun.target.position.set(0.2, 0, 0.5);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 22 });
	sun.shadow.bias = -0.0015;
	scene.add(sun, sun.target);
	const lamp = new PointLight(new Color(SCENE.lamp), 6, 5, 2);
	lamp.position.set(-3.3, 1.5, -2.4);
	scene.add(lamp);

	const camera = new PerspectiveCamera(62, 1, 0.05, 40);
	const at = new Vector3(1.9, EYE, 2.3); // where the visitor stands
	const to = at.clone(); // where they walk to
	let yaw = 0.62, pitch = -0.08; // looking across the room to the window
	let sway = 0;

	let frames = 0;
	function draw() {
		camera.position.copy(at);
		camera.rotation.set(pitch, yaw + sway, 0, 'YXZ');
		renderer.render(scene, camera);
		frames++;
		canvas.dataset.frames = String(frames);
		canvas.dataset.tris = String(renderer.info.render.triangles);
		canvas.dataset.draws = String(renderer.info.render.drawCalls);
		if (frames === 1) canvas.dataset.firstMs = String(Math.round(performance.now() - opts.started));
	}

	let fitted = '';
	function fit() {
		const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
		// only a new size draws again (the observer also calls once as it starts)
		if (!w || !h || fitted === `${w}x${h}@${dpr}`) return;
		fitted = `${w}x${h}@${dpr}`;
		renderer.setPixelRatio(dpr);
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		// a tall phone banner sees as much of the room's width as a wide one
		camera.fov = w / h < 1 ? 78 : 62;
		camera.updateProjectionMatrix();
		draw();
	}
	const sized = new ResizeObserver(fit);
	sized.observe(canvas);

	// ---- the loop: only while in view, and only while something moves
	let visible = true, raf = 0, touched = -1e9, walking = false;
	const clock = { last: 0 };
	function tick(now: number) {
		raf = 0;
		const dt = Math.min(0.05, (now - clock.last) / 1000 || 0);
		clock.last = now;
		if (walking) {
			at.lerp(to, 1 - Math.exp(-dt * 4));
			if (at.distanceTo(to) < 0.01) {
				at.copy(to);
				walking = false;
			}
		}
		// a slow look left and right, once the visitor has let go for a while
		if (!opts.still && now - touched > 3500) sway = Math.sin((now - touched - 3500) / 4200) * 0.16;
		draw();
		wake();
	}
	function wake() {
		if (raf || !visible || document.hidden) return;
		if (walking || !opts.still) raf = requestAnimationFrame(tick);
	}

	// ---- looking around and walking
	const ray = new Raycaster(), floor = new Plane(new Vector3(0, 1, 0), 0), hit = new Vector3(), ndc = new Vector2();
	let down: { x: number; y: number; t: number; moved: number; touch: boolean } | null = null;
	const onDown = (e: PointerEvent) => {
		if (!e.isPrimary) return;
		down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, touch: e.pointerType === 'touch' };
		canvas.setPointerCapture?.(e.pointerId);
	};
	const onMove = (e: PointerEvent) => {
		if (!down || !e.isPrimary) return;
		const dx = e.clientX - down.x, dy = e.clientY - down.y;
		down.moved += Math.abs(dx) + Math.abs(dy);
		down.x = e.clientX;
		down.y = e.clientY;
		yaw += dx * 0.0045;
		// a finger's up and down is the page's scroll (touch-action: pan-y): only a mouse looks up and down
		if (!down.touch) pitch = Math.max(-0.6, Math.min(0.45, pitch + dy * 0.0035));
		yaw += sway;
		sway = 0;
		touched = performance.now();
		if (!raf) draw();
	};
	const onUp = (e: PointerEvent) => {
		if (!down || !e.isPrimary) return;
		const tap = down.moved < 8 && performance.now() - down.t < 450;
		down = null;
		if (!tap) return;
		const r = canvas.getBoundingClientRect();
		ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		ray.setFromCamera(ndc, camera);
		if (!ray.ray.intersectPlane(floor, hit)) return;
		// inside the walls, a step back from them
		to.set(Math.max(-W + 0.7, Math.min(W - 0.7, hit.x)), EYE, Math.max(-D + 0.9, Math.min(D - 0.6, hit.z)));
		touched = performance.now();
		if (opts.still) {
			at.copy(to);
			draw();
		} else {
			walking = true;
			wake();
		}
	};
	const onCancel = () => (down = null);
	const onHidden = () => wake();
	canvas.addEventListener('pointerdown', onDown);
	canvas.addEventListener('pointermove', onMove);
	canvas.addEventListener('pointerup', onUp);
	canvas.addEventListener('pointercancel', onCancel);
	document.addEventListener('visibilitychange', onHidden);

	fit();
	if (!frames) draw();
	wake();

	return {
		setVisible(v) {
			visible = v;
			if (!v && raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
			clock.last = 0;
			wake();
		},
		dispose() {
			if (raf) cancelAnimationFrame(raf);
			sized.disconnect();
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointercancel', onCancel);
			document.removeEventListener('visibilitychange', onHidden);
			for (const m of meshes) {
				m.geometry.dispose();
				(m.material as MeshStandardMaterial).dispose();
			}
			disposeRenderer(renderer);
		}
	};
}
