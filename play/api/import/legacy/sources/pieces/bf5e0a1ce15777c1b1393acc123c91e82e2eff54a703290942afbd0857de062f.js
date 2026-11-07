function dome(g, R, detail, squash, strut, strutMat, panel) {
	const ico = new three.IcosahedronGeometry(R, detail);
	const p = ico.attributes.position;
	/** @type {Map<THREE.Material, number[]>} */
	const panes = /* @__PURE__ */ new Map();
	/** @type {Map<string, [THREE.Vector3, THREE.Vector3]>} */
	const edges = /* @__PURE__ */ new Map();
	const key = (v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
//#piece 1d8c30732b59e026caffc0204d9a9f6c44a8f325c0d401eb673b3938ea528185
		for (const v of tri) v.y = Math.max(0, v.y) * squash;
		const m = panel(tri[0].clone().add(tri[1]).add(tri[2]).divideScalar(3), R);
		if (m) {
			const list = panes.get(m) ?? [];
			list.push(...tri.flatMap((v) => [
				v.x,
				v.y,
				v.z
			]));
			panes.set(m, list);
		}
		for (let k = 0; k < 3; k++) {
			const a = tri[k], b = tri[(k + 1) % 3];
			if (a.y === 0 && b.y === 0) continue;
			const ka = key(a), kb = key(b);
			edges.set(ka < kb ? ka + kb : kb + ka, [a, b]);
		}
	}
	ico.dispose();
	for (const [m, list] of panes) {
		const geo = new three.BufferGeometry();
		geo.setAttribute("position", new three.Float32BufferAttribute(list, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(new Float32Array(list.length / 3 * 2), 2));
		geo.computeVertexNormals();
		const mesh = new three.Mesh(geo, m);
		mesh.receiveShadow = true;
		mesh.castShadow = !m.transparent;
		g.add(mesh);
	}
	/** @type {THREE.BufferGeometry[]} */
	const parts = [];
	/** @type {Map<string, THREE.Vector3>} */
	const hubs = /* @__PURE__ */ new Map();
	for (const [a, b] of edges.values()) {
		const len = a.distanceTo(b);
		const cyl = new three.CylinderGeometry(strut, strut, len, 6, 1, true);
		cyl.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
		cyl.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
		parts.push(cyl);
		hubs.set(key(a), a);
		hubs.set(key(b), b);
	}
