	for (let i = 0; i < 260; i++) {
		const cx = r() * size, cy = r() * size;
		x.fillStyle = r() < .8 ? `rgba(60,${120 + r() * 40},50,0.9)` : [
			"#f4f1e8",
			"#e9d35a",
			"#b9a2d8"
		][Math.floor(r() * 3)];
		for (let k = 0; k < 3; k++) {
			x.beginPath();
			x.arc(cx + Math.cos(k * 2.1) * 2, cy + Math.sin(k * 2.1) * 2, 1.8, 0, Math.PI * 2);
			x.fill();
		}
	}
	const tex = new three.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = three.RepeatWrapping;
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	cache.set(key, tex);
	return tex;
