// The visitor's body in a world walked first person (Sandboxes 1 and 2): the stand-in with this visit's random look
// ($lib/character.ts), built by the asset box and moved as legacy V2 moves its people ($lib/content/maiacity-v2/drawn.js
// `actor`): its walk clip stepped by the distance walked, its idle when it stands. The camera is pulled back behind and
// above it, so you see who you are.
import * as THREE from 'three';
import { createDrawn } from '$lib/content/maiacity-v2/drawn.js';
import { standInRef, WALK_CYCLE } from '$lib/content/maiacity-v2/things.js';
import { randomCharacter, type Character } from './character';

/** the stand-in's walk clip covers this many metres a round of it (legacy V2's CLIP_PACE) */
const CLIP_PACE = 1.27;
/** how far behind and above the eye the camera rides, metres */
export const FOLLOW = { back: 3.2, up: 0.55 };

export type Pose = { x: number; feet: number; z: number; yaw: number; pitch: number };

export function createAvatar(
	o: { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; scene: THREE.Scene; follow?: { back: number; up: number } },
	character: Character = randomCharacter()
) {
	const follow = o.follow ?? FOLLOW;
	const drawn = createDrawn(o);
	const body = new THREE.Group();
	body.name = 'you';
	o.scene.add(body);
	const cast: any = drawn.actor(standInRef(character.height, character.look), body, { shadow: true, receive: false, cycles: { walk: WALK_CYCLE } });
	let walked = 0;
	let t = 0;
	let speed = 0;
	let last: { x: number; z: number } | null = null;
	const back = new THREE.Vector3();

	return {
		character,
		body,
		/** every frame, after the walker moved: the body to where the walker stands, the camera behind it */
		update(dt: number, at: Pose, camera: THREE.PerspectiveCamera) {
			t += dt;
			if (last) {
				const d = Math.hypot(at.x - last.x, at.z - last.z);
				if (d < 1) walked += d; // a jump (a door, a place) is no step
				speed = dt > 0 ? THREE.MathUtils.lerp(speed, d / dt, 0.3) : speed;
			}
			last = { x: at.x, z: at.z };
			body.position.set(at.x, at.feet, at.z);
			// the walker's yaw 0 looks along -z; a person faces +z at rotation 0
			body.rotation.y = at.yaw + Math.PI;
			if (cast.ready) cast.rig.pose(speed > 0.25 ? cast.clips.walk(walked / CLIP_PACE) : (cast.clips.idle?.(t) ?? cast.poses.stand ?? {}));
			// the camera behind the shoulders, looking where the walker looks
			back.set(Math.sin(at.yaw), 0, Math.cos(at.yaw)).multiplyScalar(follow.back);
			camera.position.add(back);
			camera.position.y += follow.up;
			drawn.update();
		},
		ready: () => drawn.ready(),
		dispose() {
			drawn.dispose();
			o.scene.remove(body);
		}
	};
}
