			d0.normalize();
			const p = point(b, s);
			const out = v3(p.x - env.c.x, 0, p.z - env.c.z).normalize();
			const inward = d0.x * out.x + d0.z * out.z < -.3;
