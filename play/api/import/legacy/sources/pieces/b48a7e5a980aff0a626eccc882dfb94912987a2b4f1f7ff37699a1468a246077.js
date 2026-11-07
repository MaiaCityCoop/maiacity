	x.putImageData(img, 0, 0);
	const r = rng(83);
	for (let i = 0; i < 9e3; i++) {
		const bx = r() * size, by = r() * size;
		const len = 4 + r() * 9, a = -Math.PI / 2 + (r() - .5) * 1.2;
		const dry = r() < .12;
		const gg = 110 + r() * 80;
		x.strokeStyle = dry ? `rgba(${170 + r() * 40},${160 + r() * 30},${90 + r() * 30},0.8)` : `rgba(${50 + r() * 50},${gg},${40 + r() * 30},0.75)`;
		x.lineWidth = .8 + r() * 1.1;
		x.beginPath();
		x.moveTo(bx, by);
		x.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
		x.stroke();
	}
