	let i = 0;
	while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
	const [t0, a] = keys[i], [t1, b] = keys[i + 1];
