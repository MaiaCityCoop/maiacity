//#piece 6ff4ef0a834a1621455b298f7b7c6d6f43ebb51f34a92495a03eb4a976351400
//#piece 58c58167ade2ca1481d3c254b32479fe40e011f2450a48216cac22e1d13bae7e
//#piece eae5bfb765658699093a2621fbbdac212c6518742657c0775beb7d6fdc3ce57f
//#piece 4413d18459b5b2ad5025aa6ee7331e38a1b5617a1283593d0b42c7ab8a3c38d2
const LEGS$1 = [
//#piece 03a34b538976afeceed2fdb7e3b7a0c3b113a35f67b83e09d9235cff4462dc3b
		...LEGS$1.flatMap((leg) => {
//#piece 79d0f390b2ef6c6de2374efdfd63b8a28f935f5430a0304a6c99224fc8fd151c
	const toe = Object.fromEntries(LEGS$1.map((leg) => {
//#piece cf8aa78a363491c6316f5960a9cc8e43d82fb34bc2a282f44ffbad0f92116d1f
function legs$1(q, pose, g, m, pace, plant = {}) {
	const { sk, toe } = q;
	for (const leg of LEGS$1) {
//#piece bf660ad299fe34143ff5fedd3c9bfd2b06f7a0b5600c54494792c44b8ec755bd
*/
function headTo$1(q, pose, target, look) {
	const { sk, j } = q;
	reach(sk, pose, "neck", "neck2", j.head, target);
	aim(sk, pose, "head", j.muzzle, look);
}
/**
* A quadruped's moves: each gait in `life.gaits` (walk, trot …), and standing (`idle`), grazing (`graze`), looking
* up (`alert`).
*/
function quadMoves$1(q, life) {
//#piece 555b32390f3916ed8eb615f781bb20367981b5899feb229340ef5086a36787db
			0,
//#piece 260eea8d238a301168ce596173747739e3eb246863559fe58f18ffb314af35cf
		legs$1(q, pose, g, mo, Math.min(1, pace));
//#piece 17963643b6bf3cec00fa44a7a0d840c932f3dc00a105eadc409bc67e65b1019e
//#piece 78316d9a4fb183f09df8f4f1c87d5eb231eb8b0a84004e63ef4001c60375aae9
//#piece e09c3eb110806d9fa5f9253190d7299405d669cf647ec10916230ed383de2852
		legs$1(q, pose, null, null, 0);
		return pose;
	};
//#piece bd2fd43de291c7cd032a4e01f1c2881fb6841991c1fe8b7455b09d080bcd6dea
			-.3,
			0,
			0
		];
		pose.earR = [
			-.3,
			0,
			0
		];
		legs$1(q, pose, null, null, 0);
		return pose;
	};
//#piece 9b6a06ae40665518b597e3361a3eaf736d702095e30ea4e45c5e4c223548ab35
		headTo$1(q, pose, new three.Vector3(.04 * shift, pollY, base.z + ahead), look);
		if (j.jaw) pose.jaw = [
			.12 * bite,
			.04 * Math.sin(t * 5.5),
			0
		];
		legs$1(q, pose, null, null, 0, {
			FL: { z: .05 },
			FR: { z: .01 }
//#piece 44baa49a4f0ec3161b9a23c67071fc2919f1badbebb2bc4be27980732587aa9b
//#piece b2de6e8bb9eff235857ea4c91d3074f8d2111386a9b04aef78bf9a4481fbca57
function goat(breed = "saanen", moves = quadMoves$1) {
//#piece b9e3e7ef0cdbf3c37771130339da7e73c19233217f258de67ce64e4045c0414d
	for (const leg of LEGS$1) {
		const side = leg[1] === "L" ? 1 : -1;
//#piece 50d821068d376e2b9511ab6c1a1f1937d71496f1ad8accff8eb6253f00bc3385
//#piece 500a550108b0d8cc3aacfeef6479b3978155b9697b5b26626b126ddc7cb4531d
//#piece 8b2342d1f5d532a9e2f4138dfc00223065dbb0f6b52bfc04745d03e65f39aa45
//#piece ac795f61e58fd1d6f1395f03b9bf99cae317cc2fbdeefa2f5c3af394de3b9f09
	for (const leg of LEGS$1) {
		const side = leg[1] === "L" ? 1 : -1;
//#piece 03a9025928278c6ff8c1e248b054068a5f3379c5d9631727301f6e10c59bbe44
		},
		feet: LEGS$1.map((l) => `foot${l}`)
	};
}

//#endregion
//#piece 70438ff05d733859aa706657dc7dbbedccf99165ce075ec6f8ca589da3a5f48c
//#piece 1631ae30ee2504e8cfe2e7ad62e517aa301dc9d2e92c5250e4d3abf2d9b91270
//#piece 47225217d0e58ea436f7081ce009053aa01994c2185093c15e427f6cc6199bc1
function rabbit(coat = "wild", moves = quadMoves$1) {
//#piece 54d2b7ae5d584315d61949b8f2d22e6c7446c22f82523e17dcea293bf7725176
//#piece 282610f6f39a8c2685a392dcc5a214167b97d7f0312546d625380481a592a9ba
	for (const leg of LEGS$1) {
		const side = leg[1] === "L" ? 1 : -1;
//#piece 3364754fe2e5e4eb7ce8b4a59ada61c9f2a5e625a5c25b046fcf7bef63e98378
	};
//#piece ee9db7246c9046e90be22210e12641c3ab88470063d6d9f922cb005254e2aab7
		feet: LEGS$1.map((l) => `foot${l}`)
	};
}

//#endregion
//#piece a2411cd27cf1652007a7217dbcf20d9ed9abc2fbafcfafafa4d807ae9783495b
//#piece 3a9ad8c77fe0eaf36f15bdb031eb4bff2d648a22a141b51e5abc5bce62138cc5
			0,
//#piece 97c1fc09c0c6652d7b916ead9f9497185b5d082bfef55c425a918268794cc325
function sheep(breed = "suffolk", moves = quadMoves$1) {
//#piece 88d5195edcb5a3ed095a19fff7550a21916372d0ff56dc00a560b88bd6f0642f
//#piece b671a1953e111a91da3d665a0e536b43248ece820a7302f2a2fe9339078b598e
	for (const leg of LEGS$1) {
		const side = leg[1] === "L" ? 1 : -1;
//#piece 26c1b979f48b7d8581de63bb901e0790f41e7f50dae8580a8d2bf5a6b2b47533
	for (const leg of LEGS$1) {
		const side = leg[1] === "L" ? 1 : -1;
//#piece bbec8959597e618d420e89d6e0c2041dd8647a18893f48e2af71eed788b475a9
		},
		feet: LEGS$1.map((l) => `foot${l}`)
	};
}

//#endregion
//#piece e94e1cf1d6a74bdd01d00071c7c781e128b1cf1e0635ea9911098b43eafe785c
//#piece c7d2ea1292a2f1e119149acba361105546fe3f3163f1c685dfd695c76a3db11c
//#piece f208a58e3432150cd18c2dab038f52d22892512a669f4b5287b1014a89ae8cb3
//#piece 021c6d36042576e8828e3df5184dd302d70e3eaea5e1f1ea4e0eef2a55fa1c9b
//#piece 54fc30ca8a959d2dfd3c07a74b0041edbbebd16b8f7e6d1ef22b347342ee467b
}))();

//#endregion
//#region src/lib/actors/plans/quadruped.v1.ts
const LEGS = [
	"FL",
	"FR",
	"HL",
	"HR"
];
/** The legs of a quadruped standing or walking: every leg to where its hoof is (the root and body as `pose` has them). */
//#piece c41ee842a540931b8d0b90594d085de31a5a1d2b9f5a26399e231c27d4b912b6
//#piece 55dc41372a7dcaec6e490eedae0d79242ec2cf1859ba5e13a86f508e0bdf6e9f
*/
function quadMoves(q, life) {
//#piece 555b32390f3916ed8eb615f781bb20367981b5899feb229340ef5086a36787db
			0,
//#piece 474231e0fa1220725e70d2681ce1b30111cea3d4d89a37ec83ff4c6d0974d2cd
	moves.graze = (t) => {
		const pose = stand(t);
		const shift = wander(t, 5, seed + 5);
		pose.body = [
			.06,
			.04 * shift,
			0
		];
		pose.chest = [
			.05,
			0,
			0
		];
		const headLen = Math.hypot(j.muzzle[0] - j.head[0], j.muzzle[1] - j.head[1], j.muzzle[2] - j.head[2]);
		const bite = Math.max(0, Math.sin(t * 5.5)) ** 2;
		const look = new three.Vector3(.15 * shift, -1, .45).normalize();
		headTo(q, pose, new three.Vector3(.05 * shift, .012 + .015 * bite, j.fore[4][2] + headLen * .35).addScaledVector(look, -headLen), look);
		if (j.jaw) pose.jaw = [
			.12 * bite,
			.04 * Math.sin(t * 5.5),
			0
		];
		legs(q, pose, null, null, 0, {
			FL: { z: .02 },
			FR: { z: -.02 }
		});
		return pose;
	};
	return moves;
//#piece ca817ec2fc9fe61368a8ac2881e9d0bc88dff98689106955be77984b53ea44af
//#region src/lib/actors/index.ts
/** a four-legged kind as it moved at v1: its breeds, grazing with the head folded back between the forelegs */
const quadV1 = (kind, ids, make) => ids.map((id) => ({
	id: `${kind}-${id}`,
	label: id[0].toUpperCase() + id.slice(1),
	note: "as at v1",
	make: () => make(id, quadMoves)
}));
const GRAZE_V2 = {
	v: 2,
	date: "2026-10-06",
	note: "Grazing realigned: the neck reaches forward and down, the muzzle in the grass ahead of the forefeet, the forehand tipped to it (it folded back between the forelegs)"
};
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1) */
