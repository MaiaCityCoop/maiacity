* The geodesic shell: triangles of an icosphere above the ground, and a strut
* on every edge. At each of the four doors the lowest panels are left out; the
* hole is measured and returned, so a portal wall can close it round the door.
*/
function geodesic(spec, m, kind) {
	const R = spec.diameter / 2;
	const p = new three.IcosahedronGeometry(R, spec.detail).attributes.position;
	const glass = [];
	const clear = [];
	const cloth = [];
	const wall = [];
	const tankZ = tankLine(kind, R);
	const edges = /* @__PURE__ */ new Map();
	const key = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
	const tris = [];
//#piece 1d8c30732b59e026caffc0204d9a9f6c44a8f325c0d401eb673b3938ea528185
		for (const v of tri) v.y = Math.max(0, v.y);
		const c = tri.reduce((s, v) => s.clone().add(v), new three.Vector3()).divideScalar(3);
		tris.push({
			tri,
			c,
			ca: Math.atan2(c.x, c.z)
		});
	}
	const { dw, top } = doorSize(kind);
	const skip = /* @__PURE__ */ new Set();
	const holes = [];
	for (const d of doorsOf(kind)) {
		const tang = (v) => v.x * Math.cos(d) - v.z * Math.sin(d);
		const inDoorway = (v) => Math.abs(tang(v)) < dw + .35 && v.y < top + .35;
		const cand = tris.map((t, i) => ({
			i,
			t
		})).filter(({ t }) => Math.abs(adiff(t.ca, d)) < Math.PI / 4);
		const nearest = Math.min(...cand.filter(({ t }) => t.c.y < R * .3).map(({ t }) => Math.abs(tang(t.c))));
		let halfWidth = 0, height = 0, depth = Infinity;
		for (const { i, t } of cand) {
			const [a, b, c] = t.tri;
			let hit = kind === "glamp" && t.c.y < R * .3 && Math.abs(tang(t.c)) <= nearest + .6;
			if (kind === "glamp" && !hit) continue;
			for (let u = 0; u <= 6 && !hit; u++) for (let w = 0; w <= 6 - u && !hit; w++) hit = inDoorway(a.clone().multiplyScalar(u / 6).addScaledVector(b, w / 6).addScaledVector(c, (6 - u - w) / 6));
			if (!hit) continue;
			skip.add(i);
			for (const v of t.tri) {
				halfWidth = Math.max(halfWidth, Math.abs(tang(v)));
				height = Math.max(height, v.y);
				depth = Math.min(depth, v.x * Math.sin(d) + v.z * Math.cos(d));
			}
		}
		holes.push({
			a: d,
			halfWidth,
			height,
			depth
		});
	}
	tris.forEach(({ tri, c, ca }, i) => {
		if (skip.has(i)) return;
		const isWindow = kind !== "glamp" || c.y > R * .78 || Math.abs(ca) < 1.8 && c.y > R * .08 && c.y < R * .62;
		const gal = spec.gallery;
		const byRooms = gal && [gal.height, ...gal.floors === 2 ? [gal.height + 3.6] : []].some((f) => c.y > f - .4 && c.y < f + 3.4);
		(tankZ !== null && c.z > tankZ ? wall : !isWindow ? cloth : byRooms ? clear : glass).push(...tri.flatMap((v) => [
			v.x,
			v.y,
			v.z
		]));
		for (let k = 0; k < 3; k++) {
			const a = tri[k], b = tri[(k + 1) % 3];
			const id = [key(a), key(b)].sort().join("|");
			if (!edges.has(id)) edges.set(id, [a.clone(), b.clone()]);
		}
	});
	const g = new three.Group();
	const shell = (arr, mat, shadow) => {
		if (!arr.length) return;
		const geo = new three.BufferGeometry();
		geo.setAttribute("position", new three.Float32BufferAttribute(arr, 3));
		geo.setAttribute("uv", new three.Float32BufferAttribute(Array.from({ length: arr.length / 9 }, () => [
			.5,
			.9,
			.92,
			.1,
			.08,
			.1
		]).flat(), 2));
		geo.computeVertexNormals();
		const mesh = new three.Mesh(geo, mat);
		mesh.castShadow = shadow;
		mesh.renderOrder = 2;
		g.add(mesh);
	};
	shell(glass, m.solar, false);
	shell(clear, m.glass, false);
	shell(cloth, m.canvas, true);
	if (wall.length) {
		const stone = m.lime(1).clone();
		stone.side = three.DoubleSide;
		stone.color.set("#cfc3ad");
		shell(wall, stone, true);
	}
	const strut = new three.CylinderGeometry(spec.strut, spec.strut, 1, 6);
	const inst = new three.InstancedMesh(strut, kind === "glamp" ? m.timberFrame : m.steel, edges.size);
	const mtx = new three.Matrix4(), q = new three.Quaternion(), up = new three.Vector3(0, 1, 0);
	let i = 0;
	for (const [a, b] of edges.values()) {
		const d = b.clone().sub(a);
		q.setFromUnitVectors(up, d.clone().normalize());
		mtx.compose(a.clone().add(b).multiplyScalar(.5), q, new three.Vector3(1, d.length(), 1));
		inst.setMatrixAt(i++, mtx);
	}
	inst.castShadow = true;
	g.add(inst);
	return {
		group: g,
		holes
	};
}
/**
* A portal: the wall that closes a door hole in the shell — canvas on the
* glamping dome, limestone on the big ones — with an opening, a timber frame,
* and the glazed door standing open.
*/
function portal(m, hole, kind) {
	const g = new three.Group();
	const W = hole.halfWidth + .15;
	const Ht = Math.max(hole.height, 3.2);
	const { dw, dh } = doorSize(kind);
	const spring = dh - dw * .6;
	const shape = new three.Shape();
	shape.moveTo(-W, 0);
	shape.lineTo(W, 0);
	shape.lineTo(W, Ht);
	shape.lineTo(-W, Ht);
	shape.closePath();
	const opening = new three.Path();
	opening.moveTo(-dw, 0);
	opening.lineTo(dw, 0);
	if (kind === "glamp") opening.lineTo(dw, dh), opening.lineTo(-dw, dh);
	else opening.lineTo(dw, spring), opening.absarc(0, spring, dw, 0, Math.PI, false);
	opening.lineTo(-dw, 0);
	shape.holes.push(opening);
	const geo = new three.ShapeGeometry(shape, 16);
	const wall = new three.Mesh(geo, kind === "glamp" ? m.canvas : m.lime(1 / 3.2, 1 / 3.2));
	wall.material.side = three.DoubleSide;
	wall.castShadow = wall.receiveShadow = true;
	g.add(wall);
	if (kind === "glamp") {
		g.add(box(.18, dh, .3, m.timberFrame, -dw - .05, 0, 0));
		g.add(box(.18, dh, .3, m.timberFrame, dw + .05, 0, 0));
		g.add(box(dw * 2 + .3, .2, .32, m.timberFrame, 0, dh, 0));
	} else {
		const trim = m.lime(.5, 1);
		for (const side of [-1, 1]) g.add(box(.4, spring, .5, trim, side * (dw + .2), 0, 0));
		const arch = new three.Mesh(new three.TorusGeometry(dw + .2, .22, 8, 24, Math.PI), trim);
		arch.scale.z = 1.1;
		arch.position.y = spring;
		arch.castShadow = true;
		g.add(arch);
	}
	const leaf = new three.Group();
	leaf.add(box(dw, dh - .15, .05, m.glass, dw / 2, 0, 0));
	leaf.add(box(.07, dh - .15, .07, m.timberFrame, 0, 0, 0));
	leaf.add(box(.07, dh - .15, .07, m.timberFrame, dw, 0, 0));
	leaf.position.set(dw, 0, .1);
	leaf.rotation.y = -1.9;
	g.add(leaf);
	const [x, z] = polar(hole.depth - .08, hole.a);
	g.position.set(x, 0, z);
	g.rotation.y = hole.a;
