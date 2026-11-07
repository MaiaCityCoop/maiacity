		}
		return {
			V: Math.abs(V),
			centroid: c.divideScalar(V || 1)
		};
	},
	/** n copies of a geometry rotated around an axis ('y' or 'z'), merged */
	ring(geo, n, axis = "z", phase = 0) {
		const out = [];
		for (let i = 0; i < n; i++) {
			const g = geo.clone();
			const m = new three.Matrix4();
			const a = phase + i / n * Math.PI * 2;
			axis === "y" ? m.makeRotationY(a) : axis === "x" ? m.makeRotationX(a) : m.makeRotationZ(a);
			g.applyMatrix4(m);
			out.push(g);
		}
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(out);
	},
	merge(list) {
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g));
	},
	/** a pipe through points (closed solid wall, ends capped) */
	pipe(points, r, { seg = 64, radial = 16, tension = .5 } = {}) {
		const curve = new three.CatmullRomCurve3(points.map((p) => new three.Vector3(...p)), false, "catmullrom", tension);
		const g = new three.TubeGeometry(curve, seg, r, radial, false);
		const caps = [];
		for (const [t, s] of [[0, -1], [1, 1]]) {
			const c = new three.CircleGeometry(r, radial);
			const tan = curve.getTangentAt(t).multiplyScalar(s);
			c.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), tan));
			c.translate(...curve.getPointAt(t).toArray());
			caps.push(c);
		}
		const m = GEO.merge([g, ...caps]);
		m.userData.curve = curve;
		return m;
	},
	/** hex bolt heads (or socket caps) on a circle around +Y at height y, merged */
	bolts(n, R, size, h, { y = 0, socket = false, phase = 0 } = {}) {
		const one = socket ? GEO.lathe([
			[0, 0],
			[size, 0],
			[size, h * .9],
			[size * .92, h],
			[size * .45, h],
			[size * .45, h * .55],
			[0, h * .55]
		], 24) : new three.CylinderGeometry(size, size, h, 6).translate(0, h / 2, 0);
		const out = [];
		for (let i = 0; i < n; i++) {
			const a = phase + i / n * Math.PI * 2;
			out.push(one.clone().translate(R * Math.cos(a), y, R * Math.sin(a)));
		}
		return GEO.merge(out);
	},
	/** coil spring along +Y */
	spring(R, wire, turns, len, seg = 400) {
		const pts = [];
		for (let i = 0; i <= seg; i++) {
			const t = i / seg, a = t * turns * Math.PI * 2;
			pts.push(new three.Vector3(R * Math.cos(a), t * len, R * Math.sin(a)));
