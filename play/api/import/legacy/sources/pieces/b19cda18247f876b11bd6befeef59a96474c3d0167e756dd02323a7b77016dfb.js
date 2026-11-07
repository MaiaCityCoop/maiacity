//#piece a8c19223dbbc87a77381d99bc8de47c903afe7fd23dd1ef2e6ad933d87b300f0
//#piece b41e62a461130b54c6ed9a44ae81b3888a985504387f0a971ddfddab27d7fa65
//#region src/lib/sandbox-2/interior/textures.ts
//#piece b9d81bcfb7a527fcb052eeba0256ac0c6e973c0d03aee3cf711f8a6282878803
*/
//#piece e8eafcbde186547c476254737cd7ee1bcbf4fde921e4493d8cc75b1bce9903c8
*/
function seeded(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}
const shared$1 = (make) => {
	let v;
	return () => v ??= make();
};
const barkMat = /* @__PURE__ */ (() => shared$1(() => new three.MeshStandardMaterial({
	map: bark(),
	roughness: .95
})))();
const fineLeafMat = /* @__PURE__ */ (() => shared$1(() => new three.MeshStandardMaterial({
	map: leaves("fine"),
	alphaTest: .45,
	side: three.DoubleSide,
	roughness: .7
})))();
const card = /* @__PURE__ */ (() => shared$1(() => new three.PlaneGeometry(1, 1)))();
const trunkGeo = /* @__PURE__ */ (() => shared$1(() => new three.CylinderGeometry(.7, 1, 1, 8, 1).translate(0, .5, 0)))();
const sphere = /* @__PURE__ */ (() => shared$1(() => {
//#piece 9ad9d28b58ac4759d3a8cb2a212e5115edc37023cf2657b550942b09facd309e
const fruit = /* @__PURE__ */ (() => ({
	mango: shared$1(() => new three.MeshStandardMaterial({
		color: "#e7a13a",
		roughness: .45
	})),
	mangoRipe: shared$1(() => new three.MeshStandardMaterial({
		color: "#d9622f",
		roughness: .45
	})),
	avocado: shared$1(() => new three.MeshStandardMaterial({
		color: "#3c5a22",
		roughness: .7
	})),
	orange: shared$1(() => new three.MeshStandardMaterial({
		color: "#f39c1f",
		roughness: .5
	})),
	lemon: shared$1(() => new three.MeshStandardMaterial({
		color: "#f2d43d",
		roughness: .5
	})),
	coconut: shared$1(() => new three.MeshStandardMaterial({
		color: "#6b4a2a",
		roughness: .85
	})),
	banana: shared$1(() => new three.MeshStandardMaterial({
//#piece e32ee2e01e3932a67cf887848ff8b4e5027444276cf82829e0d69c6acb9b8f3e
	papaya: shared$1(() => new three.MeshStandardMaterial({
		color: "#e9a23b",
		roughness: .5
	})),
	papayaGreen: shared$1(() => new three.MeshStandardMaterial({
		color: "#7fa13a",
		roughness: .5
	})),
	fig: shared$1(() => new three.MeshStandardMaterial({
		color: "#5a2d4a",
		roughness: .6
	})),
	pomegranate: shared$1(() => new three.MeshStandardMaterial({
		color: "#b3242e",
		roughness: .45
	})),
	cacao: shared$1(() => new three.MeshStandardMaterial({
		color: "#c7812e",
		roughness: .6
	})),
	passion: shared$1(() => new three.MeshStandardMaterial({
		color: "#4b2551",
		roughness: .5
	})),
	strawberry: shared$1(() => new three.MeshStandardMaterial({
		color: "#d8253a",
		roughness: .45
	})),
	lettuce: shared$1(() => new three.MeshStandardMaterial({
		color: "#9ccc5a",
		roughness: .7,
		side: three.DoubleSide
	})),
	lettuceRed: shared$1(() => new three.MeshStandardMaterial({
		color: "#8a3f4a",
		roughness: .7,
		side: three.DoubleSide
	})),
	radish: shared$1(() => new three.MeshStandardMaterial({
		color: "#d2385a",
		roughness: .5
	})),
	kale: shared$1(() => new three.MeshStandardMaterial({
		color: "#3f6b4a",
		roughness: .8,
		side: three.DoubleSide
	})),
	tomato: shared$1(() => new three.MeshStandardMaterial({
		color: "#d93a26",
		roughness: .35
	})),
	cucumber: shared$1(() => new three.MeshStandardMaterial({
		color: "#3f6b2a",
		roughness: .5
	})),
	pepperRed: shared$1(() => new three.MeshStandardMaterial({
		color: "#c8221c",
		roughness: .3
	})),
	pepperYellow: shared$1(() => new three.MeshStandardMaterial({
		color: "#f0c22b",
		roughness: .3
	})),
	aubergine: shared$1(() => new three.MeshStandardMaterial({
		color: "#3a1d3f",
		roughness: .25
	})),
	bean: shared$1(() => new three.MeshStandardMaterial({
		color: "#6c9a35",
		roughness: .5
	})),
	chard: [
		shared$1(() => new three.MeshStandardMaterial({
			color: "#c8323f",
			roughness: .6
		})),
		shared$1(() => new three.MeshStandardMaterial({
			color: "#e7b830",
			roughness: .6
		})),
		shared$1(() => new three.MeshStandardMaterial({
			color: "#f1ecd9",
			roughness: .6
		}))
	],
	chardLeaf: shared$1(() => new three.MeshStandardMaterial({
		color: "#2f5a2a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stake: shared$1(() => new three.MeshStandardMaterial({
		color: "#b89a64",
		roughness: .9
	})),
	net: shared$1(() => new three.MeshStandardMaterial({
		color: "#e8e2d0",
		transparent: true,
		opacity: .35,
		side: three.DoubleSide,
		depthWrite: false
	})),
	olive: shared$1(() => new three.MeshStandardMaterial({
		map: leaves("fine"),
		color: "#c9d3b4",
		alphaTest: .45,
		side: three.DoubleSide,
		roughness: .8
	})),
	oliveFruit: shared$1(() => new three.MeshStandardMaterial({
		color: "#3c3a22",
		roughness: .4
	})),
	lavender: shared$1(() => new three.MeshStandardMaterial({
		color: "#8f74c9",
		roughness: .8
	})),
	sage: shared$1(() => new three.MeshStandardMaterial({
		color: "#7d9170",
		roughness: .8
	})),
	terracotta: shared$1(() => new three.MeshStandardMaterial({
		color: "#c0663f",
		roughness: .9
	}))
}))();
/** A low-poly ball for the small fruit, so a garden of them stays light once baked. */
const small = /* @__PURE__ */ (() => shared$1(() => new three.IcosahedronGeometry(1, 1)))();
const stickGeo = /* @__PURE__ */ (() => shared$1(() => new three.CylinderGeometry(1, 1, 1, 5).translate(0, .5, 0)))();
//#piece 6a16ecc1dda43ddd9921e1c3919a1d09e0a14f80ed08ff69cd8117b1a0875238
	}
	else canopy(g, r, 0, ph + .28 * size, 0, pr * 1.1, .3 * size, 16, garden.olive(), .28 * size);
	return mark(g, {
		potted: kind,
		ph,
		size
	});
}
const house = /* @__PURE__ */ (() => ({
	monstera: shared$1(() => new three.MeshStandardMaterial({
		color: "#2f6b3a",
		roughness: .55,
		side: three.DoubleSide
	})),
	fig: shared$1(() => new three.MeshStandardMaterial({
		color: "#3d7a3a",
		roughness: .45,
		side: three.DoubleSide
	})),
	snake: shared$1(() => new three.MeshStandardMaterial({
		color: "#4f7d3c",
		roughness: .6,
		side: three.DoubleSide
	})),
	pothos: shared$1(() => new three.MeshStandardMaterial({
		color: "#6aa84a",
		roughness: .6,
		side: three.DoubleSide
	})),
	stem: shared$1(() => new three.MeshStandardMaterial({
		color: "#58743a",
		roughness: .8
	})),
	clay: shared$1(() => new three.MeshStandardMaterial({
		color: "#b9703f",
		roughness: .95
	})),
	basket: shared$1(() => new three.MeshStandardMaterial({
		color: "#c9a978",
		roughness: 1
	}))
}))();
/** A leaf: a flat oval, with a notch cut into it for the monstera. */
const leafGeo = /* @__PURE__ */ (() => shared$1(() => {
//#piece b2bcb1620ba68bd7b1971a6941f41b8cb8686ac2c1a9c819a5f6559074ce3b30
	}
//#piece 053c860cfbfada031afba81c515fa38647e1e89a79b6cba25c8ece8dce43e01e
//#piece a166d2b51ba405948126d7e7d17a40f567632ed0d805ea5c5382cf3878f3584f
	return g;
}

//#endregion
//#piece a290694ec2c25c561459854b82dd15cea24a30bd0acf0d629d8e8d0476e4fa98
}
//#piece 5d3727d5b6112aca3fa86990626b455badb968dea6a095ccf174cee36365d3b3
*/
