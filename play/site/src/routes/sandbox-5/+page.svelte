<!--
	play's Sandbox 5 (Samuel 2026-11-05): the forest dome alone in a whole world, Sandbox 1's cell without its thirteen
	domes; in their place, in the middle, the forest dome of play's library at its newest accepted version, its own food
	forest under the glass. Walk in by its south gate.
-->
<script lang="ts">
	import { SANDBOX } from '$lib/content/assets/sandboxes.js';
	import { asset } from '$lib/site/media/url';
	import DomeCellPage from '$lib/content/sandbox-2/interior/DomeCellPage.svelte';

	/** the forest dome (buildings, 'Forest dome · 80 m'): drawn at its newest accepted version, whichever that is */
	const FOREST_DOME = 'cac16350-08a4-4d51-8cdf-3ade5f61836e';
	/** its gates' bearings (0 north, π/2 east): south, east and west into the forest, north the house's own */
	const GATES = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
</script>

<DomeCellPage
	sandbox={SANDBOX.five}
	head="Sandbox 5 · The forest dome in its own food forest · maiaCITY play"
	description="Walk up to the 80 m forest dome alone in a whole maiaCITY world: a middle-European food forest outside, the tropics under its glass."
	title="Sandbox 5"
	subtitle="The forest dome · in its own food forest"
	cover={{
		image: asset('80ee079deb5be54066d2fd230d11fa74ee59aa8f13c6ce3b9b7aa27fb30c8892.jpg') /* the forest dome's arcade, balustrade and roof terrace over the south gate, its food forest round it (rendered in Sandbox 5) */,
		eyebrow: 'Sandbox 5',
		title: 'The forest dome, in its own food forest',
		size: 'a forest garden all round, the tropics under its glass',
		steps: 11
	}}
	label="Sandbox 5: walk, look round, click a plant"
	solo={{ asset: FOREST_DOME, gates: GATES }}
/>
