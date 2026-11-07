	const nx = Math.ceil((hi[0] - lo[0]) / h), ny = Math.ceil((hi[1] - lo[1]) / h), nz = Math.ceil((hi[2] - lo[2]) / h);
	const px = nx + 1, py = ny + 1, pz = nz + 1;
	const at = (i, j, k) => i + px * (j + py * k);
	const B = 6, bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
	const lists = new Array(bx * by * bz);
	const flat = new Uint8Array(bx * by * bz);
	const value = new Float32Array(px * py * pz).fill(NaN);
	const half = B * h * Math.sqrt(3) / 2;
	for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
		const cx = lo[0] + (ib + .5) * B * h, cy = lo[1] + (jb + .5) * B * h, cz = lo[2] + (kb + .5) * B * h;
		const reach = half + h * Math.sqrt(3);
		const list = shapes.filter((s) => Math.hypot(cx - s.mid[0], cy - s.mid[1], cz - s.mid[2]) <= s.reach + s.k + s.bump + reach * 1.3);
		lists[ib + bx * (jb + by * kb)] = list;
		const d = list.some((s) => !s.carve) ? field(list, cx, cy, cz) : 1e9;
		const i0 = ib * B, j0 = jb * B, k0 = kb * B;
		const i1 = Math.min(nx, i0 + B), j1 = Math.min(ny, j0 + B), k1 = Math.min(nz, k0 + B);
		const uniform = Math.abs(d) > reach * 1.2;
		flat[ib + bx * (jb + by * kb)] = uniform ? 1 : 0;
		for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
			const n = at(i, j, k);
			if (value[n] === value[n]) continue;
			value[n] = uniform ? Math.sign(d) * reach : field(list, lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
		}
	}
	const listAt = (x, y, z) => {
		const ib = Math.min(bx - 1, Math.max(0, Math.floor((x - lo[0]) / (B * h))));
		const jb = Math.min(by - 1, Math.max(0, Math.floor((y - lo[1]) / (B * h))));
		const kb = Math.min(bz - 1, Math.max(0, Math.floor((z - lo[2]) / (B * h))));
		return lists[ib + bx * (jb + by * kb)];
	};
	const cellAt = (i, j, k) => i + nx * (j + ny * k);
	const vertexOf = new Int32Array(nx * ny * nz).fill(-1);
	const pos = [];
	const corner = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	const EDGES = [
		[0, 1],
		[2, 3],
		[4, 5],
		[6, 7],
		[0, 2],
		[1, 3],
		[4, 6],
		[5, 7],
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7]
	];
	const cellVertex = (i, j, k) => {
		let inside = 0;
		for (let c = 0; c < 8; c++) {
			corner[c] = value[at(i + (c & 1), j + (c >> 1 & 1), k + (c >> 2 & 1))];
			if (corner[c] < 0) inside++;
		}
		if (inside === 0 || inside === 8) return;
		let sx = 0, sy = 0, sz = 0, n = 0;
		for (const [a, b] of EDGES) {
			const va = corner[a], vb = corner[b];
			if (va < 0 === vb < 0) continue;
			const t = va / (va - vb);
			sx += (a & 1) + ((b & 1) - (a & 1)) * t;
			sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t;
			sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t;
			n++;
		}
		vertexOf[cellAt(i, j, k)] = pos.length / 3;
		pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
	};
	for (let kb = 0; kb < bz; kb++) for (let jb = 0; jb < by; jb++) for (let ib = 0; ib < bx; ib++) {
		if (flat[ib + bx * (jb + by * kb)]) continue;
		for (let k = kb * B; k < Math.min(nz, kb * B + B); k++) for (let j = jb * B; j < Math.min(ny, jb * B + B); j++) for (let i = ib * B; i < Math.min(nx, ib * B + B); i++) cellVertex(i, j, k);
	}
	const idx = [];
	const quad = (a, b, c, d) => {
		if (a < 0 || b < 0 || c < 0 || d < 0) return;
		idx.push(a, b, c, a, c, d);
	};
	for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
		const v0 = value[at(i, j, k)] < 0;
		if (i < nx && j > 0 && k > 0 && j < ny && k < nz && v0 !== value[at(i + 1, j, k)] < 0) quad(vertexOf[cellAt(i, j - 1, k - 1)], vertexOf[cellAt(i, j, k - 1)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i, j - 1, k)]);
		if (j < ny && i > 0 && k > 0 && i < nx && k < nz && v0 !== value[at(i, j + 1, k)] < 0) quad(vertexOf[cellAt(i - 1, j, k - 1)], vertexOf[cellAt(i, j, k - 1)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i - 1, j, k)]);
		if (k < nz && i > 0 && j > 0 && i < nx && j < ny && v0 !== value[at(i, j, k + 1)] < 0) quad(vertexOf[cellAt(i - 1, j - 1, k)], vertexOf[cellAt(i, j - 1, k)], vertexOf[cellAt(i, j, k)], vertexOf[cellAt(i - 1, j, k)]);
	}
