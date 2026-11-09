/**
 * SANDBOX 6 · THE WORLD — the village raised in a page's stage: the kit's renderer and sky, the map camera over the
 * seven hexes, and the village built from its config (./scene.ts). Answers WorldPage's `move`, `look` and `dispose`.
 */
import * as THREE from 'three';
import { createOrbitRig, createSky, createStage, disposeObject } from '$lib/content/sandbox-kit';
import type { Village } from './geometry';
import { buildVillage } from './scene';

export async function mountVillage(stage: HTMLDivElement, onProgress: (label: string) => void, village: Village) {
	onProgress('Laying out the seven hexes');
	const world = createStage(stage, { far: 6000 });
	const { renderer, scene, camera } = world;
	const sky = createSky(renderer, scene, { shadowReach: 1600, fog: { far: 5200 }, map: true });
	onProgress('Painting the land and raising the domes');
	const built = buildVillage(village);
	scene.add(built.root);
	const reach = village.hex.flats * 1.6;
	camera.position.set(0, reach * 0.9, reach * 1.1);
	const rig = createOrbitRig(camera, renderer.domElement, { minDistance: 30, maxDistance: reach * 3, target: new THREE.Vector3(0, 0, 0), moveSpeed: 60 });
	onProgress('ready');
	let last = performance.now(), live = true;
	renderer.setAnimationLoop((now: number) => {
		if (!live) return;
		rig.update((now - last) / 1000);
		last = now;
		sky.tick(now);
		world.adapt(now);
		renderer.render(scene, camera);
	});
	return {
		move: (x: number, y: number, hurry: boolean) => rig.move(x, y, hurry),
		look: () => {},
		dispose() {
			live = false;
			renderer.setAnimationLoop(null);
			rig.dispose();
			sky.dispose();
			built.dispose();
			disposeObject(scene);
			world.dispose();
		}
	};
}
