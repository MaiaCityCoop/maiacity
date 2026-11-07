const awnings = /* @__PURE__ */ (() => [
	"#c9623f",
	"#6f8f6a",
	"#e3cfa6",
	"#3f6f7a"
].map((c) => new three.MeshStandardMaterial({
	color: c,
	roughness: .9,
	side: three.DoubleSide
})))();
