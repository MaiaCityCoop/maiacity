<!--
	A WORLD ON ITS STAGE (play/SPEC.md §4.11): ./view.js's scene in a box of the page, with its cameras (Orbit, Walk,
	Drive), the views the world names, its sound (on at the first touch: a browser lets a page sound only then) and
	what it draws now. The Worlds page shows the world picked; the dev harness's bench (routes/worlds/bench) the one
	handed to it.
-->
<script>
	// @ts-nocheck — plain JS
	import { onDestroy, onMount } from 'svelte';
	import { createWorldView } from './view.js';

	/** @type {{ source: any, engine: number, hash: string, given?: Record<string, string>, onview?: (v: any) => void, bare?: boolean }} */
	let { source, engine, hash, given = {}, onview, bare = false } = $props();

	let box = $state(null);
	let view = $state.raw(null);
	let s = $state({ phase: 'idle', error: '', mode: 'orbit', views: [], fps: 0, guests: 0, kinds: 0, missing: 0, lit: 0, live: false, moves: false, building: 0 });
	let soundOn = $state(false);
	let timer;

	onMount(() => {
		view = createWorldView(box, { source, engine });
		onview?.(view);
		timer = setInterval(() => (s = { ...view.state, building: view.building() }), 400);
		const vis = () => view?.pause(document.hidden);
		document.addEventListener('visibilitychange', vis);
		return () => document.removeEventListener('visibilitychange', vis);
	});
	onDestroy(() => {
		clearInterval(timer);
		view?.dispose();
	});

	$effect(() => {
		const h = hash, g = given;
		if (!view || !h) return;
		view.show(h, g).catch((e) => console.warn(`world: ${e?.message ?? e}`));
	});

	const mode = (m) => {
		view?.mode(m);
		box?.focus();
	};
	const touched = () => {
		if (!soundOn) return;
		view?.unlock();
	};
	const toggleSound = () => {
		soundOn = !soundOn;
		view?.sound?.mute(!soundOn);
		if (soundOn) view?.unlock();
	};
</script>

<div class="world">
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="canvas" bind:this={box} tabindex="0" role="application" aria-label="The world: drag to look, WASD or the arrows to move in Walk and Drive" onpointerdown={touched} onkeydown={touched}></div>
	{#if !bare}
	<div class="bar">
		<div class="modes" role="group" aria-label="Camera">
			{#each [['orbit', 'Orbit'], ['walk', 'Walk'], ['drive', 'Drive']] as [m, label]}
				<button class:on={s.mode === m} aria-pressed={s.mode === m} onclick={() => mode(m)}>{label}</button>
			{/each}
		</div>
		{#if s.views.length}
			<div class="modes" role="group" aria-label="Views">
				{#each s.views as v}<button onclick={() => view?.look(v)}>{v}</button>{/each}
			</div>
		{/if}
		<button class:on={soundOn} aria-pressed={soundOn} onclick={toggleSound}>{soundOn ? 'Sound on' : 'Sound off'}</button>
	</div>
	<p class="readout">
		{#if s.phase === 'building'}Building the world in the asset box…{:else if s.phase === 'failed'}<span class="error">{s.error}</span>{:else if s.phase === 'shown'}
			{s.guests} guests of {s.kinds} kinds{s.missing ? `, ${s.missing} missing` : ''} · {s.lit} lights lit{s.moves ? (s.live ? ' · alive' : ' · starting') : ''}{s.building ? ` · building ${s.building}` : ''} · {s.fps} fps
		{/if}
	</p>
	{/if}
	{#if !bare && s.mode !== 'orbit'}<p class="hint">WASD or the arrows to {s.mode === 'drive' ? 'drive' : 'walk'}, Shift to hurry, drag to look</p>{/if}
</div>

<style>
	.world {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 420px;
		background: #8a8478;
		overflow: hidden;
	}
	.canvas {
		position: absolute;
		inset: 0;
		outline: none;
	}
	.bar {
		position: absolute;
		top: 12px;
		left: 12px;
		right: 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		pointer-events: none;
	}
	.bar > *,
	.modes button {
		pointer-events: auto;
	}
	.modes {
		display: flex;
		gap: 0;
		border-radius: 999px;
		overflow: hidden;
		background: rgb(255 255 255 / 0.82);
		backdrop-filter: blur(8px);
	}
	button {
		border: 0;
		background: rgb(255 255 255 / 0.82);
		padding: 6px 12px;
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		border-radius: 999px;
	}
	.modes button {
		border-radius: 0;
		background: transparent;
	}
	button.on {
		background: #1f2a26;
		color: #fff;
	}
	.readout,
	.hint {
		position: absolute;
		left: 12px;
		bottom: 10px;
		margin: 0;
		padding: 4px 10px;
		border-radius: 8px;
		background: rgb(255 255 255 / 0.75);
		font-size: 12px;
		color: #333;
	}
	.hint {
		left: auto;
		right: 12px;
	}
	.readout:empty {
		display: none;
	}
	.error {
		color: #a11;
	}
	@media (max-width: 600px) {
		.hint {
			display: none;
		}
	}
</style>
