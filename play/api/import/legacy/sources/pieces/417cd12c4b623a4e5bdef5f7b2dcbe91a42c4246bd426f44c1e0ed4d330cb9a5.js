	for (const h of hubs.values()) parts.push(new three.IcosahedronGeometry(strut * 1.6, 0).translate(h.x, h.y, h.z));
	const struts = new three.Mesh((0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(parts.map((q) => q.toNonIndexed())), strutMat);
	for (const q of parts) q.dispose();
	struts.castShadow = true;
	g.add(struts);
}
