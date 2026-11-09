<!--
	Postgres: the admins' window into play's Postgres, read only (play/api/src/tables.ts, ported from legacy's
	maia/site/routes/app/postgres), laid out as the asset viewer is (routes/assets, its Frame): the tables down the left
	like the asset shelf, a table's rows in the middle as tall and as wide as it is, and down the right what is opened —
	a row whole, titled by its table and its first value, or, none opened, the table's columns. A column that keeps a
	secret or a credential is never sent, only that it is there. Maia City's admins alone (the API says so too); anyone
	else is taken back to the dashboard.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import { api } from '$lib/api';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';

	const PAGE = 50;

	type Column = { name: string; type: string; hidden: boolean };
	type Table = { name: string; rows: number; columns: Column[] };
	type Page = { name: string; columns: Column[]; total: number; offset: number; limit: number; rows: Record<string, any>[] };
	let tables = $state<Table[]>([]);
	let loaded = $state(false);
	let error = $state('');
	let query = $state('');
	let chosen = $state('');
	let data = $state<Page | null>(null);
	let busy = $state(false);
	/** the row opened whole, by its place on the page */
	let open = $state(-1);
	adminsOnly();
	const admin = $derived(isAdmin());
	const found = $derived(tables.filter((t) => t.name.includes(query.trim().toLowerCase())));
	const table = $derived(tables.find((t) => t.name === chosen));
	const row = $derived(data && open >= 0 ? data.rows[open] : null);

	/** The tables, and the first one's rows: the one the address names, else the first. */
	async function load() {
		[loaded, error] = [false, ''];
		try {
			tables = await api<Table[]>('/tables');
			const asked = new URLSearchParams(location.search).get('table');
			const first = tables.find((t) => t.name === asked) ?? tables[0];
			if (first) await show(first.name, 0);
		} catch (e) {
			error = (e as Error).message;
		}
		loaded = true;
	}

	onMount(() => {
		if (!admin) return;
		void load();
	});

	async function show(name: string, offset: number) {
		chosen = name;
		open = -1;
		busy = true;
		error = '';
		try {
			data = await api<Page>(`/tables/${encodeURIComponent(name)}?offset=${offset}&limit=${PAGE}`);
			const url = new URL(location.href);
			url.searchParams.set('table', name);
			history.replaceState(history.state, '', url);
		} catch (e) {
			error = (e as Error).message;
		}
		busy = false;
	}

	/** A cell, short, as the grid shows it. */
	function short(v: any) {
		if (v === null || v === undefined) return '—';
		if (v?.hidden) return 'hidden';
		const text = v?.cut !== undefined ? v.cut : typeof v === 'string' ? v : JSON.stringify(v);
		return text.length > 80 ? `${text.slice(0, 80)}…` : text;
	}

	/** A cell, whole, as the opened row shows it. */
	function whole(v: any) {
		if (v === null || v === undefined) return '—';
		if (v?.hidden) return 'hidden: it keeps a secret or a credential';
		if (v?.cut !== undefined) return `${v.cut}\n… cut at ${v.cut.length.toLocaleString('en-US')} of ${v.length.toLocaleString('en-US')} characters`;
		return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
	}

	const pages = $derived(data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1);
	const at = $derived(data ? Math.floor(data.offset / data.limit) + 1 : 1);
</script>

<svelte:head><title>{chosen ? `${chosen} · ` : ''}Postgres · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find a table" bind:value={query} aria-label="Find a table" />
	<h3 class="nav-group">Postgres · schema play</h3>
	{#each found as t (t.name)}
		<a class="nav-item" class:on={chosen === t.name} href="?table={t.name}" onclick={(e) => (e.preventDefault(), show(t.name, 0))} aria-current={chosen === t.name ? 'page' : undefined}
			><Icon name="table" size={16} /><span class="mono">{t.name}</span><small>{t.rows.toLocaleString('en-US')}</small></a
		>
	{:else}
		<p class="soft none">No table is called that.</p>
	{/each}
{/snippet}

{#snippet about()}
	{#if data && row}
		<header class="about-head">
			<small class="mono">{data.name} · row {data.offset + open + 1}</small>
			<h3 class="mono" title={whole(row[data.columns[0].name])}>{short(row[data.columns[0].name])}</h3>
			<button class="btn small ghost shut-row" onclick={() => (open = -1)}>Close the row</button>
		</header>
		<dl class="whole">
			{#each data.columns as c (c.name)}
				<dt>{c.name} <small>{c.type}{c.hidden ? ' · hidden' : ''}</small></dt>
				<dd><pre>{whole(row[c.name])}</pre></dd>
			{/each}
		</dl>
	{:else if table}
		<header class="about-head">
			<small>Read only · its secrets hidden</small>
			<h3 class="mono">{table.name}</h3>
			<p class="soft">{table.rows.toLocaleString('en-US')} {table.rows === 1 ? 'row' : 'rows'} · {table.columns.length} columns</p>
		</header>
		<h4 class="side-head">Columns</h4>
		<dl class="cols">
			{#each table.columns as c (c.name)}
				<dt class="mono">{c.name}</dt>
				<dd>{c.type}{#if c.hidden}<span class="chip">hidden</span>{/if}</dd>
			{/each}
		</dl>
		<p class="soft hint">Tap a row to see it whole here.</p>
	{/if}
{/snippet}

{#if admin}
	<div class="pg">
		<Frame nav={loaded ? shelf : undefined} aside={table ? about : undefined} navLabel="Postgres's tables" asideLabel="The row or the table" navIcon="database" asideIcon="info" flush>
			{#if !loaded}
				<p class="soft note">One moment…</p>
			{:else if !tables.length}
				<p class="note">{error || 'No tables yet.'}</p>
			{:else if data}
				<div class="sheet">
					<div class="bar">
						<b class="mono">{data.name}</b>
						<span class="soft">{data.total.toLocaleString('en-US')} {data.total === 1 ? 'row' : 'rows'} · {data.columns.length} columns</span>
						{#if pages > 1}
							<span class="pager">
								<button class="chip" disabled={busy || at <= 1} onclick={() => data && show(data.name, data.offset - data.limit)}>Back</button>
								<span class="soft">Page {at} of {pages}</span>
								<button class="chip" disabled={busy || at >= pages} onclick={() => data && show(data.name, data.offset + data.limit)}>Next</button>
							</span>
						{/if}
					</div>
					{#if error}<p class="bad">{error}</p>{/if}
					{#if data.rows.length}
						<div class="grid" class:busy>
							<table>
								<thead>
									<tr>{#each data.columns as c (c.name)}<th title={c.type}>{c.name}{#if c.hidden}<small> · hidden</small>{/if}</th>{/each}</tr>
								</thead>
								<tbody>
									{#each data.rows as r, i (i)}
										<tr class:open={open === i} onclick={() => (open = open === i ? -1 : i)}>
											{#each data.columns as c (c.name)}<td class:soft={r[c.name] == null || r[c.name]?.hidden}>{short(r[c.name])}</td>{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="note">This table is empty.</p>
					{/if}
				</div>
			{:else if error}
				<p class="bad note">{error}</p>
			{/if}
		</Frame>
	</div>
{/if}

<style>
	/* the asset viewer's frame and colours (routes/assets): the whole screen, the nav pill floating over it */
	.pg {
		position: fixed;
		inset: 0;
		background: var(--cream);
		--soft: rgb(38 56 44 / 0.6);
	}
	.pg :global(.soft) { color: var(--soft); }
	.pg :global(.chip) { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.6rem; border: 0; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; color: inherit; cursor: pointer; }
	.pg :global(.chip:disabled) { opacity: 0.45; cursor: default; }
	.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
	.note { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.bad { margin: 0.5rem 1rem; color: var(--terracotta); font-size: 0.85rem; }

	/* the middle: the table's bar across the top, its rows under it to the foot of the screen */
	.sheet { display: flex; flex-direction: column; height: 100%; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.9rem; padding: 0.7rem 1rem; border-bottom: 1px solid var(--line); background: rgb(255 255 255 / 0.94); font-size: 0.85rem; }
	.bar b { font-size: 1rem; }
	.pager { display: inline-flex; align-items: center; gap: 0.5rem; margin-left: auto; }
	.grid { flex: 1; min-height: 0; overflow: auto; padding-bottom: var(--nav-room); }
	.grid.busy { opacity: 0.55; }
	table { border-collapse: collapse; font-size: 0.8rem; width: max-content; min-width: 100%; }
	th, td { padding: 0.45rem 0.7rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; white-space: nowrap; max-width: 22rem; overflow: hidden; text-overflow: ellipsis; }
	th { position: sticky; top: 0; z-index: 1; background: var(--paper); font-weight: 600; }
	th small { font-weight: 400; color: var(--soft); }
	td.soft { color: var(--soft); }
	tbody tr { cursor: pointer; }
	tbody tr:hover { background: rgb(0 0 0 / 0.03); }
	tbody tr.open { background: var(--mustard-soft); }

	/* the right: as the asset viewer's aside */
	.about-head { position: relative; margin: 0 0 0.9rem 0.35rem; }
	.about-head small { color: var(--brand-green); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 600; overflow-wrap: anywhere; }
	.about-head p { margin: 0.1rem 0 0; font-size: 0.8rem; }
	.shut-row { margin-top: 0.6rem; }
	.side-head { margin: 0 0 0.5rem 0.35rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.cols { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.3rem 0.8rem; margin: 0 0 0 0.35rem; font-size: 0.8rem; }
	.cols dt { overflow-wrap: anywhere; }
	.cols dd { margin: 0; color: var(--soft); }
	.cols .chip { margin-left: 0.4rem; background: var(--mustard-soft); color: var(--ink); }
	.hint { margin: 1rem 0 0 0.35rem; font-size: 0.8rem; }
	.whole { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.15rem; margin: 0 0 0 0.35rem; font-size: 0.82rem; }
	.whole dt { font-weight: 600; overflow-wrap: anywhere; }
	.whole dt small { display: block; font-weight: 400; color: var(--soft); }
	.whole dd { margin: 0 0 0.6rem; min-width: 0; }
	.whole pre { margin: 0; max-height: 24rem; overflow: auto; padding: 0.5rem 0.6rem; border-radius: 10px; background: #fff; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.76rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
