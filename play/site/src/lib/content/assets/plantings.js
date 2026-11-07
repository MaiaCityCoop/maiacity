// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT A BUILD PLANTS — the assets a build names where they stand, drawn there by the page, and the biomes it lays its
 * floors with. A recipe cannot build
 * another asset in its box (it has nothing but its engine), but it can name one: a node of its build named
 * `use:<recipe hash>?its=values` (a build of play's catalog, ./builds.js) stands where that asset is to be, its
 * matrix where and how big. The page draws each such build there with the universal renderer (./render/index.js): built
 * in the asset box like any other, each kind at the level of detail its size on screen calls for, its far copies as
 * pictures. So a dome's food forest is play's own plants, named by their recipes' hashes, never copied into the dome:
 * a new version of the dome names newer plants; the plants it names stay as they were.
 *
 * A world that moves (play/SPEC.md §4.11: a build kept running in the box, whose steps move its own `use:` nodes, its
 * traffic) is followed: each frame every such node's place is read again and its copy moved there, and a node hidden
 * (`visible` false, or under a hidden one) has its copy put away until it shows again. `guests()` lists them, each its
 * node, its copy and its kind, for the page's lights and sounds of a world ($lib/content/worlds).
 *
 * Only a build of the catalog is drawn: a hash play doesn't hold (or a value its recipe doesn't take) is left out and
 * counted (`missing`), and the rest is drawn.
 *
 * A floor the same way: a mesh of the build named `biome:<recipe hash>` (a dome's forest floor) is painted with that
 * biome's surfaces (its ground shader, $content/biomes `groundMaterial`, in place of the build's own stand-in) and its
 * cover (grasses, ferns, moss, fallen leaves) streamed round the eye over it, as the sandboxes stream it
 * (../sandbox-2/interior/cover.js): only where that mesh lies (its outline keeps the cover off the paths and the
 * water) and at its height there.
 */
import * as THREE from 'three';
import { createAssets } from './render/index.js';
import { cardOf } from './catalog.js';
import { groundMaterial, rowsOf } from '$lib/content/biomes/surfaces.js';
import { biomeOfCard } from '$lib/content/biomes/card.js';
import { createCover } from '$lib/content/sandbox-2/interior/cover.js';

/** a node's name that plants a build: `use:` and the build */
const USE = /^use:([0-9a-f]{64}(?:\?[A-Za-z0-9=&._%-]*)?)$/;

/** a mesh's name that lays a biome's floor on it: `biome:` and the biome's recipe hash */
const FLOOR = /^biome:([0-9a-f]{64})/;

/**
 * Where a floor lies and how high, from its meshes' triangles that face up, as a grid of `cell` m in the world:
 * `at(x, z)` its height there, NaN where it is not.
 * @param {THREE.Mesh[]} meshes
 */
export function floorGrid(meshes, cell = 0.25) {
	const box = new THREE.Box3();
	for (const m of meshes) box.expandByObject(m);
	const x0 = box.min.x, z0 = box.min.z;
	const nx = Math.ceil((box.max.x - x0) / cell) + 1, nz = Math.ceil((box.max.z - z0) / cell) + 1;
	const H = new Float32Array(nx * nz).fill(NaN);
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
	for (const m of meshes) {
		m.updateWorldMatrix(true, false);
		const pos = m.geometry.attributes.position, idx = m.geometry.index;
		const n = idx ? idx.count : pos.count;
		for (let t = 0; t < n; t += 3) {
			a.fromBufferAttribute(pos, idx ? idx.getX(t) : t).applyMatrix4(m.matrixWorld);
			b.fromBufferAttribute(pos, idx ? idx.getX(t + 1) : t + 1).applyMatrix4(m.matrixWorld);
			c.fromBufferAttribute(pos, idx ? idx.getX(t + 2) : t + 2).applyMatrix4(m.matrixWorld);
			// only what faces up is ground (not a bank's side)
			const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
			const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
			const len = Math.hypot(cx, cy, cz);
			if (!(len > 1e-9) || Math.abs(cy) / len < 0.4) continue;
			const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
			if (Math.abs(d) < 1e-12) continue;
			const i0 = Math.max(0, Math.ceil((Math.min(a.x, b.x, c.x) - x0) / cell)), i1 = Math.min(nx - 1, Math.floor((Math.max(a.x, b.x, c.x) - x0) / cell));
			const j0 = Math.max(0, Math.ceil((Math.min(a.z, b.z, c.z) - z0) / cell)), j1 = Math.min(nz - 1, Math.floor((Math.max(a.z, b.z, c.z) - z0) / cell));
			for (let j = j0; j <= j1; j++)
				for (let i = i0; i <= i1; i++) {
					const x = x0 + i * cell, z = z0 + j * cell;
					const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
					const l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
					const l3 = 1 - l1 - l2;
					if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
					const y = l1 * a.y + l2 * b.y + l3 * c.y;
					const k = j * nx + i;
					if (!(H[k] >= y)) H[k] = y;
				}
		}
	}
	return {
		at(x, z) {
			const i = Math.round((x - x0) / cell), j = Math.round((z - z0) / cell);
			return i < 0 || j < 0 || i >= nx || j >= nz ? NaN : H[j * nx + i];
		}
	};
}

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
		if (m) out.push({ ref: m[1], matrix: o.matrixWorld.clone(), node: o });
	});
	return out;
}

/** whether a node is drawn: it and every node above it visible */
export function shownIn(o) {
	for (let x = o; x; x = x.parent) if (!x.visible) return false;
	return true;
}

/**
 * The page's drawing of what the builds it shows plant, in `scene`: `show(root)` draws the root's plantings (and puts
 * away those of the build shown before), `update()` before every frame, `clear()`, `dispose()`. Every guest is drawn
 * by its card's levels and the one selector (render/lod.js), as everywhere; `shadows`: told when what
 * casts a shadow changed, for a world that draws its shadows again only every so often (render/index.js `onShadows`;
 * without it, the shadows are drawn again with the next frame).
 * @param {{ renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, boxes?: number, shadows?: () => void }} o
 */
export function createPlantings(o) {
	/** @type {ReturnType<typeof createAssets> | null} made the first time a build plants something */
	let assets = null;
	/** the copies drawn now, and those put away for the next that wants one, by kind */
	let shown = [];
	const free = new Map();
	/** each node of a moving build (one kept running in the box) and its copy: followed every frame */
	/** @type {{ node: THREE.Object3D, copy: any, kind: any, ref: string, at: Float32Array, away: boolean }[]} */
	let guests = [];
	let moving = false;
	/** which build is shown: a floor read late lays only on the build it was asked for */
	let generation = 0;
	/** the biomes' cover streamed over the floors of the build shown */
	let covers = [];
	const state = { planted: 0, kinds: 0, missing: 0, floors: 0 };
	const renderer = () => {
		if (assets) return assets;
		const boxes = o.boxes ?? Math.max(1, Math.min(4, (globalThis.navigator?.hardwareConcurrency || 4) - 1));
		assets = createAssets({ renderer: o.renderer, camera: o.camera, boxes, onShadows: o.shadows });
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
		guests = [];
	};
	/** a moving build's guests, each moved where its node stands now (put away while its node is hidden) */
	const follow = () => {
		for (const g of guests) {
			const away = !shownIn(g.node);
			if (away) {
				if (!g.away) (g.away = true), assets.move(g.copy, AWAY);
				continue;
			}
			g.node.updateWorldMatrix(true, false);
			const e = g.node.matrixWorld.elements;
			let same = !g.away;
			for (let i = 0; same && i < 16; i++) same = g.at[i] === e[i];
			if (same) continue;
			g.at.set(e);
			g.away = false;
			assets.move(g.copy, g.node.matrixWorld);
		}
	};
	/** the renderer as a sandbox's cover asks for it (./sandbox-2/interior/drawn.js): kinds used, copies taken and given */
	const drawn = {
		use: (ref, shadows, picture) => renderer().use(ref, { shadows, picture }),
		take(k, at) {
			const c = free.get(k.key)?.pop();
			if (!c) return assets.place(k, at);
			assets.move(c, at);
			return c;
		},
		move: (c, at) => assets.move(c, at),
		give(c) {
			assets.move(c, AWAY);
			let list = free.get(c.kind.key);
			if (!list) free.set(c.kind.key, (list = []));
			list.push(c);
		}
	};
	/** each floor of `root` named for a biome: its surfaces painted, its cover streamed over it */
	const lay = (root) => {
		const floors = new Map();
		root.traverse((o) => {
			const m = o.isMesh ? FLOOR.exec(o.name ?? '') : null;
			if (!m) return;
			if (!floors.has(m[1])) floors.set(m[1], []);
			floors.get(m[1]).push(o);
		});
		for (const [hash, meshes] of floors) {
			let recipe;
			try {
				recipe = biomeOfCard(cardOf(hash));
			} catch (e) {
				// the catalog's card names no floor (a biome proposed over MCP: play keeps no catalog for it): its own build's
				// card does, the box made it from its recipe (play/SPEC.md §4.11). Its floor laid once that is here
				const shown = generation;
				renderer()
					.load(hash)
					.then((got) => {
						if (shown !== generation) return;
						floor(hash, meshes, biomeOfCard(got.card));
					})
					.catch((e2) => {
						// a biome the catalog doesn't hold, or whose build says no floor: the build's own floor stays
						console.warn(`no floor laid: ${hash.slice(0, 12)}… (${e2?.message ?? e?.message ?? e2})`);
						if (shown === generation) state.missing++;
					});
				continue;
			}
			floor(hash, meshes, recipe);
		}
	};
	/** a biome's floor laid on its meshes: its surfaces painted, its cover streamed over them */
	const floor = (hash, meshes, recipe) => {
		// the way its rows run (a field's furrows and its crop): `rows:<deg>` in the mesh's name, else the mesh's own +x
		const rows = rowsOf(meshes[0]);
		const ground = groundMaterial(recipe.surface, { rows, tramlines: recipe.tramlines });
		for (const m of meshes) m.material = ground;
		const grid = floorGrid(meshes);
		renderer();
		covers.push(
			createCover({
				drawn,
				recipe,
				open: (x, z) => !Number.isNaN(grid.at(x, z)),
				heightAt: (x, z) => grid.at(x, z) || 0,
				tile: 8,
				reach: 24,
				near: 9,
				thin: 0.25,
				// as dense as the biome is near the eye: a viewer shows one floor, not a village of them
				density: recipe.density,
				seed: 707,
				rows
			})
		);
		state.floors++;
	};
	return {
		state,
		/** the plantings of `root` drawn, those shown before put away; how many it plants and how many of them are missing */
		show(root) {
			const list = plantingsOf(root);
			generation++;
			for (const c of covers.splice(0)) c.dispose();
			if (assets) putAway();
			Object.assign(state, { planted: 0, kinds: 0, missing: 0, floors: 0 });
			// a build kept running in the box moves what it plants: each node followed (play/SPEC.md §4.11)
			moving = root.userData?.view?.ticks === true;
			lay(root);
			if (!list.length) return state;
			const a = renderer();
			const kinds = new Map();
			for (const { ref, matrix, node } of list) {
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
				const away = !shownIn(node);
				if (c) a.move(c, away ? AWAY : matrix);
				const copy = c ?? a.place(k, away ? AWAY : matrix);
				shown.push(copy);
				guests.push({ node, copy, kind: k, ref, at: new Float32Array(matrix.elements), away });
				state.planted++;
			}
			state.kinds = [...kinds.values()].filter(Boolean).length;
			return state;
		},
		/** every copy put away (a build that plants nothing shown, or none) */
		clear() {
			generation++;
			for (const c of covers.splice(0)) c.dispose();
			if (assets) putAway();
			Object.assign(state, { planted: 0, kinds: 0, missing: 0, floors: 0 });
		},
		/** what the camera sees drawn: before every frame (the floors' cover gathered round where it is) */
		update() {
			if (moving && assets) follow();
			for (const c of covers) c.update(o.camera.position.x, o.camera.position.z);
			if (assets && (shown.length || covers.length)) assets.update();
		},
		/** every copy drawn now, with the node it stands at, its kind and its build (a world's lights and sounds read them) */
		guests: () => guests,
		/** the renderer drawing them (none until the first build plants something) */
		get assets() {
			return assets;
		},
		/** whether what is planted is still being built (its kinds, their finer shapes, their pictures) */
		building: () => (assets ? assets.stats().building : 0),
		dispose() {
			for (const c of covers.splice(0)) c.dispose();
			assets?.dispose();
			assets?.group.removeFromParent();
			assets = null;
			shown = [];
			guests = [];
			free.clear();
		}
	};
}
