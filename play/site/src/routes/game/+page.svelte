<!-- The game: no page in between (Samuel 2026-11-04): straight into its world map. Behind the one gate of the game and
	the sandboxes ($lib/site/admins, intent aa751ecb): only an admin reaches it, anyone else sees "Coming soon". -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => void goto('/game/map/', { replaceState: true }));
</script>
