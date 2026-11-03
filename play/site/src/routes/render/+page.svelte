<!--
	THE RENDER BENCH's page (/render): a recipe file on this machine built and shown as play shows any asset
	($lib/content/assets/RenderBench.svelte), driven by scripts/render.mjs. A developer's tool: in a production build it
	is an empty page, the bench's code not even loaded.
-->
<script>
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	/** @type {any} */
	let Bench = $state(null);
	onMount(async () => {
		if (dev) Bench = (await import('$lib/content/assets/RenderBench.svelte')).default;
	});
</script>

{#if Bench}
	<Bench />
{:else if !dev}
	<main class="page"><p class="muted">The render bench runs only in development (play/site: bun run dev, then scripts/render.mjs).</p></main>
{/if}
