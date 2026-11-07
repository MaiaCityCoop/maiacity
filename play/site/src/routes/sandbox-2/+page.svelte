<!-- Sandbox 2, the physical world lab (a clone of legacy Sandbox 7, in the light brand CI): buildings assembled from
     their parts, with rigid-body physics in a worker, finite fixings, temporary stands, wind and damage. -->
<script>
	import Aside from '$lib/app/Aside.svelte';
	import { SANDBOX } from '$lib/content/assets/sandboxes.js';
	const lab = import('$lib/sandbox-2/Lab.svelte');
</script>

<svelte:head><title>Sandbox 2 · Physical world lab · maiaCITY play</title></svelte:head>

{#await lab then { default: Lab }}
	<Lab />
{/await}

<!-- its layout's one aside (Info and History), an admin's: a round button at the bottom right -->
<Aside doc={SANDBOX.two} float />
