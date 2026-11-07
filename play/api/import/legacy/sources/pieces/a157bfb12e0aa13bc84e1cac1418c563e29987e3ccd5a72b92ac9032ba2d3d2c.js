function machineKit(assemblies) {
	/** @type {PartInfo[]} */
	const infos = [];
	/** @type {Map<string, { info: PartInfo, joint: string, pieces: { geo: THREE.BufferGeometry, color: string, mat?: number }[] }>} */
	const byId = /* @__PURE__ */ new Map();
	const out = Object.fromEntries(assemblies.map((a) => [a.id, a.out]));
	return {
		/**
		* A part: its card, the joint it moves with, and its pieces (made by `make`, through `put`).
		* @param {Omit<PartInfo, 'step'> & { step: number }} info
		* @param {string} joint
		* @param {(put: (geo: THREE.BufferGeometry, color: string, mat?: number) => void) => void} make
		*/
		part(info, joint, make) {
			if (byId.has(info.id)) throw new Error(`part ${info.id} twice`);
			if (!(info.assembly in out)) throw new Error(`part ${info.id}: no assembly ${info.assembly}`);
			/** @type {{ geo: THREE.BufferGeometry, color: string, mat?: number }[]} */
			const pieces = [];
			make((geo, color, mat) => void pieces.push({
				geo,
				color,
				...mat ? { mat } : {}
			}));
			byId.set(info.id, {
				info,
				joint,
				pieces
			});
			infos.push(info);
		},
		/**
		* The parts' bones (to go after the joints they hang from) and pieces, and how to pose them.
		* @returns {{ bones: BoneSpec[], pieces: Piece[], catalogParts: PartInfo[], centre: Record<string, V3> }}
		*/
		build() {
			/** @type {BoneSpec[]} */
			const bones = [];
			/** @type {Piece[]} */
			const pieces = [];
			/** @type {Record<string, V3>} */
			const centre = {};
			const box = new three.Box3(), b = new three.Box3(), c = new three.Vector3();
			for (const [id, { joint, pieces: ps }] of byId) {
				box.makeEmpty();
				for (const p of ps) {
					p.geo.computeBoundingBox();
					box.union(b.copy(p.geo.boundingBox));
				}
				const at = box.getCenter(c).toArray();
				centre[id] = at;
				const bone = `p.${id}`;
				bones.push({
					name: bone,
					parent: joint,
					at
				});
				for (const p of ps) pieces.push({
					geo: p.geo,
					color: p.color,
					bone,
					part: id,
					...p.mat ? { mat: p.mat } : {}
				});
			}
			return {
				bones,
				pieces,
				catalogParts: infos,
				centre
			};
		},
		/**
		* Every part drawn out of the machine by `k` (0: in place, 1: the exploded view): its assembly's way out, and
		* apart from the assembly's middle a little, so the parts of one assembly stand clear of each other too.
		* @param {Record<string, V3>} centre @param {number} k @param {Pose} [into]
		*/
		explode(centre, k, into = {}) {
			/** @type {Record<string, THREE.Vector3>} */
			const mid = {};
			/** @type {Record<string, number>} */
			const n = {};
			for (const { info } of byId.values()) {
				const a = info.assembly;
				(mid[a] ??= new three.Vector3()).add(pc.set(...centre[info.id]));
				n[a] = (n[a] ?? 0) + 1;
			}
			for (const a in mid) mid[a].divideScalar(n[a]);
			for (const { info } of byId.values()) {
				const o = out[info.assembly], m = mid[info.assembly];
				const [x, y, z] = centre[info.id];
				into[`p.${info.id}`] = [
					0,
					0,
					0,
					1,
					k * (o[0] + (x - m.x) * .45),
					k * (o[1] + (y - m.y) * .45),
					k * (o[2] + (z - m.z) * .45)
				];
			}
			return into;
		},
		/**
		* The machine being built, `u` of the way (0…1) through its steps: the parts of each step fly in from above
		* their place, one after another, and the parts of the steps to come are not there yet.
		* @param {Record<string, V3>} centre @param {number} u @param {number} steps @param {Pose} [into]
		*/
		assemble(centre, u, steps, into = {}) {
			const key = (info) => info.unit ?? info.id;
			/** @type {Record<number, string[]>} */
			const per = {};
			for (const info of infos) {
				const list = per[info.step] ??= [];
				if (!list.includes(key(info))) list.push(key(info));
			}
			for (const info of infos) {
				const list = per[info.step], i = list.indexOf(key(info));
				const s0 = (info.step - 1) / steps, s1 = info.step / steps;
				const t0 = s0 + (s1 - s0) * .66 * i / Math.max(1, list.length);
				const t1 = t0 + (info.unit ? (s1 - s0) * .5 : Math.min(.03, (s1 - s0) * .5));
				const k = Math.min(1, Math.max(0, (u - t0) / (t1 - t0)));
				const e = k * k * (3 - 2 * k);
				const o = out[info.assembly];
				const far = 1 - e;
				into[`p.${info.id}`] = u < t0 ? [
					0,
					0,
					0,
					0
				] : [
					0,
					0,
					0,
					1,
					far * o[0] * .6,
					far * (1.6 + Math.abs(o[1])),
					far * o[2] * .6
				];
			}
			return into;
		}
	};
}
const pc = /* @__PURE__ */ (() => new three.Vector3())();

//#endregion
