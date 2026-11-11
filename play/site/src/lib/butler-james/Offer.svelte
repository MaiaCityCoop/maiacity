<!-- the offer: what is in it, the two flat prices, the add-on, and the calculator -->
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
					<article class="bj-plan" data-plan={p.id}>
						<h3>{p.name}</h3>
						<p class="bj-price">{p.price}</p>
						<p class="bj-per">{p.per}, {p.vat}</p>
					</article>
				{/each}
				<article class="bj-plan addon" data-plan="trailer">
					<p class="bj-tag">{c.addon.tag}</p>
					<h3>{c.addon.name}</h3>
					<p class="bj-price">+ {c.addon.price}</p>
					<p class="bj-per">{c.addon.per}, {c.addon.vat}</p>
					<p class="bj-plan-text">{c.addon.text}</p>
				</article>
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
