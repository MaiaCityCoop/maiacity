		p.moveTo(...at2(-x, Y0));
		p.lineTo(...at2(-x, yb + r));
		p.quadraticCurveTo(...at2(-x, yb), ...at2(-x + r, yb));
		p.lineTo(...at2(x - r, yb));
		p.quadraticCurveTo(...at2(x, yb), ...at2(x, yb + r));
		p.lineTo(...at2(x, Y0));
		if (w) {
			p.lineTo(...at2(x - w, Y0));
			p.lineTo(...at2(x - w, yb + r));
			p.quadraticCurveTo(...at2(x - w, yb + w), ...at2(x - r, yb + w));
			p.lineTo(...at2(-x + r, yb + w));
			p.quadraticCurveTo(...at2(-x + w, yb + w), ...at2(-x + w, yb + r));
			p.lineTo(...at2(-x + w, Y0));
		}
		p.closePath();
	};
	/** the drawer's front plate in plan: from Y0 to the face, its two front corners round */
	const capD = (p) => {
