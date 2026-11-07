//#piece 29499b36d2bb63e85fe4ed56e041e6ba0b081c8eca2c41ac36ae39d087d43ee5
const S$2 = .001;
//#piece 095d5228117769f013da7e1e8af2d2aa47fab94435790852e2b5cbee5d474ccd
const RED$2 = "#c8372d";
const FRAME = "#c8372d";
const STEEL$2 = "#8d9396";
const DARK$2 = "#2b2d2f";
const ENGINE = "#2f3133";
const BLACK$2 = "#161718";
const ALU = "#b9bdbf";
const HOSE = "#202224";
const BRASS = "#c9a03a";
const YELLOW$2 = "#f0c419";
const GREEN = "#2c7a4a";
//#piece 439d2b6ca37b6b61dee46779f19265e117d3901b1a53f9d6e9c4f5bf4dd6bdf5
const SRC$2 = {
//#piece ae28cb4b29418b8aa3acb441546b8272795f58160c4006b20cbcbdbb1775826b
		x * S$2,
		z * S$2,
		y * S$2
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 2) => T(block(w * S$2, h * S$2, l * S$2, L(x, y, z), r * S$2));
	const bar = (a, b, w, h, r = 2) => T(beam(L(...a), L(...b), w * S$2, h * S$2, r * S$2));
//#piece d2ca4bab6a379ab60cac7c1a914826ca5766b5a220a624f17057025bb684ee21
		const g = new three.CylinderGeometry(r1 * S$2, r * S$2, A.distanceTo(B), seg);
//#piece 393c6a3327995c6fa5cbd4541daa35e045a6b13413ecf8c8f58fc6166e60c809
	const hose = (pts, r = 9.5) => T(new three.TubeGeometry(new three.CatmullRomCurve3(pts.map((p) => new three.Vector3(...L(...p)))), 24, r * S$2, 8, false));
//#piece b30e53550ff5a0e79d8036ccc899e40e62d826ee3e9da8cbe8bd595f33082c6d
			], t, leg).translate(sx * (-t / 2) * S$2, 0, 0));
//#piece c7c07b0d3db6db9bb939e818be14847647e54105bf70acfc6cc84ecaa8199a9f
		source: SRC$2.s7,
//#piece 406f405bb31b10cce72716cdbec045202d0975ddf5a29595062b7977a6af7de8
		source: SRC$2.vii,
//#piece 1222da999cd9486aaa976f402c6996676867b8611a40c7bc39cba19a5ef8f9be
		source: SRC$2.man,
//#piece 50e2c44af500884da373f68190c2ddd368bfb50b84e6e1cf114f98890d232f44
		for (const z of [B + 60, B + 220]) put(box(0, -Lh - 5, z, CUBE.W - 40, 9.5, 101.6, 2), STEEL$2);
		put(box(0, -Lh - 40, B + 140, 203, 70, 101.6, 6), STEEL$2);
//#piece 013389d202031c0ed7e77eff5a6c712f1352bd5e84b26aeeb973228ebbb29171
		], 12, 10), STEEL$2);
	});
	part("frame", {
		id: "lift-eyes",
		label: "Power Cube lifting eyes",
		count: 2,
		source: SRC$2.vii,
//#piece c5aed0d35966a27c40607db36a490d8374677e561a5207bf36ad4000ab97e2ae
			const g = new three.TorusGeometry(26 * S$2, 7 * S$2, 8, 16);
			put(T(g.translate(...L(sx * 180, 0, H + 26))), STEEL$2);
		}
	});
	if (engine) {
		part("engine", {
			id: "engine-plate",
			label: "Engine mount plate",
			source: SRC$2.vii,
//#piece ce3bfe5a325a3c8c41c3a689a2b7aadcc2df21afffc17aa89e076a5b514f1d48
		}, base, (put) => put(box(0, 40, B + 6, CUBE.W - 140, 394, 12, 2), STEEL$2));
		part("engine", {
			id: "crankcase",
			label: "Engine crankcase",
			source: SRC$2.vii,
//#piece a530624cf4fd07a9100dc70c172be1a2b7c891262b3e80c44d0f1b8fc6cbde78
			put(box(0, 30, B + 22, 300, 290, 20, 6), DARK$2);
//#piece 1fb4910de87b4a99938abdbbb9307d926b1f3ec73c9095ffbfb1208b4c932dde
			], 11, 6), STEEL$2);
//#piece b460e40425b29eef29bdf65d7a0720d3a9c3b2cdd382864da335d18c192729de
			source: SRC$2.vii,
//#piece 3e43033db7f67d2746caffaa547c7d34e25e52e9fc9df121ba26e48c5bba239a
			put(cyl(at(100), at(250), 50, 18), DARK$2);
//#piece f9a3a5b714d8c2e012749ce64039daaacb486289f1d4814208a3aa709c2a0238
			put(T(g), BLACK$2);
		});
		part("engine", {
			id: "blower",
			label: "Blower housing",
			source: SRC$2.vii,
//#piece b772c61ede721ac89de0e96e08b6fe057f1218f09360afa84c45a1f6dbfcdafc
			source: SRC$2.vii,
//#piece 6ad68aea937d52eaf8505a4388f84f06e9422bff96f53f50335d559c92114c94
			], 115, 32), DARK$2);
//#piece 5096957fc6337e94cd6d7df1790eb103afc23b4a1b3fc591588b5a29d37a1e16
				put(T(g), STEEL$2);
			}
			put(cyl([
				0,
				272,
				235
			], [
				0,
				280,
				235
			], 28, 16), STEEL$2);
		});
		part("engine", {
			id: "air-cleaner",
			label: "Air cleaner",
			source: SRC$2.vii,
//#piece 1bb529116ee8c31863e4f74ec02c590bda967b8b5dd8084fa88976f7b01468d3
			put(box(0, 50, 520, 210, 190, 56, 14), BLACK$2);
//#piece 55de19435d2cda7d1c10f798615fcae3a089d678ecf6b833bb6badbd241c6731
			source: SRC$2.vii,
//#piece 3ed0a32ad242746d6b64db4b68aa145e7c5366fc7ae0c484b2270f0c3cc0f51f
			], 9, 8), DARK$2);
		});
		part("engine", {
			id: "starter",
			label: "Electric starter",
			source: SRC$2.vii,
//#piece b34de5c28d065fde8031a0eba5b982f5a10acb5c1f7d088c3dbb941f120fa95a
			], 36, 16), DARK$2);
			put(cyl([
				-150,
				230,
				150
			], [
				-150,
				248,
				150
			], 20, 12), STEEL$2);
//#piece 65094ef272daff27bd6151415638fb06aabb0e9b7f850210924364ba494cb0ea
			source: SRC$2.port,
//#piece 44084eb9cc30527815172f50ca1351e62a2421e3cbe6d01a3362e82625b88c65
			], 34, 18), STEEL$2);
//#piece 98375b2e97625d9b37f81e42d020d8097daa0e6a9652b41ced3da7a412d533b1
			], 6, 6), DARK$2);
		});
		part("hydraulics", {
			id: "pump-mount",
			label: "Pump mount",
			source: SRC$2.vii,
//#piece 1fdd287076eec01f75dbf32e51a1c6d532ccb5019bac01ed824842aad29896cd
			put(box(0, -215, 185, 200, 12.7, 230, 4), STEEL$2);
			put(box(0, -170, B + 30, 200, 100, 12, 2), STEEL$2);
		});
		part("hydraulics", {
			id: "pump",
			label: "Hydraulic gear pump",
			source: SRC$2.port,
//#piece 7746babe974b08080c7b584be7b26ecf7c35522bf216cc9d1ecfea79b7985296
			], 20, 12), STEEL$2);
			put(cyl([
				52,
				-275,
				235
			], [
				75,
				-275,
				235
			], 14, 12), STEEL$2);
		});
		part("hydraulics", {
			id: "reservoir",
			label: "Hydraulic reservoir (7 gal)",
			source: SRC$2.vii,
//#piece 3d39244be16a3236dab2807b18d78f0558b5d273c98c6d8ebcd07b780d8dbc3b
			source: SRC$2.vii,
//#piece 5f4d3dde498f81904b8e50c37d288426f117b868db3b831b5e9b874d0fe9720d
			source: SRC$2.v156,
//#piece fe93355917f1aa7501bf0c702fb693d7b9840cbe19bd935de507d0d1ab12f325
			], 13, 12), STEEL$2);
//#piece 672075b2315466b00368cd96ffc19771e5bc9c4803059212d20332b93ba1d2ff
			source: SRC$2.v156,
//#piece 9d9d3ce80bec69f7e4ed06fb42b646619660a9f0c47cbb7b00fc30868a79ab35
			], 32, 24), STEEL$2);
//#piece e9424773840b3e8abad15f255b5c7b46c2e0597f9b02783d7a847540e6e8f82f
			source: SRC$2.v156,
//#piece d6b707f389e0d27049ddc60b56269d7586deaf626159f184cf06d8aa0087d80f
			put(box(W - 10, -40, 230, 8, 330, 230, 4), DARK$2);
		});
		part("hydraulics", {
			id: "cooler-fan",
			label: "Cooler fan",
			source: SRC$2.v156,
//#piece 1e7c082fb5e701db394fa5135440bd2b04ea43bf3b67e2a94eb7fb60e29bdb14
				put(T(g), BLACK$2);
			}
			put(cyl([
				FAN[0] - 10,
				FAN[1],
				FAN[2]
			], [
				FAN[0] + 14,
				FAN[1],
				FAN[2]
			], 24, 14), DARK$2);
		});
		part("hydraulics", {
			id: "filter",
			label: "Return filter",
			source: SRC$2.man,
//#piece a9bb67041ef36dc693e46ada18586cc6cf4dab9ed126285a5fbd5e99d68fdf94
			], 44, 18), STEEL$2);
//#piece f152ade0a728f91ebfc20b60a9aebb95ada854d805b9dbcdc8ba1dac0aba1b01
			source: SRC$2.vii,
//#piece 1e90126f8c551013199abb68e61de32a8634c797a2774684bcd17038cc124f0d
			], 20, 14), STEEL$2);
			put(cyl([
				-60,
				-Lh + 120,
				575
			], [
				-60,
				-Lh + 120,
				605
			], 36, 18), BLACK$2);
		});
		part("hydraulics", {
			id: "couplers",
			label: "Quick couplers (pressure and return)",
			count: 2,
			source: SRC$2.man,
//#piece e145384f1fc4a9cdc13ab2c17a59321033a1ba758575de89835a3184798cd5f6
			for (const [x, c] of [[230, RED$2], [290, "#2f6fb5"]]) {
//#piece 9858eb2203775e0b0bfad62381b1141ddbf64e5a10e95f0eed340aa5296c593e
			source: SRC$2.vii,
//#piece ac4788cd6b5896ae16e587dacbe7d14d31f3925a5b4742735781a07b9f52c0ba
			put(box(0, 90, 630, CUBE.W - 70, 400, 95, 14), RED$2);
			put(cyl([
				200,
				200,
				677
			], [
				200,
				200,
				700
			], 22, 14), BLACK$2);
//#piece 0f8b62fb1a1d98493986ffb3af1f95cca2ef1db4bda374f50671c9311ac5ff27
			], 4), BLACK$2);
		});
		part("controls", {
			id: "battery",
			label: "12 V battery",
			source: SRC$2.vii,
//#piece 80022709a8fa2758a55502c6b20a6b6b8c25498d21468cf3f54b09466dd96313
			put(box(-260, 70, 205, 125, 240, 190, 6), BLACK$2);
			for (const [y, c] of [[-10, RED$2], [150, BLACK$2]]) put(cyl([
//#piece 594895b775e552b8b46bddce4b06de1e90858c3ef1a556ee47583937e8ef9198
			source: SRC$2.vii,
//#piece 87ec0231aa911ed191488d3620c0b328e698c0b1c7edf2b0c636e32935daba30
			put(box(W - 60, Lh - 3, 470, 110, 6, 170, 4), DARK$2);
			put(cyl([
				W - 85,
				Lh,
				520
			], [
				W - 85,
				Lh + 18,
				520
			], 16, 14), STEEL$2);
			put(cyl([
				W - 40,
				Lh,
				520
			], [
				W - 40,
				Lh + 24,
				520
			], 9, 10), YELLOW$2);
			put(box(W - 60, Lh + 12, 420, 60, 20, 14, 3), GREEN);
//#piece 32f01050855f6d44fc58dae728851b4371fb1384c7155ae17885605c645e5fd8
		at[0] + x * S$2,
		at[1] + z * S$2,
		at[2] + y * S$2
//#piece a1a9c30db7bc151a7763077d8c583fbe626f98c01c5a03779e374c88b3afdc7e
//#piece 08e608e0a609f1e09669d9208b4645fdc193768211eb77d99f550ba9e0253e42
//#piece f0da962cb00e5288b430540ed01308066b4c0084d2d92efa723a589141aaa04a
* The fixed half: a rail on each side `half` from the middle, `len` long ending at `face`, at height z, with its ramp
* and keeper notch `back` behind the face.
//#piece 32dbd7309a0f19340cc93ea8e98bf3e2181f9e8f887e66773eeaf597b0707545
* @param {{ half: number, face: number, z: number, len: number, back?: number, steel?: string }} o
*/
function clickKeeper(box, put, { half, face, z, len, back = 40, steel = "#8d9396" }) {
	for (const sx of [-1, 1]) {
		put(box(sx * (half + 9), face - len / 2, z, 10, len, 4, 1), steel);
		put(box(sx * (half + 9), face - back - 12, z + 6, 10, 10, 8, 1), steel);
	}
}
/**
//#piece 82c10a25a87dbf2e214caf98d8b702fd6bd94a8d5b517ce3a6ebe90014fdb6ea
const S$1 = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK$1 = {
//#piece 714b7d7c23f80a5f4d015b88b4f815c8c2da90fb1a927478dfac1c2ab8269caa
const CELLS$1 = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC$1 = "BatteryPack (our design)";
const CASE$3 = "#1f2225";
//#piece c0392e79b65fd5360ebcb6cc4054bd318a8fb5a5fd5bd0c191ae95122d646052
const COPPER$3 = "#c27a43";
const PCB$1 = "#2c7a4a";
const DARK$1 = "#202326";
const RED$1 = "#c8372d";
const BLACK$1 = "#161718";
const LED$3 = "#59f0a0";
const LED_OFF = "#2c3a33";
const STEEL$1 = "#8d9396";
const HOLE = "#050607";
//#piece f0446a06a537f4f1e7e7e6fc50c5ec10cf542dea200e56d46444e97bcabde296
//#piece 50da518d459f98282bd5c6e3662f4dc05f03e49838a7c0a9b829b63d6e0b4dcc
//#piece acafe134c5e3361d1aab4a6452a19daef8b109d12fb81323165c97b7af32d8d8
//#piece 67dc458078f9c291855d9b83d1fa5d0889de282ebbf3d79fe922c51812f2f91d
//#piece b8acb66ac41cdfb733bb67133581945880b375162db5fd1c1f1a9b7773215d48
		const shape = outline(w * S$1, l * S$1, r * S$1);
		if (wall) shape.holes.push(outline((w - 2 * wall) * S$1, (l - 2 * wall) * S$1, Math.max(1, r - wall) * S$1, true));
		const g = new three.ExtrudeGeometry(shape, {
			depth: (h - bevel) * S$1,
			curveSegments: 8,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel * S$1,
			bevelSize: bevel * S$1 * .8,
			bevelOffset: -bevel * S$1 * .8,
			bevelSegments: 3
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const RC = 30;
	const CHARGE = 7;
//#piece c8053c83f37247c834cfd7b1f37a0f8ac6feefdf3d6809cacc34c21576111234
	const z0 = CELLS$1.z0 + DZ, top = z0 + CELLS$1.h;
//#piece 36b87522ae64d07d57ca53d737ba98c748cd4432af64d40471db20cc18dba72e
		assembly: assembly(G[p]),
		step: stepOf(p),
		source: SRC$1,
//#piece 2fbe892639a85afd36d99d31877c08900c80d4b85a1460017cbcd92315951a3d
			depth: h * S$1,
			curveSegments: 8,
			bevelEnabled: false
		});
		g.rotateX(-Math.PI / 2).translate(0, z0 * S$1, 0);
		g.clearGroups();
		return T(g);
	};
	const at2 = (x, y) => [x * S$1, -y * S$1];
	const Y0 = PACK$1.L / 2 - 30;
	/** the shell's U (open at the front), its walls `w` thick; `w` 0: the same outline closed, a plate */
	const shellU = (w) => (p) => {
		const x = PACK$1.W / 2, yb = -PACK$1.L / 2, r = 30;
//#piece bd55aa08cd79f487d876b86e42770645d9cc691f648ea8d7992d777b477e337c
		const x = PACK$1.W / 2, yf = PACK$1.L / 2, r = 30;
//#piece 4ae4d1dd28a61439423fe2fb518df852e9ca8bf4c7e07aa48794024e12769845
			CASE$3
//#piece 45dd81f290b0e07ad64ea3b37c288b31700bfee940566ffd5728af2b2cb32d34
					CASE$3
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(shellU(4), z0, h), c);
			put(prism(shellU(0), 0, 18), CASE$3);
//#piece c911e213c3ad2ef3e94d68fb0676ab283369614c4cc86e18608e5ce38b34f355
					CASE$3
				],
				[
					110,
					2,
					SEAM
				],
				[
					112,
					13,
					LID$1
				]
			]) put(prism(capD, z0, h), c);
			if (v >= 9) put(box(0, (Y0 + Lh) / 2, (F + Z) / 2, 2 * PX - 1, Lh - Y0, Z - F), CASE$3);
//#piece c45364053f16348c7cb41be98ac2b635e5fb2ae45372f20199bb74068550b001
			put(prism(shellU(0), 0, 3), CASE$3);
//#piece 785e0114abea242857efae920cba48dacca7916c0f9da015b7d5850ae580efdd
		put(slab(W, LEN, RC, 0, 5), CASE$3);
		put(slab(W, LEN, RC, 0, 16, 4), FACE);
		put(slab(W, LEN, RC, 16, 94, 4), CASE$3);
//#piece 6b4a13104e078ab66029ff7f3231cf60a72aded58e83118ac1158fc4b68a4180
		for (let k = 0; k < 10; k++) put(box(-171 + k * 38, Lh + 1.5, 104, 34, 1.5, 4), k < CHARGE ? LED$3 : LED_OFF);
//#piece 1771ebc8c00ccc555fd7a21d6925c1ab8f7f013dae2eb4953d207f39ae1f7e0d
		put(box(0, rowY(0), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		for (let i = 1; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9 + DZ, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
		put(box(0, rowY(CELLS$1.s - 1), 9 + DZ, zone.w - 6, CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
//#piece 12d8cf0f87bfdf811ebee448b6508c649d1fc69721fc03e6c56cb89b3e5a2457
	}, (put) => put(box(0, CELLS$1.y, 13 + DZ, zone.w, zone.l, 6, 1), HOLDER$1));
//#piece b81d92ff01a0c2d788b06e173ec70a3cfee459f27d6598e7c372421e8ff908c7
			put(cyl([
				colX(j),
				rowY(i),
				z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS$1.r, seg), WRAP$1);
//#piece d6cdaffe1fa20924231171919942a3447e53155172e58324c61dfa761db703fc
			], CELLS$1.r - 2, seg), CAP$1);
//#piece 796eebda559aae740f9998e6c29f17da13a5d33ca37b465fc5b775992a58d309
	}, (put) => put(box(0, CELLS$1.y, top - 6, zone.w, zone.l, 6, 1), HOLDER$1));
//#piece a84f82bf3636a111c54879ce918c65035bedbe5782c4d144a8fd41712f4fe2d2
		for (let i = 0; i < CELLS$1.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS$1.pitch - 3, 1.5, .3), COPPER$3);
//#piece 6f6001653d6d65c7c2268ba86ff5c6f90eedc26e2ed874e2bc6d6242823ee699
		const y = rowY(CELLS$1.s - 1) + 60;
//#piece deb6f7cf8fcceb2ac3bc7822dc000d3cab4a8c412176b422cf56eb8437e4494e
		for (let i = 0; i < CELLS$1.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
//#piece 6682d297f9bcdced2604c0286d358d48af427f2103195ee6eb93439fd2ca6cff
			], 4.5, 12), x < 0 ? RED$1 : COPPER$3);
//#piece f19769cea98e77ac19693771b91d9fefdff6050022232c44d862975c08b83130
		for (const x of [-45, 45]) hole(x, 58, 6, x < 0 ? RED$1 : COPPER$3);
//#piece 21bcc1eb9aa236b80327bfc3e4b1d6fffc230f770ee9f4fa0e6a48cec54be686
		for (const x of [-45, 45]) put(box(x, -Lh - 7, 58, 34, 3, 12), x < 0 ? RED$1 : COPPER$3);
//#piece ae889661ade05024fefac41d3d90789718662d569d823bdb2f58dac59aa6bfa8
			put(box(0, CELLS$1.y, top + 8, zone.w - 10, zone.l - 10, 4, 2), STEEL$1);
			put(box(0, CELLS$1.y, top + 4, zone.w - 14, zone.l - 14, 4, 1), "#d8d1bf");
			for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(cyl([
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
				8 + DZ
			], [
				sx * (zone.w / 2 - 4),
				CELLS$1.y + sy * (zone.l / 2 - 4),
//#piece 7470892c9d20e238f5692f8ddf47f0b8d3dbea45f429d9287818f2a1f5b809b0
			put(box(0, CELLS$1.y, H - 19, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
//#piece f8b29a0cd740ee5d51d256d6568ae5b1955f40f7ec565a3e4c16677b0e236769
		});
	}
}

//#endregion
//#region src/lib/actors/batterycube.js
const SRC_B$1 = "BatteryCube (our design)";
const CASE$2 = "#e4e6e3";
const COPPER$2 = "#b87333";
const BLUE$1 = "#2f6fb5";
const SCREEN$1 = "#1d3b4a";
const LED$2 = "#3ddc84";
const YELLOW$1 = "#f0c419";
/** the packs: four BatteryPacks, 460 × 480 × 125 mm, stacked 130 apart over the skids, a little ahead of the middle */
const MOD$1 = /* @__PURE__ */ (() => ({
	l: PACK$1.L,
	gap: 130,
	y: 75
}))();
const ASSEMBLIES$1 = [
	{
		id: "frame",
		label: "Frame",
//#piece 932f0036cf7fac5b5fba0e23d3f41c7b7e87abe96fe5fcae8ccfa11241fc3b6c
		note: "Four BatteryPacks of 280 cells each (51.8 V, ~5.2 kWh), ~20.7 kWh in all, each plugged by its back into the backplane that joins them side by side.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "power",
		label: "Inverter and sockets",
		note: "The 6 kW bidirectional inverter on the back: it charges the packs from the sun through its MPPT input or from outside power at its AC inlet (the grid, an ElectroCube, a generator), and gives 230 V to the sockets.",
		out: [
			0,
			-.5,
			.05
		]
	}
];
const STEPS$1 = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Fit the backplane; slide in the four BatteryPacks, each plugs itself in",
	"Mount the inverter on the back; wire the solar input, the AC inlet, the breakers and the sockets"
];
/** a BatteryCube's insides at version `v` (2: one-way inverter, no AC inlet; 3: bidirectional, its AC inlet;
* 4: its packs at v4, a centre grip each; 6: its packs at v5, the grip low and the lock at its height, and pins on the
* backplane for the packs' holes; 7: its packs at v6, a service drawer in each; 8: its packs at v7, grip and lock at
* the base plate's level, its rails lowered to meet them, and every live pin sunk in an insulating collar; 9: its packs
* at v8, grip and lock in the shell's foot, the rails lower still, and every pin of a header in one line; 10: its
* packs at v9, their release buttons in the shells' corner columns)
* @param {Parameters<import('./powercube.js').Insides>[0]} part @param {Parameters<import('./powercube.js').Insides>[1]} tools */
function cells$1(part, { box, cyl, P, kit, Lh, B, base }, v = 10) {
	const pv = v >= 10 ? 9 : v >= 9 ? 8 : v >= 8 ? 7 : v >= 7 ? 6 : v >= 6 ? 5 : v >= 4 ? 4 : 3;
	for (let k = 0; k < 4; k++) batteryPackParts$1(kit, {
		at: P(0, MOD$1.y, B + 10 + k * MOD$1.gap),
		base,
		assembly: () => "battery",
		step: () => 2,
		prefix: `pack-${k + 1}-`,
		unit: `pack-${k + 1}`,
		seg: 6,
		v: pv
	});
	const back = MOD$1.y - MOD$1.l / 2, top = B + 10 + 4 * MOD$1.gap;
	if (v >= 8) part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a pin header for each BatteryPack. Every live pin stands sunk in its own insulating collar: the two copper power pins each in a round shroud, the four data pins together in one between them, their tips 5 mm below the rims, so a finger (or a dropped tool) meets plastic, never metal (finger-safe, IP2X). Slide a pack in and the collars go into matching pockets in its back socket before any pin touches its contact. Two long steel guide pins with pointed tips find the pack’s guide holes first; they carry no current, so they stay bare. Copper bars inside the board join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Headers", "4, blind-mate, finger-safe (IP2X)"],
			["Power pins", "2 per pack, ⌀ 8 mm, 120 A [inferred], each in a ⌀ 18 mm collar, 5 mm sunk"],
			["Data pins", "4 per pack, CAN, in one shroud, 5 mm sunk"],
			["Guide pins", "2 per pack, ⌀ 10 × 24 mm, pointed, no current"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"]
//#piece 736b1da3a1445f56e48474f51e03eeb83e1a810944f10721a70490a9fa9666c7
			const f = back - 9, lip = back + 15;
			put(box(0, back - 12, z, 180, 6, 54, 1), BLACK$2);
			for (const x of [-45, 45]) {
				put(cyl([
					x,
					f,
					z
				], [
					x,
					lip,
					z
				], 9, 18), BLACK$2);
				put(cyl([
					x,
					lip,
					z
				], [
					x,
					lip + .3,
					z
				], 6, 18), "#050607");
				put(cyl([
					x,
					lip + .3,
					z
				], [
					x,
					lip + .5,
					z
				], 3.2, 12), x < 0 ? RED$2 : COPPER$2);
			}
			const dz = v >= 9 ? z : z + 14;
			put(box(0, (f + lip) / 2, dz, 44, lip - f, 12, 2), BLACK$2);
			put(box(0, lip + .15, dz, 38, .3, 7, 1), "#050607");
			for (let j = 0; j < 4; j++) put(cyl([
				-12 + j * 8,
				lip + .3,
				dz
			], [
				-12 + j * 8,
				lip + .5,
				dz
//#piece e6b33782785931c2c239a9f16b5b70328ecfe1b86bb1d9f2ddd68cd44ce53f3b
	else if (v >= 6) part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a pin header for each BatteryPack: two long steel guide pins with pointed tips find the pack’s guide holes first, then two copper power pins and four data pins slide into its sockets. The pins are on the cube, the holes in the pack: a pack on its own has nothing sticking out. Copper bars inside the board join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Headers", "4, blind-mate"],
			["Guide pins", "2 per pack, ⌀ 10 × 24 mm, pointed"],
			["Power pins", "2 per pack, ⌀ 8 mm, 120 A [inferred]"],
			["Data pins", "4 per pack, CAN"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"]
//#piece 736b1da3a1445f56e48474f51e03eeb83e1a810944f10721a70490a9fa9666c7
			const f = back - 9;
			put(box(0, back - 12, z, 180, 6, 54, 1), BLACK$2);
			for (const x of [-45, 45]) {
				put(cyl([
					x,
					f,
					z
				], [
					x,
					back + 10,
					z
				], 4, 12), x < 0 ? RED$2 : COPPER$2);
				put(cyl([
					x,
					back + 10,
					z
				], [
					x,
					back + 12,
					z
				], 4, 12, 3), x < 0 ? RED$2 : COPPER$2);
			}
			for (let j = 0; j < 4; j++) put(cyl([
				-12 + j * 8,
				f,
				z + 14
			], [
				-12 + j * 8,
				back + 8,
				z + 14
//#piece e6b33782785931c2c239a9f16b5b70328ecfe1b86bb1d9f2ddd68cd44ce53f3b
	else part("battery", {
		id: "backplane",
		label: "Backplane",
		source: SRC_B$1,
		what: "A board behind the stack with a socket for each BatteryPack: slide a pack in and its back plug finds its socket on the guide pins; pull it out and it lets go. Copper bars inside it join the four side by side and carry their 52 V to the inverter.",
		specs: [
			["Sockets", "4, blind-mate"],
			["Bus", "Tinned copper, 30 × 5 mm, 125 A"],
			["Data", "CAN from every pack to the inverter"]
//#piece 736b1da3a1445f56e48474f51e03eeb83e1a810944f10721a70490a9fa9666c7
			put(box(0, back - 13, z, 180, 8, 54, 1), BLACK$2);
			for (const x of [-45, 45]) put(box(x, back - 9, z, 38, 1, 16), x < 0 ? RED$2 : COPPER$2);
		}
		for (const x of [-60, 60]) put(box(x, back - 25, B + 300, 30, 10, 60, 1), COPPER$2);
	});
	part("battery", {
		...CLICKLOCK,
		id: "pack-rails",
		label: "Pack rails",
		count: 4,
		source: SRC_B$1,
		what: `${CLICKLOCK.what} Here: a pair of rails for each BatteryPack, their keepers where the pack’s back plug meets the backplane.`
	}, base, (put) => {
		for (let k = 0; k < 4; k++) clickKeeper(box, put, {
			half: PACK$1.W / 2,
			face: MOD$1.y + MOD$1.l / 2,
			z: B + 10 + k * MOD$1.gap + lockZ(pv) - 6,
			len: MOD$1.l,
			back: lockBack(pv)
		});
	});
	part("power", {
		id: "inverter",
		label: "Hybrid inverter",
		source: SRC_B$1,
		what: v < 3 ? "One box does it all: an MPPT solar charger, a battery charger and a pure-sine inverter. It fills the packs from the panels by day and turns their 52 V into 230 V for the home by night." : "One bidirectional box does it all: an MPPT solar charger, a charger from outside power and a pure-sine inverter. It fills the packs from the panels by day, or from the grid, an ElectroCube or a generator at its AC inlet, and turns their 52 V into 230 V for the home.",
		specs: [
			["Power", "6 kW continuous, 12 kW peak [inferred]"],
			["Solar in", "500 V, 2 × MPPT, up to 8 kWp"],
			["AC in (charging)", "230 V, up to 5 kW [inferred]"],
			["Out", "230 V, 50 Hz"],
			["Battery", "52 V, CAN to every pack"]
		]
	}, base, (put) => {
		put(box(0, -Lh + 80, B + 290, 520, 100, 520, 10), CASE$2);
		put(box(-80, -Lh + 28, B + 400, 180, 4, 110, 4), SCREEN$1);
		for (const [x, c] of [
			[60, LED$2],
			[90, YELLOW$1],
			[120, RED$2]
		]) put(box(x, -Lh + 28, B + 430, 14, 4, 14, 2), c);
		for (let k = 0; k < 7; k++) put(box(-230 + k * 76, -Lh + 80, B + 560, 8, 90, 20, 1), STEEL$2);
	});
	part("power", {
		id: "solar-in",
		label: "Solar input",
		count: 2,
		source: SRC_B$1,
//#piece 30cbc0536c18dbd22941f5eaa3f1a2f579288511a03bc78f8872c82b9a067562
		put(box(200, -Lh + 26, B + 170, 80, 10, 90, 4), YELLOW$1);
		put(box(200, -Lh + 18, B + 170, 26, 8, 50, 3), RED$2);
	});
	if (v >= 3) part("power", {
		id: "ac-in",
		label: "AC inlet",
		source: SRC_B$1,
		what: "Where outside power comes in to charge it: a red-ringed 230 V inlet under a spring lid. Plug in the grid, an ElectroCube or a generator and the inverter runs backwards, filling the packs.",
		specs: [["Inlet", "230 V, 16 A (CEE)"], ["Charges at", "up to 5 kW [inferred]"]]
	}, base, (put) => {
		put(box(-220, -Lh + 26, B + 200, 64, 8, 64, 6), BLUE$1);
		put(cyl([
			-220,
			-Lh + 24,
			B + 200
		], [
			-220,
			-Lh - 10,
			B + 200
		], 24, 14), BLUE$1);
		put(cyl([
			-220,
			-Lh - 10,
			B + 200
		], [
			-220,
			-Lh - 12,
			B + 200
		], 26, 14), RED$2);
	});
	part("power", {
		id: "sockets",
		label: "Sockets and breakers",
		count: 2,
		source: SRC_B$1,
//#piece 33f0747b1cf426018a7a39f78db56be7f1b7653bee1e42ef672bb1945f410770
		for (const x of [-220, -150]) put(box(x, -Lh + 26, B + 120, 64, 8, 64, 6), BLUE$1), put(cyl([
			x,
			-Lh + 24,
			B + 120
		], [
			x,
			-Lh - 10,
			B + 120
		], 24, 14), BLUE$1);
		put(box(-60, -Lh + 26, B + 120, 70, 8, 60, 3), DARK$2);
	});
}
/** The BatteryCube on its own (version `v`; from v5 it pulls a pack out and pushes it back as a move), every part its own: drawn apart, built. Its size is the Power Cube's. @returns {import('./rig').Cast} */
const batteryCube$1 = (v = 10) => {
	const cast = cubeCast({
		name: "BatteryCube",
		assemblies: ASSEMBLIES$1,
		steps: STEPS$1,
		stepOf: {
			frame: 1,
			battery: 2,
			power: 3
		},
		sources: POWERCUBE_SOURCES,
		hums: false,
		len: CUBE.L,
		engine: false,
		controls: false,
		insides: (part, tools) => cells$1(part, tools, v)
	});
	if (v < 5) return cast;
	const ids = (cast.catalog?.parts ?? []).map((p) => p.id).filter((id) => id.startsWith(PULLED));
	/** @param {number} out how far it is out (m) @param {number} squeeze the trigger, 0…1 @returns {import('./rig').Pose} */
	const pulled = (out, squeeze) => {
		/** @type {import('./rig').Pose} */
		const p = {};
		for (const id of ids) p[`p.${id}`] = [
			0,
			0,
			0,
			1,
			0,
			0,
			out
		];
		p[`p.${PULLED}lock-trigger`] = [
			0,
			0,
			0,
			1,
			0,
			squeeze * .004,
			out
		];
		return p;
	};
	const s = (u, a, b) => ease(Math.min(1, Math.max(0, (u - a) / (b - a))));
	cast.clips["pull out"] = (t) => {
		const u = loop(t, 8) * 8;
		const squeeze = s(u, .3, .7) - s(u, 3.2, 3.4);
		const out = PULL * (s(u, .8, 3) - s(u, 4.6, 6.8));
		return pulled(out, squeeze);
	};
	cast.poses = {
		...cast.poses,
		"pulled out": pulled(PULL, 0)
	};
	return cast;
};
/** the pack that comes out, and how far (m): most of its length, its back plug well clear of the backplane */
const PULLED = "pack-3-";
const PULL = .36;

//#endregion
//#region src/lib/actors/batterypack.v1.js
//#piece d3978b6ff691800c0e3631b30b1038e1da280c62f3ec2bc605ed94c228c8873c
const S = .001;
/** the pack's size (mm): W across, L front to back, H high */
const PACK = {
	W: 460,
	L: 480,
	H: 125
//#piece 9053a42212a2603c7b7753a81f928fe01e6189ad1610d344045d96a50537477d
const CELLS = {
	s: 14,
	p: 20,
	pitch: 22,
	r: 10.5,
	h: 70,
	z0: 16,
	y: -55
};
const SRC = "BatteryPack (our design)";
const CASE$1 = "#3a4046";
const LID = "#c5cacc";
const HOLDER = "#1b1d1f";
const WRAP = "#2f6fb5";
const CAP = "#c9ccce";
const COPPER$1 = "#c27a43";
const PCB = "#2c7a4a";
const DARK = "#202326";
const RED = "#c8372d";
const BLACK = "#161718";
const LED$1 = "#3ddc84";
const STEEL = "#8d9396";
//#piece 779e24f510049e1766f36c8ec9c6023fcc2bd3ac4a03c9ce793b46ae35055085
		x * S,
		z * S,
		y * S
	];
	const T = (g) => g.applyMatrix4(m);
	const box = (x, y, z, w, l, h, r = 1.5) => T(r > 2 ? block(w * S, h * S, l * S, L(x, y, z), r * S) : new three.BoxGeometry(w * S, h * S, l * S).translate(...L(x, y, z)));
//#piece e78dcee97b27a60a50b2ed16f0f310028721a76e629e4129ccfc274f7cfa4386
		const g = new three.CylinderGeometry(r * S, r * S, A.distanceTo(B), n);
//#piece 393c6a3327995c6fa5cbd4541daa35e045a6b13413ecf8c8f58fc6166e60c809
	const { W, L: LEN, H } = PACK;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS.y + (i - (CELLS.s - 1) / 2) * CELLS.pitch;
	const colX = (j) => (j - (CELLS.p - 1) / 2) * CELLS.pitch;
	const zone = {
		w: CELLS.p * CELLS.pitch + 6,
		l: CELLS.s * CELLS.pitch + 6
	};
	const top = CELLS.z0 + CELLS.h;
//#piece 36b87522ae64d07d57ca53d737ba98c748cd4432af64d40471db20cc18dba72e
		assembly: assembly(GROUP[p]),
		step: step(p),
		source: SRC,
//#piece 4c737e21523c27657c2b63a303312980f586c47d27189524605849b6e5bf5aa8
		put(box(0, 0, 2.5, W, LEN, 5), CASE$1);
		for (const sx of [-1, 1]) put(box(sx * (Wh - 2), 0, 58, 4, LEN, 106), CASE$1);
		put(box(0, -Lh + 2, 58, W, 4, 106), CASE$1);
//#piece 9d3507fe1f7e70ceca325b58486ab0b61b412f1f8f0db745ef12efa4845d60dd
		for (let k = 0; k < 5; k++) put(box(-60 + k * 16, Lh + 1, 96, 10, 3, 6, 1), LED$1);
//#piece da227071cf2a2879f40ee873804773dd8585ba8c474a3f1bf869ef25a0d70037
		put(box(0, rowY(0), 9, zone.w - 6, CELLS.pitch - 3, 1.5, .3), COPPER$1);
		for (let i = 1; i < CELLS.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, 9, zone.w - 6, 2 * CELLS.pitch - 3, 1.5, .3), COPPER$1);
		put(box(0, rowY(CELLS.s - 1), 9, zone.w - 6, CELLS.pitch - 3, 1.5, .3), COPPER$1);
//#piece 12d8cf0f87bfdf811ebee448b6508c649d1fc69721fc03e6c56cb89b3e5a2457
	}, (put) => put(box(0, CELLS.y, 13, zone.w, zone.l, 6, 1), HOLDER));
	part("cells", {
		label: "21700 cells",
		count: CELLS.s * CELLS.p,
//#piece eca0ff0d16d292316c7bbdc4581df6c8c612401bd2baf2482c3b8c7b7de41cf2
		for (let i = 0; i < CELLS.s; i++) for (let j = 0; j < CELLS.p; j++) {
			put(cyl([
				colX(j),
				rowY(i),
				CELLS.z0
			], [
				colX(j),
				rowY(i),
				top - 2
			], CELLS.r, seg), WRAP);
//#piece d6cdaffe1fa20924231171919942a3447e53155172e58324c61dfa761db703fc
			], CELLS.r - 2, seg), CAP);
//#piece 796eebda559aae740f9998e6c29f17da13a5d33ca37b465fc5b775992a58d309
	}, (put) => put(box(0, CELLS.y, top - 6, zone.w, zone.l, 6, 1), HOLDER));
//#piece a84f82bf3636a111c54879ce918c65035bedbe5782c4d144a8fd41712f4fe2d2
		for (let i = 0; i < CELLS.s - 1; i += 2) put(box(0, (rowY(i) + rowY(i + 1)) / 2, top + 1, zone.w - 6, 2 * CELLS.pitch - 3, 1.5, .3), COPPER$1);
//#piece 6f6001653d6d65c7c2268ba86ff5c6f90eedc26e2ed874e2bc6d6242823ee699
		const y = rowY(CELLS.s - 1) + 60;
//#piece a76542de1ef1e157c14b078ff035c60b4d2f06c01f31029037163bfc281160c2
		for (let i = 0; i < CELLS.s; i += 3) put(cyl([
			-180 + i * 6,
			y - 40,
//#piece ca2ee272533699f9124c3547416dc8242bd739a99768526642477a4374e3b0de
		put(box(0, CELLS.y, H - 9, zone.w - 10, zone.l - 10, 10, 2), "#d8d1bf");
//#piece 7400bfb8350f826e1432e9e94ffd155786126b9553de5a1d7888bf3fc1176a29
	});
}

//#endregion
//#region src/lib/actors/batterycube.v1.js
const SRC_B = "BatteryCube (our design)";
const CASE = "#e4e6e3";
const COPPER = "#b87333";
const BLUE = "#2f6fb5";
const SCREEN = "#1d3b4a";
const LED = "#3ddc84";
const YELLOW = "#f0c419";
/** the packs: four BatteryPacks, 460 × 480 × 125 mm, stacked 130 apart over the skids, a little ahead of the middle */
const MOD = /* @__PURE__ */ (() => ({
	l: PACK.L,
	gap: 130,
	y: 75
}))();
const ASSEMBLIES = [
	{
		id: "frame",
		label: "Frame",
//#piece 932f0036cf7fac5b5fba0e23d3f41c7b7e87abe96fe5fcae8ccfa11241fc3b6c
		note: "Four BatteryPacks of 280 cells each (51.8 V, ~5.2 kWh), ~20.7 kWh in all, and the copper busbars that join them side by side.",
		out: [
			0,
			.45,
			.12
		]
	},
	{
		id: "power",
		label: "Inverter and sockets",
		note: "The 6 kW hybrid inverter on the back: it charges the packs from the sun through its MPPT input, gives 230 V to the sockets, and takes a charge from an ElectroCube or the grid when the sun is short.",
		out: [
			0,
			-.5,
			.05
		]
	}
];
const STEPS = [
	"Cut, drill and bolt the frame: skids, posts, top rails, quick-attach plate",
	"Slide in the four BatteryPacks; fit the busbars",
	"Mount the inverter on the back; wire the solar input, the breakers and the sockets"
];
/** @type {import('./powercube.js').Insides} */
function cells(part, { box, cyl, hose, P, kit, Lh, B, base }) {
	const front = MOD.y + MOD.l / 2;
	for (let k = 0; k < 4; k++) batteryPackParts(kit, {
		at: P(0, MOD.y, B + 10 + k * MOD.gap),
		base,
		assembly: () => "battery",
		step: () => 2,
		prefix: `pack-${k + 1}-`,
		unit: `pack-${k + 1}`,
		seg: 6
	});
	part("battery", {
		id: "busbars",
		label: "Busbars",
		count: 2,
		source: SRC_B,
		what: "Two copper bars down the front of the stack, plus and minus, joining the four BatteryPacks side by side so they share the load, and carrying it back to the inverter.",
		specs: [["Material", "Tinned copper, 30 × 5 mm"], ["Current", "125 A continuous"]]
	}, base, (put) => {
		for (const x of [90, 140]) put(box(x, front + 18, B + 10 + 2 * MOD.gap - 10, 30, 5, 3 * MOD.gap + 40, 1), COPPER);
		put(hose([
			[
				115,
				front + 20,
				B + 40
			],
			[
				200,
				front - 40,
				B + 30
			],
			[
				200,
				-Lh + 120,
				B + 60
			],
			[
				100,
				-Lh + 160,
				B + 140
			]
		], 12), HOSE);
	});
	part("power", {
		id: "inverter",
		label: "Hybrid inverter",
		source: SRC_B,
		what: "One box does it all: an MPPT solar charger, a battery charger and a pure-sine inverter. It fills the modules from the panels by day and turns their 48 V into 230 V for the home by night.",
		specs: [
			["Power", "6 kW continuous, 12 kW peak [inferred]"],
			["Solar in", "500 V, 2 × MPPT, up to 8 kWp"],
			["Out", "230 V, 50 Hz"],
			["Battery", "48 V LiFePO4, CAN"]
		]
	}, base, (put) => {
		put(box(0, -Lh + 95, B + 290, 520, 130, 520, 10), CASE);
		put(box(-80, -Lh + 28, B + 400, 180, 4, 110, 4), SCREEN);
		for (const [x, c] of [
			[60, LED],
			[90, YELLOW],
			[120, RED$2]
		]) put(box(x, -Lh + 28, B + 430, 14, 4, 14, 2), c);
		for (let k = 0; k < 7; k++) put(box(-230 + k * 76, -Lh + 95, B + 560, 8, 110, 20, 1), STEEL$2);
	});
	part("power", {
		id: "solar-in",
		label: "Solar input",
		count: 2,
		source: SRC_B,
//#piece 30cbc0536c18dbd22941f5eaa3f1a2f579288511a03bc78f8872c82b9a067562
		put(box(200, -Lh + 26, B + 170, 80, 10, 90, 4), YELLOW);
		put(box(200, -Lh + 18, B + 170, 26, 8, 50, 3), RED$2);
	});
	part("power", {
		id: "sockets",
		label: "Sockets and breakers",
		count: 2,
		source: SRC_B,
//#piece 33f0747b1cf426018a7a39f78db56be7f1b7653bee1e42ef672bb1945f410770
		for (const x of [-220, -150]) put(box(x, -Lh + 26, B + 120, 64, 8, 64, 6), BLUE), put(cyl([
			x,
			-Lh + 24,
			B + 120
		], [
			x,
			-Lh - 10,
			B + 120
		], 24, 14), BLUE);
		put(box(-60, -Lh + 26, B + 120, 70, 8, 60, 3), DARK$2);
	});
}
/** The BatteryCube on its own, every part its own: drawn apart, built. Its size is the Power Cube's. @returns {import('./rig').Cast} */
const batteryCube = () => cubeCast({
	name: "BatteryCube",
	assemblies: ASSEMBLIES,
	steps: STEPS,
	stepOf: {
		frame: 1,
		battery: 2,
		power: 3
	},
	sources: POWERCUBE_SOURCES,
	hums: false,
	len: CUBE.L,
	engine: false,
	controls: false,
	insides: cells
});
//#piece d75aea4541bd4c6f9a0e5cf85614f67f7de4302c28fe65017d658d8d14706c6c
const HISTORY = /* @__PURE__ */ (() => ({ batterycube: [
	{
		...FIRST,
		date: "2026-10-13",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v1: busbars down the front, a one-way inverter",
			make: () => batteryCube()
		}]
	},
	{
		v: 2,
		date: "2026-10-13",
		note: "Plug in and pull out: a backplane behind the stack takes each BatteryPack’s (v3) back plug, and a ClickLock rail pair holds each pack; no busbars on the front",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v2: a one-way inverter",
			make: () => batteryCube$1(2)
		}]
	},
	{
		v: 3,
		date: "2026-10-13",
		note: "A charger too: the inverter is bidirectional, and an AC inlet on its back charges the packs from the grid, an ElectroCube or a generator",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v3: its packs with two handles each",
			make: () => batteryCube$1(3)
		}]
	},
	{
		v: 4,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v4: one centre grip each, its trigger releasing the pack",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v4: no pull-out move",
			make: () => batteryCube$1(4)
		}]
	},
	{
		v: 5,
		date: "2026-10-13",
		note: "Pull out as a move: a hand squeezes the third pack’s grip, it slides 36 cm out on its rails, waits, slides back and clicks home; and a “pulled out” pose",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v5: its packs at v4, their plugs’ pins on the pack",
			make: () => batteryCube$1(5)
		}]
	},
	{
		v: 6,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v5 (the grip low, the lock at its height), its rails raised to meet their pawls, and pins on the backplane: two pointed guide pins, two power pins and four data pins per pack, going into the pack’s holes",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v6: its packs at v5, a lid each",
			make: () => batteryCube$1(6)
		}]
	},
	{
		v: 7,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v6: each a closed shell with a service drawer inside; their lock’s keepers moved to meet the pawls on the drawers’ front plates",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v7: its packs at v6",
			make: () => batteryCube$1(7)
		}]
	},
	{
		v: 8,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v7 (grip, lock and release buttons at the base plate’s level), its rails lowered to meet their pawls; every live backplane pin sunk 5 mm in an insulating collar, finger-safe",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v8: its packs at v7, the data pins over the power pins",
			make: () => batteryCube$1(8)
		}]
	},
	{
		v: 9,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v8 (grip, lock and release buttons on the shell’s foot), its rails lower to meet their pawls; every pin of a header in one straight line: guide, power, data, power, guide",
		build: [{
			id: "batterycube",
			label: "BatteryCube",
			note: "as at v9: its packs’ release buttons in the sill",
			make: () => batteryCube$1(9)
		}]
	},
	{
		v: 10,
		date: "2026-10-13",
		note: "Its four BatteryPacks at v9: each one’s release buttons in its shell’s two front corner columns, at the base plate’s level"
	}
] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "batterycube",
	label: "BatteryCube",
	note: "Our own cube on the Power Cube’s 27\" frame, no engine: four BatteryPacks stacked to its top (~20.7 kWh) and each plugged into a backplane and held by a ClickLock, and a 6 kW bidirectional inverter on its back that turns their 52 V into 230 V, takes a solar panel straight in and charges them from outside power at its AC inlet. Every part its own",
	from: "Our design, on the Power Cube of Open Source Ecology",
	variants: [{
		id: "batterycube",
		label: "BatteryCube",
		note: "~20.7 kWh, 6 kW at 230 V both ways, an MPPT solar input, an AC inlet, 686 × 660 × 686 mm, ~140 kg",
		make: () => batteryCube$1()
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
