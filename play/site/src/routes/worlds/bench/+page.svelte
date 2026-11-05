<!--
	THE WORLD BENCH (/worlds/bench/, development only): a world on this machine, and the guests it names, run as the
	Worlds page runs one (its build in the asset box, kept running if it moves, its guests drawn, lit and heard) before
	any of it is proposed or accepted; driven by scripts/render.mjs --world. In a production build an empty page.

	Driven through `window.__worldBench` (`window.__world` is the film camera's, $lib/content/worlds/film.js):
	  guest({ code, id, v, variant?, refs? })   a readable source (or a recipe file) handed to the page's catalog: an
	                                            asset the world names by hash; gives the hash it is held by here
	  load({ code, id, v, values? })            the world itself, handed in the same way and shown; gives its hash,
	                                            card and what it says (mood, sounds, views)
	  seek(t)                                   the world brought to time t as a film brings it: where each guest is
	  shot({ run?, eye?, target?, view?, mode? }) the world run on for `run` s, the camera put at `eye` looking at
	                                            `target` (m), or at a view it names, or in a street mode; then settled
	                                            (its guests built for where the camera looks): the caller takes its
	                                            picture; gives what it draws
-->
<script>
	// @ts-nocheck — plain JS
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	let Stage = $state(null);
	let props = $state.raw(null);
	let view = null;

	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const frames = (n = 2) => new Promise((done) => {
		const step = () => (n-- <= 0 ? done() : requestAnimationFrame(step));
		requestAnimationFrame(step);
	});

	onMount(async () => {
		if (!dev) return;
		const [{ default: S }, eng, builds, cat, host] = await Promise.all([
			import('$lib/content/worlds/WorldStage.svelte'),
			import('$lib/content/assets/engines.js'),
			import('$lib/content/assets/builds.js'),
			import('$lib/content/assets/catalog.js'),
			import('$lib/content/assets/box/host.js')
		]);
		Stage = S;
		const { LATEST, RECIPE_HEAD, recipeFile } = eng;
		/** a handed source held to its hash, its card read in a box of its own, kept in the page's catalog */
		async function hand({ code, id, v, variant = null, refs = null }) {
			const file = code.startsWith(RECIPE_HEAD) ? code : recipeFile(code, id, v, variant);
			const hash = builds.hashText(file);
			const box = new host.AssetBox({ engine: LATEST.v });
			let card;
			try {
				card = (await box.build({ hash, code: file })).card;
			} finally {
				box.stop('the bench read its card');
			}
			for (const p of refs ? card.catalog?.parts ?? [] : []) {
				const [name, q] = String(p.ref ?? '').split('?');
				if (refs[name]) p.ref = refs[name] + (q ? `?${q}` : '');
			}
			cat.admitHanded([{ hash, code: file, group: card.group, id: card.id ?? id, v: card.version ?? v, variant, label: card.label ?? id, params: card.params ?? [], card }]);
			return { hash, card };
		}
		const settled = async (timeout = 600_000) => {
			const t0 = performance.now();
			await frames(4);
			while (performance.now() - t0 < timeout && (view.state.phase === 'building' || view.building() > 0)) await frames(4);
			await frames(4);
		};
		window.__worldBench = {
			async guest(x) {
				const { hash, card } = await hand(x);
				return { hash, label: card.label };
			},
			async load({ values = {}, ...x }) {
				const { hash, card } = await hand(x);
				props = { source: cat.source, engine: LATEST.v, hash, given: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])), onview: (v) => (view = v), bare: true };
				for (let i = 0; i < 600 && !view; i++) await sleep(50);
				for (let i = 0; i < 6000 && view.state.phase !== 'shown' && view.state.phase !== 'failed'; i++) await sleep(50);
				if (view.state.phase === 'failed') throw new Error(view.state.error);
				await settled();
				return { hash, card, label: view.state.label, views: view.state.views, moves: view.state.moves, size: view.state.size };
			},
			async shot({ run = 0, eye, target, view: name, mode } = {}) {
				const t0 = performance.now();
				if (mode) view.mode(mode);
				if (name) view.look(name);
				else if (eye) view.place(eye, target ?? [0, 0, 0]);
				// the world run on, in its own time: as many seconds as asked, by the page's clock
				if (run > 0) {
					const until = view.state.t + run;
					while (view.state.t < until) await frames(2);
				}
				await settled();
				const s = view.state;
				let triangles = 0;
				view.renderer.info.autoReset = true;
				triangles = view.renderer.info.render.triangles;
				return { ms: Math.round(performance.now() - t0), t: +s.t.toFixed(1), live: s.live, guests: s.guests, kinds: s.kinds, missing: s.missing, lit: s.lit, fps: s.fps, triangles, calls: view.renderer.info.render.calls };
			},
			/** the world brought to time t, as a film brings it (seek, settle): where each guest stands then */
			async seek(t) {
				// the page's own clock stopped: only the seeks move the world
				view.pause(true);
				view.seek(t);
				await view.settle();
				return view.plantings.guests().map((g) => (g.away ? null : [g.node.position.x, g.node.position.z].map((x) => +x.toFixed(3))));
			},
			stats: () => ({ ...view.state, building: view.building() }),
			/** the world view itself, for a look in the console */
			get view() {
				return view;
			}
		};
	});
</script>

{#if Stage && props}
	<main class="bench"><Stage {...props} /></main>
{:else if !dev}
	<main class="page"><p class="muted">The world bench runs only in development (play/site: bun run dev, then scripts/render.mjs --world).</p></main>
{/if}

<style>
	.bench {
		position: fixed;
		inset: 0;
	}
</style>
