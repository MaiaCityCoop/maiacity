/** A word on a panel: a cabinet's name, a warning. */
/** @param {string} text @param {string} bg @param {string} fg */
function plate(text, bg, fg) {
	return canvasTexture(`plate:${text}:${bg}`, 512, 128, (x) => {
		x.fillStyle = bg;
		x.fillRect(0, 0, 512, 128);
		x.fillStyle = fg;
		x.font = "bold 56px Arial, sans-serif";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText(text, 256, 66);
