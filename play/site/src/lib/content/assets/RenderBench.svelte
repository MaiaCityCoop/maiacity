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
	  shot({ values?, camera? })                built with `values` (stage, seed, fruit …), the camera set (`az`, `el`
	                                            degrees round what is framed, `zoom` × the framing's distance, or a
	                                            `target` [x, y, z] and `dist` m), and settled: then the caller takes
	                                            its picture of the canvas; gives what was shown (size, triangles, ms)
	Only in development (../../../routes/render/+page.svelte).
-->
<script>
	// @ts-nocheck — plain JS
	import { tick } from 'svelte';
	import VaultAsset from './VaultAsset.svelte';
	import { AssetBox } from './box/host.js';
	import { LATEST, RECIPE_HEAD, recipeFile } from './engines.js';
	import { hashText } from './builds.js';

	/** the recipes handed in, as the viewer reads a catalog (./catalog.js `source`) */
	const index = { engine: LATEST.v, recipes: {} };
	const files = new Map();
	const cards = new Map();
	const source = {
		index,
		recipeAt: async (hash) => {
			if (!files.has(hash)) throw new Error(`no recipe ${hash.slice(0, 12)}… was handed to the bench`);
			return { hash, code: files.get(hash) };
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

	window.__render = {
		async load({ code, id, v, variant = null, label: name = '' }) {
			const file = code.startsWith(RECIPE_HEAD) ? code : recipeFile(code, id, v, variant);
			const h = hashText(file);
			files.set(h, file);
			// built once in a box of its own for its card: what it says it is and the parameters it takes
			const box = new AssetBox({ engine: index.engine });
			let built;
			try {
				built = await box.build({ hash: h, code: file });
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
			let triangles = 0;
			view.stage.root?.traverse((o) => {
				if (o.isMesh && o.geometry) triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
			});
			const box = view.stage.root ? new THREE.Box3().setFromObject(view.stage.root) : null;
			return { values: { ...view.values }, ms, triangles: Math.round(triangles), size: box ? box.getSize(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)) : null, note: view.hero?.view?.note ?? '' };
		}
	};
</script>

<main class="bench">
	{#if hash}
		{#key hash}
			<VaultAsset {source} {hash} title={label} fill />
		{/key}
	{:else}
		<p class="muted">{said}</p>
	{/if}
</main>

<style>
	.bench {
		height: 100vh;
		padding: 0;
	}
</style>
