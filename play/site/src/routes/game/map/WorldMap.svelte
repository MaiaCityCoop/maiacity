<!--
	The game's world map on the whole screen, in 3D: the map ./map.ts grows from a seed, drawn by ./scene.ts. Drag to
	pan, right-drag or two fingers to turn and tilt, wheel or pinch to zoom. Pointing at a plot lights it; tapping it
	shows its biome, size and what it gives. The seed is in the address (?seed=), so a map can be shared; the dice
	grows a new one. Nothing is built on it yet.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { BIOMES, generateMap, randomSeed, type Biome, type Plot, type WorldMap } from './map';
	import { createWorld, type World } from './scene';

	let canvas: HTMLCanvasElement;
	let draft = $state('');
	let map = $state<WorldMap | null>(null);
	let picked = $state<Plot | null>(null);
	let hovered = $state<Plot | null>(null);
	let world: World | null = null;

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
		world = createWorld(canvas, map, {
			hover: (p) => (hovered = p),
			pick: (p) => {
				picked = p && picked?.id !== p.id ? p : null;
				world?.select(picked?.id ?? null);
			}
		});
		const url = new URL(location.href);
		url.searchParams.set('seed', seed);
		replaceState(url, {});
	}

	function close() {
		picked = null;
		world?.select(null);
	}

	const ha = (m2: number) => (m2 / 10000).toLocaleString('en', { maximumFractionDigits: 1 });

	onMount(() => {
		grow(new URLSearchParams(location.search).get('seed') || randomSeed());
		return () => world?.dispose();
	});
</script>

<div class="world" class:pointing={!!hovered}>
	<canvas bind:this={canvas} oncontextmenu={(e) => e.preventDefault()}></canvas>

	<header class="bar">
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
		<ul class="legend chip">
			{#each Object.entries(BIOMES) as [key, b] (key)}
				<li><i style:background={b.colour}></i>{b.label}<small>{counts[key as Biome]}</small></li>
			{/each}
		</ul>
	</header>

	{#if picked}
		<aside class="card plot">
			<button class="close" aria-label="Close" onclick={close}>×</button>
			<p class="kicker"><i style:background={BIOMES[picked.biome].colour}></i>{BIOMES[picked.biome].label}</p>
			<h2>Plot {picked.id}</h2>
			<p>{ha(picked.area)} ha · gives {BIOMES[picked.biome].gives.join(' and ')}</p>
			<p class="muted">Free. Nothing is built here yet.</p>
		</aside>
	{/if}
</div>

<style>
	.world { position: fixed; inset: 0; background: #efe7d6; overflow: hidden; touch-action: none; user-select: none; }
	canvas { display: block; width: 100%; height: 100%; cursor: grab; }
	canvas:active { cursor: grabbing; }
	.pointing canvas { cursor: pointer; }
	.bar { position: absolute; top: 14px; left: 16px; right: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; pointer-events: none; }
	.chip { pointer-events: auto; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 14px; box-shadow: 0 2px 0 #e7d9b8, 0 8px 20px rgb(110 85 40 / 0.1); }
	.seed { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.35rem 0.3rem 0.8rem; }
	.seed label { font-size: 0.8rem; color: var(--muted); }
	.seed input { width: 8.5em; border: 0; background: transparent; font: inherit; color: var(--ink); padding: 0.25rem 0; outline: none; }
	.seed button { border: 1px solid #e3d3ad; background: #fff9ec; border-radius: 10px; width: 2.1rem; height: 2.1rem; font-size: 1.25rem; line-height: 1; cursor: pointer; color: var(--ink); }
	.legend { display: flex; flex-wrap: wrap; gap: 0.2rem 0.9rem; list-style: none; margin: 0; padding: 0.55rem 0.9rem; font-size: 0.85rem; color: var(--ink-soft); }
	.legend li { display: flex; align-items: center; gap: 0.35rem; }
	.legend small { color: var(--muted); }
	i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 50%; }
	.plot { position: absolute; left: 16px; bottom: var(--nav-room); width: min(300px, calc(100vw - 32px)); padding: 1rem 1.2rem; background: #fbf6ea; border: 1px solid #e3d3ad; border-radius: 16px; box-shadow: 0 2px 0 #e7d9b8, 0 8px 20px rgb(110 85 40 / 0.12); }
	.plot h2 { margin: 0.1rem 0 0.3rem; font-family: var(--font-display); font-size: 1.4rem; }
	.plot p { margin: 0.2rem 0; }
	.kicker { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
	.close { position: absolute; top: 0.5rem; right: 0.7rem; border: 0; background: none; font-size: 1.4rem; color: var(--muted); cursor: pointer; }
</style>
