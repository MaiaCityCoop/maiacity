<!-- the closing section every call to action leads to: the contact, a placeholder until the provider names it -->
<script lang="ts">
	import { COPY } from './copy';
	import Gap from './Gap.svelte';
	import Mark from './Mark.svelte';
	const c = COPY.closing;
</script>

<section class="bj-section brass" id="kontakt" data-section="closing">
	<div class="bj-wrap narrow bj-center">
		<p class="bj-eyebrow">{c.eyebrow}</p>
		<h2>{c.title}</h2>
		<p class="bj-lead">{c.text}</p>
		{#each c.gaps as g}<Gap of={g} />{/each}
		<ul class="bj-promises center">
			{#each COPY.hero.promises as p}<li>{p}</li>{/each}
		</ul>
	</div>
</section>
<footer class="bj-foot">
	<div class="bj-wrap">
		<Mark small />
		<p>{COPY.foot.line}</p>
		{#each COPY.foot.gaps as g}<Gap of={g} />{/each}
	</div>
</footer>
