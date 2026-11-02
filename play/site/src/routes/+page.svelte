<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';

	type Sandbox = { id: string; title: string; route: string; note: string };
	let sandboxes = $state<Sandbox[]>([]);
	onMount(async () => (sandboxes = await api<Sandbox[]>('/sandboxes')));
	const tint = ['var(--sage-soft)', 'var(--mustard-soft)', '#f3d6c8'];
</script>

<svelte:head><title>maiaCITY play</title></svelte:head>

<main class="page">
	<h1>Hello, {session.me?.name}.</h1>
	<p class="muted">Pick a world. Every visit you walk it as someone new.</p>
	<div class="grid">
		{#each sandboxes as s, i}
			<a class="card sandbox" href={s.route} style="--tint: {tint[i % 3]}">
				<span class="n">{i + 1}</span>
				<h2>{s.title}</h2>
				<p>{s.note.replace(/ \(from legacy[^)]*\)/, '')}</p>
			</a>
		{/each}
	</div>
	<p class="more"><a href="/assets/">The asset library</a> · every plant, thing, machine, building, actor and biome, each with its versions.</p>
</main>

<style>
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin: 2rem 0; }
	.sandbox { display: block; padding: 1.5rem; text-decoration: none; color: inherit; background: linear-gradient(160deg, var(--tint), var(--paper) 70%); transition: transform 0.15s; }
	.sandbox:hover { transform: translateY(-2px); }
	.n { font-family: var(--font-display); font-size: 3rem; line-height: 1; color: var(--brand-green); }
	.sandbox p { color: var(--ink-soft); margin: 0; }
	.more { color: var(--ink-soft); }
</style>
