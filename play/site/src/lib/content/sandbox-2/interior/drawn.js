/*
 * DRAWN BY THE RENDERER — what a sandbox draws of the asset library: a universal renderer ($content/assets/render) in a
 * world's scene, every asset built in the asset box and drawn as copies of its kind, copies a part of the world lets go
 * kept for the next that wants that kind, so a world that comes and goes as you walk adds none. The world decides
 * where each stands; the renderer how each is drawn (its level per frame, nothing behind the eye) and when shadows are
 * drawn again (or `shadows` tells the world). `createDrawn` for Things and biome cover, `createFlora` for a forest of our
 * plants (./flora.js); every kind by its card's levels and the one selector (../../assets/render/lod.js).
 */
import * as THREE from 'three';
import { createAssets } from '$lib/content/assets/render/index.js';
import { STREAMS } from './flora.js';

/**
 * A renderer of assets in `scene`, its copies kept for the next that wants one.
 * @param {{
 *   renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, boxes?: number, shadows?: () => void
 * }} o `boxes` how many build side by side; `shadows`: told when a caster changed, instead of redrawing the shadows
 */
export function createDrawn(o) {
	const assets = createAssets({ renderer: o.renderer, camera: o.camera, boxes: o.boxes, onShadows: o.shadows });
	o.scene.add(assets.group);
	return {
		assets,
		/**
		 * A kind: shadows at every level (true), none (false) or as the renderer casts them; its picture taken for far
		 * off unless `picture` is false. @param {string} ref @param {boolean} [shadows] @param {boolean} [picture]
		 */
		use: (ref, shadows, picture) => assets.use(ref, { shadows, picture }),
		/**
		 * a copy of kind k at `at` (place or matrix), a put-away one where there is; `cover`: grown as a biome's cover
		 * ($content/biomes/stream.js) @param {any} k @param {{ x: number, y: number, z: number, turn: number, scale: number } | THREE.Matrix4} at
		 * @param {{ rank: number, near: number, reach: number, thin: number } | null} [cover]
		 */
		take: (k, at, cover) => assets.take(k, at, cover),
		/** a copy moved @param {{ kind: any, i: number }} c @param {{ x: number, y: number, z: number, turn: number, scale: number } | THREE.Matrix4} at */
		move: (c, at) => assets.move(c, at),
		/** a copy put away: drawn nowhere until it is taken again @param {{ kind: any, i: number }} c */
		give: (c) => assets.give(c),
		/** draws what the camera sees: before every frame */
		update: () => assets.update(),
		/** waits for every kind asked for so far to be ready to draw (or to have failed) */
		ready: () => assets.ready(),
		/** nothing is being built for it (its kinds, their finer shapes, their pictures) */
		settled: () => assets.stats().building === 0,
		dispose: () => assets.dispose()
	};
}
/** @typedef {ReturnType<typeof createDrawn>} Drawn */

/** tan of half the camera's view, up and down @param {THREE.PerspectiveCamera} camera */
const tanOf = (camera) => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (camera.zoom || 1);

/**
 * The renderer a world's plants are drawn by (./flora.js), as many boxes as Sandbox 4 always grew its forest in;
 * `streams`: how far off small plants are put down (./flora.js STREAMS: the village's, or under a dome).
 * @param {{ renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, boxes?: number, shadows?: () => void, streams?: import('./flora.js').Streams }} o
 * @returns {import('./flora.js').FloraDrawn & ReturnType<typeof createDrawn>}
 */
export function createFlora(o) {
	const streams = o.streams ?? STREAMS.village;
	const boxes = o.boxes ?? Math.max(1, Math.min(6, (globalThis.navigator?.hardwareConcurrency || 4) - 1));
	const drawn = createDrawn({ renderer: o.renderer, camera: o.camera, scene: o.scene, boxes, shadows: o.shadows });
	return {
		...drawn,
		/**
		 * How far off a small plant of kind k (`r` shrub or cover) is put down: as far as its kind streams, never past
		 * the selector's last threshold (../../assets/render/lod.js), past which it, having no picture, is left out.
		 * @param {any} k a kind of the renderer's
		 */
		far: (k, r) => Math.min(streams[r], k.radius / (k.thresholds[k.thresholds.length - 1] * tanOf(o.camera)))
	};
}
