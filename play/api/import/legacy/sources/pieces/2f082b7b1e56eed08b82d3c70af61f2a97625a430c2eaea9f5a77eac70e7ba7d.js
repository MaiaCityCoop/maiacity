/** Solar cells: 6 × 10 monocrystalline cells, their silver busbars, a white gap round each. */
function pvCells() {
	return canvasTexture("pv-cells", 320, 192, (x) => {
		x.fillStyle = "#d8dde2";
		x.fillRect(0, 0, 320, 192);
		for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) {
			const cx = 2 + i * 31.8, cy = 2 + j * 31.6;
			x.fillStyle = "#16233d";
			x.fillRect(cx, cy, 30, 30);
			x.fillStyle = "#1d2e50";
			x.fillRect(cx + 1, cy + 1, 28, 14);
			x.fillStyle = "rgba(200,205,215,0.55)";
			for (const b of [
				8,
				15,
				22
			]) x.fillRect(cx + b, cy, 1, 30);
		}
	});
}
