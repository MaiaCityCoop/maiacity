const fineLeafMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: leaves("fine"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .7
})))();
