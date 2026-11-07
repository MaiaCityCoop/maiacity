		out[`${name}Barrel`] = [
			now - turned(on0),
			0,
			0
		];
		out[`${name}Rod`] = [
			now - turned(on1),
			0,
			0
		];
	}
	return out;
}
/**
* The machine at its joints' turns — the house slewed and the boom swung (about y), the boom, arm and bucket (about
* x), the blade, the wheels — and the rams following.
* @param {Spec} spec @param {Joints} j @returns {Pose}
*/
