/** @typedef {[number, number, number]} V3 */
/** @typedef {import('$lib/actors/parts.js').Assembly} Assembly */
/** @typedef {import('$lib/actors/parts.js').PartInfo} PartInfo */
/**
* @typedef {object} How how a part is shown (AirSup's `lab.add` options)
* @property {V3} [explode] which way and how far it moves out in the exploded view (m, in its parent's frame); without
*   it, its assembly's `out` and its distance from the assembly's middle
* @property {number} [delay] 0…1: how late it starts out of the machine (a stagger; without it, spread by its order)
* @property {'shell'} [xray] a shell the x-ray looks through (a casing, a tank wall, a cover)
* @property {{ text?: string, at?: V3, value?: () => string, side?: 'left' | 'right' }} [tag] a label pinned on it: its
*   leader line ends at `at` (in the part's frame), `value` is a live reading under it
*/
/**
* @typedef {object} Part a part as its asset keeps it
* @property {THREE.Object3D} obj
* @property {PartInfo} info
* @property {THREE.Vector3} base where it rests (in its parent's frame)
* @property {THREE.Vector3 | null} off its way out in the exploded view
* @property {number} delay
* @property {number} order
* @property {boolean} [unit] a whole carried asset moving as one (not in the catalog)
*/
/**
* @typedef {object} Label
* @property {THREE.Object3D} obj
* @property {THREE.Vector3} at
* @property {string} text
* @property {(() => string) | undefined} value
* @property {'left' | 'right' | undefined} side
*/
/**
* @typedef {object} Control a slider a viewer shows for a machine's solver (AirSup's `lab.slider`)
* @property {string} label
* @property {number} min
* @property {number} max
* @property {number} value what it is set to now (the solver reads it every tick)
* @property {number} [step]
* @property {string} [unit]
* @property {number} [digits]
* @property {[string, string]} [ends] what its two ends mean
*/
/**
* @typedef {object} Move one of a machine's own moves (what a hand does with it, or what it does): a loop over its
*   controls, played while chosen, by the clock on the wall (Slow slows it, Pause holds it). The viewer's other moves are
*   the stage's own: Run (its solver at the sliders) and Assemble (its parts in by their build steps).
* @property {string} label
* @property {number} seconds one loop
* @property {(u: number) => Record<string, number>} at the controls it sets, `u` 0…1 through the loop
* @property {string} [note] what it shows, in a few words
*/
/**
* @typedef {object} Lab what a machine with a solver shows besides its parts (AirSup's hero, sliders, how and break)
* @property {{ label: string, unit: string, max: number, digits?: number }} hero the one number a viewer cares about
* @property {{ value: number, state: string, sub: string, bad: boolean }} read the hero as the solver last set it
* @property {Record<string, Control>} controls
* @property {Record<string, Move>} [moves] its own moves, by id (a slider a move sets follows it)
* @property {{ text: string, eqs: string[] }} [how] how it is computed: plain words and the equations
* @property {{ label: string, run: (env: Env) => void, reset: (env: Env) => void }} [breakIt] what breaks, decided by the solver
* @property {{ a: V3, b?: V3, center?: V3, reach?: number, offset?: number }} [cut] the section planes (normals pointing
*   at what is cut away, in the asset's frame) and where they sweep from
*/
/** @typedef {{ broken: boolean, time: number, slow: number, cut: number, xray: number }} Env how the asset is being shown, for its solver */
/**
* The kit an asset is built with.
* @param {THREE.Object3D} root
* @param {{ assemblies?: Assembly[], steps?: string[], sources?: { label: string, url: string }[] }} [o]
*/
function assetKit(root, { assemblies = [], steps = [], sources = [] } = {}) {
	/** @type {Part[]} */
	const parts = [];
	/** @type {Label[]} */
	const labels = [];
	/** @type {THREE.Mesh[]} */
	const shells = [];
	/** @type {((dt: number, env: Env) => void)[]} */
	const tickers = [];
	/** @type {Assembly[]} */
	const asms = [...assemblies];
	const ids = /* @__PURE__ */ new Set();
	/** @param {THREE.Object3D} obj @param {PartInfo} info @param {How} o @param {boolean} [unit] */
	const keep = (obj, info, o, unit = false) => {
		/** @type {Part} */
		const p = {
			obj,
			info,
			base: obj.position.clone(),
			off: o.explode ? new three.Vector3(...o.explode) : null,
			delay: o.delay ?? parts.length * .618 % 1 * .3,
			order: parts.length,
			...unit ? { unit } : {}
		};
		parts.push(p);
		if (unit) return p;
		obj.userData.part = info.id;
		if (o.xray === "shell") obj.traverse((m) => m.isMesh && shells.push(m));
		if (o.tag) labels.push({
			obj,
			at: new three.Vector3(...o.tag.at ?? [
				0,
				0,
				0
			]),
			text: o.tag.text ?? info.label,
			value: o.tag.value,
			side: o.tag.side
		});
		return p;
	};
	return {
		root,
		/**
		* A part: `obj` holding its meshes, placed where it sits, added to `parent` (the root, or a part it moves with),
		* its card and how it is shown.
		* @param {THREE.Object3D} obj
		* @param {Omit<PartInfo, 'step'> & { step?: number }} info
		* @param {How} [o]
		* @param {THREE.Object3D} [parent]
		*/
		part(obj, info, o = {}, parent = root) {
			if (ids.has(info.id)) throw new Error(`part ${info.id} twice`);
			if (!asms.some((a) => a.id === info.assembly)) throw new Error(`part ${info.id}: no assembly ${info.assembly}`);
			ids.add(info.id);
			if (obj.parent !== parent) parent.add(obj);
			obj.name ||= info.id;
			obj.traverse((m) => {
				if (m.isMesh) m.castShadow = m.receiveShadow = true;
			});
			keep(obj, {
				...info,
				step: info.step ?? asms.findIndex((a) => a.id === info.assembly) + 1
			}, o);
			return obj;
		},
		/**
		* A mesh for a part to hold, placed in the part's frame.
		* @param {THREE.BufferGeometry} geo @param {THREE.Material} material
		* @param {{ pos?: V3, rot?: V3, to?: THREE.Object3D }} [o]
		*/
		mesh(geo, material, { pos, rot, to } = {}) {
			const m = new three.Mesh(geo, material);
			if (pos) m.position.set(...pos);
			if (rot) m.rotation.set(...rot);
			m.castShadow = m.receiveShadow = true;
			to?.add(m);
			return m;
		},
		/** a label pinned on any object of the asset (not only a part) @param {THREE.Object3D} obj @param {string} text @param {{ at?: V3, value?: () => string, side?: 'left' | 'right' }} [o] */
		label(obj, text, o = {}) {
			labels.push({
				obj,
				at: new three.Vector3(...o.at ?? [
					0,
					0,
					0
				]),
				text,
				value: o.value,
				side: o.side
			});
		},
		/** run every frame the asset is shown or played: its solver and its moving parts @param {(dt: number, env: Env) => void} f */
		onTick(f) {
			tickers.push(f);
		},
		/** move a part's resting place (a part a solver slides), so the exploded view still starts from it @param {THREE.Object3D} obj @param {V3} at */
		place(obj, at) {
			const p = parts.find((q) => q.obj === obj);
			if (p) p.base.set(...at);
			else obj.position.set(...at);
		},
		/**
		* Carry another asset: it hangs from `parent` at `at`, turned by `rot`. A guest sealed by its own kit brings
		* its parts, labels, shells and solver, which become this asset's: its parts keep their cards under `prefix`;
		* they go into the host's assembly `assembly` (made from `asm` if the host has none of that id), else keep the
		* guest's own assemblies (prefixed). In the exploded view the whole guest first moves out by `explode`, then its
		* parts apart. Any other object (a thing, a rigged kind, a plant) is carried whole, as one part with its own
		* `card`. `ref` names the asset at its version (`machines/powercube@3`; an object made by `objectAt` knows its
		* own): every part that came with it says so on its card.
		* @param {THREE.Object3D} guest
		* @param {{ at?: V3, rot?: V3, parent?: THREE.Object3D, prefix?: string, assembly?: string, asm?: Assembly, step?: number, explode?: V3, unit?: string, ref?: string, card?: Partial<PartInfo> }} [o]
		*/
		carry(guest, { at = [
			0,
			0,
			0
		], rot, parent = root, prefix = `${guest.name || "guest"}-`, assembly, asm, step, explode, unit, ref = guest.userData.ref, card = {} } = {}) {
			const g = guest.userData.asset;
			guest.position.set(...at);
			if (rot) guest.rotation.set(...rot);
			parent.add(guest);
			const from = ref ? { ref } : {};
			if (!g) {
				const id = card.id ?? prefix.replace(/-$/, "");
				if (ids.has(id)) throw new Error(`part ${id} twice`);
				const a = assembly ?? id;
				if (!asms.some((x) => x.id === a)) asms.push({
					label: guest.name || id,
					note: "",
					out: explode ?? [
						0,
						.4,
						0
					],
					...asm,
					id: a
				});
				ids.add(id);
				guest.traverse((m) => {
					if (m.isMesh) m.castShadow = m.receiveShadow = true;
				});
				keep(guest, {
					label: guest.name || id,
					what: "",
					...card,
					...from,
					id,
					assembly: a,
					step: step ?? card.step ?? asms.findIndex((x) => x.id === a) + 1
				}, {
					explode,
					delay: 0
				});
				return guest;
			}
			if (assembly && asm && !asms.some((a) => a.id === assembly)) asms.push({
				...asm,
				id: assembly
			});
			if (!assembly) for (const a of g.catalog.assemblies) asms.push({
				...a,
				id: prefix + a.id,
				label: `${guest.name}: ${a.label}`
			});
			if (explode) keep(guest, {
				id: `${prefix}unit`,
				label: guest.name,
				assembly: assembly ?? "",
				what: "",
				step: step ?? 1,
				...from
			}, {
				explode,
				delay: 0
			}, true);
			for (const p of g.parts) {
				if (p.unit) continue;
				const id = prefix + p.info.id;
				ids.add(id);
				p.obj.userData.part = id;
				parts.push({
					...p,
					info: {
						...from,
						...p.info,
						id,
						assembly: assembly ?? prefix + p.info.assembly,
						step: step ?? p.info.step,
						...unit ? { unit } : {}
					},
					order: parts.length
				});
			}
			labels.push(...g.labels);
			shells.push(...g.shells);
			tickers.push((dt, env) => g.tick(dt, env));
			return guest;
		},
		/**
		* Finish the asset: its parts' ways out, its catalog, and the handles every viewer uses, written on the root.
		* @param {{ lab?: Lab, cut?: Lab['cut'], play?: string, seconds?: number }} [o]
		* @returns {SealedAsset}
		*/
		seal({ lab, cut, play = "Build it", seconds = 12 } = {}) {
			root.updateMatrixWorld(true);
			const sz = new three.Box3().setFromObject(root).getSize(new three.Vector3());
			const size = Math.max(sz.x, sz.y, sz.z);
			const toRoot = new three.Matrix4().copy(root.matrixWorld).invert();
			const centre = new Map(parts.map((p) => [p, new three.Box3().setFromObject(p.obj).getCenter(new three.Vector3()).applyMatrix4(toRoot)]));
			/** @type {Map<string, THREE.Vector3>} */
			const mid = /* @__PURE__ */ new Map();
			for (const a of asms) {
				const list = parts.filter((p) => !p.unit && p.info.assembly === a.id);
				if (list.length) mid.set(a.id, list.reduce((s, p) => s.add(centre.get(p)), new three.Vector3()).divideScalar(list.length));
			}
			const q = new three.Quaternion(), qr = new three.Quaternion();
			for (const p of parts) {
				if (p.off) continue;
				const a = asms.find((x) => x.id === p.info.assembly);
				const out = new three.Vector3(...a?.out ?? [
					0,
					0,
					0
				]);
				const m = mid.get(p.info.assembly);
				if (m) out.addScaledVector(
					/** @type {THREE.Vector3} */
					centre.get(p).clone().sub(m),
					.45
				);
				p.obj.parent?.getWorldQuaternion(q);
				root.getWorldQuaternion(qr);
				p.off = out.applyQuaternion(qr).applyQuaternion(q.invert());
			}
			const listed = parts.filter((p) => !p.unit);
			const catalog = {
				assemblies: asms.filter((a) => listed.some((p) => p.info.assembly === a.id)),
				parts: listed.map((p) => p.info),
				steps,
				sources,
				ranges: steps.map((_, i) => [i / Math.max(1, steps.length), (i + 1) / Math.max(1, steps.length)]),
				play,
				seconds
			};
			const n = Math.max(1, parts.length);
			const far = new three.Vector3(), up = new three.Vector3(0, size * .9, 0);
			/** where every part is: drawn out by `e` (0…1, staggered), and flown in from far by `u` of the build (1: all in) */
			const pose = (e, u = 1) => {
				for (const p of parts) {
					const ee = ease.io(clamp(e * 1.35 - p.delay * .35));
					const s = p.info.step ?? 1, of = Math.max(1, catalog.steps.length);
					const ai = u >= 1 ? 1 : ease.out(clamp(u * 1.6 - (s - 1) / of * .5 - p.order / n * .1));
					far.copy(p.off).normalize().multiplyScalar(size * 1.6).add(up);
					p.obj.position.copy(p.base).addScaledVector(p.off, ee).addScaledVector(far, 1 - ai);
					p.obj.visible = ai > .001;
				}
			};
			/** @type {SealedAsset} */
			const asset = {
				parts,
				labels,
				shells,
				catalog,
				size,
				lab,
				cut: cut ?? lab?.cut,
				pose,
				explode: (k) => pose(k, 1),
				build: (u) => pose(0, u),
				tick: (dt, env) => tickers.forEach((f) => f(dt, env)),
				partOf: (obj) => {
					for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData.part;
					return null;
				},
				objOf: (id) => parts.find((p) => p.info.id === id)?.obj ?? null
			};
			root.userData.asset = asset;
			root.userData.parts = Object.fromEntries(listed.map((p) => [p.info.id, p.obj]));
			root.userData.catalog = catalog;
			root.userData.explode = asset.explode;
			root.userData.setBuild = asset.build;
			return asset;
		}
	};
}
/**
* @typedef {object} SealedAsset what `seal` writes on an asset's root (`root.userData.asset`)
* @property {Part[]} parts
* @property {Label[]} labels
* @property {THREE.Mesh[]} shells
* @property {{ assemblies: Assembly[], parts: PartInfo[], steps: string[], sources: { label: string, url: string }[], ranges: [number, number][], play: string, seconds: number }} catalog
* @property {number} size its largest outer measure (m)
* @property {Lab | undefined} lab
* @property {Lab['cut']} cut
* @property {(explode: number, build?: number) => void} pose
* @property {(k: number) => void} explode
* @property {(u: number) => void} build
* @property {(dt: number, env: Env) => void} tick
* @property {(obj: THREE.Object3D) => string | null} partOf the part an object belongs to
* @property {(id: string) => THREE.Object3D | null} objOf
*/
/**
* An asset as the machines list it ($lib/machines): a cast with no bones, its moves
* played by its own solver.
* @param {THREE.Object3D} root a sealed asset
* @returns {import('$lib/actors/rig').Cast}
*/
const castOf = (root) => ({
	rig: {
		object: root,
		bones: {},
		names: [],
		pose: () => {}
	},
	clips: {},
	first: "",
	catalog: root.userData.asset.catalog,
	asset: root.userData.asset
});

