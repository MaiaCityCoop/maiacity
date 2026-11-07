	const A = new three.Vector3(...a), B = new three.Vector3(...b), len = A.distanceTo(B);
	const g = GEO.disc(r, len, Math.min(r, len) * .06, seg);
//#piece 0b342ef83a20f3f38285d68455f21743ce0c9eaff4752a9c3dd7760428f01f75
