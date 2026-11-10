<!-- The game's world map: a seeded map of biomes and plots, nothing built on it yet (./map.ts; everything of the map lives in this folder). Admins only for now (Samuel 2026-11-04): the game is invite only. -->
<script lang="ts">
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';
	import WorldMap from './WorldMap.svelte';

	adminsOnly();
	const admin = $derived(isAdmin());
</script>

<svelte:head><title>World map · maiaCITY play</title></svelte:head>

{#if admin}<WorldMap />{/if}
