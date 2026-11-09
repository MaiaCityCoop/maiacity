/**
 * SANDBOX 7 · THE CAMERA RIG — from orbit to a walk, as the old planet's was.
 *
 * One camera, one continuous control. Far out it orbits the globe looking straight down at the point beneath it; as it
 * comes closer it tilts toward the horizon, and at the bottom of the zoom it stands at eye height on the cards and
 * walks. Everything scales with altitude: a drag that swings a hemisphere from orbit moves a few steps on the ground.
 *
 *   drag          far: pan the globe · near: turn (left–right) and walk (up–down)
 *   wheel / pinch altitude, on a log scale
 *   W A S D / ↑↓  walk and strafe · Q E ← → turn
 *   on a phone    the page's joystick walks as the keys do (`move`); two fingers pinch the altitude; at walking height
 *                 one finger looks round
 *   the walk      zooming in past the threshold hands the gaze to the mouse (pointer lock): the cursor goes, a reticle
 *                 marks the centre and the mouse turns the gaze; Esc lets go, a click takes it again, zooming out gives
 *                 it back. Where the page may not lock the pointer the cursor stays as a crosshair and still turns it.
 *   flyTo         a flight to a point (a site), the camera coming down over it
 *
 * The position is a unit vector on the sphere, an altitude above the surface and a heading (a bearing from local
 * north). The camera looks along the heading, pitched from −89° (orbit) to −11° (walking). Its maths needs no page:
 * the listeners are only added when it is given the canvas.
 */
import * as THREE from 'three';
import { unitAt } from './maps';

export type RigOptions = {
	/** the radius of the ground the walker stands on (the tallest card) */
	surface: number;
	/** eye height above the surface at the bottom of the zoom */
	eye: number;
	/** the altitude at the top of the zoom */
	ceiling: number;
	/** where to start: the point beneath the camera */
	start: { lat: number; lon: number };
	/** the starting altitude */
	altitude: number;
	/** a reticle to show while the mouse has the gaze */
	reticle?: HTMLElement;
};

/** below this zoom the walk is on: the mouse takes the gaze here, and gives it back here */
export const WALK = 0.38;
/** radians of gaze per pixel of mouse: a full circle in about 1,250 px */
const LOOK = 0.005;
/** radians of gaze per pixel of a finger's swipe */
const SWIPE = 0.0065;
/** how long a flight to a site takes, in seconds */
const FLIGHT = 1.8;
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'W', 'A', 'S', 'D', 'Q', 'E', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const deg = THREE.MathUtils.degToRad;

export class GlobeRig {
	/** the direction from the centre to the point the camera stands over */
	readonly pos: THREE.Vector3;
	/** bearing from local north, clockwise, radians */
	heading = 0;
	altitude: number;
	/** the altitude the zoom eases toward */
	target: number;
	readonly eye: number;
	readonly ceiling: number;
	readonly surface: number;
	/** the keys held down */
	readonly keys = new Set<string>();
	private dragging = false;
	private last = { x: 0, y: 0 };
	private readonly inertia = new THREE.Vector2();
	private readonly off: (() => void)[] = [];
	/** the walker's free gaze, up or down from the level, radians */
	private lookPitch = 0;
	/** the gaze follows the mouse without a lock, where locking is refused */
	private softLook = false;
	/** the walk has taken the gaze once for this descent: Esc can let go without it grabbing again */
	private engaged = false;
	private readonly stick = new THREE.Vector2();
	private readonly joystick = { x: 0, y: 0, hurry: false };
	private readonly fingers = new Map<number, { x: number; y: number }>();
	private pinch = 0;
	private flight: { from: THREE.Vector3; to: THREE.Vector3; from_alt: number; to_alt: number; t: number } | null = null;
	private readonly reticle?: HTMLElement;
	private dom?: HTMLElement;

	constructor(private readonly camera: THREE.PerspectiveCamera, opts: RigOptions) {
		this.pos = new THREE.Vector3(...unitAt(opts.start.lat, opts.start.lon));
		this.eye = opts.eye;
		this.ceiling = opts.ceiling;
		this.surface = opts.surface;
		this.altitude = this.target = Math.min(this.ceiling, Math.max(this.eye, opts.altitude));
		this.reticle = opts.reticle;
		this.place();
	}

	/** 0 at eye height, 1 at the ceiling, on a log scale: the zoom the controls feel */
	get zoom(): number {
		return Math.log(this.altitude / this.eye) / Math.log(this.ceiling / this.eye);
	}

	/** the altitude at a zoom, 0 (eye height) to 1 (the ceiling) */
	altitudeAt(z: number): number {
		return this.eye * Math.pow(this.ceiling / this.eye, Math.min(1, Math.max(0, z)));
	}

	/** zoom to an altitude (eased there by update) */
	zoomTo(altitude: number) {
		this.target = Math.min(this.ceiling, Math.max(this.eye, altitude));
	}

	/** the local frame at the position: up, and the heading's forward and right, all tangent-true */
	frame(at: THREE.Vector3 = this.pos) {
		const up = at.clone();
		const east = new THREE.Vector3().crossVectors(WORLD_UP, up);
		if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
		east.normalize();
		const north = new THREE.Vector3().crossVectors(up, east).normalize();
		const forward = north.clone().multiplyScalar(Math.cos(this.heading)).addScaledVector(east, Math.sin(this.heading));
		const right = east.clone().multiplyScalar(Math.cos(this.heading)).addScaledVector(north, -Math.sin(this.heading));
		return { up, forward, right };
	}

	/** step along a tangent direction by an angle (radians of the great circle) */
	private step(dir: THREE.Vector3, angle: number) {
		if (!angle) return;
		this.pos.multiplyScalar(Math.cos(angle)).addScaledVector(dir, Math.sin(angle)).normalize();
	}

	/** ground angle per pixel of drag: proportional to altitude, so the ground under the pointer stays under it */
	private get anglePerPixel() {
		return (0.0016 * this.altitude) / this.surface;
	}

	/** how much the controls orbit (1) rather than walk (0) */
	get orbitness() {
		return smooth(WALK, WALK + 0.22, this.zoom);
	}

	/** the mouse has the gaze, locked or not */
	get looking() {
		return (typeof document !== 'undefined' && !!this.dom && document.pointerLockElement === this.dom) || this.softLook;
	}

	/** the gaze's pitch at a zoom: straight down from orbit, toward the horizon on the way in */
	pitchAt(z: number) {
		return deg(lerp(-11, -89, smooth(0, 0.85, z)));
	}

	/** walk from a touch joystick: x to the right, y ahead, each −1..1; hurry when pushed to the edge */
	move(x: number, y: number, hurry: boolean) {
		Object.assign(this.joystick, { x, y, hurry });
	}

	/** a drag of the pointer, in pixels: far out it grabs the ground, near it turns you and walks */
	drag(dx: number, dy: number) {
		this.flight = null;
		const { forward, right } = this.frame();
		const o = this.orbitness;
		const a = this.anglePerPixel;
		// grab the ground: drag right, the world goes right, the camera moves left
		this.step(right, -dx * a * o);
		this.step(forward, dy * a);
		// near the ground a sideways drag turns you instead
		this.heading += dx * 0.0035 * (1 - o);
	}

	/** fly to a point, coming down over it to an altitude (by default the one that shows a region of a few cards) */
	flyTo(lat: number, lon: number, altitude = this.altitudeAt(0.62)) {
		this.flight = { from: this.pos.clone(), to: new THREE.Vector3(...unitAt(lat, lon)), from_alt: this.altitude, to_alt: Math.min(this.ceiling, Math.max(this.eye, altitude)), t: 0 };
	}

	/** whether a flight is under way */
	get flying() {
		return !!this.flight;
	}

	/**
	 * advance by `dt` seconds of real time: a flight keeps to the clock (it lands on time however few frames a slow
	 * screen draws); keys, inertia and the eased zoom step at most a tenth of a second a frame, so a stall never jumps
	 */
	update(seconds: number) {
		const dt = Math.min(0.1, seconds);
		if (this.flight) {
			const f = this.flight;
			f.t = Math.min(1, f.t + seconds / FLIGHT);
			const s = smooth(0, 1, f.t);
			// along the great circle, rising a little in the middle of a long flight so the way is seen
			const angle = f.from.angleTo(f.to);
			if (angle > 1e-6) {
				const axis = new THREE.Vector3().crossVectors(f.from, f.to).normalize();
				this.pos.copy(f.from).applyAxisAngle(axis, angle * s).normalize();
			}
			const hop = Math.min(this.ceiling, f.from_alt + angle * this.surface * 0.6);
			this.altitude = this.target = s < 0.5 ? lerp(f.from_alt, Math.max(f.from_alt, hop), s * 2) : lerp(Math.max(f.from_alt, hop), f.to_alt, (s - 0.5) * 2);
			this.inertia.set(0, 0);
			if (f.t >= 1) {
				this.pos.copy(f.to);
				this.flight = null;
			}
			return this.place();
		}
		const k = this.keys, j = this.joystick;
		if (k.size || j.x || j.y) {
			const { forward, right } = this.frame();
			// ground speed grows with altitude, a stroll at eye height, a sweep from orbit, up to a cap
			const a = Math.min(1.2, (2.8 * Math.max(this.altitude, this.eye)) / this.surface) * dt * (j.hurry ? 2.2 : 1);
			const clamp = (v: number) => Math.max(-1, Math.min(1, v));
			const f = clamp((k.has('w') || k.has('W') || k.has('ArrowUp') ? 1 : 0) - (k.has('s') || k.has('S') || k.has('ArrowDown') ? 1 : 0) + j.y);
			const r = clamp((k.has('d') || k.has('D') ? 1 : 0) - (k.has('a') || k.has('A') ? 1 : 0) + j.x);
			const turn = (k.has('e') || k.has('E') || k.has('ArrowRight') ? 1 : 0) - (k.has('q') || k.has('Q') || k.has('ArrowLeft') ? 1 : 0);
			this.step(forward, f * a);
			this.step(right, r * a);
			this.heading += turn * 1.6 * dt;
		}
		if (this.softLook) {
			// unlocked, a mouse runs out of view at the edge: pushed into the outer tenth, the turn keeps going that way
			const x = this.stick.x, edge = 0.8;
			const push = Math.abs(x) > edge ? Math.sign(x) * ((Math.abs(x) - edge) / (1 - edge)) : 0;
			this.heading += push * 3.6 * dt;
		}
		if (!this.dragging && this.inertia.lengthSq() > 0.01) {
			this.inertia.multiplyScalar(0.9);
			this.drag(this.inertia.x, this.inertia.y);
		}
		this.altitude = lerp(this.altitude, this.target, 1 - Math.pow(0.001, dt));
		// one threshold: descending through it hands the gaze to the mouse, once per descent; rising gives it back
		const z = this.zoom;
		if (z < WALK && !this.looking && !this.engaged && this.dom) {
			this.engaged = true;
			this.engage();
		}
		if (z > WALK) {
			this.engaged = false;
			if (this.looking) this.letGo();
		}
		this.place();
	}

	/** the camera's pitch now (radians) */
	get pitch() {
		const walk = 1 - smooth(WALK, WALK * 1.8, this.zoom);
		return this.pitchAt(this.zoom) + this.lookPitch * walk;
	}

	/** put the camera where the rig says: over the position, pitched for the altitude */
	private place() {
		const { up, forward } = this.frame();
		const pitch = this.pitch;
		const dir = forward.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch));
		// the camera's up is the surface up, less what the gaze already takes: heading-up when looking straight down
		const camUp = up.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(forward, -Math.sin(pitch)).normalize();
		this.camera.position.copy(up).multiplyScalar(this.surface + this.altitude);
		this.camera.up.copy(camUp);
		this.camera.lookAt(this.camera.position.clone().add(dir));
		const fov = lerp(62, 40, smooth(0, 0.6, this.zoom));
		if (Math.abs(this.camera.fov - fov) > 0.01) {
			this.camera.fov = fov;
			this.camera.updateProjectionMatrix();
		}
	}

	private letGo() {
		this.softLook = false;
		this.stick.set(0, 0);
		if (this.dom && document.pointerLockElement === this.dom) document.exitPointerLock();
		this.show();
	}

	/** locked, the cursor goes and the reticle marks the centre; unlocked, the cursor stays as a crosshair */
	private show() {
		if (!this.dom) return;
		const looking = this.looking;
		if (this.reticle) this.reticle.hidden = !looking || this.softLook;
		this.dom.style.cursor = looking ? (this.softLook ? 'crosshair' : 'none') : '';
	}

	/** hand the gaze to the mouse: lock the pointer, or follow it unlocked where that is refused */
	private engage() {
		if (touchOnly() || !this.dom) return;
		const soft = () => {
			this.softLook = true;
			this.show();
		};
		try {
			const p = this.dom.requestPointerLock?.() as Promise<void> | undefined;
			if (p?.catch) p.catch(soft);
			else if (!this.dom.requestPointerLock) soft();
		} catch {
			soft();
		}
	}

	/** listen to the canvas, the mouse and the keys; until then the rig is only its maths */
	listen(dom: HTMLElement) {
		this.dom = dom;
		dom.style.touchAction = 'none';
		const spread = () => {
			const [a, b] = [...this.fingers.values()];
			return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
		};
		const down = (e: PointerEvent) => {
			if (e.button !== 0 || this.looking) return;
			if (e.pointerType === 'touch') {
				this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
				if (this.fingers.size === 2) this.pinch = spread();
			}
			this.dragging = true;
			this.last = { x: e.clientX, y: e.clientY };
			this.inertia.set(0, 0);
			dom.setPointerCapture(e.pointerId);
		};
		const move = (e: PointerEvent) => {
			if (!this.dragging) return;
			if (this.fingers.has(e.pointerId)) this.fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
			// two fingers: spread them to come down, pinch them to rise
			if (this.fingers.size >= 2) {
				const now = spread();
				if (this.pinch && now) this.zoomTo(this.target * (this.pinch / now));
				this.pinch = now;
				return;
			}
			const dx = e.clientX - this.last.x, dy = e.clientY - this.last.y;
			this.last = { x: e.clientX, y: e.clientY };
			// at walking height a finger looks round; higher up it drags the ground
			if (e.pointerType === 'touch' && this.zoom < WALK) {
				this.heading += dx * SWIPE;
				this.lookPitch = Math.min(deg(70), Math.max(deg(-55), this.lookPitch - dy * SWIPE));
				return;
			}
			this.drag(dx, dy);
			this.inertia.set(dx, dy);
		};
		const up = (e: PointerEvent) => {
			if (this.fingers.delete(e.pointerId)) {
				this.pinch = 0;
				// the finger left after a pinch carries on from where it is
				const rest = [...this.fingers.values()][0];
				if (rest) {
					this.last = { ...rest };
					this.inertia.set(0, 0);
					return;
				}
			}
			if (!this.dragging) return;
			this.dragging = false;
			if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
			// a still click at walking height: the mouse takes the gaze
			const still = Math.hypot(e.clientX - this.last.x, e.clientY - this.last.y) < 6 && this.inertia.lengthSq() < 1;
			if (still && this.zoom < WALK && !this.looking && e.pointerType === 'mouse') {
				this.engaged = true;
				this.engage();
			}
		};
		const look = (e: MouseEvent) => {
			if (!this.looking) return;
			this.heading += e.movementX * LOOK;
			this.lookPitch = Math.min(deg(70), Math.max(deg(-55), this.lookPitch - e.movementY * LOOK));
			if (this.softLook) {
				const r = dom.getBoundingClientRect();
				this.stick.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
			}
		};
		const lockChange = () => this.show();
		const wheel = (e: WheelEvent) => {
			e.preventDefault();
			this.flight = null;
			this.zoomTo(this.target * Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0012)));
		};
		const typing = (e: KeyboardEvent) => e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]') != null;
		const keydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && this.softLook) this.letGo();
			if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
			if (KEYS.has(e.key)) {
				this.flight = null;
				this.keys.add(e.key);
				e.preventDefault();
			}
		};
		const keyup = (e: KeyboardEvent) => this.keys.delete(e.key);
		const blur = () => this.keys.clear();
		const on = <T extends EventTarget>(t: T, name: string, f: (e: any) => void, o?: AddEventListenerOptions) => {
			t.addEventListener(name, f, o);
			this.off.push(() => t.removeEventListener(name, f));
		};
		on(dom, 'pointerdown', down);
		on(dom, 'pointermove', move);
		on(dom, 'pointerup', up);
		on(dom, 'pointercancel', up);
		on(dom, 'wheel', wheel, { passive: false });
		on(document, 'mousemove', look);
		on(document, 'pointerlockchange', lockChange);
		on(window, 'keydown', keydown);
		on(window, 'keyup', keyup);
		on(window, 'blur', blur);
	}

	dispose() {
		if (this.dom) this.letGo();
		for (const f of this.off) f();
		this.off.length = 0;
	}
}
