	const parts = [{ skin: s.skin(.0026 * k, paint, `frog-${kind}`) }];
	parts.push(...eyes(P(.019, .058, .049), .0072 * k, [
		.75,
		.55,
		.35
	], "#c9a23a", "bar", "head", {
		irisR: .82,
		pupilR: .42
	}));
