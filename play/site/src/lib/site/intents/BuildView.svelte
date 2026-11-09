<!--
	A proposed build drawn on the intents' board and in an intent's detail: a world as the Worlds page shows it (one
	renderer let go of whole when it closes), not on the asset stage, whose studio, shadows and section cuts over a whole
	city crashed iPad Safari; everything else in the asset library's viewer.
-->
<script module lang="ts">
	let vault: Promise<typeof import('$lib/content/assets/VaultAsset.svelte')> | null = null;
	let world: Promise<typeof import('$lib/content/worlds/WorldStage.svelte')> | null = null;
	/** each viewer, loaded once, the first time it is wanted */
	export const vaultViewer = () => (vault ??= import('$lib/content/assets/VaultAsset.svelte'));
	export const worldViewer = () => (world ??= import('$lib/content/worlds/WorldStage.svelte'));
</script>

<script lang="ts">
	import { INDEX, source } from '$lib/content/assets/catalog.js';

	/** grp: the work's group, which says which viewer draws it */
	let { grp, hash, title }: { grp: string | null; hash: string; title: string } = $props();
</script>

{#if grp === 'worlds'}
	{#await worldViewer() then { default: WorldStage }}<WorldStage {source} engine={INDEX.engine} {hash} />{/await}
{:else}
	{#await vaultViewer() then { default: VaultAsset }}<VaultAsset {source} {hash} {title} fill />{/await}
{/if}
