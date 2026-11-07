	if (sh.end && L.tuft && !bears) for (let k = 0; k < L.tuft; k++) leaf(sh.tip, across(sh.dir, k * 2.39996 + lr()).multiplyScalar(.6).addScaledVector(sh.dir, 1));
}
/** a leaf's own size, give or take */
const vigourOf = (r) => about(r, 1, .06);
/**
* A compound leaf: a rachis, leaflets in pairs along it, one at its end (the elder's five or seven).
* @param {Bag} bag @param {Leaf} L @param {() => number} r @param {THREE.Vector3} at @param {THREE.Vector3} dir
* @param {number} len @param {(u: number, v: number) => THREE.Color} paint @param {number} grown
*/
