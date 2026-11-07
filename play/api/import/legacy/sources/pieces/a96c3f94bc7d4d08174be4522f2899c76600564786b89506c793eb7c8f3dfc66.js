const more = /* @__PURE__ */ (() => ({
	apple: shared(() => new three.MeshStandardMaterial({
		color: "#c23b2a",
		roughness: .5
	})),
	nut: shared(() => new three.MeshStandardMaterial({
		color: "#7b5a2e",
		roughness: .8
	})),
	berry: shared(() => new three.MeshStandardMaterial({
		color: "#5b1f3d",
		roughness: .5
	})),
	redBerry: shared(() => new three.MeshStandardMaterial({
		color: "#c8283a",
		roughness: .5
	})),
	flower: shared(() => new three.MeshStandardMaterial({
		color: "#9b7fd1",
		roughness: .7
	})),
	clover: shared(() => new three.MeshStandardMaterial({
		color: "#f4f1e8",
		roughness: .8
	})),
	pumpkin: shared(() => new three.MeshStandardMaterial({
		color: "#e0821f",
		roughness: .6
	})),
	grape: shared(() => new three.MeshStandardMaterial({
		color: "#4a2a5e",
		roughness: .4
	})),
	pole: shared(() => new three.MeshStandardMaterial({
		color: "#8a6a45",
		roughness: .9
	})),
	bigLeaf: shared(() => new three.MeshStandardMaterial({
		color: "#4f8a38",
		roughness: .6,
		side: three.DoubleSide
	}))
}))();
