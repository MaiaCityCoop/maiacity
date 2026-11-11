<!-- the guarantee, a section of its own: 100 % money back, no questions asked -->
<script lang="ts">
	import { COPY } from './copy';
	import Cta from './Cta.svelte';
	import Gap from './Gap.svelte';
	const c = COPY.guarantee;
</script>

<section class="bj-section ink" data-section="guarantee">
	<div class="bj-wrap bj-split">
		<div class="bj-seal" aria-hidden="true"><b>{c.seal}</b><span>{c.sealNote}</span></div>
		<div>
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.text}</p>
			<p>{c.more}</p>
			{#each c.gaps as g}<Gap of={g} />{/each}
			<Cta />
		</div>
	</div>
</section>
