//#piece 7e2ffd3c1d0ec95b203151b2a9763d4eee5d3d6eb478f9f391b39bf42dd07255
	return pts;
}
/** the quaternion that turns +Y to `d` */
const upTo = (d) => new three.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
