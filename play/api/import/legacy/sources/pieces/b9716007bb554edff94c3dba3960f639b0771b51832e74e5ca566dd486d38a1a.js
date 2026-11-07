	const geos = parts.map((p) => {
		if ("skin" in p) {
			const g = p.skin.geo.clone(), n = g.attributes.position.count;
			const si = new Uint16Array(n * 4);
			const ids = p.skin.bones.map((name) => {
				if (!index.has(name)) throw new Error(`skin: no bone ${name}`);
				return index.get(name);
			});
			for (let i = 0; i < n * 4; i++) si[i] = ids[p.skin.index[i]] ?? 0;
			g.setAttribute("skinIndex", new three.Uint16BufferAttribute(si, 4));
			g.setAttribute("skinWeight", new three.Float32BufferAttribute(p.skin.weight.slice(), 4));
			return g;
		}
		const g = p.geo.clone();
		if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
		for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
		if (!g.attributes.normal) g.computeVertexNormals();
		const pos = g.attributes.position, n = pos.count;
		const color = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			v.fromBufferAttribute(pos, i);
			c.set(typeof p.color === "string" ? p.color : p.color(v, i));
			color[i * 3] = c.r;
			color[i * 3 + 1] = c.g;
			color[i * 3 + 2] = c.b;
			weigh(p, w);
			const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4);
			const sum = top.reduce((s, [, x]) => s + x, 0) || 1;
			top.forEach(([name, x], k) => {
				si[i * 4 + k] = index.get(name) ?? 0;
				sw[i * 4 + k] = x / sum;
			});
		}
		g.setAttribute("color", new three.BufferAttribute(color, 3));
		g.setAttribute("skinIndex", new three.Uint16BufferAttribute(si, 4));
		g.setAttribute("skinWeight", new three.Float32BufferAttribute(sw, 4));
		return g;
	});
	const morphs = [...new Set(parts.flatMap((p) => "morph" in p && p.morph ? Object.keys(p.morph) : []))];
	if (morphs.length) geos.forEach((g, i) => {
		const p = parts[i], n = g.attributes.position.count;
		g.morphAttributes.position = morphs.map((name) => {
			const d = "morph" in p ? p.morph?.[name] : void 0;
			const a = new three.Float32BufferAttribute(d && d.length === n * 3 ? d : new Float32Array(n * 3), 3);
			a.name = name;
			return a;
		});
		g.morphTargetsRelative = true;
	});
	const geometry = (0, three_addons_utils_BufferGeometryUtils_js.mergeGeometries)(geos, true);
	geometry.groups.forEach((grp, i) => grp.materialIndex = parts[i].mat ?? 0);
	if (morphs.length) {
		geometry.morphTargetsRelative = true;
		geometry.morphAttributes.position.forEach((a, i) => a.name = morphs[i]);
	}
