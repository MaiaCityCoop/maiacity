// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT A BUILD PLANTS — the assets a build names where they stand, drawn there by the page. A recipe cannot build
 * another asset in its box (it has nothing but its engine), but it can name one: a node of its build named
 * `use:<recipe hash>?its=values` (a build of play's catalog, ./builds.js) stands where that asset is to be, its
 * matrix where and how big. The page draws each such build there with the universal renderer (./render/index.js): built
 * in the asset box like any other, each kind at the level of detail its size on screen calls for, its far copies as
 * pictures. So a dome's food forest is play's own plants, named by their recipes' hashes, never copied into the dome:
 * a new version of the dome names newer plants; the plants it names stay as they were.
 *
 * Only a build of the catalog is drawn: a hash play doesn't hold (or a value its recipe doesn't take) is left out and
 * counted (`missing`), and the rest is drawn.
 */
import * as THREE from 'three';
import { createAssets } from './render/index.js';

/** a node's name that plants a build: `use:` and the build */
const USE = /^use:([0-9a-f]{64}(?:\?[A-Za-z0-9=&._%-]*)?)$/;

/** a copy put away: drawn nowhere until it is wanted again */
const AWAY = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Every build a build plants, with where: its nodes named `use:<build>`, each its build's name and its matrix in the
 * world (the build as it stands in the scene).
 * @param {THREE.Object3D} root @returns {{ ref: string, matrix: THREE.Matrix4 }[]}
 */
export function plantingsOf(root) {
	const out = [];
	root.updateMatrixWorld(true);
	root.traverse((o) => {
		const m = USE.exec(o.name ?? '');
		if (m) out.push({ ref: m[1], matrix: o.matrixWorld.clone() });
	});
	return out;
}

/**
 * The page's drawing of what the builds it shows plant, in `scene`: `show(root)` draws the root's plantings (and puts
 * away those of the build shown before), `update()` before every frame, `clear()`, `dispose()`.
 * @param {{ renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, boxes?: number }} o
 */
export function createPlantings(o) {
	/** @type {ReturnType<typeof createAssets> | null} made the first time a build plants something */
	let assets = null;
	/** the copies drawn now, and those put away for the next that wants one, by kind */
	let shown = [];
	const free = new Map();
	const state = { planted: 0, kinds: 0, missing: 0 };
	const renderer = () => {
		if (assets) return assets;
		const boxes = o.boxes ?? Math.max(1, Math.min(4, (globalThis.navigator?.hardwareConcurrency || 4) - 1));
		assets = createAssets({ renderer: o.renderer, camera: o.camera, boxes });
		o.scene.add(assets.group);
		return assets;
	};
	const putAway = () => {
		for (const c of shown) {
			assets.move(c, AWAY);
			let list = free.get(c.kind.key);
			if (!list) free.set(c.kind.key, (list = []));
			list.push(c);
		}
		shown = [];
	};
	return {
		state,
		/** the plantings of `root` drawn, those shown before put away; how many it plants and how many of them are missing */
		show(root) {
			const list = plantingsOf(root);
			if (assets) putAway();
			Object.assign(state, { planted: 0, kinds: 0, missing: 0 });
			if (!list.length) return state;
			const a = renderer();
			const kinds = new Map();
			for (const { ref, matrix } of list) {
				let k = kinds.get(ref);
				if (k === undefined) {
					try {
						k = a.use(ref, { shadows: true });
					} catch (e) {
						// a build the catalog doesn't hold: left out, the rest drawn
						console.warn(`not planted: ${ref.slice(0, 20)}… (${e?.message ?? e})`);
						k = null;
					}
					kinds.set(ref, k);
				}
				if (!k) {
					state.missing++;
					continue;
				}
				const c = free.get(k.key)?.pop();
				if (c) a.move(c, matrix);
				shown.push(c ?? a.place(k, matrix));
				state.planted++;
			}
			state.kinds = [...kinds.values()].filter(Boolean).length;
			return state;
		},
		/** every copy put away (a build that plants nothing shown, or none) */
		clear() {
			if (assets) putAway();
			Object.assign(state, { planted: 0, kinds: 0, missing: 0 });
		},
		/** what the camera sees drawn: before every frame */
		update() {
			if (assets && shown.length) assets.update();
		},
		/** whether what is planted is still being built (its kinds, their finer shapes, their pictures) */
		building: () => (assets ? assets.stats().building : 0),
		dispose() {
			assets?.dispose();
			assets?.group.removeFromParent();
			assets = null;
			shown = [];
			free.clear();
		}
	};
}
