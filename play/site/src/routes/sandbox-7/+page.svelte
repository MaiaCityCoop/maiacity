<!--
	play's Sandbox 7 (Samuel 2026-11-09, intent 8d683ad6): the hex planet, the old Sandbox 2's globe of 51,842 cards back
	in play, drawn from the Earth's coasts, climates, sea depths and mountain ranges, every card the biome, colour and
	height it had; turned, zoomed and walked on. On it the candidate regions where a new food-forest city of 2,000 km² or
	more could grow, pinned where they are and listed beside it. The maps, the look and the sites are play's data, the
	sandbox's layout document (`planet`, `biomes` and `sites`, read at /api/sandboxes/<uuid>/config): drawn by
	$lib/content/sandbox-7.
-->
<script lang="ts">
	import Aside from '$lib/app/Aside.svelte';
	import { SANDBOX } from '$lib/content/assets/sandboxes.js';
	import { asset } from '$lib/site/media/url';
	import { WorldPage } from '$lib/content/sandbox-kit';
	import Sites from '$lib/content/sandbox-7/Sites.svelte';
	import type { Biomes, Planet } from '$lib/content/sandbox-7/scene';
	import type { Sites as SiteList } from '$lib/content/sandbox-7/sites';
	import type { PlanetHandle } from '$lib/content/sandbox-7/mount';

	let data = $state<{ planet: Planet; biomes: Biomes; sites: SiteList } | null>(null);
	let missing = $state('');
	let open = $state(true);
	let selected = $state<number | null>(null);
	let world: PlanetHandle | null = null;

	/** the planet, its biomes and its sites, from the sandbox's layout (as an intent would make it, on the board's ?layout=) */
	async function load() {
		const { loadConfig } = await import('$lib/content/game/code/index.js');
		const configs = (await loadConfig(SANDBOX.seven)) as Record<string, unknown>;
		if (!configs.planet || !configs.biomes) {
			missing = 'Sandbox 7’s layout has no planet yet: it comes with its intent’s proposal (open it from the intents’ board).';
			throw new Error(missing);
		}
		return (data = { planet: configs.planet as Planet, biomes: configs.biomes as Biomes, sites: (configs.sites as SiteList) ?? { note: '', criteria: [], regions: [] } });
	}

	/** a site chosen in the list or by its pin: the planet flies there and its card opens */
	function choose(index: number | null) {
		selected = index;
		const s = index === null ? null : data?.sites.regions[index];
		if (s) {
			open = true;
			world?.flyTo(s.lat, s.lon);
		}
	}

	/** a press that comes up where it went down, soon, is a tap on the planet: a pin under it is chosen */
	let press: { x: number; y: number; t: number } | null = null;
	const down = (e: PointerEvent) => (press = { x: e.clientX, y: e.clientY, t: e.timeStamp });
	const up = (e: PointerEvent) => {
		const p = press;
		press = null;
		if (!p || !world || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6 || e.timeStamp - p.t > 450) return;
		const hit = world.pick(e.clientX, e.clientY);
		if (hit !== null) choose(hit);
	};
</script>

<svelte:head>
	<title>Sandbox 7 · The hex planet · maiaCITY play</title>
	<meta name="description" content="The Earth as a globe of hex cards, its biomes, seas and mountains, with the places a new food-forest city could grow." />
</svelte:head>

<WorldPage
	mount={async (stage, onProgress) => {
		onProgress('Reading the planet’s layout');
		const { planet, biomes, sites } = await load();
		const { mountPlanet } = await import('$lib/content/sandbox-7/mount');
		world = await mountPlanet(stage, onProgress, planet, biomes, sites.regions.map((s) => ({ lat: s.lat, lon: s.lon })));
		return world;
	}}
	title="Sandbox 7"
	subtitle="The hex planet · where a city could grow"
	cover={{
		image: asset('88528c9521de8682f676c3e2539c3a19ffd2a4731a2343410761025e27fde55e.jpg') /* the old planet over the Atlantic */,
		eyebrow: 'Sandbox 7',
		title: 'The hex planet',
		size: '51,842 cards: the Earth’s coasts, climates, seas and mountains',
		steps: 4
	}}
	label="Sandbox 7: the planet; drag to turn it, scroll or pinch to come closer, and walk on its cards"
	taps=".bar a, .bar button, .side a, .side button"
	onpointerdown={down}
	onpointerup={up}
>
	{#if missing}<p class="missing">{missing}</p>{/if}
	{#if data}
		<aside class="side" class:open aria-label="Where a city could grow">
			<button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>{open ? 'Hide the sites' : 'Where a city could grow'}</button>
			{#if open}<Sites sites={data.sites} {selected} onselect={choose} />{/if}
		</aside>
	{/if}
</WorldPage>

<!-- its layout's one aside (Info and History), an admin's: a round button at the bottom right -->
<Aside doc={SANDBOX.seven} float />

<style>
	.side {
		position: absolute;
		top: 3.5rem;
		right: 0.75rem;
		z-index: 4;
		width: min(23rem, calc(100vw - 1.5rem));
		max-height: calc(100% - 5rem);
		overflow: auto;
		padding: 0.75rem;
		box-sizing: border-box;
		background: rgb(250 248 242 / 0.9);
		color: #1f2a23;
		border-radius: 0.75rem;
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
	}
	.side:not(.open) { width: auto; }
	.toggle { display: block; margin: 0 auto 0.5rem; border: 1px solid #c9bca2; background: #fffaf0; border-radius: 999px; padding: 0.3rem 0.9rem; cursor: pointer; font: inherit; font-size: 0.85rem; color: inherit; }
	.missing { position: absolute; inset: auto 1rem 2rem; z-index: 5; margin: 0 auto; max-width: 32rem; padding: 0.75rem 1rem; background: #fbf1df; color: #5c3b12; border-radius: 0.6rem; text-align: center; }
	:global(.stage .hud-reticle) { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: rgb(255 255 255 / 0.9); pointer-events: none; }
	@media (max-width: 640px) {
		.side { top: auto; bottom: 0.75rem; max-height: 50%; }
	}
</style>
