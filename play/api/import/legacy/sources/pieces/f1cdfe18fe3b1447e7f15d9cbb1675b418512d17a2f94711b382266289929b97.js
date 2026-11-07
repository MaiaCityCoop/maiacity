//#piece c29515fea7642cf7d919cf41a7e4fec9b7563cce1a65eff8cea8264aa7b64054
const v3 = (x, y, z) => new three.Vector3(x, y, z);
const UP$1 = /* @__PURE__ */ (() => v3(0, 1, 0))();
//#piece f639181bd5324ac3aaee5c39f6817ba13518b2f198d69f72b20ebbfae5ff0051
	const x = dir.clone().normalize();
	let z = new three.Vector3().crossVectors(x, UP$1);
	if (z.lengthSq() < 1e-8) z = v3(0, 0, 1);
	z.normalize();
//#piece f9ec5da0a1eba605c895127bdc1c6550a20f1704c387fdd16070adff6d40fa2c
