<!--
	The physical world lab on a page: its own interface and view (./main.ts mountLab) in one scrolling layer over the
	app, taken down again when the page is left.
-->
<script>
	import { onDestroy, onMount } from 'svelte';
	import { mountLab } from './main';

	/** @type {HTMLDivElement | undefined} */
	let root = $state();
	/** @type {(() => void) | undefined} */
	let unmount;
	let gone = false;
	let failed = $state('');

	onMount(() => {
		if (!root) return;
		mountLab(root).then(
			(dispose) => (gone ? dispose() : (unmount = dispose)),
			(error) => {
				failed = `Could not start the laboratory: ${error.message}`;
				console.error(error);
			}
		);
	});
	onDestroy(() => {
		gone = true;
		unmount?.();
	});
</script>

<div class="lab">
	{#if failed}<p class="failed">{failed}</p>{/if}
	<div bind:this={root}><p class="loading">Loading the physical world…</p></div>
</div>

<style>
	.lab {
		position: fixed;
		inset: var(--head) 0 0;
		overflow: auto;
		background: var(--cream);
	}
	.failed {
		padding: 40px;
		color: var(--terracotta);
	}
</style>
