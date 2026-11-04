<!-- The game's world map: a seeded map of biomes and plots, nothing built on it yet (./map.ts; everything of the map lives in this folder). Admins only for now (Samuel 2026-11-04): the game is invite only. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/session.svelte';
	import WorldMap from './WorldMap.svelte';

	const admin = $derived(session.me?.level === 'admin');
	onMount(() => {
		if (!admin) void goto('/', { replaceState: true });
	});
</script>

<svelte:head><title>World map · maiaCITY play</title></svelte:head>

{#if admin}<WorldMap />{/if}
