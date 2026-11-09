<!-- play's Sandbox 1: the dome cell, its food forest grown from our own plants (the dome-cell page) -->
<script lang="ts">
	import Aside from '$lib/app/Aside.svelte';
	import { SANDBOX } from '$lib/kernel/sandboxes.js';
	import { asset } from '$lib/site/media/url';
	import DomeCellPage from '$lib/content/sandbox-2/interior/DomeCellPage.svelte';
</script>

<DomeCellPage
	head="Sandbox 1 · A dome cell grown from our plants · maiaCITY play"
	description="Walk a whole maiaCITY dome cell whose food forest is grown from our own plants, stage by stage: a middle-European forest garden outside, the tropics inside the domes."
	title="Sandbox 1"
	subtitle="A dome cell · grown from our plants"
	cover={{
		image: asset('9e442ce81d3237243f561780fa6d3aeeeb7f1d83ea8e68f3a166650739c398b2.jpg') /* Day 03: a dome from inside */,
		eyebrow: 'Sandbox 1',
		title: 'A dome cell, grown from our plants',
		size: 'a forest garden outside, the tropics inside the domes',
		steps: 10
	}}
	label="Sandbox 1: walk, look round, click a plant"
	opening
/>

<!-- its layout's one aside (Info and History), an admin's: a round button at the bottom right -->
<Aside doc={SANDBOX.one} float />
