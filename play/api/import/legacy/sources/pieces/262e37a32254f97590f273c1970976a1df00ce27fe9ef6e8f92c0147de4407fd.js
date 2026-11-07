			while (i + 2 < sh.pts.length && lengths[i + 1] < s) i++;
			const a = sh.pts[i], b = sh.pts[i + 1];
			const p = a.clone().lerp(b, clamp((s - lengths[i]) / Math.max(1e-6, lengths[i + 1] - lengths[i])));
			const d = b.clone().sub(a).normalize();
