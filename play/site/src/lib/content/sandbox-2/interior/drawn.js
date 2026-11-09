/*
 * DRAWN BY THE RENDERER — the asset library in a world's scene ($content/assets/render): each asset built in the box
 * and drawn as copies of its kind, copies let go of kept for the next that wants that kind. The world decides where a
 * copy stands; the renderer how it is drawn, by its card's levels and its one selector (assets/render/lod.js).
 * `createDrawn` for Things and the biomes' cover; `createFlora` for a forest of our plants (./flora.js).
 */
import * as THREE from 'three';
import { createAssets } from '$lib/content/assets/render/index.js';
import { STREAMS } from './flora.js';

/**
 * A renderer of assets in `scene`, its copies kept for the next that wants one.
 * @param {{
 *   renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, boxes?: number, shadows?: () => void
 * }} o `boxes` how many build side by side; `shadows`: told when what casts a shadow changed, instead of the shadows
 *   drawn again
 */
export function createDrawn(o) {
	const assets = createAssets({ renderer: o.renderer, camera: o.camera, boxes: o.boxes, onShadows: o.shadows });
	o.scene.add(assets.group);
	return {
		assets,
		/**
		 * A kind: its shadows cast at every level (true), at none (false), or as the renderer casts them; and its picture
		 * taken, for far off (unless `picture` is false: a kind never drawn so small).
		 * @param {string} ref @param {boolean} [shadows] @param {boolean} [picture]
		 */
		use: (ref, shadows, picture) => assets.use(ref, { shadows, picture }),
		/**
		 * a copy of kind k standing at `at` (a place or a whole matrix): one put away if there is one; `cover`: grown as
		 * a biome's cover ($content/biomes/stream.js)
		 * @param {any} k @param {{ x: number, y: number, z: number, turn: number, scale: number } | THREE.Matrix4} at
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
 * The renderer a world's plants are drawn by (./flora.js). Its boxes as many as the workers Sandbox 4 always grew its
 * forest in.
 * `streams`: how far off its small plants are put down at all (./flora.js STREAMS: the village's, or under a dome's glass).
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
		 * How far off a small plant of kind k (a shrub or the cover, `r`) is put down: as far as the forest streams its
		 * kind, and never past where the selector (its last threshold, assets/render/lod.js) would draw its picture: a small
		 * plant, which has none, is left out past it (`Forest.update`).
		 * @param {any} k a kind of the renderer's
		 */
		far: (k, r) => Math.min(streams[r], k.radius / (k.thresholds[k.thresholds.length - 1] * tanOf(o.camera)))
	};
}
