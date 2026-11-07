<!--
	The sandboxes' layouts (play/SPEC.md §4.6): this opens the first one's, at /sandboxes/<uuid>/ (./[id]/+page.svelte).
	Admins only.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';

	let error = $state('');
	$effect(() => {
		if (!session.me) return;
		if (session.me.level !== 'admin') return void goto('/', { replaceState: true });
		api<{ id: string }[]>('/docs?kind=sandbox').then(
			(l) => void (l[0] ? goto(`/sandboxes/${l[0].id}/`, { replaceState: true }) : (error = 'No sandboxes yet.')),
			(e) => (error = e.message)
		);
	});
</script>

<svelte:head><title>Sandboxes · maiaCITY play</title></svelte:head>
<p class="msg">{error || 'Opening the sandboxes…'}</p>

<style>
	.msg { padding: 2rem; }
</style>
