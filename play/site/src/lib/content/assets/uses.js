// @ts-nocheck — plain JS, trusted: runs in the page and in a story's frame
/*
 * WHAT A BUILD PLANTS, READ OFF IT — its `use:<recipe hash>?its=values` nodes, each where that build stands (drawn by
 * ./plantings.js on a page, ../../stories/live-runtime.ts in a story's frame). Only three.js: nothing loads or draws.
 */
import { HEX } from '../../kernel/hash.js';

/** a node's name that plants a build: `use:` and the build */
export const USE = new RegExp(`^use:(${HEX}(?:\\?[A-Za-z0-9=&._%-]*)?)$`);

/** Every build a build plants: its `use:<build>` nodes, each the build's name and its world matrix (as it stands).
 * @param {THREE.Object3D} root @returns {{ ref: string, matrix: THREE.Matrix4, node: THREE.Object3D }[]} */
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

