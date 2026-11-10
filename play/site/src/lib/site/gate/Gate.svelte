<!--
	The one gate of play's pages (./rights.ts; intent aa751ecb): the page it wraps is drawn only when its route is open or
	the one signed in holds the right it needs (an admin holds every right); anyone else, signed out or a member, gets
	"Coming soon · Invite only" and none of the page, so nothing of it runs (no world, no asset or file fetch); while the
	session loads, nothing. The root layout wraps every page in it.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { session } from '$lib/session.svelte';
	import { gate } from './rights';
	import ComingSoon from './ComingSoon.svelte';

	let { path, children }: { path: string; children: Snippet } = $props();
	const shown = $derived(gate(path, session.ready, session.me));
</script>

{#if shown === 'open'}
	{@render children()}
{:else if shown === 'soon'}
	<ComingSoon signedOut={!session.me} />
{/if}
