<!-- the price calculator: apartments, houses and trailers to one flat total (./offer.ts) -->
<script lang="ts">
	import { COPY } from './copy';
	import { MOST, PRICES, count, euro, total, type Counts } from './offer';

	const c = COPY.calc;
	let counts: Counts = $state({ apartments: 1, houses: 0, trailers: 0 });
	const rows = [
		['apartments', PRICES.apartment],
		['houses', PRICES.house],
		['trailers', PRICES.trailer]
	] as const;
	const sum = $derived(total(counts));
</script>

<div class="bj-calc" data-calc>
	<h3>{c.title}</h3>
	{#each rows as [key, price]}
		<div class="bj-calc-row">
			<label for="bj-{key}">{c.rows[key]}<small>{euro(price)}</small></label>
			<div class="bj-stepper">
				<button type="button" aria-label="{c.rows[key]}: {c.less}" disabled={counts[key] <= 0} onclick={() => (counts[key] = count(counts[key] - 1))}>−</button>
				<input id="bj-{key}" data-count={key} type="number" inputmode="numeric" min="0" max={MOST} step="1" value={counts[key]}
					oninput={(e) => (counts[key] = count(e.currentTarget.value))}
					onblur={(e) => (e.currentTarget.value = String(counts[key]))} />
				<button type="button" aria-label="{c.rows[key]}: {c.more}" disabled={counts[key] >= MOST} onclick={() => (counts[key] = count(counts[key] + 1))}>+</button>
			</div>
		</div>
	{/each}
	<div class="bj-calc-total" aria-live="polite">
		<span>{c.total}</span>
		<output data-total>{euro(sum)}</output>
		<small>{sum ? c.note : c.empty}</small>
	</div>
</div>
