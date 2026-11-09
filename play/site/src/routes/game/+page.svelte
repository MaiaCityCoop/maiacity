<!-- The game: no page in between (Samuel 2026-11-04). An admin goes straight into its world map; everyone else back to
	the dashboard, where the game is shown greyed out, coming soon and invite only. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAdmin } from '$lib/session.svelte';

	onMount(() => void goto(isAdmin() ? '/game/map/' : '/', { replaceState: true }));
</script>
