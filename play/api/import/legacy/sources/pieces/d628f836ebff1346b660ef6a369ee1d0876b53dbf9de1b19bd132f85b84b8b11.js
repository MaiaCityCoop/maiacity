//#piece db3009f0a720fb22303a6892b2275d8eea4359f3d3c1da0103725837c70d2ff7
const barkMat = /* @__PURE__ */ (() => shared(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
