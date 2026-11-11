<!-- a running band of the offer's promises, between the show and the offer: said twice so it runs without a seam -->
<script lang="ts">
	import { COPY } from './copy';
</script>

<div class="bj-band" aria-hidden="true">
	<div>
		{#each [0, 1] as _}
			<p>{#each COPY.band as word}<span>{word}</span>{/each}</p>
		{/each}
	</div>
</div>
