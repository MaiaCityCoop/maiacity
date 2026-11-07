		out[`${name}Barrel`] = [
			now - rest - turned(on0),
			0,
			0
		];
		out[`${name}Rod`] = [
			now - rest - turned(on1),
			0,
			0
		];
	}
	return out;
}
/**
* The machine at its joints' turns: how far the house is slewed and the boom swung (about y), the boom, arm and
* bucket (about x), the blade, how far the wheels have turned; the rams follow.
* @param {{ slew?: number, swing?: number, boom?: number, arm?: number, bucket?: number, blade?: number, wheels?: number, root?: V3 }} s
* @returns {Pose}
*/
