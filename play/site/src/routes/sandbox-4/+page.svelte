<!-- Sandbox 4, the dome cassette joint (Samuel 2026-11-05): one cast cassette of the 100 m dome's lowest rows, seated
     from outside, keyed with sliding basalt keys, capped at its nodes and clamped by a ring cable, on one clock. -->
<script>
	import Aside from '$lib/app/Aside.svelte';
	import { SANDBOX } from '$lib/kernel/sandboxes.js';
	const joint = import('$lib/sandbox-4/Joint.svelte');
</script>

<svelte:head><title>Sandbox 4 · The cassette joint · maiaCITY play</title></svelte:head>

{#await joint then { default: Joint }}
	<Joint />
{/await}

<!-- its layout's one aside (Info and History), an admin's: a round button at the bottom right -->
<Aside doc={SANDBOX.four} float />
