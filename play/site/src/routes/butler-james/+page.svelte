<!--
	Butler James (intent a6ae861e; play/api/src/leads.ts): Maia City's CRM table of leads, the firms we may sell to, first
	small German Makler who sell homes from €500k. Laid out as the Artifacts are (its Frame): down the left a search and
	the filters (stage, firm, source, region, each with its count); in the middle one table of the leads, sortable by
	every column, a do-not-contact row marked; a lead opens in the one aside every document has ($lib/app/Aside.svelte:
	Info, with every field, and History), and as an intent would make it (?lead=<uuid>&intent=<uuid>, from the intents'
	board). Read only: a lead is added and changed over MCP (add_lead, update_lead). Nothing here sends mail or calls
	(German UWG §7). Maia City's admins alone (the API says so too).
-->
<script lang="ts">
	import { day as when } from '$lib/format';
	import { onMount } from 'svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';
	import { api } from '$lib/api';
	import { markdown } from '$lib/site/markdown/index.js';

	type Lead = {
		id: string; company: string; contact?: string; email?: string; website?: string; phone?: string; city?: string; region?: string;
		firm?: string; segment?: string; source?: string; stage?: string; lost_reason?: string; next_step?: string; next_date?: string;
		notes?: string; found_at?: string; do_not_contact: boolean; version: number; created: string; updated: string; intent: string | null;
	};
	type Doc = { id: string; number: number; version?: number; json: Record<string, any>; intent?: { id: string; stage: string } };

	/** the pipeline in its order, and the words the lead schema keeps, as people read them (only shown) */
	const STAGES: Record<string, string> = { researched: 'Researched', contacted_call: 'Cold called', contacted_email: 'Cold emailed', reached: 'Reached', meeting: 'Meeting', offer: 'Offer', won: 'Won', lost: 'Lost' };
	const FIRMS: Record<string, string> = { solo: 'Solo', partners: '1–3 partners', family: 'Family business', traditional: 'Traditionsfirma', owner_run: 'Owner-run' };
	const SOURCES: Record<string, string> = { form: 'Form lead', cold: 'Cold lead', referral: 'Referral', other: 'Other' };
	type Col = { key: keyof Lead; label: string };
	const COLS: Col[] = [
		{ key: 'company', label: 'Company' },
		{ key: 'city', label: 'City' },
		{ key: 'firm', label: 'Firm' },
		{ key: 'source', label: 'Source' },
		{ key: 'stage', label: 'Stage' },
		{ key: 'next_date', label: 'Next' },
		{ key: 'email', label: 'Email' },
		{ key: 'website', label: 'Website' }
	];

	let leads = $state<Lead[]>([]);
	let loaded = $state(false);
	let error = $state('');
	let side = $state<'' | 'nav' | 'aside'>('');
	let query = $state('');
	let stage = $state('');
	let firm = $state('');
	let source = $state('');
	let region = $state('');
	let sortBy = $state<keyof Lead>('created');
	let desc = $state(true);
	let leadId = $state('');
	let intentId = $state('');
	let asOf = $state<Doc | null>(null);
	let shownV = $state<number | null>(null);

	const host = (u?: string) => {
		try {
			return u ? new URL(u).host.replace(/^www\./, '') : '';
		} catch {
			return u ?? '';
		}
	};
	const word = (map: Record<string, string>, v?: string) => (v ? (map[v] ?? v) : '');

	function address() {
		const q = new URLSearchParams();
		for (const [k, v] of [['lead', leadId], ['intent', leadId ? intentId : ''], ['q', query.trim()], ['stage', stage], ['firm', firm], ['source', source], ['region', region]]) if (v) q.set(k, v);
		const s = q.toString();
		return `${location.pathname}${s ? `?${s}` : ''}`;
	}
	function fromAddress() {
		const q = new URLSearchParams(location.search);
		leadId = q.get('lead') ?? '';
		intentId = q.get('intent') ?? '';
		query = q.get('q') ?? '';
		stage = q.get('stage') ?? '';
		firm = q.get('firm') ?? '';
		source = q.get('source') ?? '';
		region = q.get('region') ?? '';
	}
	async function load() {
		error = '';
		try {
			leads = (await api<{ items: Lead[] }>('/leads?limit=200')).items;
		} catch (e) {
			error = (e as Error).message;
		}
		await openAt();
		loaded = true;
	}
	/** the lead the address names, as kept or as its intent would make it */
	async function openAt() {
		asOf = null;
		shownV = null;
		if (leadId && intentId) asOf = await api<Doc>(`/docs/${encodeURIComponent(leadId)}?intent=${encodeURIComponent(intentId)}`).catch(() => null);
	}
	function go(change: () => void, push = true) {
		change();
		history[push ? 'pushState' : 'replaceState'](history.state, '', address());
		void openAt();
	}
	const openLead = (id: string) => go(() => ((leadId = id), (intentId = ''), (side = 'aside')));
	const toggle = (set: (v: string) => void, cur: string, v: string) => go(() => set(cur === v ? '' : v), false);
	function sort(k: keyof Lead) {
		if (sortBy === k) desc = !desc;
		else (sortBy = k), (desc = false);
	}
	async function picked(p: Pick | null) {
		if (!leadId) return;
		if (!p) return void ((asOf = intentId ? await api<Doc>(`/docs/${leadId}?intent=${encodeURIComponent(intentId)}`) : null), (shownV = null));
		asOf = await api<Doc>(`/docs/${leadId}?${'version' in p ? `v=${p.version}` : `edit=${p.edit.seq}`}`);
		shownV = 'version' in p ? p.version : null;
	}

	onMount(() => {
		fromAddress();
		void load();
		const back = () => (fromAddress(), void openAt());
		addEventListener('popstate', back);
		return () => removeEventListener('popstate', back);
	});

	const q = $derived(query.trim().toLowerCase());
	const matches = (l: Lead, skip = '') =>
		(skip === 'stage' || !stage || l.stage === stage) && (skip === 'firm' || !firm || l.firm === firm) && (skip === 'source' || !source || l.source === source) && (skip === 'region' || !region || l.region === region) &&
		(!q || [l.company, l.contact, l.email, l.website, l.city, l.region, l.segment, l.notes].some((v) => `${v ?? ''}`.toLowerCase().includes(q)));
	const shown = $derived(
		leads.filter((l) => matches(l)).sort((a, b) => {
			const x = `${a[sortBy] ?? ''}`, y = `${b[sortBy] ?? ''}`;
			const by = sortBy === 'stage' ? Object.keys(STAGES).indexOf(x) - Object.keys(STAGES).indexOf(y) : x.localeCompare(y, 'de');
			return desc ? -by : by;
		})
	);
	/** each filter's values with how many leads they hold under the other filters */
	const countsOf = (field: 'stage' | 'firm' | 'source' | 'region') => {
		const m = new Map<string, number>();
		for (const l of leads) if (l[field] && matches(l, field)) m.set(l[field]!, (m.get(l[field]!) ?? 0) + 1);
		return m;
	};
	const regions = $derived([...countsOf('region').entries()].sort((a, b) => a[0].localeCompare(b[0], 'de')));
	const filtered = $derived(!!(q || stage || firm || source || region));
	const opened = $derived(leads.find((l) => l.id === leadId) ?? null);
	/** the opened lead as kept, or as its History picks it */
	const view = $derived(opened && asOf ? ({ ...opened, ...asOf.json } as Lead) : asOf ? ({ id: leadId, ...asOf.json } as Lead) : opened);
	const clear = () => go(() => ((query = ''), (stage = ''), (firm = ''), (source = ''), (region = '')), false);
	let searching: ReturnType<typeof setTimeout> | undefined;
	const search = () => (clearTimeout(searching), (searching = setTimeout(() => go(() => {}, false), 250)));
</script>

<svelte:head><title>{view ? `${view.company} · ` : ''}Butler James · maiaCITY play</title></svelte:head>

{#snippet filters(title: string, field: 'stage' | 'firm' | 'source', words: Record<string, string>, cur: string, set: (v: string) => void)}
	<h3 class="nav-group">{title}</h3>
	{#each Object.keys(words).filter((k) => countsOf(field).get(k) || cur === k) as k (k)}
		<a class="nav-item" class:on={cur === k} href="?{field}={k}" onclick={(e) => (e.preventDefault(), toggle(set, cur, k))} aria-current={cur === k ? 'true' : undefined}
			><span>{words[k]}</span><small>{countsOf(field).get(k) ?? 0}</small></a
		>
	{:else}
		<p class="nav-empty soft">None yet.</p>
	{/each}
{/snippet}

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find a company, person, email, city" bind:value={query} oninput={search} aria-label="Find a lead" />
	<h3 class="nav-group">Butler James · our leads</h3>
	<a class="nav-item" class:on={!filtered} href="/butler-james/" onclick={(e) => (e.preventDefault(), clear())}><Icon name="table" size={16} /><span>Every lead</span><small>{leads.length}</small></a>
	{@render filters('Stage', 'stage', STAGES, stage, (v) => (stage = v))}
	{@render filters('Firm', 'firm', FIRMS, firm, (v) => (firm = v))}
	{@render filters('Source', 'source', SOURCES, source, (v) => (source = v))}
	<h3 class="nav-group">Region</h3>
	{#each regions as [r, n] (r)}
		<a class="nav-item" class:on={region === r} href="?region={encodeURIComponent(r)}" onclick={(e) => (e.preventDefault(), toggle((v) => (region = v), region, r))}><span>{r}</span><small>{n}</small></a>
	{:else}
		<p class="nav-empty soft">None yet.</p>
	{/each}
{/snippet}

{#snippet aside_()}
	<Aside doc={{ id: leadId, kind: 'lead', ...(asOf ?? {}) }} where="Butler James · {word(STAGES, view?.stage)}" label={view?.company ?? ''} shown={shownV} propose="Changed over MCP (update_lead): kept at once where the rule Leads need no tap is in force, else it waits at Proposal." onPick={picked}>
		{#snippet info()}
			{#if view}
				<dl class="fields">
					{#if view.do_not_contact}<dt>Contact</dt><dd class="dnc">Do not contact</dd>{/if}
					{#if view.contact}<dt>Person</dt><dd>{view.contact}</dd>{/if}
					{#if view.email}<dt>Email</dt><dd><a href="mailto:{view.email}">{view.email}</a></dd>{/if}
					{#if view.phone}<dt>Phone</dt><dd>{view.phone}</dd>{/if}
					{#if view.website}<dt>Website</dt><dd><a href={view.website} target="_blank" rel="noopener noreferrer">{host(view.website)} ↗</a></dd>{/if}
					{#if view.city || view.region}<dt>Where</dt><dd>{[view.city, view.region].filter(Boolean).join(', ')}</dd>{/if}
					{#if view.firm}<dt>Firm</dt><dd>{word(FIRMS, view.firm)}</dd>{/if}
					{#if view.segment}<dt>Sells</dt><dd>{view.segment}</dd>{/if}
					{#if view.source}<dt>Source</dt><dd>{word(SOURCES, view.source)}</dd>{/if}
					<dt>Stage</dt><dd>{word(STAGES, view.stage)}{view.lost_reason ? `: ${view.lost_reason}` : ''}</dd>
					{#if view.next_step || view.next_date}<dt>Next</dt><dd>{view.next_step ?? ''}{view.next_date ? ` · ${view.next_date}` : ''}</dd>{/if}
					{#if view.found_at}<dt>Found at</dt><dd><a href={view.found_at} target="_blank" rel="noopener noreferrer">{host(view.found_at)} ↗</a></dd>{/if}
					{#if view.created}<dt>Kept</dt><dd>{when(view.created)}</dd>{/if}
				</dl>
				{#if view.notes}<div class="notes">{@html markdown(view.notes)}</div>{/if}
			{/if}
		{/snippet}
	</Aside>
{/snippet}

<div class="pg">
	<Frame nav={loaded ? shelf : undefined} aside={leadId && view ? aside_ : undefined} bind:open={side} navLabel="Find and filter the leads" asideLabel="The lead and its history" navIcon="search" flush>
		{#if !loaded}
			<p class="note soft">Opening Butler James…</p>
		{:else}
			<div class="sheet">
				<div class="bar">
					<b>Butler James</b>
					<span class="soft">{shown.length} of {leads.length} {leads.length === 1 ? 'lead' : 'leads'}{q ? ` matching “${query.trim()}”` : ''} · added and changed over MCP</span>
					{#if filtered}<button class="chip" onclick={clear}>Clear</button>{/if}
				</div>
				{#if error}<p class="bad">{error}</p>{/if}
				<div class="wrap">
					<table>
						<thead>
							<tr>
								{#each COLS as c (c.key)}
									<th aria-sort={sortBy === c.key ? (desc ? 'descending' : 'ascending') : 'none'}><button onclick={() => sort(c.key)}>{c.label}{sortBy === c.key ? (desc ? ' ↓' : ' ↑') : ''}</button></th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each shown as l (l.id)}
								<tr class:on={l.id === leadId} class:dnc={l.do_not_contact} onclick={() => openLead(l.id)}>
									<td class="company">
										<a href="?lead={l.id}" onclick={(e) => (e.preventDefault(), e.stopPropagation(), openLead(l.id))}>{l.company}</a>
										{#if l.do_not_contact}<span class="flag" title="Do not contact">Do not contact</span>{/if}
										{#if l.intent}<span class="waits" title="A change of it waits at Proposal">waits</span>{/if}
									</td>
									<td>{l.city ?? ''}</td>
									<td>{word(FIRMS, l.firm)}</td>
									<td>{word(SOURCES, l.source)}</td>
									<td><span class="stage s-{l.stage}">{word(STAGES, l.stage)}</span></td>
									<td class="next">{l.next_date ?? ''}{l.next_step ? ` ${l.next_step}` : ''}</td>
									<td class="mail">{#if l.email}<a href="mailto:{l.email}" onclick={(e) => e.stopPropagation()}>{l.email}</a>{:else}<span class="soft">none published</span>{/if}</td>
									<td>{#if l.website}<a class="out" href={l.website} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()}>{host(l.website)} ↗</a>{/if}</td>
								</tr>
							{:else}
								<tr><td colspan={COLS.length} class="empty soft">{filtered ? 'No lead matches that.' : 'No lead is kept yet: ask your agent to add one (add_lead).'}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</Frame>
</div>

<style>
	.pg { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); }
	.pg :global(.soft) { color: var(--soft); }
	.pg :global(.chip) { display: inline-flex; align-items: center; padding: 0.15rem 0.6rem; border: 0; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; color: inherit; cursor: pointer; }
	.note { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.bad { margin: 0.5rem 1rem; color: var(--terracotta); font-size: 0.85rem; }
	.nav-empty { margin: 0.2rem 0.6rem 0.4rem; font-size: 0.78rem; }
	.sheet { display: flex; flex-direction: column; height: 100%; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.9rem; padding: 0.7rem 1rem; border-bottom: 1px solid var(--line); background: rgb(255 255 255 / 0.94); font-size: 0.85rem; }
	.bar b { font-size: 1rem; }
	.wrap { flex: 1; min-height: 0; overflow: auto; padding: 0 0 var(--nav-room, 6rem); }
	table { width: 100%; border-collapse: collapse; font-size: 0.82rem; background: var(--paper, #fff); }
	thead th { position: sticky; top: 0; z-index: 1; background: var(--paper, #fff); border-bottom: 1px solid var(--line); text-align: left; padding: 0; white-space: nowrap; }
	th button { width: 100%; padding: 0.55rem 0.7rem; border: 0; background: none; font: inherit; font-weight: 700; font-size: 0.74rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--soft); text-align: left; cursor: pointer; }
	th[aria-sort='ascending'] button, th[aria-sort='descending'] button { color: var(--ink); }
	td { padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--line); vertical-align: top; }
	tbody tr { cursor: pointer; }
	tbody tr:hover { background: rgb(36 69 47 / 0.04); }
	tbody tr.on { background: rgb(36 69 47 / 0.09); }
	tbody tr.dnc td { opacity: 0.55; }
	tbody tr.dnc td.company { opacity: 1; }
	.company a { color: var(--ink); font-weight: 600; text-decoration: none; }
	.flag, .waits { display: inline-block; margin-left: 0.35rem; padding: 0.02rem 0.4rem; border-radius: 999px; font-size: 0.68rem; font-weight: 600; white-space: nowrap; }
	.flag { background: rgb(190 80 60 / 0.15); color: var(--terracotta); }
	.waits { background: rgb(196 140 40 / 0.16); }
	.stage { display: inline-block; padding: 0.05rem 0.5rem; border-radius: 999px; background: rgb(0 0 0 / 0.06); font-size: 0.74rem; font-weight: 600; white-space: nowrap; }
	.s-reached, .s-meeting, .s-offer { background: rgb(196 140 40 / 0.18); }
	.s-won { background: var(--brand-green, #24452f); color: #fff; }
	.s-lost { background: rgb(190 80 60 / 0.15); color: var(--terracotta); }
	.next { min-width: 8rem; }
	.mail a, .out { color: var(--brand-green, #24452f); text-decoration: none; overflow-wrap: anywhere; }
	.out { white-space: nowrap; font-weight: 600; }
	.empty { padding: 1.2rem; text-align: center; }
	.fields { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 0.7rem; margin: 0.6rem 0 0; font-size: 0.8rem; }
	.fields dt { color: var(--soft); }
	.fields dd { margin: 0; overflow-wrap: anywhere; }
	.fields a { color: var(--brand-green, #24452f); }
	.dnc { color: var(--terracotta); font-weight: 700; }
	.notes { margin-top: 0.7rem; padding-top: 0.5rem; border-top: 1px solid var(--line); font-size: 0.82rem; line-height: 1.5; }
	.notes :global(p) { margin: 0 0 0.5rem; }
	@media (max-width: 720px) {
		/* on a phone the table keeps company, stage and next; the rest is the lead's aside */
		th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4), th:nth-child(7), td:nth-child(7), th:nth-child(8), td:nth-child(8) { display: none; }
	}
</style>
