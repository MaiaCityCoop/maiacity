//#piece fb63721a5989cdb83d4469d69eea9e8145757e0550ef14683553316816b79205
//#region src/lib/assets/kit.js
//#piece 10034cfedefbb926546891549657d823258317f7f32a9fefe58d59d8a54a2f64
//#piece a5d2fc773d0acfbf07bc7af9c62fc2469809f466a4bf30ab5ba13798a551d857
//#piece 7a02d42d1ffaf24208c56f037c7a45be134e80455516bc51327b0bd285602a64
//#piece 436cd8e4a7bda136021348ba0e955700d287c5bebaf632742f5dc9bbf64f18af
//#piece 1c141d57669a9a8ee8b098a572edee35557d3090bdbb4a8090cb2c09cebf5201
//#piece a82bdbecafe4433e564d549bc5e356c27d22f1b72249ed70df2ac04dc8b1ee4c
//#piece 82cbe660799c9614144ecd201ad0d3806afd78f3bba0e11d9d97bd70d8084636
//#piece da94150ee5928a8d172e3db1d986cda3718376fe5d7d8dce7da64dd7f35804b0
//#piece 09e25f216c14e199f83341b98b983b77c7440bc7a57f25e9f4384bf03de56c24
		}
	};
}

//#endregion
//#region src/lib/models/water-canister.js
function waterCanister() {
	const root = new three.Group();
	root.name = "10 L water canister";
	const kit = assetKit(root, {
		assemblies: [{
			id: "body",
			label: "Water container",
			note: "10 L portable water storage",
			out: [
				0,
				0,
				0
			]
		}],
		steps: [
			"Body",
			"Handle",
			"Caps"
		]
	});
	const white = new three.MeshStandardMaterial({
		color: "#e9e6d7",
		roughness: .58
	});
	const blue = new three.MeshStandardMaterial({
		color: "#397a9b",
		roughness: .5
	});
	/** @param {string} id @param {string} label @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {[number,number,number]} at */
	const part = (id, label, geo, mat, at) => {
		const o = new three.Mesh(geo, mat);
		o.position.set(...at);
		kit.part(o, {
			id,
			label,
			assembly: "body",
			what: label,
			specs: id === "body" ? [["Capacity", "10 litres"], ["Material", "HDPE"]] : [["Dimensions", "Inferred"]]
		});
		return o;
	};
	part("body", "Moulded HDPE body", GEO.rbox(.302, .32, .154, .018), white, [
		0,
		.16,
		0
	]);
	for (const x of [-.062, .062]) part("handle-leg-" + (x < 0 ? "left" : "right"), "Integral handle support", new three.BoxGeometry(.025, .06, .033), white, [
		x,
		.35,
		0
	]);
	part("handle", "Carry handle", GEO.rbox(.149, .025, .033, .009), white, [
		0,
		.3845,
		0
	]);
	part("neck", "Wide filling neck", new three.CylinderGeometry(.046, .046, .032, 32), white, [
		-.095,
		.331,
		0
	]);
	part("cap", "Blue screw cap", new three.CylinderGeometry(.05, .05, .024, 32), blue, [
		-.095,
		.357,
		0
	]);
	const tap = part("outlet", "Sealed water outlet", new three.CylinderGeometry(.013, .013, .016, 16), blue, [
		.151,
		.045,
		0
	]);
	tap.rotation.z = Math.PI / 2;
	for (const z of [-.078, .078]) for (const y of [
		.08,
		.17,
		.26
	]) part(`rib-${z < 0 ? "front" : "back"}-${Math.round(y * 100)}`, "Moulded stiffening rib", GEO.rbox(.235, .009, .006, .002), white, [
		0,
		y,
		z
	]);
	kit.seal();
	return root;
//#piece ca817ec2fc9fe61368a8ac2881e9d0bc88dff98689106955be77984b53ea44af
//#piece a82d348033c0e2e5c29e2c2f5ba33bbf468baf2d5afc2fc78837317361b6a78f
const HISTORY = /* @__PURE__ */ (() => ({}))();
const LIST = /* @__PURE__ */ (() => [{
	id: "water-canister",
	label: "10 L water canister",
	note: "A 10-litre drinking-water canister, 302 × 154 × 397 mm, with a handle, wide cap and sealed outlet",
	usedIn: "MaiaCity V2",
	make: waterCanister
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
