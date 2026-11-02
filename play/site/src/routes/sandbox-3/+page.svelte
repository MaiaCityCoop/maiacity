<!--
	Sandbox 3 (play/SPEC.md §5): legacy MaiaCity V2's world (play's $lib/content/maiacity-v2/world.js), stripped to the world
	itself — the land and its plots, the trees that stand there, the van, the tent and the things. No coops, money,
	minds or hearts, no seats, no story or trailer, no planting for now; nothing is saved. The visitor walks it as
	someone new every visit ($lib/character.ts, cast in seat A).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import TouchStick from '$lib/site/touch/TouchStick.svelte';
	import { CAST } from '$lib/content/maiacity-v2/cast.js';
	import WorldBar from '$lib/content/sandbox-kit/WorldBar.svelte';

	let canvas = $state<HTMLCanvasElement>();
	let world: any = null;
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');
	let error = $state('');
	let roaming = $state(false);
	/** walking, by the pickup's door, or at its wheel (the world's onRoam) */
	let roam = $state({ on: false, near: false, driving: false });
	/** in at the pickup's driver's door, or out again: the button by it, or E */
	const board = () => world?.board(!roam.driving);
	const onKey = (e: KeyboardEvent) => {
		if (e.code !== 'KeyE' || e.repeat || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '')) return;
		if (roam.near || roam.driving) (e.preventDefault(), board());
	};
	const me = CAST.A as { height: number; look: Record<string, string> };

	/** the world as it stands once you have arrived: at home, the tent up, you alone, nothing planted */
	const STAGE = {
		at: 'home', cube: 'home', tent: 'up', shelter: 'hidden', battery: 'store',
		me: 'A', other: null, present: ['A'], rides: false, hour: undefined, cruise: '',
		spot: null, marked: false, by: '', pick: '', name: '', homed: { A: true, B: true, C: true }
	};

	onMount(() => {
		let gone = false;
		(async () => {
			try {
				await (await import('$lib/recipes')).catalogReady('sandbox-3');
				const { createWorld } = await import('$lib/content/maiacity-v2/world.js');
				if (gone || !canvas) return;
				world = createWorld(canvas, { onRoam: (r: { on: boolean; near: boolean; driving: boolean }) => ((roaming = r.on), (roam = { on: r.on, near: !!r.near, driving: !!r.driving })) });
				world.set(STAGE);
				world.touring(false);
				world.reveal(2);
				world.trees([]);
				world.focus('tribe');
				world.freeWalk(true);
				await world.ready;
				if (!gone) phase = 'ready';
			} catch (e) {
				console.error(e);
				error = (e as Error).message;
				phase = 'failed';
			}
		})();
		return () => {
			gone = true;
			world?.dispose();
		};
	});

	const swatch = (c: string | undefined) => c ?? 'transparent';
</script>

<svelte:head><title>Sandbox 3 · The tired land · maiaCITY play</title></svelte:head>

<svelte:window onkeydown={onKey} />

<div class="world">
	<canvas class="stage" bind:this={canvas}></canvas>
	<WorldBar title="Sandbox 3" subtitle="The tired land · walk it as someone new" sky={false} />
	{#if phase === 'ready'}
		<TouchStick move={(x, y, hurry) => world?.move(x, y, hurry)} look={(dx, dy) => world?.look(dx, dy)} stage={canvas} taps="button, a, [role='button']" />
	{/if}
	<aside class="card you">
		<p class="eyebrow">Sandbox 3 · The tired land</p>
		<h2>You, this visit</h2>
		<p class="muted">A {me.look.face}, {me.height.toFixed(2)} m, {me.look.hair === 'none' ? 'no hair' : `${me.look.hair} hair`}.</p>
		<div class="swatches" aria-hidden="true">
			{#each ['skin', 'hairColour', 'shirt', 'trousers', 'shoes'] as k}<span style="background: {swatch(me.look[k])}" title={k}></span>{/each}
		</div>
		<p class="keys">{roam.driving ? 'Driving · WASD or the arrows to steer, tap the ground to drive there · E to get out' : roaming ? 'Walking · tap the pickup (or E by its door) to get in' : 'WASD or the arrows to walk · drag to look round'}</p>
	</aside>
	{#if phase === 'ready' && roam.on && (roam.near || roam.driving)}
		<button class="btn board" onclick={board}>{roam.driving ? 'Get out' : 'Get in the pickup'} <kbd>E</kbd></button>
	{/if}
	{#if phase === 'loading'}<p class="status card">Laying out the land…</p>{/if}
	{#if phase === 'failed'}<p class="status card error">The world could not open: {error}</p>{/if}
</div>

<style>
	.world { position: fixed; inset: 0; background: #d8e2e2; }
	.stage { display: block; width: 100%; height: 100%; touch-action: none; }
	.you { position: absolute; top: 4.5rem; left: 1rem; padding: 1rem 1.2rem; max-width: 17rem; background: rgb(250 248 242 / 0.88); backdrop-filter: blur(10px); }
	.you h2 { font-size: 1.2rem; margin: 0.1rem 0 0.3rem; }
	.you p { margin: 0; font-size: 0.92rem; }
	.eyebrow { font-size: 0.72rem !important; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--terracotta); }
	.swatches { display: flex; gap: 6px; margin: 0.6rem 0; }
	.swatches span { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); }
	.board { position: absolute; left: 50%; bottom: 7.5rem; transform: translateX(-50%); z-index: 5; display: inline-flex; gap: 0.5rem; align-items: center; box-shadow: 0 6px 20px rgb(0 0 0 / 0.18); }
	.board kbd { font: inherit; font-size: 0.75em; padding: 0.05em 0.4em; border-radius: 4px; background: rgb(255 255 255 / 0.25); }
	.keys { color: var(--ink-soft); font-size: 0.82rem !important; }
	.status { position: absolute; left: 50%; bottom: 2rem; transform: translateX(-50%); padding: 0.8rem 1.2rem; margin: 0; }
	@media (max-width: 640px) { .you { right: 1rem; max-width: none; } }
</style>
