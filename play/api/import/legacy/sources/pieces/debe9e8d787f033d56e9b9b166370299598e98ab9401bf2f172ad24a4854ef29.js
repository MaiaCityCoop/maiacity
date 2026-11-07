			const d = out(p);
			if (d) {
				const v = new three.Vector3(p[0], p[1] - 1.7, p[2] + .005).normalize();
				row.push([
					p[0] + v.x * d,
					p[1] + v.y * d,
					p[2] + v.z * d
				]);
			} else row.push(p);
		}
		pts.push(row);
	}
	const pos = [], idx = [];
	const id = (i, j) => i * cols + j % cols;
	pts.forEach((r) => r.forEach((p) => pos.push(...p)));
	for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
		const q = [
			id(i, j),
			id(i, j + 1),
			id(i + 1, j + 1),
			id(i + 1, j)
		];
		if (!q.map((k) => pts[Math.floor(k / cols)][k % cols]).every(keep)) continue;
		idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
	}
	const used = /* @__PURE__ */ new Map();
	const out2 = [];
	const idx2 = idx.map((k) => {
		if (!used.has(k)) used.set(k, used.size), out2.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
		return used.get(k);
	});
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.Float32BufferAttribute(out2, 3));
	g.setIndex(idx2);
	g.computeVertexNormals();
	return g;
}
/** the hairline's height round the head: by how far round from the front (radians), front, temples, over the ears,
*  behind them, the nape */
