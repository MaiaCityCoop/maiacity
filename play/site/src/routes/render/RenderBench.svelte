<!--
	THE RENDER BENCH — a recipe file on this machine shown exactly as play shows an asset, for a developer or an agent
	to look at what it is making, stage by stage, before it is proposed: the same asset box (content/assets/box/host.js,
	the sandboxed frame running the frozen engine), the same checks and rebuild (content/assets/load.js
	`vaultBuild`), the same viewer and paper studio (content/assets/VaultAsset.svelte, stage.js). Only where the recipe
	comes from differs: handed in by the page's caller (`scripts/render.mjs`) instead of read from play's catalog, and held to its own hash like any other.

	Driven from outside through `window.__render`:
	  load({ code, id, v, variant?, label? })   a readable source (wrapped into its recipe file as play wraps one,
	                                            box/engines.js `recipeFile`) or a recipe file; shown; gives its hash,
	                                            card and params
	  piece({ code })                           a piece's readable source (play/SPEC.md §4.5), handed to the page as
	                                            play's files would hand it: gives the hash a recipe requires it by; a
	                                            recipe loaded after it lists every piece handed in its manifest
	  guest({ code, id, v, variant?, refs? })   a readable source (or a recipe file) handed to the page's catalog, not
	                                            shown: an asset another one names by its build's hash (a dome's
	                                            plants, its biome); gives the hash it is held by here. `refs`: the
	                                            hashes its card's readable refs are held by (a biome's cover kinds,
	                                            `biomes/cover@1:fern`), as play's import rewrote them
	  shot({ values?, camera? })                built with `values` (stage, seed, fruit …), the camera set (`az`, `el`
	                                            degrees round what is framed, `zoom` × the framing's distance, or a
	                                            `target` [x, y, z] and `dist` m), and settled (what it plants built
	                                            too): then the caller takes its picture of the canvas; gives what was
	                                            shown (size, triangles, ms, what it plants)
	  motion({ values?, plan, fps? })           a rigged build moving: its clips as the box wrote them down, played by
	                                            the page's own player (content/assets/clips.js, as crowds play them) along `plan`
	                                            ([{ clip, seconds, speed?, speedTo?, turn?, carry?, blend?, hold? }],
	                                            each blended into the next; `carry`: a clip that travels by itself
	                                            hands its place on) on a copy carried on at each one's speed: every frame's feet
	                                            and hips (their bones' world matrices), for measuring a foot's slide
	  filmStart({ … as motion, camera? })       the same, drawn frame by frame (filmAt(i)), the camera following
	Only in development (+page.svelte beside it).

	Opened by a person: `/render/?load=<manifest.json>` loads a recipe and the assets it names by itself, for walking it
	in a browser before it is proposed (a building with its plants, things and floor). The manifest:
	`{ recipe: { file, id, v }, guests: [{ file, id, v, variant?, as?, refs? }], pieces?: [{ file, as? }] }`, files
	beside it, as render.mjs's --guests and --pieces (a piece's `as`, the hash the recipe names, replaced by the one it is
	held by here).
-->
<script>
	// @ts-nocheck — plain JS
	import { onMount, tick } from 'svelte';
	import VaultAsset from '$lib/content/assets/VaultAsset.svelte';
	import { AssetBox } from '$lib/content/assets/box/host.js';
	import { LATEST, RECIPE_HEAD, recipeFile } from '$lib/content/assets/box/engines.js';
	import { hashText } from '$lib/kernel/hash.js';
	import { siteBlob } from '$lib/api';
	import { admitHanded } from '$lib/content/assets/catalog.js';
	import { handPiece, handedPieces } from '$lib/content/assets/box/pieces.js';

	/** the recipes handed in, as the viewer reads a catalog (content/assets/catalog.js `source`) */
	const index = { engine: LATEST.v, recipes: {} };
	const files = new Map();
	const cards = new Map();
	const source = {
		index,
		recipeAt: async (hash) => {
			if (!files.has(hash)) throw new Error(`no recipe ${hash.slice(0, 12)}… was handed to the bench`);
			return { hash, code: files.get(hash), pieces: handedPieces() };
		},
		nameOf: (hash) => index.recipes[hash]?.label ?? hash.slice(0, 12),
		hashOf: (name) => String(name).split('?')[0],
		cardOf: (hash) => cards.get(hash)
	};

	let hash = $state('');
	let label = $state('');
	let said = $state('Waiting for a recipe (window.__render.load).');

	const frames = (n = 2) => new Promise((done) => {
		const step = () => (n-- <= 0 ? done() : requestAnimationFrame(step));
		requestAnimationFrame(step);
	});
	const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
	/** the viewer's handle, once its stage is up */
	async function viewer() {
		for (let i = 0; i < 600 && !window.__vaultAsset; i++) await sleep(50);
		if (!window.__vaultAsset) throw new Error('the viewer did not open its stage');
		return window.__vaultAsset;
	}
	/** until the build asked for is shown, or failed */
	async function settled(v, want, timeout = 300_000) {
		const t0 = performance.now();
		await frames(3);
		while (performance.now() - t0 < timeout) {
			if (v.error) throw new Error(v.error);
			if (!v.building && v.hero && (!want || v.wanted === want)) return;
			await sleep(60);
		}
		throw new Error('the build took longer than the bench waits');
	}
	/** until what the build plants is built and drawn for where the camera is (or `timeout` ms) */
	async function planted(v, timeout = 600_000) {
		const t0 = performance.now();
		await frames(4);
		while (performance.now() - t0 < timeout && (v.plantings?.building() ?? 0) > 0) await frames(4);
		await frames(4);
	}
	/** the camera, still: no glide or follow moving it any more */
	async function still(camera) {
		let last = '';
		for (let i = 0; i < 200; i++) {
			await frames(2);
			const now = camera.position.toArray().map((x) => x.toFixed(4)).join();
			if (now === last) return;
			last = now;
		}
	}

	/** the card of a recipe file, built once in a box of its own: what it says it is and the parameters it takes */
	async function cardOf(h, file) {
		const box = new AssetBox({ engine: index.engine });
		try {
			return (await box.build({ hash: h, code: file, pieces: handedPieces() })).card;
		} finally {
			box.stop('the bench read its card');
		}
	}

	/** what the page is doing while it opens a manifest by itself */
	let opening = $state('');
	onMount(async () => {
		const at = new URLSearchParams(location.search).get('load');
		if (!at) return;
		try {
			const base = new URL(at, location.href);
			const text = async (f) => (await siteBlob(new URL(f, base).href)).text();
			const m = JSON.parse(await text(base.href));
			const here = {};
			for (const p of m.pieces ?? []) {
				const got = window.__render.piece({ code: await text(p.file) });
				if (p.as) here[p.as] = got.hash;
			}
			let n = 0;
			for (const g of m.guests ?? []) {
				opening = `Building what it names: ${++n} of ${m.guests.length} (${g.id})…`;
				const refs = g.refs ? Object.fromEntries(Object.entries(g.refs).map(([k, h]) => [k, here[h] ?? h])) : null;
				const got = await window.__render.guest({ code: await text(g.file), id: g.id, v: g.v, variant: g.variant ?? null, refs });
				if (g.as) here[g.as] = got.hash;
			}
			let code = await text(m.recipe.file);
			for (const [was, now] of Object.entries(here)) code = code.replaceAll(was, now);
			opening = 'Building it…';
			await window.__render.load({ code, id: m.recipe.id, v: m.recipe.v });
			opening = '';
		} catch (e) {
			opening = `Could not open ${at}: ${e?.message ?? e}`;
		}
	});

	/**
	 * A rigged build moving as a world moves it: its clips as the box wrote them down, played back by the page's own
	 * player (content/assets/clips.js, as a crowd plays them, none of the asset's code) on a copy of its skinned mesh, along a plan
	 * of clips, each blended into the next; the copy carried on by how fast each goes, turned when a quarter turn ends.
	 */
	let moving = null;
	async function movingOf({ values = {}, plan, fps = 30, blendFor = 0.35, camera: cam = null }) {
		const view = await viewer();
		for (const [k, x] of Object.entries(values)) view.set(k, x);
		await tick();
		await settled(view, view.wanted);
		const THREE = await import('three');
		const { clone } = await import('three/addons/utils/SkeletonUtils.js');
		const { playerOf, blend, poser } = await import('$lib/content/assets/clips.js');
		const hero = view.hero;
		const clips = hero?.view?.clips;
		if (!clips?.motion) throw new Error('this build has no clips written down');
		let mesh = null;
		hero.root.traverse((o) => (mesh ??= o.isSkinnedMesh ? o : null));
		if (!mesh) throw new Error('this build has no skinned mesh');
		const copy = clone(hero.root);
		let skinned = null;
		copy.traverse((o) => (skinned ??= o.isSkinnedMesh ? o : null));
		const bones = skinned.skeleton.bones;
		const pose = poser(bones);
		const actor = new THREE.Group();
		actor.add(copy);
		moving?.actor.removeFromParent();
		hero.root.visible = false;
		view.stage.scene.add(actor);
		// the plan, second by second: which clip, its own time, how far it has come and how fast, the heading
		const frames = [];
		let t = 0, dist = 0, heading = 0, x = 0, z = 0;
		const segs = plan.map((s) => ({ ...s }));
		const play = playerOf(clips.motion, clips.bones ?? []);
		let start = 0;
		for (const s of segs) (s.at = start), (start += s.seconds);
		const total = start;
		for (let i = 0; i <= Math.round(total * fps); i++) {
			t = i / fps;
			let k = segs.findIndex((s) => t < s.at + s.seconds);
			if (k < 0) k = segs.length - 1;
			const s = segs[k];
			const u = Math.min(1, (t - s.at) / s.seconds);
			const speed = (s.speed ?? 0) + ((s.speedTo ?? s.speed ?? 0) - (s.speed ?? 0)) * u;
			frames.push({ t, k, local: t - s.at, speed, dist, heading, x, z });
			const dt = 1 / fps;
			dist += speed * dt;
			x += Math.sin(heading) * speed * dt;
			z += Math.cos(heading) * speed * dt;
			if (t + dt >= s.at + s.seconds && t < s.at + s.seconds) {
				// a clip that travels by itself (a start, a stop) hands where it got to on to the next
				if (s.carry) {
					const r = play[s.clip]?.(s.seconds, { dist, speed: 0, turn: 0 })?.root ?? [0, 0, 0];
					s.carried = r;
					x += Math.cos(heading) * r[0] + Math.sin(heading) * r[2];
					z += -Math.sin(heading) * r[0] + Math.cos(heading) * r[2];
				}
				// a quarter turn's heading is the actor's once it ends
				if (s.turn) heading += s.turn;
			}
		}
		const poseAt = (i) => {
			const f = frames[i], s = segs[f.k];
			const at = (seg, local) => {
				const clip = play[seg.clip];
				if (!clip) throw new Error(`no clip ${seg.clip}`);
				return clip(seg.hold ? Math.min(local, seg.hold) : local, { dist: f.dist, speed: f.speed, turn: 0 });
			};
			let p = at(s, f.local);
			// blended in from the one before (its own travel taken off, the actor carries it now)
			const prev = segs[f.k - 1];
			const into = s.blend ?? blendFor;
			if (prev && f.local < into) {
				const q = at(prev, f.t - prev.at);
				if (prev.carried && q.root) q.root = q.root.map((v, c) => (c === 1 ? v : v - prev.carried[c]));
				p = blend(q, p, f.local / into);
			}
			return p;
		};
		moving = { actor, copy, bones, pose, frames, segs, poseAt, fps, total, THREE, cam, view };
		return moving;
	}
	function movingAt(i) {
		const m = moving, f = m.frames[i];
		m.pose(m.poseAt(i));
		m.actor.position.set(f.x, 0, f.z);
		m.actor.rotation.y = f.heading;
		m.actor.updateMatrixWorld(true);
		const by = Object.fromEntries(m.bones.map((b) => [b.name, b]));
		const feet = {};
		for (const n of ['leftFoot', 'rightFoot', 'leftToes', 'rightToes', 'hips']) if (by[n]) feet[n] = by[n].matrixWorld.toArray().map((v) => +v.toFixed(5));
		return { t: +f.t.toFixed(4), clip: m.segs[f.k].clip, speed: +f.speed.toFixed(3), dist: +f.dist.toFixed(4), heading: f.heading, at: [f.x, f.z], bones: feet };
	}

	window.__render = {
		/** a plan of clips played as the page plays them, measured: every frame's feet (their bones' world matrices) */
		async motion(o) {
			const m = await movingOf(o);
			const out = [];
			for (let i = 0; i < m.frames.length; i++) out.push(movingAt(i));
			return { frames: out, clips: Object.keys(m.view.hero.view.clips.motion.clips) };
		},
		/**
		 * A crowd of one build, as a world draws one (content/assets/render/crowd.js): `n` of them in a grid `spacing` m apart,
		 * walking on at `speed` (each its own time), the nearest `max` within `near` m rigged, the rest drawn from afar;
		 * timed: how long until their builds and clips are here, what posing them costs a frame, the frames a second.
		 */
		async crowd({ hash, n = 200, clip = 'walk', speed = 1.4, seconds = 6, near = 20, max = 50, spacing = 1.6, eye = [0, 1.7, -6], at = [0, 1, 12] }) {
			const view = await viewer();
			const THREE = await import('three');
			const { crowd: make, settled: built } = await import('$lib/content/assets/render/crowd.js');
			const c = make([hash], [n], { near, max });
			if (view.hero) view.hero.root.visible = false;
			moving?.actor.removeFromParent();
			view.stage.scene.add(c.object);
			const { camera, controls } = view;
			camera.position.set(...eye);
			controls.target.set(...at);
			camera.lookAt(controls.target);
			controls.update();
			const cols = Math.ceil(Math.sqrt(n)), span = cols * spacing;
			let posing = 0, count = 0;
			const put = (t) => {
				const p0 = performance.now();
				c.begin();
				for (let i = 0; i < n; i++) {
					const x = ((i % cols) - cols / 2) * spacing, d = speed * t + (i * 0.37) % 1;
					const z = (Math.floor(i / cols) * spacing + d) % span;
					const d2 = (x - eye[0]) ** 2 + (z - eye[2]) ** 2;
					c.put(0, x, 0, z, 0, d2, () => c.clips[0]?.[clip]?.(t + i * 0.37, { dist: d, speed, turn: 0 }) ?? {});
				}
				c.end();
				posing += performance.now() - p0;
			};
			// built: their coarse build and their rigged one, and the box's tables of their clips
			const t0 = performance.now();
			put(0);
			c.want([{ x: eye[0], z: eye[2] }]);
			await built();
			for (let k = 0; k < 600 && !c.clips[0]; k++) await sleep(50);
			const ready = performance.now() - t0;
			if (!c.clips[0]) throw new Error('the crowd\'s rigged build never came');
			put(0);
			await frames(10);
			// played: each frame posed and drawn, for `seconds`
			posing = 0;
			const start = performance.now();
			while (performance.now() - start < seconds * 1000) {
				put((performance.now() - start) / 1000);
				count++;
				await frames(1);
			}
			const ms = performance.now() - start;
			let rigged = 0;
			c.object.traverse((o) => o.isSkinnedMesh && o.visible && o.parent?.visible !== false && rigged++);
			return { n, near, max, readyMs: Math.round(ready), frames: count, fps: +((count * 1000) / ms).toFixed(1), posingMsPerFrame: +(posing / count).toFixed(2), rigged, clips: Object.keys(c.clips[0]) };
		},
		/** the same, one frame at a time, drawn: the camera following (`camera`: its offset from the hips, m) */
		async filmStart(o) {
			const m = await movingOf(o);
			return { frames: m.frames.length };
		},
		async filmAt(i) {
			const m = moving;
			const got = movingAt(i);
			const { camera, controls } = m.view;
			const hips = new m.THREE.Vector3().setFromMatrixPosition(new m.THREE.Matrix4().fromArray(got.bones.hips));
			const off = new m.THREE.Vector3(...(m.cam?.offset ?? [2.6, 1.1, 3.2]));
			const look = new m.THREE.Vector3(hips.x, (m.cam?.lookY ?? 0.95), hips.z);
			controls.target.copy(look);
			camera.position.copy(look).add(off);
			camera.lookAt(look);
			controls.update();
			await frames(2);
			return got;
		},
		piece({ code }) {
			return { hash: handPiece(code) };
		},
		async guest({ code, id, v, variant = null, refs = null }) {
			const file = code.startsWith(RECIPE_HEAD) ? code : recipeFile(code, id, v, variant);
			const h = hashText(file);
			const card = await cardOf(h, file);
			for (const p of refs ? card.catalog?.parts ?? [] : []) {
				const [name, q] = String(p.ref ?? '').split('?');
				if (refs[name]) p.ref = refs[name] + (q ? `?${q}` : '');
			}
			admitHanded([{ hash: h, code: file, group: card.group, id: card.id ?? id, v: card.version ?? v, variant, label: card.label ?? id, params: card.params ?? [], card }]);
			return { hash: h, label: card.label };
		},
		async load({ code, id, v, variant = null, label: name = '' }) {
			const file = code.startsWith(RECIPE_HEAD) ? code : recipeFile(code, id, v, variant);
			const h = hashText(file);
			files.set(h, file);
			// built once in a box of its own for its card: what it says it is and the parameters it takes
			const box = new AssetBox({ engine: index.engine });
			let built;
			try {
				built = await box.build({ hash: h, code: file, pieces: handedPieces() });
			} finally {
				box.stop('the bench read its card');
			}
			const card = built.card;
			cards.set(h, card);
			index.recipes[h] = { group: card.group, id: card.id ?? id, v: card.version ?? v, variant, label: name || card.label || id, ...(card.params?.length ? { params: card.params } : {}) };
			label = index.recipes[h].label;
			said = '';
			hash = h;
			await tick();
			const view = await viewer();
			await settled(view);
			return { hash: h, card, params: card.params ?? [] };
		},
		async shot({ values = {}, camera: c = {} } = {}) {
			const view = await viewer();
			for (const [k, x] of Object.entries(values)) view.set(k, x);
			await tick();
			const t0 = performance.now();
			await settled(view, view.wanted);
			await planted(view);
			const ms = Math.round(performance.now() - t0);
			const { camera, controls } = view;
			await still(camera);
			const THREE = await import('three');
			if (c.target) controls.target.set(...c.target);
			const off = camera.position.clone().sub(controls.target);
			const dist = c.dist ?? off.length() * (c.zoom ?? 1);
			const az = c.az !== undefined ? (c.az * Math.PI) / 180 : Math.atan2(off.x, off.z);
			const el = c.el !== undefined ? (c.el * Math.PI) / 180 : Math.asin(Math.max(-1, Math.min(1, off.y / off.length())));
			camera.position.copy(controls.target).add(new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist));
			camera.lookAt(controls.target);
			controls.update();
			await frames(8);
			// the camera moved: what it plants built finer where it now looks closer
			await planted(view);
			let triangles = 0;
			view.stage.root?.traverse((o) => {
				if (o.isMesh && o.geometry) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
			});
			const box = view.stage.root ? new THREE.Box3().setFromObject(view.stage.root) : null;
			return { values: { ...view.values }, ms, triangles: Math.round(triangles), size: box ? box.getSize(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)) : null, note: view.hero?.view?.note ?? '', planted: { ...(view.plantings?.state ?? {}) } };
		}
	};
</script>

<main class="bench">
	{#if opening}<p class="opening">{opening}</p>{/if}
	{#if hash}
		{#key hash}
			<VaultAsset {source} {hash} title={label} fill />
		{/key}
	{:else}
		<p class="muted">{said}</p>
	{/if}
</main>

<style>
	.opening {
		position: fixed;
		inset: 1rem auto auto 1rem;
		z-index: 10;
		padding: 0.5rem 0.8rem;
		border-radius: 0.5rem;
		background: rgb(255 255 255 / 0.9);
		font-size: 0.9rem;
	}
	.bench {
		height: 100vh;
		padding: 0;
	}
</style>
