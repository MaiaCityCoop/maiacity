<!-- the objections, answered: an accordion; what the provider has not decided yet is a marked placeholder -->
<script lang="ts">
	import { COPY } from './copy';
	import Gap from './Gap.svelte';
	const c = COPY.faq;
	let open: string | null = $state(null);
</script>

<section class="bj-section ink" id="fragen" data-section="faq">
	<div class="bj-wrap narrow">
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
		</header>
		<div class="bj-faq">
			{#each c.items as item}
				<div class="bj-faq-item" class:open={open === item.id}>
					<h3>
						<button type="button" id="bj-q-{item.id}" aria-expanded={open === item.id} aria-controls="bj-a-{item.id}" onclick={() => (open = open === item.id ? null : item.id)}>
							<span>{item.q}</span><i aria-hidden="true"></i>
						</button>
					</h3>
					<div id="bj-a-{item.id}" role="region" aria-labelledby="bj-q-{item.id}" hidden={open !== item.id}>
						{#each item.a as p}<p>{p}</p>{/each}
						{#each item.gaps as g}<Gap of={g} />{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
