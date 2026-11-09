<!--
	The game's world map on the whole screen, in 3D: the map ./map.ts grows from the game's one seed (SEED: the same map
	for everyone, always), drawn by ./scene.ts. Drag to pan, right-drag or two fingers to turn and tilt, wheel or pinch
	to zoom. Pointing at a plot lights it; tapping it shows its biome, size and what it gives. Nothing is built on it
	yet; the Empty | City switch shows it as it could be built up (./city.ts: a tower and its domes on every plot, fruit
	trees between them, deep jungle between the plots), kept in the address (?view=city). The switch, the legend and the
	totals are one compact row at the top.

	With `film` (./film, development only) it is the map under the film camera (scripts/flyover): nothing moves by
	itself, the address is left alone, the bar shows only when a shot asks for it, and `window.__mapFilm` takes the
	shots' frames (below).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { BIOMES, generateMap, SEED, terrain, type Biome, type Plot, type WorldMap, UNBUILDABLE } from './map';
	import { createWorld, type World } from './scene';

	let { film = false }: { film?: boolean } = $props();

	let canvas: HTMLCanvasElement;
	// raw, never proxied: the scene reads the whole map (every plot, point and tree) and grows the city from it, and through
	// Svelte's deep proxy that took a minute and froze a phone
	let map = $state.raw<WorldMap | null>(null);
	let picked = $state.raw<Plot | null>(null);
	let hovered = $state.raw<Plot | null>(null);
	let world: World | null = null;
	let view = $state<'empty' | 'city'>('empty');
	/** the city is being grown (the first time it is shown) */
	let growing = $state(false);
	// in a film the bar shows only when a shot asks for it
	let filmBar = $state(false);
	const bar = $derived(!film || filmBar);
	let shutter = $state<HTMLCanvasElement>();

	const counts = $derived.by(() => {
		const c: Record<Biome, number> = { river: 0, forest: 0, grass: 0, sand: 0, mountain: 0 };
		for (const p of map?.plots ?? []) c[p.biome]++;
		return c;
	});
	const buildable = Object.entries(BIOMES).filter(([key]) => !UNBUILDABLE.includes(key as Biome)) as [Biome, (typeof BIOMES)[Biome]][];
	/** a biome's name in the legend on a phone, where it is shorter */
	const SHORT: Partial<Record<Biome, string>> = { grass: 'Grass' };

	function show(next: 'empty' | 'city') {
		view = next;
		if (world) {
			growing = next === 'city';
			void world.city(next === 'city').then(() => (growing = false));
		}
		if (film) return;
		const url = new URL(location.href);
		if (next === 'city') url.searchParams.set('view', 'city');
		else url.searchParams.delete('view');
		// the map is the one world's: an address from before, with a ?seed= of its own, loses it
		url.searchParams.delete('seed');
		replaceState(url, {});
	}

	function close() {
		picked = null;
		world?.select(null);
	}

	const km2 = (m2: number) => (m2 / 1e6).toLocaleString('en', { maximumFractionDigits: 2 });
	const num = (n: number) => n.toLocaleString('en');
	const short = (n: number) => n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 2 });
	const totals = $derived.by(() => ({ people: (map?.plots ?? []).reduce((t, p) => t + p.people, 0), area: (map?.plots ?? []).reduce((t, p) => t + p.area, 0) }));

	/**
	 * The film camera's hold on the map, `window.__mapFilm`, there once the city is grown (scripts/flyover drives it;
	 * world units: x east, z south, y up, the map's centre at 0, one unit about 11 m):
	 *   info                       the map: its seed, size and people, its villages (plots, each centre at `c` [x, z]),
	 *                              its river, lakes and peaks, for a shot list to aim at
	 *   height(x, z)               the ground there
	 *   frame({ poses, ui, city }) one frame: the map shown empty or as the City, the bar on or off, drawn from each
	 *                              pose { eye, at, fov } in turn and their pictures added up evenly (a shutter's blur)
	 */
	async function filmed(m: WorldMap) {
		await world!.city(true);
		const X = (x: number) => x - m.width / 2, Z = (y: number) => y - m.height / 2, ground = terrain(m.seed, m.river, m.massif);
		const centre = (ring: [number, number][]) => [X(ring.reduce((t, [x]) => t + x, 0) / ring.length), Z(ring.reduce((t, [, y]) => t + y, 0) / ring.length)];
		(window as Window & { __mapFilm?: object }).__mapFilm = {
			info: {
				seed: m.seed,
				width: m.width,
				height: m.height,
				scale: m.scale,
				villages: m.plots.length,
				people: totals.people,
				area: totals.area,
				plots: m.plots.map((p) => ({ id: p.id, biome: p.biome, c: [X(p.centre[0]), Z(p.centre[1])], people: p.people })),
				river: m.river.map(([x, y]) => [X(x), Z(y)]),
				lakes: m.lakes.map((ring) => ({ c: centre(ring), ring: ring.map(([x, y]) => [X(x), Z(y)]) })),
				peaks: m.massif.peaks.map(([x, y]) => [X(x), Z(y)])
			},
			height: (x: number, z: number) => ground(x + m.width / 2, z + m.height / 2),
			frame({ poses, ui = false, city = true }: { poses: { eye: number[]; at: number[]; fov: number }[]; ui?: boolean; city?: boolean }) {
				if ((view === 'city') !== city) show(city ? 'city' : 'empty');
				filmBar = ui;
				const sum = shutter!, add = sum.getContext('2d')!;
				sum.width = canvas.width;
				sum.height = canvas.height;
				poses.forEach((p, k) => {
					world!.frame(p.eye, p.at, p.fov);
					// the running mean: the k-th picture weighs 1/(k+1) over the mean of those before it
					add.globalAlpha = 1 / (k + 1);
					add.drawImage(canvas, 0, 0);
				});
				sum.hidden = poses.length < 2;
			}
		};
	}

	onMount(() => {
		map = generateMap(SEED);
		world = createWorld(
			canvas,
			map!,
			{
				hover: (p) => (hovered = p),
				pick: (p) => {
					picked = p && picked?.id !== p.id ? p : null;
					world?.select(picked?.id ?? null);
				}
			},
			film
		);
		show(film || new URLSearchParams(location.search).get('view') === 'city' ? 'city' : 'empty');
		if (film) void filmed(map!);
		return () => world?.dispose();
	});
</script>

<div class="world" class:pointing={!!hovered} class:film>
	<canvas bind:this={canvas} oncontextmenu={(e) => e.preventDefault()}></canvas>
	{#if film}<canvas class="shutter" bind:this={shutter} hidden></canvas>{/if}

	<header class="bar" hidden={!bar}>
		<div class="row chip">
			<div class="views" role="group" aria-label="What the map shows">
				<button type="button" class:on={view === 'empty'} aria-pressed={view === 'empty'} onclick={() => show('empty')}>Empty</button>
				<button type="button" class:on={view === 'city'} class:growing aria-pressed={view === 'city'} aria-busy={growing} onclick={() => show('city')}>City</button>
			</div>
			<ul class="legend">
				{#each buildable as [key, b] (key)}
					<li>
						<i style:background={b.colour}></i>{#if SHORT[key]}<span class="long">{b.label}</span><span class="short">{SHORT[key]}</span>{:else}{b.label}{/if}<small>{counts[key]}</small>
					</li>
				{/each}
				<li title="Mountains are wild land: no plots, nobody builds there"><i style:background={BIOMES.mountain.colour}></i>Mountain<small>wild</small></li>
			</ul>
			{#if map}
				<p class="totals" title="{num(map.plots.length)} villages · {num(totals.people)} people · {num(Math.round(totals.area / 1e6))} km²">
					{num(map.plots.length)} villages · {short(totals.people)} people · {num(Math.round(totals.area / 1e6))} km²
				</p>
			{/if}
		</div>
	</header>

	{#if picked}
		<aside class="card plot">
			<button class="close" aria-label="Close" onclick={close}>×</button>
			<p class="kicker"><i style:background={BIOMES[picked.biome].colour}></i>{BIOMES[picked.biome].label}</p>
			<h2>Plot {picked.id}</h2>
			<p>{km2(picked.area)} km² · room for {num(picked.people)} people</p>
			<p>Gives {BIOMES[picked.biome].gives.join(' and ')}</p>
			<p class="muted">Free. Nothing is built here yet.</p>
		</aside>
	{/if}
</div>

<style>
	.world { position: fixed; inset: 0; background: #efe7d6; overflow: hidden; touch-action: none; user-select: none; }
	canvas { display: block; width: 100%; height: 100%; cursor: grab; }
	canvas:active { cursor: grabbing; }
	.pointing canvas { cursor: pointer; }
	.shutter { position: absolute; inset: 0; }
	.shutter[hidden], .bar[hidden] { display: none; }
	/* in a film (9:16, watched on a phone) the bar is larger and wrapped to the frame, its totals on a line of their own */
	.film .bar { zoom: 1.6; }
	.film .row { flex-wrap: wrap; justify-content: center; row-gap: 0.3rem; overflow: visible; padding: 0.3rem 0.6rem; }
	.film .totals { flex-basis: 100%; text-align: center; border-left: 0; padding: 0 0 0.15rem; }
	/* one compact row at the top: the switch, the legend and the totals; on a phone the legend's names only (no counts),
	   the totals last, reached by scrolling the row sideways */
	.bar { position: absolute; top: 10px; left: 16px; right: 16px; display: flex; justify-content: center; pointer-events: none; }
	.chip { pointer-events: auto; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 12px; box-shadow: 0 2px 0 #e7d9b8, 0 6px 16px rgb(110 85 40 / 0.1); }
	.row { display: flex; align-items: center; gap: 0.7rem; max-width: 100%; overflow-x: auto; scrollbar-width: none; touch-action: pan-x; padding: 0.2rem 0.75rem 0.2rem 0.2rem; font-size: 0.75rem; line-height: 1.2; white-space: nowrap; color: var(--ink-soft); }
	.row::-webkit-scrollbar { display: none; }
	.views { display: flex; flex: none; gap: 0.1rem; padding: 0.1rem; border-radius: 9px; background: #f5ecd6; }
	.views button { border: 0; background: transparent; border-radius: 8px; padding: 0.25rem 0.6rem; font: inherit; color: var(--ink-soft); cursor: pointer; }
	.views button.on { background: #f3e2b8; color: var(--ink); box-shadow: inset 0 0 0 1px #e3d3ad; }
	.views button.growing { animation: growing 0.9s ease-in-out infinite alternate; }
	@keyframes growing { to { opacity: 0.45; } }
	.legend { display: flex; flex: none; gap: 0.65rem; list-style: none; margin: 0; padding: 0; }
	.legend li { display: flex; align-items: center; gap: 0.25rem; }
	.legend small { color: var(--muted); font-size: inherit; }
	.legend .short { display: none; }
	.totals { flex: none; margin: 0; padding-left: 0.7rem; border-left: 1px solid #e3d3ad; }
	@media (max-width: 600px) {
		.bar { left: 8px; right: 8px; }
		.row { gap: 0.4rem; font-size: 0.7rem; padding-right: 0.55rem; }
		.views button { padding: 0.25rem 0.4rem; }
		.legend { gap: 0.4rem; }
		.legend li { gap: 0.2rem; }
		i { width: 0.5rem; height: 0.5rem; }
		.legend small, .legend .long { display: none; }
		.legend .short { display: inline; }
		.totals { padding-left: 0.5rem; }
	}
	i { display: inline-block; flex: none; width: 0.6rem; height: 0.6rem; border-radius: 50%; }
	.plot { position: absolute; left: 16px; bottom: var(--nav-room); width: min(300px, calc(100vw - 32px)); padding: 1rem 1.2rem; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 16px; box-shadow: 0 2px 0 #e7d9b8, 0 8px 20px rgb(110 85 40 / 0.12); }
	.plot h2 { margin: 0.1rem 0 0.3rem; font-family: var(--font-display); font-size: 1.4rem; }
	.plot p { margin: 0.2rem 0; }
	.kicker { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
	.close { position: absolute; top: 0.5rem; right: 0.7rem; border: 0; background: none; font-size: 1.4rem; color: var(--muted); cursor: pointer; }
</style>
