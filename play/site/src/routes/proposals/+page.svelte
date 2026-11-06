<!--
	The intents' board's old address (/proposals/, before it was the intents' on 2026-11-06): it opens the board over the
	dashboard, as /intents/ does ($lib/site/intents), and /proposals/#<a proposal's id> the intent that proposal is now (a
	proposal and its intent are one record since 2026-11-06: play finds it by the old id).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openIntents } from '$lib/site/intents/intents.svelte';

	onMount(async () => {
		const focus = location.hash.slice(1);
		await goto('/', { replaceState: true });
		openIntents(focus);
	});
</script>
