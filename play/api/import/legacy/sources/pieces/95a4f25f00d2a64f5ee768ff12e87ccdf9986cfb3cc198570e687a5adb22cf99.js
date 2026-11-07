const fine = (n, least) => Math.max(least, Math.round(n * DETAIL$1));
/** Build with coarser shapes — the same actor, a fraction of its vertices, for drawing far off. */
function lowDetail(build, detail = .45) {
	const was = DETAIL$1;
	DETAIL$1 = detail;
	try {
		return build();
	} finally {
		DETAIL$1 = was;
