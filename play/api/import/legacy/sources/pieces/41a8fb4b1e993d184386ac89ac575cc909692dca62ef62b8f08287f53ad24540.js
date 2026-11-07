}
/** a shape drawn in a side's plane, as (z, y) points, for `onX` @param {V2[]} pts zy points @returns {V2[]} */
const zy = (pts) => pts.map(([z, y]) => [-z, y]);
/** a plate drawn in (z, y) (by `zy`) turned to stand in the plane x = x0, its thickness along x @param {THREE.BufferGeometry} g @param {number} x0 */
const onX = (g, x0) => g.rotateY(Math.PI / 2).translate(x0, 0, 0);
/** a shape drawn as (x, z) points, for `onY` @param {V2[]} pts @returns {V2[]} */
const xz = (pts) => pts.map(([x, z]) => [x, -z]);
/** a plate drawn in (x, z) (by `xz`) laid flat at height y0 @param {THREE.BufferGeometry} g @param {number} y0 */
const onY = (g, y0) => g.rotateX(-Math.PI / 2).translate(0, y0, 0);
/**
* A solid of revolution about x through a closed [r, x, tag] profile at the angles given (radians, one turn, rising),
* each vertex's radius changed by `bump(r, x, ring, tag)`: a tyre's lugs. Corners sharper than 30° along the profile
* stay crisp (GEO.lathe's way); rings close together make crisp walls round it.
* @param {[number, number, number?][]} pts @param {number[]} angles @param {(r: number, x: number, ring: number, tag: number) => number} bump
