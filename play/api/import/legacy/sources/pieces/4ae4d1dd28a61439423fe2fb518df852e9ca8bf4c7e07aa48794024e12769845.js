		p.moveTo(...at2(-x, Y0));
		p.lineTo(...at2(x, Y0));
		p.quadraticCurveTo(...at2(x, yf), ...at2(x - r, yf));
		p.lineTo(...at2(-x + r, yf));
		p.quadraticCurveTo(...at2(-x, yf), ...at2(-x, Y0));
		p.closePath();
	};
	/** the case's bands, foot to top, as v2 drew them */
	const BANDS = [
		[
			0,
			16,
			FACE
		],
		[
			16,
			94,
