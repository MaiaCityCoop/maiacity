<!--
	THE RENDER BENCH — a recipe file on this machine shown exactly as play shows an asset, for a developer or an agent
	to look at what it is making, stage by stage, before it is proposed: the same asset box (./box/host.js, the
	sandboxed frame running the frozen engine), the same checks and rebuild (./sources/viewer.js `vaultBuild`), the same
	viewer and paper studio (./VaultAsset.svelte, ./stage.js). Only where the recipe comes from differs: handed in by the
	page's caller (`scripts/render.mjs`) instead of read from play's catalog, and held to its own hash like any other.

	Driven from outside through `window.__render`:
	  load({ code, id, v, variant?, label? })   a readable source (wrapped into its recipe file as play wraps one,
	                                            ./engines.js `recipeFile`) or a recipe file; shown; gives its hash,
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
	Only in development (../../../routes/render/+page.svelte).

	Opened by a person: `/render/?load=<manifest.json>` loads a recipe and the assets it names by itself, for walking it
	in a browser before it is proposed (a building with its plants, things and floor). The manifest:
	`{ recipe: { file, id, v }, guests: [{ file, id, v, variant?, as?, refs? }], pieces?: [{ file, as? }] }`, files
	beside it, as render.mjs's --guests and --pieces (a piece's `as`, the hash the recipe names, replaced by the one it is
	held by here).
-->
<script>
	// @ts-nocheck — plain JS
	import { onMount, tick } from 'svelte';
	import VaultAsset from './VaultAsset.svelte';
	import { AssetBox } from './box/host.js';
	import { LATEST, RECIPE_HEAD, recipeFile } from './engines.js';
	import { hashText } from './builds.js';
	import { admitHanded } from './catalog.js';
	import { handPiece, handedPieces } from './box/pieces.js';

	/** the recipes handed in, as the viewer reads a catalog (./catalog.js `source`) */
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
			const m = await (await fetch(base)).json();
			const text = async (f) => (await fetch(new URL(f, base))).text();
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

	window.__render = {
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
