const leafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: leaves("broad"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .6
})))();
