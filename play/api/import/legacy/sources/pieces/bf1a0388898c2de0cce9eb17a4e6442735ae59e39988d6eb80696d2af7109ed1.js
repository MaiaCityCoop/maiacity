const lobed = (side, basal, deep) => (bag, m, len, paint) => {
	const step = .95;
	const reach = [
		basal,
		side,
		1,
		side,
		basal
	];
	const edge = (a) => {
		const i = Math.max(-2, Math.min(2, Math.round(a / step)));
		return reach[i + 2] * (1 - deep * Math.min(1, Math.abs(a - i * step) / (step / 2)));
	};
	bag.add("sheet", fan({
		size: len,
		from: -2.5 * step,
		to: 2.5 * step,
		edge,
		lift: (s, a) => -.12 * s * s + .06 * s * Math.cos(a * 2.2),
		paint: (s, a) => paint(s, a / 2.4),
		rings: 1,
		rays: 10
	}), m);
//#piece 699d391814e6246d45b758ff46a3a2c3fc0a7dbda8275a8e309db744ff0137d3
