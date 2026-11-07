//#piece fbcd81540e5e00b2c220d63aff988ca3e2f1982a94ecbabf7def7a8661883b3d
//#piece 26a083596c59ac5a408efaad63f6a5c13046d20ef9762a8cd1b48ecce424902e
//#piece 594ce903a6f2192947a5556f079f24941a1774782da33a406dc0a7d03c24689a
	}
//#piece 39a5f5a6989c17a081207b02df8c94ee80537fbb060ff9d2de99706bb9208b13
*/
//#piece db3009f0a720fb22303a6892b2275d8eea4359f3d3c1da0103725837c70d2ff7
//#piece b3817a18985194c6270eb3f83b684b3ba8fe0c85844a49cdbc9aae0cff6836f0
//#piece 454c00e7250af06f645da2cb0f1f19f2998f73b5bd1477607af195657ed4cd8f
//#piece 138e85fcf6a13fee49145a0c64bf721a491842817d11ccbe12d3d8642b30f267
const fruit$1 = /* @__PURE__ */ (() => ({
//#piece 9f5792029006b178f87fa6c7cee762b70f5aba79a4c97634b65a0a8a7ce12196
//#piece 5badc263ce31215cfbb8f6dfcd1a7669c24965681b22b61df26f86456ef9959c
const mark = (o, legacy) => {
	o.userData.legacy = legacy;
	return o;
};
//#piece 4d131c85f50994cb5ddd101c0c4613ada8655ffe26cbc1a2734e06b483b8343f
	if (r() < .5) hang(g, r, .6 * size, .5 * size, .3, 10, r() < .5 ? fruit$1.orange() : fruit$1.mangoRipe(), [
		.03,
		.03,
		.03
	]);
	return {
		object: mark(g, {
			plant: "shrub",
			size
		}),
		radius: 0
	};
}
//#piece a96c3f94bc7d4d08174be4522f2899c76600564786b89506c793eb7c8f3dfc66
/** Layer 3 — a berry bush: currants, blueberries, raspberries. */
function berryBush(seed, size = 1) {
	const r = seeded(seed);
	const g = new three.Group();
	canopy(g, r, 0, .6 * size, 0, .7 * size, .55 * size, 22, fineLeafMat(), .55 * size);
	hang(g, r, .7 * size, .6 * size, .4, 24, r() < .5 ? more.berry() : more.redBerry(), [
		.025,
		.025,
		.025
	]);
	return {
		object: mark(g, {
			plant: "berry",
			size
		}),
		radius: 0
	};
}

//#endregion
//#region src/lib/sandbox-2/interior/spaces.ts
//#piece 7600908f7bff1c6b949b14bbb0744d90b54ef3340415dbbeda275873f644e03a
*/
//#piece 0d25c815b0e44869f1c4633160afd14abb8894d948a48072ed2f29c60b1050fd
const white = /* @__PURE__ */ (() => col("#f6f3ec", .4))();
const fruit = /* @__PURE__ */ (() => [
	"#f2a33a",
	"#e8c547",
	"#7fae3f",
	"#e0662f",
	"#b8342f"
].map((c) => col(c, .6)))();
//#piece 8bd1e2620f7532af81c35ebf163959c7db72374080322a3ddc6ef4869826c527
const bulb = /* @__PURE__ */ (() => new three.MeshStandardMaterial({
	color: "#fff3d6",
	emissive: "#ffcf7a",
	emissiveIntensity: 1.2
}))();
//#piece c823256a7a02dd5cd87949a8a79ba697c65156f0a2cc8a06097e51d37245c911
//#piece 1adf2e99408760e19f51d61c276c3793be0c758edfed293689819377732238e6
	}
	g.position.set(x, 0, z);
	g.rotation.y = rot;
	return g;
}
//#piece 9ad5fe7f28f3bdf59a13d7a2cf519dcf031c5bad6f3965a1815fe64cf78242e0
	return g;
}
//#piece 4dbfa14c4f554a8a4141cbc6d46d025ba12a3a02fed3c13fd8ea49df52014ef8
	}
	return g;
}
//#piece b47eea791b1ef48184573d4ff66ab3a035f65238d29deb46874735c7e4fdc2a7
	return g;
}
//#piece e522dcab9bc3f4c982e70f87ad950137d07023a4441ce0bf6660bdffc229ae84
	return g;
}
/** A square: its stone floor, its trade, its tables, and planters round the rim. */
function square(k, kind, seed, radius) {
	const g = new three.Group();
	const cs = [];
	const floor = new three.Mesh(new three.CircleGeometry(radius, 48), k.stone(radius / 1.5));
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = .03;
	floor.receiveShadow = true;
	g.add(floor);
	const r = seeded(seed);
	const mat = awnings[seed % awnings.length];
	if (kind === 0) {
		const kk = kiosk(k, mat);
		kk.position.z = radius - 2.2;
		kk.rotation.y = Math.PI;
		g.add(kk);
		cs.push({
			x: 0,
			z: radius - 2.3,
			r: 1.9
		});
		for (const [x, z] of [
			[-3.2, 1.2],
			[0, .4],
			[3.2, 1.2],
			[-2.4, -2.4],
			[1, -3],
			[3.6, -1.8]
		]) {
			g.add(bistro(k, x, z, seed * 7 + x * 3 + z));
			if (r() < .6) g.add(parasol(k, x, z, awnings[seed + Math.round(x) & 3]));
			cs.push({
				x,
				z,
				r: .9
			});
		}
	} else if (kind === 1) {
		g.add(pergola(k, 7, 6));
		for (const z of [
			-2,
			0,
			2
		]) {
			const t = k.table(5, 10);
			t.position.set(0, 0, z * 1.1);
			g.add(t);
			for (let i = 0; i < 8; i++) {
				const plate = new three.Mesh(new three.CylinderGeometry(.13, .11, .02, 14), white);
				plate.position.set(-2 + i * .57, .79, z * 1.1 + (i % 2 ? .25 : -.25));
				g.add(plate);
			}
			cs.push({
				x: -1.5,
				z: z * 1.1,
				r: 1.2
			}, {
				x: 1.5,
				z: z * 1.1,
				r: 1.2
			});
		}
	} else if (kind === 2) {
		g.add(k.box(4.5, 1.05, .8, k.oak, 0, 0, 1.6));
		g.add(k.box(4.7, .06, 1, k.counter, 0, 1.05, 1.6));
		for (let i = 0; i < 6; i++) {
			const x = -2.1 + i * .84;
			g.add(k.box(.7, .3, .5, k.timber, x, 0, 2.8));
			for (let f = 0; f < 6; f++) {
				const fr = new three.Mesh(new three.SphereGeometry(.08, 8, 6), fruit[i % fruit.length]);
				fr.position.set(x - .2 + f % 3 * .2, .36, 2.7 + Math.floor(f / 3) * .2);
				g.add(fr);
			}
			g.add(stool(k, x, .8, .75));
		}
		const aw = new three.Mesh(new three.PlaneGeometry(5.2, 1.6), mat);
		aw.position.set(0, 2.5, 2.2);
		aw.rotation.x = -1.2;
		g.add(aw);
		for (const x of [-2.5, 2.5]) g.add(k.box(.1, 2.5, .1, k.timber, x, 0, 2.9));
		cs.push({
			x: -1.4,
			z: 2,
			r: 1.3
		}, {
			x: 1.4,
			z: 2,
			r: 1.3
		});
		for (const [x, z] of [
			[-2.6, -2],
			[.4, -2.8],
			[3, -1.4]
		]) {
			g.add(bistro(k, x, z, seed + x));
			g.add(parasol(k, x, z, awnings[seed + 1 & 3]));
			cs.push({
				x,
				z,
				r: .9
			});
		}
	} else {
		g.add(oven(k, 0, radius - 2.4, Math.PI));
		cs.push({
			x: 0,
			z: radius - 2.4,
			r: 1.6
		});
		for (const [x, z, rot] of [
			[
				-3,
				0,
				.5
			],
			[
				3,
				0,
				-.5
			],
			[
				0,
				-2.8,
				0
			]
		]) {
			const t = k.table(2.6, 6);
			t.position.set(x, 0, z);
			t.rotation.y = Math.PI / 2 + rot;
			g.add(t);
			cs.push({
				x,
				z,
				r: 1.4
			});
		}
	}
	for (let i = 0; i < 7; i++) {
		const a = Math.PI * .35 + i / 6 * Math.PI * 1.3;
		const x = Math.sin(a) * (radius - .5), z = Math.cos(a) * (radius - .5);
		const p = pot(k.lime, .55, seed * 13 + i);
		p.position.set(x, 0, z);
		g.add(p);
		const pl = i % 2 ? shrub(seed * 17 + i, 1).object : berryBush(seed * 19 + i, .8).object;
		pl.position.set(x, .5, z);
		g.add(pl);
	}
//#piece 336edbfeace52a41e59cf33579b4c02534b29be3497143eb8fce15933a7cd10c
//#piece 7ef80c397b6ec342b91b847d3acd564eab8c2cb30f27c51fcc12140ba258d0d7
