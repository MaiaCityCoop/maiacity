// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE UNIVERSAL RENDERER — one way for any page (a viewer, a sandbox, a world, a film) to draw our assets and anyone's,
 * as many of them as a world holds: `use` an asset by its label or its build (`plants/apple@2?stage=9`,
 * `<recipe hash>?its=values`), `place` it as often as you like, and `update` each frame before the scene is drawn.
 *
 * - Every build comes the one way any build comes (../load.js): from this device's cache, else from the asset box,
 *   checked. Nothing of an asset runs here; what it made is only data, and our code draws it.
 * - Each kind is drawn at the level of detail its size on screen calls for (./lod.js), by one contract for every asset
 *   (../lodcard.js, play/SPEC.md §4.5): L0 its build; L1 and L2 its recipe's own where its card declares them (the
 *   same recipe built with the values its levels name), built coarsest first, so a world stands as soon as it has it,
 *   and a finer one asked for only once a copy is near enough to want it; else made from its build's own geometry by
 *   simplifying it (./lower.js, ./simplify.js), beside the page, in a worker of their own, each within what it may
 *   cost; L3 its picture (./impostors.js), taken from the coarsest shape it was built at. Every level made here and
 *   every picture is kept on this device by its build's hash, the level and its maker's version (./levels.js), so it
 *   is made once a device.
 * - Every copy of a kind at one level is one more instance of the same few drawings (./prepare.js): a forest of a
 *   thousand trees of forty kinds is a few hundred draw calls, the pictures a handful.
 * - Every material is the renderer's own (./presets.js), with the shader code only we add: the dither a level fades
 *   in by, and the kit's section caps when the world is cut open (`cut`).
 * - A copy moved by its controls (a tent half pitched, a pickup's door open, a machine drawn apart: `pose`, from the
 *   numbers the box wrote down, ../controls.js) leaves the instances and is drawn as a tree of its own, its parts where
 *   its controls put them, at any distance (a picture cannot open a door); back at rest, it joins the others again.
 *
 * Several boxes build side by side while a world loads (`boxes`), each a frame and a worker of its own, the build
 * most wanted first (`rank`: what is on screen before what is not, a kind's coarsest shape before its finer ones). A
 * world that puts a build in its scene itself (`load`) has it built in the same boxes, in the same line.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { AssetBox } from '../box/host.js';
import { labelOf, poserOf } from '../controls.js';
import { canonical, loadAsset } from '../load.js';
import { INDEX, buildOf, hashOf, heldAt, paramsOf, parseBuild } from '../catalog.js';
import { createImpostors } from './impostors.js';
import { budget, dropOnUpload } from '../../render/budget.js';
import { LEVELS, SMALLEST, budgetOf, choose, errorOf, heldTo, sizeOn, smallestOf, thresholdsOf } from './lod.js';
import { createLowering } from './lower.js';
import { createKept } from './levels.js';
import { levelValues } from '../lodcard.js';
import { prepare } from './prepare.js';
import { createPresets } from './presets.js';
import { hasNodeMaterial } from '../../render/core.js';

/** the longest a level waits for its shaders to be made ahead before it is drawn anyway (ms) */
const WARM_MOST = 4000;
import { lookByName } from '../look.js';
import * as TSL from 'three/tsl';
import { windNodes, windOfCopy, worldSeconds } from '../../render/wind.js';

/** whether a material says what it is: its look (box format 5), or one its name gives (an older build's, ../look.js) */
const looked = (m) => (Array.isArray(m) ? m.some(looked) : !!(m?.userData?.look ?? lookByName(m?.name)));

/** after how long (ms) a kind that failed only in passing (`Unread`) is asked for again (`settle`) */
const AGAIN_AFTER = 60_000;

/** a = a × b, 4 × 4 matrices as three.js keeps them (by column), each at its offset in its array */
function multiply(a, ai, b, bi, out, oi) {
	for (let c = 0; c < 4; c++) {
		const b0 = b[bi + c * 4], b1 = b[bi + c * 4 + 1], b2 = b[bi + c * 4 + 2], b3 = b[bi + c * 4 + 3];
		out[oi + c * 4] = a[ai] * b0 + a[ai + 4] * b1 + a[ai + 8] * b2 + a[ai + 12] * b3;
		out[oi + c * 4 + 1] = a[ai + 1] * b0 + a[ai + 5] * b1 + a[ai + 9] * b2 + a[ai + 13] * b3;
		out[oi + c * 4 + 2] = a[ai + 2] * b0 + a[ai + 6] * b1 + a[ai + 10] * b2 + a[ai + 14] * b3;
		out[oi + c * 4 + 3] = a[ai + 3] * b0 + a[ai + 7] * b1 + a[ai + 11] * b2 + a[ai + 15] * b3;
	}
}

/**
 * What a name builds: a build, `<hash>?values`, or a sandbox's slot (../catalog.js `resolve`).
 * @param {string} ref
 */
function resolve(ref) {
	const hash = hashOf(ref);
	const params = paramsOf(ref);
	return { hash, ...(params && { params }) };
}

/**
 * A renderer of assets for one scene.
 * @param {{
 *   renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, boxes?: number,
 *   px?: number, cache?: boolean, onShadows?: () => void, wind?: any
 * }} o `boxes` how many build side by side; `px` each picture's pixels a side; `wind` the world's (../../render/wind.js
 *   `windNodes`; a calm breeze where not given, none where null), which every material with a look sways in. No world chooses a kind's levels: each
 *   is drawn by its card's levels (../lodcard.js) at the sizes on screen of the one selector (./lod.js LEVELS);
 *   `cache: false` builds everything afresh;
 *   `onShadows` told when what casts a shadow changed, for a world that draws its shadows again only every so often
 *   (else they are drawn again with the next frame)
 */
export function createAssets(o) {
	const { renderer, camera } = o;
	renderer.localClippingEnabled = true;
	const group = new THREE.Group();
	group.name = 'assets';
	// the world's one wind (../../render/wind.js): every material that says it is a plant's sways in it; `wind: null` none
	const wind = o.wind === null ? null : (o.wind ?? windNodes(TSL));
	const presets = createPresets({ wind });
	const pictures = createImpostors(renderer, { px: o.px });
	const lowering = createLowering();
	// every level and picture made here kept on this device by its build (./levels.js)
	const kept = createKept({ lowering, keep: o.cache !== false });
	group.add(pictures.group);

	/* ── the builds asked for: each read from this device's cache, and those not kept built in the boxes, the most
	 *    wanted first, else in the order asked ── */
	// as many as asked, but no more than the device's budget lets one renderer have (../../render/budget.js)
	const pool = Array.from({ length: Math.max(1, Math.min(o.boxes ?? 3, budget().boxes)) }, () => ({ box: new AssetBox({ engine: INDEX.engine }), busy: false, starting: false, up: false }));
	/** the builds asked for, waiting to be read from the cache (READS at a time) */
	/** @type {{ name: string, rank: number | (() => number), ok: Function, no: Function }[]} */
	const queue = [];
	/** the builds the cache did not have, waiting for a box that is up and free */
	/** @type {{ rank: number | (() => number), recipe: any, given: any, ok: Function, no: Function }[]} */
	const line = [];
	const READS = budget().reads;
	/** the builds being loaded (read, built or opened), and those of them reading the cache now */
	let loads = 0, reading = 0;
	/** how much a build waiting is wanted now (a rank can change while it waits: what is on screen) */
	const rankOf = (q) => {
		const r = typeof q.rank === 'function' ? q.rank() : q.rank;
		return Number.isFinite(r) ? r : 0;
	};
	/** the most wanted of a list taken from it: the first asked of those wanted as much */
	const take = (list) => {
		let i = 0;
		for (let j = 1, best = rankOf(list[0]); j < list.length; j++) {
			const r = rankOf(list[j]);
			if (r > best) (i = j), (best = r);
		}
		return list.splice(i, 1)[0];
	};
	function pump() {
		while (reading < READS && queue.length) {
			const job = take(queue);
			reading++;
			loads++;
			// what the cache does not have goes in line for a box (../load.js builds it there), its read done: the box is
			// chosen only once one is up and free, so what is wanted most by then is built first
			let lent = false;
			const box = {
				engine: INDEX.engine,
				build: (recipe, given, o) =>
					new Promise((ok, no) => {
						if (!lent) (lent = true), reading--;
						line.push({ rank: job.rank, recipe, given, o, ok, no });
						pump();
					})
			};
			loadAsset(job.name, { box, cache: o.cache !== false })
				.then(job.ok, job.no)
				.finally(() => {
					if (!lent) reading--;
					loads--;
					pump();
				});
		}
		// the boxes started as builds wait for them, as many as there are (none for a world that finds all it asks for
		// in the cache)
		const need = Math.min(pool.length, line.length + pool.filter((p) => p.busy).length);
		let started = pool.filter((x) => x.starting).length;
		for (const p of pool) {
			if (started >= need) break;
			if (p.starting) continue;
			p.starting = true;
			started++;
			p.box
				.start()
				.catch(() => {})
				.then(() => {
					p.up = true;
					pump();
				});
		}
		for (const p of pool) {
			if (!p.up || p.busy || !line.length) continue;
			const b = take(line);
			p.busy = true;
			p.box
				.build(b.recipe, b.given, b.o)
				.then(b.ok, b.no)
				.finally(() => {
					p.busy = false;
					pump();
				});
		}
	}
	const build = (name, rank) =>
		new Promise((ok, no) => {
			queue.push({ name, rank, ok, no });
			pump();
		});

	/* ── the kinds ── */
	/** @type {Map<string, any>} */
	const kinds = new Map();
	/** something to draw changed; and what casts shadows did */
	let dirty = true, shadows = true;
	/** whether a kind's copies are in the shadows at all (cast at some level, or by their picture): a floor cover's, a
	 *  small plant's coming and going changes nothing there, and draws no shadow pass */
	const casts = (k) => k.shadows !== false || k.picture;
	/** the renderer was disposed */
	let gone = false;

	/**
	 * A kind: an asset at its version, variant and values, at every level it is drawn at. Asked for again, the same (as
	 * it was first asked for). `shadows`: true, its shadow cast at every level; false, at none; else as below
	 * (`meshOf`). `picture: false`, none taken: a kind a world never draws so small. `receive: false`, no shadow falls
	 * on it (a world that always drew it so: its builder lays none on it). `rank`: how much its builds are wanted while
	 * they wait for a box (more first; asked again each time a box is free, so it may follow what is on screen), set on
	 * the kind (`kind.rank`) by whoever asks for it first; its coarsest shape is always wanted a little more.
	 * @param {string} ref a label or a build
	 * @param {{ shadows?: boolean, picture?: boolean, receive?: boolean, rank?: () => number }} [opts]
	 */
	function use(ref, opts) {
		const { hash, params } = resolve(ref);
		const at = heldAt(hash);
		// its built levels, as its card declares them (../lodcard.js): its build alone, or its recipe's own levels too
		const values = levelValues(at.lod);
		const declared = values.length > 1;
		// each named as it is kept, its own values filled in, so two refs of one build are one kind
		const names = values.slice(0, declared ? LEVELS.length : 1).map((v) => canonical(buildOf(hash, { ...params, ...v })).name);
		const key = names[0];
		let k = kinds.get(key);
		if (k) return k;
		k = {
			key,
			label: at.label,
			names,
			// each level of its shape: built from its recipe (`name`), or made from the coarsest one built (none); a
			// recipe that declares fewer levels than the selector has is drawn at as many, the selector's coarsest
			levels: (declared ? names : LEVELS).map((_, L) => ({ state: 'idle', level: null, meshes: null, name: names[L] ?? null, as: -1 })),
			/** the coarsest level built: its measure is the kind's, and its picture is taken from it */
			base: names.length - 1,
			ok: false,
			error: null,
			radius: 1,
			height: 0,
			center: new THREE.Vector3(),
			thresholds: thresholdsOf(declared ? names.length : LEVELS.length),
			/** each level's triangles, as each came (./lod.js `heldTo`) */
			tris: [],
			shadows: opts?.shadows,
			receive: opts?.receive !== false,
			picture: opts?.picture !== false,
			slot: null,
			n: 0,
			cap: 0,
			M: new Float32Array(0),
			T: new Float32Array(0),
			S: new Float32Array(0),
			alive: new Uint8Array(0),
			was: new Int8Array(0),
			/** its copies put away (`give`), for the next `takeOut` */
			free: [],
			/** the copies moved by their controls, by their number: each its values and its own tree */
			posed: new Map(),
			/** how much its builds are wanted (`use`) */
			rank: opts?.rank ?? null
		};
		kinds.set(key, k);
		settle(k);
		return k;
	}

	/**
	 * A kind's coarsest shape built first: its measure is the kind's, and its picture is taken from it. One that failed
	 * only in passing (`Unread`: its recipe's proof or file wasn't handed over, as the vault's server restarted) is asked
	 * again after `AGAIN_AFTER`, so it comes once the server is back, never missing for as long as the world is open.
	 */
	function settle(k) {
		k.ready = want(k, k.base, true).then(
			() => {
				const L = k.levels[k.base].level;
				k.radius = L.radius;
				// how tall it stands from its foot, in its own metres (the wind's height for a copy of scale 1)
				k.height = Math.max(0, L.height ?? 0);
				k.center.copy(L.center);
				retune(k);
				k.ok = true;
				dirty = shadows = true;
				// and the levels made from it, made now, beside the frames: most of a world's copies want those first
				if (k.base < k.levels.length - 1) want(k, k.levels.length - 1);
				return k;
			},
			(err) => {
				k.error = String(err?.message ?? err);
				console.warn(`assets: ${k.label} did not load: ${k.error}`);
				if (err?.name === 'Unread')
					setTimeout(() => {
						if (gone) return;
						for (const lv of k.levels) if (lv.state === 'failed') lv.state = 'idle';
						k.error = null;
						settle(k);
					}, AGAIN_AFTER);
				return k;
			}
		);
	}

	/** A kind's thresholds by its coarsest shape: as it came, or, while it is being made, by what it may cost (./lod.js) */
	function retune(k) {
		// a kind whose levels are its recipe's own (a plant's) and that is drawn far off as its picture takes it at its
		// last threshold, however light its coarsest shape: as a forest always did (a tree 12 m across a picture past
		// 40 m: the village's own, measured on a Mac's Metal in intent 6295a650, whose light trees kept their shapes to
		// ~60 m and cost its far view 46 % more triangles). One made by simplifying, or never a picture (a small plant,
		// left out where its shape would end), keeps a light shape further, down to PICTURE (./lod.js HEAVY).
		// And every level hands over no later than DENSITY lets it, by its own triangles (./lod.js `heldTo`)
		const last = k.levels.length - 1;
		const tris = k.levels[last].level?.tris ?? budgetOf(last, k.levels[k.base].level.tris);
		k.thresholds = heldTo(k.names.length > 1 && k.picture ? thresholdsOf(k.levels.length) : thresholdsOf(k.levels.length, tris), k.tris);
	}

	/** pictures taken of builds read from this device's cache (`stats`) */
	let retaken = 0;

	/** what level L of a kind made from `from` (a level of it, or the source of several) is made to: ./lod.js */
	const planOf = (k, L, from) => ({ budget: budgetOf(L, from.tris), most: budgetOf(L, Infinity), error: errorOf(L, from.radius), smallest: smallestOf(L, from.radius) });

	/** a level of a kind asked for, once; its drawings made when it comes */
	function want(k, L, first = false) {
		const lv = k.levels[L];
		if (lv.state !== 'idle') return lv.promise;
		if (!lv.name) return lower(k, L);
		lv.state = 'loading';
		const gen = (lv.gen = (lv.gen ?? 0) + 1);
		lv.promise = build(lv.name, () => 2 * (k.rank?.() ?? 0) + (first ? 1 : 0)).then(
			async (got) => {
				// the materials it was handed (given back when it is let go of: `evict`)
				const mats = [];
				lv.level = prepare(got.obj, { of: (m) => (mats.push(presets.of(m)), mats[mats.length - 1]) });
				lv.mats = mats;
				lv.from = got.from;
				// whether this device's cache holds it, to be read again rather than built again once it was let go of
				lv.kept = got.from === 'cache';
				got.stored?.then((yes) => yes && lv.gen === gen && (lv.kept = true), () => {});
				// a build with controls is kept whole as well: a copy moved by them is a tree copied from it
				if (got.obj.userData.controls?.length) lv.obj = got.obj;
				await show(k, L);
				if (L > 0 && lv.level.tris > budgetOf(L, Infinity)) lighten(k, L);
				else letGo(k, L);
			},
			(err) => {
				lv.state = 'failed';
				throw err;
			}
		);
		lv.promise.catch(() => {});
		return lv.promise;
	}

	/**
	 * The levels of a kind made from its coarsest build (every one not asked for yet, together: its corners welded once
	 * for all), once that build is here.
	 */
	function lower(k, L) {
		const list = k.levels.map((_, j) => j).filter((j) => !k.levels[j].name && k.levels[j].state === 'idle');
		const made = want(k, k.base).then(() => {
			const from = k.levels[k.base].level;
			return kept.lower(k.names[k.base], from, list.map((j) => ({ L: j, plan: planOf(k, j, from) })));
		});
		list.forEach((j, n) => {
			const lv = k.levels[j];
			lv.state = 'loading';
			lv.promise = made.then(
				async (out) => {
					lv.level = out[n];
					// made here by simplifying, or read from this device's cache, made once before (./levels.js)
					lv.from = out[n].kept ? 'kept' : 'made';
					// nothing taken away (a kiosk of sixty triangles): drawn as the level it was made from
					if (lv.level.same) lv.as = k.base;
					await show(k, j);
					letGo(k, j);
					if (j === k.levels.length - 1) retune(k);
				},
				(err) => {
					lv.state = 'failed';
					// its build's own failure is told once, by `use`
					if (k.levels[k.base].state === 'ready') console.warn(`assets: ${k.label}: level ${j} was not made: ${err?.message ?? err}`);
					throw err;
				}
			);
			lv.promise.catch(() => {});
		});
		return k.levels[L].promise;
	}

	/**
	 * A level built from its recipe that is over its ceiling (./lod.js: a big tree's crown at detail 0.1, a walnut's
	 * 18,328 triangles) brought under it by simplifying, every piece of it kept (a crown thinned shows): beside the page,
	 * after the levels still to be made, and drawn as it came until then. Its picture, already taken, and its kind's
	 * thresholds stay as its recipe made them.
	 */
	function lighten(k, L) {
		const lv = k.levels[L], from = lv.level;
		const most = budgetOf(L, Infinity);
		kept.lower(k.names[L], from, [{ L, plan: { ...planOf(k, L, from), budget: most, most, every: true } }], true).then(
			async ([made]) => {
				if (gone || lv.level !== from) return;
				const fresh = { level: made, meshes: made.draws.map((d) => meshOf(k, L, d)) };
				await compiled(fresh, false);
				// the new drawings take the old ones' place (unless the renderer went meanwhile: then they go)
				const away = gone || lv.level !== from ? fresh.meshes : lv.meshes;
				if (away !== fresh.meshes) Object.assign(lv, fresh), letGo(k, L);
				for (const { mesh } of away) {
					mesh.removeFromParent();
					mesh.geometry.dispose();
					mesh.dispose();
				}
				dirty = shadows = true;
			},
			(err) => gone || console.warn(`assets: ${k.label}: level ${L} was not brought under its ceiling: ${err?.message ?? err}`)
		);
	}

	/** a level that came: its drawings made, their shaders too, and, the coarsest built, its picture taken */
	async function show(k, L) {
		const lv = k.levels[L];
		lv.meshes = lv.as >= 0 ? [] : lv.level.draws.map((d) => meshOf(k, L, d));
		lv.seen = performance.now();
		const base = L === k.base;
		await compiled(lv, base && k.picture);
		// its picture taken as soon as its coarsest built shape is here, while the world loads, not by a frame that
		// wants it: a copy whose picture is missing draws that whole shape in its place
		if (base && !k.slot && k.picture) {
			const { slot, taken } = await kept.picture(k.names[k.base], lv.level, pictures);
			// photographed for a build this device's cache handed over: one it should have kept the picture of too
			if (taken && lv.from === 'cache') retaken++;
			if (gone) return;
			if (!k.slot) k.slot = slot;
		}
		lv.state = 'ready';
		// its triangles known: the kind's thresholds held to them (./lod.js DENSITY)
		if (k.tris[L] !== lv.level?.tris) {
			k.tris[L] = lv.level?.tris;
			if (k.ok) retune(k);
		}
		dirty = shadows = true;
	}

	/**
	 * A level's corners let go in the page once the graphics card has them, where the device's budget says so (a phone
	 * keeps one copy of what it draws, not two: ../../render/budget.js `release`). Never the coarsest built (the other
	 * levels are lowered from it, and a world measures and picks its plants by it), a level kept whole for its controls,
	 * one drawn as another, or any corners it shares with those.
	 */
	function letGo(k, L) {
		const lv = k.levels[L];
		if (!budget().release || gone || L === k.base || lv.as >= 0 || lv.obj || !lv.level) return;
		const kept = keptBeside(k, lv);
		lv.released = true;
		for (const d of lv.level.draws) for (const a of cornersOf(d)) if (!kept.has(a)) dropOnUpload(a);
	}

	/** a drawing's attributes and index */
	const cornersOf = (d) => [...Object.values(d.geometry.attributes), d.geometry.index].filter(Boolean);
	/** the attributes the kind's other levels keep (its coarsest built, one kept whole, one not let go of) */
	function keptBeside(k, lv) {
		const kept = new Set();
		for (const [j, other] of k.levels.entries())
			if (other.level && other !== lv && (j === k.base || other.obj || !other.released)) for (const d of other.level.draws) for (const a of cornersOf(d)) kept.add(a);
		return kept;
	}

	/**
	 * A level no copy was drawn at for the device's budget's `evict` time let go of, all of it: its drawings, and the
	 * graphics card's copy of its corners (but those its kind's other levels keep). Asked for again when a copy wants it
	 * (from the device's cache, or lowered again from the coarsest). Never the coarsest built, nor one kept whole.
	 */
	function evict(k, L) {
		const lv = k.levels[L];
		// (one built from its recipe only where this device's cache holds it: built again, it would cost what the budget
		// saves; one drawn as another, or with no drawings, holds nothing)
		if (gone || L === k.base || lv.state !== 'ready' || lv.obj || (lv.name && !lv.kept) || lv.as >= 0 || !lv.meshes?.length) return;
		const kept = keptBeside(k, lv);
		for (const { mesh } of lv.meshes ?? []) {
			mesh.removeFromParent();
			// its own instance arrays; its shape's corners only where no other level keeps them (three lets a shape's
			// buffers go with the shape)
			for (const name of Object.keys(mesh.geometry.attributes)) if (kept.has(mesh.geometry.attributes[name])) mesh.geometry.deleteAttribute(name);
			if (mesh.geometry.index && kept.has(mesh.geometry.index)) mesh.geometry.setIndex(null);
			mesh.geometry.dispose();
			mesh.dispose();
		}
		// its materials given back (the last use of one gone, it and its pictures go: read again, a level's are new ones)
		for (const m of lv.mats ?? []) presets.release(m);
		Object.assign(lv, { state: 'idle', level: null, meshes: null, mats: null, promise: null, released: false, kept: false, as: -1, from: undefined, seen: 0 });
		dirty = shadows = true;
	}

	/** the world the renderer's group stands in: its lights and fog are in every shader its drawings get */
	const worldOf = () => {
		let s = group;
		while (s.parent) s = s.parent;
		return s.isScene ? s : null;
	};
	let compiling = 0;
	/**
	 * A level's shaders made before it is first drawn, beside the frames and not in one (where the browser can, else
	 * while the world loads): each new shader takes the GPU a while to make, and a frame that waits for it stalls the
	 * view. The coarsest level's for the picture studio too, which lights it otherwise.
	 */
	/**
	 * `object`'s shaders made ahead (three's compileAsync), but never for what a node material draws: three's
	 * WebGLNodesHandler doesn't make node materials' programs through compile/compileAsync, and on a real GPU (Metal,
	 * with parallel shader compiling) the promise never settled, so a level waiting on it was never drawn. Those are made
	 * at their first draw. And never waited on for more than WARM_MOST ms: a level is drawn then, made or not.
	 * @param {THREE.Object3D} object @param {THREE.Scene} scene
	 */
	function warm(object, scene) {
		if (hasNodeMaterial(object)) return Promise.resolve();
		return Promise.race([renderer.compileAsync(object, camera, scene).catch(() => {}), new Promise((ok) => setTimeout(ok, WARM_MOST))]);
	}

	async function compiled(lv, studio) {
		const scene = worldOf();
		compiling++;
		try {
			if (scene) await Promise.all(lv.meshes.map(({ mesh }) => warm(mesh, scene)));
			if (studio) await pictures.prepare(lv.level);
		} finally {
			compiling--;
		}
	}

	/** one drawing of a level, as the instances of all its copies */
	function meshOf(k, L, d) {
		// its own shape (sharing the corners) for its own fade per copy
		const g = new THREE.BufferGeometry();
		for (const [name, a] of Object.entries(d.geometry.attributes)) g.setAttribute(name, a);
		g.setIndex(d.geometry.index);
		g.boundingBox = d.geometry.boundingBox;
		g.boundingSphere = d.geometry.boundingSphere;
		const cap = 16;
		const mesh = new THREE.InstancedMesh(g, d.material, cap);
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		g.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
		// a material that says what it is (a leaf, grass, bark …: ../look.js) is bent by the world's wind: each copy its foot
		// and height (aWind, ../../render/wind.js `windOfCopy`)
		if (looked(d.material)) g.setAttribute('aWind', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
		if (d.colors) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
		mesh.count = 0;
		mesh.visible = false;
		// which copies are drawn is chosen here, never by three's culling, which would see only the first
		mesh.frustumCulled = false;
		// the coarsest shape of a plant casts no shadow, its picture's and its finer shapes' are enough; a kind built
		// once casts one at every level, as it did when it had only the one; a kind asked for with its shadows (`use`)
		// casts them at every level, or at none
		mesh.castShadow = k.shadows ?? (d.cast && (k.names.length === 1 || L < k.names.length - 1));
		mesh.receiveShadow = k.receive;
		mesh.name = `${k.label} · level ${L}`;
		group.add(mesh);
		return { mesh, draw: d, cap, used: 0 };
	}

	/** room in a drawing for `need` instances */
	function room(m, need) {
		if (m.cap >= need) return;
		const cap = Math.max(need, m.cap * 2);
		const old = m.mesh.instanceMatrix;
		const im = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16).setUsage(THREE.DynamicDrawUsage);
		im.array.set(old.array.subarray(0, m.used * 16));
		m.mesh.instanceMatrix = im;
		const f = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
		f.array.set(m.mesh.geometry.attributes.aFade.array.subarray(0, m.used));
		m.mesh.geometry.setAttribute('aFade', f);
		const w = m.mesh.geometry.attributes.aWind;
		if (w) {
			const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
			a.array.set(w.array.subarray(0, m.used * 4));
			m.mesh.geometry.setAttribute('aWind', a);
		}
		if (m.mesh.instanceColor) {
			const c = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
			c.array.set(m.mesh.instanceColor.array.subarray(0, m.used * 3));
			m.mesh.instanceColor = c;
		}
		m.cap = cap;
	}

	/* ── the copies ── */
	const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m4 = new THREE.Matrix4();

	/**
	 * A copy of a kind put down: at x, y, z, turned by `turn` about the upright, at `scale`; or by a whole matrix.
	 * @param {any} k a kind (`use`) or a ref
	 * @param {{ x?: number, y?: number, z?: number, turn?: number, scale?: number } | THREE.Matrix4} at
	 * @returns {{ kind: any, i: number }}
	 */
	function place(k, at = {}) {
		if (typeof k === 'string') k = use(k);
		if (k.n >= k.cap) {
			const cap = Math.max(16, k.cap * 2);
			const grow = (A, n) => {
				const B = new A.constructor(cap * n);
				B.set(A);
				return B;
			};
			k.M = grow(k.M, 16);
			k.T = grow(k.T, 1);
			k.S = grow(k.S, 1);
			k.alive = grow(k.alive, 1);
			k.was = grow(k.was, 1);
			k.cap = cap;
		}
		const i = k.n++;
		k.was[i] = -1;
		set(k, i, at);
		dirty = true;
		if (casts(k)) shadows = true;
		return { kind: k, i };
	}

	/** copy i of kind k put at `at`, or put away (null): drawn nowhere, its level forgotten, until it is put somewhere */
	function set(k, i, at) {
		k.alive[i] = at ? 1 : 0;
		if (!at) {
			k.was[i] = -1;
			return unpose(k, i);
		}
		if (at.isMatrix4) {
			const e = at.elements, len = (j) => e[j] * e[j] + e[j + 1] * e[j + 1] + e[j + 2] * e[j + 2];
			at.toArray(k.M, i * 16);
			// as an upright card sees it: its turn about the upright, its size its longest axis (0 for a matrix of scale 0)
			k.T[i] = Math.atan2(e[8], e[0]);
			k.S[i] = Math.sqrt(Math.max(len(0), len(4), len(8)));
			return;
		}
		const turn = at.turn ?? 0, scale = at.scale ?? 1;
		_m4.compose(_p.set(at.x ?? 0, at.y ?? 0, at.z ?? 0), _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, turn), _s.setScalar(scale));
		_m4.toArray(k.M, i * 16);
		k.T[i] = turn;
		k.S[i] = scale;
	}

	/** a copy moved, or put away where it stands (null): drawn nowhere until it is moved somewhere */
	const move = (copy, at) => {
		set(copy.kind, copy.i, at);
		dirty = true;
		if (casts(copy.kind)) shadows = true;
	};
	/** a copy taken away, for good */
	const remove = (copy) => move(copy, null);
	/** a copy put away, kept for the next `take` of its kind */
	const putAway = (copy) => {
		move(copy, null);
		copy.kind.free.push(copy);
	};
	/** a copy of kind k put at `at`: one put away if there is one, else a new one @param {any} k a kind or a ref */
	const takeOut = (k, at) => {
		if (typeof k === 'string') k = use(k);
		const c = k.free.pop();
		if (!c) return place(k, at);
		move(c, at);
		return c;
	};

	/* ── the copies moved by their controls ── */
	/** the level nearest `L` that is ready and has its controls: coarser first, then finer; -1 for none */
	function controlledNear(k, L) {
		const ok = (j) => k.levels[j].state === 'ready' && k.levels[j].obj;
		for (let j = L; j < k.levels.length; j++) if (ok(j)) return j;
		for (let j = L - 1; j >= 0; j--) if (ok(j)) return j;
		return -1;
	}

	/**
	 * The controls a kind's copies have (a level of it must be here): each its id, its name, its ends, its rest, whether
	 * it is a choice. None for a kind without.
	 * @param {any} k a kind (`use`), a copy (`place`) or a ref
	 */
	function controlsOf(k) {
		if (typeof k === 'string') k = use(k);
		if (k?.kind) k = k.kind;
		const L = controlledNear(k, 0);
		if (L < 0) return [];
		return k.levels[L].obj.userData.controls.map((c) => ({ id: c.id, label: labelOf(c.id), from: c.from, to: c.to, rest: c.rest, choice: !!c.choice }));
	}

	/**
	 * A copy's control set to `v` (kept between its ends): the copy is drawn with its parts where that puts them; every
	 * control back at its rest, it is drawn with the others again.
	 * @param {{ kind: any, i: number }} copy
	 * @param {string} id
	 * @param {number} v
	 */
	function pose(copy, id, v) {
		const { kind: k, i } = copy;
		const c = controlsOf(k).find((x) => x.id === id);
		if (!c || !k.alive[i] || !Number.isFinite(Number(v))) return;
		const at = Math.min(Math.max(c.from, c.to), Math.max(Math.min(c.from, c.to), Number(v)));
		let p = k.posed.get(i);
		if (!p) k.posed.set(i, (p = { values: new Map(), tree: null, L: -1, poser: null, ready: false, shown: false, tris: 0, calls: 0 }));
		if (at === c.rest) p.values.delete(id);
		else p.values.set(id, at);
		if (!p.values.size) unpose(k, i);
		else if (p.poser) {
			p.poser.reset();
			p.poser.setMany(p.values);
		}
		dirty = shadows = true;
	}

	/** a copy's controls now, by id: each at its value, or at its rest */
	function poseOf(copy) {
		const p = copy.kind.posed.get(copy.i);
		return Object.fromEntries(controlsOf(copy.kind).map((c) => [c.id, p?.values.get(c.id) ?? c.rest]));
	}

	/** a copy's controls all back at rest: its tree taken away */
	function unpose(k, i) {
		const p = k.posed.get(i);
		if (!p) return;
		p.tree?.removeFromParent();
		k.posed.delete(i);
		dirty = shadows = true;
	}

	/**
	 * A copy's own tree, copied from level L's build: its materials the renderer's (those the level wears), what the
	 * instanced drawings leave out left out here too (lines, points, lights), its controls set, and its shaders made
	 * before it shows (until then the copy is drawn at rest with the others).
	 */
	function treeOf(k, i, p, L) {
		const obj = k.levels[L].obj;
		p.tree?.removeFromParent();
		// copied without the build's own notes: its controls' numbers are many, and the copy plays the build's
		const notes = obj.userData;
		obj.userData = {};
		let copy;
		try {
			copy = SkeletonUtils.clone(obj);
		} finally {
			obj.userData = notes;
		}
		let tris = 0, calls = 0;
		copy.traverse((o) => {
			if (o.isMesh) {
				const many = Array.isArray(o.material);
				// (a skin or a morph is its own mesh's: three's own material, not a shared node material)
				const plain = !!(o.isSkinnedMesh || o.morphTargetInfluences?.length);
				o.material = many ? o.material.map((m) => presets.of(m, plain)) : presets.of(o.material, plain);
				o.receiveShadow = k.receive;
				// a part whose shape its controls bend or spread is never culled by a ball that holds it at rest
				if (o.isInstancedMesh || o.isSkinnedMesh || o.morphTargetInfluences?.length) o.frustumCulled = false;
				const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
				tris += n * (o.isInstancedMesh ? o.count : 1);
				calls += many ? Math.max(1, g.groups.length) : 1;
			} else if (o.isLine || o.isPoints || o.isSprite || o.isLight) o.layers.disableAll();
		});
		// held where the copy stands: the build's own root keeps its own place, as in the level's drawings, and may move
		const tree = new THREE.Group();
		tree.add(copy);
		tree.matrixAutoUpdate = false;
		tree.visible = false;
		tree.name = `${k.label} · copy ${i}, moved`;
		Object.assign(p, { tree, L, tris, calls, ready: false, shown: false, poser: poserOf(copy, obj.userData.controls, { own: true }) });
		p.poser.setMany(p.values);
		group.add(tree);
		const scene = worldOf();
		compiling++;
		(scene ? warm(tree, scene) : Promise.resolve())
			.catch(() => {})
			.finally(() => {
				compiling--;
				if (p.tree !== tree) return;
				p.ready = true;
				dirty = shadows = true;
			});
	}

	/** copy i of kind k, moved by its controls, drawn as its own tree at the shape level L asks for; false: not yet */
	function drawPosed(k, i, p, L) {
		let T = Math.min(L, k.levels.length - 1);
		if (k.levels[T].state === 'idle') want(k, T);
		T = controlledNear(k, T);
		if (T < 0) return false;
		if (p.L !== T) treeOf(k, i, p, T);
		if (!p.ready) return false;
		p.tree.matrix.fromArray(k.M, i * 16);
		p.tree.matrixWorldNeedsUpdate = true;
		p.tree.visible = true;
		counted.posed++;
		counted.tris += p.tris;
		counted.calls += p.calls;
		return true;
	}

	/* ── each frame ── */
	/** the level every copy is drawn at, whatever its size (a film's, or a check's), or -1: each by its size */
	let forced = -1, swept = 0, held = false;
	const frustum = new THREE.Frustum(), view = new THREE.Matrix4(), ball = new THREE.Sphere(), eye = new THREE.Vector3();
	const last = { world: new Float32Array(16), proj: new Float32Array(16) };
	const counted = { levels: [0, 0, 0], pictures: 0, posed: 0, tris: 0, calls: 0, culled: 0 };
	const same = (a, b) => {
		for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-5) return false;
		return true;
	};

	/** the level nearest `L` that is ready to draw: coarser first, then finer; -1 for none */
	function readyNear(k, L) {
		for (let j = L; j < k.levels.length; j++) if (k.levels[j].state === 'ready') return j;
		for (let j = L - 1; j >= 0; j--) if (k.levels[j].state === 'ready') return j;
		return -1;
	}

	/** the level a ready level L is drawn as: itself, or the one it was made from when nothing was taken away */
	const as = (k, L) => (L >= 0 && L < k.levels.length && k.levels[L].as >= 0 && k.levels[L].state === 'ready' ? k.levels[L].as : L);

	/**
	 * Copy i of kind k drawn at level L (a shape, or its picture past the last), `fade` of it showing; the level it was
	 * drawn at (another, nearest, while L is not there yet), or -1 for none.
	 */
	function draw(k, i, L, fade) {
		const m = k.levels.length;
		if (L >= m) {
			if (k.slot) {
				pictures.push(k.slot, k.M[i * 16 + 12], k.M[i * 16 + 13], k.M[i * 16 + 14], k.T[i], k.S[i], fade);
				return m;
			}
			// no picture yet: its coarsest shape stands in, whole
			if (fade < 1) return -1;
			L = m - 1;
		}
		if (k.levels[L].state === 'idle') want(k, L);
		const R = readyNear(k, L);
		if (R < 0 || (R !== L && fade < 1)) return -1;
		const lv = k.levels[as(k, R)];
		for (const d of lv.meshes) {
			const n = d.draw.n;
			room(d, d.used + n);
			const A = d.mesh.instanceMatrix.array, F = d.mesh.geometry.attributes.aFade.array, W = d.mesh.geometry.attributes.aWind?.array;
			for (let j = 0; j < n; j++) {
				const s = d.used + j;
				multiply(k.M, i * 16, d.draw.locals, j * 16, A, s * 16);
				F[s] = fade >= 1 ? 0 : fade;
				// the copy's foot and its height in metres, for the wind (every part of it alike: it sways as one)
				if (W) W.set(windOfCopy(k.M[i * 16 + 12], k.M[i * 16 + 13], k.M[i * 16 + 14], k.height * k.S[i]), s * 4);
				if (d.draw.colors) d.mesh.instanceColor.array.set(d.draw.colors.subarray(j * 3, j * 3 + 3), s * 3);
			}
			d.used += n;
		}
		counted.levels[R] = (counted.levels[R] ?? 0) + 1;
		return R;
	}

	/**
	 * Draws what the camera should see: each copy at its level, the pictures turned to it. Cheap when nothing moved.
	 */
	function update() {
		// the wind on the world's clock (the film's when it sets one), whether or not anything else moved
		wind?.tick(worldSeconds());
		// the pictures taken since the last frame: their pages' smaller copies made, once for all of them
		pictures.settle();
		camera.updateMatrixWorld();
		const world = camera.matrixWorld.elements, proj = camera.projectionMatrix.elements;
		if (!dirty && same(world, last.world) && same(proj, last.proj)) return false;
		dirty = false;
		last.world.set(world);
		last.proj.set(proj);
		view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		frustum.setFromProjectionMatrix(view);
		eye.setFromMatrixPosition(camera.matrixWorld);
		const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (camera.zoom || 1);
		counted.levels.fill(0);
		counted.culled = counted.posed = counted.tris = counted.calls = 0;
		pictures.begin();
		for (const k of kinds.values()) {
			for (const lv of k.levels) for (const d of lv.meshes ?? []) d.used = 0;
			for (const p of k.posed.values()) if (p.tree) p.tree.visible = false;
			if (!k.ok) continue;
			const c = k.center, cast = casts(k);
			for (let i = 0; i < k.n; i++) {
				if (!k.alive[i]) continue;
				const M = k.M, o = i * 16;
				ball.center.set(M[o] * c.x + M[o + 4] * c.y + M[o + 8] * c.z + M[o + 12], M[o + 1] * c.x + M[o + 5] * c.y + M[o + 9] * c.z + M[o + 13], M[o + 2] * c.x + M[o + 6] * c.y + M[o + 10] * c.z + M[o + 14]);
				// moved by its controls, it may reach further than it does at rest (a machine drawn apart): twice as far
				ball.radius = k.radius * k.S[i] * (k.posed.size && k.posed.has(i) ? 2 : 1);
				if (!frustum.intersectsSphere(ball)) {
					counted.culled++;
					if (k.was[i] !== -1) (k.was[i] = -1), (shadows ||= cast);
					continue;
				}
				const size = sizeOn(ball.radius, ball.center.distanceTo(eye), tanHalf);
				if (size < SMALLEST) {
					if (k.was[i] !== -1) (k.was[i] = -1), (shadows ||= cast);
					continue;
				}
				const { level, fade } = forced >= 0 ? { level: Math.min(forced, k.levels.length), fade: 0 } : choose(size, k.thresholds, k.was[i]);
				if (level !== k.was[i]) shadows ||= cast;
				k.was[i] = level;
				// moved by its controls: its own tree, once it is ready
				const p = k.posed.size ? k.posed.get(i) : undefined;
				if (p && drawPosed(k, i, p, level)) continue;
				const drawn = draw(k, i, level, 1);
				// the coarser one fading in under it, unless it already stands in whole, or is the same drawing
				if (fade > 0 && drawn !== level + 1 && as(k, drawn) !== as(k, level + 1)) draw(k, i, level + 1, fade);
			}
		}
		pictures.end();
		for (const k of kinds.values())
			for (const p of k.posed.values())
				if (p.tree && p.tree.visible !== p.shown) {
					p.shown = p.tree.visible;
					shadows = true;
				}
		let tris = counted.tris + pictures.drawn * 2, calls = counted.calls + (pictures.pages && pictures.drawn ? 1 : 0);
		const now = performance.now();
		for (const k of kinds.values())
			for (const lv of k.levels)
				for (const d of lv.meshes ?? []) {
					const m = d.mesh;
					m.count = d.used;
					m.visible = d.used > 0;
					if (!m.visible) continue;
					lv.seen = now;
					m.instanceMatrix.clearUpdateRanges();
					m.instanceMatrix.addUpdateRange(0, d.used * 16);
					m.instanceMatrix.needsUpdate = true;
					const f = m.geometry.attributes.aFade;
					f.clearUpdateRanges();
					f.addUpdateRange(0, d.used);
					f.needsUpdate = true;
					const w = m.geometry.attributes.aWind;
					if (w) {
						w.clearUpdateRanges();
						w.addUpdateRange(0, d.used * 4);
						w.needsUpdate = true;
					}
					if (m.instanceColor) m.instanceColor.needsUpdate = true;
					tris += d.draw.tris * d.used;
					calls++;
				}
		counted.pictures = pictures.drawn;
		counted.tris = tris;
		counted.calls = calls;
		// the levels no copy wanted for a while let go of (the device's budget: a phone's memory holds the near ones only)
		const after = held ? 0 : budget().evict;
		if (after && now - swept > 2000) {
			swept = now;
			for (const k of kinds.values()) k.levels.forEach((lv, L) => lv.state === 'ready' && L !== k.base && now - (lv.seen ?? now) > after && evict(k, L));
		}
		// what casts a shadow changed: the shadows drawn again (a world whose sky draws them only when it must)
		if (shadows) {
			if (o.onShadows) o.onShadows();
			else renderer.shadowMap.needsUpdate = true;
		}
		shadows = false;
		return true;
	}

	/**
	 * Waits for every kind used so far to have its coarsest shape (or to have failed); `onKind` hears each one come.
	 * `every`: and each of its other levels too, asked for now (for a film, whose frames must never draw a shape while
	 * a finer one is still coming).
	 * @param {(done: number, of: number) => void} [onKind] @param {boolean} [every]
	 */
	async function ready(onKind, every = false) {
		// a film's every shape kept from now on: none let go of while its shots are drawn (`evict`)
		if (every) held = true;
		const list = [...kinds.values()];
		let done = 0;
		await Promise.all(
			list.map((k) =>
				k.ready.then(async () => {
					if (every && k.ok) await Promise.all(k.levels.map((_, L) => want(k, L).catch(() => {})));
					onKind?.(++done, list.length);
				})
			)
		);
		return list;
	}

	/** how much it draws now, and how much it holds */
	function stats() {
		const list = [...kinds.values()];
		return {
			kinds: list.length,
			loaded: list.filter((k) => k.ok).length,
			failed: list.filter((k) => k.error).map((k) => ({ label: k.label, error: k.error })),
			copies: list.reduce((a, k) => a + k.alive.subarray(0, k.n).reduce((x, y) => x + y, 0), 0),
			levels: counted.levels.slice(0, Math.max(...list.map((k) => k.levels.length), 1)),
			pictures: counted.pictures,
			posed: counted.posed,
			culled: counted.culled,
			tris: counted.tris,
			calls: counted.calls,
			materials: presets.size,
			pages: pictures.pages,
			building: queue.length + loads + compiling + lowering.busy,
			builds: list.reduce((a, k) => a + k.levels.filter((l) => l.state === 'ready' && l.from !== 'made' && l.from !== 'kept').length, 0),
			/** the levels made by simplifying a build (here, or read from this device's cache), and those of them it took nothing from */
			made: list.reduce((a, k) => a + k.levels.filter((l) => l.state === 'ready' && (l.from === 'made' || l.from === 'kept')).length, 0),
			/** what this renderer simplified and photographed itself, and what it read from this device's cache instead (./levels.js) */
			derived: kept.counted.derived,
			keptLevels: kept.counted.keptLevels,
			taken: kept.counted.taken,
			keptPictures: kept.counted.keptPictures,
			/** the builds built in the boxes now (not read from this device's cache), and the pictures taken of builds that were */
			boxed: list.reduce((a, k) => a + k.levels.filter((l) => l.state === 'ready' && l.from === 'box').length, 0),
			retaken,
			/** what was made and could not be kept on this device, and why (the last) */
			unkept: kept.counted.unkept,
			unkeptWhy: kept.counted.why,
			/** what is still being kept on this device (pictures being read back, files waiting to be written) */
			keeping: kept.counted.keeping,
			same: list.reduce((a, k) => a + k.levels.filter((l) => l.state === 'ready' && l.as >= 0).length, 0)
		};
	}

	/**
	 * A build, as ../load.js `loadAsset` hands it over (from this device's cache, else built in the renderer's boxes,
	 * in line with the kinds' builds): for a world that puts a build into its scene itself (MaiaCity V1's tent, its
	 * people), so every build of a page shares the same few boxes, the most wanted first.
	 * @param {string} name `<recipe hash>?its=values` @param {{ rank?: number | (() => number) }} [opts] `rank`: as `use`,
	 *   wanted as much as a kind's coarsest shape of that rank
	 */
	const load = (name, opts) => {
		const r = opts?.rank;
		return build(name, () => 2 * ((typeof r === 'function' ? r() : r) ?? 0) + 1);
	};

	return {
		group,
		use,
		load,
		place,
		move,
		remove,
		give: putAway,
		take: takeOut,
		update,
		ready,
		stats,
		controlsOf,
		pose,
		poseOf,
		/** a copy's controls all back at rest */
		rest: (copy) => unpose(copy.kind, copy.i),
		/** whether a copy is moved from its rest by its controls */
		posed: (copy) => copy.kind.posed.has(copy.i),
		/** every kind used, with its levels */
		kinds: () => [...kinds.values()],
		/** cuts everything open along a plane (what is on its negative side taken away), or closes it (null) */
		cut(/** @type {THREE.Plane | null} */ plane) {
			presets.cut(plane);
			pictures.cut(plane);
			dirty = shadows = true;
		},
		/** asks again, the next frame, what to draw (after something changed that the renderer cannot see) */
		touch: () => (dirty = true),
		/**
		 * Draws every copy at level L whatever its size (0 its finest shape, as a film wants; past its shapes, its
		 * picture), or each at the level its size calls for again (null). A film's alone: a world draws by the selector.
		 * @param {number | null} L
		 */
		force(L) {
			forced = L === null || L === undefined ? -1 : Math.max(0, Math.floor(L));
			dirty = shadows = true;
		},
		dispose() {
			gone = true;
			group.removeFromParent();
			for (const k of kinds.values())
				for (const lv of k.levels)
					for (const d of lv.meshes ?? []) {
						d.mesh.geometry.dispose();
						d.mesh.dispose();
					}
			for (const k of kinds.values()) for (const lv of k.levels) for (const d of lv.level?.draws ?? []) d.geometry.dispose();
			for (const k of kinds.values()) for (const lv of k.levels) lv.obj?.traverse((o) => o.geometry?.dispose());
			lowering.dispose();
			pictures.dispose();
			presets.dispose();
			for (const p of pool) p.box.stop('the renderer was disposed');
			queue.length = line.length = 0;
			kinds.clear();
		}
	};
}
