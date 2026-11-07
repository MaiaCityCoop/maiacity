	return g;
}
/** Finish a container: what walks it, and the handles a world (or the viewer) needs. */
/** @param {ReturnType<typeof box>} b */
function done(b) {
	b.g.userData.roof = b.roof;
	b.g.userData.walk = walkway(b.solids, b.lamps);
	return b.g;
}
/**
