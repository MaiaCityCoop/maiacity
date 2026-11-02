<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	type Asset = { id: string; grp: string; slug: string; label: string; head: number; versions: number; triangles: number | null };
	let assets = $state<Asset[]>([]);
	let error = $state('');
	let group = $state('all');
	let q = $state('');
	onMount(async () => {
		try { assets = await api<Asset[]>('/assets'); } catch (e) { error = (e as Error).message; }
	});
	const groups = $derived(['all', ...new Set(assets.map((a) => a.grp))]);
	const shown = $derived(assets.filter((a) => (group === 'all' || a.grp === group) && (!q || `${a.label} ${a.slug}`.toLowerCase().includes(q.toLowerCase()))));
</script>

<svelte:head><title>Assets · maiaCITY play</title></svelte:head>

<main class="page">
	<h1>The asset library</h1>
	<p class="muted">Every asset Maia City owns, each with its versions. A version, once accepted, never changes; citizens propose new ones, admins accept them.</p>
	<div class="filters">
		<div class="groups">{#each groups as g}<button class="btn small" class:ghost={group !== g} onclick={() => (group = g)}>{g}</button>{/each}</div>
		<input type="search" placeholder="Find an asset" bind:value={q} />
	</div>
	{#if error}<p class="error">{error}</p>{/if}
	<div class="grid">
		{#each shown as a (a.id)}
			<a class="card asset" href="/assets/{a.grp}/{a.slug}/">
				<span class="pill">{a.grp}</span>
				<h3>{a.label}</h3>
				<p class="muted">{a.slug} · v{a.head}{a.versions > 1 ? ` · ${a.versions} versions` : ''}</p>
			</a>
		{/each}
	</div>
	<p class="muted">{shown.length} of {assets.length} assets</p>
</main>

<style>
	.filters { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between; margin: 1.5rem 0; }
	.groups { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.8rem; }
	.asset { padding: 1rem 1.1rem; text-decoration: none; color: inherit; }
	.asset:hover { border-color: var(--mustard); }
	.asset h3 { font-size: 1.1rem; margin: 0.5rem 0 0.2rem; }
	.asset p { margin: 0; font-size: 0.88rem; }
</style>
