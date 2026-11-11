<!-- the guarantee, a section of its own: 100 % money back, no questions asked -->
<script lang="ts">
	import { COPY } from './copy';
	import Cta from './Cta.svelte';
	import Gap from './Gap.svelte';
	const c = COPY.guarantee;
</script>

<section class="bj-section ink bj-guarantee" id="garantie" data-section="guarantee">
	<div class="bj-wrap bj-split">
		<div class="bj-seal" aria-hidden="true">
			<svg viewBox="0 0 200 200">
				<defs><path id="bj-ring" d="M100 100m-82 0a82 82 0 1 1 164 0a82 82 0 1 1 -164 0" /></defs>
				<text><textPath href="#bj-ring">{`${c.sealNote} · ${c.title} · `.repeat(2)}</textPath></text>
			</svg>
			<b>{c.seal}</b><span>{c.sealNote}</span>
		</div>
		<div>
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<p class="bj-zero">{c.zero}.</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.text}</p>
			<p>{c.more}</p>
			{#each c.gaps as g}<Gap of={g} />{/each}
			<Cta />
		</div>
	</div>
</section>
