#!/usr/bin/env bun
// Intent b9e6ad45's checks, decided on the CPU from forward kinematics (no GPU): the people as the box poses them and as
// the page draws them, held to the motion capture they were made from.
//   bun tools/motion/check.ts directions|twist|head|idle|gait|wave|skin|page
// Every run first holds the mirror (pieces/, assets/) to proposed.json's hashes: what is checked is what is proposed.
// Each prints its numbers and exits 0 only within its range.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { plugin } from 'bun';

const HERE = new URL('.', import.meta.url).pathname;
const SITE = new URL('../../play/site/src/lib/', import.meta.url).pathname;
// the page's own modules name $lib
plugin({ name: 'lib', setup: (b) => void b.onResolve({ filter: /^\$lib\// }, (a) => ({ path: SITE + a.path.slice(5) })) });
const { THREE, files, piece, asset, run } = await import('./box.mjs');
const { targetFK, LINE, HINGE } = await import('./retarget.mjs');
const { Vector3, Quaternion, Matrix4 } = THREE;

const deg = (r: number) => (r * 180) / Math.PI;
const PEOPLE = ['stand-in', 'elder-woman'];
const SIDES = ['left', 'right'];
let failed = false;
const verdict = (ok: boolean, line: string) => {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`);
	if (!ok) failed = true;
};

// ---- the mirror is what is proposed ----
const proposed = JSON.parse(readFileSync(`${HERE}proposed.json`, 'utf8')).files as Record<string, string>;
for (const [f, h] of Object.entries(proposed)) if (files[f] !== h) verdict(false, `${f} is not the file proposed (${files[f]?.slice(0, 8)} ≠ ${h.slice(0, 8)})`);
for (const f of Object.keys(files)) if (!proposed[f]) verdict(false, `${f} is not in proposed.json`);

// ---- the people as the box poses them ----
const casts: Record<string, any> = Object.fromEntries(PEOPLE.map((p) => [p, asset(p)]));
const SETS: Record<string, string[]> = { 'stand-in': ['clips-man', 'clips-actions'], 'elder-woman': ['clips-elder', 'clips-actions'] };
/** how long each clip of a person runs (s), and how it moves (a gait at its gear) */
function plan(who: string) {
	const cast = casts[who], out: Record<string, { len: number; speed: number }> = {};
	const data: Record<string, any> = Object.assign({}, ...SETS[who].map((s) => piece(s)));
	for (const name of Object.keys(cast.clips)) {
		const c = data[name], speed = cast.gears?.[name] ?? 0;
		out[name] = { len: c ? Math.max(c.frames - 1, 1) / c.fps : 1.6, speed };
	}
	return out;
}
/** a person posed: every bone's world frame (Matrix4) and joint (Vector3), by name */
function posed(who: string, pose: any) {
	const cast = casts[who];
	cast.rig.pose(pose);
	cast.rig.object.updateMatrixWorld(true);
	const M: Record<string, any> = {}, J: Record<string, any> = {};
	for (const [n, b] of Object.entries(cast.rig.bones) as [string, any][]) {
		M[n] = b.matrixWorld.clone();
		J[n] = new Vector3().setFromMatrixPosition(b.matrixWorld);
	}
	return { M, J };
}
/** every frame of every clip of a person as the box plays it (cast.clips[name](t, m)), every `dt` seconds */
function* frames(who: string, only?: string[], dt = 1 / 30) {
	const P = plan(who);
	for (const [name, { len, speed }] of Object.entries(P)) {
		if (only && !only.includes(name)) continue;
		for (let t = 0; t <= len + 1e-9; t += dt) yield { name, t, pose: casts[who].clips[name](t, { dist: speed * t, speed }) };
	}
}
const axis = (m: any, k: number) => new Vector3().setFromMatrixColumn(m, k).normalize();
/** the body's across (its left, level) and forward from the hips' frame */
function body(M: any) {
	const x = axis(M.hips, 0);
	x.y = 0;
	x.normalize();
	return { across: x, fwd: new Vector3().crossVectors(x, new Vector3(0, 1, 0)).negate() };
}

const checks: Record<string, () => void | Promise<void>> = {
	/** c3: every bone's line in every clip against the source's own, within 3°; where a loop joins (its first and last
	 *  fifth, a cycle's or a loop's, over which its seam is spread), within 3.5° */
	directions() {
		for (const set of ['man', 'elder', 'actions']) {
			const data = piece(`clips-${set}`);
			const src = JSON.parse(gunzipSync(readFileSync(`${HERE}sources/${set}.json.gz`)).toString());
			for (const [name, c] of Object.entries(data) as [string, any][]) {
				const s = src[name];
				let worst = 0, at = '', join = 0, jat = '';
				const loop = c.kind === 'cycle' || c.kind === 'loop', fifth = c.frames / 5;
				for (let i = 0; i < c.frames; i++) {
					const joining = loop && (i < fifth || i >= c.frames - fifth);
					const q: Record<string, any> = {};
					for (const [b, L] of Object.entries(c.turns) as [string, number[]][]) {
						const x = L[i * 3] / 1e4, y = L[i * 3 + 1] / 1e4, z = L[i * 3 + 2] / 1e4;
						q[b] = new Quaternion(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z)));
					}
					const { P } = targetFK(q, new Vector3());
					s.bones.forEach((b: string, k: number) => {
						if (s.eased.includes(b)) return;
						const d = s.dirs[i].slice(k * 3, k * 3 + 3);
						const want = new Vector3(d[0], d[1], d[2]).normalize();
						const [f, to] = LINE[b];
						const a = deg(P[to].clone().sub(P[f]).normalize().angleTo(want));
						if (joining) {
							if (a > join) (join = a), (jat = `${b} frame ${i}`);
						} else if (a > worst) (worst = a), (at = `${b} frame ${i}`);
					});
				}
				const eased = s.eased.length ? ` (eased on purpose, an old person's capture made to stand upright: ${s.eased.join(', ')} not held)` : '';
				const joins = loop ? `; where its loop joins ${join.toFixed(2)}° (${jat}; ≤ 3.5°)` : '';
				verdict(worst <= 3 && join <= 3.5, `${set} ${name}: worst bone ${worst.toFixed(2)}° from the source (${at}; ≤ 3°)${joins}${eased}`);
			}
		}
	},
	/** c4: knees bend about their own hinge (≤ 10°), and elbows and fingers about the recorded joint's own axis (≤ 3°).
	 *  A knee's axis is the skeleton's own (retarget.mjs HINGE: the person's left, turned as its rest bends it), fixed in
	 *  the thigh, signed (a knee bent the wrong way round is 180° off), as the box plays the clips, the legs put down by
	 *  the actors' IK. A recorded elbow or finger does not bend about one fixed axis (the forearm rolls, a finger
	 *  spreads): each frame its bend axis (the upper bone's line × the lower's, bent 20° or more) is held to the
	 *  source's own at that frame, from tools/motion/sources. */
	twist() {
		const knees = ['left', 'right'].map((s) => [`${s}UpperLeg`, `${s}LowerLeg`, `${s}Foot`, HINGE[`${s}UpperLeg`][2]]);
		for (const who of PEOPLE) {
			let worst = 0, at = '';
			for (const { name, t, pose } of frames(who)) {
				const { M, J } = posed(who, pose);
				for (const [a, b, c, ax] of knees as any[]) {
					const u = J[b].clone().sub(J[a]), l = J[c].clone().sub(J[b]);
					if (u.angleTo(l) < 0.35) continue;
					const d = deg(ax.clone().transformDirection(M[a]).angleTo(new Vector3().crossVectors(u, l).normalize()));
					if (d > worst) (worst = d), (at = `${b} in ${name} at ${t.toFixed(2)} s`);
				}
			}
			verdict(worst <= 10, `${who} knees: bend ${worst.toFixed(1)}° off their own hinge at worst (${at}; ≤ 10°)`);
		}
		const pairs = Object.entries(HINGE).filter(([a]) => !/Leg/.test(a)).map(([a, [b]]: any) => [a, b]);
		for (const set of ['man', 'elder', 'actions']) {
			const data = piece(`clips-${set}`);
			const src = JSON.parse(gunzipSync(readFileSync(`${HERE}sources/${set}.json.gz`)).toString());
			for (const [name, c] of Object.entries(data) as [string, any][]) {
				const s = src[name], k = Object.fromEntries(s.bones.map((b: string, i: number) => [b, i]));
				let worst = 0, at = '', n = 0;
				for (let i = 0; i < c.frames; i++) {
					const q: Record<string, any> = {};
					for (const [b, L] of Object.entries(c.turns) as [string, number[]][]) {
						const x = L[i * 3] / 1e4, y = L[i * 3 + 1] / 1e4, z = L[i * 3 + 2] / 1e4;
						q[b] = new Quaternion(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z)));
					}
					const { P } = targetFK(q, new Vector3());
					const line = (b: string) => P[LINE[b][1]].clone().sub(P[LINE[b][0]]).normalize();
					const rec = (b: string) => new Vector3(...s.dirs[i].slice(k[b] * 3, k[b] * 3 + 3)).normalize();
					for (const [a, b] of pairs) {
						if (k[a] === undefined || k[b] === undefined) continue;
						const ru = rec(a), rl = rec(b);
						if (ru.angleTo(rl) < 0.35) continue;
						const d = deg(new Vector3().crossVectors(line(a), line(b)).normalize().angleTo(new Vector3().crossVectors(ru, rl).normalize()));
						n++;
						if (d > worst) (worst = d), (at = `${b} frame ${i}`);
					}
				}
				if (n) verdict(worst <= 3, `${set} ${name}: elbows and fingers bend ${worst.toFixed(2)}° off the recorded joint's own axis at worst (${at}; ${n} bends; ≤ 3°)`);
			}
		}
	},
	/** c5: the head faces where the upper chest does in idle and walk: yaw ≤ 10°, sideways tip ≤ 6° */
	head() {
		for (const who of PEOPLE) {
			let yaw = 0, tip = 0;
			for (const { pose } of frames(who, ['idle', 'walk'])) {
				const { M } = posed(who, pose);
				const rel = new Quaternion().setFromRotationMatrix(M.upperChest).invert().multiply(new Quaternion().setFromRotationMatrix(M.head));
				const f = new Vector3(0, 0, 1).applyQuaternion(rel), l = new Vector3(1, 0, 0).applyQuaternion(rel);
				yaw = Math.max(yaw, Math.abs(deg(Math.atan2(f.x, f.z))));
				tip = Math.max(tip, Math.abs(deg(Math.asin(Math.max(-1, Math.min(1, l.y))))));
			}
			verdict(yaw <= 10 && tip <= 6, `${who}: head turned at most ${yaw.toFixed(1)}° and tipped at most ${tip.toFixed(1)}° from the upper chest (idle, walk)`);
		}
	},
	/** c6: the idle upright, the shoulders over the pelvis */
	idle() {
		const want: Record<string, [number, number, number]> = { 'stand-in': [0, 5, 0.04], 'elder-woman': [3, 10, 0.08] };
		for (const who of PEOPLE) {
			let lean = 0, least = 90, off = 0;
			for (const { pose } of frames(who, ['idle'])) {
				const { J } = posed(who, pose);
				const a = deg(J.neck.clone().sub(J.hips).angleTo(new Vector3(0, 1, 0)));
				lean = Math.max(lean, a);
				least = Math.min(least, a);
				const sh = J.leftUpperArm.clone().add(J.rightUpperArm).multiplyScalar(0.5).sub(J.hips);
				off = Math.max(off, Math.hypot(sh.x, sh.z));
			}
			const [lo, hi, most] = want[who];
			verdict(least >= lo && lean <= hi && off <= most, `${who} idle: the back ${least.toFixed(1)}–${lean.toFixed(1)}° from vertical (${lo}–${hi}°), the shoulders at most ${(off * 100).toFixed(1)} cm from over the hips (≤ ${most * 100} cm)`);
		}
	},
	/** c7: knees apart, each foot on its own side through walk, run, start and stop: no more than 1 cm past the line
	 *  walking, 2 cm running (a runner lands near it); as the box plays the clips and as the page plays them back */
	async gait() {
		const { motionOf } = await import(`${SITE}content/assets/box/clips.js`);
		const { playerOf } = await import(`${SITE}content/assets/clips.js`);
		for (const who of PEOPLE) {
			const cast = casts[who];
			const page = playerOf(motionOf(cast, 1.7), cast.rig.names);
			for (const [where, play] of [['box', (n: string, t: number, m: any) => cast.clips[n](t, m)], ['page', (n: string, t: number, m: any) => page[n](t, m)]] as const) {
				let gap = 9, cross = -9, run = -9, at = '';
				for (const { name, t } of frames(who, ['walk', 'run', 'start', 'stop'])) {
					const P = plan(who)[name];
					const { J } = posed(who, play(name, t, { dist: P.speed * t, speed: P.speed }));
					// every clip is settled to go along +z: the centre line is the path under the hips, across it x (the
					// pelvis' own yaw, a few degrees each step, is not the path's)
					const across = new Vector3(1, 0, 0);
					const g = J.leftLowerLeg.clone().sub(J.rightLowerLeg).dot(across);
					if (g < gap) (gap = g), (at = `${name} at ${t.toFixed(2)} s`);
					const x = Math.max(-J.leftFoot.clone().sub(J.hips).dot(across), J.rightFoot.clone().sub(J.hips).dot(across));
					if (name === 'run') run = Math.max(run, x);
					else cross = Math.max(cross, x);
				}
				verdict(gap >= 0.12 && cross <= 0.01 && run <= 0.02, `${who} (${where}): knees at least ${(gap * 100).toFixed(1)} cm apart (${at}); a foot at most ${(cross * 100).toFixed(1)} cm past the centre line walking (≤ 1 cm), ${(run * 100).toFixed(1)} cm running (≤ 2 cm)`);
			}
		}
	},
	/** c8: the wave's hand above its shoulder, as the box plays it and as the page plays it back */
	async wave() {
		const { motionOf } = await import(`${SITE}content/assets/box/clips.js`);
		const { playerOf } = await import(`${SITE}content/assets/clips.js`);
		for (const who of PEOPLE) {
			const cast = casts[who];
			const page = playerOf(motionOf({ ...cast, clips: { wave: cast.clips.wave } }, 1.7), cast.rig.names).wave;
			const { len } = plan(who).wave;
			const peak = (play: (t: number) => any) => {
				let most = -9;
				for (let t = 0; t <= len; t += 1 / 30) {
					const { J } = posed(who, play(t));
					for (const s of SIDES) most = Math.max(most, J[`${s}Hand`].y - J[`${s}UpperArm`].y);
				}
				return most;
			};
			const box = peak((t) => cast.clips.wave(t)), drawn = peak((t) => page(t));
			verdict(box >= 0.15 && drawn >= 0.15, `${who} wave: the hand peaks ${(box * 100).toFixed(1)} cm above its shoulder in the box, ${(drawn * 100).toFixed(1)} cm as the page plays it`);
		}
	},
	/** c9: the skin's girth at the shoulder and the elbow within 85–115% of its rest through every clip */
	skin() {
		for (const who of PEOPLE) {
			const cast = casts[who];
			let mesh: any;
			cast.rig.object.traverse((o: any) => o.isSkinnedMesh && (mesh = o));
			const sk = mesh.skeleton, g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
			const names = sk.bones.map((b: any) => b.name);
			const rest = posed(who, {});
			// the rings: vertices riding an arm's bones, 3–5 cm down the upper arm from the shoulder joint; within 1.5 cm of
			// the elbow along the upper arm
			const rings: { side: string; at: string; verts: number[] }[] = [];
			const v = new Vector3();
			for (const s of SIDES) {
				const own = new Set([`${s}Shoulder`, `${s}UpperArm`, `${s}LowerArm`].map((n) => names.indexOf(n)));
				const A = rest.J[`${s}UpperArm`], B = rest.J[`${s}LowerArm`], d = B.clone().sub(A).normalize();
				const sh: number[] = [], el: number[] = [];
				for (let k = 0; k < pos.count; k++) {
					let top = -1, w = 0;
					for (let c = 0; c < 4; c++) if (sw.getComponent(k, c) > w) (w = sw.getComponent(k, c)), (top = si.getComponent(k, c));
					if (!own.has(top)) continue;
					v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld);
					const along = v.clone().sub(A).dot(d);
					if (along >= 0.03 && along <= 0.05) sh.push(k);
					if (Math.abs(v.clone().sub(B).dot(d)) <= 0.015) el.push(k);
				}
				rings.push({ side: s, at: 'shoulder', verts: sh }, { side: s, at: 'elbow', verts: el });
			}
			const skinned = (k: number, B: any[]) => {
				// dual quaternions, as dqs.ts blends them
				const r = [0, 0, 0, 0], du = [0, 0, 0, 0], q = new Quaternion(), tr = new Vector3(), sc = new Vector3();
				let first: any = null;
				for (let c = 0; c < 4; c++) {
					const w = sw.getComponent(k, c);
					if (w <= 0) continue;
					B[si.getComponent(k, c)].decompose(tr, q, sc);
					first ??= q.clone();
					const kk = q.dot(first) < 0 ? -w : w;
					const dd = [0.5 * (tr.x * q.w + tr.y * q.z - tr.z * q.y), 0.5 * (tr.y * q.w + tr.z * q.x - tr.x * q.z), 0.5 * (tr.z * q.w + tr.x * q.y - tr.y * q.x), -0.5 * (tr.x * q.x + tr.y * q.y + tr.z * q.z)];
					r[0] += kk * q.x, r[1] += kk * q.y, r[2] += kk * q.z, r[3] += kk * q.w;
					for (let i = 0; i < 4; i++) du[i] += kk * dd[i];
				}
				const L = Math.hypot(...r);
				const R = r.map((x) => x / L), D = du.map((x) => x / L);
				const mv = new Vector3(2 * (R[3] * D[0] - D[3] * R[0] + (R[1] * D[2] - R[2] * D[1])), 2 * (R[3] * D[1] - D[3] * R[1] + (R[2] * D[0] - R[0] * D[2])), 2 * (R[3] * D[2] - D[3] * R[2] + (R[0] * D[1] - R[1] * D[0])));
				return v.fromBufferAttribute(pos, k).applyMatrix4(mesh.bindMatrix).applyQuaternion(new Quaternion(R[0], R[1], R[2], R[3])).add(mv).applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld).clone();
			};
			const girth = (ring: any, J: any) => {
				sk.update();
				const B = sk.bones.map((b: any, i: number) => new Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
				const A = J[`${ring.side}UpperArm`], E = J[`${ring.side}LowerArm`], d = E.clone().sub(A).normalize();
				let sum = 0;
				for (const k of ring.verts) {
					const p = skinned(k, B);
					// the shoulder's ring round the upper arm's line; the elbow's round the joint
					sum += ring.at === 'shoulder' ? p.clone().sub(A).cross(d).length() : p.distanceTo(E);
				}
				return sum / ring.verts.length;
			};
			posed(who, {});
			const base = rings.map((r) => girth(r, rest.J));
			const worst = rings.map(() => [1, '']) as [number, string][];
			for (const { name, t, pose } of frames(who, undefined, 1 / 15)) {
				const { J } = posed(who, pose);
				rings.forEach((r, i) => {
					const k = girth(r, J) / base[i];
					if (Math.abs(k - 1) > Math.abs(worst[i][0] - 1)) worst[i] = [k, `${name} at ${t.toFixed(2)} s`];
				});
			}
			rings.forEach((r, i) => verdict(worst[i][0] >= 0.85 && worst[i][0] <= 1.15, `${who} ${r.side} ${r.at}: girth ${(worst[i][0] * 100).toFixed(1)}% of rest at worst (${worst[i][1]}; ${r.verts.length} vertices)`));
		}
	},
	/** c10: the page's playback and its rebuilt skin follow the box's */
	async page() {
		const { motionOf } = await import(`${SITE}content/assets/box/clips.js`);
		const { playerOf } = await import(`${SITE}content/assets/clips.js`);
		const { serialize } = await import(`${SITE}content/assets/box/serialize.js`);
		const { rebuild } = await import(`${SITE}content/assets/box/rebuild.js`);
		const { trsOf } = await import(`${SITE}content/assets/box/bake.js`);
		for (const who of PEOPLE) {
			const cast = casts[who];
			const names = Object.keys(cast.rig.bones);
			const tables = playerOf(motionOf(cast, 1.7), cast.rig.names);
			let worst = 0, at = '';
			for (const { name, t, pose } of frames(who, undefined, 1 / 10)) {
				const P = plan(who)[name];
				const a = posed(who, pose).J;
				const b = posed(who, tables[name](t, { dist: P.speed * t, speed: P.speed })).J;
				for (const n of names) {
					const d = a[n].distanceTo(b[n]);
					if (d > worst) (worst = d), (at = `${n} in ${name} at ${t.toFixed(2)} s`);
				}
			}
			verdict(worst <= 0.03, `${who}: the page's playback within ${(worst * 100).toFixed(2)} cm of the box's poses (${at})`);
			// the box's scene, serialized and rebuilt as the page does, its nodes put where the box's are, skinned
			const root = new THREE.Group();
			root.add(cast.rig.object);
			posed(who, {});
			const { data } = await serialize(root, {});
			const drawn = rebuild(data);
			const ours: any[] = [], theirs: any[] = [];
			root.traverse((o: any) => ours.push(o));
			drawn.traverse((o: any) => theirs.push(o));
			let skinOff = 0;
			const T = new Float32Array(10);
			for (const clip of ['idle', 'walk', 'wave', 'sit down']) {
				const P = plan(who)[clip];
				posed(who, cast.clips[clip](P.len / 2, { dist: (P.speed * P.len) / 2, speed: P.speed }));
				ours.forEach((o, i) => {
					trsOf(o, T, 0);
					const p = theirs[i];
					p.position.set(T[0], T[1], T[2]);
					p.quaternion.set(T[3], T[4], T[5], T[6]).normalize();
					p.scale.set(T[7], T[8], T[9]);
				});
				root.updateMatrixWorld(true);
				drawn.updateMatrixWorld(true);
				const skin = (r: any) => {
					let m: any;
					r.traverse((o: any) => o.isSkinnedMesh && (m = o));
					m.skeleton.update();
					const out = new Vector3(), list: any[] = [];
					for (let k = 0; k < m.geometry.attributes.position.count; k += 7) list.push(m.getVertexPosition(k, out).clone().applyMatrix4(m.matrixWorld));
					return list;
				};
				const A = skin(root), B = skin(drawn);
				A.forEach((p, k) => (skinOff = Math.max(skinOff, p.distanceTo(B[k]))));
			}
			root.remove(cast.rig.object);
			verdict(ours.length === theirs.length && skinOff <= 0.005, `${who}: the page's rebuilt skin within ${(skinOff * 100).toFixed(3)} cm of the box's (${theirs.length} nodes)`);
		}
	}
};

const which = process.argv[2];
if (!checks[which]) {
	console.error(`which check? ${Object.keys(checks).join(', ')}`);
	process.exit(2);
}
await checks[which]();
process.exit(failed ? 1 : 0);
