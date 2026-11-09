<!--
	play's Sandbox 6 (Samuel 2026-11-09, intent 67f0404a): one village at its real size, the old Sandbox 6's seven hexes
	back in play. The tower hex in the middle (the tower, sized from what the village needs, its eight works and the
	village centre; no homes), six living
	hexes round it in Samuel's layout B. The layout and the numbers are play's data, the sandbox's layout document
	(`village` and `audit`, read at /api/sandboxes/<uuid>/config): drawn by $lib/content/sandbox-6, counted by its audit,
	every number with how its input is known.
-->
<script lang="ts">
	import Aside from '$lib/app/Aside.svelte';
	import { SANDBOX } from '$lib/content/assets/sandboxes.js';
	import { asset } from '$lib/site/media/url';
	import { WorldPage } from '$lib/content/sandbox-kit';
	import Plan from '$lib/content/sandbox-6/Plan.svelte';
	import type { Village } from '$lib/content/sandbox-6/geometry';
	import type { Audit } from '$lib/content/sandbox-6/audit';

	let data = $state<{ village: Village; audit: Audit } | null>(null);
	let missing = $state('');
	let open = $state(true);

	/** the village and its audit, from the sandbox's layout (as an intent would make it, on the board's ?layout=) */
	async function load() {
		const { loadConfig } = await import('$lib/content/game/code/index.js');
		const configs = (await loadConfig(SANDBOX.six)) as Record<string, unknown>;
		if (!configs.village || !configs.audit) {
			missing = 'Sandbox 6’s layout has no village yet: it comes with its intent’s proposal (open it from the intents’ board).';
			throw new Error(missing);
		}
		return (data = { village: configs.village as Village, audit: configs.audit as Audit });
	}
</script>

<svelte:head>
	<title>Sandbox 6 · One village at its real size · maiaCITY play</title>
	<meta name="description" content="A maiaCITY village at its real size: six living hexes of home domes round the tower hex, every number from its sources." />
</svelte:head>

<WorldPage
	mount={async (stage, onProgress) => {
		onProgress('Reading the village’s layout');
		const { village, audit } = await load();
		const { mountVillage } = await import('$lib/content/sandbox-6/mount');
		// the village with its tower sized from its programme (the audit's), as the plan shows it
		const { auditOf } = await import('$lib/content/sandbox-6/audit');
		return mountVillage(stage, onProgress, auditOf(village, audit).sized);
	}}
	title="Sandbox 6"
	subtitle="One village · at its real size"
	cover={{
		image: asset('46e52e9e393b192c0a6db481e95fbf623e8d12d2753a3e1d15d1663292d2c716.jpg') /* the old Sandbox 6's village from above */,
		eyebrow: 'Sandbox 6',
		title: 'One village, at its real size',
		size: 'seven hexes of 38 ha: six living round the tower',
		steps: 3
	}}
	label="Sandbox 6: the village from above; drag to turn, scroll to zoom"
	taps=".bar a, .bar button, .side a, .side button"
>
	{#if missing}<p class="missing">{missing}</p>{/if}
	{#if data}
		<aside class="side" class:open aria-label="The village’s plan and numbers">
			<button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>{open ? 'Hide the plan' : 'The plan and numbers'}</button>
			{#if open}<Plan village={data.village} audit={data.audit} />{/if}
		</aside>
	{/if}
</WorldPage>

<!-- its layout's one aside (Info and History), an admin's: a round button at the bottom right -->
<Aside doc={SANDBOX.six} float />

<style>
	.side {
		position: absolute;
		top: 3.5rem;
		right: 0.75rem;
		z-index: 4;
		width: min(24rem, calc(100vw - 1.5rem));
		max-height: calc(100% - 5rem);
		overflow: auto;
		padding: 0.75rem;
		box-sizing: border-box;
		background: rgb(250 248 242 / 0.9);
		border-radius: 0.75rem;
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
	}
	.side:not(.open) { width: auto; }
	.toggle { display: block; margin: 0 auto 0.5rem; border: 1px solid #c9bca2; background: #fffaf0; border-radius: 999px; padding: 0.3rem 0.9rem; cursor: pointer; }
	.missing { position: absolute; inset: auto 1rem 2rem; z-index: 5; margin: 0 auto; max-width: 32rem; padding: 0.75rem 1rem; background: #fbf1df; color: #5c3b12; border-radius: 0.6rem; text-align: center; }
	@media (max-width: 640px) {
		.side { top: auto; bottom: 0.75rem; max-height: 55%; }
	}
</style>
