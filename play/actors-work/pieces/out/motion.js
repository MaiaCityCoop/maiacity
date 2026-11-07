/*
 * A PERSON'S MOTION — clips of motion capture (the pieces "Motion: …", as data) played on a person's body (the piece
 * "Person body"), with their feet put down by the actors' one IK (`reach`, the piece "Gait and reach") so that a foot
 * on the ground stays where it was put down. Nothing here is drawn by hand: every turn of every bone comes from a
 * capture, and what this adds is how they are played and joined:
 *
 * - **walk** and **run**: one move each, blended by speed with the idle (idle below ~0.6 m/s, its stride above it),
 *   and with each other by whoever plays them (a world, a film: walk to about 2 m/s, run from there), each stride
 *   played by the distance walked (one stride every
 *   `stride` metres, the person's own, not the capture's: the feet are put back where the stride puts them). A foot
 *   on the ground is held there, a foot in the air carried from where it lifted to where it lands, and the hips
 *   lowered as far as the legs need. On a slope (`slope`, degrees, uphill ahead) or up stairs (`step`, the rise of
 *   each, one a step) each foot lands on the ground under it and the sole lies along it.
 * - **idle**, **sitting**: loops, in time. **start**, **stop**, **sit down**, **stand up**, **wave**, **pick up**:
 *   played once, in time, their feet held where they stand.
 * - **turn left**, **turn right**: a quarter turn on the spot over 1.6 s, the body from the idle, each foot stepped
 *   round by reach in turn, the inner foot first.
 *
 * `moves(build, { gait, actions, gears, strides, run, ground })`: { clips, gears } for an actor's cast, every clip
 * (t, m?) → its pose (each bone's turn as x, y, z angles, the root's place), m how it moves ({ dist, speed, turn }).
 */
const three = require('three');
const IK = require('87f6540d15a24f7164ff7080290b56bd1067a8e5e1a0357848f06b5314b41bdd');

const { Quaternion, Vector3, Euler, Matrix4 } = three;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const frac = (x) => x - Math.floor(x);
const SIDES = ['left', 'right'];

/** one clip's data as numbers: each moved bone's quaternions (x, y, z, w) and the hips' place (m, scaled by s) */
function decode(c, s) {
	const n = c.frames;
	const turns = {};
	for (const [bone, list] of Object.entries(c.turns)) {
		const q = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const x = list[i * 3] / 1e4, y = list[i * 3 + 1] / 1e4, z = list[i * 3 + 2] / 1e4;
			q[i * 4] = x;
			q[i * 4 + 1] = y;
			q[i * 4 + 2] = z;
			q[i * 4 + 3] = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
		}
		turns[bone] = q;
	}
	const hips = Float32Array.from(c.hips, (x) => (x / 1000) * s);
	return { ...c, n, turns, hips, fps: c.fps };
}

/** a clip at frame x (a cycle or a loop wrapped round, once held at its ends): each bone's turn into `q` (a map of
 *  Quaternions), the hips' place into `h` */
function sample(c, x, q, h) {
	const n = c.n;
	let i, u, j;
	if (c.kind === 'once' || c.kind === 'pose') {
		x = clamp(x, 0, n - 1);
		i = Math.min(n - 1, Math.floor(x));
		j = Math.min(n - 1, i + 1);
		u = x - i;
	} else {
		x = frac(x / n) * n;
		i = Math.floor(x) % n;
		j = (i + 1) % n;
		u = x - Math.floor(x);
	}
	for (const bone in c.turns) {
		const T = c.turns[bone];
		const a = (q[bone] ??= new Quaternion());
		a.set(T[i * 4], T[i * 4 + 1], T[i * 4 + 2], T[i * 4 + 3]);
		qb.set(T[j * 4], T[j * 4 + 1], T[j * 4 + 2], T[j * 4 + 3]);
		a.slerp(qb, u);
	}
	const H = c.hips;
	// a cycle's hips come back round to where they started; once, hold the end
	h.set(H[i * 3] + (H[j * 3] - H[i * 3]) * u, H[i * 3 + 1] + (H[j * 3 + 1] - H[i * 3 + 1]) * u, H[i * 3 + 2] + (H[j * 3 + 2] - H[i * 3 + 2]) * u);
	return q;
}
const qb = new Quaternion();

/**
 * The cast's moves. `build`: the person (the piece "Person body"'s `person`), `gait`: its walk, run, idle, start and
 * stop (data), `actions`: the everyday actions (data), `gears`: the speeds its walk and run are played at (m/s),
 * `strides`: its own stride (m, two steps) walking and running, `ground`: { slope, step } under it, for checking it on a slope or up stairs.
 */
function moves(build, { gait, actions, gears = { walk: 1.4, run: 3 }, strides = { walk: 1.5, run: 2.3 }, ground = {} }) {
	const M = build.measure, s = M.s;
	const bones = M.bones;
	const by = Object.fromEntries(bones.map((b) => [b.name, b]));
	const names = bones.map((b) => b.name);
	const sk = IK.skeleton(bones);
	const C = {};
	for (const [k, c] of Object.entries(gait)) C[k] = decode(c, s);
	for (const [k, c] of Object.entries(actions)) C[k] = decode(c, s);
	const hands = {};
	sample(C.hands, 0, hands, new Vector3());
	for (const n of Object.keys(hands)) if (!/(Thumb|Index|Middle|Ring|Little)/.test(n)) delete hands[n];
	const slope = Math.tan(((ground.slope ?? 0) * Math.PI) / 180);
	const rise = ground.step ?? 0;

	// ---- reckoning: world turns and places of a pose given as quaternions, for the feet ----
	const order = names;
	/** world quaternions and places of every bone from local quaternions `q` and the hips' place `h` (model space) */
	function world(q, h, out = { Q: {}, P: {} }) {
		for (const n of order) {
			const b = by[n];
			const lq = q[n] ?? I;
			const Q = (out.Q[n] ??= new Quaternion()), P = (out.P[n] ??= new Vector3());
			if (!b.parent) {
				Q.copy(lq);
				P.set(b.at[0] + h.x, b.at[1] + h.y, b.at[2] + h.z);
			} else {
				const pb = by[b.parent];
				P.set(b.at[0] - pb.at[0], b.at[1] - pb.at[1], b.at[2] - pb.at[2]).applyQuaternion(out.Q[b.parent]).add(out.P[b.parent]);
				Q.copy(out.Q[b.parent]).multiply(lq);
			}
		}
		return out;
	}
	const I = new Quaternion();
	const ankleRest = by.leftFoot.at[1];

	// ---- each clip's feet, frame by frame: where each ankle is and how each foot is turned in the world, and
	//      whether it is on the ground; a cycle's grounded feet put back on its own stride ----
	/** the heel's and each ball's place from the ankle, the foot at rest */
	const soleOf = { heel: new Vector3(0, -by.leftFoot.at[1], -0.065 * s) };
	for (const side of SIDES) soleOf[`${side}Ball`] = new Vector3(by[`${side}Toes`].at[0] - by[`${side}Foot`].at[0], by[`${side}Toes`].at[1] - by[`${side}Foot`].at[1] - 0.022 * s, by[`${side}Toes`].at[2] - by[`${side}Foot`].at[2]);
	const feet = {};
	for (const [key, c] of Object.entries(C)) {
		if (key === 'hands') continue;
		const F = { left: [], right: [] };
		const q = {}, h = new Vector3();
		for (let i = 0; i < c.n; i++) {
			sample(c, i, q, h);
			const w = world(q, h);
			for (const side of SIDES) F[side].push({ p: w.P[`${side}Foot`].clone(), Q: w.Q[`${side}Foot`].clone() });
		}
		for (const side of SIDES) {
			const L = F[side];
			const lo = Math.min(...L.map((f) => f.p.y));
			// on the ground: within 2.5 cm of its lowest and slow (a cycle's march taken out: moving back at its pace)
			const back = c.kind === 'cycle' ? (c.stride * s) / c.n : 0;
			L.forEach((f, i) => {
				const nx = L[(i + 1) % L.length].p, pv = L[(i - 1 + L.length) % L.length].p;
				const v = Math.hypot(nx.x - pv.x, nx.z + back * 2 - pv.z) / 2;
				f.down = f.p.y < lo + 0.025 * s && (c.kind === 'cycle' || v < 0.012 * s || i === 0 || i === L.length - 1);
			});
			// a stride's foot is down from the moment its sole first touches (its heel, landing) to when it last does
			// (its ball, pushing off): within 1.5 cm of the lowest its sole comes
			if (c.kind === 'cycle') {
				const low = (f) => Math.min(f.p.y + soleOf.heel.clone().applyQuaternion(f.Q).y, f.p.y + soleOf[`${side}Ball`].clone().applyQuaternion(f.Q).y);
				const floor = Math.min(...L.map(low));
				L.forEach((f) => (f.down = low(f) < floor + 0.015 * s));
			}
		}
		feet[key] = F;
	}

	/** where each sole's heel and ball are from its ankle, the foot at rest (model space) */
	const sole = { heel: new Vector3(0, -by.leftFoot.at[1], -0.065 * s) };
	for (const side of SIDES) {
		const f = by[`${side}Foot`].at, t = by[`${side}Toes`].at;
		sole[`${side}Ball`] = new Vector3(t[0] - f[0], t[1] - f[1] - 0.022 * s, t[2] - f[2]);
	}

	/**
	 * A cycle's foot track at its own stride: for each side, at each frame, the ankle's place in the body's frame
	 * (planted feet moving back exactly as the body moves on: `stride` m a cycle), whether down, and the phases where
	 * it lands and lifts.
	 */
	function track(key, stride) {
		const c = C[key], F = feet[key], n = c.n, out = {};
		const k = stride / (c.stride * s);
		for (const side of SIDES) {
			const L = F[side];
			// the stance: the longest run of frames down, round the loop
			let best = [0, 0];
			for (let a = 0; a < n; a++) {
				if (!L[a].down || L[(a - 1 + n) % n].down) continue;
				let b = a;
				while (L[(b + 1) % n].down && b - a < n - 1) b++;
				if (b - a > best[1] - best[0]) best = [a, b];
			}
			const [a, b] = best; // lands at a, lifts after b (b may pass n)
			const len = b - a + 1;
			const mid = a + (len - 1) / 2;
			const zMid = L.slice(0).reduce((sum, f, i) => sum, 0);
			let zc = 0, xc = 0;
			for (let i = a; i <= b; i++) (zc += L[i % n].p.z + ((i - mid) * stride) / n), (xc += L[i % n].p.x);
			zc /= len;
			xc /= len;
			const P = [];
			// on the ground first: it rolls on what touches, the heel while it is lower than the ball, then the ball;
			// both rest where the foot lies flat at the middle of its time down, the body moving on over them
			const Qm = L[Math.round(mid) % n].Q;
			for (let r = 0; r < len; r++) {
				const i = (a + r) % n, Qi = L[i].Q;
				const ankle = new Vector3(xc, ankleRest, zc - ((a + r - mid) * stride) / n);
				const heelAt = ankle.clone().add(sole.heel.clone().applyQuaternion(Qm));
				const ballAt = ankle.clone().add(sole[`${side}Ball`].clone().applyQuaternion(Qm));
				const hi = sole.heel.clone().applyQuaternion(Qi), bi = sole[`${side}Ball`].clone().applyQuaternion(Qi);
				const at = heelAt.sub(hi).lerp(ballAt.sub(bi), smooth(-0.008 * s, 0.008 * s, hi.y - bi.y));
				P[i] = { z: at.z, x: at.x, y: at.y, down: 1, Q: Qi };
			}
			// in the air: the capture's swing, stretched to this stride, joined to where it lifted and where it lands
			// (a stride on, ahead in the body's frame)
			const lift = P[(a + len - 1) % n], land = P[a];
			const dLift = L[(a + len - 1) % n].p, dLand = L[a].p;
			for (let r = len; r < n; r++) {
				const i = (a + r) % n;
				const u = (r - len + 1) / (n - len + 1);
				const d = L[i].p;
				const zs = dLift.z + (d.z - dLift.z) * k, zEnd = dLift.z + (dLand.z - dLift.z) * k;
				const z0 = lift.z, z1 = land.z;
				// eased, so the foot leaves and meets the ground at the capture's own pace, not with a jolt
				const e = smooth(0, 1, u);
				const corrZ = (z0 - dLift.z) * (1 - e) + (z1 - zEnd) * e;
				const corrY = (lift.y - dLift.y) * (1 - e) + (land.y - dLand.y) * e;
				const corrX = (lift.x - dLift.x) * (1 - e) + (land.x - dLand.x) * e;
				P[i] = { z: zs + corrZ, x: d.x + corrX, y: d.y + corrY, down: 0, Q: L[i].Q, u };
			}
			out[side] = { P, land: a / n, lift: ((b + 1) % n) / n, stance: len / n };
		}
		return out;
	}
	const tracks = {};
	for (const g of ['walk', 'run']) tracks[g] = track(g, strides[g] * s);

	/** the ground's height at a place in the world (the person walks towards +z from z 0): a slope, or stairs of one
	 *  step a stride's half, each tread centred under where a foot comes down flat (the left foot's first, past z 0) */
	const going = (strides.walk * s) / 2;
	const LT = tracks.walk.left, Lw = strides.walk * s;
	const flat = LT.P[Math.round(frac(LT.land + LT.stance / 2) * C.walk.n) % C.walk.n];
	const origin = frac(LT.land + LT.stance / 2) * Lw + flat.z + 0.07 * s + Lw;
	const heightAt = (z) => slope * z + (rise ? rise * Math.max(0, Math.round((z - origin) / going) + 1) : 0);
	/** the hips' ground: stairs smoothed into their slope */
	const hipsGround = (z) => slope * z + (rise ? (rise * Math.max(0, z - origin + going * 1.5)) / going : 0);
	const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.atan(slope));

	// ---- one pose as the rig takes it ----
	const e = new Euler();
	function out(q, h, legs, flatFeet) {
		const pose = {};
		for (const n of names) {
			if (n === 'hips') continue;
			const x = q[n];
			if (!x) continue;
			e.setFromQuaternion(x);
			pose[n] = [e.x, e.y, e.z];
		}
		const hq = q.hips ?? I;
		e.setFromQuaternion(hq);
		pose.hips = [e.x, e.y, e.z];
		pose.root = [h.x, h.y, h.z];
		if (legs) place(pose, legs, flatFeet);
		return pose;
	}

	/** each leg bent by reach so its ankle is at its target, and its foot turned as the world turn asks; the hips
	 *  lowered first as far as the farther leg needs */
	const tv = new Vector3(), m4 = new Matrix4(), qw = new Quaternion();
	function place(pose, legs) {
		// each sole on the ground: a foot down set on the lowest of its heel and its ball, no foot ever through it
		for (const side of SIDES) {
			const L = legs[side];
			const heel = sole.heel.clone().applyQuaternion(L.Q).add(L.p), ball = sole[`${side}Ball`].clone().applyQuaternion(L.Q).add(L.p);
			const g = L.ground ?? ((z) => heightAt(z));
			const low = Math.min(heel.y - g(heel.z), ball.y - g(ball.z));
			const down = L.down ?? 0;
			if (low < 0) L.p.y -= low;
			else if (down > 0) L.p.y -= low * down;
			// a foot carried clears the ground by 2 cm at least (a toe's clearance), never scuffing it
			const clear = 0.02 * s;
			if (down < 0.5 && L.swing && low < clear) L.p.y += (clear - Math.max(0, low)) * (1 - 2 * down);
		}
		let drop = 0;
		for (const side of SIDES) {
			const hip = sk.joint(pose, `${side}UpperLeg`);
			const la = len[side][0], lb = len[side][1];
			const d = hip.distanceTo(legs[side].p);
			const most = (la + lb) * 0.995;
			if (d > most) {
				const dy = legs[side].p.y - hip.y;
				const dxz = Math.hypot(legs[side].p.x - hip.x, legs[side].p.z - hip.z);
				const need = -dy - Math.sqrt(Math.max(0, most * most - dxz * dxz));
				drop = Math.max(drop, need);
			}
		}
		if (drop > 0) pose.root[1] -= drop;
		for (const side of SIDES) {
			const L = legs[side];
			IK.reach(sk, pose, `${side}UpperLeg`, `${side}LowerLeg`, by[`${side}Foot`].at, L.p);
			// the foot's turn in the world, made local under the bent shin
			m4.copy(sk.frame(pose, `${side}LowerLeg`));
			qw.setFromRotationMatrix(m4);
			const local = qw.invert().multiply(L.Q);
			e.setFromQuaternion(local);
			pose[`${side}Foot`] = [e.x, e.y, e.z];
		}
	}
	const len = {};
	for (const side of SIDES) {
		const a = by[`${side}UpperLeg`].at, b = by[`${side}LowerLeg`].at, f = by[`${side}Foot`].at;
		len[side] = [Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), Math.hypot(b[0] - f[0], b[1] - f[1], b[2] - f[2])];
	}

	// ---- the moves ----
	const qa = {}, qr = {}, qi = {}, ha = new Vector3(), hr = new Vector3(), hi = new Vector3();
	const slerpInto = (A, B, w) => {
		for (const n in B) {
			if (!A[n]) A[n] = B[n].clone().slerp(I, 0);
			A[n].slerp(B[n], w);
		}
		for (const n in A) if (!B[n]) A[n].slerp(I, w);
	};
	/** a gait's legs at a phase: each ankle (model space, before the ground) and the foot's world turn, and the
	 *  phases it landed and lifts, for the ground under it */
	function legsOf(g, phase, pos) {
		const T = tracks[g], c = C[g], out = {};
		for (const side of SIDES) {
			const P = T[side].P, x = phase * c.n, i = Math.floor(x) % c.n, j = (i + 1) % c.n, u = x - Math.floor(x);
			const A = P[i], B = P[j];
			const p = new Vector3(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u, A.z + (B.z - A.z) * u);
			const Q = A.Q.clone().slerp(B.Q, u);
			out[side] = { p, Q, down: A.down * (1 - u) + B.down * u, T: T[side], side };
		}
		return out;
	}
	/** the ground under a gait's foot: where it stands, or between where it lifted and where it lands */
	function grounded(L, g, phase, dist) {
		const stride = strides[g] * s;
		const T = L.T;
		const z = dist + L.p.z;
		if (L.down > 0.5) {
			L.p.y += heightAt(z) + (slope ? ankleRest * (1 / Math.cos(Math.atan(slope)) - 1) : 0);
			L.Q.premultiply(tilt);
			return;
		}
		// in the air: from the phase it lifted to the phase it lands
		const since = frac(phase - T.lift), until = frac(T.land - phase), all = since + until || 1;
		const u = since / all;
		const zLift = z - since * stride - (L.p.z - L.p.z), zLand = z + until * stride;
		const y0 = heightAt(dist - since * stride + (L.p.z - (u * 0))) , y1 = heightAt(dist + until * stride + L.p.z);
		const gy = heightAt(zLift) + (heightAt(zLand) - heightAt(zLift)) * smooth(0, 1, u);
		L.p.y += gy + (rise ? rise * 0.6 * Math.sin(Math.PI * u) : 0);
		L.Q.premultiply(new Quaternion().slerp(tilt, Math.abs(0.5 - u) * 2));
	}
	/** walking or running, blended by speed, by the distance come */
	const move = (gait) => (t, m) => {
		const v = m?.speed ?? gears[gait];
		const dist = m?.dist ?? v * t;
		const wGo = smooth(0.05, 0.6, v), wRun = gait === 'run' ? 1 : 0;
		const pw = frac(dist / (strides.walk * s)), pr = frac(dist / (strides.run * s));
		const q = {};
		const h = new Vector3();
		sample(C.idle, t * C.idle.fps, qi, hi);
		sample(C.walk, pw * C.walk.n, qa, ha);
		sample(C.run, pr * C.run.n, qr, hr);
		for (const n in qi) q[n] = qi[n].clone();
		Object.assign(q, Object.fromEntries(Object.entries(hands).map(([n, x]) => [n, x.clone()])));
		const go = {};
		for (const n in qa) go[n] = qa[n].clone();
		if (wRun > 0) slerpInto(go, qr, wRun);
		if (wGo > 0) slerpInto(q, go, wGo);
		for (const n of Object.keys(hands)) q[n] = hands[n].clone();
		h.copy(hi).lerp(ha.clone().lerp(hr, wRun), wGo);
		h.y += hipsGround(dist);
		// the legs: standing feet as the idle has them, stepping feet as the stride puts them
		const legs = {};
		const lw = legsOf('walk', pw), lr = legsOf('run', pr);
		const fi = feet.idle;
		const ii = Math.floor(frac((t * C.idle.fps) / C.idle.n) * C.idle.n);
		for (const side of SIDES) {
			grounded(lw[side], 'walk', pw, dist);
			grounded(lr[side], 'run', pr, dist);
			const p = lw[side].p.clone().lerp(lr[side].p, wRun);
			const Q = lw[side].Q.clone().slerp(lr[side].Q, wRun);
			const ip = fi[side][ii].p.clone();
			ip.y += heightAt(dist + ip.z);
			const iQ = fi[side][ii].Q.clone().premultiply(tilt);
			const down = (fi[side][ii].down ? 1 : 0) * (1 - wGo) + (lw[side].down * (1 - wRun) + lr[side].down * wRun) * wGo;
			legs[side] = { p: ip.lerp(p, wGo), Q: iQ.slerp(Q, wGo), down, swing: wGo > 0.5, ground: (z) => heightAt(dist + z) };
		}
		return out(q, h, legs);
	};
	/** a clip in time, its feet held where it has them */
	const timed = (key, { loop = false } = {}) => (t) => {
		const c = C[key];
		const x = loop ? t * c.fps : clamp(t * c.fps, 0, c.n - 1);
		const q = {}, h = new Vector3();
		sample(c, x, q, h);
		if (!Object.keys(c.turns).some((n) => /Index|Thumb/.test(n))) for (const n of Object.keys(hands)) q[n] = hands[n].clone();
		h.y += hipsGround(0);
		const F = feet[key];
		const i = loop ? Math.floor(frac(x / c.n) * c.n) : Math.min(c.n - 1, Math.floor(x));
		const j = loop ? (i + 1) % c.n : Math.min(c.n - 1, i + 1), u = x - Math.floor(x);
		const legs = {};
		for (const side of SIDES) {
			const A = F[side][i], B = F[side][j];
			const p = A.p.clone().lerp(B.p, u);
			// held: a foot down keeps the place it was put down at (the middle of its time down)
			const held = heldAt(F[side], i, loop);
			if (held && A.down) p.set(held.x, ankleRest, held.z);
			p.y += heightAt(p.z);
			legs[side] = { p, Q: A.Q.clone().slerp(B.Q, u).premultiply(tilt), down: A.down ? 1 : 0 };
		}
		return out(q, h, legs);
	};
	/** where a foot down at frame i is held: the middle of its run of frames down */
	const heldCache = new Map();
	function heldAt(L, i, loop) {
		if (!heldCache.has(L)) {
			const n = L.length, at = new Array(n).fill(null);
			for (let a = 0; a < n; a++) {
				if (!L[a].down || at[a]) continue;
				let b = a;
				while (b + 1 < n && L[b + 1].down) b++;
				let x = 0, z = 0;
				for (let k = a; k <= b; k++) (x += L[k].p.x), (z += L[k].p.z);
				const p = new Vector3(x / (b - a + 1), 0, z / (b - a + 1));
				for (let k = a; k <= b; k++) at[k] = p;
			}
			heldCache.set(L, at);
		}
		return heldCache.get(L)[i];
	}
	/** a quarter turn on the spot: the body from the idle turned round by its hips, each foot stepped round by reach */
	const quarter = (way) => (t) => {
		const T = 1.6, u = clamp(t / T, 0, 1);
		const yaw = way * (Math.PI / 2) * smooth(0.1, 0.9, u);
		const c = C.idle;
		const q = {}, h = new Vector3();
		sample(c, t * c.fps, q, h);
		for (const n of Object.keys(hands)) q[n] = hands[n].clone();
		const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
		q.hips = turn.clone().multiply(q.hips ?? I);
		h.applyAxisAngle(new Vector3(0, 1, 0), yaw);
		const legs = {};
		const inner = way > 0 ? 'left' : 'right';
		for (const side of SIDES) {
			// its steps: the inner foot first, then the other, each lifted 6 cm on the way
			const [a, b] = side === inner ? [0.12, 0.55] : [0.45, 0.88];
			const k = smooth(a, b, u);
			const rest = by[`${side}Foot`].at;
			const from = new Vector3(rest[0], ankleRest, rest[2] + 0.02 * s);
			const to = from.clone().applyAxisAngle(new Vector3(0, 1, 0), way * (Math.PI / 2));
			const p = from.clone().lerp(to, k);
			// carried round on an arc, not across
			p.applyAxisAngle(new Vector3(0, 1, 0), 0).setLength(from.length());
			p.y = ankleRest + 0.06 * s * Math.sin(Math.PI * clamp((u - a) / (b - a), 0, 1));
			const Q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), way * (Math.PI / 2) * k);
			legs[side] = { p, Q, down: u <= a || u >= b ? 1 : 0 };
		}
		return out(q, h, legs);
	};
	const clips = {
		idle: timed('idle', { loop: true }),
		walk: move('walk'),
		run: move('run'),
		start: timed('start'),
		stop: timed('stop'),
		'turn left': quarter(1),
		'turn right': quarter(-1),
		'sit down': timed('sit down'),
		sitting: timed('sitting', { loop: true }),
		'stand up': timed('stand up'),
		wave: timed('wave'),
		'pick up': timed('pick up')
	};
	/** how long each clip played once lasts (s) */
	const lengths = Object.fromEntries(['start', 'stop', 'sit down', 'stand up', 'wave', 'pick up'].map((k) => [k, (C[k].n - 1) / C[k].fps]));
	lengths['turn left'] = lengths['turn right'] = 1.6;
	return { clips, gears: { walk: gears.walk, run: gears.run }, lengths, names, stairs: rise ? { origin, going, rise } : null };
}

module.exports = { moves, decode, sample };
