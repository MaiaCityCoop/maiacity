	papaya: shared(() => new three.MeshStandardMaterial({
		color: "#e9a23b",
		roughness: .5
	})),
	papayaGreen: shared(() => new three.MeshStandardMaterial({
		color: "#7fa13a",
		roughness: .5
	})),
	fig: shared(() => new three.MeshStandardMaterial({
		color: "#5a2d4a",
		roughness: .6
	})),
	pomegranate: shared(() => new three.MeshStandardMaterial({
		color: "#b3242e",
		roughness: .45
	})),
	cacao: shared(() => new three.MeshStandardMaterial({
		color: "#c7812e",
		roughness: .6
	})),
	passion: shared(() => new three.MeshStandardMaterial({
		color: "#4b2551",
		roughness: .5
	})),
	strawberry: shared(() => new three.MeshStandardMaterial({
		color: "#d8253a",
		roughness: .45
	})),
	lettuce: shared(() => new three.MeshStandardMaterial({
		color: "#9ccc5a",
		roughness: .7,
		side: three.DoubleSide
	})),
	lettuceRed: shared(() => new three.MeshStandardMaterial({
		color: "#8a3f4a",
		roughness: .7,
		side: three.DoubleSide
	})),
	radish: shared(() => new three.MeshStandardMaterial({
		color: "#d2385a",
		roughness: .5
	})),
	kale: shared(() => new three.MeshStandardMaterial({
		color: "#3f6b4a",
		roughness: .8,
		side: three.DoubleSide
	})),
	tomato: shared(() => new three.MeshStandardMaterial({
		color: "#d93a26",
		roughness: .35
	})),
	cucumber: shared(() => new three.MeshStandardMaterial({
		color: "#3f6b2a",
		roughness: .5
	})),
	pepperRed: shared(() => new three.MeshStandardMaterial({
		color: "#c8221c",
		roughness: .3
	})),
	pepperYellow: shared(() => new three.MeshStandardMaterial({
		color: "#f0c22b",
		roughness: .3
	})),
	aubergine: shared(() => new three.MeshStandardMaterial({
		color: "#3a1d3f",
		roughness: .25
	})),
	bean: shared(() => new three.MeshStandardMaterial({
		color: "#6c9a35",
		roughness: .5
	})),
	chard: [
		shared(() => new three.MeshStandardMaterial({
			color: "#c8323f",
			roughness: .6
		})),
		shared(() => new three.MeshStandardMaterial({
			color: "#e7b830",
			roughness: .6
		})),
		shared(() => new three.MeshStandardMaterial({
			color: "#f1ecd9",
			roughness: .6
		}))
	],
	chardLeaf: shared(() => new three.MeshStandardMaterial({
		color: "#2f5a2a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stake: shared(() => new three.MeshStandardMaterial({
		color: "#b89a64",
		roughness: .9
	})),
	net: shared(() => new three.MeshStandardMaterial({
		color: "#e8e2d0",
		transparent: true,
		opacity: .35,
		side: three.DoubleSide,
		depthWrite: false
	})),
	olive: shared(() => new three.MeshStandardMaterial({
		map: leaves("fine"),
		color: "#c9d3b4",
		alphaTest: .45,
		side: three.DoubleSide,
		roughness: .8
	})),
	oliveFruit: shared(() => new three.MeshStandardMaterial({
		color: "#3c3a22",
		roughness: .4
	})),
	lavender: shared(() => new three.MeshStandardMaterial({
		color: "#8f74c9",
		roughness: .8
	})),
	sage: shared(() => new three.MeshStandardMaterial({
		color: "#7d9170",
		roughness: .8
	})),
	terracotta: shared(() => new three.MeshStandardMaterial({
		color: "#c0663f",
		roughness: .9
	}))
}))();
/** A low-poly ball for the small fruit, so a garden of them stays light once baked. */
const small = /* @__PURE__ */ (() => shared(() => new three.IcosahedronGeometry(1, 1)))();
