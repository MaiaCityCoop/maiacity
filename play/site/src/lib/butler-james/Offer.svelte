<!-- the offer: the three flat prices (the 3D model of an apartment and of a house, the trailer video), what is in the
     model, and the calculator -->
<script lang="ts">
	import { COPY } from './copy';
	import Calculator from './Calculator.svelte';
	import Cta from './Cta.svelte';
	import Gap from './Gap.svelte';
	import Value from './Value.svelte';
	const c = COPY.offer;
</script>

<section class="bj-section paper" id="angebot" data-section="offer">
	<div class="bj-wrap">
		<Value />
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.lead}</p>
		</header>
		<div class="bj-offer">
			<div class="bj-plans">
				{#each c.plans as p}
					<article class="bj-plan" class:film={p.id === 'trailer'} data-plan={p.id}>
						<p class="bj-tag">{p.kind}</p>
						<h3>{p.name}</h3>
						<p class="bj-price">{p.price}</p>
						<p class="bj-per">{p.per}, {p.vat}</p>
						<p class="bj-plan-text">{p.text}</p>
					</article>
				{/each}
				<div class="bj-stack">
					<h3>{c.stackTitle}</h3>
					<ul>{#each c.stack as s}<li>{s}</li>{/each}</ul>
					{#each c.gaps as g}<Gap of={g} />{/each}
				</div>
			</div>
			<div class="bj-offer-side">
				<Calculator />
				<Cta note />
			</div>
		</div>
	</div>
</section>
