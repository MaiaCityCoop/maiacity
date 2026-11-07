function seeded(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
const shared = (make) => {
	let v;
	return () => v ??= make();
};
