	return GEO.merge(out);
}
/** a shape for a side panel from (z, y) points, its corners rounded @param {V2[]} pts @param {number | number[]} r */
const zyShape = (pts, r) => roundPoly(zy(pts), r);
/** a hole in a side panel from (z, y) points @param {V2[]} pts @param {number | number[]} r */
const zyHole = (pts, r) => roundHole(zy(pts), r);
