// THE FLYOVER CAMERA'S MOVES — over the game's world map (x east, z south, y up, centre 0; a unit about 11 m: a village
// ~150 across, a tower 30 high). A move is a function of u (0 a shot's first frame, 1 its last) giving { eye, at, fov }
// (fov vertical degrees; `at` the point looked at), at an even speed throughout, so a cut lands in motion and nothing
// starts or stops on screen (the cinematographer's rule). A number may be [from, to], a point [[from…], [to…]].

const mix = (a, b, u) => a + (b - a) * u;
/** a number, or [from, to] */
export const num = (v, u) => (Array.isArray(v) ? mix(v[0], v[1], u) : v);
/** a point, or [from, to] of points */
export const pt = (v, u) => (Array.isArray(v[0]) ? v[0].map((a, i) => mix(a, v[1][i], u)) : v);

/** a straight move: the eye and the point it looks at each from one place to another, the lens from one fov to another */
export const line = ({ eye, look, fov = 38 }) => (u) => ({ eye: pt(eye, u), at: pt(look, u), fov: num(fov, u) });

/** round centre `c` [x, z]: the eye at angle `deg` (0 east, 90 south), distance `r`, height `h`, looking at height `y`, `ahead` past the centre */
export const orbit = ({ c, deg, r, h, y = 0, ahead = 0, fov = 38 }) => (u) => {
	const [cx, cz] = pt(c, u), a = (num(deg, u) * Math.PI) / 180, d = num(r, u);
	const ex = cx + d * Math.cos(a), ez = cz + d * Math.sin(a), k = num(ahead, u) / d;
	return { eye: [ex, num(h, u), ez], at: [cx + (cx - ex) * k, num(y, u), cz + (cz - ez) * k], fov: num(fov, u) };
};

/**
 * the god's eye: high over `over` [x, z], looking nearly straight down (stood back by `lean` of its height, keeping the
 * picture upright), its top toward `heading` (degrees: 270 north), turning as it moves
 */
export const above = ({ over, h, heading = 270, lean = 0.1, fov = 38 }) => (u) => {
	const [x, z] = pt(over, u), y = num(h, u), a = (num(heading, u) * Math.PI) / 180, back = y * num(lean, u);
	return { eye: [x - back * Math.cos(a), y, z - back * Math.sin(a)], at: [x, 0, z], fov: num(fov, u) };
};

/**
 * along a line of [x, z] (the river) from share `from` to `to` of its length (to < from: upstream), at height `h`,
 * `side` to its right, looking `ahead`; the line smoothed so the camera does not take every bend
 */
export const along = ({ path, from, to, h, ahead, side = 0, y = 0, fov = 38 }) => {
	const len = [0];
	for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
	const total = len.at(-1);
	const point = (s) => {
		s = Math.max(0, Math.min(total, s));
		let i = 1;
		while (i < path.length - 1 && len[i] < s) i++;
		const k = (s - len[i - 1]) / (len[i] - len[i - 1] || 1);
		return [mix(path[i - 1][0], path[i][0], k), mix(path[i - 1][1], path[i][1], k)];
	};
	const smooth = (s, w = 300) => {
		let x = 0, z = 0, n = 0;
		for (let d = -w; d <= w; d += w / 8, n++) {
			const [px, pz] = point(s + d);
			x += px;
			z += pz;
		}
		return [x / n, z / n];
	};
	const dir = Math.sign(to - from) || 1;
	return (u) => {
		const s = mix(from, to, u) * total, [x, z] = smooth(s), [lx, lz] = smooth(s + dir * num(ahead, u));
		const dx = lx - x, dz = lz - z, l = Math.hypot(dx, dz) || 1, o = num(side, u);
		return { eye: [x - (dz / l) * o, num(h, u), z + (dx / l) * o], at: [lx, num(y, u), lz], fov: num(fov, u) };
	};
};
