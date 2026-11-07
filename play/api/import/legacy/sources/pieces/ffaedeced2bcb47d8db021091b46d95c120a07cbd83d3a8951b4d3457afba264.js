const shared = (make) => {
	let v;
	return () => v ??= make();
};
/** Lazure plaster: warm white, peach, rose, sage, ochre. */
const PLASTER = /* @__PURE__ */ (() => [
	"#efe4d2",
	"#ecd1b8",
	"#e3c1b4",
	"#cfd8bf",
	"#ead6a8"
].map((c) => shared(() => new three.MeshStandardMaterial({
	color: c,
	roughness: .96,
	side: three.DoubleSide
}))))();
//#piece 2dc69caa27b48fd104c073c0046a4c9f527790361f4e37ea9758020b38c1bf48
