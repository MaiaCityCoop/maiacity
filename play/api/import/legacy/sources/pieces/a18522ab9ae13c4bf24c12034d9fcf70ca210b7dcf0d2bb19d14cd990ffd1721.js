const WOOD = "#c9a878";
const WOOD2 = "#b8955f";
const CRATE = "#b98d55";
const CRATE2 = "#a87f4c";
const WRAP = "#dfe3e2";
//#piece da73ef62b5355cbd3bed34b13dca0efdd04184218b10d8650eea07f7495afd14
*/
//#piece 5d3c7f2483ee45e995be4b7bce4db3441819e0acedef3a20a615bd7c04f56240
	]) put(block(PL, .022, w, [
		0,
		.13299999999999998,
		bz
	], .004), WOOD, bone);
	for (const bx of [
		-.5275,
		0,
		.5275
	]) {
		put(block(.145, .022, PW, [
			bx,
			.111,
			0
		], .004), WOOD2, bone);
		for (const bz of [
			-.3275,
			0,
			.3275
		]) put(block(.145, .078, .145, [
			bx,
			.061,
			bz
		], .006), WOOD2, bone);
	}
	for (const bz of [
		-.3275,
		0,
		.3275
	]) put(block(PL, .022, .1, [
		0,
		.011,
		bz
	], .004), WOOD, bone);
	if (stack <= .144) return;
	const top = stack - PH;
	for (let k = 0; k < 3; k++) put(block(1.18, top / 3 - .01, .78, [
		0,
		PH + (k + .5) * (top / 3),
		0
	], .02), k % 2 ? CRATE : CRATE2, bone);
	put(block(1.204, top * .7, .804, [
		0,
		PH + top * .5,
		0
	], .02), WRAP, bone, 1);
}

//#endregion
