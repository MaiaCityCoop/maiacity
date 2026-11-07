	for (let k = 0; k < teeth; k++) {
		const x = -w / 2 + w * (k + .5) / teeth;
		const tooth = new three.ConeGeometry(R * .1, R * .38, 6);
		tooth.translate(0, R * .19, 0);
		tooth.applyQuaternion(aim);
		tooth.translate(x, lip[1], lip[2]);
		out.push({
			geo: tooth,
