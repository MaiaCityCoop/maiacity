<!--
	The intents' board's old address (/proposals/, before it was the intents' on 2026-11-06): it opens the board over the
	dashboard, as /intents/ does ($lib/site/intents).
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
