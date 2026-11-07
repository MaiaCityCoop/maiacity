//#piece 6832cce98bc8fc7f3dfda3350e586e18d7546f7f765dd0334a4c87471bc96981
//#piece 4a9e272606a5382fcbfc72f3ee9e5bf260f995e219c61966ffd31a7cb7e95bb7
	return best;
}
/** @typedef {(u: number, v: number) => THREE.Color} LeafPaint */
/** a leaf's blade, built along +X from where its stalk meets it, its face up, set by `m` @typedef {(bag: Bag, m: THREE.Matrix4, len: number, paint: LeafPaint) => void} Blade */
/**
* A palmately lobed blade (a currant's, a gooseberry's): a fan from the stalk, its edge reaching out to each of five
* lobes' tips and back into the notches between, the two basal lobes reaching back beside the stalk. Its rays fall on
* the tips and the notches, so ten of them draw it.
* @param {number} side the side lobes' reach against the middle one's @param {number} basal the basal lobes'
* @param {number} deep how far the notches cut in
* @returns {Blade}
*/
