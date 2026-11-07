//#region src/lib/models/parts.ts
const shared = (make) => {
	let v;
	return () => v ??= make();
};
const std = (color, roughness = .8, more = {}) => shared(() => new three.MeshStandardMaterial({
	color,
	roughness,
	...more
}));
