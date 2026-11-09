<!--
	Delivery (intent 2f19fe30-5490-4ad6-8ea4-9211e06770c5, Samuel 2026-11-07: delivery "alarmingly slow"): where the
	intents' time goes, read from play (GET /api/delivery, play/api/src/delivery.ts; the MCP tool delivery answers the
	same). Each day of the window its intents accepted and how long they took; each intent's time at every stage as one
	bar (Idea and Build an agent's, Specify and Proposal waiting for a person, Ship CI's), its ship steps, how many times
	play merged main into its pull request, and the budgets it went over; with "CI from GitHub", each intent's runs, their
	minutes and slowest steps. `?days=<n>` the window (7 by default, 1 to 30). Admins only; it changes nothing.
-->
<script lang="ts">
	import { shortWhen as short, span, weekday as dayName } from '$lib/format';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';

	type Stage = 'idea' | 'specify' | 'build' | 'proposal' | 'ship';
	type Segment = { stage: Stage; who: 'agent' | 'person' | 'ci'; from: string; to: string | null; ms: number };
	type Over = { budget: string; name: string; budget_ms: number; ms: number; over_ms: number; run?: number };
	type CiRun = { id: number; name: string | null; link: string; conclusion: string | null; ms: number; slowest: { job: string; step: string; ms: number }[]; over: boolean };
	type Ci = { minutes: number; runs: number; cancelled: number; cancelled_share: number; list: CiRun[] } | { error: string };
	type Timeline = {
		id: string; title: string; stage: string; created: string; accepted_at: string | null; lead_ms: number; segments: Segment[];
		ship: { key: string; name: string; state: string; ms: number | null }[] | null; step_backs: number; main_merges: number; pull_request: number | null; over: Over[]; ci?: Ci;
	};
	type Day = { day: string; accepted: number; median_lead_ms: number | null; longest_lead_ms: number | null; median_stage_ms: Partial<Record<Stage, number>> };
	type Delivery = { now: string; since: string; days: number; budgets: { key: string; name: string; ms: number }[]; per_day: Day[]; over: number; ci: { available: boolean; why?: string; minutes?: number; runs?: number; cancelled_share?: number } | null; intents: Timeline[] };

	const STAGES: [Stage, string, string][] = [
		['idea', 'Idea', 'an agent specifies it'],
		['specify', 'Specify', 'waiting for a person: Approve spec'],
		['build', 'Build', 'an agent builds it, its checks run'],
		['proposal', 'Proposal', 'waiting for a person: Accept'],
		['ship', 'Ship', 'CI: merge, main, release, deploy']
	];
	adminsOnly();
	const admin = $derived(isAdmin());
	const days = $derived(Number(page.url.searchParams.get('days') ?? 7) || 7);
	let ci = $state(false);
	let d = $state<Delivery | null>(null);
	let error = $state('');
	let busy = $state(false);
	$effect(() => {
		if (!admin) return;
		let gone = false;
		busy = true;
		api<Delivery>(`/delivery?days=${days}${ci ? '&ci=1' : ''}`).then(
			(r) => !gone && ((d = r), (error = ''), (busy = false)),
			(e) => !gone && ((error = e.message), (busy = false))
		);
		return () => (gone = true);
	});
	const most = $derived(Math.max(1, ...(d?.intents ?? []).map((t) => t.lead_ms)));
	const hasCi = (c: Ci | undefined): c is Extract<Ci, { list: CiRun[] }> => !!c && 'list' in c;
</script>

<svelte:head><title>Delivery · play</title></svelte:head>

{#if admin}
	<main class="delivery">
		<p class="eyebrow"><a href="/intents/">Intents</a></p>
		<h1>Delivery</h1>
		<p class="lead">Where the intents' time goes: each stage, waiting for a person or an agent at work, Ship's steps, CI, and the budgets.</p>
		<div class="controls">
			<label>Window
				<select value={`${days}`} onchange={(e) => goto(`?days=${(e.currentTarget as HTMLSelectElement).value}`, { keepFocus: true, noScroll: true })}>
					{#each [1, 3, 7, 14, 30] as n (n)}<option value={`${n}`}>{n === 1 ? 'today' : `${n} days`}</option>{/each}
				</select>
			</label>
			<label><input type="checkbox" bind:checked={ci} /> CI from GitHub</label>
			{#if busy}<span class="soft small">Reading…</span>{/if}
		</div>
		{#if error}<p class="bad">{error}</p>{/if}
		{#if d}
			<ul class="legend small">
				{#each STAGES as [s, name, what] (s)}<li><i class="seg {s}"></i>{name} <span class="soft">· {what}</span></li>{/each}
			</ul>
			<p class="small soft">
				Budgets: {d.budgets.map((b) => `${b.name} ${span(b.ms)}`).join(' · ')}.
				{#if d.ci?.available}CI: {d.ci.minutes} min over {d.ci.runs} runs, {Math.round((d.ci.cancelled_share ?? 0) * 100)}% cancelled.{:else if d.ci}{d.ci.why}{/if}
			</p>

			<h2>Each day</h2>
			<div class="scroll">
				<table>
					<thead><tr><th>Day</th><th>Accepted</th><th>Median idea→accepted</th><th>Longest</th>{#each STAGES as [s, name] (s)}<th>{name}</th>{/each}</tr></thead>
					<tbody>
						{#each d.per_day as day (day.day)}
							<tr class:none={!day.accepted}>
								<td>{dayName(day.day)}</td><td>{day.accepted}</td><td>{span(day.median_lead_ms)}</td><td>{span(day.longest_lead_ms)}</td>
								{#each STAGES as [s] (s)}<td>{span(day.median_stage_ms[s])}</td>{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<h2>Each intent <span class="soft small">{d.intents.length}, {d.over} over a budget</span></h2>
			<ul class="intents">
				{#each d.intents as t (t.id)}
					<li class:flag={t.over.length}>
						<div class="top">
							<a href="/intents/#{t.id}" class="title">{t.title}</a>
							<span class="soft small">{t.stage} · {t.accepted_at ? `accepted ${short(t.accepted_at)}` : `since ${short(t.created)}`} · {span(t.lead_ms)}{t.step_backs ? ` · ${t.step_backs} step back${t.step_backs > 1 ? 's' : ''}` : ''}{t.main_merges ? ` · main merged in ${t.main_merges}×` : ''}</span>
						</div>
						<div class="bar" style:width="{Math.max(2, (t.lead_ms / most) * 100)}%">
							{#each t.segments as s, i (i)}
								<i class="seg {s.stage}" class:open={!s.to} style:flex-grow={s.ms} title="{s.stage}: {span(s.ms)}{s.to ? '' : ' so far'}"></i>
							{/each}
						</div>
						<p class="small times">
							{#each t.segments as s, i (i)}<span><i class="seg {s.stage}"></i>{s.stage} {span(s.ms)}{s.to ? '' : '…'}</span>{/each}
						</p>
						{#if t.ship?.length}
							<p class="small soft">Ship: {t.ship.filter((s) => s.ms != null).map((s) => `${s.name} ${span(s.ms)}`).join(' · ')}</p>
						{/if}
						{#if t.over.length}
							<p class="small over">Over: {t.over.map((o) => `${o.name}${o.run ? ` (run ${o.run})` : ''} by ${span(o.over_ms)}`).join(' · ')}</p>
						{/if}
						{#if t.ci && 'error' in t.ci}<p class="small bad">{t.ci.error}</p>{/if}
						{#if hasCi(t.ci) && t.ci.runs}
							<details class="small">
								<summary>CI: {t.ci.minutes} min over {t.ci.runs} runs{t.ci.cancelled ? `, ${t.ci.cancelled} cancelled` : ''}</summary>
								<ul class="runs">
									{#each t.ci.list as r (r.id)}
										<li class:over={r.over}>
											<a href={r.link} target="_blank" rel="noreferrer">{r.name ?? `run ${r.id}`}</a> {span(r.ms)} <span class="soft">{r.conclusion ?? 'running'}</span>
											{#if r.slowest.length}<span class="soft">· slowest: {r.slowest.map((x) => `${x.step} (${x.job}) ${span(x.ms)}`).join(', ')}</span>{/if}
										</li>
									{/each}
								</ul>
							</details>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</main>
{/if}

<style>
	.delivery { max-width: 64rem; margin: 0 auto; padding: 1rem 16px 3rem; background: var(--cream); min-height: 100vh; box-sizing: border-box; --soft: rgb(38 56 44 / 0.6); }
	.soft { color: var(--soft); }
	.small { font-size: 0.84rem; }
	.eyebrow { margin: 0; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	h2 { margin: 1.4rem 0 0.5rem; font-size: 1.05rem; font-family: var(--font-body); font-weight: 600; }
	.lead { margin: 0 0 0.8rem; color: var(--ink-soft); }
	.controls { display: flex; flex-wrap: wrap; gap: 0.6rem 1.2rem; align-items: center; margin-bottom: 0.6rem; }
	.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; padding: 0; margin: 0.4rem 0; }
	.seg { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 2px; margin-right: 0.3rem; vertical-align: -0.05rem; }
	.seg.idea { background: #9bb5a2; }
	.seg.specify { background: #e8b23c; }
	.seg.build { background: #2f6b4a; }
	.seg.proposal { background: #d9822b; }
	.seg.ship { background: #4a78a8; }
	.scroll { overflow-x: auto; }
	table { border-collapse: collapse; font-size: 0.84rem; width: 100%; }
	th, td { text-align: left; padding: 0.3rem 0.5rem; border-bottom: 1px solid rgb(38 56 44 / 0.12); white-space: nowrap; }
	tr.none td { color: var(--soft); }
	.intents { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
	.intents > li { padding: 0.6rem 0.8rem; border-radius: 10px; background: rgb(255 255 255 / 0.6); border: 1px solid rgb(38 56 44 / 0.12); min-width: 0; }
	.intents > li.flag { border-color: rgb(194 58 34 / 0.5); }
	.top { display: flex; flex-wrap: wrap; gap: 0.2rem 0.6rem; align-items: baseline; }
	.title { font-weight: 600; overflow-wrap: anywhere; }
	.bar { display: flex; height: 0.7rem; margin: 0.4rem 0 0.3rem; border-radius: 3px; overflow: hidden; min-width: 0.5rem; }
	.bar .seg { width: auto; height: auto; margin: 0; border-radius: 0; flex-basis: 0; min-width: 2px; }
	.bar .seg.open { opacity: 0.55; }
	.times { display: flex; flex-wrap: wrap; gap: 0.2rem 0.8rem; margin: 0; }
	.over { color: var(--terracotta, #c23a22); margin: 0.2rem 0 0; }
	.runs { margin: 0.3rem 0 0; padding-left: 1rem; }
	.runs li.over { color: var(--terracotta, #c23a22); }
	.bad { color: var(--terracotta, #c23a22); }
</style>
