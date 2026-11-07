//#piece 8d9065a8cc6dec5b55423a03a1b69de1e2dd8d2e270c671fadcca7fc3ff61b42
//#piece 8dfb7c6661f6b6410f4051adc7bfc93f5ff6244241b0d6831ed00566c3d28682
//#piece 820993098d414cdd2fd60a6bca99d526b047fc5e67f9cee17355f01487973907
//#piece 8af2ab8c7445977469ed797120f7b100d1bb5bcf1d0c3b7f6b69dccbbd7d476e
/** the packet's printed front: its band, the fruit in a frame, its name and its Latin name */
function packetFace(id) {
	const s = ALL_PACKETS[id];
	return canvasTexture(`seed-packet:${id}`, 280, 400, (x) => {
		x.fillStyle = s.ground;
		x.fillRect(0, 0, 280, 400);
		x.fillStyle = s.band;
		x.fillRect(0, 0, 280, 54);
		x.fillStyle = "rgba(0,0,0,0.18)";
		x.fillRect(0, 50, 280, 4);
		x.fillStyle = "#fbf7ee";
		x.font = "bold 26px Georgia, serif";
		x.textAlign = "center";
		x.fillText("SEEDS", 140, 36);
		x.fillStyle = "#fffdf6";
		x.fillRect(22, 70, 236, 214);
		x.strokeStyle = s.band;
		x.lineWidth = 4;
		x.strokeRect(22, 70, 236, 214);
		x.save();
		x.translate(30, 78);
		FRUIT[id](x);
		x.restore();
		x.fillStyle = "#2a2218";
		x.font = `bold ${s.label.length > 9 ? 30 : 38}px Georgia, serif`;
		x.fillText(s.label, 140, 330);
		x.font = "italic 19px Georgia, serif";
		x.fillStyle = "#5a4c3a";
		x.fillText(s.latin, 140, 358);
		x.fillStyle = s.band;
		x.fillRect(60, 374, 160, 2);
		x.font = "15px Georgia, serif";
		x.fillStyle = "#6a5c48";
		x.fillText("about 10 seeds", 140, 394);
	});
}
/** A seed packet: 7 × 10 cm, a paper envelope with a few seeds in it, its fruit printed on the front (+z) with its
*  name; standing on its bottom edge. `id`: one of V1's seeds (SEED_PACKETS), or blackcurrant (ALL_PACKETS). */
function seedPacket(id = "apple") {
	const g = new three.Group();
	g.name = `seed-packet:${id}`;
	const front = new three.MeshStandardMaterial({
		map: packetFace(id),
		roughness: .85
	});
	const paper = m.kraft();
	const body = new three.Mesh(new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(PACKET.w, PACKET.h, PACKET.d, 2, .0012), [
		paper,
		paper,
		paper,
		paper,
		front,
		paper
	]);
	body.position.y = PACKET.h / 2;
	body.castShadow = body.receiveShadow = true;
	g.add(body);
	part(g, PACKET.w * .98, .022, 8e-4, paper, 0, PACKET.h - .013, -PACKET.d / 2 - 4e-4);
	g.userData = { seed: id };
