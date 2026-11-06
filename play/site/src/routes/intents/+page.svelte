<!--
	The intents' address (a link, a bookmark, a new tab): the board is a modal, opened from the nav pill's star over any
	page (Samuel 2026-11-05, $lib/site/intents), so this opens it over the dashboard. A link to it from a page of the app
	opens it over that page instead (the layout's beforeNavigate).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openIntents } from '$lib/site/intents/intents.svelte';

	onMount(async () => {
		await goto('/', { replaceState: true });
		openIntents();
	});
</script>
