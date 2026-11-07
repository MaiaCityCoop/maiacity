/** the groundsheet seen from above (u across x, v from the door to the back): heavy grey-green PVC, a darker hem
*  round its edge, welded seams across it */
const floorTex = () => canvasTexture("dome-tent-floor", 512, 512, (x, r) => {
	x.fillStyle = "#56604f";
	x.fillRect(0, 0, 512, 512);
	for (let i = 0; i < 2600; i++) {
		x.fillStyle = `rgba(${r() < .5 ? "255,255,255" : "0,0,0"},${.03 + r() * .04})`;
		x.fillRect(r() * 512, r() * 512, 2, 2);
	}
	x.strokeStyle = "rgba(0,0,0,0.18)";
	x.lineWidth = 3;
	for (const v of [.34, .66]) x.beginPath(), x.moveTo(0, v * 512), x.lineTo(512, v * 512), x.stroke();
	x.strokeStyle = "#3c4337";
	x.lineWidth = 14;
	x.beginPath();
	x.arc(256, 256, 249, 0, Math.PI * 2);
	x.stroke();
});
