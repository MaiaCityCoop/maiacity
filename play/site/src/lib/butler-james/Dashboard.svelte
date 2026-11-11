<!--
	THE SELF-SERVE DASHBOARD, AS A PLACEHOLDER VIEW (intent 42a96129): the page says that a customer manages the models
	of their whole portfolio themselves, and shows what that looks like: a few placeholder models, filtered by kind.
	It is a picture on the landing page, marked as one; the dashboard itself (accounts, real models) is another intent.
-->
<script lang="ts">
	import { COPY } from './copy';
	import Gap from './Gap.svelte';

	const c = COPY.dashboard;
	type Filter = keyof typeof c.filters;
	let filter: Filter = $state('all');
	const shown = $derived(c.items.filter((i) => filter === 'all' || i.kind === filter));
	const count = (f: Filter) => c.items.filter((i) => f === 'all' || i.kind === f).length;
</script>

<section class="bj-section ink bj-dash-section" id="dashboard" data-section="dashboard">
	<div class="bj-wrap">
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.lead}</p>
		</header>
		<div class="bj-dash" data-dash>
			<div class="bj-dash-bar"><i></i><i></i><i></i><span>{COPY.brand}</span><b>{c.view}</b></div>
			<div class="bj-dash-body">
				<div class="bj-dash-side" role="group" aria-label={c.eyebrow}>
					{#each Object.keys(c.filters) as f}
						<button type="button" data-dash-filter={f} aria-pressed={filter === f} onclick={() => (filter = f as Filter)}>
							<span>{c.filters[f as Filter]}</span><span>{count(f as Filter)}</span>
						</button>
					{/each}
					<p aria-live="polite"><b data-dash-shown>{shown.length}</b> {c.shown}</p>
				</div>
				<ul class="bj-dash-grid">
					{#each shown as item (item.name)}
						<li class="bj-dash-item" data-dash-item={item.kind}>
							<div class="bj-dash-thumb">
								<svg viewBox="0 0 48 48" aria-hidden="true">
									{#if item.kind === 'model'}
										<path d="M24 6 42 16v16L24 42 6 32V16zM24 6v36M6 16l18 10 18-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
									{:else}
										<rect x="6" y="11" width="36" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" />
										<path d="M21 18v12l10-6z" fill="currentColor" />
									{/if}
								</svg>
							</div>
							<div><b>{item.name}</b><span>{c.kinds[item.kind]}</span></div>
							<small>{item.type}</small>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		{#each c.gaps as g}<Gap of={g} />{/each}
	</div>
</section>
