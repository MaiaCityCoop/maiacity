<!--
	Characters, the people of Maia City (intent 89f3ad37): one group of the asset library as its own app, apart from the
	animals ($lib/app/AssetLibrary.svelte, group `characters`). Maia City's admins alone: anyone else is sent back home,
	as from /library/.
-->
<script lang="ts">
	import AssetLibrary from '$lib/app/AssetLibrary.svelte';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';

	adminsOnly();
	const admin = $derived(isAdmin());
</script>

{#if admin}
	<AssetLibrary group="characters" />
{/if}
