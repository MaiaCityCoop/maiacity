/** a hose, a pipe or a rope through points @param {V3[]} pts @param {number} r @param {number} [radial] */
const hose = (pts, r, radial = 12) => GEO.pipe(pts, r, {
	seg: Math.max(16, pts.length * 10),
	radial,
	tension: .5
});
/** one hex head at a point, its axis along `dir` @param {V3} p @param {V3} dir @param {number} s @param {number} h */
function hex(p, dir, s, h) {
//#piece 20e4dcd1a8cf31f41ebdfe6d7dedc4af77f24f1366f842cb83bd3c32d401534c
	return g.translate(...p);
