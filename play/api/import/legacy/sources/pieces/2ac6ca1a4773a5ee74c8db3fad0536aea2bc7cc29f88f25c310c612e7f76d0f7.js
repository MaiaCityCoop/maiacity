const simple = (shape, width, cup = .06) => (bag, m, len, paint) => {
	bag.add("sheet", sheet({
		length: len,
		width: len * width,
		shape,
		lift: (u, v) => cup * v * v - .07 * u * u,
		paint,
		along: 5,
		across: 2
	}), m);
//#piece 699d391814e6246d45b758ff46a3a2c3fc0a7dbda8275a8e309db744ff0137d3
