	const g = new three.Group();
	const W = 2 * Math.PI * r;
	/** a sheet of the canvas (x0 … x1 along the bag) at radius rr round its middle, as open as k */
	const sheet = (x0, x1, rr, mat, cols, rows) => {
		const geo = new three.PlaneGeometry(1, 1, cols, rows);
		const mesh = new three.Mesh(geo, mat);
		mesh.castShadow = true;
		mesh.frustumCulled = false;
		mesh.userData.lay = (k) => {
			const pa = geo.attributes.position;
			const bend = (1 - k) / r;
			for (let j = 0; j <= rows; j++) {
				const a = (j / rows - .5) * W * (rr / r);
				for (let i = 0; i <= cols; i++) {
					const x = x1 - (x1 - x0) * i / cols;
					const idx = j * (cols + 1) + i;
					if (bend < 1e-4) pa.setXYZ(idx, x, .002 - (rr - r) * .25, a);
					else {
						const rho = 1 / bend + (rr - r);
						const b = a / rho;
						pa.setXYZ(idx, x, .002 + 1 / bend - rho * Math.cos(b), rho * Math.sin(b));
					}
				}
			}
			pa.needsUpdate = true;
			geo.computeVertexNormals();
			geo.boundingBox = geo.boundingSphere = null;
		};
		return mesh;
	};
	const bagMat = m.bag().clone();
	bagMat.side = three.DoubleSide;
