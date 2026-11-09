// Reading motion capture: BVH (100STYLE, ACCAD) and glTF (Quaternius UAL) into one shape, and forward kinematics.
// A source: { name, fps, joints: [{ name, parent (index or -1), offset: Vector3 (cm or m as given), rest: Quaternion }],
//             frames: [{ root: Vector3, q: Quaternion[] (local, per joint) }], unit (metres per source unit) }
import { readFileSync } from 'node:fs';
import { siteRequire } from '../site.cjs';
export const THREE = siteRequire('three');
const { Vector3, Quaternion, Euler } = THREE;

export function readBVH(file, unit = 0.01) {
	const text = readFileSync(file, 'utf8');
	const tok = text.split(/\s+/).filter(Boolean);
	let i = 0;
	const joints = [];
	const chans = []; // per joint: list of channel names
	const stack = [];
	while (tok[i] !== 'MOTION') {
		const t = tok[i++];
		if (t === 'ROOT' || t === 'JOINT') {
			const name = tok[i++];
			joints.push({ name, parent: stack.length ? stack[stack.length - 1] : -1, offset: new Vector3(), rest: new Quaternion() });
			chans.push([]);
			stack.push(joints.length - 1);
		} else if (t === 'End') {
			i++; // Site
			stack.push(-2);
		} else if (t === 'OFFSET') {
			const v = new Vector3(+tok[i], +tok[i + 1], +tok[i + 2]);
			i += 3;
			const top = stack[stack.length - 1];
			if (top >= 0) joints[top].offset.copy(v);
			else {
				const p = stack[stack.length - 2];
				joints[p].tip = v;
			}
		} else if (t === 'CHANNELS') {
			const n = +tok[i++];
			const top = stack[stack.length - 1];
			chans[top] = tok.slice(i, i + n);
			i += n;
		} else if (t === '}') stack.pop();
	}
	i++; // MOTION
	i++; // Frames:
	const n = +tok[i++];
	i += 2; // Frame Time:
	const dt = +tok[i++];
	const frames = [];
	const e = new Euler();
	for (let f = 0; f < n; f++) {
		const q = [];
		let root = new Vector3();
		for (let j = 0; j < joints.length; j++) {
			const c = chans[j];
			const quat = new Quaternion();
			for (const ch of c) {
				const v = +tok[i++];
				if (ch === 'Xposition') root.x = v;
				else if (ch === 'Yposition') root.y = v;
				else if (ch === 'Zposition') root.z = v;
				else {
					const axis = ch[0] === 'X' ? new Vector3(1, 0, 0) : ch[0] === 'Y' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
					quat.multiply(new Quaternion().setFromAxisAngle(axis, (v * Math.PI) / 180));
				}
			}
			q.push(quat);
		}
		frames.push({ root, q });
	}
	// a BVH root's position channels replace its offset
	return { name: file.split('/').pop(), fps: 1 / dt, joints, frames, unit };
}

/** a glb's skinned skeleton and one animation of it */
export function readGLB(file, anim) {
	const b = readFileSync(file);
	const jl = b.readUInt32LE(12);
	const j = JSON.parse(b.slice(20, 20 + jl).toString());
	const binStart = 20 + jl + 8;
	const acc = (k) => {
		const a = j.accessors[k], bv = j.bufferViews[a.bufferView];
		const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
		const off = binStart + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
		return new Float32Array(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + a.count * n * 4));
	};
	const skin = j.skins[0];
	const ids = skin.joints;
	const index = new Map(ids.map((n, k) => [n, k]));
	const parentOf = new Map();
	j.nodes.forEach((nd, k) => (nd.children ?? []).forEach((c) => parentOf.set(c, k)));
	const joints = ids.map((n) => {
		const nd = j.nodes[n];
		return { name: nd.name, parent: index.has(parentOf.get(n)) ? index.get(parentOf.get(n)) : -1, offset: new Vector3(...(nd.translation ?? [0, 0, 0])), rest: new Quaternion(...(nd.rotation ?? [0, 0, 0, 1])) };
	});
	// the root's own parents (an armature node turned or scaled) as one transform over it
	let top = ids[0], pre = new THREE.Matrix4();
	const chain = [];
	for (let p = parentOf.get(top); p !== undefined; p = parentOf.get(p)) chain.unshift(p);
	for (const p of chain) {
		const nd = j.nodes[p];
		pre.multiply(new THREE.Matrix4().compose(new Vector3(...(nd.translation ?? [0, 0, 0])), new Quaternion(...(nd.rotation ?? [0, 0, 0, 1])), new Vector3(...(nd.scale ?? [1, 1, 1]))));
	}
	const A = j.animations.find((a) => a.name === anim);
	if (!A) throw new Error(`no animation ${anim}`);
	const tracks = A.channels.map((c) => ({ node: c.target.node, path: c.target.path, input: acc(A.samplers[c.sampler].input), output: acc(A.samplers[c.sampler].output) }));
	const end = Math.max(...tracks.map((t) => t.input[t.input.length - 1]));
	const fps = 30;
	const n = Math.round(end * fps) + 1;
	const sample = (t, time, k) => {
		const I = t.input;
		let a = 0;
		while (a < I.length - 2 && I[a + 1] <= time) a++;
		const u = I.length < 2 ? 0 : Math.max(0, Math.min(1, (time - I[a]) / (I[a + 1] - I[a] || 1)));
		const O = t.output;
		if (k === 4) {
			const q0 = new Quaternion(...O.slice(a * 4, a * 4 + 4)), q1 = new Quaternion(...O.slice(Math.min(a + 1, I.length - 1) * 4, Math.min(a + 1, I.length - 1) * 4 + 4));
			return q0.slerp(q1, u);
		}
		const v0 = new Vector3(...O.slice(a * 3, a * 3 + 3)), v1 = new Vector3(...O.slice(Math.min(a + 1, I.length - 1) * 3, Math.min(a + 1, I.length - 1) * 3 + 3));
		return v0.lerp(v1, u);
	};
	const frames = [];
	for (let f = 0; f < n; f++) {
		const time = f / fps;
		const q = joints.map((jt) => jt.rest.clone());
		const tr = joints.map((jt) => jt.offset.clone());
		for (const t of tracks) {
			if (!index.has(t.node)) continue;
			const k = index.get(t.node);
			if (t.path === 'rotation') q[k] = sample(t, time, 4);
			else if (t.path === 'translation') tr[k] = sample(t, time, 3);
		}
		frames.push({ root: tr[0], q, tr });
	}
	return { name: anim, fps, joints, frames, unit: 1, pre, gltf: true };
}

/** world positions and rotations of every joint in a frame (metres, the source's own axes); BVH rest rotations are
 *  identity, glTF's are the nodes' own */
export function fk(src, frame, out) {
	const J = src.joints;
	out ??= { p: J.map(() => new Vector3()), q: J.map(() => new Quaternion()) };
	const preQ = new Quaternion(), preP = new Vector3(), preS = new Vector3();
	if (src.pre) src.pre.decompose(preP, preQ, preS);
	const s = src.unit * (src.pre ? preS.x : 1);
	for (let j = 0; j < J.length; j++) {
		const jt = J[j];
		const local = frame.q[j];
		const off = j === 0 ? frame.root : frame.tr ? frame.tr[j] : jt.offset;
		if (jt.parent < 0) {
			out.q[j].copy(preQ).multiply(local);
			out.p[j].copy(off).multiplyScalar(s).applyQuaternion(preQ).add(preP);
		} else {
			out.p[j].copy(off).multiplyScalar(s).applyQuaternion(out.q[jt.parent]).add(out.p[jt.parent]);
			out.q[j].copy(out.q[jt.parent]).multiply(local);
		}
	}
	return out;
}

export const jointIndex = (src, name) => {
	const k = src.joints.findIndex((j) => j.name === name);
	if (k < 0) throw new Error(`${src.name}: no joint ${name}`);
	return k;
};
