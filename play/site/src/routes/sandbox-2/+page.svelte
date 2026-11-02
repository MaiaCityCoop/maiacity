<!-- Sandbox 2, the physical world lab (a clone of legacy Sandbox 7, in the light brand CI): buildings assembled from
     their parts, with rigid-body physics in a worker, finite fixings, temporary stands, wind and damage. -->
<script>
	const lab = import('$lib/sandbox-2/Lab.svelte');
</script>

<svelte:head><title>Sandbox 2 · Physical world lab · maiaCITY play</title></svelte:head>

{#await lab then { default: Lab }}
	<Lab />
{/await}
