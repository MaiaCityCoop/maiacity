<!--
	The game's world map on the whole screen: the map ./map.ts grows from a seed, dragged to pan, wheeled or pinched to
	zoom. Pointing at a plot outlines it; tapping it shows its biome, size and what it gives. The seed is in the
	address (?seed=), so a map can be shared; the dice grows a new one. Nothing is built on it yet.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { BIOMES, generateMap, randomSeed, type Biome, type Plot, type WorldMap } from './map';

	let seed = $state('');
	let draft = $state('');
	let map = $state<WorldMap | null>(null);
	let hovered = $state<Plot | null>(null);
	let picked = $state<Plot | null>(null);
	let view = $state({ x: 0, y: 0, k: 1 });
	let box = $state({ w: 1, h: 1 });

	const counts = $derived.by(() => {
		const c: Record<Biome, number> = { river: 0, forest: 0, grass: 0, sand: 0, mountain: 0 };
		for (const p of map?.plots ?? []) c[p.biome]++;
		return c;
	});

	function grow(s: string) {
		seed = draft = s;
		map = generateMap(s);
		hovered = picked = null;
		const url = new URL(location.href);
		url.searchParams.set('seed', s);
		history.replaceState(history.state, '', url);
		fit();
	}

	// the smallest zoom still fills the screen, and the map never slides off it
	const minK = () => (map ? Math.max(box.w / map.width, box.h / map.height) : 1);
	function clamp(v: { x: number; y: number; k: number }) {
		if (!map) return v;
		const k = Math.min(4, Math.max(minK(), v.k));
		return { k, x: Math.min(0, Math.max(box.w - map.width * k, v.x)), y: Math.min(0, Math.max(box.h - map.height * k, v.y)) };
	}
	function fit() {
		if (!map) return;
		const k = minK() * 1.6;
		view = clamp({ k, x: (box.w - map.width * k) / 2, y: (box.h - map.height * k) / 2 });
	}
	function zoomAt(cx: number, cy: number, k: number) {
		const r = clamp({ ...view, k }).k / view.k;
		view = clamp({ k: view.k * r, x: cx - (cx - view.x) * r, y: cy - (cy - view.y) * r });
	}

	const plotAt = (t: EventTarget | null) => {
		const id = (t as Element | null)?.getAttribute?.('data-plot');
		return id && map ? (map.plots[Number(id) - 1] ?? null) : null;
	};

	// pan with one pointer, pinch with two; a press that does not move is a tap
	const pointers = new Map<number, { x: number; y: number }>();
	let moved = 0;
	function down(e: PointerEvent) {
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		moved = 0;
	}
	function move(e: PointerEvent) {
		const last = pointers.get(e.pointerId);
		if (!last) {
			if (e.pointerType === 'mouse') hovered = plotAt(e.target);
			return;
		}
		if (pointers.size === 1) {
			const dx = e.clientX - last.x, dy = e.clientY - last.y;
			moved += Math.abs(dx) + Math.abs(dy);
			view = clamp({ ...view, x: view.x + dx, y: view.y + dy });
		} else if (pointers.size === 2) {
			const [a, b] = [...pointers.entries()].map(([id, p]) => (id === e.pointerId ? { x: e.clientX, y: e.clientY } : p));
			const [a0, b0] = [...pointers.values()];
			const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y), d1 = Math.hypot(a.x - b.x, a.y - b.y);
			moved += 10;
			if (d0 > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (view.k * d1) / d0);
		}
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
	}
	function up(e: PointerEvent) {
		if (pointers.size === 1 && moved < 6) {
			const el = document.elementFromPoint(e.clientX, e.clientY);
			const p = plotAt(el);
			picked = p && picked?.id !== p.id ? p : null;
		}
		pointers.delete(e.pointerId);
	}
	function wheel(e: WheelEvent) {
		e.preventDefault();
		zoomAt(e.clientX, e.clientY, view.k * Math.exp(-e.deltaY * 0.0015));
	}

	/** puts the map's SVG markup into a <g> (parsed as SVG) */
	function drawing(node: SVGGElement, svg: string) {
		node.innerHTML = svg;
		return { update: (s: string) => (node.innerHTML = s) };
	}

	const ha = (m2: number) => (m2 / 10000).toLocaleString('en', { maximumFractionDigits: 1 });

	onMount(() => {
		const resize = () => {
			box = { w: innerWidth, h: innerHeight };
			view = clamp(view);
		};
		resize();
		addEventListener('resize', resize);
		grow(new URLSearchParams(location.search).get('seed') || randomSeed());
		return () => removeEventListener('resize', resize);
	});
</script>

<div class="world">
	<svg
		width={box.w}
		height={box.h}
		role="application"
		aria-label="World map"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={(e) => pointers.delete(e.pointerId)}
		onpointerleave={() => (hovered = null)}
		onwheel={wheel}
	>
		{#if map}
			<g transform="translate({view.x} {view.y}) scale({view.k})">
				<g use:drawing={map.svg}></g>
				{#if hovered && hovered.id !== picked?.id}
					<path d={hovered.d} fill="none" stroke="#e0a63c" stroke-width={2 / Math.sqrt(view.k)} opacity=".75" pointer-events="none" />
				{/if}
				{#if picked}
					<path d={picked.d} fill="rgb(239 181 77 / .14)" stroke="#d99a2b" stroke-width={3 / Math.sqrt(view.k)} pointer-events="none" />
				{/if}
			</g>
		{/if}
	</svg>

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
			<button class="close" aria-label="Close" onclick={() => (picked = null)}>×</button>
			<p class="kicker"><i style:background={BIOMES[picked.biome].colour}></i>{BIOMES[picked.biome].label}</p>
			<h2>Plot {picked.id}</h2>
			<p>{ha(picked.area)} ha · gives {BIOMES[picked.biome].gives.join(' and ')}</p>
			<p class="muted">Free. Nothing is built here yet.</p>
		</aside>
	{/if}
</div>

<style>
	.world { position: fixed; inset: 0; background: #f5eedf; overflow: hidden; touch-action: none; user-select: none; }
	svg { display: block; cursor: grab; }
	svg:active { cursor: grabbing; }
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
