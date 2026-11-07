//#piece 60a6ac3338545883b3b63e9d4eb68e2d3ea54483ff4871e88c50f5dff406aa13
	g.setAttribute("normal", new three.Float32BufferAttribute(nor, 3));
	g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
	g.setAttribute("color", new three.Float32BufferAttribute(col, 3));
	g.setIndex(idx);
	if (flat) g.computeVertexNormals();
	return g;
