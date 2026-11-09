<!--
	The Game editor (Samuel 2026-11-04): the game's configs, in the asset library's frame ($lib/app/Frame). On the left
	the configs to pick from (first the levelling: how a village grows, level by level); in the middle the one picked,
	worked out (./levels.ts): every level with the villagers that reach it, what it unlocks and costs, what a mind costs,
	the minds each new villager gets for their euros and hearts, the investor's ticket with its minds and share (held to its
	cap a villager, its minds to keep the villagers at their least share) and what it paid for a mind, the beds against the
	villagers, and the treasury after it in euros (the village's own; the coops' own beside it), hearts and minds. On the right the one aside ($lib/app/Aside.svelte):
	its Info, and its History (its versions, every edit it was made in, its open intent variants).

	A config is a Loro document in play's Postgres (play/SPEC.md "Version control", play/api/src/versioned.ts), read from
	the API (/api/docs); it changes only by proposal (over MCP: doc_edit, propose_doc_version), decided on the intents' board. `?config=<id>`
	picks one, `&v=<n>` one of its versions, `&intent=<id>` the config as an intent's work at Proposal would make it. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';
	import { VILLAGERS_MIN, euros, isCoop, ledger, pct, short, whole, type Levelling, type Row } from './levels';

	type Item = { id: string; label: string; schema: string; note: string; number: number; versions: number };
	type Version = { number: number; note: string; at: string; acceptedBy: string | null };
	type Config = { id: string; json: any; number: number; version?: number; edit?: number; versions: Version[]; intent?: { id: string; status: string; note: string } };

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let config = $state<Config | null>(null);
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const id = $derived(params.get('config') ?? list[0]?.id ?? '');
	const wantV = $derived(params.get('v'));
	const wantIntent = $derived(params.get('intent'));
	/** the config as the address asks for it: an intent's work, a version, or Main */
	const asked = () => (wantIntent ? `?intent=${encodeURIComponent(wantIntent)}` : wantV ? `?v=${encodeURIComponent(wantV)}` : '');
	$effect(() => {
		if (!admin) return;
		api<Item[]>('/docs?kind=game_config').then((l) => (list = l), (e) => (error = e.message));
	});
	$effect(() => {
		if (!admin || !id) return;
		let gone = false;
		api<Config>(`/docs/${id}${asked()}`).then(
			(c) => !gone && ((config = c), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (c: string, v?: number) => goto(`?config=${c}${v ? `&v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	/** its History: a version picked is that version; an edit picked, the config as it stood at it */
	async function picked_(p: Pick | null) {
		if (!config) return;
		if (!p) return void (config = await api<Config>(`/docs/${config.id}${asked()}`));
		if ('version' in p) return void at(config.id, p.version === config.number ? undefined : p.version);
		config = await api<Config>(`/docs/${config.id}?edit=${p.edit.seq}`);
	}

	const levelling = $derived(config?.json.schema === 'levels/1' ? (config.json as Levelling) : null);
	const rows = $derived(levelling ? ledger(levelling) : []);
	const last = $derived(rows.at(-1));
	/** the villagers' lowest share of the minds after any level, and the first level short of beds */
	const lowest = $derived(Math.min(1, ...rows.map((r) => r.treasury.villagers)));
	const short_ = $derived(rows.find((r) => !r.housed || !r.ready));
	const times = (x: number) => (Number.isFinite(x) ? `${(Math.round(x * 100) / 100).toString()}×` : '—');
	/** the phases in order, each with its rows */
	const phases = $derived.by(() => {
		const out: { phase: string; rows: Row[] }[] = [];
		for (const r of rows) {
			if (out.at(-1)?.phase !== r.level.phase) out.push({ phase: r.level.phase, rows: [] });
			out.at(-1)!.rows.push(r);
		}
		return out;
	});
</script>

<svelte:head><title>{config?.json.label ?? 'Game editor'} · Game editor · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<h3 class="nav-group">Game configs</h3>
	{#each list as c (c.id)}
		<a class="nav-item" class:on={id === c.id} href="?config={c.id}" onclick={(e) => (e.preventDefault(), at(c.id))} aria-current={id === c.id ? 'page' : undefined}
			><Icon name="settings" size={16} /><span>{c.label}</span><small>v{c.number}</small></a
		>
	{/each}
	<p class="soon">More configs come here as the game grows: the buildings, the resources, the coops.</p>
{/snippet}

{#snippet side()}
	<Aside doc={config!} where="Game config" label={config!.json.label} shown={wantV ? Number(wantV) : null} propose="Propose v{config!.number + 1} over MCP (doc_edit, propose_doc_version)." onPick={picked_} />
{/snippet}

{#if admin}
	<div class="editor">
		<Frame nav={shelf} aside={config ? side : undefined} navLabel="The game's configs" asideLabel="The config's history" navIcon="board">
			<div class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if levelling && last}
					<header class="top">
						<p class="eyebrow">Game editor · {levelling.label}</p>
						<h1>How a village grows</h1>
						{#if levelling.note}<p class="lead">{levelling.note}</p>{/if}
						<p class="rules">
							Every villager brings <b>{euros(levelling.villager.euros)}</b> and <b>{short(levelling.villager.hearts)} hearts</b>. A mind costs {short(levelling.minds.heartsPerMind)} hearts at level 1 and {short(levelling.minds.step)} more at every level, or that in euros at {levelling.minds.heartsPerEuro} hearts a euro. At each level an investor adds a multiple of the new villagers' euros{#if levelling.investor?.maxPerVillager}, at most <b>€{whole(levelling.investor.maxPerVillager)}</b> a new villager{/if}; the villagers always hold at least <b>{pct(levelling.minds.villagersMin ?? VILLAGERS_MIN)}</b> of the minds{#if levelling.minds.labourShare}, the minds paid to those who build among them (<b>{pct(levelling.minds.labourShare)}</b> of what contractors would have charged for their work){/if}, so the investor pays more for a mind than a villager. The treasury pays only the village's own (land, domes, the tower, infrastructure); what a coop puts into its own is counted beside it.
						</p>
					</header>

					<div class="stats">
						<div><span>Villagers</span><b>{whole(last.level.villagers)}</b><small>{rows.length} levels</small></div>
						<div><span>Raised</span><b>{euros(last.treasury.raised)}</b><small>{euros(last.treasury.euros.villagers)} villagers · {euros(last.treasury.euros.investors)} investors</small></div>
						<div><span>Built</span><b>{euros(last.treasury.spent)}</b><small class:low={last.treasury.left < 0}>{euros(last.treasury.left)} left in the treasury</small>{#if last.treasury.contractor.spent !== last.treasury.spent}<small>{euros(last.treasury.contractor.spent)} by contractors, {euros(last.treasury.contractor.left)} left</small>{/if}</div>
						<div><span>Coops' own</span><b>{euros(last.treasury.coops)}</b><small>put into their own coops, not from the treasury</small></div>
						<div><span>Beds</span><b class:low={!!short_}>{whole(last.beds)}</b><small>{short_ ? `short from level ${short_.n}` : 'a bed for every villager at every level'}</small></div>
						<div><span>Hearts</span><b>{short(last.treasury.hearts)}</b><small>in the coop's treasury</small></div>
						<div><span>Minds</span><b>{short(last.treasury.minds)}</b><small>villagers hold {pct(last.treasury.villagers)}, never under {pct(lowest)}</small></div>
						<div><span>Early bird</span><b>{whole(rows[0].villager.minds)}</b><small>minds for the first villager, {whole(last.villager.minds)} for the last</small></div>
					</div>

					<div class="scroll">
						<table>
							<thead>
								<tr>
									<th>Level</th>
									<th>Villagers</th>
									<th class="wide">Unlocks</th>
									<th class="num">Cost</th>
									<th class="num">Each new villager</th>
									<th class="num">Investor</th>
									<th class="num">Beds</th>
									<th class="num tre">Treasury</th>
								</tr>
							</thead>
							{#each phases as ph (ph.phase + ph.rows[0].n)}
								<tbody>
									<tr class="phase"><th colspan="8">{ph.phase}</th></tr>
									{#each ph.rows as r (r.level.id)}
										<tr>
											<td><b class="lvl">{r.n}</b></td>
											<td><b>{whole(r.level.villagers)}</b><small>+{whole(r.joined)} new</small></td>
											<td class="wide">
												<ul class="unlocks">
													{#each r.level.unlocks as u, i (i)}<li class:coop={isCoop(u)}>{u.label}{#if isCoop(u)}<span class="who">{u.coop ?? 'a coop'}'s own</span>{/if}{#if u.beds}<span class="who">{u.beds} beds</span>{/if}{#if u.pending}<span class="who pending">pending</span>{/if}<em>{euros(u.cost)}{#if u.contractor}<small>{euros(u.contractor)} by contractors</small>{/if}</em></li>{/each}
												</ul>
											</td>
											<td class="num"><b>{euros(r.cost)}</b>{#if r.contractor !== r.cost}<small>{euros(r.contractor)} by contractors</small>{/if}{#if r.coops}<small>+ {euros(r.coops)} the coops' own</small>{/if}</td>
											<td class="num"><b>{whole(r.villager.minds)} minds</b><small>a mind {short(r.price.hearts)} hearts or {euros(r.price.euros)}</small>{#if r.labour.minds}<small>+ {short(r.labour.minds)} minds to the builders, for {euros(r.labour.value)} of work</small>{/if}<small>{short(r.minted)} minted at this level</small></td>
											<td class="num"><b>{euros(r.investor.euros)}</b><small>{times(r.investor.multiple)} the villagers'{#if r.investor.capped} (held to the cap, {times(r.level.investor)} asked){/if}</small><small>{short(r.investor.minds)} minds · {pct(r.investor.share)}</small><small>a mind {euros(r.investor.paid)}, {times(r.investor.premium)} a villager's</small></td>
											<td class="num"><b class:low={!r.housed}>{whole(r.beds)}</b><small>for {whole(r.level.villagers)} villagers</small><small class:low={!r.ready}>{r.ready ? 'ready for the next' : r.housed ? 'short for the next level' : 'short'}</small></td>
											<td class="num tre"><b>{euros(r.treasury.raised)}</b><small class:low={r.treasury.left < 0}>{euros(r.treasury.left)} left after building</small>{#if r.treasury.contractor.spent !== r.treasury.spent}<small class:low={r.treasury.contractor.left < 0}>{euros(r.treasury.contractor.left)} by contractors</small>{/if}<small>{short(r.treasury.hearts)} hearts · {short(r.treasury.minds)} minds</small><small>villagers hold {pct(r.treasury.villagers)}</small>{#if r.treasury.coops}<small>{euros(r.treasury.coops)} the coops' own</small>{/if}</td>
										</tr>
									{/each}
								</tbody>
							{/each}
						</table>
					</div>
					<p class="foot">
						Each new villager's minds: their hearts and euros at the level's price. The investor's: its euros at the same price, and its share of the minds minted at that level. Treasury: euros raised so far and what is left after building everything unlocked, the hearts villagers brought, and every mind minted so far with the share villagers hold and what they are worth at the level's price. Beds: every bed built so far, against the level's villagers and, for a newcomer moves in only to a bed, the next level's. The costs are first estimates, each unlock's source in its note: the way the village builds it (self-built), with what contractors would charge beside it where the config names it; what is left after building moves with them.
					</p>
				{:else if config && !levelling}
					<p class="muted">This config is of a kind the editor can't show yet ({config.json.schema}).</p>
				{:else if !error}
					<p class="muted">Reading the configs…</p>
				{/if}
			</div>
		</Frame>
	</div>
{:else}
	<main class="page"><p class="muted">The Game editor is for Maia City's admins.</p></main>
{/if}

<style>
	.editor { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.editor :global(.soft) { color: var(--soft); }
	.body { height: 100%; overflow: auto; padding: 1.6rem clamp(1rem, 3vw, 2rem) 7rem; }
	.top { max-width: 60rem; }
	.eyebrow { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.3rem 0 0.4rem; font-size: clamp(1.8rem, 3.5vw, 2.6rem); }
	.lead { margin: 0 0 0.5rem; color: var(--ink-soft); }
	.rules { margin: 0; font-size: 0.86rem; color: var(--ink-soft); line-height: 1.5; }
	.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 10px; margin: 1.3rem 0; }
	.stats div { display: flex; flex-direction: column; padding: 0.7rem 0.9rem; border: 1px solid var(--line); border-radius: 14px; background: var(--paper); }
	.stats span { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
	.stats b { font-family: var(--font-display); font-size: 1.45rem; font-weight: 500; }
	.stats small { font-size: 0.74rem; color: var(--muted); }
	.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--paper); }
	table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
	th, td { padding: 0.5rem 0.55rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
	thead th { position: sticky; top: 0; z-index: 1; background: var(--paper); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
	.num { text-align: right; white-space: nowrap; }
	td small { display: block; font-size: 0.72rem; color: var(--muted); }
	td small.low, .low { color: #c23a22; }
	.unlocks li.coop { color: var(--muted); }
	.who.pending { background: #f3d9a4; }
	.who { padding: 0 0.35rem; border-radius: 999px; background: var(--sage-soft); color: var(--ink); font-size: 0.68rem; white-space: nowrap; }
	.tre { background: rgb(168 184 138 / 0.12); }
	tr.phase th { padding: 0.45rem 0.65rem; background: var(--sage-soft); color: var(--ink); font-family: var(--font-display); font-size: 0.95rem; font-weight: 500; letter-spacing: 0; text-transform: none; }
	.lvl { display: inline-grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--ink); color: var(--paper); font-size: 0.78rem; }
	.wide { min-width: 15rem; }
	.unlocks { list-style: none; margin: 0; padding: 0; }
	.unlocks li { display: flex; gap: 0.4rem; align-items: baseline; padding: 0.1rem 0; }
	.unlocks em small { display: block; font-size: 0.68rem; }
	.unlocks em { text-align: right; margin-left: auto; padding-left: 0.6rem; font-style: normal; color: var(--muted); white-space: nowrap; }
	.foot { max-width: 60rem; margin: 0.8rem 0 0; font-size: 0.76rem; color: var(--muted); line-height: 1.5; }
	.bad { color: #c23a22; }
	.soon { margin: 0.8rem 0.35rem; font-size: 0.76rem; color: var(--soft); }
</style>
