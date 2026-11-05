// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD SHOWN (play/SPEC.md §4.11) — the Worlds page's stage, and the dev harness's (scripts/render.mjs --world): a
 * world's build (built in the asset box like any asset, ../assets/sources/viewer.js `vaultBuild`, checked) put in a
 * scene of its own under the sky its mood asks for (./sky.js), everything it names drawn where it stands by the
 * universal renderer at the level of detail its size on screen calls for (../assets/plantings.js), and, for a world
 * that moves, kept running in the box (../assets/hero.js): every frame its step is asked of the box, its `use:` nodes
 * followed, its guests' lights lit (./lights.js) and its sounds played round the camera (./sound.js).
 *
 * Three cameras: `orbit` (round a point, as a drone would: drag to turn, right-drag or two fingers to pan, wheel to
 * come closer), `walk` (at a person's eye, 1.65 m, at a walk) and `drive` (at a driver's eye, 1.2 m, at a city's
 * 50 km/h), the last two by WASD or the arrows, the mouse or a finger to look. A world may name where to look from:
 * its nodes `view:<name>`, each an eye where it stands looking along its +z (./contract.js); `look(name)` goes there.
 *
 * Under the film camera (play/SPEC.md §4.11, ./film.js) the world runs on the shot's clock: `seek(t)` brings it to the
 * shot's moment (a world's tick advances exactly the time it is given, so one long step gets there as frame by frame
 * would; a seek back builds the world afresh and steps it from 0), `settle()` resolves once the box has answered, and
 * while the film draws the canvas the view draws nothing itself.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPlantings, floorGrid } from '../assets/plantings.js';
import { heroOf, runner } from '../assets/hero.js';
import { vaultBuild } from '../assets/sources/viewer.js';
import { rebuild } from '../assets/box/rebuild.js';
import { filmDraws, worldTime } from '../render/film.js';
import { AssetBox } from '../assets/box/host.js';
import { createWalker } from '../sandbox-kit/walker.js';
import { worldOf } from './contract.js';
import { createLights } from './lights.js';
import { createSky } from './sky.js';
import { createSound } from './sound.js';

/** the eye and the paces (m/s) of the street cameras */
export const MODES = {
	walk: { eye: 1.65, walk: 1.4, hurry: 4.2 },
	drive: { eye: 1.2, walk: 13.9, hurry: 27 }
};

/** the views a world names: `view:<name>` nodes, each its eye and where it looks */
export function viewsOf(root) {
	const out = [];
	root.updateMatrixWorld(true);
	root.traverse((o) => {
		const m = /^view:([a-z0-9][a-z0-9 -]{0,39})$/i.exec(o.name ?? '');
		if (!m) return;
		const eye = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
		const ahead = new THREE.Vector3(0, 0, 1).transformDirection(o.matrixWorld);
		out.push({ name: m[1], eye, ahead });
	});
	return out;
}

/**
 * @param {HTMLElement} el where the canvas goes
 * @param {{ source: any, engine: number, sound?: boolean }} o `source` the recipes (play's catalog, or a bench's)
 */
export function createWorldView(el, o) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	el.appendChild(renderer.domElement);
	Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 4000);
	camera.position.set(80, 60, 80);
	const sky = createSky(scene, renderer);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.maxPolarAngle = Math.PI * 0.495;
	controls.screenSpacePanning = false;
	const plantings = createPlantings({ renderer, camera, scene });
	const lights = createLights({ scene, camera, renderer, assets: () => plantings.assets });
	const sound = o.sound === false ? null : createSound();
	const build = new AssetBox({ engine: o.engine });
	const live = new AssetBox({ engine: o.engine });

	const state = { phase: 'idle', error: '', label: '', moves: false, live: false, mode: 'orbit', views: [], t: 0, fps: 0, size: [0, 0, 0], guests: 0, kinds: 0, missing: 0, lit: 0 };
	let world = null; // { root, hero, info, floor }
	let walker = null;
	let ask = 0;
	let paused = false;
	/** the camera held by a film (its own pose each frame): no controls move it */
	let held = false;

	function resize() {
		const w = el.clientWidth || 800, h = el.clientHeight || 600;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
	const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
	ro?.observe(el);
	resize();

	function letGo() {
		walker?.dispose();
		walker = null;
		if (!world) return;
		world.hero?.dispose();
		scene.remove(world.root);
		plantings.clear();
		sound?.stop();
		world = null;
	}

	/** the camera round the whole world, from its front right and above: round what it stands (its land may run to the
	 *  horizon), else its land */
	function frame() {
		if (!world) return;
		const box = new THREE.Box3();
		for (const g of plantings.guests()) box.expandByPoint(new THREE.Vector3().setFromMatrixPosition(g.node.matrixWorld));
		if (box.isEmpty()) box.setFromObject(world.root);
		const size = box.getSize(new THREE.Vector3());
		const centre = box.getCenter(new THREE.Vector3()).setY(0);
		const r = Math.min(Math.max(size.x, size.z) * 0.55, 160 + 0.6 / Math.max(world.info.mood.fog, 0.001));
		controls.target.copy(centre);
		camera.position.copy(centre).add(new THREE.Vector3(0.62, 0.42, 0.66).normalize().multiplyScalar(Math.max(20, r)));
		controls.update();
	}

	function streetCamera(mode) {
		walker?.dispose();
		const m = MODES[mode];
		const f = world?.floor;
		const dir = new THREE.Vector3();
		camera.getWorldDirection(dir);
		const p = mode === state.mode ? camera.position : controls.target;
		walker = createWalker(camera, renderer.domElement, {
			eye: m.eye,
			walk: m.walk,
			hurry: m.hurry,
			x: p.x,
			z: p.z,
			yaw: Math.atan2(-dir.x, -dir.z),
			pitch: 0,
			floorAt: (x, z) => {
				const y = f?.at(x, z);
				return Number.isFinite(y) ? y : 0;
			}
		});
	}

	const view = {
		renderer,
		scene,
		camera,
		controls,
		plantings,
		lights,
		sound,
		sky,
		state,
		get hero() {
			return world?.hero ?? null;
		},
		get root() {
			return world?.root ?? null;
		},
		/**
		 * A world shown: its recipe's build (`hash`, with its values as text), built and checked, put in the scene, what
		 * it names drawn, and kept running if it moves. Resolves once it stands (its guests are built after, `building`).
		 */
		async show(hash, given = {}) {
			const mine = ++ask;
			state.phase = 'building';
			state.error = '';
			try {
				const got = await vaultBuild(o.source, hash, given, { box: build, keep: true });
				if (mine !== ask) return;
				letGo();
				const root = got.obj;
				const info = worldOf(root);
				const hero = info.moves ? heroOf(got, { start: runner(live, got.recipe, got.given), exact: true }) : null;
				scene.add(root);
				root.traverse((x) => {
					if (x.isMesh) x.receiveShadow = x.castShadow = true;
				});
				// the land's floor, for the street cameras: its own meshes that face up, a metre a cell
				const land = [];
				root.traverse((x) => x.isMesh && x.visible && land.push(x));
				let floor = null;
				try {
					floor = land.length ? floorGrid(land, 1) : null;
				} catch {}
				world = { root, hero, info, floor, got };
				sky.apply(info.mood);
				sound?.set(info.sounds);
				plantings.show(root);
				state.label = got.label;
				state.moves = info.moves;
				state.views = viewsOf(root).map((v) => v.name);
				state.size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray().map((x) => Math.round(x));
				// the eye's reach: the whole world across (a city of 6.5 km), its near plane a hand's breadth from the eye
				camera.near = 0.2;
				camera.far = Math.min(20_000, Math.max(2000, 1.5 * Math.hypot(state.size[0], state.size[2])));
				camera.updateProjectionMatrix();
				state.phase = 'shown';
				state.t = 0;
				frame();
				if (state.mode !== 'orbit') streetCamera(state.mode);
				return got;
			} catch (e) {
				if (mine !== ask) return;
				state.phase = 'failed';
				state.error = String(e?.message ?? e);
				throw e;
			}
		},
		/**
		 * The world at time t (s from its build): a step of the difference asked of the box, or, for a time before the
		 * one it is at, the world built afresh from its data and stepped from 0. Its guests followed and lit for t.
		 */
		seek(t) {
			if (!world) return;
			if (t < state.t - 1e-6 && world.hero) {
				// back in time: the build as it came from the box, kept running anew
				const got = { ...world.got, obj: rebuild(world.got.data) };
				world.hero.dispose();
				scene.remove(world.root);
				got.obj.traverse((x) => {
					if (x.isMesh) x.receiveShadow = x.castShadow = true;
				});
				scene.add(got.obj);
				world.root = got.obj;
				world.got = got;
				world.hero = heroOf(got, { start: runner(live, got.recipe, got.given), exact: true });
				plantings.show(got.obj);
				state.t = 0;
			}
			const dt = t - state.t;
			state.t = t;
			world.hero?.tick(dt, {});
		},
		/**
		 * Resolves once the world has come to the time it was brought to: its run started, no step owed by the box. A
		 * long jump is asked of the box 0.25 s at a time (hero.js STEP), each step awaited as the box answers it, for as
		 * long as the box keeps answering: it gives up only after `stall` ms in which no step went through (the box gone
		 * or stuck), never part-way through a jump that is still moving (two minutes of world time are 480 steps).
		 */
		async settle(stall = 60_000) {
			let moved = performance.now(), owed = Infinity, live = false;
			while (world?.hero && (!world.hero.live || world.hero.busy)) {
				const h = world.hero;
				h.tick(0, {});
				if (h.pending) await h.pending;
				else await new Promise((r) => setTimeout(r, 16));
				const now = performance.now();
				if (h.owed < owed || h.live !== live) {
					owed = h.owed;
					live = h.live;
					moved = now;
				} else if (now - moved > stall) break;
			}
			plantings.update();
			if (world) lights.update(plantings.guests(), world.info.mood, state.t);
		},
		/** the world's frames a film camera may ride in: its nodes `frame:<name>` (a seat in a vehicle) */
		frames() {
			const out = {};
			world?.root.traverse((o) => {
				const m = /^frame:([a-z0-9][a-z0-9-]{0,39})$/i.exec(o.name ?? '');
				if (m) out[m[1]] = () => o;
			});
			return out;
		},
		/** the camera held by a film, or let go to the controls again */
		hold(on) {
			held = !!on;
			controls.enabled = !held && !walker;
		},
		/** the camera: orbit, walk or drive */
		mode(m) {
			if (!MODES[m] && m !== 'orbit') return;
			if (m === 'orbit') {
				walker?.dispose();
				walker = null;
				const d = new THREE.Vector3();
				camera.getWorldDirection(d);
				controls.target.copy(camera.position).addScaledVector(d, 30).setY(0);
				camera.position.y = Math.max(camera.position.y, 12);
				controls.enabled = true;
			} else {
				controls.enabled = false;
				streetCamera(m);
			}
			state.mode = m;
		},
		/** the camera at a view the world names */
		look(name) {
			const v = world && viewsOf(world.root).find((x) => x.name === name);
			if (!v) return false;
			if (walker) walker.place(v.eye.x, v.eye.z, Math.atan2(-v.ahead.x, -v.ahead.z), Math.asin(v.ahead.y));
			else {
				camera.position.copy(v.eye);
				controls.target.copy(v.eye).addScaledVector(v.ahead, 40);
				controls.update();
			}
			return true;
		},
		/** the camera put exactly here, looking at `target` (the harness's shots) */
		place(eye, target) {
			if (walker) this.mode('orbit');
			camera.position.set(...eye);
			controls.target.set(...target);
			camera.lookAt(controls.target);
			controls.update();
		},
		frame,
		/** whether what it names is still being built */
		building: () => plantings.building(),
		/** the page's audio, unlocked by a touch or a key */
		unlock: () => sound?.unlock(),
		pause(on) {
			paused = on;
			if (on) walker?.stop();
		},
		/** one frame: the world's step asked, its guests followed, lit and heard, and drawn */
		step(dt) {
			// under the film camera: its clock the shot's, and nothing drawn while the film draws
			const shot = worldTime();
			if (shot !== undefined) this.seek(shot);
			else if (held) {
				// held by a film that brings the world to its moments itself (`advance`): no time of the page's own, only
				// the steps still owed to that moment asked
				world?.hero?.tick(0, {});
			} else {
				state.t += dt;
				world?.hero?.tick(dt, {});
			}
			if (world?.hero) state.live = world.hero.live;
			if (filmDraws()) {
				plantings.update();
				if (world) lights.update(plantings.guests(), world.info.mood, state.t);
				return;
			}
			if (held) {
				// the film's hold puts the camera where the shot has it
			} else if (walker) walker.update(dt);
			else controls.update();
			plantings.update();
			const guests = plantings.guests();
			if (world) lights.update(guests, world.info.mood, state.t);
			sound?.update(camera, guests);
			sky.place(camera, walker ? camera.position : controls.target);
			renderer.render(scene, camera);
			state.guests = guests.length;
			state.kinds = plantings.state.kinds;
			state.missing = plantings.state.missing;
			state.lit = lights.stats.lit;
		},
		dispose() {
			ask++;
			running = false;
			renderer.setAnimationLoop(null);
			ro?.disconnect();
			letGo();
			plantings.dispose();
			lights.dispose();
			sound?.dispose();
			sky.dispose();
			controls.dispose();
			build.stop('the world was left');
			live.stop('the world was left');
			renderer.dispose();
			renderer.domElement.remove();
		}
	};

	let running = true;
	let last = performance.now(), frames = 0, since = last;
	renderer.setAnimationLoop((now) => {
		if (!running || paused) return;
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		view.step(dt);
		frames++;
		if (now - since > 1000) {
			state.fps = Math.round((frames * 1000) / (now - since));
			frames = 0;
			since = now;
		}
	});
	return view;
}
