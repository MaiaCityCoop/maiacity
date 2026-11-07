		}
		if (area < 0) p.reverse();
		const cosT = Math.cos(three.MathUtils.degToRad(crease)), n0 = p.length;
		const isCrease = (i) => {
			const a = p[(i - 1 + n0) % n0], b = p[i], c = p[(i + 1) % n0];
			return b.clone().sub(a).normalize().dot(c.clone().sub(b).normalize()) < cosT;
		};
		let s0 = 0;
		for (let i = 0; i < n0; i++) if (isCrease(i)) {
			s0 = i;
			break;
		}
		p = [...p.slice(s0), ...p.slice(0, s0)];
		const out = [p[0].clone()];
		for (let i = 1; i < n0; i++) {
			out.push(p[i].clone());
			if (isCrease(i)) out.push(p[i].clone());
		}
		out.push(p[0].clone());
		const g = new three.LatheGeometry(out, seg, phi0, phiLen);
		g.computeVertexNormals();
		if (phiLen >= Math.PI * 2 - 1e-6) {
			const n = g.attributes.normal, P = out.length;
			for (let j = 0; j < P; j++) {
				const a = j, b = seg * P + j;
				const v = new three.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
				n.setXYZ(a, v.x, v.y, v.z);
				n.setXYZ(b, v.x, v.y, v.z);
			}
		}
		return g;
	},
	/**
	* a wall of thickness t following an open profile [[r, y], ...] (a nozzle, a casing, a cowl):
	* the outer line, then the same line offset inward, closed at both ends. Real solids cut cleanly.
	*/
	shell(pts, t, seg = 96, inward = true) {
		const out = pts.map((p) => new three.Vector2(p[0], p[1]));
		const inn = out.map((p, i) => {
			const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
			const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
			const nx = ty / l, ny = -tx / l;
			const s = inward ? -1 : 1;
			return new three.Vector2(Math.max(0, p.x + s * nx * t), p.y + s * ny * t);
		});
		return GEO.lathe([...out.map((v) => [v.x, v.y]), ...inn.reverse().map((v) => [v.x, v.y])], seg);
	},
	/** hollow cylinder along +Y */
	tube(rOut, rIn, h, seg = 96, y0 = -h / 2) {
		return GEO.lathe([
			[rIn, y0],
			[rOut, y0],
			[rOut, y0 + h],
			[rIn, y0 + h]
		], seg);
	},
	/** cylinder with chamfered edges along +Y */
	disc(r, h, ch = Math.min(r, h) * .08, seg = 96, rIn = 0) {
		return GEO.lathe([
			[rIn, -h / 2],
			[r - ch, -h / 2],
			[r, -h / 2 + ch],
			[r, h / 2 - ch],
			[r - ch, h / 2],
			[rIn, h / 2]
		], seg);
	},
	rbox(w, h, d, r = Math.min(w, h, d) * .08, s = 4) {
		return new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, s, r);
	},
	/** spur or helical gear around +Z, with an involute-like tooth (enough for a convincing mesh), centred on z */
	gear({ teeth = 24, module = .002, width = .008, bore = 0, helix = 0, rim = 0, spokes = 0 } = {}) {
		const rp = teeth * module / 2, ra = rp + module, rf = rp - 1.25 * module;
		const da = Math.PI * 2 / teeth, steps = 6;
		const hw = (r) => da * lerp(.31, .13, Math.pow(clamp((r - rf) / (ra - rf)), .85));
		const pts = [];
		for (let i = 0; i < teeth; i++) {
			const c = (i + .5) * da;
			pts.push([rf, i * da]);
			for (let k = 0; k <= steps; k++) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c - hw(r)]);
			}
			for (let k = 1; k < 3; k++) pts.push([ra, c - hw(ra) + 2 * hw(ra) * k / 3]);
			for (let k = steps; k >= 0; k--) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c + hw(r)]);
			}
		}
		const sh = new three.Shape();
		pts.forEach(([r, a], k) => {
			const x = r * Math.cos(a), y = r * Math.sin(a);
			k ? sh.lineTo(x, y) : sh.moveTo(x, y);
		});
		sh.closePath();
		if (bore > 0) {
			const h = new three.Path();
			h.absarc(0, 0, bore, 0, Math.PI * 2, true);
			sh.holes.push(h);
		}
		if (spokes > 0 && rim > 0) {
			const ri = rf - rim, rh = Math.max(bore * 1.9, rp * .28);
			for (let s = 0; s < spokes; s++) {
				const w = .22 * (rp / Math.max(ri, 1e-6));
				const a0 = s / spokes * Math.PI * 2 + w, a1 = (s + 1) / spokes * Math.PI * 2 - w;
				const h = new three.Path();
				h.absarc(0, 0, ri, a0, a1, false);
				h.absarc(0, 0, rh, a1 - w * .4, a0 + w * .4, true);
				h.closePath();
				sh.holes.push(h);
			}
		}
		const g = new three.ExtrudeGeometry(sh, {
			depth: width,
			bevelEnabled: true,
			bevelThickness: module * .15,
			bevelSize: module * .12,
			bevelSegments: 2,
			curveSegments: 24,
			steps: helix ? 6 : 1
		});
		g.translate(0, 0, -width / 2);
		if (helix) {
			const p = g.attributes.position;
			for (let i = 0; i < p.count; i++) {
				const a = p.getZ(i) / width * helix, x = p.getX(i), y = p.getY(i);
				p.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
			}
			g.computeVertexNormals();
		}
		g.userData.pitchRadius = rp;
		return g;
	},
	/**
	* one blade as a closed cambered, twisted airfoil solid, spanning radius r0..r1 along +Y,
	* chord along the axis (Z) by default. twist in rad root to tip, chord can be [root, tip].
	*/
	blade({ r0 = .1, r1 = .5, chord = .08, thick = .08, camber = .06, twist = .6, pitch = .4, sweep = 0, nS = 14, nC = 16, lean = 0 } = {}) {
		const c0 = Array.isArray(chord) ? chord[0] : chord, c1 = Array.isArray(chord) ? chord[1] : chord;
		const pos = [], idx = [];
		const ring = nC * 2;
		for (let s = 0; s <= nS; s++) {
			const u = s / nS, r = lerp(r0, r1, u), c = lerp(c0, c1, u), ang = pitch + twist * (u - .5) * -1;
			const tk = Array.isArray(thick) ? lerp(thick[0], thick[1], u) : thick, cb = Array.isArray(camber) ? lerp(camber[0], camber[1], u) : camber;
			for (let k = 0; k < ring; k++) {
				const top = k < nC, x = (top ? k : ring - 1 - k) / (nC - 1);
				const th = 5 * tk * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
				const yy = (4 * cb * x * (1 - x) + (top ? th : -th)) * c, xx = (x - .35) * c;
				const z = xx * Math.cos(ang) - yy * Math.sin(ang) + sweep * u * u;
				const tx = xx * Math.sin(ang) + yy * Math.cos(ang) + lean * u * u;
				pos.push(tx, r, z);
			}
		}
		for (let s = 0; s < nS; s++) for (let k = 0; k < ring; k++) {
			const a = s * ring + k, b = s * ring + (k + 1) % ring, c = a + ring, d = b + ring;
			idx.push(a, c, b, b, c, d);
		}
		const cap = (s, flip) => {
			const base = s * ring, cIdx = pos.length / 3;
			let cx = 0, cy = 0, cz = 0;
			for (let k = 0; k < ring; k++) {
				cx += pos[(base + k) * 3];
				cy += pos[(base + k) * 3 + 1];
				cz += pos[(base + k) * 3 + 2];
			}
			pos.push(cx / ring, cy / ring, cz / ring);
			for (let k = 0; k < ring; k++) {
				const a = base + k, b = base + (k + 1) % ring;
				flip ? idx.push(cIdx, b, a) : idx.push(cIdx, a, b);
			}
		};
		cap(0, false);
		cap(nS, true);
//#piece be586a4c5f448c8e39493bfa55893651d6f69e3ba71fc8b6dbe6a582ee6e964b
		const uv = [];
		for (let i = 0; i < pos.length / 3; i++) uv.push(i % ring / ring, Math.floor(i / ring) / nS);
		g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		return g;
	},
	/**
	* a bladed row: n blades around an axis. axis 'z' = blades radial in XY, chord along Z.
	* axis 'y' = blades radial in XZ, chord along Y (an engine built along Y). Same options as blade().
	*/
	rotor({ count = 24, axis = "y", phase = 0, ...b } = {}) {
		const one = GEO.blade(b);
		if (axis === "y") one.applyMatrix4(new three.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
		if (axis === "x") one.applyMatrix4(new three.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
		return count === 1 ? one : GEO.ring(one, count, axis, phase);
	},
	/** volume (m3) and centroid of a closed mesh: for real masses (m = rho V) and inertias */
	volume(geo) {
		const p = geo.attributes.position, idx = geo.index ? geo.index.array : null, n = idx ? idx.length : p.count;
		let V = 0;
		const c = new three.Vector3(), a = new three.Vector3(), b = new three.Vector3(), d = new three.Vector3();
		for (let i = 0; i < n; i += 3) {
			const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
			a.fromBufferAttribute(p, i0);
			b.fromBufferAttribute(p, i1);
			d.fromBufferAttribute(p, i2);
			const v = a.dot(b.clone().cross(d)) / 6;
			V += v;
			c.addScaledVector(a.clone().add(b).add(d), v / 4);
