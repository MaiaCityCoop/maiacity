<!--
	Sandbox 7's sites beside the planet: the candidate regions for a new food-forest city, best first by the sum of their
	scores, each a row (its name, country, area, its scores); a tap on one flies the planet there and opens its card:
	its people, climate, the land as it is, the water, the land's price, the legal route, access, risks, what was done
	near it, and its sources, each an artifact play keeps.
-->
<script lang="ts">
	import { ranked, SCORES, type Sites } from './sites';

	let { sites, selected = null, onselect }: { sites: Sites; selected?: number | null; onselect: (index: number | null) => void } = $props();
	const rows = $derived(ranked(sites));
	const site = $derived(selected === null ? null : sites.regions[selected] ?? null);
	const n = (x: number) => x.toLocaleString('en');
	const price = (p: [number, number] | null) => (p ? `€${n(p[0])}–${n(p[1])} a hectare` : 'not known');
</script>

{#if site}
	<article class="card">
		<button class="back" onclick={() => onselect(null)}>← All sites</button>
		<h2>{site.name}</h2>
		<p class="where">{site.country} · {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}° · {n(site.area_km2)} km²</p>
		<ul class="scores" aria-label="Scores, 1 to 5">
			{#each SCORES as k (k)}<li><span>{k}</span><b>{site.scores[k]}</b></li>{/each}
		</ul>
		<dl>
			<dt>People</dt>
			<dd>{n(site.population)} people, {site.density_per_km2} a km² ({site.density_year}); the largest place {site.largest_settlement.name}, {n(site.largest_settlement.population)}</dd>
			<dt>Climate</dt>
			<dd>Köppen {site.koppen}; {n(site.rain_mm)} mm of rain a year; {site.temp_c[0]} °C in the coldest month, {site.temp_c[1]} °C in the warmest</dd>
			<dt>The land today</dt>
			<dd>{site.land_state}</dd>
			<dt>Water</dt>
			<dd>{site.water}</dd>
			<dt>Land</dt>
			<dd>{price(site.land_price_eur_ha)}</dd>
			<dt>Legal route</dt>
			<dd>{site.legal_route}</dd>
			<dt>Access</dt>
			<dd>{site.access}</dd>
			<dt>Risks</dt>
			<dd>{site.risks}</dd>
			<dt>Done nearby</dt>
			<dd>{site.precedents}</dd>
		</dl>
		<h3>Sources</h3>
		<ol class="sources">
			{#each site.sources as s (s.artifact)}
				<li><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> · <a class="kept" href="/artifacts/?artifact={s.artifact}">kept</a></li>
			{/each}
		</ol>
	</article>
{:else}
	<header>
		<h2>Where a city could grow</h2>
		<p>{sites.note}</p>
	</header>
	<ol class="list">
		{#each rows as r, i (r.index)}
			<li>
				<button onclick={() => onselect(r.index)}>
					<span class="rank">{i + 1}</span>
					<span class="name"><b>{r.site.name}</b><small>{r.site.country} · {n(r.site.area_km2)} km² · {r.site.density_per_km2}/km²</small></span>
					<span class="total" title="the sum of its five scores, of 25">{r.total}</span>
				</button>
			</li>
		{/each}
	</ol>
{/if}

<style>
	h2 { margin: 0 0 0.25rem; font-family: var(--font-display, serif); font-weight: 500; font-size: 1.15rem; }
	h3 { margin: 1rem 0 0.35rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5b6660; }
	header p { margin: 0 0 0.6rem; font-size: 0.82rem; color: #5b6660; line-height: 1.4; }
	.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
	.list button { width: 100%; display: grid; grid-template-columns: 1.6rem 1fr auto; gap: 0.5rem; align-items: center; text-align: left; padding: 0.5rem 0.6rem; border: 1px solid rgb(31 42 35 / 0.08); border-radius: 0.6rem; background: #fffaf0; color: inherit; font: inherit; cursor: pointer; }
	.list button:hover { border-color: #c8553d; }
	.rank { font-family: var(--font-display, serif); color: #c8553d; text-align: center; }
	.name { display: grid; min-width: 0; }
	.name b { font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.name small { color: #7b857a; font-size: 0.75rem; }
	.total { font-family: var(--font-display, serif); font-size: 1.1rem; }
	.back { border: 0; background: none; padding: 0; margin: 0 0 0.5rem; color: #c8553d; font: inherit; font-size: 0.85rem; cursor: pointer; }
	.where { margin: 0 0 0.5rem; font-size: 0.82rem; color: #5b6660; }
	.scores { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.3rem; margin: 0 0 0.6rem; padding: 0; }
	.scores li { display: grid; justify-items: center; padding: 0.3rem 0; border-radius: 0.5rem; background: #f3ecdc; }
	.scores span { font-size: 0.68rem; color: #5b6660; }
	.scores b { font-family: var(--font-display, serif); font-size: 1.05rem; }
	dl { margin: 0; font-size: 0.82rem; line-height: 1.4; }
	dt { margin-top: 0.5rem; font-weight: 600; }
	dd { margin: 0.1rem 0 0; color: #33403a; }
	.sources { margin: 0; padding-left: 1.1rem; font-size: 0.8rem; line-height: 1.45; }
	.sources a { color: #2f5d4a; }
	.kept { color: #7b857a !important; }
</style>
