<!--
	THE WORLD MAP UNDER THE FILM CAMERA (/game/map/film/, development only): the game's world map (../WorldMap.svelte) as
	the map page shows it, held for a film: scripts/flyover renders its shots frame by frame through `window.__mapFilm`.
	Like the benches it needs no account in development; in a production build an empty page.
-->
<script lang="ts">
	import { dev } from '$app/environment';
	import WorldMap from '../WorldMap.svelte';
</script>

<svelte:head><title>World map · film</title></svelte:head>

{#if dev}<WorldMap film />{/if}
