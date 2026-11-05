<!--
	The proposals' old address (a link from before, a bookmark, a new tab): the board is a modal now, opened from the nav
	pill's star over any page (Samuel 2026-11-05, $lib/site/proposals), so this opens it over the dashboard. A link to it
	from a page of the app opens it over that page instead (the layout's beforeNavigate).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openProposals } from '$lib/site/proposals/proposals.svelte';

	onMount(async () => {
		await goto('/', { replaceState: true });
		openProposals();
	});
</script>
