<!-- The plant look alone (intent 602a8849's c8 in avenBOX, copied into each tree by run.sh, never committed to one): a
     lentil from Sandbox 1's garden, as Sandbox 5's card shows a picked plant, without the world a software GPU can't hold. -->
<script>
	import PlantLook from '$lib/content/sandbox-2/interior/PlantLook.svelte';
	const kind = { id: 'lentil', v: 1, asset: 'cdee7682f942c56b53bd19dce459affcb3f0f4d5165bc0bb5136c4cd385507d8', stage: 8, seed: 'look' };
</script>

<div style="width: 420px; height: 420px; margin: 40px;"><PlantLook {kind} /></div>
