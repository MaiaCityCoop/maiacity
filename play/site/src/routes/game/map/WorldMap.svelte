<!--
	The game's world map on the whole screen, in 3D: the map ./map.ts grows from a seed, drawn by ./scene.ts. Drag to
	pan, right-drag or two fingers to turn and tilt, wheel or pinch to zoom. Pointing at a plot lights it; tapping it
	shows its biome, size and what it gives. The seed is in the address (?seed=), so a map can be shared; the dice
	grows a new one. Nothing is built on it yet; the Empty | City switch shows it as it could be built up (./city.ts:
	a tower and its domes on every plot, fruit trees between them, deep jungle between the plots), kept in the address too
	(?view=city).

	With `film` (./film, development only) it is the map under the film camera (scripts/flyover): nothing moves by
	itself, the bar shows only when a shot asks for it, and `window.__mapFilm` takes the shots' frames (below).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { BIOMES, generateMap, randomSeed, terrain, type Biome, type Plot, type WorldMap, UNBUILDABLE } from './map';
	import { createWorld, type World } from './scene';

	let { film = false }: { film?: boolean } = $props();

	let canvas: HTMLCanvasElement;
	let draft = $state('');
	// raw: a map is only ever replaced whole, and the scene and the city read hundreds of thousands of its features
	let map = $state.raw<WorldMap | null>(null);
	let picked = $state<Plot | null>(null);
	let hovered = $state<Plot | null>(null);
	let world: World | null = null;
	let view = $state<'empty' | 'city'>('empty');
	// in a film the bar shows only when a shot asks for it
	let filmBar = $state(false);
	const bar = $derived(!film || filmBar);
	let shutter = $state<HTMLCanvasElement>();

	const counts = $derived.by(() => {
		const c: Record<Biome, number> = { river: 0, forest: 0, grass: 0, sand: 0, mountain: 0 };
		for (const p of map?.plots ?? []) c[p.biome]++;
		return c;
	});

	function grow(seed: string) {
		draft = seed;
		picked = hovered = null;
		world?.dispose();
		map = generateMap(seed);
		world = createWorld(
			canvas,
			map,
			{
				hover: (p) => (hovered = p),
				pick: (p) => {
					picked = p && picked?.id !== p.id ? p : null;
					world?.select(picked?.id ?? null);
				}
			},
			film
		);
		world.city(view === 'city');
		if (film) return filmed(map);
		const url = new URL(location.href);
		url.searchParams.set('seed', seed);
		replaceState(url, {});
	}

	function show(next: 'empty' | 'city') {
		view = next;
		world?.city(next === 'city');
		if (film) return;
		const url = new URL(location.href);
		if (next === 'city') url.searchParams.set('view', 'city');
		else url.searchParams.delete('view');
		replaceState(url, {});
	}

	function close() {
		picked = null;
		world?.select(null);
	}

	const km2 = (m2: number) => (m2 / 1e6).toLocaleString('en', { maximumFractionDigits: 2 });
	const num = (n: number) => n.toLocaleString('en');
	const totals = $derived.by(() => ({ people: (map?.plots ?? []).reduce((t, p) => t + p.people, 0), area: (map?.plots ?? []).reduce((t, p) => t + p.area, 0) }));

	/**
	 * The film camera's hold on the map, `window.__mapFilm` (scripts/flyover drives it; world units: x east, z south, y up,
	 * the map's centre at 0, one unit about 11 m):
	 *   info                     the map: its seed, size and people, its villages (plots, each centre at `c` [x, z]), its
	 *                            river, lakes and peaks, for a shot list to aim at
	 *   height(x, z)             the ground there
	 *   frame({ poses, ui, city }) one frame: the map shown empty or as the City, the bar on or off, drawn from each pose
	 *                            { eye, at, fov } in turn and their pictures added up evenly (a shutter's motion blur)
	 */
	function filmed(m: NonNullable<typeof map>) {
		const X = (x: number) => x - m.width / 2, Z = (y: number) => y - m.height / 2, ground = terrain(m.seed, m.river, m.massif);
		const centre = (ring: [number, number][]) => [X(ring.reduce((t, [x]) => t + x, 0) / ring.length), Z(ring.reduce((t, [, y]) => t + y, 0) / ring.length)];
		(window as any).__mapFilm = {
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
		if (new URLSearchParams(location.search).get('view') === 'city') view = 'city';
		grow(new URLSearchParams(location.search).get('seed') || randomSeed());
		return () => world?.dispose();
	});
</script>

<div class="world" class:pointing={!!hovered} class:film>
	<canvas bind:this={canvas} oncontextmenu={(e) => e.preventDefault()}></canvas>
	{#if film}<canvas class="shutter" bind:this={shutter} hidden></canvas>{/if}

	<header class="bar" hidden={!bar}>
		<form
			class="seed chip"
			onsubmit={(e) => {
				e.preventDefault();
				if (draft.trim()) grow(draft.trim());
			}}
		>
			<label for="seed">Seed</label>
			<input id="seed" bind:value={draft} spellcheck="false" autocomplete="off" />
			<button type="button" title="A new map" aria-label="A new map" onclick={() => grow(randomSeed())}>⚄</button>
		</form>
		<div class="views chip" role="group" aria-label="What the map shows">
			<button type="button" class:on={view === 'empty'} aria-pressed={view === 'empty'} onclick={() => show('empty')}>Empty</button>
			<button type="button" class:on={view === 'city'} aria-pressed={view === 'city'} onclick={() => show('city')}>City</button>
		</div>
		<ul class="legend chip">
			{#each Object.entries(BIOMES).filter(([key]) => !UNBUILDABLE.includes(key as Biome)) as [key, b] (key)}
				<li><i style:background={b.colour}></i>{b.label}<small>{counts[key as Biome]}</small></li>
			{/each}
			<li class="wild"><i style:background={BIOMES.mountain.colour}></i>Mountains<small>not buildable</small></li>
		</ul>
		{#if map}
			<p class="totals chip">{num(map.plots.length)} villages · {num(totals.people)} people · {num(Math.round(totals.area / 1e6))} km²</p>
		{/if}
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
	/* in a film the bar is read on a phone, a tall frame of 1080 px across: shown larger, as a phone shows it */
	.film .bar { zoom: 1.75; }
	.bar { position: absolute; top: 14px; left: 16px; right: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; pointer-events: none; }
	.chip { pointer-events: auto; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 14px; box-shadow: 0 2px 0 #e7d9b8, 0 8px 20px rgb(110 85 40 / 0.1); }
	.seed { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.35rem 0.3rem 0.8rem; }
	.seed label { font-size: 0.8rem; color: var(--muted); }
	.seed input { width: 8.5em; border: 0; background: transparent; font: inherit; color: var(--ink); padding: 0.25rem 0; outline: none; }
	.seed button { border: 1px solid #e3d3ad; background: #fff9ec; border-radius: 10px; width: 2.1rem; height: 2.1rem; font-size: 1.25rem; line-height: 1; cursor: pointer; color: var(--ink); }
	.views { display: flex; gap: 0.2rem; padding: 0.3rem; }
	.views button { border: 0; background: transparent; border-radius: 10px; padding: 0.35rem 0.8rem; font: inherit; font-size: 0.85rem; color: var(--ink-soft); cursor: pointer; }
	.views button.on { background: #f3e2b8; color: var(--ink); box-shadow: inset 0 0 0 1px #e3d3ad; }
	.legend { display: flex; flex-wrap: wrap; gap: 0.2rem 0.9rem; list-style: none; margin: 0; padding: 0.55rem 0.9rem; font-size: 0.85rem; color: var(--ink-soft); }
	.legend li { display: flex; align-items: center; gap: 0.35rem; }
	.legend small { color: var(--muted); }
	.totals { margin: 0; padding: 0.55rem 0.9rem; font-size: 0.85rem; color: var(--ink-soft); }
	i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; }
	.plot { position: absolute; left: 16px; bottom: var(--nav-room); width: min(300px, calc(100vw - 32px)); padding: 1rem 1.2rem; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 16px; box-shadow: 0 2px 0 #e7d9b8, 0 8px 20px rgb(110 85 40 / 0.12); }
	.plot h2 { margin: 0.1rem 0 0.3rem; font-family: var(--font-display); font-size: 1.4rem; }
	.plot p { margin: 0.2rem 0; }
	.kicker { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
	.close { position: absolute; top: 0.5rem; right: 0.7rem; border: 0; background: none; font-size: 1.4rem; color: var(--muted); cursor: pointer; }
</style>
