<!-- how it works: booking, photos and floor plan, delivery in 24 hours, live in the Exposé -->
<script lang="ts">
	import { COPY } from './copy';
	import Cta from './Cta.svelte';
	const c = COPY.steps;
</script>

<section class="bj-section ink" id="ablauf" data-section="steps">
	<div class="bj-wrap">
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
		</header>
		<ol class="bj-steps">
			{#each c.items as s, i}
				<li data-step><span class="bj-step-n">{i + 1}</span><h3>{s.name}</h3><p>{s.text}</p></li>
			{/each}
		</ol>
		<div class="bj-center"><Cta /></div>
	</div>
</section>
