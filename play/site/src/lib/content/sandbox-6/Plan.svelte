<!--
	Sandbox 6's plan and its numbers, beside the world: the seven hexes from above, their land painted from the raster
	(./land.ts), every dome and the tower on it; and the audit (./audit.ts), each number with how its input is known, a
	number whose input is not audited yet shown as such, never guessed.
-->
<script lang="ts">
	import { corners, type Village } from './geometry';
	import { landOf, USE_IDS, USES } from './land';
	import { auditOf, standing, type Audit } from './audit';

	let { village, audit }: { village: Village; audit: Audit } = $props();
	const A = $derived(auditOf(village, audit));
	let tab = $state<'plan' | 'numbers' | 'inputs'>('plan');

	/** a hex's land as a picture: one pixel a cell */
	function picture(key: string) {
		const land = landOf(A.sized, key);
		const c = document.createElement('canvas');
		c.width = land.nx;
		c.height = land.nz;
		const g = c.getContext('2d')!, img = g.createImageData(land.nx, land.nz);
		const rgb = USE_IDS.map((u) => USES[u].map.match(/\w\w/g)!.map((h) => parseInt(h, 16)));
		land.cells.forEach((u, k) => (u === 255 ? img.data.set([0, 0, 0, 0], k * 4) : img.data.set([...rgb[u], 255], k * 4)));
		g.putImageData(img, 0, 0);
		return { href: c.toDataURL(), x: land.x0, z: land.z0, w: land.nx * land.cell, h: land.nz * land.cell };
	}
	const pictures = $derived(Object.fromEntries(Object.keys(village.plans).map((k) => [k, picture(k)])));
	const sized = $derived(A.sized);
	const span = $derived(village.hex.flats * 1.75);
	const n = (x: number | null, unit = '', digits = 0) => (x === null ? 'unaudited' : `${x.toLocaleString('en', { maximumFractionDigits: digits })}${unit}`);
	const ha = (m2: number) => n(m2 / 1e4, ' ha', 1);
	const eur = (x: number | null) => (x === null ? 'unaudited' : `€${(x / 1e6).toLocaleString('en', { maximumFractionDigits: 1 })}M`);
	/** a low · typical · high range in € millions */
	const r = (x: [number, number, number] | null | undefined) => (x ? `${eur(x[0])} · ${eur(x[1])} · ${eur(x[2])}` : 'unaudited');
	const hexLabel = (key: string) => village.hexes.find((h) => h.key === key)?.label ?? 'The whole village';
</script>

<div class="plan">
	<div class="tabs" role="tablist">
		{#each [['plan', 'Plan'], ['numbers', 'Numbers'], ['inputs', 'Inputs']] as [id, label]}
			<button role="tab" aria-selected={tab === id} class:on={tab === id} onclick={() => (tab = id as typeof tab)}>{label}</button>
		{/each}
	</div>

	{#if tab === 'plan'}
		<svg viewBox="{-span} {-span} {2 * span} {2 * span}" aria-label="The village from above, north up">
			{#each village.hexes as hex}
				{@const p = pictures[hex.plan]}
				<g transform="translate({hex.x} {hex.z})">
					<image href={p.href} x={p.x} y={p.z} width={p.w} height={p.h} style="image-rendering: pixelated" />
					<polygon points={corners(village.hex.flats).map(([x, z]) => `${x},${z}`).join(' ')} fill="none" stroke="#2c3a2f" stroke-width="3" />
					{#each village.plans[hex.plan].sites as s}
						<circle cx={s.x} cy={s.z} r={sized.kinds[s.kind].D / 2} fill="none" stroke="#1f2a23" stroke-width="1.5"><title>{s.name}</title></circle>
					{/each}
				</g>
			{/each}
		</svg>
		<ul class="legend">
			{#each USE_IDS.filter((u) => A.villageLand[u] > 0) as u}
				<li><span style:background={USES[u].map}></span>{USES[u].label} <em>{ha(A.villageLand[u])}</em></li>
			{/each}
		</ul>
	{:else if tab === 'numbers'}
		<section>
			<h3>The village</h3>
			<dl>
				<dt>Hexes</dt><dd>{village.hexes.length} of {ha(A.hexArea)} each: {ha(A.hexArea * village.hexes.length)}</dd>
				<dt>A resident’s floor</dt><dd>{n(A.gfaPerson, ' m²', 1)} gross</dd>
				<dt>Beds a living hex</dt><dd>{n(A.bedsHex)}</dd>
				<dt>Beds in the village</dt><dd>{n(A.bedsVillage)} in {A.livingHexes} living hexes; none in the centre hex</dd>
			</dl>
			<h3>A home dome</h3>
			<dl>
				{#each Object.values(A.homes) as h}
					<dt>{h.kind.replace('dome', 'Dome')}</dt><dd>{h.storeys} storeys, {n(h.gfa, ' m²')} gross, {n(h.beds)} beds</dd>
				{/each}
			</dl>
			<h3>The tower</h3>
			<p class="how">Sized from what the village needs: each use’s floor a resident, or its rooms, over the usable share of a storey; the old bell scaled until its storeys hold that.</p>
			<dl>
				{#each A.tower.need as u}
					<dt>{u.label}</dt><dd>{u.use}, {n(u.m2, ' m²')}{#if u.rooms !== null && u.rooms > 1}, {u.rooms}{/if}</dd>
				{/each}
				<dt>Usable floor</dt><dd>{n(A.tower.net, ' m²')}</dd>
				<dt>Gross floor</dt><dd>{n(A.tower.gfa, ' m²')} <small>(the old 180 m shape: {n(A.tower.full, ' m²')})</small></dd>
				{#if A.tower.shape}
					<dt>Its size</dt><dd>{n(A.tower.shape.D, ' m')} at its foot, {n(A.tower.shape.H, ' m')} high, {A.tower.storeys?.length} storeys</dd>
				{/if}
			</dl>
			<h3>What it costs</h3>
			<p class="how">Self-built is the village’s cost (Samuel 2026-11-09): materials, with the villagers’ own labour, paid in minds. The contractor price and the labour (the difference) beside it. Low · <strong>typical</strong> · high.</p>
			<dl>
				<dt>The village’s part</dt><dd>{r(A.cost.village?.self)}</dd>
				<dt>…by a contractor</dt><dd>{r(A.cost.village?.contractor)}</dd>
				<dt>…its labour</dt><dd>{r(A.cost.village?.labour)}</dd>
				<dt>What villagers and investors raise</dt><dd>{eur(A.cost.budget)}</dd>
				<dt>{A.cost.headroom !== null && A.cost.headroom < 0 ? 'The gap' : 'Headroom'}</dt><dd class:gap={A.cost.headroom !== null && A.cost.headroom < 0}>{eur(A.cost.headroom === null ? null : Math.abs(A.cost.headroom))}</dd>
				{#if A.cost.towerSaving}<dt>The smaller tower saves</dt><dd>{r(A.cost.towerSaving)} <small>against the old shape</small></dd>{/if}
			</dl>
			{#if A.cost.byHex}
				<h4>By hex, self-built</h4>
				<dl>{#each Object.entries(A.cost.byHex) as [hex, t]}<dt>{hexLabel(hex)}</dt><dd>{r(t?.self)}</dd>{/each}</dl>
			{/if}
			{#if A.cost.byGroup}
				<h4>By kind, self-built (contractor)</h4>
				<dl>{#each Object.entries(A.cost.byGroup) as [g, t]}<dt>{g}</dt><dd>{eur(t?.self[1] ?? null)} <small>({eur(t?.contractor[1] ?? null)})</small></dd>{/each}</dl>
			{/if}
			<h4>Each coop’s own, not counted against the budget</h4>
			<dl>{#each A.cost.coops as c}<dt>{c.coop}</dt><dd>{r(c.total?.contractor)}</dd>{/each}</dl>
		</section>
	{:else}
		<section>
			<h3>Inputs</h3>
			<ul class="inputs">
				{#each Object.entries(audit.inputs) as [id, i]}
					<li class={standing(i)}>
						<strong>{i.label}</strong>: {i.value === null ? 'not yet audited' : `${i.value.toLocaleString('en')} ${i.unit}`}
						<small>{standing(i)}{#if i.source}: {i.source}{:else if i.decided}: {i.decided}{:else if i.estimate}: {i.estimate}{:else if i.pending}: {i.pending}{/if}</small>
					</li>
				{/each}
			</ul>
			<h3>Unit costs</h3>
			{#if audit.research}<p class="how">{audit.research.note}</p>{/if}
			<ul class="inputs">
				{#each audit.costs as c}
					<li class={c.estimate ? 'estimate' : 'sourced'}>
						<strong>{c.label}</strong>: self-built {c.self.join(' · ')}, contractor {c.contractor.join(' · ')} {c.unit}
						<small>{c.payer === 'coop' ? `${c.coop}'s own` : 'the village’s'}{c.estimate ? ' · an estimate' : ''}{c.basis ? ` · ${c.basis}` : ''} · {c.source}{c.note ? ` · ${c.note}` : ''}</small>
					</li>
				{/each}
			</ul>
			<h3>Who pays what</h3>
			<p><strong>The village’s part</strong>: {audit.split.village.join('; ')}.</p>
			<p><strong>Each coop’s own</strong>: {audit.split.coop.join('; ')}.</p>
		</section>
	{/if}
</div>

<style>
	.plan { display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem; color: var(--ink, #1f2a23); }
	.tabs { display: flex; justify-content: center; gap: 0.25rem; }
	.tabs button { border: 1px solid #c9bca2; background: #fffaf0; border-radius: 999px; padding: 0.25rem 0.8rem; cursor: pointer; }
	.tabs button.on { background: #1f2a23; color: #fffaf0; }
	svg { width: 100%; height: auto; background: #f4efe2; border-radius: 0.5rem; }
	.legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 0.75rem; }
	.legend span { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 0.2rem; margin-right: 0.35rem; vertical-align: -0.1rem; }
	.legend em { color: #6b6457; font-style: normal; }
	h3 { margin: 0.75rem 0 0.25rem; font-size: 0.9rem; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.75rem; margin: 0; }
	dt { color: #6b6457; }
	dd { margin: 0; }
	.how { color: #6b6457; margin: 0.2rem 0 0.4rem; }
	h4 { margin: 0.5rem 0 0.2rem; font-size: 0.82rem; }
	.gap { color: #a33a1e; font-weight: 600; }
	.pending { color: #8a5a20; background: #fbf1df; padding: 0.5rem; border-radius: 0.4rem; }
	.inputs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.inputs small { display: block; color: #6b6457; }
	.inputs .pending small { color: #8a5a20; }
</style>
