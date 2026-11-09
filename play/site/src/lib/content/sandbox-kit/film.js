/**
 * The film camera's hold on a world, what makes any sandbox a set the studio can shoot: one contract for every world,
 * `window.__world`, made by `connectFilm`. A shot is rendered frame by frame, each frame set from the shot alone (the
 * camera, the hour, the world's clock, the lights), so the same shot renders the same pixels every time. While a film
 * holds it, a world on the kit
 *   · draws nothing itself while `filmDraws()` (the film draws the canvas, only when asked);
 *   · runs its animations on `worldTime()` when the film sets it (the shot's clock), else on its own;
 *   · keeps its resolution while `filmHoldsSize()` (`stage.adapt(now, filmHoldsSize())`).
 * A shot names its world (../game/film/worlds.js); its camera may ride in one of the world's own frames (the van),
 * put there once the world's moving parts (`parts`) have come to the shot's moment.
 */
import * as THREE from 'three';

/** @typedef {[x: number, y: number, z: number, yaw: number, pitch: number]} Pose */

/**
 * @typedef {object} CameraHold the camera as the film flies it: a pose, free of any controls, until let go
 * @property {(x: number, y: number, z: number, yaw: number, pitch: number) => void} fly
 * @property {() => Pose | null} flying
 * @property {() => boolean} apply put the camera at the held pose now (false when nothing is held)
 * @property {() => void} release let go: the world's own controls have the camera again
 */

/**
 * @typedef {{ id: string, intensity: number, color?: string }} FilmLight
 *   a light of the shot over what the hour gives it: 'sun', 'fill' and 'sky' in every world (the sky's), and a world's
 *   own ('glow', 'lamps' in the domes)
 */

/**
 * @typedef {{ sandbox: string, area?: string, stand: [number, number], dome?: number, props?: string, seed: number, views?: import('./stream.js').View[] }} FilmWorldSpec
 *   views: what the shot's camera sees along its path (maia/content/film `viewsOf`), when the film knows it: a world that
 *   streams by view (./stream.js) builds for exactly these
 */

// the three rules of a world under the film camera are the film renderer's
export { filmDraws, filmHoldsSize, filmPlays, worldTime } from '$lib/content/render/film.js';

/**
 * A pose in a frame (an object of the world: its place and its turn now) as a pose in the world.
 * @param {THREE.Object3D} frame @param {Pose | number[]} p @returns {Pose}
 */
export function poseIn(frame, p) {
	frame.updateMatrixWorld(true);
	const at = frame.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
	const q = frame.getWorldQuaternion(new THREE.Quaternion());
	const d = new THREE.Vector3(-Math.sin(p[3]) * Math.cos(p[4]), Math.sin(p[4]), -Math.cos(p[3]) * Math.cos(p[4])).applyQuaternion(q);
	return [at.x, at.y, at.z, Math.atan2(-d.x, -d.z), Math.asin(Math.max(-1, Math.min(1, d.y)))];
}

/**
 * A camera put at a pose, as the film flies it (yaw about y, then pitch).
 * @param {THREE.Camera} camera @param {Pose | number[]} p
 */
export function aim(camera, p) {
	camera.position.set(p[0], p[1], p[2]);
	camera.rotation.set(p[4], p[3], 0, 'YXZ');
}

/**
 * The pose of a camera as the film flies it, in the world or (frame) in one of its frames.
 * @param {THREE.Camera} camera @param {THREE.Object3D} [frame] @returns {Pose}
 */
export function poseOf(camera, frame) {
	camera.updateMatrixWorld(true);
	const at = camera.getWorldPosition(new THREE.Vector3());
	const d = camera.getWorldDirection(new THREE.Vector3());
	if (frame) {
		frame.updateMatrixWorld(true);
		frame.worldToLocal(at);
		d.applyQuaternion(frame.getWorldQuaternion(new THREE.Quaternion()).invert());
	}
	return [at.x, at.y, at.z, Math.atan2(-d.x, -d.z), Math.asin(Math.max(-1, Math.min(1, d.y)))];
}

/**
 * A bare hold on a camera, for a world whose camera controls are its own (the planet's).
 * @param {THREE.Camera} camera
 * @returns {CameraHold}
 */
export function createCameraHold(camera) {
	/** @type {Pose | null} */
	let pose = null;
	return {
		fly: (x, y, z, yaw, pitch) => void (pose = [x, y, z, yaw, pitch]),
		flying: () => pose,
		apply() {
			if (!pose) return false;
			aim(camera, pose);
			return true;
		},
		release: () => void (pose = null)
	};
}

/**
 * Hand a world to the film camera: makes `window.__world`.
 * @param {{
 *   sandbox: string,
 *   area?: string,
 *   renderer: THREE.WebGLRenderer,
 *   scene: THREE.Scene,
 *   camera: THREE.PerspectiveCamera,
 *   hold: CameraHold,
 *   sky?: import('./sky.js').SkyHandle | null,
 *   place?: (x: number, z: number, yaw: number, pitch: number, y?: number) => void,
 *   animate?: (t: number) => void,
 *   advance?: (t: number) => void,
 *   lights?: Record<string, (k: number, color?: string) => void>,
 *   frames?: Record<string, () => THREE.Object3D>,
 *   parts?: (values: Record<string, Record<string, number>>) => void,
 *   stage?: (world: FilmWorldSpec) => Promise<void>,
 *   holds?: (world: FilmWorldSpec) => boolean,
 *   keep?: (worlds: FilmWorldSpec[]) => void,
 *   streams?: boolean,
 *   move?: (world: FilmWorldSpec) => void,
 *   progress?: () => { label: string, done?: number, total?: number } | null,
 *   extra?: Record<string, unknown>
 * }} o
 *   sandbox, area: which world this is (a shot of another is refused); hold: the camera controller's hold (the walker
 *   and the orbit rig are holds); place: stand the world's walker here (where a shot is staged: what is near is
 *   built); animate: every animation to world time t; advance: anything else a frame needs once the hour is set
 *   (levels of detail, the nearest lamps); lights: the world's own lights a shot may scale and colour; frames: the
 *   world's own frames a shot's camera may ride in (camera `frame`), each where it stands once animate has run; parts: the world's moving parts put where the shot has them
 *   (../game/film/worlds.js `parts`; each part by its channels' values, called every frame, with {} for none); stage: build
 *   what a shot needs and resolve when it is ready (default: stand at world.stand); holds: whether the world is still
 *   staged for that (default: yes); keep: keep built what these shots need; streams: holds is exact for any shot
 *   wherever it stands, so a cut to a held shot only moves (maia/content/sandbox-kit/stream.js); move: stand there at once;
 *   progress: what its stage is doing now, and how far (`done` of `total`) when it knows (the studio's loading screen
 *   shows it while Play readies the world; default: nothing said); extra: more on window.__world (debugging, sets)
 */
export function connectFilm(o) {
	const { renderer, scene, camera, hold, sky = null } = o;
	const place = o.place ?? (() => hold.release());
	const was = /** @type {any} */ (window).__world;
	/** a pose flown in one of the world's frames, put in it once the world is at the shot's moment @type {{ pose: Pose, frame: string } | null} */
	let framed = null;
	const world = {
		sandbox: o.sandbox,
		area: o.area,
		THREE,
		renderer,
		scene,
		camera,
		/** fly the camera to a pose: in the world, or in one of its frames (camera `frame`) */
		fly(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, /** @type {number} */ yaw, /** @type {number} */ pitch, /** @type {string | undefined} */ frame = undefined) {
			framed = frame && o.frames?.[frame] ? { pose: [x, y, z, yaw, pitch], frame } : null;
			if (!framed) hold.fly(x, y, z, yaw, pitch);
		},
		/** let go of the camera: the world's own controls have it (a shot of the world's own camera) */
		release() {
			framed = null;
			hold.release();
		},
		place,
		/** set the sun to an hour now, not at the next once-a-second check (time-lapses) */
		sun: (/** @type {number} */ hour) => sky?.set(hour),
		...o.extra,
		film: {
			/**
			 * Bring the world to world time t (seconds), the camera where `fly` put it: animations, the sun and sky for the
			 * hour, whatever else the world advances, and the shadows drawn again. The world stays at t until the next
			 * advance: a world whose clock the film holds (the Worlds page's, ../worlds/film.js) never runs on between two,
			 * so the same t is the same world however the frames before it came. `lights` scales the lights over what the
			 * hour gives them (1 = as the hour has them) and may recolour them.
			 * `parts`: the world's moving parts the shot moves, by their channels' values at t (../game/film/shot.js `evaluate`).
			 * `live`: a frame of the studio's live viewer, not a plate: the shadows are drawn again only when the world's own
			 * rules say so (the sky's: when the sun or where they follow moves; every frame for a world that keeps
			 * `shadowMap.autoUpdate`), as the game draws them.
			 * @param {number} t @param {FilmLight[]} [lights] @param {Record<string, Record<string, number>>} [parts] @param {boolean} [live]
			 */
			advance(t, lights = [], parts = {}, live = false) {
				hold.apply();
				camera.updateMatrixWorld();
				o.animate?.(t);
				o.parts?.(parts);
				// a pose in one of the world's frames, put where that frame stands now; and held again over whatever the
				// world's own moves did to the camera as it came to t
				const fr = framed, f = fr && o.frames?.[fr.frame]?.();
				if (fr && f) hold.fly(...poseIn(f, fr.pose));
				hold.apply();
				camera.updateMatrixWorld();
				sky?.set();
				o.advance?.(t);
				for (const l of lights) {
					const k = l.intensity;
					if (l.id === 'sun' && sky) {
						sky.sun.intensity *= k;
						if (l.color) sky.sun.color.set(l.color);
					} else if (l.id === 'fill' || l.id === 'sky') scene.environmentIntensity *= k; // the sky is the fill
					else o.lights?.[l.id]?.(k, l.color);
				}
				if (!live) renderer.shadowMap.needsUpdate = true;
			},
			/** @param {FilmWorldSpec} w */
			stage: o.stage ?? (async (w) => place(w.stand[0], w.stand[1], 0, 0)),
			/** @param {FilmWorldSpec} w */
			holds: o.holds ?? (() => true),
			/** @param {FilmWorldSpec[]} ws */
			keep: o.keep ?? (() => {}),
			/** whether `holds` is exact for any shot, wherever it stands (a world that streams by view): a cut to a shot it
			 *  holds is then only a move of the camera, never a staging */
			streams: o.streams ?? false,
			/** stand where shot `w` is, at once, what it sees already built (`streams`) @param {FilmWorldSpec} w */
			move: o.move ?? ((w) => place(w.stand[0], w.stand[1], 0, 0)),
			/** what the world's stage is doing now, for the studio's loading screen (null: nothing it says) */
			progress: o.progress ?? (() => null)
		},
		/** the world is going: the film (and the console) no longer find it (a world opened over another hands it back) */
		disconnect() {
			const w = /** @type {any} */ (window);
			if (w.__world === world) w.__world = was;
		}
	};
	/** @type {any} */ (window).__world = world;
	return world;
}
