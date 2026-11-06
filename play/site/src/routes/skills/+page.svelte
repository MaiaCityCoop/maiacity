<!--
	SKILLS (play/SPEC.md §4.14, Samuel 2026-11-06): what play teaches its agents, kept once, in the asset library's frame
	($lib/app/Frame). On the left the skills by their group; in the middle the one picked, read as every agent is taught
	it: its note, its `system` (its part of the system prompt every agent connected over MCP gets) and, for the Intents
	skill, what to do at each of an intent's stages, each its own Markdown. On the right its History
	($lib/app/History.svelte: its versions, every edit it was made in, its open intent variants, any of them read as the
	skill stood there).

	A skill is a Loro document in play's Postgres (play/api/src/skills.ts), read as every document is (GET
	/api/docs?kind=skill, /api/docs/<uuid>); it changes only by proposal (over MCP), decided on the intents' board.
	`?skill=<id>` picks one, `&v=<n>` one of its versions, `&intent=<id>` the skill as an intent's work at Proposal would
	make it (the intents' board opens it so). Admins only.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { markdown } from '$lib/site/markdown/index.js';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';

	type Item = { id: string; kind: string; label: string; group: string; note: string; number: number; versions: number; updated: string; stages?: unknown };
	type Version = { number: number; note: string; at: string; acceptedBy: string | null; contentHash?: string };
	type SkillJson = { schema: 'skill/1'; label: string; group: string; note?: string; system: string; stages?: Partial<Record<string, string>> };
	type Skill = { id: string; kind: string; json: SkillJson; number: number; version?: number; edit?: number; variant?: string; versions: Version[]; intent?: { id: string; status: string; note: string } };

	/** an intent's stages in their order, each as the board names it */
	const STAGES: [string, string][] = [
		['idea', 'Idea'],
		['specify', 'Specify'],
		['prototype', 'Prototype'],
		['proposal', 'Proposal'],
		['ship', 'Ship'],
		['accepted', 'Accepted'],
		['archived', 'Archived']
	];

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let skill = $state<Skill | null>(null);
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const id = $derived(params.get('skill') ?? list[0]?.id ?? '');
	const wantV = $derived(params.get('v'));
	const wantIntent = $derived(params.get('intent'));
	$effect(() => {
		if (!admin) return;
		api<Item[]>('/docs?kind=skill').then((l) => (list = l), (e) => (error = e.message));
	});
	/** the skills by their group, each group's in the order play lists them */
	const groups = $derived.by(() => {
		const out = new Map<string, Item[]>();
		for (const s of list) out.set(s.group, [...(out.get(s.group) ?? []), s]);
		return [...out];
	});

	/** the skill read as the address names it, or as its History picks it (an edit, an intent variant) */
	let asked = 0;
	async function load(s: string, q: string, picked = false) {
		const mine = ++asked;
		try {
			const got = await api<Skill>(`/docs/${s}${q}`);
			if (mine === asked) ((skill = got), (error = ''));
		} catch (e) {
			// a pick that fails is said in the History, under its bar; the skill shown stays
			if (picked) throw e;
			if (mine === asked) error = (e as Error).message;
		}
	}
	const addressed = $derived(wantIntent ? `?intent=${encodeURIComponent(wantIntent)}` : wantV ? `?v=${encodeURIComponent(wantV)}` : '');
	$effect(() => {
		if (!admin || !id) return;
		const s = id, q = addressed;
		untrack(() => load(s, q));
	});
	const at = (s: string, v?: number) => goto(`?skill=${s}${v ? `&v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	/** what its History picks: an edit or a variant read as it stood there, a version (or Main's newest) by the address */
	async function onPick(p: Pick) {
		if (!skill) return;
		const s = skill.id;
		if (p.kind === 'edit') return load(s, `?edit=${p.seq}`, true);
		if (p.kind === 'variant') return load(s, `?variant=${encodeURIComponent(p.id)}`, true);
		const v = p.kind === 'version' && p.number !== skill.number ? p.number : undefined;
		// the address names it already: read it again, else go there and it is read
		if (!wantIntent && (wantV ?? '') === (v ? String(v) : '')) return load(s, addressed, true);
		await at(s, v);
	}
	/** the version of Main shown (none while an intent's work is) */
	const shownV = $derived(wantIntent ? null : wantV ? Number(wantV) : (skill?.number ?? null));

	/** Markdown, as the site's one engine writes it (safe to show: nothing in it can run or load) */
	const md = (s: string | null | undefined) => markdown(s ?? '');
	const stages = $derived(STAGES.filter(([k]) => (skill?.json.stages?.[k] ?? '').trim()));
</script>

<svelte:head><title>{skill?.json.label ?? 'Skills'} · Skills · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	{#each groups as [g, items] (g)}
		<h3 class="nav-group">{g}</h3>
		{#each items as s (s.id)}
			<a class="nav-item" class:on={id === s.id} href="?skill={s.id}" onclick={(e) => (e.preventDefault(), at(s.id))} aria-current={id === s.id ? 'page' : undefined}
				><Icon name="article" size={16} /><span>{s.label}</span><small>v{s.number}</small></a
			>
		{/each}
	{:else}
		<p class="soon">{error ? '' : 'Reading the skills…'}</p>
	{/each}
{/snippet}

<!-- on the right: the skill picked, and its History -->
{#snippet about()}
	{#if skill}
		<header class="about-head">
			<small>Skill · {skill.json.group}</small>
			<h3>{skill.json.label}</h3>
			{#if skill.edit != null}
				<p class="asif">As it stood at an edit of its history.</p>
			{:else if skill.variant}
				<p class="asif">As an intent variant would make it.</p>
			{:else if skill.intent}
				<p class="asif">As its intent's work would make it{skill.intent.status === 'proposal' ? '' : ` (${skill.intent.status})`}: “{skill.intent.note}” <a href="/intents/#{skill.intent.id}">Its intent</a> · <a href="?skill={skill.id}" onclick={(e) => (e.preventDefault(), at(skill!.id))}>its newest version</a></p>
			{:else if (skill.version ?? skill.number) !== skill.number}
				<p class="asif">Version {skill.version}, not its newest: <a href="?skill={skill.id}" onclick={(e) => (e.preventDefault(), at(skill!.id))}>v{skill.number}</a></p>
			{/if}
		</header>
		<div class="tabs" role="tablist">
			<button role="tab" aria-selected="true" class="on">History</button>
		</div>
		<History doc={skill.id} {onPick} version={shownV} versions={skill.versions.map((v) => ({ number: v.number, note: v.note, at: v.at, acceptedBy: v.acceptedBy }))} />
		<p class="soft propose">Every change is an edit of its Loro document, proposed over MCP; it is decided in <a href="/intents/">Intents</a>, and taught from the next request on once accepted.</p>
	{/if}
{/snippet}

{#if admin}
	<div class="skills">
		<Frame nav={shelf} aside={skill ? about : undefined} navLabel="What play teaches its agents" asideLabel="The skill's history" navIcon="board">
			<div class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if skill}
					<header class="top">
						<p class="eyebrow">Skills · {skill.json.group}</p>
						<h1>{skill.json.label}</h1>
						{#if skill.json.note}<div class="md lead">{@html md(skill.json.note)}</div>{/if}
					</header>
					<section class="part">
						<h2>System <small>its part of the system prompt every agent connected over MCP gets</small></h2>
						{#if skill.json.system?.trim()}<div class="md">{@html md(skill.json.system)}</div>{:else}<p class="muted">Nothing: it adds nothing to the system prompt.</p>{/if}
					</section>
					{#each stages as [k, name] (k)}
						<section class="part">
							<h2>{name} <small>what an agent is told to do with an intent at {name}</small></h2>
							<div class="md">{@html md(skill.json.stages?.[k])}</div>
						</section>
					{/each}
				{:else if !error}
					<p class="muted">Reading the skills…</p>
				{/if}
			</div>
		</Frame>
	</div>
{:else}
	<main class="page"><p class="muted">The skills are for Maia City's admins.</p></main>
{/if}

<style>
	.skills { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.skills :global(.soft) { color: var(--soft); }
	.body { height: 100%; overflow: auto; padding: 1.6rem clamp(1rem, 3vw, 2rem) 7rem; }
	.top { max-width: 52rem; }
	.eyebrow { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.3rem 0 0.4rem; font-size: clamp(1.8rem, 3.5vw, 2.6rem); }
	.lead { color: var(--ink-soft); }
	.part { max-width: 52rem; margin: 1.3rem 0 0; padding: 0.9rem 1.1rem; border: 1px solid var(--line); border-radius: 14px; background: var(--paper); }
	.part h2 { margin: 0 0 0.5rem; font-family: var(--font-body); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
	.part h2 small { margin-left: 0.4rem; text-transform: none; letter-spacing: 0; font-weight: 400; }
	/* a skill's texts, as Markdown */
	.md { font-size: 0.92rem; line-height: 1.55; overflow-wrap: anywhere; }
	.md :global(:first-child) { margin-top: 0; }
	.md :global(:last-child) { margin-bottom: 0; }
	.md :global(ul), .md :global(ol) { padding-left: 1.3rem; }
	.md :global(code) { font-size: 0.86em; }
	.md :global(pre) { white-space: pre-wrap; background: var(--cream, #faf8f2); padding: 0.5rem 0.7rem; border-radius: 8px; }
	.bad { color: #c23a22; }
	.soon { margin: 0.8rem 0.35rem; font-size: 0.76rem; color: var(--soft); }
	.about-head { margin: 0 0 0.9rem 0.35rem; }
	.about-head small { color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0.3rem; font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; }
	.asif { margin: 0.4rem 0 0.5rem; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--mustard-soft); font-size: 0.78rem; line-height: 1.4; }
	.tabs { display: flex; gap: 4px; margin: 0 0 0.8rem; }
	.tabs button { font: inherit; font-size: 0.82rem; padding: 0.35rem 0.8rem; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); cursor: pointer; }
	.tabs button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.propose { margin: 0 0 1.2rem 0.35rem; font-size: 0.76rem; }
</style>
