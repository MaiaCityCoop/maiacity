//#piece 60c0a263da0d6b5d78de4d872b5d4e6be21a1ac8f4c22f56ffec553cb61b7c63
//#piece 2ee1d9bfd994520834d2a43154e124844761f74e6dcb138b78559218d98aaebf
//#piece 3d8e5a77b519fbff6ef447b7ebf8fc0d3bbe59ccb60a9126d638967d582581f5
//#piece b03384ae7c1c25080dbb7b48c36e4c909f669027f46181fddf4c033e05076aa5
*/
//#piece faee22595340363334b97e280990139f8db81b07311e4b360340f95298a2d664
const S = .001;
/** the cube's size: 27" each way (W across, L along, H high), the 4×4 base's height */
const CUBE$1 = {
//#piece 02706fd28ab2ada103f91ff30a9c7e69cc56b11b85aa0cd0fa18dc917c47becc
const CRANK$1 = 235;
const FLY = 262;
const CPL = -168;
const FAN = [
	360,
	-40,
	230
];
const RED = "#c8372d";
const FRAME = "#c8372d";
const STEEL = "#8d9396";
const DARK = "#2b2d2f";
const ENGINE$1 = "#2f3133";
//#piece d38f8ffa75fd96d513a50880fa44cd89bd220431eebe6b5150c15e3d41e9d0b9
const SRC$1 = {
//#piece 404e0ce8d5bd7efa16634aca403cdb18bc5f21b8010325de14a09293d251f8d0
const STEP_OF = {
	frame: 1,
	engine: 2,
	hydraulics: 3,
	controls: 4
};
/**
//#piece ea40db197c3b766803ab6fcc08758d2d152746d067f7285280d043ab243517c3
*/
function powerCubeParts(kit, { at, base, joints, assembly, step, prefix = "pc-", unit, len = CUBE$1.L, engine = true, controls = true, insides }) {
//#piece 08c1d1d0f80821d166bf47e4ceedb6c78166fe096c8b91888f489aa73a598b63
//#piece 59d5481979e474ef2e15e32924c5deb4a836983064198d699130c62763396873
//#piece 859ab9bd93d85543bee3299452e59a8692c41e8f5e364995c3c1cec7b18173c0
	const W = CUBE$1.W / 2, Lh = LEN / 2, H = CUBE$1.H, B = CUBE$1.base;
//#piece 658f359073f73326efca05cf05250c2cf8147686b6ac9d24b4849ed5de6a49da
		source: SRC$1.s7,
//#piece 0512b2098575a8adce06110494255d641e5f4be5f6b18d00425b3bfbcaefae15
		for (const y of [-Lh + 40, Lh - 40]) put(box(0, y, B / 2, CUBE$1.W - 203, 50.8, 50.8, 3), FRAME);
	});
	part("frame", {
		id: "cage",
		label: "Power Cube posts and top rails (2×2 angle)",
		count: 8,
//#piece 2217aee41ce5e8f06f7efaaff7bfb0992966e0b30bdc433ec4c2a1120a840a93
		for (const z of [B + 60, B + 220]) put(box(0, -Lh - 5, z, CUBE$1.W - 40, 9.5, 101.6, 2), STEEL);
//#piece af2d8dbc99bbbd6f74e9953af867069a03f1a4b87104bb925337de556a38f12b
		source: SRC$1.vii,
//#piece c5aed0d35966a27c40607db36a490d8374677e561a5207bf36ad4000ab97e2ae
//#piece 8a390ca68db82862898f7451c172db642de6abbc1e24f6298925cba363d8e537
			source: SRC$1.vii,
//#piece ce3bfe5a325a3c8c41c3a689a2b7aadcc2df21afffc17aa89e076a5b514f1d48
		}, base, (put) => put(box(0, 40, B + 6, CUBE$1.W - 140, 394, 12, 2), STEEL));
		part("engine", {
			id: "crankcase",
			label: "Engine crankcase",
			source: SRC$1.vii,
//#piece 4f774eacb70ef2b29e3daefb0d57b85fb61c03c55e750779d461f872ee9bb420
			put(box(0, 30, 225, 250, 300, 240, 26), ENGINE$1);
			put(box(0, 30, B + 22, 300, 290, 20, 6), DARK);
//#piece 1fb4910de87b4a99938abdbbb9307d926b1f3ec73c9095ffbfb1208b4c932dde
			], 11, 6), STEEL);
//#piece b460e40425b29eef29bdf65d7a0720d3a9c3b2cdd382864da335d18c192729de
			source: SRC$1.vii,
//#piece 3e43033db7f67d2746caffaa547c7d34e25e52e9fc9df121ba26e48c5bba239a
			put(cyl(at(100), at(250), 50, 18), DARK);
			for (let k = 112; k < 250; k += 13) put(cyl(at(k), at(k + 4), 70, 18), ENGINE$1);
			put(cyl(at(250), at(305), 68, 16), ENGINE$1);
			const g = block(.12, .04, .15, [
				0,
				0,
				0
			], .012);
			g.rotateZ(-sx * Math.PI / 4);
			g.translate(...L(...at(320)));
			put(T(g), BLACK);
//#piece ee6540af9166e8075a788be504af91b31659f50bf41ba779798d6f5bdc953150
//#piece 3aaaa7a78635fc82c816c2e1dbdfd115d6582debae2686e64d90fb9d9bcdd2f6
		});
		part("engine", {
			id: "air-cleaner",
			label: "Air cleaner",
			source: SRC$1.vii,
//#piece d3304d8f64614250a18e3fd1b250561f9fe039303703018b5a1ec922ca2dfd38
			source: SRC$1.vii,
//#piece 7da3f48ea7271b1bb4a10804244b204b2af0a89e2f2fca19d7ea0b7bd6439ff6
			source: SRC$1.vii,
//#piece adaf4cc3ade10e98e47ffbf0a3e67ce742927f113b2ef92b8b5c7a6549312bc9
			source: SRC$1.port,
//#piece 8659bb3356245dceb50ac18b43a71f96b7f98d88acb352c111b99a7f645f3b98
			source: SRC$1.vii,
//#piece f463377b7b97bef55b12b46551ecdcd651aae275a15148d52d2045458072f769
			source: SRC$1.port,
//#piece 7746babe974b08080c7b584be7b26ecf7c35522bf216cc9d1ecfea79b7985296
//#piece 91d0b2d3468c6e237f823ecce52787238d25ece1785f2bafc61b4448ccc36cca
			source: SRC$1.vii,
//#piece a8d94298ade6ecdf6b2a8ba8d4b0d204c13250f9ae5d895ead26ae5904c7b3ab
			put(box(0, -Lh + 120, 450, CUBE$1.W - 40, 180, 200, 10), "#3d4447");
			put(box(-200, -Lh + 29, 440, 26, 4, 140, 3), "#9fd7ff");
		});
		part("hydraulics", {
			id: "strainer",
			label: "Suction strainer and line",
			source: SRC$1.vii,
//#piece 5f4d3dde498f81904b8e50c37d288426f117b868db3b831b5e9b874d0fe9720d
			source: SRC$1.v156,
//#piece d3c24b6092c0ee16eaac5fb79e30da8dfd541ff850f5a8222b4b3a873c90bef0
			source: SRC$1.v156,
//#piece 9d9d3ce80bec69f7e4ed06fb42b646619660a9f0c47cbb7b00fc30868a79ab35
			], 32, 24), STEEL);
//#piece e9424773840b3e8abad15f255b5c7b46c2e0597f9b02783d7a847540e6e8f82f
			source: SRC$1.v156,
//#piece d6b707f389e0d27049ddc60b56269d7586deaf626159f184cf06d8aa0087d80f
			put(box(W - 10, -40, 230, 8, 330, 230, 4), DARK);
		});
		part("hydraulics", {
			id: "cooler-fan",
			label: "Cooler fan",
			source: SRC$1.v156,
//#piece e2f852a9360fec211410f822622c7080d2191e4bef4e928e3b74cff7cfac87ca
//#piece bdb61fe43bdae5cb21d72292d3575839b1b265f7ef52b05cd607dd5237ca2729
			], 44, 18), STEEL);
//#piece f152ade0a728f91ebfc20b60a9aebb95ada854d805b9dbcdc8ba1dac0aba1b01
			source: SRC$1.vii,
//#piece 09d6e9ef5d9e5dd8adb8d93b15c94a9235f4bec4fb32f1a1f78cfeed0bf28cad
			source: SRC$1.man,
//#piece e145384f1fc4a9cdc13ab2c17a59321033a1ba758575de89835a3184798cd5f6
			for (const [x, c] of [[230, RED], [290, "#2f6fb5"]]) {
//#piece 9858eb2203775e0b0bfad62381b1141ddbf64e5a10e95f0eed340aa5296c593e
			source: SRC$1.vii,
//#piece ac4788cd6b5896ae16e587dacbe7d14d31f3925a5b4742735781a07b9f52c0ba
			put(box(0, 90, 630, CUBE$1.W - 70, 400, 95, 14), RED);
//#piece e19373b3341d478519d6ef527d678a921d750282e64674d803403fe258048633
		});
		part("controls", {
			id: "battery",
			label: "12 V battery",
			source: SRC$1.vii,
//#piece 6ca4f01f205159fee8636299cb006ded0c1f7875e695941832360585b184fab7
//#piece 5fa1f7c6bcdf3f474958e78e177a7cea0c183ace242c547a4b79ab39caa6b122
//#piece 8d5df272c469398f1daf96bf52ed7615dd30eedb66ab6530b1229cf84967af28
*/
//#piece 29bef8651bf3c4a1905eed0909b49106db19218a298e8a3dfd89991d7b1ef092
//#piece 95d909e2b7427248cd274cc4ce6d82c1c48bb034b6e501af759c04c4968b09a0
//#piece fb80f04bd4f3528904a8bc2817cc97420947bf90da1a8956d67b1802b49a4669
		}
	};
}
/** The Power Cube on its own (OSE's VII / 7s), every part its own. @returns {Cast} */
const powerCube$1 = () => cubeCast({
	name: "Power Cube",
	assemblies: OWN,
	steps: OWN_STEPS,
	stepOf: STEP_OF
});

//#endregion
//#piece 6edf43a0ddfc0fae76ded7fd89bfd81c49788a6cc127763b6dce1afb5781d47d
const SOURCES = [
//#piece 46257cbea491a6e87b5ace47747f593440e7844af8f693b6f2259d0c7298d9f6
const SRC = /* @__PURE__ */ (() => ({
	vii: SOURCES[0].label,
	s7: SOURCES[1].label,
	v156: SOURCES[2].label,
	port: SOURCES[3].label,
	man: SOURCES[4].label,
	eng: SOURCES[0].label
//#piece 529b502eeec6c758a968cbfa1d0f990438026d7b711c27c3f4e96e5fe23aede5
function rrect(w, h, r) {
//#piece 480243eae280d85ba5412692f9a4011cc1b19952bfce5fa20dad16b820fe9866
const ext = (s, d, b = 8e-4) => GEO.extrude(s, d, b);
//#piece 83e52db11d6d0cf31d9eec2da344cbf03312b4c40c9e1cb889442238cab41365
const plate = (s, d, seg = 8) => new three.ExtrudeGeometry(s, {
	depth: d,
	bevelEnabled: false,
	curveSegments: seg
}).translate(0, 0, -d / 2);
//#piece 0783402bf26da4f2eaf31545e00ba91972581053e1cfea9d3bc2cf40cd5591f5
//#piece 22d5ae17639e07255ecd89747740959b61594ca36878bea0be71721ed5d2d140
	return plate(s, w, 4);
}
/** a rounded box, centred @param {number} w @param {number} h @param {number} d @param {number} [r] */
const box = (w, h, d, r = Math.min(w, h, d) * .12) => GEO.rbox(w, h, d, r, 3);
/** a solid of revolution about z from [r, z] points @param {[number, number][]} pts @param {number} [seg] */
const latheZ = (pts, seg = 48) => GEO.lathe(pts, seg).rotateX(Math.PI / 2);
/** about x @param {[number, number][]} pts @param {number} [seg] */
const latheX = (pts, seg = 48) => GEO.lathe(pts, seg).rotateZ(-Math.PI / 2);
/** a round bar (closed) along z, from z0 to z1 @param {number} r @param {number} z0 @param {number} z1 @param {number} [seg] */
const rodZ = (r, z0, z1, seg = 32) => latheZ([
//#piece 6ae380c2df3f46d5a5becb8123d5ac7efd84b497e32f47d90d726702fe8bf99a
function cyl(a, b, r, seg = 32) {
//#piece 9af3a00cb2433b0c7ae0193a5af5d84ba24438366d5fa68424609838af2e3e26
/** a hose or pipe through points @param {V3[]} pts @param {number} r */
const hose = (pts, r) => GEO.pipe(pts, r, {
//#piece dba5af98ea4527ac857629175c7a64943a9598c90003b9540f5fc84b3d4f63eb
function hex(at, dir, s, h) {
//#piece 20e4dcd1a8cf31f41ebdfe6d7dedc4af77f24f1366f842cb83bd3c32d401534c
	return g.translate(...at);
}
/** move a geometry @param {THREE.BufferGeometry} g @param {number} x @param {number} y @param {number} z */
const at = (g, x, y, z) => g.translate(x, y, z);
function materials() {
	return {
//#piece 436154d346e1c7a6a3150fa514c3e2d35b99018bc5ca0c9d6aa6212320468d91
	const M = materials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES$1,
		steps: STEPS$1,
		sources: SOURCES
//#piece c82ac7c7d66ca2ba4c5c5a37ec3c1f0270fc20799c71ea3b9e7b2c5dcfa0f083
		const sq = rrect(.1016, .1016, .006);
		sq.holes.push(rrect(.092, .092, .003));
		const skid = plate(sq, L, 4);
		part({
			id: "skids",
			label: "Base skids (4×4 tube)",
			assembly: "frame",
			count: 2,
			source: SRC.s7,
//#piece 0b244530f1c842e5182dce50eb183b2138adaa3e6a92fbeb2f48568ae7683219
		}, [-1, 1].map((sx) => m(at(skid.clone(), sx * (X - .0508), .0508, 0), M.red)), { explode: [
			0,
			-.1,
			0
		] });
		const sq2 = rrect(.0508, .0508, .004);
		sq2.holes.push(rrect(.0508 - .0064, .0508 - .0064, .002));
		const cross = plate(sq2, (X - .1016) * 2, 4).rotateY(Math.PI / 2);
		part({
			id: "cross-tubes",
			label: "Cross tubes (2×2)",
			assembly: "frame",
			count: 2,
			source: SRC.s7,
			what: "Two 2×2 tubes welded between the skids at front and back, squaring the base.",
			specs: [["Stock", "2\" × 2\" × 1/8\" tube"]]
		}, [-1, 1].map((sz) => m(at(cross.clone(), 0, .0762, sz * (Z - .04)), M.red)), { explode: [
//#piece cfd02528bd4767481385c340b512820e931e7897516e6c366b9beb442f3fdc9e
			return GEO.merge([at(box(t, h, leg, .0012), cx, B + h / 2, cz - sz * .044449999999999996 / 2), at(box(leg, h, t, .0012), cx - sx * .044449999999999996 / 2, B + h / 2, cz)]);
		};
		part({
			id: "posts",
			label: "Corner posts (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC.vii,
//#piece 05dd20b0e057347d305c4e7ee4bdfb2b702deacb355623a9bed0c36b2b718b6e
			if (ax === "x") return GEO.merge([at(box(W - .002, t, leg, .0012), 0, y, s * (Z - leg / 2)), at(box(W - .002, leg, t, .0012), 0, H - leg / 2, s * (Z - t / 2))]);
			return GEO.merge([at(box(leg, t, L - .002, .0012), s * (X - leg / 2), y, 0), at(box(t, leg, L - .002, .0012), s * (X - t / 2), H - leg / 2, 0)]);
		};
		part({
			id: "top-rails",
			label: "Top rails (2×2 angle)",
			assembly: "frame",
			count: 4,
			source: SRC.vii,
//#piece d00dd89f2c99d48b911614a95f2462195fddd9c33060ba2c3503f3972dad51ca
			assembly: "frame",
			count: 2,
			source: SRC.vii,
//#piece 43feca735f1bb2ec264176c36e18e9da5d3a5d1cccc1c98235e76d412fb9db66
		}, [-.115, .27].map((z) => m(GEO.merge([at(box(W - .1, .0032, .038, .001), 0, .5634, z), at(box(W - .1, .038, .0032, .001), 0, .5444, z + .0174)]), M.red)), { explode: [
			0,
			.1,
			0
		] });
		part({
			id: "engine-plate",
			label: "Engine mount plate",
			assembly: "frame",
			source: SRC.vii,
//#piece 1179ffa01023a3f6de569034d0915cd0b5ace97d5ce3d4960dd7ff388f765ed1
		}, [m(at(box(W - .06, .0127, .49, .002), 0, B + .00635, -.015), M.zinc), m(GEO.merge([-.31, .31].flatMap((x) => [-.23, .2].map((z) => hex([
			x,
			B + .0127,
			z
		], [
			0,
			1,
			0
		], .011, .009)))), M.zinc)], { explode: [
			0,
			-.06,
			0
		] });
		const qa = [];
		for (const y of [.162, .322]) qa.push(m(at(box(W - .04, .1016, .0095, .002), 0, y, -Z - .0048), M.red));
		const recv = rrect(.2032, .1016, .006);
		recv.holes.push(rrect(.1905, .1016 - .0127, .003));
		qa.push(m(at(plate(recv, .07, 4), 0, .2416, -Z - .044), M.red));
		for (const sx of [-1, 1]) qa.push(m(cyl([
//#piece 845d974d84c1a5672216bea793294f19c693c758b9c671dca30f1ae70db080f5
			source: SRC.man,
//#piece a89bb6e5225fdc749c7ddeff60dfbfe74129a1c1e41c2c0ed07e9f08bbfd1526
			assembly: "frame",
			count: 2,
			source: SRC.vii,
//#piece 94bf94657b6d837675d8d41a7a6c3e8e91b9f9dab2cbe028299127566ec414fa
		}, [-1, 1].map((sx) => m(at(eye.clone(), sx * (X - .028), H + .02, 0), M.zinc)), { explode: [
//#piece dfb8d2f7fccc1eed77fd91ac4ca9223606b8923f144aa7871bd1341fd67bb092
		const cc = [m(at(box(.25, .2, .29, .035), 0, .226, .03), M.black), m(at(box(.3, .018, .3, .004), 0, B + .0127 + .009, .03), M.black)];
		for (const [, sx] of banks) cc.push(m(onBank(latheZ([
			[0, 0],
			[.068, 0],
			[.068, .012],
			[0, .012]
		], 40).rotateX(-Math.PI / 2).translate(0, .088, 0), sx), M.black));
		cc.push(m(GEO.merge([-.135, .135].flatMap((x) => [-.08, .14].map((z) => hex([
			x,
			B + .0217,
			z
		], [
			0,
			1,
			0
		], .008, .008)))), M.zinc));
		cc.push(m(at(latheZ([
//#piece 2a68a2fa7d287a6dcbbf7784c55d77c5729006689f4b1a002158408f5d3fcf5f
			assembly: "engine",
			source: SRC.eng,
//#piece 0b8739caa287b9370fab84ce180726ef0883598eb14bdf47032ffec6d9432ba5
		crank.add(m(rodZ(.0175, -.165, -.052), M.shaft), m(rodZ(.0175, .052, .205), M.shaft), m(at(ext(web, .016, .001), 0, 0, -.044), M.forged), m(at(ext(web, .016, .001), 0, 0, .044), M.forged), m(at(rodZ(.019, -.036, .036), 0, r, 0), M.shaft));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			assembly: "engine",
			source: SRC.eng,
//#piece 95776ef12898f33af1efa474ef19e109a4dc08ab8fe3acc4b058ba5d332f83ad
			const fin = rrect(.128, .128, .012);
			fin.holes.push(ring(0, 0, ENGINE.bore / 2 + .006));
			const fins = [];
			for (let k = 0; k < 12; k++) fins.push(at(plate(fin, .0026, 6), 0, 0, .1 + k * .0072).rotateX(-Math.PI / 2));
//#piece 0fe6228b1a700947620979525ac9dd2122c30d6054ff2c0bc21d3cb39f1a88a0
				assembly: "engine",
				source: SRC.eng,
//#piece 988ea4661c3fcf0fea836d7230c130d4d651897903bef9ad585bbc3b682f58d8
			const hb = at(box(.13, .05, .13, .01), 0, ENGINE.deck + .025, 0);
			const hfins = [];
			for (let k = 0; k < 4; k++) hfins.push(at(slab(.146, .0028, .146), 0, ENGINE.deck + .008 + k * .011, 0));
			head.add(m(onBank(GEO.merge([hb, ...hfins]), sx), M.castAl));
			head.add(m(onBank(at(box(.11, .032, .1, .012), 0, ENGINE.deck + .066, 0), sx), M.black));
			head.add(m(onBank(GEO.merge([-1, 1].flatMap((a) => [-1, 1].map((b) => at(new three.CylinderGeometry(.0055, .0055, .006, 6), a * .042, ENGINE.deck + .084, b * .036)))), sx), M.zinc));
			const plugAt = C.clone().addScaledVector(d, ENGINE.deck + .03).add(new three.Vector3(0, 0, .065 + off(sx)));
			const plug = [
				m(cyl(plugAt.toArray(), plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), .0095, 6), M.zinc),
				m(cyl(plugAt.clone().add(new three.Vector3(0, 0, .012)).toArray(), plugAt.clone().add(new three.Vector3(0, 0, .036)).toArray(), .0055, 20), M.ceramic),
				m(cyl(plugAt.clone().add(new three.Vector3(0, 0, .03)).toArray(), plugAt.clone().add(new three.Vector3(sx * .01, 0, .065)).toArray(), .009, 20), M.satin)
			];
			plug.push(m(hose([
//#piece 501bebd68a0e45ff567b0c12be261ddb0c6413718db552df7c246cdb07b50e97
				assembly: "engine",
				source: SRC.eng,
//#piece d093b6bc06298d4859b7c65edd0b693bad56770840b5c8c3072f6297109f7b33
				assembly: "engine",
				source: SRC.eng,
//#piece fcf61da1d6ada125cb412b7e5dd57724049023392fe015ab15a96b34f70ccb3b
			], 48), M.piston), m(cyl([
//#piece 6c0d9891587d447ce9b99f07a2ff747b3dedf3cd33f9e276e982cb4cf4a9c568
			const big = rrect(.05, .05, .024);
			big.holes.push(ring(0, 0, .0195));
			const small = rrect(.026, .026, .0125);
			small.holes.push(ring(0, 0, .0096));
			rod.add(m(GEO.merge([
				ext(beam, .011, 6e-4),
				ext(big, .014, 8e-4),
				at(ext(small, .012, 6e-4), 0, ENGINE.rod, 0)
//#piece fed8875808f467702205772e652648d5cec6fde322b55bcbf12eb980ae78962b
				assembly: "engine",
				source: SRC.eng,
//#piece 1505805951243a332484e566f8cfaf743cfac189c4f1eadd1cec97ff67432611
				assembly: "engine",
				source: SRC.eng,
//#piece da0fffea6f275f4b0213df19a88643963deb1647b63ec2d37a856825ae0cd954
		fly.add(m(latheZ([
			[.015, .185],
			[.1, .185],
			[.11, .19],
			[.11, .215],
			[.06, .218],
			[.03, .225],
			[.015, .225]
		], 72), M.castIron));
		const vane = slab(.07, .003, .03);
		const vanes = [];
		for (let k = 0; k < 18; k++) vanes.push(at(vane.clone(), .07, 0, 0).rotateZ(k / 18 * Math.PI * 2 + .3).translate(0, 0, .232));
		fly.add(m(GEO.merge(vanes), M.vane));
		fly.add(m(at(ringGear(112, .002, .011), 0, 0, .192), M.steel));
		fly.add(m(at(rodZ(.024, .205, .245), 0, 0, 0), M.zinc));
//#piece b16b5433c69faf985bb7169ba0b531be90eb7d0b62d3ec0b4a6cc50e83a6aee6
		const scr = m(at(plate(screen, .0025, 10), 0, 0, .25), M.satin);
		part({
			id: "flywheel",
			label: "Flywheel, fan and ring gear",
			assembly: "engine",
			source: SRC.eng,
//#piece 826a6cf1c556ffe47a78657279a00f637a921269dcec4dc49e7889251b66c1de
			assembly: "engine",
			source: SRC.eng,
//#piece 5b548500a4bc9207db71b8985a412398442034d636663eb246f3a6ee00b4d525
		const face = rrect(.47, .4, .07);
		face.holes.push(ring(0, -.06, .112));
		const shroud = [m(at(ext(face, .003, .001), 0, CRANK.y + .06, .262), M.black)];
		shroud.push(m(at(new three.TorusGeometry(.115, .005, 10, 72), 0, CRANK.y, .264), M.black));
		for (const y of [.17, .2]) shroud.push(m(cyl([
			-.17,
			CRANK.y + y,
			.2635
		], [
			.17,
			CRANK.y + y,
			.2635
		], .004, 12), M.black));
		shroud.push(m(GEO.merge([-1, 1].flatMap((sx) => [-.11, .21].map((y) => hex([
			sx * .2,
			CRANK.y + y,
			.2635
		], [
			0,
			0,
			1
		], .005, .004)))), M.zinc));
		shroud.push(m(at(box(.47, .003, .11, .001), 0, CRANK.y + .26, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at(box(.003, .36, .11, .001), sx * .235, CRANK.y + .08, .205), M.black));
		for (const sx of [-1, 1]) shroud.push(m(at(box(.16, .003, .15, .001), sx * .15, CRANK.y + .22, .09), M.black));
		part({
			id: "blower",
			label: "Blower housing",
			assembly: "engine",
			source: SRC.eng,
//#piece c17533aeb235142f5af24f013ccaefde1d58216854e98f53418b1c8aa3daa6bb
		const carb = [m(at(box(.055, .05, .06, .008), 0, .42, CRANK.z), M.castAl), m(cyl([
//#piece 78757d47eac9da6cb3c802cc91b89242e1ee51df95c8026b0eab16dd41ea7a9b
			carb.push(m(hose([
//#piece a4bed39d3faeb8c967add1e8c89be40792709b75ffd6fb3058bd09e19915f5c2
		const lever = m(at(box(.004, .035, .012, .001), 0, .0175, 0), M.zinc);
//#piece 47958287481b244e4b359f90451b9c86afaee1f648828950bfd8405130c1d77f
			assembly: "engine",
			source: SRC.eng,
//#piece e460dfe8d80f87c25533720a6b1b7a318ef67b442be169a73be4cb5e52187b75
			m(at(box(.22, .012, .17, .004), 0, .476, CRANK.z), M.black),
			m(at(element, 0, 0, CRANK.z), M.paper),
			m(at(box(.23, .03, .18, .012), 0, .538, CRANK.z), M.plastic),
			m(cyl([
//#piece 7bbda81740f188cc940fd1596f1f7e33c6e6516e28e4d657b6b9adb6030c5f6c
			assembly: "engine",
			source: SRC.eng,
//#piece 02d791d0d8a0e7a2f09b4e0895bd9a4af4484858809e1746c833f2cd4aa346d3
		const muff = [m(cyl([
			-.255,
			.3,
			-.095
		], [
			-.255,
			.3,
			.085
		], .05, 40), M.muffler)];
		for (const z of [-.095, .085]) muff.push(m(cyl([
			-.255,
			.3,
			z
		], [
			-.255,
			.3,
			z + (z < 0 ? -.004 : .004)
		], .052, 40), M.muffler));
		muff.push(m(cyl([
//#piece acfe469b5de5c7d2dfec49a40df7c56a6a59666373392890ebf14a931db6cf5e
		muff.push(m(hose([
			exL.toArray(),
			[
				-.23,
				.36,
				-.05
			],
			[
				-.255,
				.33,
				-.06
			]
		], .0115), M.muffler));
		muff.push(m(hose([
//#piece a1c55328e4d4c6a1f3148f382c06a944b64f30cbfe48dc43552a4b03fae22592
			assembly: "engine",
			source: SRC.vii,
//#piece 58340ad3a17e838244930191b0bd3256f53adfcc5926f55c025703d400820284
			assembly: "engine",
			source: SRC.vii,
//#piece 1ee074807ac7df897f78b328fd938542cda95078cffa2293d274cbbc837987d2
			specs: [["Voltage", "12 V"], ["Power", "~0.9 kW [inferred]"]]
		}, [
			m(cyl([
				-.155,
				.17,
				.06
			], [
				-.155,
				.17,
				.17
			], .036, 32), M.black),
			m(cyl([
				-.155,
				.17,
				.17
			], [
				-.155,
				.17,
				.19
			], .024, 28), M.castAl),
			m(cyl([
				-.108,
				.186,
				.2
			], [
				-.108,
				.186,
				.226
			], .013, 10), M.steel),
			m(cyl([
//#piece 92a4a334eaae8bc9be6ad5a1478c9f084ff283874e5f74e26ddf96fd96ad168f
			assembly: "engine",
			source: SRC.eng,
//#piece c39fb194858368a067db1a6555a20a982b1e86b1c9e54d84721a82ac67743f0d
		}, [
			m(cyl([
				.125,
				.165,
				-.05
			], [
				.205,
				.165,
				-.05
			], .038, 32), M.capBlue),
			m(hose([
				[
					.1,
					.25,
					.12
				],
				[
					.13,
					.33,
					.13
				],
				[
					.13,
					.4,
					.13
				]
			], .007), M.black),
			m(cyl([
//#piece 68e5369ef9054fb6482a98079fc1b82fa14eaad5fecd1b78b4bf82eb0a643aef
		for (const sx of [-1, 1]) ign.push(m(at(box(.04, .05, .03, .005), sx * .13, CRANK.y + .12, .2), M.satin));
		part({
			id: "ignition",
			label: "Ignition coils",
			assembly: "engine",
			count: 2,
			source: SRC.eng,
//#piece 6996b440d57d8e3fba99bfe71528dcb84b4578dac420923d3e071100ebad7d10
		const gov = [m(cyl([
			.03,
			.36,
			-.02
		], [
			.03,
			.42,
			.04
		], .0025, 8), M.zinc), m(at(box(.012, .05, .006, .001), .03, .34, -.03), M.zinc)];
		part({
			id: "governor",
			label: "Governor and linkage",
			assembly: "engine",
			source: SRC.eng,
//#piece 3e4abd9733b9fcc204a164b9fb0f534f2b32c9f3dfcc865d7957d65d1e443f71
		cpl.add(m(latheZ([
//#piece b82e8d2c0ad54781c3f292ff6e52dbc90ae2f01048f4f711867c2068d1aa8163
		cpl.add(m(GEO.merge([-.228, -.175].map((z) => at(cyl([
			0,
			.032,
			0
		], [
			0,
			.04,
			0
		], .005, 6), 0, 0, z))), M.satin));
		part({
			id: "coupling",
			label: "Shaft coupling",
			assembly: "hydraulics",
			source: SRC.port,
//#piece 07fdb37c4240579b68e6fe95c8be930129046918c5c78149f9564aa50c84415e
		const brk = rrect(.2, .2, .01);
		brk.holes.push(ring(0, 0, .042));
		part({
			id: "pump-bracket",
			label: "Pump bracket",
			assembly: "hydraulics",
			source: SRC.vii,
//#piece 5514371d3b53778fac469efa4baae5b4978a09ff476e56f9573e549e471114d3
			m(at(ext(brk, .0127, .001), 0, CRANK.y, -.2235), M.zinc),
			m(at(box(.2, .0127, .06, .002), 0, B + .0127 + .0064, -.2), M.zinc),
			m(GEO.merge([-1, 1].map((sx) => at(box(.0095, .09, .05, .001), sx * .08, B + .0127 + .045, -.2))), M.zinc)
//#piece a6336e5fe3aff8b74e1cbcce9ba3659a4d94fa7e97092f07fbb33dc0d22d82ce
		const bodyShift = new three.Shape(rrect(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2)));
		bodyShift.holes.push(eight);
		pump.add(m(at(ext(flange, .01, 8e-4), 0, 0, z0 - .003), M.pumpAl));
		const bodyM = m(at(ext(bodyShift, bw, 6e-4), 0, 0, z0 - .01 - bw / 2), M.pumpAl);
		const cover = m(at(ext(new three.Shape(rrect(.09, .115, .012).getPoints(8).map((p) => new three.Vector2(p.x, p.y + cd / 2))), .016, .0015), 0, 0, z0 - .01 - bw - .008), M.pumpAl);
		const tb = GEO.merge([-1, 1].flatMap((sx) => [-1, 1].map((sy) => hex([
			sx * .034,
			cd / 2 + sy * .045,
			z0 - .01 - bw - .016
		], [
			0,
			0,
			-1
		], .0065, .008))));
		const ports = [m(cyl([
			-.045,
			cd / 2,
			z0 - .01 - bw / 2
		], [
			-.066,
			cd / 2,
			z0 - .01 - bw / 2
		], .019, 6), M.zinc), m(cyl([
//#piece e6edf8667ae9b540e99817e3796f6e2bacd22affbae5fcf58214f9fd099c6b70
			assembly: "hydraulics",
			source: SRC.port,
//#piece 97017cc7b52870d77906a0c6f4cee68c551d93bfdccdd03fc94b22165645c41f
		const drive = m(at(gearGeo.clone(), 0, 0, 0), M.gear);
		const idler = m(at(gearGeo.clone(), 0, 0, 0), M.gear);
//#piece 343481ecc877ef9d6754f6ffe4c640df07626eaaa7e3b3182f1ed24d7dcb9f2f
			assembly: "hydraulics",
			source: SRC.port,
//#piece 8a4ae6ba774b38b718b9ae8f3cf9cabc3fc1aa76556b960ddd53d273427bf28c
			at(box(rw, rv.t, rd, .001), rc[0], rv.y0 + rv.t / 2, rc[2]),
			at(box(rw, rv.t, rd, .001), rc[0], rv.y1 - rv.t / 2, rc[2]),
			at(box(rv.t, rh - 2 * rv.t, rd, .001), rv.x0 + rv.t / 2, rc[1], rc[2]),
			at(box(rv.t, rh - 2 * rv.t, rd, .001), rv.x1 - rv.t / 2, rc[1], rc[2]),
			at(box(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z0 + rv.t / 2),
			at(box(rw - 2 * rv.t, rh - 2 * rv.t, rv.t, .001), rc[0], rc[1], rv.z1 - rv.t / 2)
//#piece 541d4a455f29caa4e5baa8b449edec9d4506f2a3bd4411f8472e4e8004238041
			assembly: "hydraulics",
			source: SRC.vii,
//#piece d3f8c08a1f8dec072570a6d612751e8a1040368e9c5c884c0e1e0ad146bf049c
		const oil = m(at(box(inner.w - .001, inner.h * level, inner.d - .001, .002), rc[0], rv.y0 + rv.t + inner.h * level / 2, rc[2]), M.oil);
		const baffle = m(at(box(.003, inner.h * .7, inner.d - .002, 8e-4), .02, rv.y0 + rv.t + inner.h * .35, rc[2]), M.tank);
		const strainer = [m(cyl([
			-.2,
			rv.y0 + .004,
			-.25
		], [
			-.2,
			rv.y0 + .05,
			-.25
		], .026, 32), M.brass), m(cyl([
			-.2,
			rv.y0 + .05,
			-.25
		], [
			-.2,
			rv.y0 + .056,
			-.25
		], .028, 32), M.zinc)];
		part({
			id: "oil",
			label: "Hydraulic oil",
			assembly: "hydraulics",
			source: SRC.vii,
//#piece 1cfd4b0e3a9e46e5d1879b0007078097aef914e2119082ea356e207aab24d2b2
			assembly: "hydraulics",
			source: SRC.vii,
//#piece c60bace14db84e6fd959ff709fbd92b916775357584c5738367fa1c2450c3218
			assembly: "hydraulics",
			source: SRC.vii,
//#piece a2870948dbcec0a6d9e1a4f5db23e7a9dfb833a310a325cd555c90c3bef9e557
		}, [m(hose(suctionPts, .0175), M.hose)], { explode: [
			-.12,
			.05,
			-.2
		] });
		const relief = new three.Group();
		relief.add(m(at(box(.05, .05, .05, .004), .13, .3, -.255), M.machinedAl), m(cyl([
			.155,
			.3,
			-.255
		], [
			.2,
			.3,
			-.255
		], .012, 24), M.steel), m(cyl([
			.2,
			.3,
			-.255
		], [
			.215,
			.3,
			-.255
		], .009, 6), M.brass), m(cyl([
			.18,
			.3,
			-.255
		], [
			.188,
			.3,
			-.255
		], .016, 6), M.zinc));
		relief.add(m(hose([[
			.13,
			.325,
			-.255
		], [
			.13,
			rv.y0 - .002,
			-.255
		]], .008), M.hose));
		part({
			id: "relief",
			label: "Relief valve",
			assembly: "hydraulics",
			source: SRC.v156,
//#piece c8fec853883a5c1e1a38bb11baf9663c7b5d862fc7cd6aa9948a487c53b06604
			assembly: "hydraulics",
			source: SRC.vii,
//#piece eba3214bdba4d08a660b22efcbb3ca2c0355b40880f9a78486a0d2fdcba57f56
		}, [m(hose(pressPts, .0125), M.hose), m(hose([
//#piece 4b4dea30843b82be82c83b896f6bd81db6a42595fee59f7e962ec48d36218e02
		gauge.add(m(latheZ([
			[0, 0],
			[.05, 0],
			[.05, .028],
			[.046, .032],
			[0, .032]
		], 48), M.steel), m(latheZ([
			[0, .0275],
			[.045, .0275],
			[.045, .029],
			[0, .029]
		], 48), M.dial), m(latheZ([
//#piece d476a5ace9bf50cc55c7ef9bce60409189069516a42381dcd0e2439accdcfad9
			ticks.push(at(box(.0012, k % 5 === 0 ? .009 : .005, 4e-4, 2e-4), 0, .037, 0).rotateZ(a - Math.PI / 2).translate(0, 0, .0296));
		}
		gauge.add(m(GEO.merge(ticks), M.satin));
		const needle = new three.Group();
		needle.position.z = .0302;
		needle.add(m(at(box(.002, .036, 8e-4, 3e-4), 0, .014, 0), M.needle), m(rodZ(.003, -6e-4, 6e-4), M.satin));
		gauge.add(needle);
		gauge.add(m(hose([
//#piece 43b3eb22d9bdf6e02d8ab193ee2d2a3fe6b0ad56c24e3ca369f80d259802b10f
			assembly: "hydraulics",
			source: SRC.v156,
//#piece 67ca6c9dedd1da11fe7da237883c30c15588ca4278215ff94df296d57000298f
			cp.push(m(latheZ([
//#piece 2b9522aaa19bb5452547967e2343caebe160fcac994ad8eccb54b0fe4119ea27
			cp.push(m(cyl([
				x,
				.2516,
				-.364
			], [
				x,
				.2516,
				-.384
			], .019, 32), capM));
		}
		cp.push(m(at(box(.15, .045, .006, .002), .26, .2516, -.326), M.zinc));
		part({
			id: "couplers",
			label: "Quick couplers",
			assembly: "hydraulics",
			count: 2,
			source: SRC.man,
//#piece 506120505b8784c7757c7e3f8e1ffbf740dc7b280680c4f99b77e505c3dd7977
			assembly: "hydraulics",
			source: SRC.vii,
//#piece 332323516ad75e55d04af55a7e681fc59dfe755cfd18022b924ef8f1aa9cc51b
		}, [m(hose([
			[
				.29,
				.2516,
				-.3
			],
			[
				.3,
				.2,
				-.28
			],
			[
				.318,
				.152,
				-.272
			]
		], .013), M.hose), m(hose([
//#piece a0bcda15e3868699f3e825f0ff087fa42ff882894da2e94db30fcda9a9463345
		for (let k = 0; k < 6; k++) tubes.push(cyl([
//#piece 913efc9a8eb768798ab34804e0536f84a0544e4f9ef95f98f37ca8dd76bab5ac
		for (let z = -.262; z < .026; z += .006) fins.push(at(slab(.026, .188, 5e-4), .318, .232, z));
		co.push(m(GEO.merge(fins), M.finAl));
		for (const z of [-.272, .032]) co.push(m(cyl([
			.318,
			.14,
			z
		], [
			.318,
			.324,
			z
		], .013, 24), M.machinedAl));
		const guard = rrect(.31, .2, .012);
		guard.holes.push(rrect(.29, .18, .006));
		const bars = [plate(guard, .004, 4)];
		for (let k = 1; k < 6; k++) bars.push(at(slab(.004, .18, .004), -.145 + k * .0483, 0, 0));
//#piece ca742540baf6337324ac4b185c9ca3d7b25b6fba38bac1ffb71e74e08d7cc854
			assembly: "hydraulics",
			source: SRC.v156,
//#piece 0a94bf92836e27439c4b511e8eba7d3ba84e46e098778a881920f62c1c6fd5f7
		}), M.satin), m(latheX([
			[0, 0],
			[.02, 0],
			[.02, .018],
			[0, .022]
		], 24), M.satin));
		fan.add(blade);
		fan.add(m(cyl([
//#piece a5f0cb1c8a30093fecfbab01569260130ad0f48f51dedeb0263a7c951d839fbc
		fan.add(m(ext(shroudRing, .03, 8e-4).rotateY(Math.PI / 2).translate(.012, 0, 0), M.satin));
		part({
			id: "cooler-fan",
			label: "Cooler fan",
			assembly: "hydraulics",
			source: SRC.v156,
//#piece a9ba38a3a2e0812eaba7603111ffa73609c829cfa1a53ebcc762d1b58d893623
			source: SRC.man,
//#piece 06a5be756047cb2b0fb6e53a52774bb9a66deb0eabeb7d2096b2e220822fbd4b
			m(at(box(.07, .022, .07, .006), .15, rv.y1 + .011, -.22), M.machinedAl),
			m(cyl([
				.15,
				rv.y1 + .022,
				-.22
			], [
				.15,
				rv.y1 + .094,
				-.22
			], .046, 40), M.capRed),
			m(cyl([
//#piece 58316ca9426a73895aae35647d938e36739547fea19f4b3c9e9a873802bdb5a3
			assembly: "hydraulics",
			source: SRC.vii,
//#piece b7cb089e3c97f34f6e21913fe236d3162645bbc884087d95b24262c73415e5de
		}, [m(cyl([
			-.06,
			rv.y1,
			-.22
		], [
			-.06,
			rv.y1 + .02,
			-.22
		], .02, 24), M.zinc), m(cyl([
//#piece fba49862fa47ddfec37547340abb2a6549bfbad2e0cb30519594636d28c53724
			assembly: "hydraulics",
			source: SRC.vii,
//#piece baab91564e442b0125bfe5cee4ecbd75465b77b010ca1a662893a52ec3869f2d
			m(at(box(.026, .13, .008, .003), -.2, .445, rv.z0 - .004), M.zinc),
			m(at(box(.012, .11, .006, .002), -.2, .445, rv.z0 - .008), M.glass),
			m(at(box(.01, .11 * level, .004, .001), -.2, .4351, rv.z0 - .008), M.oil)
		], { explode: [
			0,
			.04,
			-.16
		] });
	}
	{
		const ft = {
			w: .56,
			h: .1,
			d: .44,
			y: .567,
			z: .08
		};
		const shell = box(ft.w, ft.h, ft.d, .02);
		const fuel = m(at(box(ft.w - .01, ft.h * .7, ft.d - .01, .012), 0, ft.y + .005 + ft.h * .35, ft.z), M.fuel);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "controls",
			source: SRC.vii,
//#piece 7aa8212a667f250bd07ebf9a1c949c55f637b20da644a09bf3d61ab7797e43f9
			m(at(shell, 0, ft.y + ft.h / 2, ft.z), M.hdpe),
			m(GEO.merge([
				-.12,
				0,
				.12
			].map((x) => at(box(.012, .006, ft.d - .06, .003), x, ft.y + ft.h + .002, ft.z))), M.hdpe),
			m(cyl([
//#piece ba4bc6be2cbf2bbdfa9ab71d048c8cd643964e98ed9f3c777134865e3b96803d
			assembly: "controls",
			source: SRC.vii,
//#piece 884daaf59b2498a809d93b5b48eb9d7b01a9402f5b8a334d43b7da1a2bfaadf1
			assembly: "controls",
			source: SRC.vii,
//#piece 839e6be641575d5a65b3779d36f13b97a8977c6e41ebe0d7c65bb796cf1296f9
			m(hose([
				[
//#piece eb3c4f80d61f83eea90061872a8bfeed52d24cf57eb2e91c6048bf5898434213
			m(at(box(.016, .02, .02, .003), -.22, .54, .27), M.brass),
			m(cyl([
//#piece 84d3c7eeb38ab3306d9bf1d1e807415d4719095a8eda6b2fd1a2c58c1b1596d3
			assembly: "controls",
			source: SRC.vii,
//#piece 80f0e130468cddbdebbd0bca1d6b1c5b9faa6c3492eb4fff98ec12ca1457ecd6
			m(at(box(bt.w, bt.h, bt.d, .006), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(cyl([
				bt.x - .035,
				bt.y + bt.h,
				bt.z + .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z + .07
			], .008, 16), M.lead),
			m(cyl([
				bt.x - .035,
				bt.y + bt.h,
				bt.z - .07
			], [
				bt.x - .035,
				bt.y + bt.h + .018,
				bt.z - .07
			], .008, 16), M.lead),
			m(at(box(.15, .004, .025, .001), bt.x, bt.y + bt.h + .002, bt.z), M.zinc)
		], { explode: [
			.2,
			0,
			.16
		] });
		part({
			id: "cables",
			label: "Battery cables",
			assembly: "controls",
			source: SRC.vii,
//#piece 83f9ca6cce2e6084773214ffafc55d0c4291ed85c6e985e64dfd05d65cbe121e
		}, [m(hose([
//#piece 2099b812ce9d2e19e92679be779caa86ef99034d977eb7489b1885fa93773176
		], .0055), M.capRed), m(hose([
//#piece 30a745d73c95ff87ecb9ac82ad754c8afc8c89d0be5e739b90dd9d8063071a3f
		panel.add(m(at(box(.11, .17, .004, .003), .275, .5, Z + .003), M.satin));
		panel.add(m(cyl([
			.25,
			.54,
			Z + .005
		], [
			.25,
			.54,
			Z + .02
		], .014, 24), M.steel), m(at(box(.004, .022, .004, .001), .25, .54, Z + .024), M.brass));
		panel.add(m(cyl([
			.3,
			.54,
			Z + .005
		], [
			.3,
			.54,
			Z + .03
		], .0035, 12), M.zinc), m(cyl([
			.3,
			.54,
			Z + .03
		], [
			.3,
			.54,
			Z + .04
		], .009, 20), M.yellow));
		panel.add(m(at(box(.05, .02, .01, .002), .275, .46, Z + .008), M.satin), m(at(box(.035, .012, .002, .001), .275, .46, Z + .0135), M.glass));
		const tl = new three.Group();
		tl.position.set(.275, .43, Z + .006);
		tl.add(m(at(box(.006, .04, .006, .001), 0, .02, .004), M.green), m(at(box(.016, .01, .012, .002), 0, .04, .006), M.green));
		panel.add(tl);
		part({
			id: "panel",
			label: "Control panel",
			assembly: "controls",
			source: SRC.vii,
//#piece 30b0437fa30bf8d35beed78fcaa70625258122e8271ebdaa220b018a634842b0
//#piece debd3fe8e520f49b7b11b541732619380be1d7bd1a46a000d758ac570294b5a0
const electroCubeL = (v = 2) => v >= 2 ? CUBE$1.L : 900;
//#piece 88035a2ca456a8e22839be8337754d5972c6df543bdbde644eda284d9e223bbd
const HISTORY = /* @__PURE__ */ (() => ({ powercube: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "powercube-7s",
			label: "VII / 7s",
			note: "as at v1: one rigged mesh in flat colours",
			make: () => powerCube$1()
		}, {
			id: "powercube-electric",
			label: "Electric",
			note: "as at v1: a generator in place of the pump, since its own machine, the ElectroCube (its v1 here)",
			make: () => electroCube(1)
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "The Electric variant is its own actor now: the ElectroCube",
		build: [{
			id: "powercube-7s",
			label: "VII / 7s",
			note: "as at v2: one rigged mesh in flat colours, its parts named",
			make: () => powerCube$1()
		}]
	},
	{
		v: 3,
		date: "2026-10-14",
		note: "Built at AirSup’s realism: every part real solids in measured materials (cast aluminium fins on cast-iron liners, a forged crank and rods, zinc-plated steel, braided hoses, a copper and aluminium cooler, the oil and the petrol inside), the V-twin’s pistons on their rods turned by the crank, the gear pump’s two gears meshing in their housing; a solver runs it on real equations (the pump’s flow, slip and torque, the engine’s torque curve and governor, the relief valve, the oil’s heat) on two sliders, its hydraulic power read out; explode, cut away, x-ray, labels with live readings, slow, and its break: dead-headed with the relief stuck, the engine stalls"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "powercube",
	label: "Power Cube",
	note: "Open Source Ecology’s hydraulic power unit, the heart of every machine of their set: an engine on a pump in a steel cube with its own tanks, cooler and couplers, lifted from one machine to the next — every part its own, as in the LifeTrac that carries one",
	from: "Open Source Ecology: the Global Village Construction Set",
	variants: [{
		id: "powercube-7s",
		label: "VII / 7s",
		note: "Power Cube VII / 7s (v15.6, 2014–15): an 810 cc 28 hp air-cooled V-twin on a 16 cm³ gear pump, 15.2 gpm up to 3,000 psi, a 27\" cube, ~181 kg; running on its sliders",
		make: () => castOf(powerCube())
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
