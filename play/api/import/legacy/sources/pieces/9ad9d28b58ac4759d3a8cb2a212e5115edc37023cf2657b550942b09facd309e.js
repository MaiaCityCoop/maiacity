	const g = new three.IcosahedronGeometry(1, 0);
	g.deleteAttribute("normal");
	g.deleteAttribute("uv");
	const round = (0, three_addons_utils_BufferGeometryUtils_js.mergeVertices)(g);
	round.computeVertexNormals();
	round.setAttribute("uv", new three.BufferAttribute(new Float32Array(round.attributes.position.count * 2), 2));
	return round;
}))();
