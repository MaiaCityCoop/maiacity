// @ts-nocheck — plain JS, trusted: runs in the page and in a story's frame
/*
 * WHAT A BUILD PLANTS, READ OFF IT — its nodes named `use:<recipe hash>?its=values`, each where that build is to stand
 * (./plantings.js draws them on a page; a story's world shot, ../../stories/live-runtime.ts, in its frame). Only three.js:
 * nothing here loads or draws.
 */
/** a node's name that plants a build: `use:` and the build */
export const USE = /^use:([0-9a-f]{64}(?:\?[A-Za-z0-9=&._%-]*)?)$/;

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

