<!-- The game's world map: a seeded map of biomes and plots, nothing built on it yet (./map.ts; everything of the map lives in this folder). Admins only (Samuel 2026-11-04: the game is invite only), behind the one gate of the game and the sandboxes ($lib/site/admins, intent aa751ecb). -->
<script lang="ts">
	import WorldMap from './WorldMap.svelte';
</script>

<svelte:head><title>World map · maiaCITY play</title></svelte:head>

<WorldMap />
