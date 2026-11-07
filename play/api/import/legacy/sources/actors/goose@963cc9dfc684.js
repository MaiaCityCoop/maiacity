//#piece c00e18ddceefdb3d60f51c4c92ea4735c38abef01f02f44d741f95f8377d3c8c
//#piece 5483cfd71aa7fc453789342eb3edf17611a8f37cfcebcef3c19b714aa948aacb
//#piece d81c1d66fb85bcfe092b2c3c92c635ae21323328a46c667d41dac6f0241242e5
//#piece e5e32a2fecd5e4a5da16eb14a74abcbeb0311af600c3694b6931eab8bd5f47f8
//#piece 36c77d5e8c2aec5b3e10474ba0a0b95bf0a887f29584624f24258bce3cf693ae
//#piece 20cefc34ad4f5d742d3051da3d4e6997adad5edfd42614eb8af50295ee7267d5
const SIDES$2 = ["L", "R"];
//#piece 920d873330458b676927d9c0b4d61ec8fd95f9b2857ac4c24529647d12fc0133
//#piece c96e6d5d4cd32afdd5b1fbb7f0b65886987b4d671200986a6184e08f8887328b
		...SIDES$2.flatMap((s) => {
//#piece f229cccd99ca771a305745997b0f1aa210de83aa71e0d1f19cf86eae1a2e8555
function birdLegs$1(b, pose, g, m, pace, plant = {}) {
	const { sk, toe } = b;
	for (const s of SIDES$2) {
//#piece 8a299491aa47821fee8d78539ccd31a135e09cb2101e57c97c14bdb6529a1fca
function birdHead$1(b, pose, target, look) {
//#piece a0e411203501445d86244328c7d3f616d7a00dc30b524efc6cd736449ce5af10
//#piece d2ff0ded19b2da6c344cd5d01b948982cdf7104031d24f56e7307daf9c053909
*/
function birdMoves$1(b, life) {
//#piece 6e2eea72ea3b348b406cd7ddfd488229113772cbe0a1ef7762daf434d3c4fcac
			0,
			.002 * Math.sin(t * 2.2),
			0
		],
		...life.carry ? { [neck[0]]: [
			-life.carry,
			0,
			0
		] } : {}
	});
//#piece 7a2291752aff641c9ccdfe08a7e2eb2988739271247cdebee36e0dab5de43887
		birdLegs$1(b, pose, g, mo, Math.min(1, pace));
//#piece 9a12ef8aa410c1c92acb45396b0d3c4377c885129590960186a58d43cd807161
			birdHead$1(b, pose, new three.Vector3(0, j.head[1], j.head[2] + z + .01), beakDir.clone());
//#piece 9eb0b7130da2aa7524e203691da717d708b111679fa806fa11a8c237440fc8de
		}
//#piece e3f2d2cd4b306ef08ff203f0d2bba185aa95800f7a1d20257587306999496c1e
		birdLegs$1(b, pose, null, null, 0);
		birdHead$1(b, pose, new three.Vector3(.01 * look, j.head[1] + .01 * up, j.head[2] - .01 + .01 * up), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 / Math.sqrt(k) * look).applyAxisAngle(new three.Vector3(1, 0, 0), -.15 / k * up));
//#piece af3d0fac1be28d5597a31dbbea028d8f2d7d9d5aec7518e8c5d9e8795f244cbb
		birdHead$1(b, pose, new three.Vector3(...j.head).lerp(low, k), look);
//#piece a679ebb97064b72bb34c2c87faffe0f57ea47b8be21bdbd30551434c8ce1ee1f
			0,
			0
		];
		birdLegs$1(b, pose, null, null, 0);
//#piece fb36993d0d40e4ad31ce91cc83cc9847fbbc4944b3c786b9f01a13f49c605d35
			0,
			(s === "L" ? -1 : 1) * .06
		];
		birdLegs$1(b, pose, null, null, 0, { [s]: {
//#piece 43fe2f862ec4774abdd2905bf1f5c752fbab4759995fa915729372ce7b04b19f
			0,
			0
		];
		birdLegs$1(b, pose, null, null, 0);
//#piece 8c2521babb8eddd04c93c607d63fafe4dc887fed5e471d86b64f3a433e0afb5c
		birdHead$1(b, pose, target, look);
//#piece 3e1ce6d5256eba7860bc331b9d64e18b1d5da535d89255a1a7e44a7e425fa987
			-.5 - .9 * (.5 + .5 * w)
		];
		birdLegs$1(b, pose, null, null, 0);
		birdHead$1(b, pose, new three.Vector3(0, j.head[1] + .02, j.head[2] - .02), new three.Vector3(0, .3, 1).normalize());
//#piece c7cc82d387fe8a6cf7613ba03e72fcf3c05ba64e2a0cfe2a46b80cff5df62f1d
		];
		birdLegs$1(b, pose, null, null, 0);
		birdHead$1(b, pose, new three.Vector3(.03 * sway, j.body[1] + .08, j.head[2] + headLen * 1.2), new three.Vector3(.1 * sway, -.1, 1).normalize());
//#piece 2cfa395d39e372624eb9973b588862ad37d69a72479ece7d99c8ae11411b0e52
//#piece c4ec764a1682dbc3b3f72fe61adb2905c371a3161ed026e18d507435d63da8b9
	}
//#piece 58c58167ade2ca1481d3c254b32479fe40e011f2450a48216cac22e1d13bae7e
//#piece d578ab672b4aaec4a434fdd7fe9bea2ee5af7750949e2c0c6db4ba94874f64b4
//#piece a3af71855d9ab6bcf8ee4046d0101fc36716b4577357629ffb12c8bd3d210e10
		clips: birdMoves$1(b, {
//#piece 7b56666dc8eae0c807be26397bab483170d95127fc08996e8a20bde083a62cb0
//#piece b168778f0873199a04a220d94d6a7f5d2d16ebbd53ecb6103f644c14aa0efa76
	});
//#piece b727e88d3378c77764938e1cce227c2ab3ececdd60623184e28a4a11ceee7805
//#piece 3078be340a6737fe0c88d5b3673e4c96db37e0ea9970273e173d8f81f9719d46
const SIDES$1 = [["L", 1], ["R", -1]];
//#piece fc27d9becc0ee40118ca3b8eb920a5bcac0c11f071cdb98e9f506d756ff6ba35
		...SIDES$1.flatMap(([s, x]) => [
//#piece ba7d8a9bbd0672a7e38cdea22a02e8db82df180f9cb5a11bd9c4173b4fa81489
	for (const [, x] of SIDES$1) s.ball(P(x * .017, .054, .046), .0105 * k, {
		bone: "head",
		k: .008 * k,
		tag: "head"
	});
	for (const [side, x] of SIDES$1) {
//#piece 9603ed42e7a629cbab05123b07aa2aca68ff75b161fc0be074ad913deebb6122
//#piece 1d45ee8e749e86476e5488b135bded94f7263412da2f8100100927f062785301
	};
//#piece 506dc339140e0b7310eec88dc59aa1e946ae6b6f4edd07d2f178e5071a3964f0
	for (const [side, x] of SIDES$1) {
//#piece 3b2df4c99be4b1f1d4cf9c9e256914c6e3a74b04276b83b2355c560033004efe
//#piece 004dbf84bd543f3a2c7e4cd36c7e1c93ffa0b1622e6a04c5f16fec79e977120a
//#piece abc07f8667d22f481af9eb878dbd3330113b202e9f6047955edc7383eadec19f
//#piece d60a32c8832ef84a335b1a07d8fae2d74bb1ec9c879752e7984c1f0e433e7575
		for (const [side] of SIDES$1) {
//#piece 5d7c5e52345d0ed72967039fbc25f2cff5942f9f764fcefc247d500bd2d4b471
		for (const [side, x] of SIDES$1) pose[`arm${side}`] = [
//#piece 0e138d1005cd43884d41f42cfd1afcfe2341fc2abb661ceb033a3e5fc92af877
//#piece 5ea765a0295e46e86982bdfbe4f8f4ce4600e0aa378eebe48161c9c745421f12
//#piece 55dc41372a7dcaec6e490eedae0d79242ec2cf1859ba5e13a86f508e0bdf6e9f
*/
//#piece edb4ceb9c18e7d6fbbf629eeb69eda9c955eafe40f78466af0be23d8c955114e
			0,
			.11
//#piece 80bb32249ec2ddf6d5c641a460a08efc495b370964594d0c9774853aa4d447ba
function goose(breed = "embden", moves = birdMoves$1) {
//#piece e3c157290b31ebead0586b6bbd25f1089ab0305375d320440208d7df9ff4a08b
//#piece a08656059465a96ec02c2501fc53c3943385afd3c0439aeed743874cc1b81d4f
			0,
//#piece 5642dfecdc664996a8e73c5ba8a710fd1e5e7ec228bde14fbf2e7ab1aacdf18f
//#piece 1bdf5e1d0de0e32e46d03e5827a8c50deb575f7f434a7e8695395519d6b52caf
//#piece c7d2ea1292a2f1e119149acba361105546fe3f3163f1c685dfd695c76a3db11c
//#piece f208a58e3432150cd18c2dab038f52d22892512a669f4b5287b1014a89ae8cb3
//#piece 021c6d36042576e8828e3df5184dd302d70e3eaea5e1f1ea4e0eef2a55fa1c9b
//#piece 046ac351c90060f663867453f5513fda2a8db333d9060a8ebb5b057b6e3fb2d0
//#piece a9849b51fc99cb96feae8af26df52d79b26d1a57aa1718b50bff56511226bf64
	const base = birdMoves$1(b, {
//#piece 8d4cf21830f5893100fa6e16777d5c92af4019861884b057cb5e2c36e9ee711c
				birdLegs$1(b, pose, null, null, 0, {
					L: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					},
					R: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					}
				});
				birdHead$1(b, pose, new three.Vector3(0, J.head[1] - .006 * k, J.head[2] + .01 * k), new three.Vector3(0, -.15, 1).normalize());
//#piece 46e03ccfde1e530b97365dd7717da3df8a76af3a5fbfb92fa483a747af847175
//#piece 0075c1bfa631017cf0ebbf581326bc4bcef42c9e4278d767d4e68a1d6919f389
				birdLegs$1(b, pose, null, null, 0, {
					L: { curl: .6 },
					R: { curl: .6 }
				});
				const look = wander(t, 3, seed + 2);
				birdHead$1(b, pose, new three.Vector3(.002 * k * look, J.head[1] + .006 * k, J.head[2] - .002 * k), beakDir.clone().applyAxisAngle(new three.Vector3(1, 0, 0), phrase ? -.55 : -.2).applyAxisAngle(new three.Vector3(0, 1, 0), .5 * look));
//#piece 65fbcebbf8dedb2d137a413f87583f44b2fb79acd89462a03aa61c63c548ba8f
				birdLegs$1(b, pose, null, null, 0, {
					L: {
						y: .008 * k,
						curl: .7
					},
					R: {
						y: .008 * k,
						curl: .7
					}
				});
				const look = wander(t, 2.2, seed + 5);
				birdHead$1(b, pose, new three.Vector3(.002 * k * look, J.head[1] - .008 * k, J.head[2] - .006 * k), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 * look));
//#piece dc4ec5965ae8c5973e6f3f87eca22da037b72172eefb6732bd0f88349f770692
}))();

//#endregion
//#region src/lib/actors/plans/bird.v1.ts
const SIDES = ["L", "R"];
/** Both legs to their feet: on the ground where the gait (or `plant`) puts them, the body as `pose` has it. */
function birdLegs(b, pose, g, m, pace, plant = {}) {
	const { sk, toe } = b;
	for (const s of SIDES) {
//#piece 50946a888d7e680b7bbef07c9daad9259e44b1e4fe0c3d82471ef33eed891733
*/
//#piece 9f4263a81404e3c526e549fadef69eb4d9e0e6ef28ddb5143ef1a943b0c9ee0f
		} else {
			pose[neck[neck.length - 1]] = [
				.06 * Math.sin(TAU * 2 * ph),
				turn * .2,
				0
			];
			pose.head = [
				-.06 * Math.sin(TAU * 2 * ph),
				turn * .2,
				0
			];
		}
		return pose;
	};
	moves.idle = (t) => {
		const pose = rest(t);
		const look = wander(t, 1.6, seed + 1), up = wander(t, 2.3, seed + 3);
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(.01 * look, j.head[1] + .01 * up, j.head[2] - .01 + .01 * up), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 * look).applyAxisAngle(new three.Vector3(1, 0, 0), -.15 * up));
//#piece 4c8fc24d4f9b2e49c8b3a6d07a801602a86b2fb3bc5413953033890c5f834db8
			0,
			(s === "L" ? -1 : 1) * .06
		];
		birdLegs(b, pose, null, null, 0, { [s]: {
			z,
			y,
			curl: rake > .75 ? .6 : -.15
		} });
		down(pose, .35 + .2 * Math.sin(t * 3), .05);
		return pose;
	};
	moves.graze = (t) => {
		const pose = rest(t);
		const nibble = Math.max(0, Math.sin(t * 7)) ** 2;
		pose.body = [
			.3,
			0,
			0
		];
		if (life.carry) pose[neck[0]] = [
			.5,
			.15 * wander(t, 3, seed),
			0
		];
		birdLegs(b, pose, null, null, 0);
		down(pose, .9 + .08 * nibble, .1, .04 * wander(t, 2, seed + 6));
//#piece 93dfbfeacba137941910b2ae25f8ec52f1bfc2f49da9c41e152170938c03bbee
		return pose;
	};
	return moves;
//#piece ca817ec2fc9fe61368a8ac2881e9d0bc88dff98689106955be77984b53ea44af
//#region src/lib/actors/index.ts
/** the geese as they moved at v1 */
const GEESE_V1 = /* @__PURE__ */ (() => GOOSE_BREEDS.map((id) => ({
	id: `goose-${id}`,
	label: id[0].toUpperCase() + id.slice(1),
	note: "as at v1",
	make: () => goose(id, birdMoves)
})))();
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1) */
const HISTORY = /* @__PURE__ */ (() => ({ goose: [{
	...FIRST,
	build: GEESE_V1
}, {
	v: 2,
	date: "2026-10-06",
	note: "Grazing with the neck stretched forward and down in one curve, the bill in the grass ahead of the feet (the head bent back under the breast); the head carried level walking, slow long looks standing"
}] }))();
//#piece 70082f8e713dbec65519cb470259f5e30010da770b255dc43174ceba71216ae1
	id: "goose",
	label: "Goose",
	note: "a long neck in three bones held in an S: waddles, grazes, hisses with its wings out",
	from: "Sandbox 3: along the streams",
	variants: [
		animal("goose-embden", "Embden", "white"),
		animal("goose-toulouse", "Toulouse", "grey, barred on the wings, white beneath"),
		animal("goose-chinese", "Chinese", "fawn and white, a dark stripe down its neck, the knob on its bill")
//#piece ee600e2d424600299b01b91c685bb56724b3727b07cac45adc232c6339c623fc
