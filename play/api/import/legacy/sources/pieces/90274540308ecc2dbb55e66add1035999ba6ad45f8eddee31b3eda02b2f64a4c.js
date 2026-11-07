function leaves(kind = "broad") {
	const key = `leaves-${kind}`;
	const hit = cache.get(key);
	if (hit) return hit;
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const r = rng(kind === "broad" ? 71 : 73);
	const n = kind === "broad" ? 26 : 60;
	for (let i = 0; i < n; i++) {
		const x = 30 + r() * 196, y = 30 + r() * 196;
		const len = kind === "broad" ? 34 + r() * 30 : 14 + r() * 12;
		const a = r() * Math.PI * 2;
		const g = 90 + r() * 70;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(a);
		const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
		grad.addColorStop(0, `rgb(${40 + r() * 20},${g},${40 + r() * 20})`);
		grad.addColorStop(1, `rgb(${70 + r() * 30},${g + 40},${50 + r() * 25})`);
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.ellipse(0, 0, len / 2, len * (kind === "broad" ? .22 : .3), 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(210,235,170,0.5)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(-len / 2, 0);
		ctx.lineTo(len / 2, 0);
		ctx.stroke();
		ctx.restore();
	}
